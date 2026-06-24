"use client";
import BackButton from "@/app/lib/back-button";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSignedUrls } from "@/app/lib/use-signed-urls";
import { useLang } from "@/app/lib/i18n";
import { getSortedAreas } from "@/app/lib/areas";

export type GuideRow = {
  id: number;
  name: string;
  emoji: string;
  university: string;
  bio: string;
  tags: string[];
  languages: string[];
  rate_per_day: number | null;
  mode: "free" | "paid";
  rating: number;
  tour_count: number;
  user_id: string | null;
  gender: string | null;
  birth_year: number | null;
  avatar_path: string | null;
  areas: string[];
  available_slots: string[];
  created_at: string;
};

type SortKey = "recommended" | "newest" | "price_asc" | "price_desc";

const DAY_OPTIONS: Array<{ code: string; ja: string; en: string }> = [
  { code: "mon", ja: "月", en: "Mon" }, { code: "tue", ja: "火", en: "Tue" }, { code: "wed", ja: "水", en: "Wed" }, { code: "thu", ja: "木", en: "Thu" }, { code: "fri", ja: "金", en: "Fri" }, { code: "sat", ja: "土", en: "Sat" }, { code: "sun", ja: "日", en: "Sun" },
];
const TAG_OPTIONS = ["Food", "Temples", "Nightlife", "Hidden", "Art", "Anime", "Drive", "Nature", "Culture", "History", "Deep", "Music"];
const LANG_OPTIONS = ["EN", "JP", "ZH", "KR", "ES", "FR", "DE", "PT", "IT", "RU", "AR", "HI", "ID", "TH", "VI", "TR", "NL", "PL"];
const GENDER_OPTIONS: Array<{ value: string; ja: string; en: string }> = [
  { value: "", ja: "指定なし", en: "Any" },
  { value: "male", ja: "男性", en: "Male" },
  { value: "female", ja: "女性", en: "Female" },
  { value: "non-binary", ja: "ノンバイナリー", en: "Non-binary" },
];

const wrap: React.CSSProperties = { minHeight: "100vh", display: "flex", justifyContent: "center" };
const card: React.CSSProperties = { width: "100%", maxWidth: 390, minHeight: "100vh", padding: "16px 16px 80px" };
const input: React.CSSProperties = { width: "100%", background: "#fff", border: "1px solid #ecdcc4", borderRadius: 14, padding: "10px 14px", fontSize: 14, fontWeight: 600, color: "#1a1008", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const chip = (active: boolean, color = "#ad001c"): React.CSSProperties => ({
  background: active ? color : "#ffffffdd",
  border: `2px solid ${active ? color : "#f0d9b5"}`,
  color: active ? "#fff" : "#8a7560",
  borderRadius: 18,
  padding: "5px 12px",
  fontSize: 11,
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: "inherit",
});

function ageFromBirth(year: number | null): number | null {
  if (!year) return null;
  return new Date().getFullYear() - year;
}


function AllGuidesViewInner({ guides }: { guides: GuideRow[] }) {
  const [lang] = useLang();
  const sortedAreas = getSortedAreas(lang);
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortKey>("recommended");
  const [tags, setTags] = useState<string[]>([]);
  const [langs, setLangs] = useState<string[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [gender, setGender] = useState("");
  const [ageMin, setAgeMin] = useState<number | "">("");
  const [ageMax, setAgeMax] = useState<number | "">("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modeFilter, setModeFilter] = useState<"all" | "mate" | "guide">("all");
  const [areas, setAreas] = useState<string[]>([]);
  const avatarPaths = guides.map((g) => g.avatar_path).filter((p): p is string => Boolean(p));
  const avatarUrls = useSignedUrls(avatarPaths);

  function toggleArr(arr: string[], setter: (v: string[]) => void, v: string) {
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  const filtered = useMemo(() => {
    let rs = guides;
    if (modeFilter === "mate") rs = rs.filter((g) => g.mode === "free");
    if (modeFilter === "guide") rs = rs.filter((g) => g.mode === "paid");
    if (areas.length > 0) rs = rs.filter((g) => areas.some((a) => g.areas.includes(a)));
    const q = query.trim().toLowerCase();
    if (q) {
      rs = rs.filter((g) =>
        g.name.toLowerCase().includes(q) ||
        g.bio.toLowerCase().includes(q) ||
        g.university.toLowerCase().includes(q) ||
        g.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (tags.length > 0) rs = rs.filter((g) => tags.every((t) => g.tags.includes(t)));
    if (langs.length > 0) rs = rs.filter((g) => langs.every((l) => g.languages.includes(l)));
    if (days.length > 0) rs = rs.filter((g) => (g.available_slots ?? []).some((sl) => days.includes(sl.split(":")[0])));
    if (gender) rs = rs.filter((g) => g.gender === gender);
    if (ageMin !== "" || ageMax !== "") {
      rs = rs.filter((g) => {
        const a = ageFromBirth(g.birth_year);
        if (a == null) return false;
        if (ageMin !== "" && a < (ageMin as number)) return false;
        if (ageMax !== "" && a > (ageMax as number)) return false;
        return true;
      });
    }

    switch (sort) {
      case "newest":
        rs = [...rs].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
        break;
      case "price_asc":
        rs = [...rs].sort((a, b) => (a.rate_per_day ?? 999999) - (b.rate_per_day ?? 999999));
        break;
      case "price_desc":
        rs = [...rs].sort((a, b) => (b.rate_per_day ?? -1) - (a.rate_per_day ?? -1));
        break;
      case "recommended":
      default:
        rs = [...rs].sort((a, b) => b.rating - a.rating || b.tour_count - a.tour_count);
        break;
    }
    return rs;
  }, [guides, query, sort, tags, langs, days, gender, ageMin, ageMax, modeFilter, areas]);

  function clearAll() {
    setQuery("");
    setSort("recommended");
    setTags([]);
    setLangs([]);
    setDays([]);
    setGender("");
    setAgeMin("");
    setAgeMax("");
    setModeFilter("all");
    setAreas([]);
  }

  return (
    <div style={wrap}>
      <div style={card} className="screen-enter">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <BackButton />
          <div className="font-display" style={{ fontSize: 22, fontWeight: 900, color: "#2b1d1a" }}>{lang === "ja" ? "ガイド一覧" : "All guides"}{lang === "ja" && <span style={{ fontSize: 12, color: "#b6a48f", fontWeight: 500 }}> All guides</span>}</div>
          <div style={{ flex: 1 }}/>
          <div style={{ fontSize: 11, color: "#b6a48f", fontWeight: 700 }}>{filtered.length} / {guides.length}</div>
        </div>

        {/* Search */}
        <div style={{ background: "#ffffffee", border: "1px solid #ecdcc4", borderRadius: 16, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ color: "#ad001c", fontSize: 16 }}>🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={lang === "ja" ? "名前・大学・タグ・bio から検索" : "Search name, school, tags, bio"}
            style={{ background: "none", border: "none", outline: "none", fontSize: 13, fontWeight: 600, flex: 1, fontFamily: "inherit", color: "#1a1008" }}
          />
          {query && (
            <button aria-label={lang === "ja" ? "クリア" : "Clear"} onClick={() => setQuery("")} style={{ background: "none", border: "none", color: "#8a7560", fontSize: 16, cursor: "pointer" }}>×</button>
          )}
        </div>

        {/* Sort + filter toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            style={{ ...input, width: "auto", flex: 1, padding: "8px 10px" }}
          >
            <option value="recommended">{lang === "ja" ? "⭐ おすすめ順" : "⭐ Recommended"}</option>
            <option value="newest">{lang === "ja" ? "🆕 新着順" : "🆕 Newest"}</option>
            <option value="price_asc">{lang === "ja" ? "💰 値段が安い順" : "💰 Price: low → high"}</option>
            <option value="price_desc">{lang === "ja" ? "💰 値段が高い順" : "💰 Price: high → low"}</option>
          </select>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            style={{ background: filtersOpen ? "#ad001c" : "#fff", color: filtersOpen ? "#fff" : "#ad001c", border: "2px solid #ad001c", borderRadius: 14, padding: "8px 14px", fontSize: 12, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
          >
            {lang === "ja" ? "🎛 絞り込み" : "🎛 Filters"}{tags.length + langs.length + days.length + (gender ? 1 : 0) + (ageMin !== "" || ageMax !== "" ? 1 : 0) + (modeFilter !== "all" ? 1 : 0) + areas.length > 0 ? ` (${tags.length + langs.length + days.length + (gender ? 1 : 0) + (ageMin !== "" || ageMax !== "" ? 1 : 0) + (modeFilter !== "all" ? 1 : 0) + areas.length})` : ""}
          </button>
        </div>

        {/* Filters panel */}
        {filtersOpen && (
          <div style={{ background: "#fff", border: "1px solid #ecdcc4", borderRadius: 14, padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "#ad001c", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>{lang === "ja" ? "モード" : "Mode"}</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {([["all", lang === "ja" ? "すべて" : "All", "#8a7560"], ["mate", lang === "ja" ? "🤝 Free (無料)" : "🤝 Free", "#ad001c"], ["guide", lang === "ja" ? "💼 Pro (有料)" : "💼 Pro", "#2e8b57"]] as const).map(([v, label, c]) => (
                <button key={v} onClick={() => setModeFilter(v)} style={{
                  flex: 1,
                  background: modeFilter === v ? c : "#fff",
                  color: modeFilter === v ? "#fff" : "#8a7560",
                  border: `2px solid ${modeFilter === v ? c : "#f3e8d6"}`,
                  borderRadius: 14, padding: "6px 8px", fontSize: 11, fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
                }}>{label}</button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#ad001c", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>{lang === "ja" ? "活動域" : "Areas"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
              {sortedAreas.map((a) => (
                <button key={a.value} onClick={() => toggleArr(areas, setAreas, a.value)} style={chip(areas.includes(a.value), "#2e8b57")}>📍 {a.label}</button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#ad001c", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>{lang === "ja" ? "活動可能日" : "Available days"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
              {DAY_OPTIONS.map((d) => (
                <button key={d.code} onClick={() => toggleArr(days, setDays, d.code)} style={chip(days.includes(d.code), "#2e8b57")}>{lang === "ja" ? d.ja : d.en}</button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#ad001c", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>{lang === "ja" ? "タグ" : "Tags"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
              {TAG_OPTIONS.map((t) => (
                <button key={t} onClick={() => toggleArr(tags, setTags, t)} style={chip(tags.includes(t))}>{t}</button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#ad001c", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>{lang === "ja" ? "言語" : "Languages"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
              {LANG_OPTIONS.map((l) => (
                <button key={l} onClick={() => toggleArr(langs, setLangs, l)} style={chip(langs.includes(l), "#2e8b57")}>{l}</button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#ad001c", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>{lang === "ja" ? "性別" : "Gender"}</div>
            <select value={gender} onChange={(e) => setGender(e.target.value)} style={{ ...input, padding: "8px 10px", marginBottom: 12 }}>
              {GENDER_OPTIONS.map((g) => <option key={g.value} value={g.value}>{lang === "ja" ? g.ja : g.en}</option>)}
            </select>
            <div style={{ fontSize: 11, color: "#ad001c", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>{lang === "ja" ? "年齢" : "Age"}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <input type="number" min={16} max={99} placeholder={lang === "ja" ? "最小" : "Min"} value={ageMin} onChange={(e) => setAgeMin(e.target.value === "" ? "" : Number(e.target.value))} style={{ ...input, padding: "8px 10px" }} />
              <span style={{ color: "#8a7560", fontWeight: 800 }}>〜</span>
              <input type="number" min={16} max={99} placeholder={lang === "ja" ? "最大" : "Max"} value={ageMax} onChange={(e) => setAgeMax(e.target.value === "" ? "" : Number(e.target.value))} style={{ ...input, padding: "8px 10px" }} />
            </div>
            <button onClick={clearAll} style={{ width: "100%", background: "#fff", color: "#8a7560", border: "1px solid #ecdcc4", borderRadius: 12, padding: 8, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
              {lang === "ja" ? "すべてリセット" : "Reset all"}
            </button>
          </div>
        )}

        {/* Results */}
        {filtered.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#8a7560", fontWeight: 700, background: "#fff", border: "2px dashed #f3e8d6", borderRadius: 14 }}>
            {lang === "ja" ? "条件にマッチするガイドなし" : "No guides match"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((g) => {
              const age = ageFromBirth(g.birth_year);
              return (
                <Link
                  key={g.id}
                  href={`/?guide=${g.id}`}
                  style={{ display: "block", textDecoration: "none", color: "inherit", background: "#fff", border: "1px solid #f3e8d6", borderRadius: 18, padding: 14, boxShadow: "0 8px 20px -16px rgba(120,50,20,.3)" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: "#ffefd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, border: "1px solid #f0e3cf", flexShrink: 0, overflow: "hidden" }}>{g.avatar_path && avatarUrls[g.avatar_path] ? <img loading="lazy" decoding="async" src={avatarUrls[g.avatar_path]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : g.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-display" style={{ fontSize: 15.5, fontWeight: 800, color: "#2b1d1a" }}>{g.name}</div>
                      <div style={{ fontSize: 11, color: "#9a8a7c", fontWeight: 600 }}>
                        {g.university}{age != null ? ` · ${age}${lang === "ja" ? "歳" : ""}` : ""}{g.gender === "male" ? " · ♂" : g.gender === "female" ? " · ♀" : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".04em", padding: "3px 9px", borderRadius: 999, background: g.mode === "free" ? "#e6f5ee" : "#fceaec", color: g.mode === "free" ? "#2e8b57" : "#ad001c" }}>{g.mode === "free" ? "FREE" : "PRO"}</span>
                      {g.mode === "free" ? (
                        <span style={{ fontSize: 11, color: "#9a8a7c", fontWeight: 700 }}>{lang === "ja" ? "無料" : "Free"}</span>
                      ) : (
                        <span style={{ fontSize: 13, color: "#2b1d1a", fontWeight: 900 }}>¥{(g.rate_per_day ?? 0).toLocaleString()}<span style={{ fontSize: 9, color: "#9a8a7c", fontWeight: 700, marginLeft: 1 }}>/day</span></span>
                      )}
                    </div>
                  </div>
                  {g.bio && (
                    <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {g.bio}
                    </div>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {[...g.tags, ...g.languages].slice(0, 6).map((t) => (
                      <span key={t} style={{ background: "#fff5e9", border: "1px solid #f3e8d6", borderRadius: 999, padding: "3px 9px", fontSize: 10, color: "#b03a2e", fontWeight: 700 }}>{t}</span>
                    ))}
                    <span style={{ fontSize: 10, color: "#8a7560", fontWeight: 700, marginLeft: "auto" }}>
                      {g.tour_count === 0 ? (lang === "ja" ? "✨ 新規" : "✨ New") : `★ ${g.rating.toFixed(1)}`}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AllGuidesView(props: { guides: GuideRow[] }) {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <AllGuidesViewInner {...props} />
    </Suspense>
  );
}

import BrandLogoFallback from "@/app/_components/brand-logo";
function SuspenseFallback() {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff8ec", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, zIndex: 1000 }}>
      <BrandLogoFallback variant="full" size={32} camelHeight={90} />
      <div style={{ width: 26, height: 26, borderRadius: "50%", border: "3px solid #f3e8d6", borderTopColor: "#ad001c", animation: "spin 0.9s linear infinite" }} />
    </div>
  );
}
