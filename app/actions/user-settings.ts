"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

export type UserSettingsActionResult = { error?: string; success?: boolean } | undefined;

/**
 * 初回チュートリアルを完了済みにマーク。
 * - tutorial_completed = true
 * - 行が無ければ upsert (新規ユーザでも安全)
 * - スキップでも同じこの action を叩く (= 1回見たら再表示しない)
 */
export async function completeTutorial(): Promise<UserSettingsActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, tutorial_completed: true },
      { onConflict: "user_id" },
    );
  if (error) return { error: error.message };
  return { success: true };
}
