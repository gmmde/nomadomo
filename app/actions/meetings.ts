"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";

export type MeetingActionResult =
  | { error?: string; success?: boolean }
  | undefined;

export async function proposeMeet(formData: FormData): Promise<MeetingActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const peerId = String(formData.get("peer_id") ?? "").trim();
  if (!peerId) return { error: "peer_id missing" };
  if (peerId === user.id) return { error: "Cannot meet yourself" };

  const { data: existing } = await supabase
    .from("meetings")
    .select("id, user_a_id, user_b_id, status")
    .or(`and(user_a_id.eq.${user.id},user_b_id.eq.${peerId}),and(user_a_id.eq.${peerId},user_b_id.eq.${user.id})`)
    .in("status", ["pending_a", "pending_b", "active"])
    .maybeSingle();

  if (existing) {
    if (existing.user_a_id === user.id && existing.status === "pending_b") {
      return { success: true };
    }
    if (existing.user_b_id === user.id && existing.status === "pending_b") {
      const { error: e } = await supabase
        .from("meetings")
        .update({ status: "active", started_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (e) return { error: e.message };
      revalidatePath("/");
      return { success: true };
    }
    return { success: true };
  }

  const { error } = await supabase.from("meetings").insert({
    user_a_id: user.id,
    user_b_id: peerId,
    status: "pending_b",
  });
  if (error) return { error: error.message };
  revalidatePath("/");
  return { success: true };
}

export async function completeMeet(formData: FormData): Promise<MeetingActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = Number(formData.get("meeting_id") ?? "");
  if (!Number.isFinite(id) || id <= 0) return { error: "bad meeting_id" };

  const { data: m } = await supabase
    .from("meetings")
    .select("id, user_a_id, user_b_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!m) return { error: "meeting not found" };
  if (m.status !== "active") return { error: "not active" };

  // 双方のレビュー必須
  const { data: reviews } = await supabase
    .from("reviews")
    .select("reviewer_id")
    .eq("meeting_id", id);
  const reviewerIds = new Set((reviews ?? []).map((r) => r.reviewer_id as string));
  if (!reviewerIds.has(m.user_a_id as string) || !reviewerIds.has(m.user_b_id as string)) {
    return { error: "Both parties must post a review before finishing." };
  }

  const { error } = await supabase
    .from("meetings")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath(`/meetings/${id}/complete`);
  return { success: true };
}

export async function cancelMeet(formData: FormData): Promise<MeetingActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = Number(formData.get("meeting_id") ?? "");
  if (!Number.isFinite(id) || id <= 0) return { error: "bad meeting_id" };

  const { error } = await supabase
    .from("meetings")
    .update({ status: "canceled" })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  return { success: true };
}
