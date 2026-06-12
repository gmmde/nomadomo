"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";

export type MeetingActionResult =
  | { error?: string; success?: boolean }
  | undefined;

/**
 * 「{peer} に会う」ボタンを押したときの処理。
 *
 * - 既存ペアがなければ新規 meetings 行を user_a=自分 / status=pending_b で作成
 *   (自分は提案者なので相手 (b) 待ち)
 * - 既に相手から提案があれば (= user_a=peer, user_b=自分, status=pending_b)
 *   → 自分が「会う」ボタンを押した時点で active 化
 * - 自分が既に提案済みなら何もしない
 */
export async function proposeMeet(formData: FormData): Promise<MeetingActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const peerId = String(formData.get("peer_id") ?? "").trim();
  if (!peerId) return { error: "peer_id missing" };
  if (peerId === user.id) return { error: "Cannot meet yourself" };

  // 既存ペア検索 (双方向)
  const { data: existing } = await supabase
    .from("meetings")
    .select("id, user_a_id, user_b_id, status")
    .or(`and(user_a_id.eq.${user.id},user_b_id.eq.${peerId}),and(user_a_id.eq.${peerId},user_b_id.eq.${user.id})`)
    .in("status", ["pending_a", "pending_b", "active"])
    .maybeSingle();

  if (existing) {
    // 自分が提案者 (user_a) で、相手の承認待ち (pending_b) なら no-op
    if (existing.user_a_id === user.id && existing.status === "pending_b") {
      return { success: true }; // 既に提案済み
    }
    // 相手が提案者 (user_a) で、自分の承認待ち (pending_b) なら active に
    if (existing.user_b_id === user.id && existing.status === "pending_b") {
      const { error: e } = await supabase
        .from("meetings")
        .update({ status: "active", started_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (e) return { error: e.message };
      revalidatePath("/");
      return { success: true };
    }
    // active or completed なら no-op
    return { success: true };
  }

  // 新規提案: user_a=自分 (RLS で必須), user_b=peer, status=pending_b
  const { error } = await supabase.from("meetings").insert({
    user_a_id: user.id,
    user_b_id: peerId,
    status: "pending_b",
  });
  if (error) return { error: error.message };
  revalidatePath("/");
  return { success: true };
}

/**
 * meeting を完了状態に。決済 + 評価が両方完了したタイミングで呼ぶ。
 */
export async function completeMeet(formData: FormData): Promise<MeetingActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const idRaw = String(formData.get("meeting_id") ?? "");
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) return { error: "bad meeting_id" };

  // 当事者チェックを兼ねた fetch (RLS で当事者のみ select 可)
  const { data: m } = await supabase
    .from("meetings")
    .select("id, user_a_id, user_b_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!m) return { error: "meeting not found" };
  if (m.status !== "active") return { error: "not active" };

  const { error } = await supabase
    .from("meetings")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath(`/meetings/${id}/complete`);
  return { success: true };
}

/**
 * meeting をキャンセル (お互いどちらでも呼べる)
 */
export async function cancelMeet(formData: FormData): Promise<MeetingActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = Number(formData.get("meeting_id") ?? "");
  if (!Number.isFinite(id) || id <= 0) return { error: "bad meeting_id" };

  const { error } = await supabase
    .from("meetings")
    .update({ status: "canceled" })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  return { success: true };
}
