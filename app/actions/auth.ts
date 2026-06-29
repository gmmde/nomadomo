"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from "@/app/lib/legal";

// errorCode = i18n key (client 側で t() で翻訳する); error = フォールバック生メッセージ
export type AuthState =
  | { error?: string; errorCode?: string; checkEmail?: boolean; email?: string }
  | undefined;

function validate(email: string, password: string): string | null {
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return "auth_err_email";
  if (password.length < 8) return "auth_err_password_short";
  return null;
}

// 生年月日 (YYYY-MM-DD) から満年齢を算出。無効なら null。
function ageFromDob(dob: string): number | null {
  const d = new Date(dob + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

// service-role でRLSをバイパスして user_settings に記録する管理クライアント。
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createAdmin(url, key, { auth: { persistSession: false } });
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const dob = String(formData.get("dob") ?? "").trim();
  const err = validate(email, password);
  if (err) return { errorCode: err };

  // 年齢確認: 生年月日必須 + 18歳以上のみ登録可
  if (!dob) return { errorCode: "auth_err_dob_required" };
  const age = ageFromDob(dob);
  if (age == null) return { errorCode: "auth_err_dob_required" };
  if (age < 18) return { errorCode: "auth_err_under_18" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: undefined },
  });
  if (error) return { error: error.message };

  // Supabase は既に登録済みのメアドで signUp された場合、
  // 偽の user オブジェクト (identities=[]) を返す。ここで検知してログイン誘導
  if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
    return { errorCode: "auth_err_already_registered" };
  }

  // 生年月日と規約同意の時刻を user_settings に記録（証跡）。
  // メール確認待ちでも data.user.id は発行されるため、service-role で upsert。
  if (data?.user?.id) {
    try {
      await adminClient()
        .from("user_settings")
        .upsert(
          {
            user_id: data.user.id,
            date_of_birth: dob,
            terms_agreed_at: new Date().toISOString(),
            terms_version: CURRENT_TERMS_VERSION,
            privacy_version: CURRENT_PRIVACY_VERSION,
            age_confirmed_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
    } catch {
      // 記録失敗してもサインアップ自体は継続（証跡は後続フローでも補完可能）
    }
  }

  // session が無い = メール確認待ち
  if (!data?.session) {
    return { checkEmail: true, email };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signin(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const err = validate(email, password);
  if (err) return { errorCode: err };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
