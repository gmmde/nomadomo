"use server";

import { createClient } from "@/app/lib/supabase/server";

export type StartSupportResult = { error?: string; adminUserId?: string };

/**
 * サポート (開発者) とのチャットを開始する。
 * - chat_requests / messages を SECURITY DEFINER 関数経由で初期化
 * - 返り値の adminUserId を ?support=<uuid> で渡してチャット画面を開く
 */
export async function startSupportChat(): Promise<StartSupportResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { data, error } = await supabase.rpc("start_support_chat");
  if (error) return { error: error.message };

  // RPC は table を返すので配列の先頭を取る
  const row = Array.isArray(data) ? data[0] : data;
  const adminUserId = row?.admin_user_id as string | undefined;
  if (!adminUserId) return { error: "support not available" };
  return { adminUserId };
}
