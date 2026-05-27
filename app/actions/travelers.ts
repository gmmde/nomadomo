"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";

const STORAGE_BUCKET = "guide-images"; // 旅行者画像も同じバケットを使う（user_id フォルダで分離）

export type TravelerFormErrors = Partial<
  Record<"name" | "country" | "interests" | "bio" | "nationality" | "occupation" | "trip_period", string>
>;

export type TravelerFormState =
  | { errors?: TravelerFormErrors; error?: string }
  | undefined;

function parseTravelerFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const interests = formData.getAll("interests").map(String).filter(Boolean);
  const image_paths = formData
    .getAll("image_paths")
    .map(String)
    .filter(Boolean)
    .slice(0, 8);
  const avatar_path = String(formData.get("avatar_path") ?? "").trim() || null;
  const emoji = String(formData.get("emoji") ?? "").trim() || null;
  const genderRaw = String(formData.get("gender") ?? "").trim();
  const gender = genderRaw && ["male", "female", "non-binary", "other"].includes(genderRaw) ? genderRaw : null;
  const gender_other = String(formData.get("gender_other") ?? "").trim().slice(0, 40) || null;
  const birthYearRaw = String(formData.get("birth_year") ?? "").trim();
  const birthYearN = Number(birthYearRaw);
  const currentYear = new Date().getFullYear();
  const birth_year = birthYearRaw && Number.isFinite(birthYearN) && birthYearN >= 1900 && birthYearN <= currentYear ? Math.round(birthYearN) : null;
  const nationality = String(formData.get("nationality") ?? "").trim().slice(0, 80) || null;
  const occupation = String(formData.get("occupation") ?? "").trim().slice(0, 80) || null;
  const hobbies = formData.getAll("hobbies").map(String).map((s) => s.trim()).filter(Boolean).slice(0, 20);
  const available_slots = formData.getAll("available_slots").map(String).filter(Boolean).slice(0, 30);
  const languages = formData.getAll("languages").map(String).filter(Boolean);
  const trip_period = String(formData.get("trip_period") ?? "").trim().slice(0, 100) || null;

  const errors: TravelerFormErrors = {};
  if (name.length < 2) errors.name = "名前は2文字以上にして";
  if (country.length < 2) errors.country = "出身国を入力して";
  if (interests.length === 0) errors.interests = "興味を1つ以上選んで";
  if (bio.length > 2000) errors.bio = "自己紹介は2000文字以内で";

  return { fields: { name, country, interests, bio: bio || null, image_paths, avatar_path, emoji, gender, gender_other, birth_year, nationality, occupation, hobbies, available_slots, languages, trip_period }, errors };
}

async function removeOwnedStorageObjects(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  paths: string[],
) {
  const owned = paths.filter((p) => p.startsWith(`${userId}/`));
  if (owned.length === 0) return;
  await supabase.storage.from(STORAGE_BUCKET).remove(owned);
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

  // 旧 image_paths を取得して差分削除
  const { data: existing } = await supabase
    .from("travelers")
    .select("image_paths")
    .eq("user_id", user.id)
    .maybeSingle();
  const oldPaths = (existing?.image_paths as string[] | null) ?? [];
  const dropped = oldPaths.filter((p) => !fields.image_paths.includes(p));

  const { error } = await supabase
    .from("travelers")
    .update(fields)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  if (dropped.length > 0) {
    await removeOwnedStorageObjects(supabase, user.id, dropped);
  }

  revalidatePath("/");
  redirect("/");
}

export async function deleteTraveler(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 画像を取得してから削除
  const { data: existing } = await supabase
    .from("travelers")
    .select("image_paths")
    .eq("user_id", user.id)
    .maybeSingle();

  await supabase.from("travelers").delete().eq("user_id", user.id);

  const paths = (existing?.image_paths as string[] | null) ?? [];
  if (paths.length > 0) {
    await removeOwnedStorageObjects(supabase, user.id, paths);
  }

  revalidatePath("/");
  redirect("/");
}
