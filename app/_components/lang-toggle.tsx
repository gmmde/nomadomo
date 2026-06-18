"use client";

import { useLang } from "../lib/i18n";

type Props = {
  position?: "absolute" | "static";
  topRight?: boolean;
};

export default function LangToggle({ position = "absolute", topRight = true }: Props) {
  const [lang, setLang] = useLang();
  const wrap: React.CSSProperties = position === "absolute"
    ? { position: "absolute", top: 16, right: 16, display: "flex", gap: 6, background: "#fff9f0", border: "1.5px solid #e8c99a", borderRadius: 18, padding: 3, zIndex: 5 }
    : { display: "flex", gap: 6, background: "#fff9f0", border: "1.5px solid #e8c99a", borderRadius: 18, padding: 3 };
  if (position === "absolute" && !topRight) {
    wrap.right = undefined;
    wrap.left = 16;
  }
  return (
    <div style={wrap}>
      <button
        type="button"
        onClick={() => setLang("en")}
        style={{ background: lang === "en" ? "#ad001c" : "transparent", color: lang === "en" ? "#fff" : "#8a7560", border: "none", borderRadius: 14, padding: "5px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
      >EN</button>
      <button
        type="button"
        onClick={() => setLang("ja")}
        style={{ background: lang === "ja" ? "#ad001c" : "transparent", color: lang === "ja" ? "#fff" : "#8a7560", border: "none", borderRadius: 14, padding: "5px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
      >JP</button>
    </div>
  );
}
