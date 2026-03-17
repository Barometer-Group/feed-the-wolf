import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { EditPlanForm } from "./EditPlanForm";

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: plan } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (!plan || (plan as { created_by: string }).created_by !== user.id) {
    notFound();
  }

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

  const { data: planEx } = await supabase
    .from("workout_plan_exercises")
    .select("exercise_id, order_index, prescribed_sets, prescribed_reps, prescribed_weight_lbs, prescribed_duration_seconds, notes")
    .eq("plan_id", planId)
    .order("order_index");

  const exerciseIds = (planEx ?? []).map((pe) => (pe as { exercise_id: string }).exercise_id);
  const { data: exData } =
    exerciseIds.length > 0
      ? await supabase.from("exercises").select("id, name, category").in("id", exerciseIds)
      : { data: [] };
  const exMap = new Map((exData ?? []).map((e) => [(e as { id: string }).id, e]));

  const plan_exercises = (planEx ?? []).map((pe) => {
    const row = pe as {
      exercise_id: string;
      order_index: number;
      prescribed_sets: number | null;
      prescribed_reps: number | null;
      prescribed_weight_lbs: number | null;
      prescribed_duration_seconds: number | null;
      notes: string | null;
    };
    const ex = exMap.get(row.exercise_id);
    return {
      exercise: ex ?? { id: row.exercise_id, name: "Unknown", category: "strength" as const },
      prescribed_sets: row.prescribed_sets,
      prescribed_reps: row.prescribed_reps,
      prescribed_weight_lbs: row.prescribed_weight_lbs,
      prescribed_duration_seconds: row.prescribed_duration_seconds,
      notes: row.notes,
    };
  });

  const { data: exercises } = await supabase.from("exercises").select("*");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Edit Plan</h1>
      <EditPlanForm
        planId={planId}
        initialData={{
          name: (plan as { name: string }).name,
          description: (plan as { description: string | null }).description ?? "",
          scheduled_date: (plan as { scheduled_date: string | null }).scheduled_date ?? "",
          is_template: (plan as { is_template: boolean }).is_template,
          athlete_id: (plan as { athlete_id: string | null }).athlete_id ?? "",
          plan_exercises,
        }}
        athletes={athletes}
        exercises={exercises ?? []}
      />
    </div>
  );
}
