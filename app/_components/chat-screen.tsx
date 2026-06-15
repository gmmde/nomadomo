"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { RefObject } from "react";
import { t, type Lang } from "../lib/i18n";
import { proposeMeet, acceptMeet } from "../actions/meetings";
import MeetPaymentModal from "./meet-payment-modal";

type Message = {
  id: number;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
};

type ChatPeer = {
  id: string;
  name: string;
  emoji: string;
  guideId?: string;
};

type GuideAvatar = {
  id: string;
  avatarPath: string | null;
};

// Meeting state from parent
export type MeetingState =
  | { kind: "none" }
  | { kind: "pending_proposed_by_me"; id: number } // 自分が押した、相手待ち
  | { kind: "pending_awaiting_my_accept"; id: number } // 相手が押した、自分が承認すれば active
  | { kind: "active"; id: number; startedAt: string | null; iReviewed: boolean }
  | { kind: "completed"; id: number };

// 4 日以上経過した未レビュー active meeting は urgent
const URGENT_AFTER_MS = 4 * 24 * 60 * 60 * 1000;
function isMeetingUrgent(m: MeetingState): boolean {
  if (m.kind !== "active") return false;
  if (m.iReviewed) return false;
  if (!m.startedAt) return false;
  return Date.now() - new Date(m.startedAt).getTime() >= URGENT_AFTER_MS;
}

type Props = {
  chatPeer: ChatPeer;
  goBack: () => void;
  openGuideProfile: (guideId: string | undefined) => void;
  currentUserId: string | null;
  messages: Message[];
  chatEndRef: RefObject<HTMLDivElement | null>;
  input: string;
  setInput: (v: string) => void;
  sendMessage: () => void | Promise<void>;
  guides: GuideAvatar[];
  avatarUrls: Record<string, string>;
  lang: Lang;
  meeting: MeetingState;
  onMeetingChanged: () => void;
  // 新フロー (旅行者のみ Meet 押せる + paid モードは Stripe モーダル)
  myRole: "traveler" | "guide" | "unknown";
  peerGuideMode: "free" | "paid" | null; // 相手 (peer) が guide.mode=何か
};

export default function ChatScreen({
  chatPeer,
  goBack,
  openGuideProfile,
  currentUserId,
  messages,
  chatEndRef,
  input,
  setInput,
  sendMessage,
  guides,
  avatarUrls,
  lang,
  meeting,
  onMeetingChanged,
  myRole,
  peerGuideMode,
}: Props) {
  const [pendingTr, startTr] = useTransition();
  const [showPayModal, setShowPayModal] = useState(false);
  const [meetErr, setMeetErr] = useState<string | null>(null);

  async function handleMeetClick() {
    if (!chatPeer.id) return;
    if (myRole !== "traveler") return; // ガイドは押せない
    setMeetErr(null);
    if (peerGuideMode === "paid") {
      // 有料ガイドは Stripe Elements モーダル
      setShowPayModal(true);
      return;
    }
    // free モードはそのまま propose
    startTr(async () => {
      const fd = new FormData();
      fd.set("peer_id", chatPeer.id);
      const r = await proposeMeet(fd);
      if (r?.error) {
        setMeetErr(r.error);
        return;
      }
      onMeetingChanged();
    });
  }

  async function handleAcceptMeetClick() {
    if (meeting.kind !== "pending_awaiting_my_accept") return;
    if (myRole !== "guide") return;
    setMeetErr(null);
    startTr(async () => {
      const fd = new FormData();
      fd.set("meeting_id", String(meeting.id));
      const r = await acceptMeet(fd);
      if (r?.error) {
        setMeetErr(r.error);
        return;
      }
      onMeetingChanged();
    });
  }

  // Banner / meet button content per state
  const showActive = meeting.kind === "active";
  const showCompleteBtn = meeting.kind === "active";
  const urgent = isMeetingUrgent(meeting);
  const meetBtnLabel =
    meeting.kind === "pending_proposed_by_me"
      ? t("meet_proposed", lang)
      : meeting.kind === "pending_awaiting_my_accept"
        ? t("meet_pending_you", lang).replace("{name}", chatPeer.name)
        : t("meet_btn", lang).replace("{name}", chatPeer.name);
  const meetBtnDisabled = meeting.kind === "pending_proposed_by_me" || pendingTr;
  const meetBtnBg = meeting.kind === "pending_awaiting_my_accept" ? "#2e8b57" : "#ad001c";

  return (
    <div className="screen-enter" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#ad001c", padding: "18px 20px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={goBack} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer" }}>←</button>
        <div
          onClick={() => chatPeer.guideId && openGuideProfile(chatPeer.guideId)}
          style={{ width: 36, height: 36, borderRadius: "50%", background: "#ffffff28", border: "2px solid #ffffff50", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: chatPeer.guideId ? "pointer" : "default", overflow: "hidden" }}
        >
          {(() => {
            const pg = chatPeer.guideId ? guides.find((x) => x.id === chatPeer.guideId) : null;
            return pg?.avatarPath && avatarUrls[pg.avatarPath]
              ? <img src={avatarUrls[pg.avatarPath]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : chatPeer.emoji;
          })()}
        </div>
        <div style={{ flex: 1, paddingLeft: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>{chatPeer.name}</div>
          <div style={{ fontSize: 11, color: "#a8ffca", fontWeight: 700 }}>{t("online_now", lang)}</div>
        </div>
        <Link href={`/report/${chatPeer.id}`} style={{ color: "#fff", fontSize: 16, textDecoration: "none", padding: 4 }}>🚩</Link>
        <Link href="/settings" aria-label={t("settings_aria", lang)} style={{ width: 30, height: 30, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, textDecoration: "none" }}>⚙</Link>
      </div>

      {/* 🚶 お出かけ中バナー (urgent 中は隠す) */}
      {showActive && !urgent && (
        <div style={{ background: "linear-gradient(90deg, #2e8b57, #4caf50)", color: "#fff", padding: "10px 20px", fontSize: 13, fontWeight: 900, textAlign: "center", letterSpacing: 0.3 }}>
          {t("going_out_banner", lang)}
        </div>
      )}
      {/* ⏰ 4 日以上経過 + 自分未レビュー → 評価催促 */}
      {urgent && (
        <div style={{ background: "linear-gradient(90deg, #ad001c, #d63333)", color: "#fff", padding: "10px 20px", fontSize: 13, fontWeight: 900, textAlign: "center", letterSpacing: 0.3 }}>
          ⏰ {t("review_overdue_banner", lang).replace("{name}", chatPeer.name)}
        </div>
      )}

      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {!currentUserId ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#8a7560", fontWeight: 700, fontSize: 13 }}>
            {t("chat_login_required", lang)}
          </div>
        ) : messages.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#8a7560", fontWeight: 700, fontSize: 13 }}>
            {t("chat_empty", lang)}
          </div>
        ) : (
          <>
            {messages.map((m) => {
              const mine = m.sender_id === currentUserId;
              return (
                <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "78%" }}>
                  <div style={{ padding: "11px 15px", borderRadius: mine ? "18px 4px 18px 18px" : "4px 18px 18px 18px", background: mine ? "#ad001c" : "#fff9f0", color: mine ? "#fff" : "#1a1008", fontSize: 13, fontWeight: 600, lineHeight: 1.6, border: !mine ? "2px solid #e8c99a" : "none", whiteSpace: "pre-wrap" }}>{m.body}</div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </>
        )}
      </div>

      {/* Meet / Accept Meet / Complete buttons (above input) */}
      {currentUserId && meeting.kind !== "completed" && (
        <div style={{ padding: "8px 20px 0", display: "flex", flexDirection: "column", gap: 6 }}>
          {showCompleteBtn ? (
            <Link
              href={`/meetings/${meeting.id}/complete`}
              style={{ background: urgent ? "#ad001c" : "#2e8b57", color: "#fff", borderRadius: 24, padding: "10px 14px", fontSize: 13, fontWeight: 800, textAlign: "center", textDecoration: "none", boxShadow: urgent ? "0 0 0 3px #ad001c44" : "none" }}
            >
              {urgent ? "⏰" : "✨"} {t("go_to_complete_btn", lang)}
            </Link>
          ) : myRole === "traveler" && meeting.kind === "none" ? (
            // 旅行者: 「Meet を提案」ボタン (paid なら Stripe モーダル経由)
            <button
              onClick={handleMeetClick}
              disabled={pendingTr}
              style={{ background: "#ad001c", color: "#fff", border: "none", borderRadius: 24, padding: "10px 14px", fontSize: 13, fontWeight: 800, cursor: pendingTr ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: pendingTr ? 0.7 : 1 }}
            >
              🤝 {t("meet_btn", lang).replace("{name}", chatPeer.name)}{peerGuideMode === "paid" ? " 💳" : ""}
            </button>
          ) : myRole === "traveler" && meeting.kind === "pending_proposed_by_me" ? (
            <div style={{ background: "#fff9f0", border: "2px dashed #e8c99a", color: "#8a7560", borderRadius: 24, padding: "10px 14px", fontSize: 12, fontWeight: 800, textAlign: "center" }}>
              ⏳ {t("meet_proposed", lang)}
            </div>
          ) : myRole === "guide" && meeting.kind === "pending_awaiting_my_accept" ? (
            // ガイド: 「accept」ボタン (押すと Stripe capture)
            <button
              onClick={handleAcceptMeetClick}
              disabled={pendingTr}
              style={{ background: "#2e8b57", color: "#fff", border: "none", borderRadius: 24, padding: "10px 14px", fontSize: 13, fontWeight: 800, cursor: pendingTr ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: pendingTr ? 0.7 : 1 }}
            >
              ✅ {t("meet_accept_btn", lang).replace("{name}", chatPeer.name)}
            </button>
          ) : null}
          {meetErr && (
            <div style={{ fontSize: 11, color: "#ad001c", fontWeight: 700, textAlign: "center" }}>{meetErr}</div>
          )}
        </div>
      )}

      {/* Stripe 支払いモーダル (旅行者かつ paid 相手のみ) */}
      {showPayModal && chatPeer.id && (
        <MeetPaymentModal
          peerId={chatPeer.id}
          peerName={chatPeer.name}
          peerEmoji={chatPeer.emoji}
          onClose={() => setShowPayModal(false)}
          onSuccess={() => { setShowPayModal(false); onMeetingChanged(); }}
        />
      )}

      <div style={{ padding: "12px 20px 24px", display: "flex", gap: 10, alignItems: "center", background: "#fff9f0", borderTop: "2px solid #e8c99a" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder={`Message ${chatPeer.name}...`}
          disabled={!currentUserId}
          style={{ flex: 1, background: "#ffefd5", border: "2px solid #e8c99a", borderRadius: 24, padding: "10px 16px", fontSize: 13, color: "#1a1008", fontFamily: "inherit", fontWeight: 600, outline: "none" }}
        />
        <button
          onClick={sendMessage}
          disabled={!currentUserId || !input.trim()}
          style={{ width: 40, height: 40, borderRadius: "50%", background: currentUserId ? "#ad001c" : "#bbb", border: "none", cursor: currentUserId ? "pointer" : "not-allowed", fontSize: 18, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}
        >↑</button>
      </div>
    </div>
  );
}
