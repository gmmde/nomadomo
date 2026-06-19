"use server";

// 同意 (利用規約・プライバシー・年齢) を user_settings に記録する。
// signup 時 + 既存ユーザの再同意フローの両方から呼ばれる。

import { createClient } from "@/app/lib/supabase/server";
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from "@/app/lib/legal";

export async function recordConsent(args: {
  age: boolean;
  terms: boolean;
  privacy: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  if (!args.age || !args.terms || !args.privacy) {
    return { ok: false, error: "all_required" };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const now = new Date().toISOString();
  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      age_confirmed_at: now,
      terms_accepted_at: now,
      terms_version: CURRENT_TERMS_VERSION,
      privacy_accepted_at: now,
      privacy_version: CURRENT_PRIVACY_VERSION,
    },
    { onConflict: "user_id" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** ログイン中ユーザーが最新版の規約に同意済みかチェック */
export async function checkConsentStatus(): Promise<{
  needsConsent: boolean;
  ageOk: boolean;
  termsOk: boolean;
  privacyOk: boolean;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { needsConsent: false, ageOk: true, termsOk: true, privacyOk: true };

  const { data } = await supabase
    .from("user_settings")
    .select("age_confirmed_at, terms_accepted_at, terms_version, privacy_accepted_at, privacy_version")
    .eq("user_id", user.id)
    .maybeSingle();

  const ageOk = !!data?.age_confirmed_at;
  const termsOk = !!data?.terms_accepted_at && data?.terms_version === CURRENT_TERMS_VERSION;
  const privacyOk = !!data?.privacy_accepted_at && data?.privacy_version === CURRENT_PRIVACY_VERSION;
  return {
    needsConsent: !(ageOk && termsOk && privacyOk),
    ageOk,
    termsOk,
    privacyOk,
  };
}
