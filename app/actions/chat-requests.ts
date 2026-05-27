"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";

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
  if (!guideUserId) return { error: "ガイドが指定されてない" };
  if (guideUserId === user.id) return { error: "自分自身にはリクエストできない" };

  const dateRaw = String(formData.get("preferred_date") ?? "").trim();
  const place = String(formData.get("preferred_place") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!dateRaw) return { error: "希望日時を選んで" };
  const date = new Date(dateRaw);
  if (isNaN(date.getTime())) return { error: "日時の形式がおかしい" };
  if (date.getTime() <= Date.now()) return { error: "未来の日時にして" };

  if (!place || place.length < 1) return { error: "行きたい場所を書いて" };
  if (place.length > 200) return { error: "場所は200文字以内で" };
  if (message.length > 1000) return { error: "メッセージは1000文字以内で" };

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
        ? "既に承認済みリクエストがあるわよ。Inbox からチャット開いて"
        : "既に申請中のリクエストがあるわよ。返事待ち",
    };
  }

  const { error } = await supabase.from("chat_requests").insert({
    traveler_id: user.id,
    guide_user_id: guideUserId,
    preferred_date: date.toISOString(),
    preferred_place: place,
    message: message || null,
    status: "pending",
  });
  if (error) return { error: error.message };

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
  revalidatePath("/requests");
}
