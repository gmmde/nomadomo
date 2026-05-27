import { redirect } from "next/navigation";
import BackButton from "@/app/lib/back-button";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import { updateBookingStatus } from "@/app/actions/bookings";

export const metadata = { title: "Bookings - NomaDomo" };

type Booking = {
  id: number;
  traveler_id: string;
  guide_id: number;
  guide_user_id: string;
  start_at: string;
  hours: number;
  total_yen: number;
  status: string;
  message: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "🟡 Pending",
  accepted: "✅ Accepted",
  declined: "❌ Declined",
  cancelled: "🚫 Cancelled",
  completed: "🎉 Completed",
};

export default async function BookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/bookings");

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .order("start_at", { ascending: false });

  const all = (bookings ?? []) as Booking[];
  const asTraveler = all.filter((b) => b.traveler_id === user.id);
  const asGuide = all.filter((b) => b.guide_user_id === user.id);

  // Resolve guide names (for bookings where I am the traveler)
  const guideIds = [...new Set(asTraveler.map((b) => b.guide_id))];
  const { data: guidesData } = guideIds.length > 0
    ? await supabase.from("guides").select("id, name, emoji").in("id", guideIds)
    : { data: [] };
  const guideMap = new Map<number, { name: string; emoji: string }>();
  for (const g of (guidesData ?? []) as Array<{ id: number; name: string; emoji: string }>) {
    guideMap.set(g.id, { name: g.name, emoji: g.emoji ?? "🧑" });
  }

  // Traveler names (for bookings where I am the guide)
  const travelerIds = [...new Set(asGuide.map((b) => b.traveler_id))];
  const { data: travelersData } = travelerIds.length > 0
    ? await supabase.from("travelers").select("user_id, name").in("user_id", travelerIds)
    : { data: [] };
  const travelerMap = new Map<string, string>();
  for (const t of (travelersData ?? []) as Array<{ user_id: string; name: string }>) {
    travelerMap.set(t.user_id, t.name);
  }

  return (
    <div style={{ background: "#f5ead0", minHeight: "100vh", display: "flex", justifyContent: "center" }}>
      <div className="screen-enter" style={{ width: "100%", maxWidth: 390, minHeight: "100vh", background: "#f5ead0", padding: "32px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <BackButton />
          <div style={{ fontSize: 20, fontWeight: 900 }}>Bookings</div>
        </div>

        {/* 自分が申し込んだ予約 */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#8a7560", marginBottom: 12, textTransform: "uppercase" }}>
            You requested ({asTraveler.length})
          </div>
          {asTraveler.length === 0 ? (
            <div style={{ fontSize: 13, color: "#8a7560", fontWeight: 700, padding: "12px 0" }}>No bookings yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {asTraveler.map((b) => {
                const g = guideMap.get(b.guide_id);
                return (
                  <div key={b.id} style={{ background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 16, padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#ffefd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, border: "2px solid #e8c99a" }}>{g?.emoji ?? "🧑"}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 900 }}>{g?.name ?? `Guide #${b.guide_id}`}</div>
                        <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700 }}>{new Date(b.start_at).toLocaleString()}</div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 900 }}>{STATUS_LABEL[b.status] ?? b.status}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#1a1008", fontWeight: 700 }}>{b.hours}d · ¥{b.total_yen.toLocaleString()}</div>
                    {b.message && <div style={{ fontSize: 12, color: "#8a7560", fontWeight: 600, marginTop: 6, fontStyle: "italic" }}>“{b.message}”</div>}
                    {b.status === "pending" && (
                      <form action={updateBookingStatus} style={{ marginTop: 10 }}>
                        <input type="hidden" name="id" value={b.id} />
                        <input type="hidden" name="next_status" value="cancelled" />
                        <button type="submit" style={{ background: "#fff", color: "#ad001c", border: "2px solid #ad001c", borderRadius: 10, padding: "6px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                          Cancel
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 自分が受けた予約リクエスト (ガイドとして) */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#8a7560", marginBottom: 12, textTransform: "uppercase" }}>
            Requests to you ({asGuide.length})
          </div>
          {asGuide.length === 0 ? (
            <div style={{ fontSize: 13, color: "#8a7560", fontWeight: 700, padding: "12px 0" }}>No requests yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {asGuide.map((b) => {
                const tname = travelerMap.get(b.traveler_id) ?? `User (${b.traveler_id.slice(0, 8)})`;
                return (
                  <div key={b.id} style={{ background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 16, padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#ffefd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, border: "2px solid #e8c99a" }}>🧑</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 900 }}>{tname}</div>
                        <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700 }}>{new Date(b.start_at).toLocaleString("ja-JP")}</div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 900 }}>{STATUS_LABEL[b.status] ?? b.status}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#1a1008", fontWeight: 700 }}>{b.hours}d · ¥{b.total_yen.toLocaleString()}</div>
                    {b.message && <div style={{ fontSize: 12, color: "#8a7560", fontWeight: 600, marginTop: 6, fontStyle: "italic" }}>“{b.message}”</div>}
                    {b.status === "pending" && (
                      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                        <form action={updateBookingStatus}>
                          <input type="hidden" name="id" value={b.id} />
                          <input type="hidden" name="next_status" value="accepted" />
                          <button type="submit" style={{ background: "#2e8b57", color: "#fff", border: "none", borderRadius: 10, padding: "6px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Accept</button>
                        </form>
                        <form action={updateBookingStatus}>
                          <input type="hidden" name="id" value={b.id} />
                          <input type="hidden" name="next_status" value="declined" />
                          <button type="submit" style={{ background: "#fff", color: "#ad001c", border: "2px solid #ad001c", borderRadius: 10, padding: "6px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Decline</button>
                        </form>
                      </div>
                    )}
                    {b.status === "accepted" && (
                      <form action={updateBookingStatus} style={{ marginTop: 10 }}>
                        <input type="hidden" name="id" value={b.id} />
                        <input type="hidden" name="next_status" value="completed" />
                        <button type="submit" style={{ background: "#ad001c", color: "#fff", border: "none", borderRadius: 10, padding: "6px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                          Mark completed
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
