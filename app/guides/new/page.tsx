import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import GuideForm from "./guide-form";

export const metadata = { title: "Guide signup - NomaDomo" };

export default async function NewGuidePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/guides/new");

  // 既にガイドプロファイルがあれば編集画面へ
  const { data: existing } = await supabase
    .from("guides")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) redirect(`/guides/${existing.id}/edit`);

  // 旅行者プロファイルがあればそこから共通フィールドを自動入力
  const { data: traveler } = await supabase
    .from("travelers")
    .select("name, bio, emoji, avatar_path, gender, gender_other, birth_year, nationality, occupation, hobbies, available_slots, languages, image_paths")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <GuideForm
      userEmail={user.email ?? ""}
      prefill={
        traveler
          ? {
              name: (traveler.name as string) ?? "",
              bio: (traveler.bio as string) ?? "",
              emoji: (traveler.emoji as string | null) ?? null,
              avatar_path: (traveler.avatar_path as string | null) ?? null,
              gender: (traveler.gender as string | null) ?? null,
              gender_other: (traveler.gender_other as string | null) ?? null,
              birth_year: (traveler.birth_year as number | null) ?? null,
              nationality: (traveler.nationality as string | null) ?? null,
              occupation: (traveler.occupation as string | null) ?? null,
              hobbies: (traveler.hobbies as string[]) ?? [],
              available_slots: (traveler.available_slots as string[]) ?? [],
              languages: (traveler.languages as string[]) ?? [],
              image_paths: (traveler.image_paths as string[]) ?? [],
            }
          : null
      }
    />
  );
}
