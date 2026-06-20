"use client";

import { t, type Lang } from "../lib/i18n";

type GuideCard = {
  id: string;
  name: string;
  emoji: string;
  avatarPath: string | null;
  uni: string;
  rate: string;
  mode: "free" | "paid";
};

type Props = {
  currentUserId: string | null;
  savedIds: Set<number>;
  guides: GuideCard[];
  avatarUrls: Record<string, string>;
  onSelect: (g: GuideCard) => void;
  toggleSave: (id: number) => void | Promise<void>;
  modeCardStyle: (mode: "free" | "paid") => { bg: string; border: string };
  lang: Lang;
};

export default function SavedScreen({
  currentUserId,
  savedIds,
  guides,
  avatarUrls,
  onSelect,
  toggleSave,
  lang,
}: Props) {
  const savedList = guides.filter((g) => savedIds.has(Number(g.id)));
  return (
    <div className="screen-enter" style={{ minHeight: "100vh", background: "#fff8ec" }}>
      {/* title (mock) */}
      <div style={{ padding: "16px 22px 4px" }}>
        <h1 className="font-display" style={{ margin: "0 0 2px", fontWeight: 900, fontSize: 26, color: "#2b1d1a" }}>{t("saved_title", lang)}</h1>
        <p style={{ margin: 0, fontSize: 13, color: "#b03a2e", fontWeight: 700 }}>Saved · {savedList.length} guides</p>
      </div>

      <div style={{ padding: "14px 22px 0" }}>
        {!currentUserId ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#b09a86", fontWeight: 700 }}>{t("saved_login_required", lang)}</div>
        ) : savedList.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#b09a86", fontWeight: 700 }}>{t("saved_empty", lang)}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {savedList.map((g) => {
              const isFree = g.mode === "free";
              const av = g.avatarPath ? avatarUrls[g.avatarPath] : null;
              return (
                <div
                  key={g.id}
                  onClick={() => onSelect(g)}
                  style={{ display: "flex", gap: 13, alignItems: "center", background: "#fff", border: "1px solid #f3e8d6", borderRadius: 20, padding: 12, boxShadow: "0 8px 20px -14px rgba(120,50,20,.3)", cursor: "pointer" }}
                >
                  <div style={{ width: 62, height: 62, borderRadius: 16, flex: "none", display: "grid", placeItems: "center", fontSize: 30, overflow: "hidden", ...(av ? { backgroundImage: `url("${av}")`, backgroundSize: "cover", backgroundPosition: "center" } : { background: "#ffefd5" }) }}>{!av && g.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span className="font-display" style={{ fontWeight: 700, fontSize: 15.5, color: "#2b1d1a" }}>{g.name}</span>
                      <span style={{ fontSize: 9.5, fontWeight: 800, color: "#fff", padding: "2px 7px", borderRadius: 20, background: isFree ? "#2e8b57" : "#ad001c" }}>{isFree ? "FREE" : "PRO"}</span>
                    </div>
                    <p style={{ margin: "3px 0 0", fontSize: 11, color: "#b09a86" }}>{g.uni}{isFree ? " · 🤝 Free" : ` · ${g.rate}`}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); toggleSave(Number(g.id)); }} aria-label={t("saved_title", lang)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, display: "grid", placeItems: "center" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#ad001c" stroke="#ad001c" strokeWidth={1.5}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ height: 100 }} />
    </div>
  );
}
