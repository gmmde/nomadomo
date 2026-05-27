import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import GuideForm from "./guide-form";

export const metadata = { title: "ガイド登録 - NomaDomo" };

export default async function NewGuidePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/guides/new");

  const { data: existing } = await supabase
    .from("guides")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) redirect(`/guides/${existing.id}/edit`);

  return <GuideForm userEmail={user.email ?? ""} />;
}
