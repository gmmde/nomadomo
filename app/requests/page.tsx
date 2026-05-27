import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { respondChatRequest } from "@/app/actions/chat-requests";
import BackButton from "@/app/lib/back-button";

export const metadata = { title: "Message requests - NomaDomo" };
export const dynamic = "force-dynamic";

type Req = {
  id: number;
  traveler_id: string;
  guide_user_id: string;
  preferred_date: string | null;
  preferred_place: string | null;
  message: string | null;
  status: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "🟡 Pending", color: "#f5c649" },
  accepted: { label: "✅ Accepted", color: "#2e8b57" },
  declined: { label: "❌ Declined", color: "#ad001c" },
};

export default async function RequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/requests");

  const { data } = await supabase
    .from("chat_requests")
    .select("*")
    .order("created_at", { ascending: false });

  const all = (data ?? []) as Req[];
  const incoming = all.filter((r) => r.guide_user_id === user.id);
  const outgoing = all.filter((r) => r.traveler_id === user.id);

  const travelerIds = [...new Set(incoming.map((r) => r.traveler_id))];
  const guideUserIds = [...new Set(outgoing.map((r) => r.guide_user_id))];

  const { data: tData } = travelerIds.length > 0
    ? await supabase.from("travelers").select("user_id, name").in("user_id", travelerIds)
    : { data: [] };
  const { data: gData } = guideUserIds.length > 0
    ? await supabase.from("guides").select("user_id, name, emoji").in("user_id", guideUserIds)
    : { data: [] };

  const tMap = new Map<string, string>();
  for (const t of (tData ?? []) as Array<{ user_id: string; name: string }>) tMap.set(t.user_id, t.name);
  const gMap = new Map<string, { name: string; emoji: string }>();
  for (const g of (gData ?? []) as Array<{ user_id: string; name: string; emoji: string }>) gMap.set(g.user_id, { name: g.name, emoji: g.emoji ?? "🧑" });

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center" }}>
      <div className="screen-enter" style={{ width: "100%", maxWidth: 390, minHeight: "100vh", padding: "16px 16px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <BackButton />
          <div style={{ fontSize: 18, fontWeight: 900 }}>📨 Message requests</div>
        </div>

        {/* Incoming (as guide / local) */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, color: "#8a7560", fontWeight: 900, marginBottom: 10, textTransform: "uppercase" }}>
            Requests to you ({incoming.length})
          </div>
          {incoming.length === 0 ? (
            <div style={{ fontSize: 13, color: "#8a7560", fontWeight: 700, padding: "16px 0" }}>No requests yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {incoming.map((r) => {
                const tname = tMap.get(r.traveler_id) ?? `User (${r.traveler_id.slice(0, 8)})`;
                const s = STATUS_LABEL[r.status] ?? { label: r.status, color: "#8a7560" };
                return (
                  <div key={r.id} style={{ background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 16, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 900 }}>From {tname}</div>
                      <div style={{ fontSize: 10, fontWeight: 900, color: s.color }}>{s.label}</div>
                    </div>
                    {r.preferred_date && <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>📅 {new Date(r.preferred_date).toLocaleString()}</div>}
                    {r.preferred_place && <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>📍 {r.preferred_place}</div>}
                    {r.message && <div style={{ fontSize: 12, color: "#555", fontStyle: "italic", marginTop: 6, lineHeight: 1.5 }}>&ldquo;{r.message}&rdquo;</div>}
                    {r.status === "pending" && (
                      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                        <form action={respondChatRequest}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="action" value="accept" />
                          <button type="submit" style={{ background: "#2e8b57", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>✅ Accept (unlock chat)</button>
                        </form>
                        <form action={respondChatRequest}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="action" value="decline" />
                          <button type="submit" style={{ background: "#fff", color: "#ad001c", border: "2px solid #ad001c", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>Decline</button>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Outgoing (as traveler) */}
        <div>
          <div style={{ fontSize: 12, color: "#8a7560", fontWeight: 900, marginBottom: 10, textTransform: "uppercase" }}>
            Requests you sent ({outgoing.length})
          </div>
          {outgoing.length === 0 ? (
            <div style={{ fontSize: 13, color: "#8a7560", fontWeight: 700, padding: "16px 0" }}>Nothing sent yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {outgoing.map((r) => {
                const g = gMap.get(r.guide_user_id);
                const s = STATUS_LABEL[r.status] ?? { label: r.status, color: "#8a7560" };
                return (
                  <div key={r.id} style={{ background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 16, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 900 }}>To {g?.emoji ?? "🧑"} {g?.name ?? "Guide"}</div>
                      <div style={{ fontSize: 10, fontWeight: 900, color: s.color }}>{s.label}</div>
                    </div>
                    {r.preferred_date && <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>📅 {new Date(r.preferred_date).toLocaleString()}</div>}
                    {r.preferred_place && <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>📍 {r.preferred_place}</div>}
                    {r.message && <div style={{ fontSize: 12, color: "#555", fontStyle: "italic", marginTop: 6, lineHeight: 1.5 }}>&ldquo;{r.message}&rdquo;</div>}
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
