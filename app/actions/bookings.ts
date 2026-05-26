"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";

export type BookingFormState =
  | { error?: string; success?: boolean }
  | undefined;

export async function createBooking(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const guideIdRaw = String(formData.get("guide_id") ?? "");
  const guideId = Number(guideIdRaw);
  if (!Number.isFinite(guideId) || guideId <= 0) return { error: "不正な guide_id" };

  const startAtRaw = String(formData.get("start_at") ?? "").trim();
  if (!startAtRaw) return { error: "開始日時を選んで" };
  const startAt = new Date(startAtRaw);
  if (isNaN(startAt.getTime())) return { error: "日時の形式がおかしいわよ" };
  if (startAt.getTime() <= Date.now()) return { error: "未来の日時にして" };

  const hoursRaw = String(formData.get("hours") ?? "");
  const hours = Number(hoursRaw);
  if (!Number.isFinite(hours) || hours < 1 || hours > 12) return { error: "時間は1〜12にして" };

  const message = String(formData.get("message") ?? "").trim();
  if (message.length > 500) return { error: "メッセージは500文字以内で" };

  // ガイドの user_id と rate_per_hour を取得
  const { data: guide, error: guideErr } = await supabase
    .from("guides")
    .select("user_id, rate_per_hour")
    .eq("id", guideId)
    .maybeSingle();
  if (guideErr) return { error: guideErr.message };
  if (!guide) return { error: "ガイドが見つからない" };
  if (!guide.user_id) return { error: "このガイドは予約不可（デモガイド）" };
  if (guide.user_id === user.id) return { error: "自分のガイドは予約できないわよ" };

  const totalYen = Number(guide.rate_per_hour) * hours;

  const { error } = await supabase.from("bookings").insert({
    traveler_id: user.id,
    guide_id: guideId,
    guide_user_id: guide.user_id,
    start_at: startAt.toISOString(),
    hours: Math.round(hours),
    total_yen: totalYen,
    message: message || null,
    status: "pending",
  });
  if (error) return { error: error.message };

  revalidatePath("/bookings");
  redirect("/bookings");
}

export async function updateBookingStatus(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const idRaw = String(formData.get("id") ?? "");
  const id = Number(idRaw);
  const next = String(formData.get("next_status") ?? "");
  const validNext = ["accepted", "declined", "cancelled", "completed"];
  if (!Number.isFinite(id) || !validNext.includes(next)) return;

  // 既存予約を取得して当事者/遷移チェック
  const { data: b } = await supabase
    .from("bookings")
    .select("traveler_id, guide_user_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!b) return;

  const isTraveler = b.traveler_id === user.id;
  const isGuide = b.guide_user_id === user.id;
  if (!isTraveler && !isGuide) return;

  // 遷移ルール:
  //   pending → accepted/declined (guide)
  //   pending → cancelled (traveler)
  //   accepted → completed (guide) / cancelled (どちら)
  const allowed: Record<string, { traveler: string[]; guide: string[] }> = {
    pending: { traveler: ["cancelled"], guide: ["accepted", "declined"] },
    accepted: { traveler: ["cancelled"], guide: ["completed", "cancelled"] },
    declined: { traveler: [], guide: [] },
    cancelled: { traveler: [], guide: [] },
    completed: { traveler: [], guide: [] },
  };
  const allowedNext = isTraveler
    ? allowed[b.status as string].traveler
    : allowed[b.status as string].guide;
  if (!allowedNext.includes(next)) return;

  await supabase.from("bookings").update({ status: next }).eq("id", id);
  revalidatePath("/bookings");
}
