import { redirect, notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import RequestForm from "./request-form";

export const metadata = { title: "Message request - NomaDomo" };

type Props = { params: Promise<{ guideId: string }> };

export default async function NewChatRequestPage({ params }: Props) {
  const { guideId } = await params;
  const id = Number(guideId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/chat-request/${guideId}/new`);

  const { data: guide } = await supabase
    .from("guides")
    .select("id, name, emoji, university, user_id, mode, avatar_path")
    .eq("id", id)
    .maybeSingle();
  if (!guide) notFound();
  if (!guide.user_id) redirect("/");
  if (guide.user_id === user.id) redirect(`/?guide=${id}`);

  return (
    <RequestForm
      guideId={guide.id as number}
      guideUserId={guide.user_id as string}
      guideName={guide.name as string}
      guideEmoji={(guide.emoji as string) ?? "🧑"}
      guideUniversity={(guide.university as string) ?? ""}
      guideMode={(((guide.mode as string) === "free" ? "free" : "paid") as "free" | "paid")}
    />
  );
}
