import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { PRRow } from "@/lib/progressTypes";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: workouts, error: wErr } = await supabase
      .from("workout_logs")
      .select("id, completed_at")
      .eq("athlete_id", user.id)
      .not("completed_at", "is", null);

    if (wErr) {
      return NextResponse.json({ error: wErr.message }, { status: 400 });
    }

    const workoutIds = (workouts ?? []).map((w) => w.id);
    if (workoutIds.length === 0) {
      return NextResponse.json({ prs: [] as PRRow[] });
    }

    const completedByWorkout = new Map(
      (workouts ?? []).map((w) => [w.id, w.completed_at as string])
    );

    const { data: logs, error: lErr } = await supabase
      .from("exercise_logs")
      .select("exercise_id, workout_log_id, reps, weight_lbs")
      .in("workout_log_id", workoutIds);

    if (lErr) {
      return NextResponse.json({ error: lErr.message }, { status: 400 });
    }

    type Agg = {
      bestWeight: number;
      bestWeightAt: string;
      bestReps: number;
      bestRepsAt: string;
    };

    const byExercise = new Map<string, Agg>();

    for (const row of logs ?? []) {
      const completed = completedByWorkout.get(row.workout_log_id);
      if (!completed) continue;
      const eid = row.exercise_id;
      const w = row.weight_lbs != null ? Number(row.weight_lbs) : 0;
      const r = row.reps ?? 0;

      let agg = byExercise.get(eid);
      if (!agg) {
        agg = {
          bestWeight: 0,
          bestWeightAt: completed,
          bestReps: 0,
          bestRepsAt: completed,
        };
        byExercise.set(eid, agg);
      }

      if (w > agg.bestWeight || (w === agg.bestWeight && completed > agg.bestWeightAt)) {
        agg.bestWeight = w;
        agg.bestWeightAt = completed;
      }
      if (r > agg.bestReps || (r === agg.bestReps && completed > agg.bestRepsAt)) {
        agg.bestReps = r;
        agg.bestRepsAt = completed;
      }
    }

    const exerciseIds = [...byExercise.keys()];
    if (exerciseIds.length === 0) {
      return NextResponse.json({ prs: [] as PRRow[] });
    }

    const { data: exercises, error: eErr } = await supabase
      .from("exercises")
      .select("id, name")
      .in("id", exerciseIds);

    if (eErr) {
      return NextResponse.json({ error: eErr.message }, { status: 400 });
    }

    const nameById = new Map((exercises ?? []).map((e) => [e.id, e.name]));

    const prs: PRRow[] = exerciseIds.map((exerciseId) => {
      const agg = byExercise.get(exerciseId)!;
      const achievedAt =
        agg.bestWeightAt >= agg.bestRepsAt ? agg.bestWeightAt : agg.bestRepsAt;
      return {
        exerciseId,
        exerciseName: nameById.get(exerciseId) ?? "Unknown",
        bestWeight: agg.bestWeight,
        bestReps: agg.bestReps,
        achievedAt,
        bestWeightAt: agg.bestWeightAt,
        bestRepsAt: agg.bestRepsAt,
      };
    });

    prs.sort((a, b) => {
      const ma = a.bestWeightAt >= a.bestRepsAt ? a.bestWeightAt : a.bestRepsAt;
      const mb = b.bestWeightAt >= b.bestRepsAt ? b.bestWeightAt : b.bestRepsAt;
      return mb.localeCompare(ma);
    });

    return NextResponse.json({ prs });
  } catch {
    return NextResponse.json({ error: "Failed to load PRs" }, { status: 500 });
  }
}
