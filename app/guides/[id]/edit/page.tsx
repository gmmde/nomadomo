import { redirect, notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import EditGuideForm from "./edit-form";

export const metadata = { title: "ガイド編集 - NomaDomo" };

type Props = { params: Promise<{ id: string }> };

export default async function EditGuidePage({ params }: Props) {
  const { id } = await params;
  const guideId = Number(id);
  if (!Number.isFinite(guideId) || guideId <= 0) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/guides/${id}/edit`);

  const { data: guide } = await supabase
    .from("guides")
    .select(
      "id, name, university, bio, emoji, rate_per_day, mode, tags, languages, user_id, image_paths, gender, birth_year, avatar_path, areas",
    )
    .eq("id", guideId)
    .maybeSingle();

  if (!guide) notFound();
  if (guide.user_id !== user.id) redirect("/");

  return (
    <EditGuideForm
      userEmail={user.email ?? ""}
      initial={{
        id: guide.id as number,
        name: (guide.name as string) ?? "",
        university: (guide.university as string) ?? "",
        bio: (guide.bio as string) ?? "",
        emoji: (guide.emoji as string) ?? "🧑",
        rate_per_day: (guide.rate_per_day as number | null) ?? null,
        mode: ((guide.mode as string) ?? "paid") as "free" | "paid" | "both",
        tags: (guide.tags as string[]) ?? [],
        languages: (guide.languages as string[]) ?? [],
        image_paths: (guide.image_paths as string[]) ?? [],
        gender: (guide.gender as string | null) ?? null,
        birth_year: (guide.birth_year as number | null) ?? null,
        avatar_path: (guide.avatar_path as string | null) ?? null,
        areas: (guide.areas as string[]) ?? ["Kyoto"],
      }}
    />
  );
}
