"use server";

import { createClient } from "@/app/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { stripe } from "@/app/lib/stripe";

// local が traveler にメッセージを送る「スーパーライク」料金（プラットフォーム収益）。調整可。
const SUPERLIKE_FEE_YEN = 300;

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createAdmin(url, key, { auth: { persistSession: false } });
}

type SuperLikeIntentResult = {
  clientSecret?: string;
  paymentIntentId?: string;
  amountYen?: number;
  alreadyUnlocked?: boolean;
  error?: string;
};

/**
 * スーパーライク用の PaymentIntent を作成（プラットフォームが受領＝Connect transfer なし）。
 * 即時 capture（automatic）。relationship が既に解錠済みなら alreadyUnlocked を返す。
 */
export async function createSuperLikePaymentIntent(travelerUserId: string): Promise<SuperLikeIntentResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };
  if (!travelerUserId || travelerUserId === user.id) return { error: "bad target" };

  // 相手が traveler プロフィールを持っているか
  const { data: tv } = await supabase
    .from("travelers")
    .select("user_id")
    .eq("user_id", travelerUserId)
    .maybeSingle();
  if (!tv) return { error: "target is not a traveler" };

  // 既に accepted（解錠済み）ならスキップ
  const { data: existing } = await supabase
    .from("chat_requests")
    .select("id")
    .or(`and(traveler_id.eq.${user.id},guide_user_id.eq.${travelerUserId}),and(traveler_id.eq.${travelerUserId},guide_user_id.eq.${user.id})`)
    .eq("status", "accepted")
    .limit(1);
  if (existing && existing.length > 0) return { alreadyUnlocked: true };

  const intent = await stripe.paymentIntents.create({
    amount: SUPERLIKE_FEE_YEN,
    currency: "jpy",
    automatic_payment_methods: { enabled: true },
    metadata: {
      kind: "superlike",
      local_user_id: user.id,
      traveler_user_id: travelerUserId,
    },
  });

  return {
    clientSecret: intent.client_secret ?? undefined,
    paymentIntentId: intent.id,
    amountYen: SUPERLIKE_FEE_YEN,
  };
}

/**
 * 支払い完了後に呼ぶ。PaymentIntent が succeeded か検証し、local→traveler の
 * accepted chat_request を作成してチャットを即開設する（local=guide側 / traveler=traveler側）。
 */
export async function redeemSuperLike(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const travelerUserId = String(formData.get("traveler_user_id") ?? "").trim();
  const paymentIntentId = String(formData.get("payment_intent_id") ?? "").trim();
  if (!travelerUserId || !paymentIntentId) return { error: "missing params" };

  // 決済検証（メタデータの当事者一致 + succeeded）
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== "succeeded") return { error: "payment not completed" };
    if (pi.metadata?.local_user_id !== user.id || pi.metadata?.traveler_user_id !== travelerUserId) {
      return { error: "payment mismatch" };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "verification failed" };
  }

  // accepted chat_request を作成（RLS バイパスのため service-role）
  const admin = adminClient();
  const { data: existing } = await admin
    .from("chat_requests")
    .select("id, status")
    .eq("guide_user_id", user.id)
    .eq("traveler_id", travelerUserId)
    .limit(1);
  if (existing && existing.length > 0) {
    if (existing[0].status !== "accepted") {
      await admin.from("chat_requests").update({ status: "accepted" }).eq("id", existing[0].id);
    }
  } else {
    const { error } = await admin.from("chat_requests").insert({
      traveler_id: travelerUserId,
      guide_user_id: user.id,
      message: null,
      status: "accepted",
    });
    if (error) return { error: error.message };
  }

  return { success: true };
}
