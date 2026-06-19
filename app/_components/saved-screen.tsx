"use client";

import Link from "next/link";
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
  modeCardStyle,
  lang,
}: Props) {
  return (
    <div className="screen-enter" style={{ minHeight: "100vh" }}>
      <div style={{ background: "#ad001c", padding: "18px 20px 16px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 9 }}>
        <div style={{ width: 36 }} />
        <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", flex: 1, textAlign: "center" }}>{t("saved_title", lang)}</div>
        <Link href="/settings" aria-label="設定" style={{ width: 36, height: 36, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, textDecoration: "none" }}>⚙</Link>
      </div>
      <div style={{ padding: "20px" }}>
        {!currentUserId ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#8a7560", fontWeight: 700 }}>
            {t("saved_login_required", lang)}
          </div>
        ) : savedIds.size === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#8a7560", fontWeight: 700 }}>
            {t("saved_empty", lang)}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {guides.filter((g) => savedIds.has(Number(g.id))).map((g) => {
              const s = modeCardStyle(g.mode);
              return (
                <div
                  key={g.id}
                  onClick={() => onSelect(g)}
                  style={{ background: s.bg, border: `2px solid ${s.border}`, borderRadius: 16, padding: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#ffefd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, border: "2px solid #e8c99a", overflow: "hidden" }}>
                    {g.avatarPath && avatarUrls[g.avatarPath]
                      ? <img loading="lazy" decoding="async" src={avatarUrls[g.avatarPath]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : g.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 900 }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 600 }}>
                      {g.uni}{g.mode !== "free" ? ` · ${g.rate}` : " · 🤝 Free"}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSave(Number(g.id)); }}
                    style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", padding: 4 }}
                  >❤️</button>
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
