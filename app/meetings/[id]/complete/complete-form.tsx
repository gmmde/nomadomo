"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import BackButton from "@/app/lib/back-button";
import { useLang, t } from "@/app/lib/i18n";
import { postReview } from "@/app/actions/reviews";
import { createClient } from "@/app/lib/supabase/client";

const wrap: React.CSSProperties = { background: "#f5ead0", minHeight: "100vh", display: "flex", justifyContent: "center" };
const card: React.CSSProperties = { width: "100%", maxWidth: 390, minHeight: "100vh", background: "#f5ead0", padding: "20px 20px 100px" };
const section: React.CSSProperties = { background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 18, padding: 18, marginBottom: 16 };
const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 900, color: "#1a1008", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 };
const btnPrimary: React.CSSProperties = { width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" };
const btnDone: React.CSSProperties = { width: "100%", background: "#e6f5ee", color: "#2e8b57", border: "2px solid #2e8b57", borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 900, cursor: "default", fontFamily: "inherit" };
const inputStyle: React.CSSProperties = { width: "100%", background: "#fff", border: "2px solid #e8c99a", borderRadius: 12, padding: 12, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" };

type Props = {
  meetingId: number;
  peerName: string;
  peerEmoji: string;
  peerId: string;
  meetingStatus: string;
  initialRating: number | null;
  initialComment: string;
  initialPeerReviewed: boolean;
};

export default function CompleteForm({ meetingId, peerName, peerEmoji, peerId, meetingStatus, initialRating, initialComment, initialPeerReviewed }: Props) {
  const router = useRouter();
  const [lang] = useLang();
  const [rating, setRating] = useState<number | null>(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [reviewDone, setReviewDone] = useState(initialRating != null);
  const [reviewErr, setReviewErr] = useState<string | null>(null);
  const [finished, setFinished] = useState(meetingStatus === "completed");
  const [peerReviewed, setPeerReviewed] = useState(initialPeerReviewed);

  // 自分も相手も投稿済 → 自動完了 (server side で済んでいるはず) → 画面遷移
  // finished を deps に入れると setFinished(true) で cleanup が走り setTimeout が消える
  // ので deps からは外す。代わりに ref で「もう scheduled」フラグ管理
  const navScheduledRef = useRef(false);
  useEffect(() => {
    if (navScheduledRef.current) return;
    if (reviewDone && peerReviewed) {
      navScheduledRef.current = true;
      setFinished(true);
      setTimeout(() => router.push("/"), 1500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewDone, peerReviewed]);

  // 相手レビュー監視: Realtime のみ + 切断時 exponential backoff 再接続
  useEffect(() => {
    if (peerReviewed) return;
    const supabase = createClient();
    let cancelled = false;
    let ch: ReturnType<typeof supabase.channel> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryDelayMs = 2000;

    async function catchup() {
      const { data } = await supabase
        .from("reviews")
        .select("id")
        .eq("meeting_id", meetingId)
        .eq("reviewer_id", peerId)
        .limit(1);
      if (!cancelled && data && data.length > 0) setPeerReviewed(true);
    }

    function connect() {
      if (cancelled) return;
      ch = supabase
        .channel(`peer-review-${meetingId}-${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "reviews", filter: `meeting_id=eq.${meetingId}` },
          (payload) => {
            const row = payload.new as { reviewer_id?: string } | null;
            if (row?.reviewer_id === peerId) setPeerReviewed(true);
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            retryDelayMs = 2000;
            catchup();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            if (ch) supabase.removeChannel(ch);
            ch = null;
            retryTimer = setTimeout(() => {
              retryDelayMs = Math.min(retryDelayMs * 2, 30000);
              connect();
            }, retryDelayMs);
          }
        });
    }

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (ch) supabase.removeChannel(ch);
    };
  }, [meetingId, peerId, peerReviewed]);

  const reviewTitle = lang === "ja"
    ? `${peerName} はどんな人だった？`
    : `Please introduce ${peerName} to others!`;

  async function onPostReview() {
    if (!rating) {
      setReviewErr(lang === "ja" ? "評価は必須よ" : "Rating is required");
      return;
    }
    setReviewErr(null);
    const fd = new FormData();
    fd.set("meeting_id", String(meetingId));
    fd.set("rating", String(rating));
    fd.set("comment", comment);
    const r = await postReview(fd);
    if (r?.error) {
      setReviewErr(r.error);
      return;
    }
    setReviewDone(true);
  }

  if (finished) {
    return (
      <div style={wrap}>
        <div style={card} className="screen-enter">
          <div style={{ textAlign: "center", paddingTop: 80 }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>{lang === "ja" ? "ありがとう！" : "Thanks!"}</div>
            <div style={{ fontSize: 13, color: "#8a7560", fontWeight: 700, marginBottom: 24 }}>{lang === "ja" ? "ホームに戻ってね" : "Tap below to go home"}</div>
            <button
              onClick={() => router.push("/")}
              type="button"
              style={{ background: "#2e8b57", color: "#fff", border: "none", borderRadius: 14, padding: "14px 32px", fontSize: 15, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}
            >
              🏠 {lang === "ja" ? "ホームに戻る" : "Back to Home"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={card} className="screen-enter">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <BackButton />
          <div style={{ fontSize: 18, fontWeight: 900, flex: 1 }}>{t("complete_title", lang)}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 16, padding: 14, marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#ffefd5", border: "2px solid #e8c99a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{peerEmoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 900 }}>{peerName}</div>
            <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700 }}>{lang === "ja" ? "お出かけ完了？" : "Finished meeting?"}</div>
          </div>
        </div>

        <div style={section}>
          <div style={sectionTitle}>{t("reviews_tab", lang)}</div>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>{reviewTitle}</div>
          {reviewDone ? (
            <button style={btnDone} type="button">{t("review_submit_done", lang)}</button>
          ) : (
            <>
              <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 12 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    style={{ background: "none", border: "none", fontSize: 32, cursor: "pointer", color: (rating ?? 0) >= n ? "#f5c649" : "#e8c99a", padding: 0, lineHeight: 1 }}
                    aria-label={`${n} stars`}
                  >★</button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder={t("review_comment_placeholder", lang)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
              {reviewErr && (
                <div style={{ fontSize: 12, color: "#ad001c", fontWeight: 700, marginBottom: 10 }}>{reviewErr}</div>
              )}
              <button onClick={onPostReview} disabled={!rating} style={{ ...btnPrimary, background: rating ? "#ad001c" : "#bbb", cursor: rating ? "pointer" : "not-allowed" }} type="button">
                ⭐ {t("review_submit_btn", lang)}
              </button>
            </>
          )}
        </div>

        {reviewDone && !peerReviewed && (
          <div style={{ background: "#fff9f0", border: "2px dashed #e8c99a", borderRadius: 14, padding: 14, marginBottom: 14, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>⏳</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#8a7560" }}>
              {t("waiting_for_peer_review", lang).replace("{name}", peerName)}
            </div>
            <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 600, marginTop: 4 }}>
              {lang === "ja" ? "両者投稿で自動的に公開＆完了するわよ" : "Both reviews will be released and the meeting will finish automatically."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
