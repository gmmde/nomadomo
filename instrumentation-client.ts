// Client-side Sentry init (Next.js 16 規約: instrumentation-client.ts)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // dev/test では送らない
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === "production",
  // 環境ラベル
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  // パフォーマンスは控えめ (課金対策)
  tracesSampleRate: 0.05,
  // Replay は OFF (個人情報リスク大なので、必要になったらレビューして有効化)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  // PII 送らない
  sendDefaultPii: false,
  // ブラウザ拡張・ad-blocker 起因のノイズを抑える
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    // よくある拡張機能起因
    "top.GLOBALS",
    "originalCreateNotification",
    "canvas.contentDocument",
    "MyApp_RemoveAllHighlights",
  ],
  denyUrls: [
    // 拡張機能
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-extension:\/\//i,
  ],
});

// Next.js Router transition の自動計測
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
