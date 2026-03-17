import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { PlanDetailClient } from "./PlanDetailClient";

export default async function PlanDetailPage({
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

  if (!plan) notFound();

  const { data: planEx } = await supabase
    .from("workout_plan_exercises")
    .select("id, exercise_id, order_index, prescribed_sets, prescribed_reps, prescribed_weight_lbs, prescribed_duration_seconds, notes")
    .eq("plan_id", planId)
    .order("order_index");

  const exerciseIds = [
    ...new Set(
      (planEx ?? []).map((pe) => (pe as { exercise_id: string }).exercise_id)
    ),
  ];
  const { data: exData } =
    exerciseIds.length > 0
      ? await supabase.from("exercises").select("id, name, category").in("id", exerciseIds)
      : { data: [] };
  const exMap = new Map((exData ?? []).map((e) => [(e as { id: string }).id, e]));

  const plan_exercises = (planEx ?? []).map((pe) => {
    const row = pe as {
      id: string;
      exercise_id: string;
      order_index: number;
      prescribed_sets: number | null;
      prescribed_reps: number | null;
      prescribed_weight_lbs: number | null;
      prescribed_duration_seconds: number | null;
      notes: string | null;
    };
    return {
      ...row,
      exercise: exMap.get(row.exercise_id) ?? null,
    };
  });

  const athleteName =
    (plan as { athlete_id: string | null }).athlete_id
      ? (
          await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", (plan as { athlete_id: string }).athlete_id)
            .single()
        ).data?.full_name ?? null
      : null;

  const planData = {
    ...plan,
    athlete_name: athleteName,
    plan_exercises,
  };

  return (
    <PlanDetailClient
      plan={planData}
      currentUserId={user.id}
    />
  );
}
