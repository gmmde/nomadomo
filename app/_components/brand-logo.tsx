"use client";

import { useState } from "react";

/**
 * NomaDomo ブランドロゴ
 *
 * /public/logo-camel.png があれば camel 画像を表示、
 * 無ければ camel 領域をスキップしてテキストだけ表示する。
 * (PNG が用意できるまでクリーンな状態を保つ)
 *
 * フォント: Avenir Next Bold → Avenir → Helvetica Neue → system-ui → sans-serif
 *
 * variant:
 *  - "full": 縦並び (camel 大 + テキスト下) — Splash 用
 *  - "row":  横並び (camel 小 + テキスト右) — Home トップバー用
 *  - "text": テキストのみ
 */
type Props = {
  variant?: "full" | "row" | "text";
  size?: number;
  domoColor?: string;
  nomaColor?: string;
  camelHeight?: number;
};

const FONT_FAMILY = '"Avenir Next", "AvenirNext-Bold", Avenir, "Helvetica Neue", system-ui, sans-serif';

export default function BrandLogo({
  variant = "row",
  size = 24,
  domoColor = "#ad001c",
  nomaColor = "#2ecc71",
  camelHeight,
}: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const ch = camelHeight ?? (variant === "full" ? 110 : variant === "row" ? 32 : 0);

  const text = (
    <span
      style={{
        fontFamily: FONT_FAMILY,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: "-0.02em",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: nomaColor }}>Noma</span>
      <span style={{ color: domoColor }}>Domo</span>
    </span>
  );

  if (variant === "text") return text;

  const camel = !imgFailed ? (
    <img
      src="/logo-camel.png"
      alt=""
      onError={() => setImgFailed(true)}
      style={{ height: ch, width: "auto", display: "block" }}
    />
  ) : null;

  if (variant === "full") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: camel ? 14 : 0 }}>
        {camel}
        {text}
      </div>
    );
  }

  // row
  return (
    <div style={{ display: "flex", alignItems: "center", gap: camel ? 8 : 0 }}>
      {camel}
      {text}
    </div>
  );
}
