"use client";

import { useLang } from "../lib/i18n";

type Props = {
  position?: "absolute" | "static";
  topRight?: boolean;
};

export default function LangToggle({ position = "absolute", topRight = true }: Props) {
  const [lang, setLang] = useLang();
  const wrap: React.CSSProperties = position === "absolute"
    ? { position: "absolute", top: 16, right: 16, display: "flex", gap: 4, background: "#fff", border: "1px solid #f0e3cf", borderRadius: 18, padding: 3, zIndex: 5, boxShadow: "0 6px 16px -10px rgba(120,50,20,.4)" }
    : { display: "flex", gap: 4, background: "#fff", border: "1px solid #f0e3cf", borderRadius: 18, padding: 3, boxShadow: "0 6px 16px -10px rgba(120,50,20,.4)" };
  if (position === "absolute" && !topRight) {
    wrap.right = undefined;
    wrap.left = 16;
  }
  return (
    <div style={wrap}>
      <button
        type="button"
        onClick={() => setLang("en")}
        style={{ background: lang === "en" ? "#ad001c" : "transparent", color: lang === "en" ? "#fff" : "#9a8a7c", border: "none", borderRadius: 14, padding: "5px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
      >EN</button>
      <button
        type="button"
        onClick={() => setLang("ja")}
        style={{ background: lang === "ja" ? "#ad001c" : "transparent", color: lang === "ja" ? "#fff" : "#9a8a7c", border: "none", borderRadius: 14, padding: "5px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
      >JP</button>
    </div>
  );
}
