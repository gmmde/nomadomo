"use server";

// Client-initiated push notification trigger.
// 設計: クライアントが messages.insert 成功後にこれを fire-and-forget で
// 叩く。サーバー側で sender 名を解決して相手に push を送る。
//
// ⚠️ クライアントから body 文字列をそのまま渡されると spoofing になり得る
// (recipient_id は信用できない) → "本当にこの sender_id == auth.uid()" の
// 場合のみ送信する。

import { createClient } from "@/app/lib/supabase/server";
import { sendPushToUser } from "@/app/actions/push";

export async function notifyMessageSent(args: {
  recipientId: string;
  preview: string;
}): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  // 自分が自分に送ったメッセージは通知不要
  if (user.id === args.recipientId) return { ok: false };

  // sender 名を guides → travelers → "User" の順で解決
  let senderName: string = "User";
  const { data: g } = await supabase
    .from("guides").select("name").eq("user_id", user.id).maybeSingle();
  if (g?.name) senderName = g.name as string;
  else {
    const { data: tv } = await supabase
      .from("travelers").select("name").eq("user_id", user.id).maybeSingle();
    if (tv?.name) senderName = tv.name as string;
  }

  const preview = (args.preview ?? "").slice(0, 80) || "📩 New message";
  await sendPushToUser(args.recipientId, {
    title: senderName,
    body: preview,
    url: "/",
    tag: `msg-${user.id}`,
  });
  return { ok: true };
}

export async function notifyChatRequestSent(args: {
  guideUserId: string;
}): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  if (user.id === args.guideUserId) return { ok: false };

  let senderName: string = "Traveler";
  const { data: tv } = await supabase
    .from("travelers").select("name").eq("user_id", user.id).maybeSingle();
  if (tv?.name) senderName = tv.name as string;

  await sendPushToUser(args.guideUserId, {
    title: "📨 New message request",
    body: `${senderName} sent you a message request`,
    url: "/requests",
    tag: `req-${user.id}`,
  });
  return { ok: true };
}
