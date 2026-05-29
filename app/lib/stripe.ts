import Stripe from "stripe";

// Server-side Stripe client. Use only in server actions / API routes.
const secret = process.env.STRIPE_SECRET_KEY;

if (!secret && process.env.NODE_ENV === "production") {
  console.error("[stripe] STRIPE_SECRET_KEY env var is missing.");
}

export const stripe = new Stripe(secret ?? "sk_test_placeholder_replace_me", {
  // 最新の Stripe SDK は apiVersion を automatic にしておく
  apiVersion: "2026-05-27.dahlia",
  typescript: true,
});

// プラットフォーム手数料 = 10%
export const PLATFORM_FEE_BPS = 1000; // basis points (10%)

export function commissionYen(grossYen: number): number {
  return Math.floor((grossYen * PLATFORM_FEE_BPS) / 10000);
}
