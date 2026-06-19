"use client";

import { useState } from "react";

const DAYS = [
  { code: "mon", label: "月" },
  { code: "tue", label: "火" },
  { code: "wed", label: "水" },
  { code: "thu", label: "木" },
  { code: "fri", label: "金" },
  { code: "sat", label: "土" },
  { code: "sun", label: "日" },
] as const;

const DAY_LABEL: Record<string, string> = Object.fromEntries(DAYS.map((d) => [d.code, d.label]));

function formatSlot(s: string): string {
  // "mon:1800-2200" → "月 18:00-22:00"
  const [day, time] = s.split(":");
  if (!day || !time) return s;
  const [start, end] = time.split("-");
  const fmt = (t: string) => t.length === 4 ? `${t.slice(0, 2)}:${t.slice(2)}` : t;
  return `${DAY_LABEL[day] ?? day} ${fmt(start ?? "")}-${fmt(end ?? "")}`;
}

type Props = {
  initial?: string[];
};

export default function AvailableSlots({ initial = [] }: Props) {
  const [slots, setSlots] = useState<string[]>(initial);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("22:00");
  const [error, setError] = useState<string | null>(null);

  function toggleDay(d: string) {
    setSelectedDays((s) => s.includes(d) ? s.filter((x) => x !== d) : [...s, d]);
  }

  function addSlots() {
    if (selectedDays.length === 0) {
      setError("曜日を1つ以上選んで");
      return;
    }
    if (!startTime || !endTime) {
      setError("時間帯を入れて");
      return;
    }
    if (startTime >= endTime) {
      setError("終了時刻は開始より後にして");
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
    background: active ? "#ad001c" : "#fff9f0",
    color: active ? "#fff" : "#8a7560",
    border: `2px solid ${active ? "#ad001c" : "#e8c99a"}`,
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
              {formatSlot(s)}
              <button type="button" onClick={() => removeSlot(s)} aria-label="削除" style={{ background: "rgba(255,255,255,0.25)", border: "none", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 11, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* 追加 UI */}
      <div style={{ background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 12, padding: 10, marginBottom: 4 }}>
        <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 800, marginBottom: 6 }}>曜日 (複数選択可)</div>
        <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
          {DAYS.map((d) => (
            <button key={d.code} type="button" onClick={() => toggleDay(d.code)} style={dayChipStyle(selectedDays.includes(d.code))}>{d.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ flex: 1, background: "#fff", border: "1.5px solid #e8c99a", borderRadius: 8, padding: "6px 8px", fontSize: 13, fontFamily: "inherit" }} />
          <span style={{ color: "#8a7560", fontWeight: 800 }}>〜</span>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ flex: 1, background: "#fff", border: "1.5px solid #e8c99a", borderRadius: 8, padding: "6px 8px", fontSize: 13, fontFamily: "inherit" }} />
          <button type="button" onClick={addSlots} style={{ background: "#ad001c", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}>+ 追加</button>
        </div>
        {error && <div style={{ fontSize: 11, color: "#ad001c", fontWeight: 800 }}>{error}</div>}
      </div>
    </div>
  );
}
