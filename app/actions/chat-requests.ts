"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { notifyChatRequestSent, notifyMessageSent } from "@/app/actions/notify";

export type RequestFormState =
  | { error?: string; success?: boolean }
  | undefined;

export async function createChatRequest(
  _prev: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const guideUserId = String(formData.get("guide_user_id") ?? "").trim();
  if (!guideUserId) return { error: (formData.get("lang") === "ja" ? "ガイドが指定されてない" : "No guide specified") };
  if (guideUserId === user.id) return { error: (formData.get("lang") === "ja" ? "自分自身にはリクエストできない" : "You can't request yourself") };

  const dateRaw = String(formData.get("preferred_date") ?? "").trim();
  const place = String(formData.get("preferred_place") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  let dateIso: string | null = null;
  if (dateRaw) {
    const date = new Date(dateRaw);
    if (isNaN(date.getTime())) return { error: (formData.get("lang") === "ja" ? "日時の形式がおかしい" : "Invalid date format") };
    if (date.getTime() <= Date.now()) return { error: (formData.get("lang") === "ja" ? "未来の日時にして" : "Pick a future date") };
    dateIso = date.toISOString();
  }

  if (place.length > 200) return { error: (formData.get("lang") === "ja" ? "場所は200文字以内で" : "Place must be 200 characters or fewer") };
  if (message.length > 1000) return { error: (formData.get("lang") === "ja" ? "メッセージは1000文字以内で" : "Message must be 1000 characters or fewer") };
  if (!dateIso && !place && !message) return { error: (formData.get("lang") === "ja" ? "日時・場所・メッセージのうち最低1つは入れて" : "Enter at least one of date, place, or message") };

  // 既に pending or accepted のリクエストがあるかチェック
  const { data: existing } = await supabase
    .from("chat_requests")
    .select("id, status")
    .eq("traveler_id", user.id)
    .eq("guide_user_id", guideUserId)
    .in("status", ["pending", "accepted"])
    .limit(1);
  if (existing && existing.length > 0) {
    const s = existing[0].status;
    return {
      error: s === "accepted"
        ? (formData.get("lang") === "ja" ? "既に承認済みリクエストがあるわよ。Inbox からチャット開いて" : "You already have an accepted request. Open the chat from your Inbox.")
        : (formData.get("lang") === "ja" ? "既に申請中のリクエストがあるわよ。返事待ち" : "You already have a pending request. Awaiting a reply."),
    };
  }

  const { error } = await supabase.from("chat_requests").insert({
    traveler_id: user.id,
    guide_user_id: guideUserId,
    preferred_date: dateIso,
    preferred_place: place || null,
    message: message || null,
    status: "pending",
  });
  if (error) return { error: error.message };

  // Push 通知 (fire-and-forget)
  notifyChatRequestSent({ guideUserId }).catch(() => {});

  revalidatePath("/requests");
  return { success: true };
}

export async function respondChatRequest(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const idRaw = String(formData.get("id") ?? "");
  const id = Number(idRaw);
  const action = String(formData.get("action") ?? "");
  if (!Number.isFinite(id) || !["accept", "decline"].includes(action)) return;

  const { data: req } = await supabase
    .from("chat_requests")
    .select("guide_user_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!req) return;
  if (req.guide_user_id !== user.id) return; // ガイド本人のみ
  if (req.status !== "pending") return;

  const next = action === "accept" ? "accepted" : "declined";
  await supabase.from("chat_requests").update({ status: next }).eq("id", id);

  // accept 時: チャットスレッドを即作成するため、ガイドから受諾メッセージを 1 件挿入
  // (messages_insert_as_sender RLS は sender_id = auth.uid() を要求するので guide のみ insert 可)
  // traveler の元メッセージは引用形式で本文に埋め込む
  if (next === "accepted") {
    const { data: full } = await supabase
      .from("chat_requests")
      .select("traveler_id, guide_user_id, message")
      .eq("id", id)
      .maybeSingle();
    if (full) {
      // 既存スレッドがあるかチェック (両方向)
      const { data: existingMsg } = await supabase
        .from("messages")
        .select("id")
        .or(`and(sender_id.eq.${full.traveler_id},recipient_id.eq.${full.guide_user_id}),and(sender_id.eq.${full.guide_user_id},recipient_id.eq.${full.traveler_id})`)
        .limit(1);
      if (!existingMsg || existingMsg.length === 0) {
        const origMsg = (full.message as string | null)?.trim() ?? "";
        const acceptBody = origMsg
          ? `👋 Request accepted! Let's chat.\n\nYou wrote:\n> ${origMsg.split("\n").join("\n> ")}`
          : "👋 Request accepted! Let's chat.";
        // guide (= current user) を sender、traveler を recipient にして 1 件 insert (RLS OK)
        const { error: msgErr } = await supabase.from("messages").insert({
          sender_id: full.guide_user_id as string,
          recipient_id: full.traveler_id as string,
          body: acceptBody,
        });
        if (msgErr) {
          console.error("[respondChatRequest] seed message failed:", msgErr.message);
        } else {
          notifyMessageSent({
            recipientId: full.traveler_id as string,
            preview: "✅ Your request was accepted!",
          }).catch(() => {});
        }
      }
    }
  }

  revalidatePath("/requests");
  revalidatePath("/");
}
