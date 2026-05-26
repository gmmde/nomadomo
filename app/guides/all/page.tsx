import { createClient } from "@/app/lib/supabase/server";
import AllGuidesView, { type GuideRow } from "./all-guides-view";

export const metadata = { title: "ガイド一覧 - NomaDomo" };
export const dynamic = "force-dynamic";

export default async function AllGuidesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("guides")
    .select("id, name, emoji, university, bio, tags, languages, rate_per_day, mode, rating, tour_count, user_id, image_paths, gender, birth_year, avatar_path, created_at")
    .order("rating", { ascending: false });

  const rows: GuideRow[] = (data ?? []).map((g) => ({
    id: g.id as number,
    name: (g.name as string) ?? "",
    emoji: (g.emoji as string) ?? "🧑",
    university: (g.university as string) ?? "",
    bio: (g.bio as string) ?? "",
    tags: (g.tags as string[]) ?? [],
    languages: (g.languages as string[]) ?? [],
    rate_per_day: g.rate_per_day != null ? Number(g.rate_per_day) : null,
    mode: ((g.mode as string) ?? "paid") as "free" | "paid" | "both",
    rating: Number(g.rating) || 0,
    tour_count: Number(g.tour_count) || 0,
    user_id: (g.user_id as string | null) ?? null,
    gender: (g.gender as string | null) ?? null,
    birth_year: (g.birth_year as number | null) ?? null,
    avatar_path: (g.avatar_path as string | null) ?? null,
    created_at: g.created_at as string,
  }));

  return <AllGuidesView guides={rows} />;
}
