"use client";

import { useState } from "react";
import type { GuideFormState } from "@/app/actions/guides";

type Mode = "free" | "paid" | "both";

const OPTIONS: Array<{ value: Mode; title: string; sub: string; color: string }> = [
  {
    value: "free",
    title: "🤝 友達として無料で会う (mate)",
    sub: "無料ガイドでもいいので、とにかく外国人観光客と交流したい！",
    color: "#2e8b57",
  },
  {
    value: "paid",
    title: "💼 有料で街を案内する (guide)",
    sub: "アマチュアの観光ガイドとして、お金をもらって街を案内したい！",
    color: "#ad001c",
  },
  {
    value: "both",
    title: "✨ どちらでもOK (both)",
    sub: "相手や状況に応じて、無料でも有料でも対応する",
    color: "#1a1008",
  },
];

const input: React.CSSProperties = {
  width: "100%",
  background: "#fff9f0",
  border: "2px solid #e8c99a",
  borderRadius: 14,
  padding: "12px 14px",
  fontSize: 14,
  fontWeight: 600,
  color: "#1a1008",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 800,
  color: "#8a7560",
  marginBottom: 6,
  textTransform: "uppercase",
};

type Props = {
  state: GuideFormState;
  initialMode?: Mode;
  initialRate?: number | null;
};

export default function ModeAndRate({ initialMode = "both", initialRate = 3000 }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [rate, setRate] = useState<string>(
    initialRate != null && initialRate > 0 ? String(initialRate) : "3000",
  );
  const showRate = mode !== "free";

  return (
    <div style={{ marginBottom: 18 }}>
      <label style={label}>ガイドのモード</label>
      <input type="hidden" name="mode" value={mode} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: showRate ? 14 : 0 }}>
        {OPTIONS.map((o) => {
          const active = mode === o.value;
          return (
            <button
              type="button"
              key={o.value}
              onClick={() => setMode(o.value)}
              style={{
                background: active ? `${o.color}15` : "#fff9f0",
                border: `2px solid ${active ? o.color : "#e8c99a"}`,
                borderRadius: 14,
                padding: "12px 14px",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 900, color: active ? o.color : "#1a1008", marginBottom: 4 }}>
                {o.title}
              </div>
              <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 600, lineHeight: 1.5 }}>
                {o.sub}
              </div>
            </button>
          );
        })}
      </div>

      {showRate && (
        <div>
          <label style={label} htmlFor="rate_per_day">一日あたりの料金 (¥)</label>
          <input
            id="rate_per_day"
            name="rate_per_day"
            type="number"
            inputMode="numeric"
            min={500}
            step={500}
            required
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            style={input}
            placeholder="例: 3000"
          />
          <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700, marginTop: 4 }}>
            目安: ¥3000〜10000 / day
          </div>
        </div>
      )}
    </div>
  );
}
