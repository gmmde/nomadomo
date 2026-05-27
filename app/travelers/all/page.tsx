import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import BackButton from "@/app/lib/back-button";

export const metadata = { title: "旅行者一覧 - NomaDomo" };
export const dynamic = "force-dynamic";

export default async function AllTravelersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/travelers/all");

  const { data } = await supabase
    .from("travelers")
    .select("id, user_id, name, country, bio, avatar_path, emoji, nationality, occupation, trip_period")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as Array<{
    id: number; user_id: string; name: string; country: string; bio: string | null;
    avatar_path: string | null; emoji: string | null; nationality: string | null;
    occupation: string | null; trip_period: string | null;
  }>;

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center" }}>
      <div className="screen-enter" style={{ width: "100%", maxWidth: 390, minHeight: "100vh", padding: "16px 16px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <BackButton />
          <div style={{ fontSize: 18, fontWeight: 900 }}>✈️ 旅行者一覧</div>
          <div style={{ flex: 1 }}/>
          <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 800 }}>{rows.length}</div>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#8a7560", fontWeight: 700, background: "#fff9f0", border: "2px dashed #e8c99a", borderRadius: 14 }}>
            まだ旅行者登録なし
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map((t) => (
              <Link
                key={t.id}
                href={`/travelers/${t.id}`}
                style={{ display: "flex", alignItems: "center", gap: 12, background: "#ffffffee", border: "2px solid #f0d9b5", borderRadius: 16, padding: 14, textDecoration: "none", color: "inherit" }}
              >
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#ffefd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, border: "2px solid #e8c99a", flexShrink: 0 }}>
                  {t.emoji ?? "🧑"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 900 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700 }}>
                    ✈ From {t.country}{t.occupation ? ` · ${t.occupation}` : ""}{t.trip_period ? ` · 📅 ${t.trip_period}` : ""}
                  </div>
                  {t.bio && (
                    <div style={{ fontSize: 12, color: "#555", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {t.bio}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 18, color: "#ad001c" }}>💬</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
