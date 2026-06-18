"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";

const STORAGE_BUCKET = "guide-images";

export type GuideFormErrors = Partial<
  Record<
    | "name"
    | "university"
    | "bio"
    | "emoji"
    | "rate_per_day"
    | "mode"
    | "tags"
    | "languages"
    | "gender"
    | "birth_year"
    | "areas"
    | "nationality"
    | "occupation"
    | "hobbies",
    string
  >
>;

export type GuideFormState =
  | { errors?: GuideFormErrors; error?: string }
  | undefined;

function parseGuideFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const university = String(formData.get("university") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim() || "🧑";
  const modeRaw = String(formData.get("mode") ?? "free").trim();
  const mode = (["free", "paid"].includes(modeRaw) ? modeRaw : "free") as "free" | "paid";
  const rateRaw = String(formData.get("rate_per_day") ?? "").trim();
  const rate = Number(rateRaw);
  const tags = formData.getAll("tags").map(String).filter(Boolean);
  const languages = formData.getAll("languages").map(String).filter(Boolean);
  const avatar_path = String(formData.get("avatar_path") ?? "").trim() || null;
  const areas = formData.getAll("areas").map(String).filter(Boolean);
  const nationality = String(formData.get("nationality") ?? "").trim().slice(0, 80) || null;
  const occupation = String(formData.get("occupation") ?? "").trim().slice(0, 80) || null;
  const gender_other = String(formData.get("gender_other") ?? "").trim().slice(0, 40) || null;
  const hobbies = formData.getAll("hobbies").map(String).map((s) => s.trim()).filter(Boolean).slice(0, 20);
  const available_slots = formData.getAll("available_slots").map(String).filter(Boolean).slice(0, 30);
  const image_paths = formData
    .getAll("image_paths")
    .map(String)
    .filter(Boolean)
    .slice(0, 8);
  const genderRaw = String(formData.get("gender") ?? "").trim();
  const gender =
    genderRaw && ["male", "female", "non-binary", "other"].includes(genderRaw)
      ? genderRaw
      : null;
  const birthYearRaw = String(formData.get("birth_year") ?? "").trim();
  const birthYearN = Number(birthYearRaw);
  const currentYear = new Date().getFullYear();
  const birth_year =
    birthYearRaw && Number.isFinite(birthYearN) && birthYearN >= 1900 && birthYearN <= currentYear
      ? Math.round(birthYearN)
      : null;

  const errors: GuideFormErrors = {};
  if (name.length < 2) errors.name = "名前は2文字以上にして";

  if (bio.length < 10) errors.bio = "自己紹介は10文字以上書いてちょうだい";
  if (mode !== "free") {
    if (!rateRaw || !Number.isFinite(rate) || rate <= 0)
      errors.rate_per_day = "料金は正の数値で (1日あたり)";
  }
  if (tags.length === 0) errors.tags = "タグを1つ以上選んで";
  if (languages.length === 0) errors.languages = "言語を1つ以上選んで";
  if (birthYearRaw && !birth_year) errors.birth_year = "西暦 (例: 2002) で";
  if (areas.length === 0) errors.areas = "活動域を1つ以上選んで";

  return {
    fields: {
      name,
      university,
      bio,
      emoji,
      rate_per_day: mode === "free" ? null : Math.round(rate),
      mode,
      tags,
      languages,
      image_paths,
      gender,
      birth_year,
      avatar_path,
      areas,
      nationality,
      occupation,
      gender_other,
      hobbies,
      available_slots,
    },
    errors,
  };
}

// 指定 user の所有フォルダ配下のパスだけ抽出して storage から消す
async function removeOwnedStorageObjects(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  paths: string[],
) {
  const owned = paths.filter((p) => p.startsWith(`${userId}/`));
  if (owned.length === 0) return;
  // 存在しないオブジェクトは無視されるので安全
  await supabase.storage.from(STORAGE_BUCKET).remove(owned);
}

export async function createGuide(
  _prev: GuideFormState,
  formData: FormData,
): Promise<GuideFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/guides/new");

  // display_name (user_settings) を最優先で formData.name に注入
  // (フォームの name 入力が disabled だと空で送られるためバリデーション前に補う必要がある)
  {
    const { data: us } = await supabase
      .from("user_settings")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle();
    const dn = ((us?.display_name as string | undefined) ?? "").trim();
    if (dn) formData.set("name", dn);
  }

  const { fields, errors } = parseGuideFields(formData);
  if (Object.keys(errors).length > 0) return { errors };

  const { error } = await supabase.from("guides").insert({
    user_id: user.id,
    ...fields,
    rating: 0,
    tour_count: 0,
  });
  if (error) {
    if (error.code === "23505") {
      return { error: "既にガイドプロファイルがあるわよ（1ユーザー1つだけ）" };
    }
    return { error: error.message };
  }

  revalidatePath("/");
  redirect("/");
}

export async function updateGuide(
  _prev: GuideFormState,
  formData: FormData,
): Promise<GuideFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const idRaw = String(formData.get("id") ?? "");
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) return { error: "不正なID" };

  // display_name (user_settings) を最優先で formData.name に注入
  // (フォームの name 入力が disabled だと空で送られるためバリデーション前に補う必要がある)
  {
    const { data: us } = await supabase
      .from("user_settings")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle();
    const dn = ((us?.display_name as string | undefined) ?? "").trim();
    if (dn) formData.set("name", dn);
  }

  const { fields, errors } = parseGuideFields(formData);
  if (Object.keys(errors).length > 0) return { errors };

  // 旧 image_paths を取得して、差分を Storage から削除
  const { data: existing, error: selErr } = await supabase
    .from("guides")
    .select("image_paths, user_id")
    .eq("id", id)
    .maybeSingle();
  if (selErr) return { error: selErr.message };
  if (!existing) return { error: "ガイドが見つからない" };
  if (existing.user_id !== user.id) return { error: "編集権限がないわよ" };

  const oldPaths = (existing.image_paths as string[] | null) ?? [];
  const newPaths = fields.image_paths;
  const dropped = oldPaths.filter((p) => !newPaths.includes(p));

  const { error } = await supabase
    .from("guides")
    .update(fields)
    .eq("id", id);
  if (error) return { error: error.message };

  // DB 更新成功後にオーファン削除（失敗してもユーザーには見えない）
  if (dropped.length > 0) {
    await removeOwnedStorageObjects(supabase, user.id, dropped);
  }

  revalidatePath("/");
  redirect("/");
}

export async function deleteGuide(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const idRaw = String(formData.get("id") ?? "");
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) return;

  // 削除前に画像パスを掴んでおく
  const { data: existing } = await supabase
    .from("guides")
    .select("image_paths, user_id")
    .eq("id", id)
    .maybeSingle();

  // RLS が user_id 一致を保証するけど、ストレージ消す前に念のため
  if (!existing || existing.user_id !== user.id) {
    return;
  }

  const { error } = await supabase.from("guides").delete().eq("id", id);
  if (error) return;

  const paths = (existing.image_paths as string[] | null) ?? [];
  if (paths.length > 0) {
    await removeOwnedStorageObjects(supabase, user.id, paths);
  }

  revalidatePath("/");
  redirect("/");
}

/**
 * 自分のガイドプロファイルを一時休業 (paused) toggle する。
 * paused=true: ホーム/検索一覧から非表示、プロフィールに「お休み中」banner
 * paused=false: 通常表示
 */
export async function setGuidePaused(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const guideIdRaw = String(formData.get("guide_id") ?? "");
  const guideId = Number(guideIdRaw);
  const paused = String(formData.get("paused") ?? "") === "true";
  if (!Number.isFinite(guideId) || guideId <= 0) return { error: "bad guide_id" };

  const { error } = await supabase
    .from("guides")
    .update({ paused })
    .eq("id", guideId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath(`/guides/${guideId}/edit`);
  return { success: true };
}

