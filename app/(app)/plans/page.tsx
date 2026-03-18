import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PlansListClient } from "./PlansListClient";

export default async function PlansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: plans } = await supabase
    .from("workout_plans")
    .select("id, name, description, scheduled_date, is_template, created_by, athlete_id")
    .or(`created_by.eq.${user.id},athlete_id.eq.${user.id}`)
    .order("scheduled_date", { ascending: true, nullsFirst: false });

  const athleteIds = [
    ...new Set(
      (plans ?? [])
        .map((p) => (p as { athlete_id: string | null }).athlete_id)
        .filter(Boolean) as string[]
    ),
  ];
  const { data: profiles } =
    athleteIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", athleteIds)
      : { data: [] };
  const nameByAthlete = new Map(
    (profiles ?? []).map((p) => [
      (p as { id: string; full_name: string }).id,
      (p as { id: string; full_name: string }).full_name,
    ])
  );

  const planIds = (plans ?? []).map((p) => (p as { id: string }).id);
  const { data: counts } =
    planIds.length > 0
      ? await supabase.from("workout_plan_exercises").select("plan_id").in("plan_id", planIds)
      : { data: [] as { plan_id: string }[] };

  const countByPlan = (counts ?? []).reduce(
    (acc, row) => {
      acc[row.plan_id] = (acc[row.plan_id] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const plansWithMeta = (plans ?? []).map((p) => {
    const plan = p as {
      id: string;
      name: string;
      scheduled_date: string | null;
      is_template: boolean;
      created_by: string;
      athlete_id: string | null;
    };
    return {
      ...plan,
      athlete_name: plan.athlete_id ? nameByAthlete.get(plan.athlete_id) ?? null : null,
      exercise_count: countByPlan[plan.id] ?? 0,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workout Plans</h1>
        <Link
          href="/plans/new"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          New Plan
        </Link>
      </div>
      <PlansListClient plans={plansWithMeta} currentUserId={user.id} />
    </div>
  );
}
