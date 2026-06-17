import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import TravelerForm from "./traveler-form";

export const metadata = { title: "Traveler signup - NomaDomo" };

export default async function NewTravelerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/travelers/new");


  const { data: usSettings } = await supabase
    .from("user_settings")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  const lockedDisplayName = (usSettings?.display_name as string | null) ?? null;
  // 既に旅行者プロファイルがあれば編集画面へ
  const { data: existing } = await supabase
    .from("travelers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) redirect("/travelers/edit");

  // ガイドプロファイルがあればそこから共通フィールドを自動入力
  const { data: guide } = await supabase
    .from("guides")
    .select("name, bio, emoji, avatar_path, gender, gender_other, birth_year, nationality, occupation, hobbies, available_slots, languages, image_paths")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <TravelerForm
      userEmail={user.email ?? ""}
      prefill={
        guide
          ? {
              name: (guide.name as string) ?? "",
              bio: (guide.bio as string) ?? "",
              emoji: (guide.emoji as string | null) ?? null,
              avatar_path: (guide.avatar_path as string | null) ?? null,
              gender: (guide.gender as string | null) ?? null,
              gender_other: (guide.gender_other as string | null) ?? null,
              birth_year: (guide.birth_year as number | null) ?? null,
              nationality: (guide.nationality as string | null) ?? null,
              occupation: (guide.occupation as string | null) ?? null,
              hobbies: (guide.hobbies as string[]) ?? [],
              available_slots: (guide.available_slots as string[]) ?? [],
              languages: (guide.languages as string[]) ?? [],
              image_paths: (guide.image_paths as string[]) ?? [],
            }
          : null
      }
    
      lockedDisplayName={lockedDisplayName}
    />
  );
}
