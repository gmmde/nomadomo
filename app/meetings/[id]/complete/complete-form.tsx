"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import BackButton from "@/app/lib/back-button";
import { useLang, t } from "@/app/lib/i18n";
import { postReview } from "@/app/actions/reviews";
import { completeMeet } from "@/app/actions/meetings";

const wrap: React.CSSProperties = { background: "#f5ead0", minHeight: "100vh", display: "flex", justifyContent: "center" };
const card: React.CSSProperties = { width: "100%", maxWidth: 390, minHeight: "100vh", background: "#f5ead0", padding: "20px 20px 100px" };
const section: React.CSSProperties = { background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 18, padding: 18, marginBottom: 16 };
const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 900, color: "#1a1008", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 };
const btnPrimary: React.CSSProperties = { width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" };
const btnDone: React.CSSProperties = { width: "100%", background: "#e6f5ee", color: "#2e8b57", border: "2px solid #2e8b57", borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 900, cursor: "default", fontFamily: "inherit" };
const btnFinish: React.CSSProperties = { width: "100%", background: "#2e8b57", color: "#fff", border: "none", borderRadius: 16, padding: 16, fontSize: 16, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", marginTop: 4 };
const inputStyle: React.CSSProperties = { width: "100%", background: "#fff", border: "2px solid #e8c99a", borderRadius: 12, padding: 12, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" };

type Props = {
  meetingId: number;
  peerName: string;
  peerEmoji: string;
  meetingStatus: string;
  initialRating: number | null;
  initialComment: string;
};

export default function CompleteForm({ meetingId, peerName, peerEmoji, meetingStatus, initialRating, initialComment }: Props) {
  const router = useRouter();
  const [lang] = useLang();
  const [paid, setPaid] = useState(false); // TODO: Stripe integration — currently dummy
  const [rating, setRating] = useState<number | null>(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [reviewDone, setReviewDone] = useState(initialRating != null);
  const [reviewErr, setReviewErr] = useState<string | null>(null);
  const [finishing, startFinish] = useTransition();
  const [finished, setFinished] = useState(meetingStatus === "completed");

  const bothDone = paid && reviewDone;
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

  async function onFinish() {
    if (!bothDone) return;
    startFinish(async () => {
      const fd = new FormData();
      fd.set("meeting_id", String(meetingId));
      const r = await completeMeet(fd);
      if (r?.error) {
        alert(r.error);
        return;
      }
      setFinished(true);
      setTimeout(() => router.push("/"), 800);
    });
  }

  if (finished) {
    return (
      <div style={wrap}>
        <div style={card} className="screen-enter">
          <div style={{ textAlign: "center", paddingTop: 80 }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>{lang === "ja" ? "ありがとう！" : "Thanks!"}</div>
            <div style={{ fontSize: 13, color: "#8a7560", fontWeight: 700 }}>{lang === "ja" ? "ホームに戻るわよ…" : "Redirecting to home…"}</div>
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

        {/* peer header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 16, padding: 14, marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#ffefd5", border: "2px solid #e8c99a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{peerEmoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 900 }}>{peerName}</div>
            <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700 }}>{lang === "ja" ? "お出かけ完了？" : "Finished meeting?"}</div>
          </div>
        </div>

        {/* Payment section */}
        <div style={section}>
          <div style={sectionTitle}>1. {t("payment_section_title", lang)}</div>
          {paid ? (
            <button style={btnDone} type="button">{t("payment_dummy_done", lang)}</button>
          ) : (
            <button onClick={() => setPaid(true)} style={btnPrimary} type="button">
              💳 {t("payment_dummy_btn", lang)}
            </button>
          )}
          {/* TODO: Stripe integration — capture PaymentIntent here */}
        </div>

        {/* Review section */}
        <div style={section}>
          <div style={sectionTitle}>2. {t("reviews_tab", lang)}</div>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>{reviewTitle}</div>
          {reviewDone ? (
            <button style={btnDone} type="button">{t("review_submit_done", lang)}</button>
          ) : (
            <>
              {/* Star rating */}
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

        {/* Finish button — only shown when both sections done */}
        {bothDone && (
          <button onClick={onFinish} disabled={finishing} style={{ ...btnFinish, opacity: finishing ? 0.6 : 1 }} type="button">
            🎉 {t("finish_btn", lang)}
          </button>
        )}
      </div>
    </div>
  );
}
