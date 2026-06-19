"use client";

// Root-level error boundary。App Router の error.tsx で拾えない
// fatal なルートエラーを Sentry に送る + ユーザーには簡素なリロード画面。
import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ja">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", background: "#fdf6ec", color: "#1a1008", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>
          Something went wrong / 予期しないエラー
        </div>
        <div style={{ fontSize: 13, color: "#8a7560", fontWeight: 600, marginBottom: 20, lineHeight: 1.6, maxWidth: 360 }}>
          We&apos;ve been notified — please reload the page.
          <br />
          エラーは自動送信されました。ページを再読み込みしてね。
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: "14px 28px", fontSize: 14, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}
        >
          🔄 Reload / 再読込
        </button>
        {/* dev のみ Next 標準エラー画面を見せる */}
        {process.env.NODE_ENV !== "production" && (
          <div style={{ marginTop: 24, opacity: 0.4 }}>
            <NextError statusCode={0} />
          </div>
        )}
      </body>
    </html>
  );
}
