import { redirect, notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import EditTravelerForm from "./edit-form";

export const metadata = { title: "旅行者編集 - NomaDomo" };

export default async function EditTravelerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/travelers/edit");

  const { data: t } = await supabase
    .from("travelers")
    .select("name, country, interests, bio, image_paths, avatar_path, emoji, gender, gender_other, birth_year, nationality, occupation, hobbies, available_slots, trip_period")
    .maybeSingle();

  if (!t) notFound();

  return (
    <EditTravelerForm
      userEmail={user.email ?? ""}
      initial={{
        name: (t.name as string) ?? "",
        country: (t.country as string) ?? "",
        interests: (t.interests as string[]) ?? [],
        bio: (t.bio as string) ?? "",
        image_paths: (t.image_paths as string[]) ?? [],
        avatar_path: (t.avatar_path as string | null) ?? null,
        emoji: (t.emoji as string | null) ?? null,
        gender: (t.gender as string | null) ?? null,
        gender_other: (t.gender_other as string | null) ?? null,
        birth_year: (t.birth_year as number | null) ?? null,
        nationality: (t.nationality as string | null) ?? null,
        occupation: (t.occupation as string | null) ?? null,
        hobbies: (t.hobbies as string[]) ?? [],
        available_slots: (t.available_slots as string[]) ?? [],
        trip_period: (t.trip_period as string | null) ?? null,
      }}
    />
  );
}
