import { redirect, notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import RequestForm from "@/app/chat-request/[guideId]/new/request-form";

export const metadata = { title: "メッセージリクエスト - NomaDomo" };

type Props = { params: Promise<{ userId: string }> };

export default async function NewChatRequestToUser({ params }: Props) {
  const { userId } = await params;
  if (!userId) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/chat-request/u/${userId}/new`);
  if (user.id === userId) redirect("/");

  // 相手は traveler or guide のどちらか
  const { data: traveler } = await supabase
    .from("travelers")
    .select("name, emoji, country")
    .eq("user_id", userId)
    .maybeSingle();
  const { data: guide } = !traveler
    ? await supabase.from("guides").select("name, emoji, university, user_id").eq("user_id", userId).maybeSingle()
    : { data: null };

  if (!traveler && !guide) notFound();

  return (
    <RequestForm
      guideId={0}
      guideUserId={userId}
      guideName={(traveler?.name as string) ?? (guide?.name as string) ?? "User"}
      guideEmoji={(traveler?.emoji as string) ?? (guide?.emoji as string) ?? "🧑"}
      guideUniversity={traveler ? `✈ From ${(traveler?.country as string) ?? ""}` : ((guide?.university as string) ?? "")}
      guideMode={"free"}
    />
  );
}
