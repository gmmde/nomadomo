"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";

export type AuthState = { error?: string } | undefined;

function validate(email: string, password: string): string | null {
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return "メールアドレスが正しくないわよ";
  if (password.length < 8) return "パスワードは8文字以上にしてちょうだい";
  return null;
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const err = validate(email, password);
  if (err) return { error: err };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: undefined,
    },
  });
  if (error) return { error: error.message };

  // Supabase は既に登録済みのメアドで signUp された場合、
  // セキュリティ目的で error を返さず偽の user オブジェクト (identities=[]) を返す。
  // ここで明示的に検知してログイン誘導する。
  if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
    return {
      error: "このメールアドレスは既に登録されてるわよ。ログイン画面から入って (パスワード忘れたなら下のリンクからリセット)",
    };
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
  if (err) return { error: err };

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
