"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";

// errorCode = i18n key (client 側で t() で翻訳する); error = フォールバック生メッセージ
export type AuthState =
  | { error?: string; errorCode?: string; checkEmail?: boolean; email?: string }
  | undefined;

function validate(email: string, password: string): string | null {
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return "auth_err_email";
  if (password.length < 8) return "auth_err_password_short";
  return null;
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const err = validate(email, password);
  if (err) return { errorCode: err };

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
