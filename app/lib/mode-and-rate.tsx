"use client";

import { useState } from "react";
import type { GuideFormState } from "@/app/actions/guides";
import { useLang, t } from "@/app/lib/i18n";

type Mode = "free" | "paid";

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
  initialMode?: Mode | "both";
  initialRate?: number | null;
};

export default function ModeAndRate({ initialMode = "free", initialRate = 3000 }: Props) {
  // 'both' is deprecated — coerce to 'paid' (since both implied a rate)
  const coerced: Mode = initialMode === "paid" ? "paid" : initialMode === "free" ? "free" : "paid";
  const [mode, setMode] = useState<Mode>(coerced);
  const [rate, setRate] = useState<string>(
    initialRate != null && initialRate > 0 ? String(initialRate) : "3000",
  );
  const showRate = mode === "paid";
  const [lang] = useLang();

  const OPTIONS: Array<{ value: Mode; title: string; sub: string; color: string }> = [
    {
      value: "free",
      title: t("mode_free_title", lang),
      sub: t("mode_free_sub", lang),
      color: "#2e8b57",
    },
    {
      value: "paid",
      title: t("mode_paid_title", lang),
      sub: t("mode_paid_sub", lang),
      color: "#ad001c",
    },
  ];

  return (
    <div style={{ marginBottom: 18 }}>
      <label style={label}>{t("guide_mode_label", lang)}</label>
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
          <label style={label} htmlFor="rate_per_day">{t("rate_per_day_label", lang)}</label>
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
            placeholder="3000"
          />
          <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700, marginTop: 4 }}>
            {t("rate_range_hint", lang)}
          </div>
        </div>
      )}
    </div>
  );
}
