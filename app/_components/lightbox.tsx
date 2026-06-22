"use client";

import { useLang } from "@/app/lib/i18n";

type Props = {
  url: string | null;
  onClose: () => void;
};

export default function Lightbox({ url, onClose }: Props) {
  const [lang] = useLang();
  if (!url) return null;
  return (
    <div
      onClick={onClose}
      className="fade-enter"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, cursor: "zoom-out" }}
    >
      <img src={url} alt="" className="zoom-enter" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{ position: "absolute", top: 18, right: 18, background: "rgba(255,255,255,0.18)", color: "#fff", border: "2px solid rgba(255,255,255,0.4)", borderRadius: "50%", width: 36, height: 36, fontSize: 18, cursor: "pointer", fontWeight: 900 }}
        aria-label={lang === "ja" ? "閉じる" : "Close"}
      >
        ×
      </button>
    </div>
  );
}
