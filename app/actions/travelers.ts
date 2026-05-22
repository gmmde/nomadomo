"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";

export type TravelerFormErrors = Partial<
  Record<"name" | "country" | "interests", string>
>;

export type TravelerFormState =
  | { errors?: TravelerFormErrors; error?: string }
  | undefined;

export async function createTraveler(
  _prev: TravelerFormState,
  formData: FormData,
): Promise<TravelerFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/travelers/new");

  const name = String(formData.get("name") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const interests = formData.getAll("interests").map(String).filter(Boolean);

  const errors: TravelerFormErrors = {};
  if (name.length < 2) errors.name = "名前は2文字以上にして";
  if (country.length < 2) errors.country = "出身国を入力して";
  if (interests.length === 0) errors.interests = "興味を1つ以上選んで";
  if (Object.keys(errors).length > 0) return { errors };

  const { error } = await supabase.from("travelers").insert({
    user_id: user.id,
    name,
    country,
    interests,
  });
  if (error) {
    if (error.code === "23505") {
      return { error: "既に旅行者プロファイルがあるわよ（1ユーザー1つだけ）" };
    }
    return { error: error.message };
  }

  revalidatePath("/");
  redirect("/");
}
