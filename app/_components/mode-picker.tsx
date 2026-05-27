"use client";

import { useLang, t } from "../lib/i18n";

type Props = {
  onPick: (mode: "local" | "traveler") => void;
};

export default function ModePicker({ onPick }: Props) {
  const [lang] = useLang();
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "#f5ead0", display: "flex", flexDirection: "column", padding: "32px 20px 80px", overflowY: "auto" }}>
      <div style={{ fontSize: 32, fontWeight: 900, textAlign: "center", marginTop: 40, marginBottom: 4 }}>
        <span style={{ color: "#2ecc71" }}>Noma</span>
        <span style={{ color: "#ad001c" }}>Domo</span>
      </div>
      <div style={{ fontSize: 14, color: "#8a7560", fontWeight: 700, textAlign: "center", marginBottom: 36 }}>
        {t("mode_picker_title", lang)}
      </div>

      <button
        onClick={() => onPick("traveler")}
        style={{ background: "linear-gradient(135deg, #ffefd5, #ffe0a0)", color: "#1a1008", border: "3px solid #ad001c", borderRadius: 22, padding: "24px 18px", marginBottom: 16, cursor: "pointer", fontFamily: "inherit", textAlign: "left", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
      >
        <div style={{ fontSize: 38, marginBottom: 8 }}>✈️</div>
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4 }}>Traveler</div>
        <div style={{ fontSize: 12, color: "#5a4530", fontWeight: 700, lineHeight: 1.5 }}>
          {t("mode_picker_traveler_desc", lang)}
        </div>
      </button>

      <button
        onClick={() => onPick("local")}
        style={{ background: "linear-gradient(135deg, #e6f5ee, #b0e5cc)", color: "#1a1008", border: "3px solid #2e8b57", borderRadius: 22, padding: "24px 18px", marginBottom: 16, cursor: "pointer", fontFamily: "inherit", textAlign: "left", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
      >
        <div style={{ fontSize: 38, marginBottom: 8 }}>🏯</div>
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4, color: "#1e6b40" }}>Local</div>
        <div style={{ fontSize: 12, color: "#1e6b40", fontWeight: 700, lineHeight: 1.5 }}>
          {t("mode_picker_local_desc", lang)}
        </div>
      </button>

      <div style={{ textAlign: "center", fontSize: 11, color: "#8a7560", fontWeight: 700, marginTop: 20 }}>
        {t("mode_picker_settings_hint", lang)}
      </div>
    </div>
  );
}
