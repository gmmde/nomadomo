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

function parseTravelerFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const interests = formData.getAll("interests").map(String).filter(Boolean);

  const errors: TravelerFormErrors = {};
  if (name.length < 2) errors.name = "名前は2文字以上にして";
  if (country.length < 2) errors.country = "出身国を入力して";
  if (interests.length === 0) errors.interests = "興味を1つ以上選んで";

  return { fields: { name, country, interests }, errors };
}

export async function createTraveler(
  _prev: TravelerFormState,
  formData: FormData,
): Promise<TravelerFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/travelers/new");

  const { fields, errors } = parseTravelerFields(formData);
  if (Object.keys(errors).length > 0) return { errors };

  const { error } = await supabase.from("travelers").insert({
    user_id: user.id,
    ...fields,
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

export async function updateTraveler(
  _prev: TravelerFormState,
  formData: FormData,
): Promise<TravelerFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { fields, errors } = parseTravelerFields(formData);
  if (Object.keys(errors).length > 0) return { errors };

  // 1ユーザー1旅行者プロファイル(UNIQUE)なので user_id で UPDATE
  const { error } = await supabase
    .from("travelers")
    .update(fields)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/");
  redirect("/");
}

export async function deleteTraveler(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("travelers").delete().eq("user_id", user.id);

  revalidatePath("/");
  redirect("/");
}
