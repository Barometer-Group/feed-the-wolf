import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { parseProgressRange, rangeStartIso, dateKeyUtc } from "@/lib/progressRange";

export interface CategoryRepsDay {
  date: string;
  upperReps: number;
  lowerReps: number;
  coreReps: number;
}

export interface CategoryRepsResponse {
  data: CategoryRepsDay[];
  longestStreak: number;
  currentStreak: number;
}

function calcStreaks(sortedDates: string[]): { longest: number; current: number } {
  if (sortedDates.length === 0) return { longest: 0, current: 0 };

  let longest = 1;
  let run = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]).getTime();
    const curr = new Date(sortedDates[i]).getTime();
    const daysDiff = Math.round((curr - prev) / 86_400_000);
    if (daysDiff === 1) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  // Current streak: does the last workout date touch today or yesterday?
  const last = new Date(sortedDates[sortedDates.length - 1]);
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const daysSinceLast = Math.round(
    (todayUtc.getTime() - last.getTime()) / 86_400_000
  );

  let current = 0;
  if (daysSinceLast <= 1) {
    current = 1;
    for (let i = sortedDates.length - 2; i >= 0; i--) {
      const a = new Date(sortedDates[i]).getTime();
      const b = new Date(sortedDates[i + 1]).getTime();
      if (Math.round((b - a) / 86_400_000) === 1) current++;
      else break;
    }
  }

  return { longest, current };
}

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

    const range = parseProgressRange(
      new URL(request.url).searchParams.get("range")
    );
    const start = rangeStartIso(range);

    // ── 1. Workouts for the chart (range-filtered) ─────────────────────────
    let wQuery = supabase
      .from("workout_logs")
      .select("id, completed_at")
      .eq("athlete_id", user.id)
      .not("completed_at", "is", null);
    if (start) wQuery = wQuery.gte("completed_at", start);
    const { data: rangeWorkouts, error: wErr } = await wQuery;
    if (wErr) return NextResponse.json({ error: wErr.message }, { status: 400 });

    // ── 2. All workout dates for streak (no range filter) ──────────────────
    const { data: allWorkouts } = await supabase
      .from("workout_logs")
      .select("completed_at")
      .eq("athlete_id", user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: true });

    const allDates = [
      ...new Set(
        (allWorkouts ?? []).map((w) => dateKeyUtc(w.completed_at as string))
      ),
    ].sort();

    const { longest, current } = calcStreaks(allDates);

    // ── 3. Exercise logs joined with body_region ───────────────────────────
    const workoutIds = (rangeWorkouts ?? []).map((w) => w.id);
    if (workoutIds.length === 0) {
      return NextResponse.json({
        data: [],
        longestStreak: longest,
        currentStreak: current,
      } satisfies CategoryRepsResponse);
    }

    const completedByWorkout = new Map(
      (rangeWorkouts ?? []).map((w) => [w.id, w.completed_at as string])
    );

    const { data: logs, error: lErr } = await supabase
      .from("exercise_logs")
      .select("workout_log_id, reps, exercises(body_region)")
      .in("workout_log_id", workoutIds);

    if (lErr) return NextResponse.json({ error: lErr.message }, { status: 400 });

    // ── 4. Aggregate by date + category ───────────────────────────────────
    const byDate = new Map<string, { upper: number; lower: number; core: number }>();

    for (const log of logs ?? []) {
      const completed = completedByWorkout.get(log.workout_log_id);
      if (!completed) continue;
      const day = dateKeyUtc(completed);
      const region =
        (log.exercises as unknown as { body_region: string | null } | null)
          ?.body_region ?? "upper";
      const reps = log.reps ?? 0;

      if (!byDate.has(day)) byDate.set(day, { upper: 0, lower: 0, core: 0 });
      const bucket = byDate.get(day)!;
      if (region === "lower") bucket.lower += reps;
      else if (region === "core") bucket.core += reps;
      else bucket.upper += reps;
    }

    const data: CategoryRepsDay[] = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date,
        upperReps: d.upper,
        lowerReps: d.lower,
        coreReps: d.core,
      }));

    return NextResponse.json({
      data,
      longestStreak: longest,
      currentStreak: current,
    } satisfies CategoryRepsResponse);
  } catch {
    return NextResponse.json({ error: "Failed to load category reps" }, { status: 500 });
  }
}
