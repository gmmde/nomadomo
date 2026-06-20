"use client";

import Link from "next/link";
import { t, type Lang } from "../lib/i18n";

type InboxPeer = {
  peerId: string;
  lastBody: string;
  lastAt: string;
  name: string;
  emoji: string;
  guideId?: string;
};

type PendingRequest = {
  id: number;
  senderId: string;
  senderName: string;
  senderEmoji: string;
  message: string;
  createdAt: string;
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
  pendingRequests?: PendingRequest[];
  lang: Lang;
};

export default function InboxScreen({
  currentUserId,
  inboxPeers,
  unreadByPeer,
  guides,
  avatarUrls,
  openGuideProfile,
  onOpenChat,
  pendingRequests = [],
  lang,
}: Props) {
  const dateLocale = lang === "ja" ? "ja-JP" : "en-US";
  return (
    <div className="screen-enter" style={{ minHeight: "100vh", background: "#fff8ec" }}>
      {/* title (mock) */}
      <div style={{ padding: "16px 22px 14px" }}>
        <h1 className="font-display" style={{ margin: 0, fontWeight: 900, fontSize: 26, color: "#2b1d1a" }}>{t("inbox_title", lang)}</h1>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#b03a2e", fontWeight: 700 }}>Messages</p>
      </div>

      {/* pending requests card (機能保持・新トークンで再スキン) */}
      {currentUserId && (
        <div style={{ padding: "0 22px 8px" }}>
          <Link
            href="/requests"
            style={{ position: "relative", display: "block", background: pendingRequests.length > 0 ? "#ad001c" : "#fff", color: pendingRequests.length > 0 ? "#fff" : "#2b1d1a", border: pendingRequests.length > 0 ? "none" : "1px solid #f3e8d6", borderRadius: 18, padding: 14, textDecoration: "none", boxShadow: "0 8px 20px -14px rgba(120,50,20,.3)" }}
          >
            {pendingRequests.length > 0 && (
              <div style={{ position: "absolute", top: -8, right: -8, background: "#ad001c", color: "#fff", borderRadius: 12, minWidth: 24, height: 24, padding: "0 7px", fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid #fff8ec", boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }}>
                {pendingRequests.length > 99 ? "99+" : pendingRequests.length}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 26 }}>📨</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="font-display" style={{ fontSize: 14, fontWeight: 800, marginBottom: 2 }}>
                  {pendingRequests.length > 0
                    ? `${t("inbox_pending_requests", lang)} (${pendingRequests.length})`
                    : t("inbox_view_all_requests", lang)}
                </div>
                {pendingRequests.length > 0 && (
                  <div style={{ fontSize: 12, opacity: 0.92, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {pendingRequests.slice(0, 3).map((r) => `${r.senderEmoji} ${r.senderName}`).join(" · ")}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 18, color: pendingRequests.length > 0 ? "#fff" : "#b09a86" }}>→</div>
            </div>
          </Link>
        </div>
      )}

      {!currentUserId ? (
        <div style={{ padding: "40px 20px", textAlign: "center", color: "#b09a86", fontWeight: 700 }}>{t("inbox_login_required", lang)}</div>
      ) : inboxPeers.length === 0 && pendingRequests.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center", color: "#b09a86", fontWeight: 700 }}>{t("inbox_empty", lang)}</div>
      ) : (
        <div>
          {inboxPeers.map((p) => {
            const unread = unreadByPeer[p.peerId] ?? 0;
            const pg = p.guideId ? guides.find((x) => x.id === p.guideId) : null;
            const av = pg?.avatarPath ? avatarUrls[pg.avatarPath] : null;
            return (
              <div
                key={p.peerId}
                onClick={() => onOpenChat(p)}
                style={{ display: "flex", gap: 13, alignItems: "center", padding: "13px 22px", cursor: "pointer", borderBottom: "1px solid #f4ead7" }}
              >
                <div style={{ position: "relative", flex: "none" }}>
                  <div
                    onClick={(e) => { e.stopPropagation(); if (p.guideId) openGuideProfile(p.guideId); }}
                    style={{ width: 56, height: 56, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 26, overflow: "hidden", cursor: p.guideId ? "pointer" : "default", ...(av ? { backgroundImage: `url("${av}")`, backgroundSize: "cover", backgroundPosition: "center" } : { background: "#ffefd5" }) }}
                  >
                    {!av && p.emoji}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="font-display" style={{ fontWeight: 700, fontSize: 15.5, color: "#2b1d1a" }}>{p.name}</span>
                    <span style={{ fontSize: 11, color: "#b09a86" }}>{new Date(p.lastAt).toLocaleDateString(dateLocale, { month: "numeric", day: "numeric" })}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 3, gap: 8 }}>
                    <span style={{ fontSize: 12.5, color: unread > 0 ? "#2b1d1a" : "#b09a86", fontWeight: unread > 0 ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.lastBody}</span>
                    {unread > 0 && (
                      <span style={{ flex: "none", minWidth: 20, height: 20, padding: "0 6px", borderRadius: 10, background: "#ad001c", color: "#fff", fontSize: 11, fontWeight: 700, display: "grid", placeItems: "center" }}>{unread > 99 ? "99+" : unread}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ height: 100 }} />
    </div>
  );
}
