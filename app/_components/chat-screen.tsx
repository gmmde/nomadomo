"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { RefObject } from "react";
import { t, type Lang } from "../lib/i18n";
import { proposeMeet, acceptMeet } from "../actions/meetings";
import { notifyMessageSent } from "../actions/notify";
import MeetPaymentModal from "./meet-payment-modal";
import { createClient } from "../lib/supabase/client";
import { useEffect, useRef } from "react";

type Message = {
  id: number;
  sender_id: string;
  recipient_id: string;
  body: string;
  attachment_path: string | null;
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
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // signed URL を必要な attachment_path 全部について取得
  useEffect(() => {
    const paths = messages.map((m) => m.attachment_path).filter((p): p is string => Boolean(p));
    const missing = paths.filter((p) => !attachmentUrls[p]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.storage.from("chat-images").createSignedUrls(missing, 3600);
      if (cancelled || !data) return;
      const map: Record<string, string> = {};
      for (const r of data) {
        if (r.signedUrl && r.path) map[r.path] = r.signedUrl;
      }
      setAttachmentUrls((prev) => ({ ...prev, ...map }));
    })();
    return () => { cancelled = true; };
  }, [messages, attachmentUrls]);

  async function compressImage(file: File): Promise<Blob> {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("image load failed"));
        i.src = url;
      });
      const maxDim = 1280;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas ctx");
      ctx.drawImage(img, 0, 0, width, height);
      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("canvas toBlob failed"))),
          "image/jpeg",
          0.85,
        );
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !currentUserId || !chatPeer.id) return;
    if (!file.type.startsWith("image/")) { setUploadErr("画像ファイルだけ選んでね"); return; }
    setUploadErr(null);
    setUploading(true);
    try {
      const blob = await compressImage(file);
      const key = `${currentUserId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("chat-images")
        .upload(key, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (upErr) {
        setUploadErr(upErr.message);
        setUploading(false);
        return;
      }
      const { error: msgErr } = await supabase
        .from("messages")
        .insert({ sender_id: currentUserId, recipient_id: chatPeer.id, body: "📷", attachment_path: key });
      if (msgErr) {
        // 失敗時は upload 取り消し (best-effort)
        await supabase.storage.from("chat-images").remove([key]);
        setUploadErr(msgErr.message);
        setUploading(false);
        return;
      }
      // Push 通知 (fire-and-forget)
      notifyMessageSent({ recipientId: chatPeer.id, preview: "📷 Image" }).catch(() => {});
    } catch (err) {
      const m = err instanceof Error ? err.message : "image upload failed";
      setUploadErr(m);
    } finally {
      setUploading(false);
    }
  }

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
    <div className="screen-enter" style={{ height: "100dvh", minHeight: "100svh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ background: "#fffaf0f2", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", padding: "16px 18px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #f0e2cc" }}>
        <button onClick={goBack} aria-label="戻る" style={{ background: "none", border: "none", color: "#ad001c", fontSize: 22, cursor: "pointer" }}>←</button>
        <div
          onClick={() => chatPeer.guideId && openGuideProfile(chatPeer.guideId)}
          style={{ width: 36, height: 36, borderRadius: "50%", background: "#fff7ec", border: "1.5px solid #f0e2cc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: chatPeer.guideId ? "pointer" : "default", overflow: "hidden" }}
        >
          {(() => {
            const pg = chatPeer.guideId ? guides.find((x) => x.id === chatPeer.guideId) : null;
            return pg?.avatarPath && avatarUrls[pg.avatarPath]
              ? <img loading="lazy" decoding="async" src={avatarUrls[pg.avatarPath]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : chatPeer.emoji;
          })()}
        </div>
        <div style={{ flex: 1, paddingLeft: 8 }}>
          <div className="font-display" style={{ fontSize: 15, fontWeight: 900, color: "#1a1008" }}>{chatPeer.name}</div>
          <div style={{ fontSize: 11, color: "#2e8b57", fontWeight: 700 }}>{t("online_now", lang)}</div>
        </div>
        <Link href={`/report/${chatPeer.id}`} style={{ color: "#8a7560", fontSize: 16, textDecoration: "none", padding: 4 }}>🚩</Link>
        <Link href="/settings" aria-label={t("settings_aria", lang)} style={{ width: 30, height: 30, color: "#ad001c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, textDecoration: "none" }}>⚙</Link>
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

      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 0, overflowY: "auto" }}>
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
                  {m.attachment_path ? (
                    attachmentUrls[m.attachment_path] ? (
                      <img
                        src={attachmentUrls[m.attachment_path]}
                        alt="attachment"
                        onClick={() => attachmentUrls[m.attachment_path!] && window.open(attachmentUrls[m.attachment_path!], "_blank")}
                        style={{ maxWidth: "100%", borderRadius: 14, border: !mine ? "2px solid #e8c99a" : "2px solid #ad001c", cursor: "pointer", display: "block" }}
                      />
                    ) : (
                      <div style={{ width: 180, height: 180, borderRadius: 14, background: "#f0d9b5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#8a7560", fontWeight: 700 }}>...読み込み中</div>
                    )
                  ) : (
                    <div style={{ padding: "11px 15px", borderRadius: mine ? "18px 4px 18px 18px" : "4px 18px 18px 18px", background: mine ? "#ad001c" : "#fff", color: mine ? "#fff" : "#2b1d1a", fontSize: 13.5, fontWeight: 500, lineHeight: 1.6, border: !mine ? "1px solid #f0e3cf" : "none", boxShadow: !mine ? "0 4px 12px -10px rgba(120,50,20,.4)" : "none", whiteSpace: "pre-wrap" }}>{m.body}</div>
                  )}
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

      {uploadErr && (
        <div style={{ padding: "6px 20px", background: "#fff3cd", borderTop: "1px solid #f5c649", fontSize: 11, color: "#ad001c", fontWeight: 700 }}>📷 {uploadErr}</div>
      )}
      <div style={{ padding: "12px 20px 24px", display: "flex", gap: 8, alignItems: "center", background: "#fff9f0", borderTop: "2px solid #e8c99a" }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePickImage}
          style={{ display: "none" }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!currentUserId || uploading}
          aria-label="画像を送る"
          style={{ width: 44, height: 44, borderRadius: "50%", background: uploading ? "#d8c4ad" : "#fff", border: "1px solid #f0e3cf", cursor: uploading ? "wait" : "pointer", fontSize: 18, fontFamily: "inherit", color: "#2b1d1a", flex: "none" }}
        >
          {uploading ? "..." : "📷"}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder={`Message ${chatPeer.name}...`}
          disabled={!currentUserId}
          style={{ flex: 1, minWidth: 0, background: "#f6efe2", border: "none", borderRadius: 22, padding: "13px 16px", fontSize: 13.5, color: "#2b1d1a", fontFamily: "inherit", fontWeight: 500, outline: "none" }}
        />
        <button
          onClick={sendMessage}
          disabled={!currentUserId || !input.trim()}
          aria-label="送信"
          style={{ width: 46, height: 46, borderRadius: "50%", background: currentUserId && input.trim() ? "#ad001c" : "#d8c4ad", border: "none", cursor: currentUserId ? "pointer" : "not-allowed", display: "grid", placeItems: "center", flex: "none", boxShadow: currentUserId && input.trim() ? "0 6px 14px -6px rgba(173,0,28,.6)" : "none" }}
        ><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg></button>
      </div>
    </div>
  );
}
