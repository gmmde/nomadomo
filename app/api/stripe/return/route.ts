import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { stripe } from "@/app/lib/stripe";

export const runtime = "nodejs";

// Stripe Connect onboarding 完了後の帰還ハンドラ
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.nextUrl.origin));

  const { data: guide } = await supabase
    .from("guides")
    .select("id, stripe_account_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (guide?.stripe_account_id) {
    // Stripe に問い合わせて onboarding 状態を確認
    try {
      const acct = await stripe.accounts.retrieve(guide.stripe_account_id as string);
      const onboarded = !!(acct.details_submitted && acct.charges_enabled);
      await supabase.from("guides").update({ stripe_onboarded: onboarded }).eq("id", guide.id);
    } catch (e) {
      console.error("[stripe return] retrieve failed", e);
    }
  }

  return NextResponse.redirect(new URL("/settings?stripe=done", req.nextUrl.origin));
}
