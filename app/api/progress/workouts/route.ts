import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  parseProgressRange,
  rangeStartIso,
  dateKeyUtc,
  weekStartMondayUtc,
  formatWeekLabel,
} from "@/lib/progressRange";

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

    let query = supabase
      .from("workout_logs")
      .select("id, started_at, completed_at")
      .eq("athlete_id", user.id)
      .not("completed_at", "is", null);

    const start = rangeStartIso(range);
    if (start) {
      query = query.gte("completed_at", start);
    }

    const { data: workouts, error } = await query.order("completed_at", {
      ascending: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const durationByDate = new Map<string, number>();
    const weekCounts = new Map<string, number>();

    for (const w of workouts ?? []) {
      const completed = w.completed_at as string;
      const started = new Date(w.started_at).getTime();
      const ended = new Date(completed).getTime();
      const minutes = Math.max(0, Math.round((ended - started) / 60000));
      const day = dateKeyUtc(completed);
      durationByDate.set(day, (durationByDate.get(day) ?? 0) + minutes);

      const weekKey = weekStartMondayUtc(completed);
      weekCounts.set(weekKey, (weekCounts.get(weekKey) ?? 0) + 1);
    }

    const byDate = [...durationByDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, durationMinutes]) => ({ date, durationMinutes }));

    const weekly = [...weekCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, count]) => ({
        weekStart,
        weekLabel: formatWeekLabel(weekStart),
        count,
      }));

    return NextResponse.json({ byDate, weekly });
  } catch {
    return NextResponse.json({ error: "Failed to load workouts" }, { status: 500 });
  }
}
