"use client";

import { useActionState, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createChatRequest, type RequestFormState } from "@/app/actions/chat-requests";
import BackButton from "@/app/lib/back-button";
import { useLang, t } from "@/app/lib/i18n";

const wrap: React.CSSProperties = { minHeight: "100vh", display: "flex", justifyContent: "center" };
const card: React.CSSProperties = { width: "100%", maxWidth: 390, minHeight: "100vh", padding: "16px 16px 80px" };
const input: React.CSSProperties = { width: "100%", background: "#fff", border: "1px solid #ecdcc4", borderRadius: 14, padding: "12px 14px", fontSize: 14, fontWeight: 600, color: "#1a1008", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const label: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#ad001c", marginBottom: 7, textTransform: "uppercase", letterSpacing: ".05em" };
const primary: React.CSSProperties = { width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 16, fontSize: 16, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" };

function defaultDateTime(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Props = {
  guideId: number;
  guideUserId: string;
  guideName: string;
  guideEmoji: string;
  guideUniversity: string;
  guideMode: "free" | "paid";
};

export default function RequestForm({ guideUserId, guideName, guideEmoji, guideUniversity, guideMode }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const simple = sp.get("kind") === "simple";
  const [state, action, pending] = useActionState<RequestFormState, FormData>(createChatRequest, undefined);
  const [place, setPlace] = useState("");
  const [message, setMessage] = useState("");
  const [lang] = useLang();

  if (state?.success) {
    const waiting = t("request_sent_waiting", lang).replace("{name}", guideName);
    return (
      <div style={wrap}>
        <div style={card} className="screen-enter">
          <div style={{ background: "#2e8b5720", border: "1.5px solid #2e8b57", borderRadius: 14, padding: 20, color: "#2e8b57", fontWeight: 700, lineHeight: 1.6, marginBottom: 16 }}>
            ✅ {t("request_sent_ok", lang)}<br/>
            {waiting}
          </div>
          <button
            type="button"
            onClick={() => router.push("/")}
            style={{ width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 16, fontSize: 15, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", marginBottom: 10 }}
          >
            🏠 {lang === "ja" ? "ホームに戻る" : "Back to Home"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/requests")}
            style={{ width: "100%", background: "transparent", color: "#8a7560", border: "1px solid #ecdcc4", borderRadius: 16, padding: 12, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
          >
            📨 {lang === "ja" ? "送信したリクエスト一覧" : "View sent requests"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={card} className="screen-enter">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <BackButton />
          <div className="font-display" style={{ fontSize: 22, fontWeight: 900, color: "#2b1d1a" }}>{t("req_form_title", lang)}</div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #ecdcc4", borderRadius: 16, padding: 14, marginBottom: 18, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#ffefd5", border: "1px solid #ecdcc4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{guideEmoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 900 }}>{guideName}{guideMode !== "free" ? " ✨" : ""}</div>
            <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700 }}>{guideUniversity}</div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: "#8a7560", fontWeight: 700, marginBottom: 16, lineHeight: 1.6 }}>
          {simple ? t("chat_req_explainer_simple", lang) : t("chat_req_explainer_full", lang)}
        </div>

        <form action={action}>
          <input type="hidden" name="guide_user_id" value={guideUserId} />

          {!simple && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={label} htmlFor="preferred_date">{t("preferred_date_label", lang)}</label>
                <input id="preferred_date" name="preferred_date" type="datetime-local" defaultValue={defaultDateTime()} style={input} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={label} htmlFor="preferred_place">{t("preferred_place_label", lang)}</label>
                <input
                  id="preferred_place"
                  name="preferred_place"
                  type="text"
                  maxLength={200}
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  style={input}
                  placeholder={t("preferred_place_placeholder", lang)}
                />
              </div>
            </>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={label} htmlFor="message">{t("msg_optional", lang)}</label>
            <textarea
              id="message"
              name="message"
              maxLength={1000}
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ ...input, resize: "vertical", minHeight: 96 }}
              placeholder={t("msg_placeholder", lang)}
            />
          </div>

          {state?.error && (
            <div style={{ background: "#ad001c20", border: "1.5px solid #ad001c", borderRadius: 12, padding: 12, marginBottom: 16, color: "#ad001c", fontSize: 13, fontWeight: 700 }}>
              {state.error}
            </div>
          )}

          <button type="submit" disabled={pending} style={{ ...primary, opacity: pending ? 0.6 : 1 }}>
            {pending ? t("sending", lang) : t("send_btn", lang)}
          </button>
        </form>
      </div>
    </div>
  );
}
