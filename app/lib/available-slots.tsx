"use client";

import { useState } from "react";
import { useLang } from "@/app/lib/i18n";

const DAYS = [
  { code: "mon", label: "月", en: "Mon" },
  { code: "tue", label: "火", en: "Tue" },
  { code: "wed", label: "水", en: "Wed" },
  { code: "thu", label: "木", en: "Thu" },
  { code: "fri", label: "金", en: "Fri" },
  { code: "sat", label: "土", en: "Sat" },
  { code: "sun", label: "日", en: "Sun" },
] as const;

const DAY_LABEL: Record<string, string> = Object.fromEntries(DAYS.map((d) => [d.code, d.label]));
const DAY_LABEL_EN: Record<string, string> = Object.fromEntries(DAYS.map((d) => [d.code, d.en]));

function formatSlot(s: string, lang: "ja" | "en"): string {
  // "mon:1800-2200" → "月 18:00-22:00"
  const [day, time] = s.split(":");
  if (!day || !time) return s;
  const [start, end] = time.split("-");
  const fmt = (t: string) => t.length === 4 ? `${t.slice(0, 2)}:${t.slice(2)}` : t;
  const dl = (lang === "ja" ? DAY_LABEL[day] : DAY_LABEL_EN[day]) ?? day;
  return `${dl} ${fmt(start ?? "")}-${fmt(end ?? "")}`;
}

type Props = {
  initial?: string[];
};

export default function AvailableSlots({ initial = [] }: Props) {
  const [slots, setSlots] = useState<string[]>(initial);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [lang] = useLang();
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("22:00");
  const [error, setError] = useState<string | null>(null);

  function toggleDay(d: string) {
    setSelectedDays((s) => s.includes(d) ? s.filter((x) => x !== d) : [...s, d]);
  }

  function addSlots() {
    if (selectedDays.length === 0) {
      setError(lang === "ja" ? "曜日を1つ以上選んで" : "Pick at least one day");
      return;
    }
    if (!startTime || !endTime) {
      setError(lang === "ja" ? "時間帯を入れて" : "Enter a time range");
      return;
    }
    if (startTime >= endTime) {
      setError(lang === "ja" ? "終了時刻は開始より後にして" : "End must be after start");
      return;
    }
    const compact = (t: string) => t.replace(":", "");
    const newSlots = selectedDays.map((d) => `${d}:${compact(startTime)}-${compact(endTime)}`);
    setSlots((s) => Array.from(new Set([...s, ...newSlots])));
    setSelectedDays([]);
    setError(null);
  }

  function removeSlot(s: string) {
    setSlots((cur) => cur.filter((x) => x !== s));
  }

  const dayChipStyle = (active: boolean): React.CSSProperties => ({
    width: 38, height: 38, borderRadius: "50%",
    background: active ? "#ad001c" : "#fff",
    color: active ? "#fff" : "#8a7560",
    border: `2px solid ${active ? "#ad001c" : "#f3e8d6"}`,
    fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
  });

  return (
    <div>
      {/* hidden form inputs */}
      {slots.map((s) => (
        <input key={s} type="hidden" name="available_slots" value={s} />
      ))}

      {/* 既存スロット表示 */}
      {slots.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {slots.map((s) => (
            <div key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#2e8b57", color: "#fff", borderRadius: 16, padding: "5px 10px 5px 12px", fontSize: 12, fontWeight: 800 }}>
              {formatSlot(s, lang)}
              <button type="button" onClick={() => removeSlot(s)} aria-label={lang === "ja" ? "削除" : "Remove"} style={{ background: "rgba(255,255,255,0.25)", border: "none", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 11, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* 追加 UI */}
      <div style={{ background: "#fff", border: "1px solid #ecdcc4", borderRadius: 12, padding: 10, marginBottom: 4 }}>
        <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 800, marginBottom: 6 }}>{lang === "ja" ? "曜日 (複数選択可)" : "Days (select any)"}</div>
        <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
          {DAYS.map((d) => (
            <button key={d.code} type="button" onClick={() => toggleDay(d.code)} style={dayChipStyle(selectedDays.includes(d.code))}>{lang === "ja" ? d.label : d.en}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ flex: 1, background: "#fff", border: "1px solid #ecdcc4", borderRadius: 8, padding: "6px 8px", fontSize: 13, fontFamily: "inherit" }} />
          <span style={{ color: "#8a7560", fontWeight: 800 }}>〜</span>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ flex: 1, background: "#fff", border: "1px solid #ecdcc4", borderRadius: 8, padding: "6px 8px", fontSize: 13, fontFamily: "inherit" }} />
          <button type="button" onClick={addSlots} style={{ background: "#ad001c", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>{lang === "ja" ? "+ 追加" : "+ Add"}</button>
        </div>
        {error && <div style={{ fontSize: 11, color: "#ad001c", fontWeight: 800 }}>{error}</div>}
      </div>
    </div>
  );
}
