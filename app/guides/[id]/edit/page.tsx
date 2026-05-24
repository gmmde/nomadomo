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

  // RLS は SELECT public read だけど、念のため user_id でも絞って所有確認
  const { data: guide } = await supabase
    .from("guides")
    .select(
      "id, name, university, bio, emoji, rate_per_hour, tags, languages, user_id",
    )
    .eq("id", guideId)
    .maybeSingle();

  if (!guide) notFound();
  if (guide.user_id !== user.id) {
    // 他人のガイドを編集しようとしてる
    redirect("/");
  }

  return (
    <EditGuideForm
      userEmail={user.email ?? ""}
      initial={{
        id: guide.id as number,
        name: (guide.name as string) ?? "",
        university: (guide.university as string) ?? "",
        bio: (guide.bio as string) ?? "",
        emoji: (guide.emoji as string) ?? "🧑",
        rate_per_hour: (guide.rate_per_hour as number) ?? 0,
        tags: (guide.tags as string[]) ?? [],
        languages: (guide.languages as string[]) ?? [],
      }}
    />
  );
}
