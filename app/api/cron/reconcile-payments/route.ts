import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/app/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// service-role Supabase client (RLS バイパス。cron にはユーザーセッションが無い)
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createClient(url, key, { auth: { persistSession: false } });
}

// オーソリ(authorize)をまだ cancel できる PaymentIntent ステータス
const CANCELABLE = new Set([
  "requires_payment_method",
  "requires_capture",
  "requires_confirmation",
  "requires_action",
  "processing",
]);

/**
 * Stripe ホールド解放の照合ジョブ (Vercel Cron から呼ばれる)。
 *
 * 背景: meeting が canceled (手動 or 48h 期限切れ pg_cron) になっても、
 * Stripe 側の PaymentIntent は authorize されたまま残ることがある
 * (pg_cron は DB しか触れない / 手動 cancel が Stripe 失敗した等)。
 * カードのホールドが最大 7 日残ってしまうので、それを確実に解放する。
 *
 * 対象: status='canceled' かつ payment_intent_id あり かつ payment_released_at IS NULL。
 * 成功したら payment_released_at を記録して二度と処理しない。
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  // Vercel Cron は CRON_SECRET 設定時に "Authorization: Bearer <secret>" を自動付与する
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }

  const sb = adminClient();
  const { data, error } = await sb
    .from("meetings")
    .select("id, payment_intent_id")
    .eq("status", "canceled")
    .not("payment_intent_id", "is", null)
    .is("payment_released_at", null)
    .limit(100);
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  let released = 0;
  let already = 0;
  let flagged = 0;
  let failed = 0;
  const now = new Date().toISOString();

  for (const m of rows) {
    const pid = m.payment_intent_id as string;
    try {
      const pi = await stripe.paymentIntents.retrieve(pid);
      if (pi.status === "canceled") {
        already += 1;
      } else if (CANCELABLE.has(pi.status)) {
        await stripe.paymentIntents.cancel(pid);
        released += 1;
      } else {
        // succeeded など: canceled meeting なのに capture 済み = 異常。
        // 自動返金はせず、payment_released_at を NULL のまま残してログに出し続ける(人手で確認)。
        flagged += 1;
        console.warn(
          `[reconcile-payments] meeting ${m.id} PI ${pid} is '${pi.status}' on a canceled meeting — needs manual review`,
        );
        continue;
      }
      await sb
        .from("meetings")
        .update({ payment_released_at: now, payment_status: "canceled" })
        .eq("id", m.id)
        .is("payment_released_at", null);
    } catch (e) {
      failed += 1;
      console.error(
        `[reconcile-payments] meeting ${m.id} PI ${pid}:`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  return Response.json({ ok: true, scanned: rows.length, released, already, flagged, failed });
}
