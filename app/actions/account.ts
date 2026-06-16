"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

export type AccountActionResult = { error?: string; success?: boolean } | undefined;

const GRACE_DAYS = 30;

/**
 * アカウント削除をリクエスト。
 * - account_deletions に scheduled_at = now+30d で行を作る (or canceled_at をクリアして再開)
 * - signOut までは action 側でやらない (UI でログアウト確定を別途) — sign out するならコンポーネント側で
 *   実際にはここで signOut を呼ぶと next.js が redirect で例外吐く可能性があるので、別 server action か client signOut が安全
 */
export async function requestAccountDeletion(): Promise<AccountActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const scheduledAt = new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("account_deletions")
    .upsert(
      { user_id: user.id, scheduled_at: scheduledAt, requested_at: new Date().toISOString(), canceled_at: null },
      { onConflict: "user_id" },
    );
  if (error) return { error: error.message };
  return { success: true };
}

/** 削除リクエスト取り消し */
export async function cancelAccountDeletion(): Promise<AccountActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { error } = await supabase
    .from("account_deletions")
    .update({ canceled_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("canceled_at", null);
  if (error) return { error: error.message };
  return { success: true };
}
