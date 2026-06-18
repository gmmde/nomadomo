"use client";

import { useState } from "react";

/**
 * NomaDomo ブランドロゴ。
 *
 * テキスト部 (NomaDomo の字) は /public/logo-letter.png を表示。
 * ラクダ部は /public/logo-camel.png を表示。
 * ファイルが無ければ何も出さず (alt 経由でアクセシビリティ確保)。
 *
 * variant:
 *  - "full": 縦並び (camel 上 + 字 下) — Splash 用
 *  - "row":  横並び (camel 左 + 字 右) — トップバー用
 *  - "text": 字のみ
 *
 * size: テキスト画像の高さ (px)
 * camelHeight: ラクダ画像の高さ (px、未指定なら variant 依存)
 *
 * 注意: nomaColor / domoColor は PNG に色が焼き込み済みのため無視される。
 */
type Props = {
  variant?: "full" | "row" | "text";
  size?: number;
  domoColor?: string;
  nomaColor?: string;
  camelHeight?: number;
};

export default function BrandLogo({
  variant = "row",
  size = 24,
  camelHeight,
}: Props) {
  const [letterFailed, setLetterFailed] = useState(false);
  const [camelFailed, setCamelFailed] = useState(false);
  const ch = camelHeight ?? (variant === "full" ? 110 : variant === "row" ? 32 : 0);

  const letter = !letterFailed ? (
    <img
      src="/logo-letter.png"
      alt="NomaDomo"
      onError={() => setLetterFailed(true)}
      style={{ height: size * 1.1, width: "auto", display: "block" }}
    />
  ) : null;

  if (variant === "text") return letter;

  const camel = !camelFailed ? (
    <img
      src="/logo-camel.png"
      alt=""
      onError={() => setCamelFailed(true)}
      style={{ height: ch, width: "auto", display: "block" }}
    />
  ) : null;

  if (variant === "full") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: camel ? 4 : 0 }}>
        {camel}
        {letter}
      </div>
    );
  }

  // row
  return (
    <div style={{ display: "flex", alignItems: "center", gap: camel ? 8 : 0 }}>
      {camel}
      {letter}
    </div>
  );
}
