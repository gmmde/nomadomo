import { NextRequest } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { stripe } from "@/app/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "not authenticated" }, { status: 401 });

  // Find the guide row for this user
  const { data: guide } = await supabase
    .from("guides")
    .select("id, stripe_account_id, stripe_onboarded")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!guide) return Response.json({ error: "guide profile required" }, { status: 400 });

  try {
    let accountId = guide.stripe_account_id as string | null;
    // 1. Create Express account if not yet created
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "JP",
        email: user.email ?? undefined,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        business_type: "individual",
        metadata: { user_id: user.id, guide_id: String(guide.id) },
      });
      accountId = account.id;
      await supabase.from("guides").update({ stripe_account_id: accountId }).eq("id", guide.id);
    }

    // 2. Generate onboarding link
    const origin = req.nextUrl.origin;
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/api/stripe/onboard?refresh=1`,
      return_url: `${origin}/api/stripe/return`,
      type: "account_onboarding",
    });

    return Response.json({ url: link.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe onboarding failed";
    console.error("[stripe/onboard] error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
