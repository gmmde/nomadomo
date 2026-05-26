"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";

export type ReportFormState =
  | { error?: string; success?: boolean }
  | undefined;

export async function submitReport(
  _prev: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const targetUserId = String(formData.get("target_user_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const targetMessageIdRaw = String(formData.get("target_message_id") ?? "").trim();

  if (!targetUserId) return { error: "対象ユーザー ID が無いわよ" };
  if (targetUserId === user.id) return { error: "自分は通報できないわ" };
  if (reason.length < 5) return { error: "理由を5文字以上書いて" };
  if (reason.length > 500) return { error: "理由は500文字以内で" };

  const insert: Record<string, unknown> = {
    reporter_id: user.id,
    target_user_id: targetUserId,
    reason,
  };
  if (targetMessageIdRaw) {
    const n = Number(targetMessageIdRaw);
    if (Number.isFinite(n) && n > 0) insert.target_message_id = n;
  }

  const { error } = await supabase.from("reports").insert(insert);
  if (error) return { error: error.message };

  return { success: true };
}
