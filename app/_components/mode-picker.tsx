"use client";

import { useLang, t } from "../lib/i18n";
import BrandLogo from "./brand-logo";

type Props = {
  onPick: (mode: "local" | "traveler") => void;
};

export default function ModePicker({ onPick }: Props) {
  const [lang, setLang] = useLang();
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "#f5ead0", display: "flex", flexDirection: "column", padding: "32px 20px 80px", overflowY: "auto" }}>
      {/* Language toggle — top right */}
      <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 6, background: "#fff9f0", border: "1.5px solid #e8c99a", borderRadius: 18, padding: 3 }}>
        <button
          onClick={() => setLang("en")}
          style={{ background: lang === "en" ? "#ad001c" : "transparent", color: lang === "en" ? "#fff" : "#8a7560", border: "none", borderRadius: 14, padding: "5px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
        >
          EN
        </button>
        <button
          onClick={() => setLang("ja")}
          style={{ background: lang === "ja" ? "#ad001c" : "transparent", color: lang === "ja" ? "#fff" : "#8a7560", border: "none", borderRadius: 14, padding: "5px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
        >
          JP
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 40, marginBottom: 4 }}>
        <BrandLogo variant="full" size={32} camelHeight={100} />
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
