"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { stripe, commissionYen } from "@/app/lib/stripe";

export type BookingFormState =
  | { error?: string; success?: boolean }
  | undefined;

export async function createBooking(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const guideIdRaw = String(formData.get("guide_id") ?? "");
  const guideId = Number(guideIdRaw);
  if (!Number.isFinite(guideId) || guideId <= 0) return { error: "Invalid guide_id" };

  const startAtRaw = String(formData.get("start_at") ?? "").trim();
  if (!startAtRaw) return { error: "Pick a start time" };
  const startAt = new Date(startAtRaw);
  if (isNaN(startAt.getTime())) return { error: "Bad date format" };
  if (startAt.getTime() <= Date.now()) return { error: "Pick a future date" };

  const hoursRaw = String(formData.get("hours") ?? "");
  const hours = Number(hoursRaw);
  if (!Number.isFinite(hours) || hours < 1 || hours > 7) return { error: "Days must be 1–7" };

  const message = String(formData.get("message") ?? "").trim();
  if (message.length > 500) return { error: "Message must be ≤500 chars" };

  // ペイメント関連 (Stripe Elements から渡される)
  const paymentIntentId = String(formData.get("payment_intent_id") ?? "").trim();

  // ガイド取得
  const { data: guide, error: guideErr } = await supabase
    .from("guides")
    .select("user_id, rate_per_day, mode, stripe_account_id, stripe_onboarded")
    .eq("id", guideId)
    .maybeSingle();
  if (guideErr) return { error: guideErr.message };
  if (!guide) return { error: "Guide not found" };
  if (!guide.user_id) return { error: "Demo guides cannot be booked" };
  if (guide.user_id === user.id) return { error: "Cannot book yourself" };

  if (guide.mode === "free") return { error: "This guide is free (mate) — message directly instead" };
  if (guide.rate_per_day == null) return { error: "Guide has no rate set" };
  const totalYen = Number(guide.rate_per_day) * hours;
  const feeYen = commissionYen(totalYen);

  // 有料予約は paymentIntentId 必須 (Stripe onboarded ガイドのみ)
  if (!paymentIntentId) return { error: "Payment is required for paid bookings" };
  if (!guide.stripe_account_id || !guide.stripe_onboarded) {
    return { error: "This guide has not finished payment setup yet" };
  }

  // 予約レコード作成
  const { error } = await supabase.from("bookings").insert({
    traveler_id: user.id,
    guide_id: guideId,
    guide_user_id: guide.user_id,
    start_at: startAt.toISOString(),
    hours: Math.round(hours),
    total_yen: totalYen,
    message: message || null,
    status: "pending",
    payment_intent_id: paymentIntentId,
    payment_status: "requires_capture",
    commission_yen: feeYen,
  });
  if (error) return { error: error.message };

  revalidatePath("/bookings");
  redirect("/bookings");
}

export async function updateBookingStatus(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const idRaw = String(formData.get("id") ?? "");
  const id = Number(idRaw);
  const next = String(formData.get("next_status") ?? "");
  const validNext = ["accepted", "declined", "cancelled", "completed"];
  if (!Number.isFinite(id) || !validNext.includes(next)) return;

  const { data: b } = await supabase
    .from("bookings")
    .select("traveler_id, guide_user_id, status, payment_intent_id, payment_status")
    .eq("id", id)
    .maybeSingle();
  if (!b) return;

  const isTraveler = b.traveler_id === user.id;
  const isGuide = b.guide_user_id === user.id;
  if (!isTraveler && !isGuide) return;

  const allowed: Record<string, { traveler: string[]; guide: string[] }> = {
    pending: { traveler: ["cancelled"], guide: ["accepted", "declined"] },
    accepted: { traveler: ["cancelled"], guide: ["completed", "cancelled"] },
    declined: { traveler: [], guide: [] },
    cancelled: { traveler: [], guide: [] },
    completed: { traveler: [], guide: [] },
  };
  const allowedNext = isTraveler
    ? allowed[b.status as string].traveler
    : allowed[b.status as string].guide;
  if (!allowedNext.includes(next)) return;

  // Stripe 連動：accepted → capture, declined/cancelled → cancel
  const pi = b.payment_intent_id as string | null;
  let nextPaymentStatus: string | null = null;
  if (pi) {
    try {
      if (next === "accepted") {
        await stripe.paymentIntents.capture(pi);
        nextPaymentStatus = "succeeded";
      } else if (next === "declined" || next === "cancelled") {
        // requires_capture から cancel 可
        if (b.payment_status === "requires_capture" || b.payment_status === "requires_payment_method") {
          await stripe.paymentIntents.cancel(pi);
          nextPaymentStatus = "canceled";
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "stripe failed";
      console.error("[booking status] stripe op failed:", msg);
      // Stripe 失敗時は status 変更しない（rollback 相当）
      return;
    }
  }

  const update: Record<string, unknown> = { status: next };
  if (nextPaymentStatus) update.payment_status = nextPaymentStatus;
  await supabase.from("bookings").update(update).eq("id", id);
  revalidatePath("/bookings");
}
