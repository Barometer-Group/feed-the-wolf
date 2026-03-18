import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { awardPoints } from "@/lib/gamification/awardPoints";
import { checkAndAwardAchievements } from "@/lib/gamification/checkAchievements";

interface PREvent {
  exerciseId: string;
  exerciseName: string;
  prType: "weight" | "reps";
  value: number;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workoutId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      perceived_effort?: number | null;
      overall_notes?: string | null;
    };

    const { data: workout, error: wErr } = await supabase
      .from("workout_logs")
      .select("id, athlete_id, plan_id, completed_at")
      .eq("id", workoutId)
      .single();

    if (wErr || !workout) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const w = workout as {
      athlete_id: string;
      plan_id: string | null;
      completed_at: string | null;
    };
    if (w.athlete_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (w.completed_at) {
      return NextResponse.json({ error: "Already completed" }, { status: 400 });
    }

    const { data: exLogs } = await supabase
      .from("exercise_logs")
      .select("exercise_id, weight_lbs, reps")
      .eq("workout_log_id", workoutId);

    const { data: completedW } = await supabase
      .from("workout_logs")
      .select("id")
      .eq("athlete_id", user.id)
      .not("completed_at", "is", null)
      .neq("id", workoutId);

    const priorIds = (completedW ?? []).map((r) => (r as { id: string }).id);

    const { error: upErr } = await supabase
      .from("workout_logs")
      .update({
        completed_at: new Date().toISOString(),
        perceived_effort: body.perceived_effort ?? null,
        overall_notes: body.overall_notes?.trim() || null,
      })
      .eq("id", workoutId);

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 400 });
    }

    await awardPoints(supabase, user.id, 10, `workout_complete:${workoutId}`);

    let trainerPlanBonus = false;
    if (w.plan_id) {
      const { data: plan } = await supabase
        .from("workout_plans")
        .select("created_by")
        .eq("id", w.plan_id)
        .single();
      if (plan) {
        const creator = (plan as { created_by: string }).created_by;
        if (creator !== user.id) {
          const { data: cr } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", creator)
            .single();
          if ((cr as { role?: string } | null)?.role === "trainer") {
            trainerPlanBonus = true;
            await awardPoints(
              supabase,
              user.id,
              15,
              `workout_trainer_plan:${workoutId}`
            );
          }
        }
      }
    }

    const byExercise = new Map<
      string,
      { maxW: number; maxR: number }
    >();
    for (const row of exLogs ?? []) {
      const r = row as {
        exercise_id: string;
        weight_lbs: number | null;
        reps: number | null;
      };
      let b = byExercise.get(r.exercise_id);
      if (!b) {
        b = { maxW: 0, maxR: 0 };
        byExercise.set(r.exercise_id, b);
      }
      const wt = r.weight_lbs != null ? Number(r.weight_lbs) : 0;
      const rp = r.reps ?? 0;
      b.maxW = Math.max(b.maxW, wt);
      b.maxR = Math.max(b.maxR, rp);
    }

    const prEvents: PREvent[] = [];
    const exerciseIds = [...byExercise.keys()];
    const { data: exercises } =
      exerciseIds.length > 0
        ? await supabase.from("exercises").select("id, name").in("id", exerciseIds)
        : { data: [] };
    const nameById = new Map(
      (exercises ?? []).map((e) => [(e as { id: string }).id, (e as { name: string }).name])
    );

    for (const [eid, session] of byExercise) {
      let prevW = 0;
      let prevR = 0;
      if (priorIds.length > 0) {
        const { data: prev } = await supabase
          .from("exercise_logs")
          .select("weight_lbs, reps")
          .eq("exercise_id", eid)
          .in("workout_log_id", priorIds);
        for (const row of prev ?? []) {
          const r = row as { weight_lbs: number | null; reps: number | null };
          const wt = r.weight_lbs != null ? Number(r.weight_lbs) : 0;
          const rp = r.reps ?? 0;
          prevW = Math.max(prevW, wt);
          prevR = Math.max(prevR, rp);
        }
      }

      const name = nameById.get(eid) ?? "Exercise";

      if (session.maxW > 0 && session.maxW > prevW) {
        await awardPoints(
          supabase,
          user.id,
          20,
          `pr_weight:${eid}:${workoutId}`
        );
        prEvents.push({
          exerciseId: eid,
          exerciseName: name,
          prType: "weight",
          value: session.maxW,
        });
      }
      if (session.maxR > 0 && session.maxR > prevR) {
        await awardPoints(
          supabase,
          user.id,
          20,
          `pr_reps:${eid}:${workoutId}`
        );
        prEvents.push({
          exerciseId: eid,
          exerciseName: name,
          prType: "reps",
          value: session.maxR,
        });
      }
    }

    const newBadges = await checkAndAwardAchievements(supabase, user.id);

    return NextResponse.json({
      ok: true,
      prEvents,
      newBadges,
      trainerPlanBonus,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
