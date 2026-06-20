import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

export const metadata = { title: "Match history - NomaDomo" };
export const dynamic = "force-dynamic";

type HistoryRow = {
  meetingId: number;
  peerName: string;
  peerEmoji: string;
  peerId: string;
  startedAt: string | null;
  completedAt: string | null;
  myReview: { rating: number; comment: string | null } | null;
  peerReview: { rating: number; comment: string | null; reviewerName: string } | null;
};

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/history");

  // 自分の completed meetings
  const { data: meetings } = await supabase
    .from("meetings")
    .select("id, user_a_id, user_b_id, started_at, completed_at, status")
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(200);

  const rows: HistoryRow[] = [];
  const peerIds = new Set<string>();
  const meetingIds: number[] = [];
  for (const m of (meetings ?? []) as Array<{ id: number; user_a_id: string; user_b_id: string; started_at: string; completed_at: string }>) {
    const peerId = m.user_a_id === user.id ? m.user_b_id : m.user_a_id;
    peerIds.add(peerId);
    meetingIds.push(m.id);
  }

  if (meetingIds.length === 0) {
    return <HistoryView rows={[]} />;
  }

  // 名前解決 (guides + travelers)
  const [g, t, revs] = await Promise.all([
    supabase.from("guides").select("user_id, name, emoji").in("user_id", Array.from(peerIds)),
    supabase.from("travelers").select("user_id, name, emoji").in("user_id", Array.from(peerIds)),
    supabase.from("reviews").select("meeting_id, reviewer_id, rating, comment, released_at").in("meeting_id", meetingIds),
  ]);
  const nameMap = new Map<string, { name: string; emoji: string }>();
  for (const tv of ((t.data ?? []) as Array<{ user_id: string; name: string; emoji: string | null }>)) {
    nameMap.set(tv.user_id, { name: tv.name, emoji: tv.emoji ?? "🧑" });
  }
  for (const guide of ((g.data ?? []) as Array<{ user_id: string; name: string; emoji: string | null }>)) {
    if (!nameMap.has(guide.user_id)) nameMap.set(guide.user_id, { name: guide.name, emoji: guide.emoji ?? "🧑" });
  }
  // reviews を meeting ごとにまとめる
  const reviewsByMeeting = new Map<number, Array<{ reviewer_id: string; rating: number; comment: string | null; released_at: string | null }>>();
  for (const r of (revs.data ?? []) as Array<{ meeting_id: number; reviewer_id: string; rating: number; comment: string | null; released_at: string | null }>) {
    const arr = reviewsByMeeting.get(r.meeting_id) ?? [];
    arr.push(r);
    reviewsByMeeting.set(r.meeting_id, arr);
  }

  for (const m of (meetings ?? []) as Array<{ id: number; user_a_id: string; user_b_id: string; started_at: string; completed_at: string }>) {
    const peerId = m.user_a_id === user.id ? m.user_b_id : m.user_a_id;
    const peer = nameMap.get(peerId);
    const meetRevs = reviewsByMeeting.get(m.id) ?? [];
    const myRev = meetRevs.find((r) => r.reviewer_id === user.id) ?? null;
    const peerRev = meetRevs.find((r) => r.reviewer_id === peerId && r.released_at) ?? null;
    rows.push({
      meetingId: m.id,
      peerName: peer?.name ?? `User ${peerId.slice(0, 8)}`,
      peerEmoji: peer?.emoji ?? "👤",
      peerId,
      startedAt: m.started_at ?? null,
      completedAt: m.completed_at ?? null,
      myReview: myRev ? { rating: myRev.rating, comment: myRev.comment } : null,
      peerReview: peerRev ? { rating: peerRev.rating, comment: peerRev.comment, reviewerName: peer?.name ?? "Peer" } : null,
    });
  }

  return <HistoryView rows={rows} />;
}

function HistoryView({ rows }: { rows: HistoryRow[] }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center" }}>
      <div className="screen-enter" style={{ width: "100%", maxWidth: 390, minHeight: "100vh", padding: "20px 16px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <Link href="/" style={{ background: "none", border: "none", color: "#ad001c", fontSize: 22, textDecoration: "none" }}>←</Link>
          <div style={{ fontSize: 20, fontWeight: 900 }}>🎉 Match history</div>
        </div>

        {rows.length === 0 ? (
          <div style={{ background: "#fff", border: "2px dashed #f3e8d6", borderRadius: 16, padding: 28, textAlign: "center", color: "#8a7560", fontWeight: 700, fontSize: 13 }}>
            まだマッチ履歴はないわよ。誰かと「Meet」して、お互いレビューしたらここに残るから。
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {rows.map((r) => {
              const date = r.completedAt ? new Date(r.completedAt).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" }) : "";
              return (
                <div key={r.meetingId} style={{ background: "#fff", border: "1px solid #ecdcc4", borderRadius: 16, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#ffefd5", border: "1px solid #ecdcc4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{r.peerEmoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: "#1a1008" }}>{r.peerName}</div>
                      {date && <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700 }}>📅 {date}</div>}
                    </div>
                  </div>
                  {r.myReview ? (
                    <div style={{ background: "#fff", border: "1px solid #ecdcc4", borderRadius: 10, padding: 10, marginBottom: 6 }}>
                      <div style={{ fontSize: 10, color: "#8a7560", fontWeight: 800, marginBottom: 4 }}>あなたのレビュー</div>
                      <div style={{ fontSize: 12, color: "#f5c649", fontWeight: 900 }}>{"★".repeat(r.myReview.rating)}<span style={{ color: "#f3e8d6" }}>{"★".repeat(5 - r.myReview.rating)}</span></div>
                      {r.myReview.comment && <div style={{ fontSize: 12, color: "#1a1008", marginTop: 4, whiteSpace: "pre-wrap" }}>{r.myReview.comment}</div>}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700, fontStyle: "italic", padding: "4px 0" }}>レビュー未投稿</div>
                  )}
                  {r.peerReview ? (
                    <div style={{ background: "#fff", border: "1px solid #ecdcc4", borderRadius: 10, padding: 10 }}>
                      <div style={{ fontSize: 10, color: "#8a7560", fontWeight: 800, marginBottom: 4 }}>{r.peerReview.reviewerName} からのレビュー</div>
                      <div style={{ fontSize: 12, color: "#f5c649", fontWeight: 900 }}>{"★".repeat(r.peerReview.rating)}<span style={{ color: "#f3e8d6" }}>{"★".repeat(5 - r.peerReview.rating)}</span></div>
                      {r.peerReview.comment && <div style={{ fontSize: 12, color: "#1a1008", marginTop: 4, whiteSpace: "pre-wrap" }}>{r.peerReview.comment}</div>}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700, fontStyle: "italic", padding: "4px 0" }}>相手のレビュー未公開</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
