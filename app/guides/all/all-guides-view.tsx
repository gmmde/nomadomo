"use client";
import BackButton from "@/app/lib/back-button";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSignedUrls } from "@/app/lib/use-signed-urls";

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
  created_at: string;
};

type SortKey = "recommended" | "newest" | "price_asc" | "price_desc";

const TAG_OPTIONS = ["Food", "Temples", "Nightlife", "Hidden", "Art", "Anime", "Drive", "Nature", "Culture", "History", "Deep", "Music"];
const AREA_OPTIONS = ["Tokyo", "Osaka", "Kyoto", "Hokkaido", "Kanagawa", "Hyogo", "Fukuoka", "Aichi", "Okinawa", "Other"];
const LANG_OPTIONS = ["EN", "JP", "ZH", "KR", "ES", "FR", "DE", "PT", "IT", "RU", "AR", "HI", "ID", "TH", "VI", "TR", "NL", "PL"];
const GENDER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "指定なし" },
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "non-binary", label: "ノンバイナリー" },
];

const wrap: React.CSSProperties = { minHeight: "100vh", display: "flex", justifyContent: "center" };
const card: React.CSSProperties = { width: "100%", maxWidth: 390, minHeight: "100vh", padding: "16px 16px 80px" };
const input: React.CSSProperties = { width: "100%", background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 14, padding: "10px 14px", fontSize: 14, fontWeight: 600, color: "#1a1008", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
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


function modeCardStyle(mode: "free" | "paid") {
  if (mode === "free") return { bg: "#e6f5ee", border: "#9fc9b6" };
  return { bg: "#fceaec", border: "#e8b5bc" };
}

function AllGuidesViewInner({ guides }: { guides: GuideRow[] }) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortKey>("recommended");
  const [tags, setTags] = useState<string[]>([]);
  const [langs, setLangs] = useState<string[]>([]);
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
  }, [guides, query, sort, tags, langs, gender, ageMin, ageMax, modeFilter, areas]);

  function clearAll() {
    setQuery("");
    setSort("recommended");
    setTags([]);
    setLangs([]);
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
          <div style={{ fontSize: 18, fontWeight: 900 }}>ガイド一覧</div>
          <div style={{ flex: 1 }}/>
          <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 800 }}>{filtered.length} / {guides.length}</div>
        </div>

        {/* Search */}
        <div style={{ background: "#ffffffee", border: "2px solid #e8c99a", borderRadius: 16, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ color: "#ad001c", fontSize: 16 }}>🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="名前・大学・タグ・bio から検索"
            style={{ background: "none", border: "none", outline: "none", fontSize: 13, fontWeight: 600, flex: 1, fontFamily: "inherit", color: "#1a1008" }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", color: "#8a7560", fontSize: 16, cursor: "pointer" }}>×</button>
          )}
        </div>

        {/* Sort + filter toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            style={{ ...input, width: "auto", flex: 1, padding: "8px 10px" }}
          >
            <option value="recommended">⭐ おすすめ順</option>
            <option value="newest">🆕 新着順</option>
            <option value="price_asc">💰 値段が安い順</option>
            <option value="price_desc">💰 値段が高い順</option>
          </select>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            style={{ background: filtersOpen ? "#ad001c" : "#fff", color: filtersOpen ? "#fff" : "#ad001c", border: "2px solid #ad001c", borderRadius: 14, padding: "8px 14px", fontSize: 12, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
          >
            🎛 絞り込み{tags.length + langs.length + (gender ? 1 : 0) + (ageMin !== "" || ageMax !== "" ? 1 : 0) + (modeFilter !== "all" ? 1 : 0) + areas.length > 0 ? ` (${tags.length + langs.length + (gender ? 1 : 0) + (ageMin !== "" || ageMax !== "" ? 1 : 0) + (modeFilter !== "all" ? 1 : 0) + areas.length})` : ""}
          </button>
        </div>

        {/* Filters panel */}
        {filtersOpen && (
          <div style={{ background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 14, padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>モード</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {([["all", "すべて", "#8a7560"], ["mate", "🤝 mate (無料)", "#ad001c"], ["guide", "💼 guide (有料)", "#2e8b57"]] as const).map(([v, label, c]) => (
                <button key={v} onClick={() => setModeFilter(v)} style={{
                  flex: 1,
                  background: modeFilter === v ? c : "#fff",
                  color: modeFilter === v ? "#fff" : "#8a7560",
                  border: `2px solid ${modeFilter === v ? c : "#e8c99a"}`,
                  borderRadius: 14, padding: "6px 8px", fontSize: 11, fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
                }}>{label}</button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>活動域</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
              {AREA_OPTIONS.map((a) => (
                <button key={a} onClick={() => toggleArr(areas, setAreas, a)} style={chip(areas.includes(a), "#2e8b57")}>📍 {a}</button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>タグ</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
              {TAG_OPTIONS.map((t) => (
                <button key={t} onClick={() => toggleArr(tags, setTags, t)} style={chip(tags.includes(t))}>{t}</button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>言語</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
              {LANG_OPTIONS.map((l) => (
                <button key={l} onClick={() => toggleArr(langs, setLangs, l)} style={chip(langs.includes(l), "#2e8b57")}>{l}</button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>性別</div>
            <select value={gender} onChange={(e) => setGender(e.target.value)} style={{ ...input, padding: "8px 10px", marginBottom: 12 }}>
              {GENDER_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
            <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 900, marginBottom: 6, textTransform: "uppercase" }}>年齢</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <input type="number" min={16} max={99} placeholder="最小" value={ageMin} onChange={(e) => setAgeMin(e.target.value === "" ? "" : Number(e.target.value))} style={{ ...input, padding: "8px 10px" }} />
              <span style={{ color: "#8a7560", fontWeight: 800 }}>〜</span>
              <input type="number" min={16} max={99} placeholder="最大" value={ageMax} onChange={(e) => setAgeMax(e.target.value === "" ? "" : Number(e.target.value))} style={{ ...input, padding: "8px 10px" }} />
            </div>
            <button onClick={clearAll} style={{ width: "100%", background: "#fff", color: "#8a7560", border: "1.5px solid #e8c99a", borderRadius: 12, padding: 8, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
              すべてリセット
            </button>
          </div>
        )}

        {/* Results */}
        {filtered.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#8a7560", fontWeight: 700, background: "#fff9f0", border: "2px dashed #e8c99a", borderRadius: 14 }}>
            条件にマッチするガイドなし
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((g) => {
              const age = ageFromBirth(g.birth_year);
              return (
                <Link
                  key={g.id}
                  href={`/?guide=${g.id}`}
                  style={(() => { const s = modeCardStyle(g.mode); return { display: "block", textDecoration: "none", color: "inherit", background: s.bg, border: `2px solid ${s.border}`, borderRadius: 18, padding: 14 }; })()}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#ffefd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, border: "2px solid #e8c99a", flexShrink: 0, overflow: "hidden" }}>{g.avatar_path && avatarUrls[g.avatar_path] ? <img src={avatarUrls[g.avatar_path]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : g.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 900 }}>{g.name}</div>
                      <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700 }}>
                        {g.university}{age != null ? ` · ${age}歳` : ""}{g.gender === "male" ? " · ♂" : g.gender === "female" ? " · ♀" : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {g.mode === "free" ? (
                        <div style={{ fontSize: 12, color: "#ad001c", fontWeight: 900 }}>🤝 Free</div>
                      ) : (
                        <>
                          <div style={{ fontSize: 14, color: g.mode === "paid" ? "#2e8b57" : "#ad001c", fontWeight: 900 }}>¥{(g.rate_per_day ?? 0).toLocaleString()}</div>
                          <div style={{ fontSize: 10, color: "#8a7560", fontWeight: 800 }}>/day</div>
                        </>
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
                      <span key={t} style={{ background: "#ffefd5", border: "1px solid #e8c99a", borderRadius: 6, padding: "2px 6px", fontSize: 10, color: "#ad001c", fontWeight: 700 }}>{t}</span>
                    ))}
                    <span style={{ fontSize: 10, color: "#8a7560", fontWeight: 700, marginLeft: "auto" }}>
                      {g.tour_count === 0 ? "✨ 新規" : `★ ${g.rating.toFixed(1)}`}
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
    <div style={{ position: "fixed", inset: 0, background: "#f5ead0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, zIndex: 1000 }}>
      <BrandLogoFallback variant="full" size={32} camelHeight={90} />
      <div style={{ width: 26, height: 26, borderRadius: "50%", border: "3px solid #e8c99a", borderTopColor: "#ad001c", animation: "spin 0.9s linear infinite" }} />
    </div>
  );
}
