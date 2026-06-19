"use server";

// Web Push: 購読の保存・解除、および送信。
//
// 送信は server action で叩く想定 (例えばメッセージ insert 後 sendPushToUser
// を呼ぶ)。VAPID 環境変数が未設定なら送信は no-op で握りつぶす — 本番 env
// 設定前にエラーを撒かないため。

import { createClient } from "@/app/lib/supabase/server";
import webpush from "web-push";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:tonoikenta@icloud.com";

let webpushConfigured = false;
function ensureConfigured(): boolean {
  if (webpushConfigured) return true;
  if (!PUBLIC_KEY || !PRIVATE_KEY) return false;
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  webpushConfigured = true;
  return true;
}

export async function saveSubscription(payload: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: payload.endpoint,
        p256dh: payload.p256dh,
        auth: payload.auth,
        user_agent: payload.userAgent ?? null,
      },
      { onConflict: "user_id,endpoint" }
    );

  if (error) return { ok: false, error: error.message };

  // 設定の push_enabled を on に
  await supabase.from("user_settings").upsert(
    { user_id: user.id, push_enabled: true },
    { onConflict: "user_id" }
  );
  return { ok: true };
}

export async function deleteSubscription(endpoint: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
  return { ok: true };
}

export async function setPushEnabled(enabled: boolean): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  await supabase.from("user_settings").upsert(
    { user_id: user.id, push_enabled: enabled },
    { onConflict: "user_id" }
  );
  if (!enabled) {
    // OFF にしたら全 endpoint を消す (再度 ON 時に subscribe し直す)
    await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
  }
  return { ok: true };
}

/**
 * 指定ユーザーの全 endpoint に push 送信。
 * - VAPID 未設定 → 何もせず ok:false
 * - 期限切れ endpoint (404/410) は購読 DB から自動削除
 * - 設定 push_enabled=false なら送らない
 */
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<{ ok: boolean; sent: number; pruned: number }> {
  if (!ensureConfigured()) return { ok: false, sent: 0, pruned: 0 };

  const supabase = await createClient();
  // push_enabled チェック
  const { data: settings } = await supabase
    .from("user_settings")
    .select("push_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (!settings?.push_enabled) return { ok: true, sent: 0, pruned: 0 };

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return { ok: true, sent: 0, pruned: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  const stale: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body
        );
        sent++;
      } catch (e: unknown) {
        const err = e as { statusCode?: number };
        // 404 = subscription no longer valid
        // 410 = gone (unsubscribed at browser)
        if (err.statusCode === 404 || err.statusCode === 410) {
          stale.push(s.endpoint);
        } else {
          console.error("push send failed", e);
        }
      }
    })
  );

  // 期限切れの掃除
  if (stale.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", stale);
  }

  return { ok: true, sent, pruned: stale.length };
}
