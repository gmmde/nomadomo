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
    .select("language, email_on_new_message, email_on_booking, show_to_anon")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <SettingsForm
      userEmail={user.email ?? ""}
      initial={{
        language: (s?.language as "ja" | "en") ?? "ja",
        email_on_new_message: s?.email_on_new_message ?? true,
        email_on_booking: s?.email_on_booking ?? true,
        show_to_anon: s?.show_to_anon ?? true,
      }}
    />
  );
}
