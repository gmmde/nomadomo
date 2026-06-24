"use client";

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { useLang, t, type Lang } from "../lib/i18n";

type ReviewRow = {
  id: number;
  rating: number;
  comment: string | null;
  reviewed_at: string;
  reviewer_id: string;
  meeting_id: number;
};

type ReviewerInfo = { name: string; nationality: string | null };

type Meta = {
  reviewer: ReviewerInfo;
  metAt: string | null;
};

type Props = {
  reviewedUserId: string;
  lang?: Lang;
};

export default function ReviewsSection({ reviewedUserId, lang: langProp }: Props) {
  const [langHook] = useLang();
  const lang = langProp ?? langHook;
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [metaById, setMetaById] = useState<Record<number, Meta>>({});
  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState(0);
  const [count, setCount] = useState(0);
  const dateLocale = lang === "ja" ? "ja-JP" : "en-US";

  useEffect(() => {
    if (!reviewedUserId) return;
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Blind review: released_at IS NOT NULL のみ公開対象
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment, reviewed_at, reviewer_id, meeting_id")
        .eq("reviewed_user_id", reviewedUserId)
        .not("released_at", "is", null)
        .order("reviewed_at", { ascending: false });
      if (cancelled) return;
      const rows = (data ?? []) as ReviewRow[];
      setReviews(rows);
      setCount(rows.length);
      setAvgRating(rows.length === 0 ? 0 : rows.reduce((s, r) => s + r.rating, 0) / rows.length);

      if (rows.length > 0) {
        const reviewerIds = [...new Set(rows.map((r) => r.reviewer_id))];
        const meetingIds = [...new Set(rows.map((r) => r.meeting_id))];
        const [gRes, tRes, mRes] = await Promise.all([
          supabase.from("guides").select("user_id, name, nationality").in("user_id", reviewerIds),
          supabase.from("travelers").select("user_id, name, nationality").in("user_id", reviewerIds),
          supabase.from("meetings").select("id, started_at").in("id", meetingIds),
        ]);
        if (cancelled) return;
        const nameMap = new Map<string, ReviewerInfo>();
        for (const tv of ((tRes.data ?? []) as Array<{ user_id: string; name: string; nationality: string | null }>)) {
          nameMap.set(tv.user_id, { name: tv.name, nationality: tv.nationality });
        }
        for (const g of ((gRes.data ?? []) as Array<{ user_id: string; name: string; nationality: string | null }>)) {
          if (!nameMap.has(g.user_id)) nameMap.set(g.user_id, { name: g.name, nationality: g.nationality });
        }
        const startedMap = new Map<number, string | null>();
        for (const m of ((mRes.data ?? []) as Array<{ id: number; started_at: string | null }>)) {
          startedMap.set(m.id, m.started_at);
        }
        const newMeta: Record<number, Meta> = {};
        for (const r of rows) {
          newMeta[r.id] = {
            reviewer: nameMap.get(r.reviewer_id) ?? { name: `User ${r.reviewer_id.slice(0, 8)}`, nationality: null },
            metAt: startedMap.get(r.meeting_id) ?? null,
          };
        }
        setMetaById(newMeta);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [reviewedUserId]);

  if (loading) {
    return <div style={{ padding: 12, fontSize: 12, color: "#8a7560", fontWeight: 700 }}>…</div>;
  }
  if (count === 0) {
    return <div style={{ padding: 12, fontSize: 12, color: "#9a8a7c", fontWeight: 600, textAlign: "center" }}>{t("reviews_empty", lang)}</div>;
  }

  const visible = reviews.filter((r) => r.comment && r.comment.trim().length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#ad001c", textTransform: "uppercase", letterSpacing: ".05em" }}>
        {t("reviews_avg_star", lang)} {avgRating.toFixed(1)} · {count} {t("items_unit", lang)}
      </div>
      {visible.length === 0 ? (
        <div style={{ padding: 8, fontSize: 12, color: "#8a7560", fontWeight: 700 }}>{t("reviews_empty", lang)}</div>
      ) : (
        visible.map((r) => {
          const meta = metaById[r.id];
          const date = meta?.metAt ? new Date(meta.metAt).toLocaleDateString(dateLocale, { year: "numeric", month: "short", day: "numeric" }) : "";
          return (
            <div key={r.id} style={{ background: "#fff", border: "1px solid #f3e8d6", borderRadius: 14, padding: 13, boxShadow: "0 8px 20px -16px rgba(120,50,20,.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div className="font-display" style={{ fontSize: 13.5, fontWeight: 800, color: "#2b1d1a" }}>
                  {meta?.reviewer.name ?? "—"}
                  {meta?.reviewer.nationality && (
                    <span style={{ fontSize: 11, color: "#9a8a7c", fontWeight: 600, marginLeft: 6 }}>· 🌐 {meta.reviewer.nationality}</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#f5c649", fontWeight: 900 }}>
                  {"★".repeat(r.rating)}<span style={{ color: "#f0e3cf" }}>{"★".repeat(5 - r.rating)}</span>
                </div>
              </div>
              {date && <div style={{ fontSize: 10, color: "#9a8a7c", fontWeight: 600, marginBottom: 6 }}>📅 {date}</div>}
              {r.comment && <div style={{ fontSize: 13, color: "#2b1d1a", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{r.comment}</div>}
            </div>
          );
        })
      )}
    </div>
  );
}
