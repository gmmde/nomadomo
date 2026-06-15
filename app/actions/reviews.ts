"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";

export type ReviewActionResult =
  | { error?: string; success?: boolean }
  | undefined;

/**
 * meeting に対するレビュー投稿 (blind review)
 * - reviewer = 自分
 * - reviewed_user_id = peer
 * - 1 meeting × 1 reviewer は UNIQUE で 1 件 (upsert で再編集可)
 * - 投稿時点では released_at = NULL → 公開はされない
 * - 両者が投稿した瞬間に両方の released_at を now() で揃えて release
 * - 両者 release されたら meeting も completed に自動遷移
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

  // upsert (blind: released_at は未設定で挿入)
  const { error: upsertErr } = await supabase.from("reviews").upsert({
    meeting_id: meetingId,
    reviewer_id: user.id,
    reviewed_user_id: peerId,
    rating,
    comment: comment || null,
    reviewed_at: new Date().toISOString(),
  }, { onConflict: "meeting_id,reviewer_id" });
  if (upsertErr) return { error: upsertErr.message };

  // 相手側のレビュー存在チェック → 両者揃ったら両方 release
  const { data: peerReview } = await supabase
    .from("reviews")
    .select("id, released_at")
    .eq("meeting_id", meetingId)
    .eq("reviewer_id", peerId)
    .maybeSingle();

  if (peerReview) {
    const now = new Date().toISOString();
    const { error: relErr } = await supabase
      .from("reviews")
      .update({ released_at: now })
      .eq("meeting_id", meetingId)
      .is("released_at", null);
    if (relErr) {
      console.error("[postReview] release update failed:", relErr.message);
    }
    // meeting も自動 completed に
    if (m.status === "active") {
      const { error: mErr } = await supabase
        .from("meetings")
        .update({ status: "completed", completed_at: now })
        .eq("id", meetingId);
      if (mErr) console.error("[postReview] auto-complete failed:", mErr.message);
    }
  }

  revalidatePath(`/meetings/${meetingId}/complete`);
  revalidatePath("/");
  return { success: true };
}
