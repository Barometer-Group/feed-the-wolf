import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardContent } from "./DashboardContent";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const userName = profile?.full_name ?? "User";
  const userRole = (profile?.role ?? "athlete") as "admin" | "trainer" | "athlete";

  return (
    <div className="space-y-6">
      <DashboardContent userName={userName} userRole={userRole} />
    </div>
  );
}
