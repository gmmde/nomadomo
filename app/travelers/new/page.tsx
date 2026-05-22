import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import TravelerForm from "./traveler-form";

export const metadata = {
  title: "旅行者登録 - NomaDomo",
};

export default async function NewTravelerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/travelers/new");
  }

  // 既に旅行者プロファイルがあるかチェック（あれば編集ページがある世界線にいずれ）
  const { data: existing } = await supabase
    .from("travelers")
    .select("id, name")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <TravelerForm
      userEmail={user.email ?? ""}
      existingName={existing?.name ?? null}
    />
  );
}
