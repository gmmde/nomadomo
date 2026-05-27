"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { t, type Lang } from "../lib/i18n";

type InboxPeer = {
  peerId: string;
  lastBody: string;
  lastAt: string;
  name: string;
  emoji: string;
  guideId?: string;
};

type GuideAvatar = {
  id: string;
  avatarPath: string | null;
};

type Props = {
  goBack: () => void;
  currentUserId: string | null;
  inboxPeers: InboxPeer[];
  unreadByPeer: Record<string, number>;
  guides: GuideAvatar[];
  avatarUrls: Record<string, string>;
  openGuideProfile: (guideId: string | undefined) => void;
  onOpenChat: (p: InboxPeer) => void;
  bottomNav: ReactNode;
  lang: Lang;
};

export default function InboxScreen({
  goBack,
  currentUserId,
  inboxPeers,
  unreadByPeer,
  guides,
  avatarUrls,
  openGuideProfile,
  onOpenChat,
  bottomNav,
  lang,
}: Props) {
  return (
    <div className="screen-enter" style={{ minHeight: "100vh" }}>
      <div style={{ background: "#ad001c", padding: "18px 20px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={goBack} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer" }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", flex: 1, textAlign: "center" }}>{t("inbox_title", lang)}</div>
        <Link href="/settings" aria-label="設定" style={{ width: 36, height: 36, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, textDecoration: "none" }}>⚙</Link>
      </div>
      <div style={{ padding: "20px" }}>
        {!currentUserId ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#8a7560", fontWeight: 700 }}>
            {t("inbox_login_required", lang)}
          </div>
        ) : inboxPeers.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#8a7560", fontWeight: 700 }}>
            {t("inbox_empty", lang)}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {inboxPeers.map((p) => {
              const unread = unreadByPeer[p.peerId] ?? 0;
              return (
                <div
                  key={p.peerId}
                  onClick={() => onOpenChat(p)}
                  style={{ background: "#fff9f0", border: "2px solid #f0d9b5", borderRadius: 16, padding: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                >
                  <div style={{ position: "relative" }}>
                    <div
                      onClick={(e) => { e.stopPropagation(); if (p.guideId) openGuideProfile(p.guideId); }}
                      style={{ width: 48, height: 48, borderRadius: "50%", background: "#ffefd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, border: "2px solid #e8c99a", cursor: p.guideId ? "pointer" : "default", overflow: "hidden" }}
                      title={p.guideId ? "ガイド詳細" : undefined}
                    >
                      {(() => {
                        const pg = p.guideId ? guides.find((x) => x.id === p.guideId) : null;
                        return pg?.avatarPath && avatarUrls[pg.avatarPath]
                          ? <img src={avatarUrls[pg.avatarPath]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : p.emoji;
                      })()}
                    </div>
                    {unread > 0 && (
                      <div style={{ position: "absolute", top: -4, right: -4, background: "#ad001c", color: "#fff", borderRadius: 10, minWidth: 20, height: 20, padding: "0 5px", fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff9f0" }}>
                        {unread > 99 ? "99+" : unread}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: unread > 0 ? 900 : 700 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: unread > 0 ? "#1a1008" : "#8a7560", fontWeight: unread > 0 ? 700 : 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.lastBody}</div>
                  </div>
                  <div style={{ fontSize: 10, color: "#8a7560", fontWeight: 700 }}>
                    {new Date(p.lastAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ height: 100 }} />
      {bottomNav}
    </div>
  );
}
