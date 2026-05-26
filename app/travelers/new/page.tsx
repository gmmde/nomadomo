import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import TravelerForm from "./traveler-form";

export const metadata = { title: "旅行者登録 - NomaDomo" };

export default async function NewTravelerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/travelers/new");

  // 既に旅行者プロファイルがあれば編集画面へ
  const { data: existing } = await supabase
    .from("travelers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) redirect("/travelers/edit");

  return <TravelerForm userEmail={user.email ?? ""} />;
}
