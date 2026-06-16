import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import SettingsForm from "./settings-form";

export const metadata = { title: "設定 - NomaDomo" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings");

  // 自分の設定を取得 (無ければデフォルト)
  const { data: s } = await supabase
    .from("user_settings")
    .select("language, email_on_new_message, email_on_booking, show_to_anon, app_mode")
    .eq("user_id", user.id)
    .maybeSingle();

  // ブロック中ユーザー一覧 + 名前解決
  const { data: blocks } = await supabase
    .from("user_blocks")
    .select("blocked_id, created_at")
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false });

  const blockedIds = (blocks ?? []).map((b) => (b as { blocked_id: string }).blocked_id);
  let blockedList: Array<{ user_id: string; name: string; emoji: string }> = [];
  if (blockedIds.length > 0) {
    const [g, t] = await Promise.all([
      supabase.from("guides").select("user_id, name, emoji").in("user_id", blockedIds),
      supabase.from("travelers").select("user_id, name, emoji").in("user_id", blockedIds),
    ]);
    const nameMap = new Map<string, { name: string; emoji: string }>();
    for (const tv of ((t.data ?? []) as Array<{ user_id: string; name: string; emoji: string | null }>)) {
      nameMap.set(tv.user_id, { name: tv.name, emoji: tv.emoji ?? "🧑" });
    }
    for (const guide of ((g.data ?? []) as Array<{ user_id: string; name: string; emoji: string | null }>)) {
      if (!nameMap.has(guide.user_id)) nameMap.set(guide.user_id, { name: guide.name, emoji: guide.emoji ?? "🧑" });
    }
    blockedList = blockedIds.map((id) => ({
      user_id: id,
      name: nameMap.get(id)?.name ?? `User ${id.slice(0, 8)}`,
      emoji: nameMap.get(id)?.emoji ?? "👤",
    }));
  }

  return (
    <SettingsForm
      userEmail={user.email ?? ""}
      initial={{
        language: (s?.language as "ja" | "en") ?? "ja",
        email_on_new_message: s?.email_on_new_message ?? true,
        email_on_booking: s?.email_on_booking ?? true,
        show_to_anon: s?.show_to_anon ?? true,
        app_mode: (s?.app_mode === 'local' || s?.app_mode === 'traveler') ? s.app_mode : null,
      }}
      blockedList={blockedList}
    />
  );
}
