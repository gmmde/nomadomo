"use client";
import BackButton from "@/app/lib/back-button";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { createBooking, type BookingFormState } from "@/app/actions/bookings";

const wrap: React.CSSProperties = { background: "#f5ead0", minHeight: "100vh", display: "flex", justifyContent: "center" };
const card: React.CSSProperties = { width: "100%", maxWidth: 390, minHeight: "100vh", background: "#f5ead0", padding: "32px 24px" };
const input: React.CSSProperties = { width: "100%", background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 14, padding: "12px 14px", fontSize: 14, fontWeight: 600, color: "#1a1008", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const label: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 800, color: "#8a7560", marginBottom: 6, textTransform: "uppercase" };
const primary: React.CSSProperties = { width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 16, fontSize: 16, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" };

function defaultDateTime(): string {
  // 明日の昼 12 時を datetime-local の文字列形式で
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Props = {
  guideId: number;
  guideName: string;
  guideEmoji: string;
  guideUniversity: string;
  ratePerDay: number;
  mode: "free" | "paid" | "both";
};

export default function BookingForm({ guideId, guideName, guideEmoji, guideUniversity, ratePerDay }: Props) {
  const [state, action, pending] = useActionState<BookingFormState, FormData>(
    createBooking,
    undefined,
  );
  const [days, setDays] = useState(1);
  const total = useMemo(() => ratePerDay * days, [ratePerDay, days]);

  return (
    <div style={wrap}>
      <div style={card} className="screen-enter">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <BackButton />
          <div style={{ fontSize: 20, fontWeight: 900 }}>予約申込</div>
        </div>

        <div style={{ background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 16, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#ffefd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, border: "2px solid #e8c99a" }}>{guideEmoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 900 }}>{guideName}</div>
            <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700 }}>{guideUniversity}</div>
            <div style={{ fontSize: 12, color: "#ad001c", fontWeight: 900, marginTop: 2 }}>¥{ratePerDay.toLocaleString()} / day</div>
          </div>
        </div>

        <form action={action}>
          <input type="hidden" name="guide_id" value={guideId} />

          <div style={{ marginBottom: 16 }}>
            <label style={label} htmlFor="start_at">開始日時</label>
            <input id="start_at" name="start_at" type="datetime-local" required defaultValue={defaultDateTime()} style={input} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={label} htmlFor="hours">日数 (1〜7 日)</label>
            <input
              id="hours"
              name="hours"
              type="number"
              min={1}
              max={7}
              step={1}
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(7, Number(e.target.value) || 1)))}
              required
              style={input}
            />
          </div>

          <div style={{ background: "#ffefd5", border: "2px solid #ad001c", borderRadius: 14, padding: 14, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#8a7560", fontWeight: 800 }}>合計金額</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#ad001c" }}>¥{total.toLocaleString()}</span>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={label} htmlFor="message">ガイドへのメッセージ（任意）</label>
            <textarea
              id="message"
              name="message"
              maxLength={500}
              rows={4}
              style={{ ...input, resize: "vertical", minHeight: 90 }}
              placeholder="希望する場所、テーマ、人数など"
            />
          </div>

          {state?.error && (
            <div style={{ background: "#ad001c20", border: "1.5px solid #ad001c", borderRadius: 12, padding: 12, marginBottom: 16, color: "#ad001c", fontSize: 13, fontWeight: 700 }}>
              {state.error}
            </div>
          )}

          <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 600, marginBottom: 14, lineHeight: 1.6 }}>
            💡 まだ決済機能はないわよ。承認されたら直接 DM で支払い方法を相談して。
          </div>

          <button type="submit" disabled={pending} style={{ ...primary, opacity: pending ? 0.6 : 1 }}>
            {pending ? "送信中…" : "予約リクエストを送る"}
          </button>
        </form>
      </div>
    </div>
  );
}
