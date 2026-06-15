import { redirect, notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import CompleteForm from "./complete-form";

export const metadata = { title: "Complete meeting - NomaDomo" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CompleteMeetingPage({ params }: Props) {
  const { id: idRaw } = await params;
  const meetingId = Number(idRaw);
  if (!Number.isFinite(meetingId) || meetingId <= 0) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/meetings/${meetingId}/complete`);

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, user_a_id, user_b_id, status, started_at, completed_at")
    .eq("id", meetingId)
    .maybeSingle();
  if (!meeting) notFound();

  const peerId = meeting.user_a_id === user.id ? meeting.user_b_id : meeting.user_a_id;
  let peerName = `User ${(peerId as string).slice(0, 8)}`;
  let peerEmoji = "🧑";
  const { data: g } = await supabase
    .from("guides")
    .select("name, emoji")
    .eq("user_id", peerId)
    .maybeSingle();
  if (g) {
    peerName = (g.name as string) ?? peerName;
    peerEmoji = (g.emoji as string) ?? "🧑";
  } else {
    const { data: tv } = await supabase
      .from("travelers")
      .select("name, emoji")
      .eq("user_id", peerId)
      .maybeSingle();
    if (tv) {
      peerName = (tv.name as string) ?? peerName;
      peerEmoji = (tv.emoji as string) ?? "🧑";
    }
  }

  const { data: existingReview } = await supabase
    .from("reviews")
    .select("rating, comment")
    .eq("meeting_id", meetingId)
    .eq("reviewer_id", user.id)
    .maybeSingle();

  const { data: peerReviewRow } = await supabase
    .from("reviews")
    .select("id")
    .eq("meeting_id", meetingId)
    .eq("reviewer_id", peerId)
    .limit(1)
    .maybeSingle();

  return (
    <CompleteForm
      meetingId={meetingId}
      peerName={peerName}
      peerEmoji={peerEmoji}
      peerId={peerId as string}
      meetingStatus={meeting.status as string}
      initialRating={(existingReview?.rating as number | undefined) ?? null}
      initialComment={(existingReview?.comment as string | undefined) ?? ""}
      initialPeerReviewed={!!peerReviewRow}
    />
  );
}
