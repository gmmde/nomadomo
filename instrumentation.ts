import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      // 本番のみフルサンプリング、それ以外は控えめ
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      // ローカル dev ではエラー出さない (環境変数未設定もここで弾く)
      enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV !== "test",
      // 環境ラベル (dashboard で staging / production を切り分け)
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      // PII を絶対送らない
      sendDefaultPii: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV !== "test",
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      sendDefaultPii: false,
    });
  }
}

// Server-side request error capture (Next.js 16 標準フック)
export const onRequestError = Sentry.captureRequestError;
