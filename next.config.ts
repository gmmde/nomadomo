import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// Sentry wrapper. SENTRY_AUTH_TOKEN は CI 環境変数に置く (Vercel)。
// 未設定なら source-map upload はスキップされてもエラーにはならない。
export default withSentryConfig(nextConfig, {
  // Sentry org / project. Vercel env vars で上書き可能。
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Source maps upload はビルド時のみ
  silent: !process.env.CI,
  // Source map 公開を防ぐ
  widenClientFileUpload: true,
  // ad-blocker 回避のためのトンネル経由送信
  tunnelRoute: "/monitoring",
  // ロガー文言の除去 (バンドル軽量化)
  disableLogger: true,
  // Vercel cron monitoring を自動でセットアップ
  automaticVercelMonitors: true,
});
