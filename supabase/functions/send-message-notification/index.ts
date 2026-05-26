// Supabase Edge Function: messages テーブルの INSERT を受け取って
// 受信者にメールを送る。Database Webhook から呼ばれる想定。
//
// 必要 env:
//   RESEND_API_KEY        - Resend の API キー (https://resend.com)
//   RESEND_FROM           - 送信元メールアドレス（例: noreply@nomadomo.app）
//   SUPABASE_URL          - Supabase 自動注入
//   SUPABASE_SERVICE_ROLE_KEY - Supabase 自動注入（auth.users 読むため）
//   SITE_URL              - 本番 URL（例: https://nomadomo.vercel.app）

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: number;
    sender_id: string;
    recipient_id: string;
    body: string;
    created_at: string;
  };
  schema: string;
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "noreply@nomadomo.app";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://nomadomo.vercel.app";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

async function getRecipientEmail(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;
  return data.user.email;
}

async function getSenderName(userId: string): Promise<string> {
  // ガイドプロファイル優先、無ければ travelers、それも無ければ短縮 UUID
  const { data: guide } = await supabaseAdmin
    .from("guides")
    .select("name")
    .eq("user_id", userId)
    .maybeSingle();
  if (guide?.name) return guide.name as string;

  const { data: traveler } = await supabaseAdmin
    .from("travelers")
    .select("name")
    .eq("user_id", userId)
    .maybeSingle();
  if (traveler?.name) return traveler.name as string;

  return `ユーザー ${userId.slice(0, 8)}`;
}

// 同じ送信者から直近5分以内に未読が既にあるなら、メール送らない（過剰通知防止）
async function shouldSendEmail(senderId: string, recipientId: string, currentMsgId: number): Promise<boolean> {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from("messages")
    .select("id")
    .eq("sender_id", senderId)
    .eq("recipient_id", recipientId)
    .is("read_at", null)
    .gt("created_at", fiveMinAgo)
    .lt("id", currentMsgId)
    .limit(1);
  return !(data && data.length > 0);
}

async function sendEmail(to: string, senderName: string, body: string): Promise<Response> {
  const subject = `${senderName} からメッセージが届いたわよ - NomaDomo`;
  const preview = body.length > 100 ? body.slice(0, 100) + "…" : body;
  const html = `<!doctype html>
<html lang="ja">
  <body style="margin:0; padding:0; background:#f5ead0; font-family:'Helvetica Neue',Arial,sans-serif;">
    <div style="max-width:480px; margin:24px auto; background:#fff9f0; border:2px solid #e8c99a; border-radius:18px; padding:24px;">
      <div style="font-size:22px; font-weight:900; margin-bottom:8px;">
        <span style="color:#2ecc71;">Noma</span><span style="color:#ad001c;">Domo</span>
      </div>
      <h1 style="font-size:18px; margin:0 0 12px; color:#1a1008;">${senderName} さんから新着メッセージ</h1>
      <div style="background:#ffefd5; border-left:4px solid #ad001c; padding:12px 16px; border-radius:4px; color:#1a1008; font-size:14px; line-height:1.6; margin-bottom:20px;">
        ${escapeHtml(preview)}
      </div>
      <a href="${SITE_URL}" style="display:inline-block; background:#ad001c; color:#fff; text-decoration:none; font-weight:700; padding:12px 24px; border-radius:14px;">
        NomaDomo で返信する →
      </a>
      <p style="font-size:11px; color:#8a7560; margin-top:24px; line-height:1.5;">
        このメールは NomaDomo のメッセージ通知です。<br/>
        ${SITE_URL} のチャットから返信できます。
      </p>
    </div>
  </body>
</html>`;

  return await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to,
      subject,
      html,
    }),
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not set");
    return new Response("config error", { status: 500 });
  }

  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch (_e) {
    return new Response("invalid json", { status: 400 });
  }

  if (payload.type !== "INSERT" || payload.table !== "messages" || !payload.record) {
    return new Response("ignored", { status: 200 });
  }

  const { sender_id, recipient_id, body, id } = payload.record;

  try {
    const ok = await shouldSendEmail(sender_id, recipient_id, id);
    if (!ok) {
      return new Response("throttled (recent unread exists)", { status: 200 });
    }

    const [email, senderName] = await Promise.all([
      getRecipientEmail(recipient_id),
      getSenderName(sender_id),
    ]);
    if (!email) {
      return new Response("recipient has no email", { status: 200 });
    }

    const r = await sendEmail(email, senderName, body);
    if (!r.ok) {
      const text = await r.text();
      console.error("Resend failed:", r.status, text);
      return new Response(`resend failed: ${r.status}`, { status: 502 });
    }
    return new Response("sent", { status: 200 });
  } catch (e) {
    console.error("Unhandled error:", e);
    return new Response("internal error", { status: 500 });
  }
});
