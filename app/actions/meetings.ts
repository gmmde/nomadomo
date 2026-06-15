"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { stripe, commissionYen } from "@/app/lib/stripe";

export type MeetingActionResult =
  | { error?: string; success?: boolean; meetingId?: number }
  | undefined;

export type PaymentIntentResult =
  | { error?: string; clientSecret?: string; paymentIntentId?: string; amountYen?: number };

const EXPIRY_HOURS = 48;

/**
 * 旅行者が Meet ボタン押す前に呼ぶ。
 * 相手 (= ガイド) の Stripe 口座 + rate_per_day を見て PaymentIntent を作成。
 * manual capture モードで、guide が後で「accept」したら capture が走る。
 * 48h 後に未 accept なら pg_cron 経由で meeting status=canceled、Stripe 側は別途解放。
 */
export async function createMeetPaymentIntent(peerId: string): Promise<PaymentIntentResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };
  if (!peerId || peerId === user.id) return { error: "bad peer" };

  // 相手の guides 行 (rate + stripe account) を取得
  const { data: guide } = await supabase
    .from("guides")
    .select("id, user_id, rate_per_day, mode, stripe_account_id, stripe_onboarded")
    .eq("user_id", peerId)
    .maybeSingle();
  if (!guide) return { error: "guide profile not found for peer" };
  if (guide.mode !== "paid") return { error: "this guide is free (mate). No payment needed." };
  if (!guide.rate_per_day) return { error: "guide has no rate set" };
  if (!guide.stripe_account_id || !guide.stripe_onboarded) {
    return { error: "guide hasn't completed payment setup" };
  }

  const grossYen = Number(guide.rate_per_day) * 1; // 1日固定
  const feeYen = commissionYen(grossYen);

  const intent = await stripe.paymentIntents.create({
    amount: grossYen,
    currency: "jpy",
    capture_method: "manual",
    application_fee_amount: feeYen,
    transfer_data: { destination: guide.stripe_account_id as string },
    metadata: {
      kind: "meeting",
      traveler_id: user.id,
      guide_user_id: peerId,
      guide_id: String(guide.id),
    },
    automatic_payment_methods: { enabled: true },
  });

  return {
    clientSecret: intent.client_secret ?? undefined,
    paymentIntentId: intent.id,
    amountYen: grossYen,
  };
}

/**
 * 旅行者が Meet ボタン押下 + Stripe Elements 確定 後に呼ぶ。
 * payment_intent_id 必須。meeting 行を pending_b で作成、expires_at = now+48h。
 * ガイドは proposeMeet 呼び出し禁止 (= 旅行者だけが Meet 発議可)。
 */
export async function proposeMeet(formData: FormData): Promise<MeetingActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const peerId = String(formData.get("peer_id") ?? "").trim();
  const paymentIntentId = String(formData.get("payment_intent_id") ?? "").trim();
  if (!peerId) return { error: "peer_id missing" };
  if (peerId === user.id) return { error: "Cannot meet yourself" };

  // 役割確認: 自分が traveler である chat_requests があるか (= 旅行者として申し込んでる)
  const { data: cr } = await supabase
    .from("chat_requests")
    .select("traveler_id, guide_user_id, status")
    .eq("traveler_id", user.id)
    .eq("guide_user_id", peerId)
    .in("status", ["accepted"])
    .maybeSingle();
  if (!cr) {
    return { error: "Only travelers (whose chat-request the guide accepted) can propose Meet." };
  }

  // paid guide のときは payment_intent_id 必須
  const { data: guide } = await supabase
    .from("guides")
    .select("mode, rate_per_day")
    .eq("user_id", peerId)
    .maybeSingle();
  const paid = guide?.mode === "paid";
  if (paid && !paymentIntentId) {
    return { error: "payment_intent_id required for paid guides" };
  }

  // 既存 meeting チェック
  const { data: existing } = await supabase
    .from("meetings")
    .select("id, status")
    .or(`and(user_a_id.eq.${user.id},user_b_id.eq.${peerId}),and(user_a_id.eq.${peerId},user_b_id.eq.${user.id})`)
    .in("status", ["pending_b", "active"])
    .maybeSingle();
  if (existing) {
    return { success: true, meetingId: existing.id as number };
  }

  const amountYen = paid && guide?.rate_per_day ? Number(guide.rate_per_day) : null;
  const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  const insertRow: Record<string, unknown> = {
    user_a_id: user.id,
    user_b_id: peerId,
    traveler_user_id: user.id,
    guide_user_id: peerId,
    status: "pending_b",
    expires_at: expiresAt,
  };
  if (paid) {
    insertRow.payment_intent_id = paymentIntentId;
    insertRow.payment_status = "requires_capture";
    insertRow.payment_authorized_at = new Date().toISOString();
    insertRow.amount_yen = amountYen;
  }

  const { data: inserted, error } = await supabase
    .from("meetings")
    .insert(insertRow)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true, meetingId: inserted?.id as number };
}

/**
 * ガイドが accept ボタン押下時。meeting を active に進める + payment_intent_id があれば Stripe capture。
 * RLS で当事者のみ update 可。
 */
export async function acceptMeet(formData: FormData): Promise<MeetingActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = Number(formData.get("meeting_id") ?? "");
  if (!Number.isFinite(id) || id <= 0) return { error: "bad meeting_id" };

  const { data: m } = await supabase
    .from("meetings")
    .select("id, user_a_id, user_b_id, traveler_user_id, guide_user_id, status, payment_intent_id, payment_status")
    .eq("id", id)
    .maybeSingle();
  if (!m) return { error: "meeting not found" };
  if (m.status !== "pending_b") return { error: "meeting is not pending" };
  // ガイド本人だけが accept 可
  if (m.guide_user_id !== user.id) {
    return { error: "Only the guide can accept the meet proposal" };
  }

  // Stripe capture (payment_intent_id ある時のみ = paid guide)
  if (m.payment_intent_id) {
    try {
      await stripe.paymentIntents.capture(m.payment_intent_id as string);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Stripe capture failed";
      return { error: `Payment capture failed: ${msg}` };
    }
  }

  const now = new Date().toISOString();
  const updateRow: Record<string, unknown> = {
    status: "active",
    started_at: now,
  };
  if (m.payment_intent_id) {
    updateRow.payment_status = "succeeded";
    updateRow.payment_captured_at = now;
  }
  const { error: e } = await supabase
    .from("meetings")
    .update(updateRow)
    .eq("id", id);
  if (e) return { error: e.message };

  revalidatePath("/");
  return { success: true };
}

/**
 * 旧 completeMeet 互換 (auto-complete に置き換わったがキャンセル系で使う可能性)
 */
export async function completeMeet(formData: FormData): Promise<MeetingActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = Number(formData.get("meeting_id") ?? "");
  if (!Number.isFinite(id) || id <= 0) return { error: "bad meeting_id" };

  const { data: m } = await supabase
    .from("meetings")
    .select("id, user_a_id, user_b_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!m) return { error: "meeting not found" };
  if (m.status !== "active") return { error: "not active" };

  const { data: reviews } = await supabase
    .from("reviews")
    .select("reviewer_id")
    .eq("meeting_id", id);
  const reviewerIds = new Set((reviews ?? []).map((r) => r.reviewer_id as string));
  if (!reviewerIds.has(m.user_a_id as string) || !reviewerIds.has(m.user_b_id as string)) {
    return { error: "Both parties must post a review before finishing." };
  }

  const { error } = await supabase
    .from("meetings")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath(`/meetings/${id}/complete`);
  return { success: true };
}

/**
 * 旅行者 or ガイドが pending 状態でキャンセル。Stripe authorize 解放も行う。
 */
export async function cancelMeet(formData: FormData): Promise<MeetingActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = Number(formData.get("meeting_id") ?? "");
  if (!Number.isFinite(id) || id <= 0) return { error: "bad meeting_id" };

  const { data: m } = await supabase
    .from("meetings")
    .select("user_a_id, user_b_id, status, payment_intent_id")
    .eq("id", id)
    .maybeSingle();
  if (!m) return { error: "not found" };
  if (m.user_a_id !== user.id && m.user_b_id !== user.id) return { error: "not a participant" };
  if (m.status !== "pending_b") return { error: "Can only cancel pending meetings" };

  if (m.payment_intent_id) {
    try {
      await stripe.paymentIntents.cancel(m.payment_intent_id as string);
    } catch (e) {
      console.error("[cancelMeet] Stripe cancel failed:", e);
      // DB 側だけでも canceled にして UX を回復させる
    }
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("meetings")
    .update({
      status: "canceled",
      payment_status: m.payment_intent_id ? "canceled" : null,
      payment_canceled_at: m.payment_intent_id ? now : null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  return { success: true };
}
