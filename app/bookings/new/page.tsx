import { redirect, notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import BookingForm from "./booking-form";

export const metadata = { title: "予約申込 - NomaDomo" };

type Props = {
  searchParams: Promise<{ guide?: string }>;
};

export default async function NewBookingPage({ searchParams }: Props) {
  const sp = await searchParams;
  const guideId = Number(sp.guide);
  if (!Number.isFinite(guideId) || guideId <= 0) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/bookings/new?guide=${guideId}`);

  const { data: guide } = await supabase
    .from("guides")
    .select("id, name, emoji, university, rate_per_hour, user_id")
    .eq("id", guideId)
    .maybeSingle();
  if (!guide) notFound();
  if (!guide.user_id) redirect("/");
  if (guide.user_id === user.id) redirect("/");

  return (
    <BookingForm
      guideId={guide.id as number}
      guideName={guide.name as string}
      guideEmoji={(guide.emoji as string) ?? "🧑"}
      guideUniversity={(guide.university as string) ?? ""}
      ratePerHour={Number(guide.rate_per_hour)}
    />
  );
}
