import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { awardPoints } from "@/lib/gamification/awardPoints";
import { checkAndAwardAchievements } from "@/lib/gamification/checkAchievements";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workoutLogId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { exerciseLogId?: string };
    if (!body.exerciseLogId) {
      return NextResponse.json({ error: "exerciseLogId required" }, { status: 400 });
    }

    const { data: wl } = await supabase
      .from("workout_logs")
      .select("athlete_id")
      .eq("id", workoutLogId)
      .single();
    if (!wl || (wl as { athlete_id: string }).athlete_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: log } = await supabase
      .from("exercise_logs")
      .select("id, workout_log_id, logged_via")
      .eq("id", body.exerciseLogId)
      .single();

    if (
      !log ||
      (log as { workout_log_id: string }).workout_log_id !== workoutLogId ||
      (log as { logged_via: string }).logged_via !== "voice"
    ) {
      return NextResponse.json({ error: "Invalid log" }, { status: 400 });
    }

    const reason = `voice_set:${body.exerciseLogId}`;
    const { data: existing } = await supabase
      .from("points_ledger")
      .select("id")
      .eq("athlete_id", user.id)
      .eq("reason", reason)
      .maybeSingle();

    if (!existing) {
      await awardPoints(supabase, user.id, 5, reason);
      await checkAndAwardAchievements(supabase, user.id);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
