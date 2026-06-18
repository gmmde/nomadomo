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

/**
 * 表示名 (display_name) を一度きりセット。
 * - サーバ側 + DB trigger で immutability を強制
 * - ローマ字 + 半角スペースのみ、2-30 文字
 */
export async function setDisplayName(formData: FormData): Promise<UserSettingsActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "not authenticated" };

    const raw = String(formData.get("display_name") ?? "").trim();
    if (!raw) return { error: "display_name required" };
    if (!/^[A-Za-z][A-Za-z ]{0,28}[A-Za-z]$/.test(raw) || raw.length < 2 || raw.length > 30) {
      return { error: "Use only roman letters and single spaces (2-30 chars)" };
    }
    // collapse multiple spaces into one
    const normalized = raw.replace(/ +/g, " ");

    // 既存 row があるかチェック (display_name 既に有るなら拒否)
    const { data: existing } = await supabase
      .from("user_settings")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing && existing.display_name) {
      return { error: "Display name is already set and cannot be changed" };
    }

    const { error } = await supabase
      .from("user_settings")
      .upsert(
        { user_id: user.id, display_name: normalized },
        { onConflict: "user_id" },
      );
    if (error) return { error: error.message };

    // 既存 guides/travelers の name にも即反映 (DB trigger と二重で safe)
    await supabase.from("guides").update({ name: normalized }).eq("user_id", user.id);
    await supabase.from("travelers").update({ name: normalized }).eq("user_id", user.id);

    return { success: true };
  } catch (e) {
    const m = e instanceof Error ? e.message : "setDisplayName failed";
    console.error("[setDisplayName]", m);
    return { error: m };
  }
}

