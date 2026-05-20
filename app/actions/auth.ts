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
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // After confirming, send users back to home. Supabase still routes them
      // through /auth/callback which we render as a no-op redirect handler.
      emailRedirectTo: undefined,
    },
  });
  if (error) return { error: error.message };

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
