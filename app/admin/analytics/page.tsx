import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";

export const metadata = { title: "分析ダッシュボード - NomaDomo" };
export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "tonoikenta@icloud.com")
  .split(",")
  .map((s) => s.trim().toLowerCase());

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/analytics");
  if (!ADMIN_EMAILS.includes((user.email ?? "").toLowerCase())) {
    redirect("/");
  }

  // 各 count を並列取得 (head: true で件数だけ)
  const [
    guidesAll, guidesReal, travelersAll, messagesAll, bookingsAll, followsAll, savedAll, reportsAll,
    bookingsPending, bookingsAccepted, bookingsCompleted,
    last7Guides, last7Travelers, last7Messages, last7Bookings,
  ] = await Promise.all([
    supabase.from("guides").select("*", { count: "exact", head: true }),
    supabase.from("guides").select("*", { count: "exact", head: true }).not("user_id", "is", null),
    supabase.from("travelers").select("*", { count: "exact", head: true }),
    supabase.from("messages").select("*", { count: "exact", head: true }),
    supabase.from("bookings").select("*", { count: "exact", head: true }),
    supabase.from("follows").select("*", { count: "exact", head: true }),
    supabase.from("saved_guides").select("*", { count: "exact", head: true }),
    supabase.from("reports").select("*", { count: "exact", head: true }),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "accepted"),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("guides").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo()),
    supabase.from("travelers").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo()),
    supabase.from("messages").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo()),
    supabase.from("bookings").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo()),
  ]);

  // 直近メッセージ件数 (日別 14日)
  const { data: msgRows } = await supabase
    .from("messages")
    .select("created_at")
    .gte("created_at", fourteenDaysAgo())
    .order("created_at");
  const dailyMessages = bucketByDay((msgRows ?? []).map((r) => r.created_at as string), 14);

  // タグ別 guide 数
  const { data: tagRows } = await supabase.from("guides").select("tags");
  const tagCounts: Record<string, number> = {};
  for (const r of (tagRows ?? []) as Array<{ tags: string[] | null }>) {
    for (const t of r.tags ?? []) tagCounts[t] = (tagCounts[t] ?? 0) + 1;
  }
  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // total revenue (accepted + completed) 概算
  const { data: bookRows } = await supabase
    .from("bookings")
    .select("total_yen, status")
    .in("status", ["accepted", "completed"]);
  const grossYen = (bookRows ?? []).reduce((s, b) => s + Number(b.total_yen ?? 0), 0);

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center" }}>
      <div className="screen-enter" style={{ width: "100%", maxWidth: 390, padding: "20px 16px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Link href="/" style={{ color: "#ad001c", fontSize: 22, textDecoration: "none" }}>←</Link>
          <div style={{ fontSize: 18, fontWeight: 900 }}>📊 分析ダッシュボード</div>
        </div>

        <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700, marginBottom: 16 }}>
          ログイン中: {user.email} (admin)
        </div>

        <Section title="全体">
          <Grid>
            <Card label="ガイド (合計)" value={fmt(guidesAll.count)} sub={`実ユーザー: ${fmt(guidesReal.count)}`} />
            <Card label="旅行者" value={fmt(travelersAll.count)} />
            <Card label="メッセージ" value={fmt(messagesAll.count)} />
            <Card label="フォロー" value={fmt(followsAll.count)} />
            <Card label="保存 (Saved)" value={fmt(savedAll.count)} />
            <Card label="通報" value={fmt(reportsAll.count)} />
          </Grid>
        </Section>

        <Section title="予約">
          <Grid>
            <Card label="全予約" value={fmt(bookingsAll.count)} />
            <Card label="申請中" value={fmt(bookingsPending.count)} accent="#f5c649" />
            <Card label="承認済み" value={fmt(bookingsAccepted.count)} accent="#2e8b57" />
            <Card label="完了" value={fmt(bookingsCompleted.count)} accent="#2ecc71" />
          </Grid>
          <Card label="承認/完了 合計金額" value={`¥${grossYen.toLocaleString()}`} big />
        </Section>

        <Section title="直近7日間">
          <Grid>
            <Card label="新規ガイド" value={fmt(last7Guides.count)} />
            <Card label="新規旅行者" value={fmt(last7Travelers.count)} />
            <Card label="送信メッセージ" value={fmt(last7Messages.count)} />
            <Card label="新規予約" value={fmt(last7Bookings.count)} />
          </Grid>
        </Section>

        <Section title="メッセージ推移 (14日)">
          <DailyBar data={dailyMessages} />
        </Section>

        <Section title="人気タグ (TOP 10)">
          {sortedTags.length === 0 ? (
            <div style={{ fontSize: 12, color: "#8a7560" }}>データなし</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sortedTags.map(([tag, n]) => {
                const max = sortedTags[0][1];
                const pct = Math.round((n / max) * 100);
                return (
                  <div key={tag} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 70, fontSize: 11, fontWeight: 800, color: "#1a1008" }}>{tag}</div>
                    <div style={{ flex: 1, height: 14, background: "#f0d9b5", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "#ad001c" }} />
                    </div>
                    <div style={{ width: 28, textAlign: "right", fontSize: 11, fontWeight: 800, color: "#8a7560" }}>{n}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function fmt(n: number | null): string {
  return (n ?? 0).toLocaleString();
}

function sevenDaysAgo(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}
function fourteenDaysAgo(): string {
  return new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
}

function bucketByDay(timestamps: string[], days: number): Array<{ day: string; count: number }> {
  const result: Array<{ day: string; count: number }> = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    result.push({ day: key.slice(5), count: 0 });
  }
  for (const ts of timestamps) {
    const k = ts.slice(0, 10).slice(5);
    const row = result.find((r) => r.day === k);
    if (row) row.count++;
  }
  return result;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 13, color: "#8a7560", fontWeight: 900, marginBottom: 8, textTransform: "uppercase" }}>{title}</div>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
      {children}
    </div>
  );
}

function Card({ label, value, sub, accent, big }: { label: string; value: string; sub?: string; accent?: string; big?: boolean }) {
  return (
    <div style={{ background: "#fff9f0", border: `2px solid ${accent ?? "#e8c99a"}`, borderRadius: 14, padding: big ? 14 : 12, gridColumn: big ? "span 2" : undefined }}>
      <div style={{ fontSize: 10, color: "#8a7560", fontWeight: 800, marginBottom: 4, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: big ? 24 : 22, fontWeight: 900, color: accent ?? "#ad001c" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "#8a7560", fontWeight: 700, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function DailyBar({ data }: { data: Array<{ day: string; count: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div style={{ background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 14, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80 }}>
        {data.map((d) => {
          const h = (d.count / max) * 70 + 2;
          return (
            <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }} title={`${d.day}: ${d.count}件`}>
              <div style={{ fontSize: 8, fontWeight: 800, color: "#8a7560" }}>{d.count || ""}</div>
              <div style={{ width: "100%", height: `${h}px`, background: d.count > 0 ? "#ad001c" : "#f0d9b5", borderRadius: 2 }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, color: "#8a7560", fontWeight: 700 }}>
        <span>{data[0]?.day ?? ""}</span>
        <span>{data[data.length - 1]?.day ?? ""}</span>
      </div>
    </div>
  );
}
