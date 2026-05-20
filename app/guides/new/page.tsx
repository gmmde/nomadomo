import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import GuideForm from "./guide-form";

export const metadata = {
  title: "ガイド登録 - NomaDomo",
};

export default async function NewGuidePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/guides/new");
  }

  return <GuideForm userEmail={user.email ?? ""} />;
}
