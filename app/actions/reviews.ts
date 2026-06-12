"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";

export type ReviewActionResult =
  | { error?: string; success?: boolean }
  | undefined;

/**
 * meeting に対するレビュー投稿。
 * - reviewer = 自分
 * - reviewed_user_id = peer (自分の対戦相手)
 * - 1 meeting × 1 reviewer は UNIQUE で 1 件
 */
export async function postReview(formData: FormData): Promise<ReviewActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const meetingId = Number(formData.get("meeting_id") ?? "");
  const rating = Number(formData.get("rating") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();

  if (!Number.isFinite(meetingId) || meetingId <= 0) return { error: "bad meeting_id" };
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return { error: "rating must be 1-5" };
  if (comment.length > 1000) return { error: "comment too long (max 1000 chars)" };

  // 当事者チェック + 相手 user_id 取得 (RLS で SELECT は当事者のみ)
  const { data: m } = await supabase
    .from("meetings")
    .select("user_a_id, user_b_id, status")
    .eq("id", meetingId)
    .maybeSingle();
  if (!m) return { error: "meeting not found" };
  if (m.status !== "active" && m.status !== "completed") {
    return { error: "meeting not finished" };
  }

  const peerId = m.user_a_id === user.id ? m.user_b_id : m.user_a_id;
  if (!peerId) return { error: "peer not resolved" };

  // upsert: 同じ meeting に同じ reviewer なら更新 (★やコメント編集対応)
  const { error } = await supabase.from("reviews").upsert({
    meeting_id: meetingId,
    reviewer_id: user.id,
    reviewed_user_id: peerId,
    rating,
    comment: comment || null,
    reviewed_at: new Date().toISOString(),
  }, { onConflict: "meeting_id,reviewer_id" });
  if (error) return { error: error.message };

  revalidatePath(`/meetings/${meetingId}/complete`);
  revalidatePath("/");
  return { success: true };
}
