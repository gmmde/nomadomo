"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App crashed:", error);
  }, [error]);

  return (
    <div
      style={{
        background: "#fff8ec",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "60px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 390,
          background: "#fff",
          border: "2px solid #ad001c",
          borderRadius: 16,
          padding: 24,
        }}
      >
        <div style={{ fontSize: 48, textAlign: "center", marginBottom: 12 }}>😵</div>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 900,
            color: "#ad001c",
            margin: "0 0 8px",
            textAlign: "center",
          }}
        >
          ちょっと、なんかおかしいわよ
        </h2>
        <p style={{ fontSize: 13, color: "#8a7560", margin: "0 0 16px", textAlign: "center", lineHeight: 1.6 }}>
          画面の描画に失敗したわ。下のボタンから再試行するか、ホームに戻って。
        </p>
        {error?.digest && (
          <div
            style={{
              fontSize: 10,
              color: "#8a7560",
              fontFamily: "monospace",
              background: "#ffefd5",
              border: "1px dashed #f3e8d6",
              borderRadius: 8,
              padding: 8,
              marginBottom: 14,
              wordBreak: "break-all",
            }}
          >
            error id: {error.digest}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={reset}
            style={{
              background: "#ad001c",
              color: "#fff",
              border: "none",
              borderRadius: 14,
              padding: 14,
              fontSize: 14,
              fontWeight: 900,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ↻ もう一度試す
          </button>
          <a
            href="/"
            style={{
              display: "block",
              background: "#fff",
              color: "#ad001c",
              border: "2px solid #ad001c",
              borderRadius: 14,
              padding: 12,
              fontSize: 14,
              fontWeight: 900,
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            🏠 ホームに戻る
          </a>
        </div>
      </div>
    </div>
  );
}
