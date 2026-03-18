import { createClient } from "@/lib/supabase/server";
import { FormReviewClient } from "./FormReviewClient";

export default async function MediaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let role = "athlete";
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = (data as { role?: string } | null)?.role ?? "athlete";
  }

  return <FormReviewClient role={role} />;
}
