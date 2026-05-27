"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { createChatRequest, type RequestFormState } from "@/app/actions/chat-requests";
import BackButton from "@/app/lib/back-button";

const wrap: React.CSSProperties = { minHeight: "100vh", display: "flex", justifyContent: "center" };
const card: React.CSSProperties = { width: "100%", maxWidth: 390, minHeight: "100vh", padding: "16px 16px 80px" };
const input: React.CSSProperties = { width: "100%", background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 14, padding: "12px 14px", fontSize: 14, fontWeight: 600, color: "#1a1008", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const label: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 800, color: "#8a7560", marginBottom: 6, textTransform: "uppercase" };
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
  guideMode: "free" | "paid" | "both";
};

export default function RequestForm({ guideUserId, guideName, guideEmoji, guideUniversity, guideMode }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState<RequestFormState, FormData>(createChatRequest, undefined);
  const [place, setPlace] = useState("");
  const [message, setMessage] = useState("");

  if (state?.success) {
    setTimeout(() => router.push("/requests"), 1500);
    return (
      <div style={wrap}>
        <div style={card} className="screen-enter">
          <div style={{ background: "#2e8b5720", border: "1.5px solid #2e8b57", borderRadius: 14, padding: 20, color: "#2e8b57", fontWeight: 700, lineHeight: 1.6 }}>
            ✅ リクエスト送信したわ。<br/>
            {guideName} の承認待ち。承認されたらチャットできるようになるわよ。<br/>
            <br/>
            <span style={{ fontSize: 12, color: "#8a7560" }}>📨 リクエスト一覧に飛ばすわね…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={card} className="screen-enter">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <BackButton />
          <div style={{ fontSize: 18, fontWeight: 900 }}>📨 メッセージリクエスト</div>
        </div>

        <div style={{ background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 16, padding: 14, marginBottom: 18, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#ffefd5", border: "2px solid #e8c99a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{guideEmoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 900 }}>{guideName}{guideMode !== "free" ? " ✨" : ""}</div>
            <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700 }}>{guideUniversity}</div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: "#8a7560", fontWeight: 700, marginBottom: 16, lineHeight: 1.6 }}>
          いきなり DM は送れない仕組みよ。「いつ・どこで・なぜ会いたいか」をリクエストすると、ガイドが承認したらチャットが開けるわ。
        </div>

        <form action={action}>
          <input type="hidden" name="guide_user_id" value={guideUserId} />

          <div style={{ marginBottom: 16 }}>
            <label style={label} htmlFor="preferred_date">📅 希望日時</label>
            <input id="preferred_date" name="preferred_date" type="datetime-local" required defaultValue={defaultDateTime()} style={input} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={label} htmlFor="preferred_place">📍 行きたい場所</label>
            <input
              id="preferred_place"
              name="preferred_place"
              type="text"
              required
              maxLength={200}
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              style={input}
              placeholder="例: 嵐山の竹林、伏見稲荷、祇園のお茶屋"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={label} htmlFor="message">💬 メッセージ (任意)</label>
            <textarea
              id="message"
              name="message"
              maxLength={1000}
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ ...input, resize: "vertical", minHeight: 96 }}
              placeholder="自己紹介や、ガイドに伝えたいこと"
            />
          </div>

          {state?.error && (
            <div style={{ background: "#ad001c20", border: "1.5px solid #ad001c", borderRadius: 12, padding: 12, marginBottom: 16, color: "#ad001c", fontSize: 13, fontWeight: 700 }}>
              {state.error}
            </div>
          )}

          <button type="submit" disabled={pending} style={{ ...primary, opacity: pending ? 0.6 : 1 }}>
            {pending ? "送信中…" : "リクエストを送る"}
          </button>
        </form>
      </div>
    </div>
  );
}
