import { redirect, notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import EditTravelerForm from "./edit-form";

export const metadata = { title: "旅行者編集 - NomaDomo" };

export default async function EditTravelerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/travelers/edit");

  const { data: t } = await supabase
    .from("travelers")
    .select("name, country, interests, bio, image_paths")
    .maybeSingle();

  if (!t) notFound();

  return (
    <EditTravelerForm
      userEmail={user.email ?? ""}
      initial={{
        name: (t.name as string) ?? "",
        country: (t.country as string) ?? "",
        interests: (t.interests as string[]) ?? [],
        bio: (t.bio as string) ?? "",
        image_paths: (t.image_paths as string[]) ?? [],
      }}
    />
  );
}
