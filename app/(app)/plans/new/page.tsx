import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewPlanForm } from "./NewPlanForm";

export default async function NewPlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile as { role?: string } | null)?.role ?? "athlete";

  let athletes: { id: string; full_name: string }[] = [];
  if (role === "trainer") {
    const { data: ta } = await supabase
      .from("trainer_athletes")
      .select("athlete_id")
      .eq("trainer_id", user.id);
    const ids = (ta ?? []).map((r) => (r as { athlete_id: string }).athlete_id);
    if (ids.length > 0) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", ids);
      athletes = (p ?? []).map((x) => ({
        id: (x as { id: string }).id,
        full_name: (x as { full_name: string }).full_name,
      }));
    }
  }

  const { data: exercises } = await supabase.from("exercises").select("*");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">New Plan</h1>
      <NewPlanForm
        athletes={athletes}
        exercises={exercises ?? []}
      />
    </div>
  );
}
