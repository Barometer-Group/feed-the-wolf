import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
      return NextResponse.json({ exercises: [] as { id: string; name: string; lastLoggedAt: string }[] });
    }

    const { data: logs, error: lErr } = await supabase
      .from("exercise_logs")
      .select("exercise_id, workout_log_id")
      .in("workout_log_id", workoutIds);

    if (lErr) {
      return NextResponse.json({ error: lErr.message }, { status: 400 });
    }

    const completedByWorkout = new Map(
      (workouts ?? []).map((w) => [w.id, w.completed_at as string])
    );

    const byExercise = new Map<string, string>();
    for (const row of logs ?? []) {
      const wid = row.workout_log_id;
      const completed = completedByWorkout.get(wid);
      if (!completed) continue;
      const prev = byExercise.get(row.exercise_id);
      if (!prev || completed > prev) {
        byExercise.set(row.exercise_id, completed);
      }
    }

    const exerciseIds = [...byExercise.keys()];
    if (exerciseIds.length === 0) {
      return NextResponse.json({ exercises: [] });
    }

    const { data: exercises, error: eErr } = await supabase
      .from("exercises")
      .select("id, name")
      .in("id", exerciseIds);

    if (eErr) {
      return NextResponse.json({ error: eErr.message }, { status: 400 });
    }

    const list = (exercises ?? [])
      .map((e) => ({
        id: e.id,
        name: e.name,
        lastLoggedAt: byExercise.get(e.id) ?? "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ exercises: list });
  } catch {
    return NextResponse.json({ error: "Failed to load exercises" }, { status: 500 });
  }
}
