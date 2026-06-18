import { ImageResponse } from "next/og";

export const alt = "NomaDomo - 日本で本物のローカルと出会う";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#f5ead0",
          fontFamily: "sans-serif",
          padding: 80,
          position: "relative",
        }}
      >
        {/* 桜のアクセント (右上) */}
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 60,
            fontSize: 160,
            opacity: 0.5,
            display: "flex",
          }}
        >
          🌸
        </div>
        {/* 鳥居 (左下) */}
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 60,
            fontSize: 100,
            opacity: 0.5,
            display: "flex",
          }}
        >
          ⛩
        </div>

        {/* ロゴ */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            marginBottom: 24,
            display: "flex",
          }}
        >
          <span style={{ color: "#2ecc71" }}>Noma</span>
          <span style={{ color: "#ad001c" }}>Domo</span>
        </div>

        {/* 地域バッジ */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "#fff",
            border: "3px solid #2e8b57",
            borderRadius: 40,
            padding: "10px 24px",
            fontSize: 26,
            fontWeight: 800,
            color: "#2e8b57",
            marginBottom: 36,
          }}
        >
          📍 Japan
        </div>

        {/* メインコピー */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 900,
            color: "#1a1008",
            textAlign: "center",
            lineHeight: 1.3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span>日本で本物のローカルと出会う</span>
          <span style={{ fontSize: 32, color: "#8a7560", marginTop: 16, fontWeight: 700 }}>
            観光ツアーじゃ味わえない地元の体験を
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
