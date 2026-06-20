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
          <div className="font-display" style={{ fontSize: 22, fontWeight: 900, color: "#2b1d1a" }}>旅行者一覧 <span style={{ fontSize: 12, color: "#b6a48f", fontWeight: 500 }}>Travelers</span></div>
          <div style={{ flex: 1 }}/>
          <div style={{ fontSize: 11, color: "#b6a48f", fontWeight: 700 }}>{rows.length}</div>
        </div>

        {rows.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#8a7560", fontWeight: 700, background: "#fff", border: "2px dashed #f3e8d6", borderRadius: 14 }}>
            まだ旅行者登録なし
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map((t) => (
              <Link
                key={t.id}
                href={`/travelers/${t.id}`}
                style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #f3e8d6", borderRadius: 18, padding: 14, textDecoration: "none", color: "inherit", boxShadow: "0 8px 20px -16px rgba(120,50,20,.3)" }}
              >
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "#ffefd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, border: "1px solid #f0e3cf", flexShrink: 0 }}>
                  {t.emoji ?? "🧑"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-display" style={{ fontSize: 15.5, fontWeight: 800, color: "#2b1d1a" }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "#9a8a7c", fontWeight: 600 }}>
                    ✈ From {t.country}{t.occupation ? ` · ${t.occupation}` : ""}{t.trip_period ? ` · 📅 ${t.trip_period}` : ""}
                  </div>
                  {t.bio && (
                    <div style={{ fontSize: 12, color: "#555", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {t.bio}
                    </div>
                  )}
                </div>
                <div style={{ display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: 11, background: "#ffefd5", flex: "none" }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ad001c" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20.5l1.5-5.2A8.4 8.4 0 1 1 21 11.5z" /></svg></div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
