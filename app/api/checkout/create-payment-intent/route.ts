import { NextRequest } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { stripe, commissionYen } from "@/app/lib/stripe";

export const runtime = "nodejs";

type Body = {
  guide_id: number;
  hours: number; // 1〜7 (days actually)
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "not authenticated" }, { status: 401 });

  let body: Body;
  try { body = await req.json() as Body; } catch { return Response.json({ error: "invalid json" }, { status: 400 }); }
  const { guide_id, hours } = body;
  if (!Number.isFinite(guide_id) || guide_id <= 0) return Response.json({ error: "bad guide_id" }, { status: 400 });
  if (!Number.isFinite(hours) || hours < 1 || hours > 7) return Response.json({ error: "bad hours (1-7)" }, { status: 400 });

  // Fetch guide for rate + stripe account
  const { data: guide } = await supabase
    .from("guides")
    .select("id, mode, rate_per_day, stripe_account_id, stripe_onboarded, user_id")
    .eq("id", guide_id)
    .maybeSingle();
  if (!guide) return Response.json({ error: "guide not found" }, { status: 404 });
  if (guide.mode !== "paid") return Response.json({ error: "guide is free (mate)" }, { status: 400 });
  if (!guide.rate_per_day) return Response.json({ error: "guide has no rate" }, { status: 400 });
  if (!guide.stripe_account_id || !guide.stripe_onboarded) {
    return Response.json({ error: "guide has not finished Stripe onboarding" }, { status: 400 });
  }
  if (guide.user_id === user.id) return Response.json({ error: "cannot book yourself" }, { status: 400 });

  const grossYen = Number(guide.rate_per_day) * hours;
  const feeYen = commissionYen(grossYen);

  const intent = await stripe.paymentIntents.create({
    amount: grossYen,
    currency: "jpy",
    capture_method: "manual",
    application_fee_amount: feeYen,
    transfer_data: {
      destination: guide.stripe_account_id as string,
    },
    metadata: {
      guide_id: String(guide.id),
      traveler_id: user.id,
      hours: String(hours),
    },
    automatic_payment_methods: { enabled: true },
  });

  return Response.json({
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    grossYen,
    feeYen,
  });
}
