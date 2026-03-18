import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getLevelInfo } from "@/lib/gamification/levels";

function dateKeyUtc(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function uniqueSortedDates(isoDates: string[]): string[] {
  return [...new Set(isoDates.map(dateKeyUtc))].sort();
}

function currentStreak(sortedDateKeys: string[]): number {
  if (sortedDateKeys.length === 0) return 0;
  const today = dateKeyUtc(new Date().toISOString());
  let start = sortedDateKeys.length - 1;
  if (sortedDateKeys[start] !== today) {
    const y = new Date();
    y.setUTCDate(y.getUTCDate() - 1);
    if (sortedDateKeys[start] !== y.toISOString().slice(0, 10)) return 0;
  }
  let streak = 1;
  for (let i = start - 1; i >= 0; i--) {
    const a = new Date(sortedDateKeys[i + 1] + "T12:00:00Z");
    const b = new Date(sortedDateKeys[i] + "T12:00:00Z");
    if ((a.getTime() - b.getTime()) / 86400000 === 1) streak++;
    else break;
  }
  return streak;
}

function longestStreak(sortedDateKeys: string[]): number {
  if (sortedDateKeys.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < sortedDateKeys.length; i++) {
    const a = new Date(sortedDateKeys[i - 1] + "T12:00:00Z");
    const b = new Date(sortedDateKeys[i] + "T12:00:00Z");
    const diff = (b.getTime() - a.getTime()) / 86400000;
    if (diff === 1) {
      run++;
      best = Math.max(best, run);
    } else run = 1;
  }
  return best;
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, total_points, full_name")
      .eq("id", user.id)
      .single();

    const role = (profile as { role?: string } | null)?.role ?? "athlete";
    const totalPoints =
      (profile as { total_points?: number | null })?.total_points ?? 0;

    const viewTrainer =
      new URL(request.url).searchParams.get("view") === "trainer";

    if (role === "trainer" || (role === "admin" && viewTrainer)) {
      const { data: ta } = await supabase
        .from("trainer_athletes")
        .select("athlete_id")
        .eq("trainer_id", user.id);
      const athleteIds = (ta ?? []).map(
        (r) => (r as { athlete_id: string }).athlete_id
      );
      if (athleteIds.length === 0) {
        return NextResponse.json({
          kind: "trainer" as const,
          athletes: [],
        });
      }

      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", athleteIds);

      const athletes = [];
      for (const aid of athleteIds) {
        const name =
          (profs ?? []).find((p) => (p as { id: string }).id === aid) as
            | { full_name: string }
            | undefined;

        const { data: lastW } = await supabase
          .from("workout_logs")
          .select("completed_at")
          .eq("athlete_id", aid)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastAt = (lastW as { completed_at: string } | null)?.completed_at ?? null;

        const { data: allW } = await supabase
          .from("workout_logs")
          .select("completed_at")
          .eq("athlete_id", aid)
          .not("completed_at", "is", null);
        const dates = uniqueSortedDates(
          (allW ?? []).map((w) => (w as { completed_at: string }).completed_at)
        );
        const streak = currentStreak(dates);

        const { count: unread } = await supabase
          .from("media_uploads")
          .select("id", { count: "exact", head: true })
          .eq("uploader_id", aid)
          .is("trainer_feedback", null);

        let daysSince: number | null = null;
        if (lastAt) {
          daysSince = Math.floor(
            (Date.now() - new Date(lastAt).getTime()) / 86400000
          );
        } else {
          daysSince = 999;
        }

        athletes.push({
          id: aid,
          name: name?.full_name ?? "Athlete",
          lastWorkoutDate: lastAt,
          streak,
          unreadMedia: unread ?? 0,
          daysSinceWorkout: daysSince,
        });
      }

      athletes.sort((a, b) => (a.name > b.name ? 1 : -1));
      return NextResponse.json({ kind: "trainer" as const, athletes });
    }

    const level = getLevelInfo(totalPoints);
    const toNext =
      level.nextLevelMin != null
        ? level.nextLevelMin - totalPoints
        : 0;
    const progressInLevel =
      level.nextLevelMin != null
        ? totalPoints - level.minPoints
        : totalPoints;
    const levelSpan =
      level.nextLevelMin != null
        ? level.nextLevelMin - level.minPoints
        : 1;
    const progressPct =
      level.nextLevelMin != null
        ? Math.min(100, Math.round((progressInLevel / levelSpan) * 100))
        : 100;

    const { data: completed } = await supabase
      .from("workout_logs")
      .select("id, completed_at, started_at")
      .eq("athlete_id", user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false });

    const workouts = completed ?? [];
    const dates = uniqueSortedDates(
      (workouts as { completed_at: string }[]).map((w) => w.completed_at)
    );

    const last7: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      last7.push(d.toISOString().slice(0, 10));
    }
    const dateSet = new Set(dates);
    const last7Filled = last7.map((d) => dateSet.has(d));

    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getUTCDay();
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - day);
    startOfWeek.setUTCHours(0, 0, 0, 0);
    const weekIds = (workouts as { id: string; completed_at: string }[])
      .filter((w) => new Date(w.completed_at) >= startOfWeek)
      .map((w) => w.id);

    let weekVolume = 0;
    if (weekIds.length > 0) {
      const { data: logs } = await supabase
        .from("exercise_logs")
        .select("reps, weight_lbs")
        .in("workout_log_id", weekIds);
      for (const row of logs ?? []) {
        const r = row as { reps: number | null; weight_lbs: number | null };
        const reps = r.reps ?? 0;
        const w = r.weight_lbs != null ? Number(r.weight_lbs) : 0;
        weekVolume += reps * w;
      }
    }

    const { data: badges } = await supabase
      .from("achievements")
      .select("type, title, description, earned_at")
      .eq("athlete_id", user.id)
      .order("earned_at", { ascending: false })
      .limit(3);

    const { data: plans } = await supabase
      .from("workout_plans")
      .select("id, name, scheduled_date")
      .eq("athlete_id", user.id)
      .order("scheduled_date", { ascending: true, nullsFirst: false });

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const upcoming = (plans ?? []).filter((p) => {
      const sd = (p as { scheduled_date: string | null }).scheduled_date;
      if (!sd) return true;
      return new Date(sd) >= startOfToday;
    });
    let nextPlan: {
      id: string;
      name: string;
      scheduled_date: string | null;
      exercise_count: number;
    } | null = null;
    if (upcoming.length > 0) {
      const p = upcoming[0] as { id: string; name: string; scheduled_date: string | null };
      const { count } = await supabase
        .from("workout_plan_exercises")
        .select("id", { count: "exact", head: true })
        .eq("plan_id", p.id);
      nextPlan = {
        id: p.id,
        name: p.name,
        scheduled_date: p.scheduled_date,
        exercise_count: count ?? 0,
      };
    }

    const recent3 = (workouts as { id: string; completed_at: string; started_at: string }[]).slice(0, 3);
    const recentWorkouts = [];
    for (const w of recent3) {
      const { data: exLogs } = await supabase
        .from("exercise_logs")
        .select("exercise_id, reps, weight_lbs")
        .eq("workout_log_id", w.id);
      const exIds = new Set(
        (exLogs ?? []).map((e) => (e as { exercise_id: string }).exercise_id)
      );
      let vol = 0;
      for (const row of exLogs ?? []) {
        const r = row as { reps: number | null; weight_lbs: number | null };
        vol += (r.reps ?? 0) * (r.weight_lbs != null ? Number(r.weight_lbs) : 0);
      }
      const dur = Math.round(
        (new Date(w.completed_at).getTime() - new Date(w.started_at).getTime()) /
          60000
      );
      recentWorkouts.push({
        id: w.id,
        date: new Date(w.completed_at).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        duration: dur,
        exerciseCount: exIds.size,
        totalVolume: vol,
      });
    }

    return NextResponse.json({
      kind: "athlete" as const,
      totalPoints,
      level: level.level,
      levelName: level.name,
      minPoints: level.minPoints,
      nextLevelMin: level.nextLevelMin,
      pointsToNext: toNext,
      progressPct,
      currentStreak: currentStreak(dates),
      longestStreak: longestStreak(dates),
      last7Days: last7Filled,
      recentBadges: (badges ?? []).map((b) => ({
        type: (b as { type: string }).type,
        title: (b as { title: string }).title,
        description: (b as { description: string | null }).description ?? "",
      })),
      weekWorkouts: weekIds.length,
      weekVolume,
      totalWorkouts: workouts.length,
      nextPlan,
      recentWorkouts,
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
