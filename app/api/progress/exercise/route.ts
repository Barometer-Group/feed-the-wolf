import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  parseProgressRange,
  rangeStartIso,
  dateKeyUtc,
} from "@/lib/progressRange";
import type { ExerciseProgressDay } from "@/lib/progressTypes";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const exerciseId = searchParams.get("exerciseId");
    const range = parseProgressRange(searchParams.get("range"));

    if (!exerciseId) {
      return NextResponse.json(
        { error: "exerciseId is required" },
        { status: 400 }
      );
    }

    let wQuery = supabase
      .from("workout_logs")
      .select("id, completed_at")
      .eq("athlete_id", user.id)
      .not("completed_at", "is", null);

    const start = rangeStartIso(range);
    if (start) {
      wQuery = wQuery.gte("completed_at", start);
    }

    const { data: workouts, error: wErr } = await wQuery;
    if (wErr) {
      return NextResponse.json({ error: wErr.message }, { status: 400 });
    }

    const workoutIds = (workouts ?? []).map((w) => w.id);
    if (workoutIds.length === 0) {
      return NextResponse.json({ data: [] as ExerciseProgressDay[] });
    }

    const completedByWorkout = new Map(
      (workouts ?? []).map((w) => [w.id, w.completed_at as string])
    );

    const { data: logs, error: lErr } = await supabase
      .from("exercise_logs")
      .select("workout_log_id, reps, weight_lbs")
      .eq("exercise_id", exerciseId)
      .in("workout_log_id", workoutIds);

    if (lErr) {
      return NextResponse.json({ error: lErr.message }, { status: 400 });
    }

    const byDate = new Map<
      string,
      { maxW: number; reps: number; vol: number; hasWeight: boolean }
    >();

    for (const row of logs ?? []) {
      const completed = completedByWorkout.get(row.workout_log_id);
      if (!completed) continue;
      const day = dateKeyUtc(completed);
      const w = row.weight_lbs != null ? Number(row.weight_lbs) : 0;
      const r = row.reps != null ? row.reps : 0;
      let bucket = byDate.get(day);
      if (!bucket) {
        bucket = { maxW: 0, reps: 0, vol: 0, hasWeight: false };
        byDate.set(day, bucket);
      }
      if (w > 0) {
        bucket.hasWeight = true;
        bucket.maxW = Math.max(bucket.maxW, w);
        bucket.vol += w * r;
      }
      bucket.reps += r;
    }

    const data: ExerciseProgressDay[] = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, b]) => ({
        date,
        maxWeight: b.maxW,
        totalReps: b.reps,
        volume: b.vol,
      }));

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Failed to load progress" }, { status: 500 });
  }
}
