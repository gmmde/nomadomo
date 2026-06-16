"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";

export type BlockActionResult = { error?: string; success?: boolean } | undefined;

/**
 * ターゲットユーザを block する。
 * - 既存 pending chat_request は declined に
 * - 進行中の meeting は canceled に (Stripe 与信は cancelMeet と同じ扱い)
 * - 双方向のメッセージ送信は RLS で弾かれるようになる
 */
export async function blockUser(targetUserId: string): Promise<BlockActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };
  if (!targetUserId || targetUserId === user.id) return { error: "Cannot block yourself" };

  const { error } = await supabase
    .from("user_blocks")
    .insert({ blocker_id: user.id, blocked_id: targetUserId });
  if (error && !error.message.includes("duplicate")) {
    return { error: error.message };
  }

  // 既存 pending chat_request + active meeting を片付ける (DB 関数で一括)
  await supabase.rpc("handle_user_block", {
    p_blocker: user.id,
    p_blocked: targetUserId,
  });

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/requests");
  return { success: true };
}

export async function unblockUser(targetUserId: string): Promise<BlockActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };
  if (!targetUserId) return { error: "bad target" };

  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", targetUserId);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}
