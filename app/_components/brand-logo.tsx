"use client";

/**
 * NomaDomo ブランドロゴ コンポーネント
 *
 * 画像は /public/logo-camel.png を優先、無ければ仮の SVG を使う。
 * フォントは Avenir Next Bold を優先、未対応 OS は Nunito にフォールバック。
 *
 * バリアント:
 *  - "full": 縦並び (ラクダ大 + テキスト下) — Splash 用
 *  - "row":  横並び (ラクダ小 + テキスト右) — Home トップバー用
 *  - "text": テキストのみ
 *
 * domoColor で「Domo」部分の色を上書き (Home の赤背景では cream に)
 */
type Props = {
  variant?: "full" | "row" | "text";
  size?: number;      // テキストの font-size (px)
  domoColor?: string; // "Domo" 部分の色
  nomaColor?: string; // "Noma" 部分の色
  camelHeight?: number; // ラクダの高さ (px)
};

const FONT_FAMILY = '"Avenir Next", "AvenirNext-Bold", Avenir, "Helvetica Neue", system-ui, sans-serif';

export default function BrandLogo({
  variant = "row",
  size = 24,
  domoColor = "#ad001c",
  nomaColor = "#2ecc71",
  camelHeight,
}: Props) {
  const ch = camelHeight ?? (variant === "full" ? 110 : variant === "row" ? 32 : 0);

  const text = (
    <span
      style={{
        fontFamily: FONT_FAMILY,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}
    >
      <span style={{ color: nomaColor }}>Noma</span>
      <span style={{ color: domoColor }}>Domo</span>
    </span>
  );

  if (variant === "text") return text;

  const camel = (
    <img
      src="/logo-camel.png"
      alt=""
      height={ch}
      width={Math.round(ch * 1.4)}
      onError={(e) => {
        // PNG が無ければ SVG fallback
        const t = e.currentTarget;
        if (t.src.endsWith(".png")) t.src = "/logo-camel.svg";
      }}
      style={{ height: ch, width: "auto", display: "block" }}
    />
  );

  if (variant === "full") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        {camel}
        {text}
      </div>
    );
  }

  // row
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {camel}
      {text}
    </div>
  );
}
