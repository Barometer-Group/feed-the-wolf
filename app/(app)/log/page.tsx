import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StartWorkoutClient } from "./StartWorkoutClient";

export default async function LogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: recent } = await supabase
    .from("workout_logs")
    .select("id, started_at, completed_at")
    .eq("athlete_id", user.id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(5);

  const { data: exerciseLogs } = recent?.length
    ? await supabase
        .from("exercise_logs")
        .select("workout_log_id, exercise_id, reps, weight_lbs")
        .in(
          "workout_log_id",
          (recent ?? []).map((w) => w.id)
        )
    : { data: [] };

  const metaByWorkout = (exerciseLogs ?? []).reduce(
    (acc, row) => {
      if (!acc[row.workout_log_id]) {
        acc[row.workout_log_id] = { exerciseIds: new Set<string>(), volume: 0 };
      }
      acc[row.workout_log_id].exerciseIds.add(row.exercise_id);
      const reps = row.reps ?? 0;
      const weight = row.weight_lbs ? Number(row.weight_lbs) : 0;
      acc[row.workout_log_id].volume += reps * weight;
      return acc;
    },
    {} as Record<string, { exerciseIds: Set<string>; volume: number }>
  );

  const recentWithMeta = (recent ?? []).map((w) => {
    const start = new Date(w.started_at);
    const end = w.completed_at ? new Date(w.completed_at) : null;
    const durationMs = end ? end.getTime() - start.getTime() : 0;
    const durationMins = Math.round(durationMs / 60000);
    const meta = metaByWorkout[w.id];
    return {
      id: w.id,
      date: start.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      duration: durationMins,
      exerciseCount: meta?.exerciseIds.size ?? 0,
      totalVolume: meta?.volume ?? 0,
    };
  });

  const { data: assignedPlansRaw } = await supabase
    .from("workout_plans")
    .select("id, name, scheduled_date")
    .eq("athlete_id", user.id);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const assignedPlans = (assignedPlansRaw ?? []).filter((p) => {
    const sd = (p as { scheduled_date: string | null }).scheduled_date;
    if (!sd) return true;
    return new Date(sd) >= startOfToday;
  });
  assignedPlans.sort((a, b) => {
    const sa = (a as { scheduled_date: string | null }).scheduled_date;
    const sb = (b as { scheduled_date: string | null }).scheduled_date;
    if (!sa && !sb) return 0;
    if (!sa) return 1;
    if (!sb) return -1;
    return new Date(sa).getTime() - new Date(sb).getTime();
  });

  const assignedIds = assignedPlans.map((p) => p.id);
  const { data: planCounts } =
    assignedIds.length > 0
      ? await supabase
          .from("workout_plan_exercises")
          .select("plan_id")
          .in("plan_id", assignedIds)
      : { data: [] as { plan_id: string }[] };
  const countByPlan = (planCounts ?? []).reduce(
    (acc, row) => {
      acc[row.plan_id] = (acc[row.plan_id] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const assignedWithMeta = assignedPlans.map((p) => ({
    id: p.id,
    name: p.name,
    scheduled_date: (p as { scheduled_date: string | null }).scheduled_date,
    exercise_count: countByPlan[p.id] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Log Workout</h1>
      <StartWorkoutClient
        athleteId={user.id}
        recentWorkouts={recentWithMeta}
        assignedPlans={assignedWithMeta}
      />
    </div>
  );
}
