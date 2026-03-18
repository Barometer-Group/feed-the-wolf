import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      exerciseId?: string;
      weightLbs?: number | null;
      reps?: number | null;
      workoutLogId?: string;
      exerciseLogId?: string;
    };

    if (
      !body.exerciseId ||
      !body.workoutLogId ||
      !body.exerciseLogId
    ) {
      return NextResponse.json(
        { error: "exerciseId, workoutLogId, exerciseLogId required" },
        { status: 400 }
      );
    }

    const { data: wl } = await supabase
      .from("workout_logs")
      .select("athlete_id")
      .eq("id", body.workoutLogId)
      .single();
    if (!wl || (wl as { athlete_id: string }).athlete_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: completedIds } = await supabase
      .from("workout_logs")
      .select("id")
      .eq("athlete_id", user.id)
      .not("completed_at", "is", null);

    const ids = (completedIds ?? []).map((r) => (r as { id: string }).id);

    let prevMaxW = 0;
    let prevMaxR = 0;
    if (ids.length > 0) {
      const { data: prevLogs } = await supabase
        .from("exercise_logs")
        .select("weight_lbs, reps")
        .eq("exercise_id", body.exerciseId)
        .in("workout_log_id", ids);
      for (const row of prevLogs ?? []) {
        const r = row as { weight_lbs: number | null; reps: number | null };
        const w = r.weight_lbs != null ? Number(r.weight_lbs) : 0;
        const rep = r.reps ?? 0;
        if (w > prevMaxW) prevMaxW = w;
        if (rep > prevMaxR) prevMaxR = rep;
      }
    }

    const { data: sameW } = await supabase
      .from("exercise_logs")
      .select("weight_lbs, reps")
      .eq("workout_log_id", body.workoutLogId)
      .eq("exercise_id", body.exerciseId)
      .neq("id", body.exerciseLogId);

    for (const row of sameW ?? []) {
      const r = row as { weight_lbs: number | null; reps: number | null };
      const w = r.weight_lbs != null ? Number(r.weight_lbs) : 0;
      const rep = r.reps ?? 0;
      if (w > prevMaxW) prevMaxW = w;
      if (rep > prevMaxR) prevMaxR = rep;
    }

    const curW =
      body.weightLbs != null && !Number.isNaN(Number(body.weightLbs))
        ? Number(body.weightLbs)
        : 0;
    const curR =
      body.reps != null && !Number.isNaN(Number(body.reps))
        ? Number(body.reps)
        : 0;

    const weightPR = curW > 0 && curW > prevMaxW;
    const repsPR = curR > 0 && curR > prevMaxR;

    let prType: "weight" | "reps" | null = null;
    if (weightPR) prType = "weight";
    else if (repsPR) prType = "reps";

    return NextResponse.json({
      isPR: weightPR || repsPR,
      prType,
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
