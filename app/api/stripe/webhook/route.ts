import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/app/lib/stripe";
import type Stripe from "stripe";

export const runtime = "nodejs";

// Webhook 用に service-role Supabase client が必要（RLS バイパス）
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return new Response("missing signature/secret", { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "bad signature";
    return new Response(`webhook err: ${msg}`, { status: 400 });
  }

  const sb = adminClient();

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await sb.from("bookings").update({ payment_status: "succeeded" }).eq("payment_intent_id", pi.id);
        break;
      }
      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await sb.from("bookings").update({ payment_status: "canceled" }).eq("payment_intent_id", pi.id);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await sb.from("bookings").update({ payment_status: "failed" }).eq("payment_intent_id", pi.id);
        break;
      }
      case "charge.refunded": {
        const ch = event.data.object as Stripe.Charge;
        if (ch.payment_intent) {
          await sb.from("bookings").update({ payment_status: "refunded" }).eq("payment_intent_id", ch.payment_intent as string);
        }
        break;
      }
      case "account.updated": {
        const acct = event.data.object as Stripe.Account;
        const onboarded = !!(acct.details_submitted && acct.charges_enabled);
        await sb.from("guides").update({ stripe_onboarded: onboarded }).eq("stripe_account_id", acct.id);
        break;
      }
      default:
        // ignore
        break;
    }
  } catch (e) {
    console.error("[webhook] handler error", e);
    return new Response("handler error", { status: 500 });
  }

  return new Response("ok");
}
