import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import TravelerProfileTinder, { type TravelerProfileData } from "@/app/_components/traveler-profile-tinder";

export const metadata = { title: "Traveler profile - NomaDomo" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function TravelerProfilePage({ params }: Props) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 閲覧者が local モードか判定（local→traveler は課金 / traveler→traveler は無課金）
  let viewerIsLocal = false;
  if (user) {
    const { data: settings } = await supabase
      .from("user_settings")
      .select("app_mode")
      .eq("user_id", user.id)
      .maybeSingle();
    viewerIsLocal = settings?.app_mode === "local";
  }

  // local の本日無料メッセージ枠 (1日20件)。超過分は課金。
  let freeRemaining = 20;
  if (viewerIsLocal && user) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("chat_requests")
      .select("id", { count: "exact", head: true })
      .eq("traveler_id", user.id)
      .gte("created_at", startOfDay.toISOString());
    freeRemaining = Math.max(0, 20 - (count ?? 0));
  }

  const { data } = await supabase
    .from("travelers")
    .select(
      "id, user_id, name, emoji, avatar_path, country, bio, nationality, occupation, trip_period, birth_year, interests, hobbies, languages, available_slots, image_paths",
    )
    .eq("id", numericId)
    .maybeSingle();

  if (!data) notFound();

  const traveler: TravelerProfileData = {
    user_id: (data.user_id as string | null) ?? "",
    name: (data.name as string) ?? "",
    emoji: (data.emoji as string) ?? "🧑",
    avatar_path: (data.avatar_path as string | null) ?? null,
    country: (data.country as string) ?? "",
    bio: (data.bio as string) ?? "",
    nationality: (data.nationality as string | null) ?? null,
    occupation: (data.occupation as string | null) ?? null,
    trip_period: (data.trip_period as string | null) ?? null,
    birth_year: (data.birth_year as number | null) ?? null,
    interests: (data.interests as string[]) ?? [],
    hobbies: (data.hobbies as string[]) ?? [],
    languages: (data.languages as string[]) ?? [],
    available_slots: (data.available_slots as string[]) ?? [],
    image_paths: (data.image_paths as string[]) ?? [],
  };

  return (
    <TravelerProfileTinder
      traveler={traveler}
      currentUserId={user?.id ?? null}
      isOwn={!!user && user.id === traveler.user_id}
      viewerIsLocal={viewerIsLocal}
      freeRemaining={freeRemaining}
    />
  );
}
