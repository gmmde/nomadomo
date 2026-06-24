import { createClient } from "@/app/lib/supabase/server";
import AllGuidesView, { type GuideRow } from "./all-guides-view";

export const metadata = { title: "All guides - NomaDomo" };
export const dynamic = "force-dynamic";

export default async function AllGuidesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("guides")
    .select("id, name, emoji, university, bio, tags, languages, rate_per_day, mode, rating, tour_count, user_id, image_paths, gender, birth_year, avatar_path, areas, available_slots, created_at")
    .or("paused.is.null,paused.eq.false")
    .order("rating", { ascending: false });

  // 公開済みレビューから実評価(平均)と件数を集計 (guides.rating は未更新のため読み取り時に算出)
  const { data: revRows } = await supabase
    .from("reviews")
    .select("reviewed_user_id, rating")
    .not("released_at", "is", null);
  const revAgg = new Map<string, { sum: number; n: number }>();
  for (const r of (revRows ?? []) as Array<{ reviewed_user_id: string | null; rating: number }>) {
    if (!r.reviewed_user_id) continue;
    const a = revAgg.get(r.reviewed_user_id) ?? { sum: 0, n: 0 };
    a.sum += Number(r.rating) || 0;
    a.n += 1;
    revAgg.set(r.reviewed_user_id, a);
  }

  const rows: GuideRow[] = (data ?? []).map((g) => ({
    id: g.id as number,
    name: (g.name as string) ?? "",
    emoji: (g.emoji as string) ?? "🧑",
    university: (g.university as string) ?? "",
    bio: (g.bio as string) ?? "",
    tags: (g.tags as string[]) ?? [],
    languages: (g.languages as string[]) ?? [],
    rate_per_day: g.rate_per_day != null ? Number(g.rate_per_day) : null,
    mode: (((g.mode as string) === "free" ? "free" : "paid") as "free" | "paid"),
    rating: (() => { const a = g.user_id ? revAgg.get(g.user_id as string) : undefined; return a && a.n > 0 ? a.sum / a.n : 0; })(),
    tour_count: (() => { const a = g.user_id ? revAgg.get(g.user_id as string) : undefined; return a ? a.n : 0; })(),
    user_id: (g.user_id as string | null) ?? null,
    gender: (g.gender as string | null) ?? null,
    birth_year: (g.birth_year as number | null) ?? null,
    avatar_path: (g.avatar_path as string | null) ?? null,
    areas: (g.areas as string[]) ?? ["Japan"],
    available_slots: (g.available_slots as string[]) ?? [],
    created_at: g.created_at as string,
  }));

  return <AllGuidesView guides={rows} />;
}
