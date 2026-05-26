import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import ReportForm from "./report-form";

export const metadata = { title: "通報 - NomaDomo" };

type Props = {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ message?: string }>;
};

export default async function ReportPage({ params, searchParams }: Props) {
  const { userId } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/report/${userId}`);
  if (user.id === userId) redirect("/");

  // 対象ユーザーの guides/travelers から表示名を引く（無ければ短縮 UUID）
  const { data: g } = await supabase
    .from("guides")
    .select("name, emoji")
    .eq("user_id", userId)
    .maybeSingle();
  const { data: t } = !g
    ? await supabase.from("travelers").select("name").eq("user_id", userId).maybeSingle()
    : { data: null };

  const targetName = (g?.name as string | undefined) ?? (t?.name as string | undefined) ?? `ユーザー (${userId.slice(0, 8)})`;
  const targetEmoji = (g?.emoji as string | undefined) ?? "👤";

  return (
    <ReportForm
      targetUserId={userId}
      targetName={targetName}
      targetEmoji={targetEmoji}
      targetMessageId={sp.message ?? null}
    />
  );
}
