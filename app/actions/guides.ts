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
    | "rate_per_hour"
    | "tags"
    | "languages",
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
  const rateRaw = String(formData.get("rate_per_hour") ?? "").trim();
  const rate = Number(rateRaw);
  const tags = formData.getAll("tags").map(String).filter(Boolean);
  const languages = formData.getAll("languages").map(String).filter(Boolean);
  const image_paths = formData
    .getAll("image_paths")
    .map(String)
    .filter(Boolean)
    .slice(0, 8); // 最大8枚

  const errors: GuideFormErrors = {};
  if (name.length < 2) errors.name = "名前は2文字以上にして";
  if (university.length < 2) errors.university = "大学名を入れて";
  if (bio.length < 10) errors.bio = "自己紹介は10文字以上書いてちょうだい";
  if (!rateRaw || !Number.isFinite(rate) || rate <= 0)
    errors.rate_per_hour = "料金は正の数値で";
  if (tags.length === 0) errors.tags = "タグを1つ以上選んで";
  if (languages.length === 0) errors.languages = "言語を1つ以上選んで";

  return {
    fields: {
      name,
      university,
      bio,
      emoji,
      rate_per_hour: Math.round(rate),
      tags,
      languages,
      image_paths,
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
