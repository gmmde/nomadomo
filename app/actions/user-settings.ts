"use server";

import { createClient } from "@/app/lib/supabase/server";

export type UserSettingsActionResult = { error?: string; success?: boolean } | undefined;

/**
 * 初回チュートリアルを完了済みにマーク。
 * - tutorial_completed = true
 * - 行が無ければ upsert (新規ユーザでも安全)
 * - スキップでも同じこの action を叩く (= 1回見たら再表示しない)
 *
 * 注意: 新規登録直後はサーバ側セッション同期にラグがあって getUser() が null を返すことがある。
 * その場合は redirect ではなく silent error 返却 (UI 側は close するだけで進む)。
 * redirect("/login") を投げると Next.js が 404 を返すケースが Android で観測されたため撤去。
 */
export async function completeTutorial(): Promise<UserSettingsActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "not authenticated" };

    const { error } = await supabase
      .from("user_settings")
      .upsert(
        { user_id: user.id, tutorial_completed: true },
        { onConflict: "user_id" },
      );
    if (error) return { error: error.message };
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "completeTutorial failed";
    console.error("[completeTutorial]", msg);
    return { error: msg };
  }
}
