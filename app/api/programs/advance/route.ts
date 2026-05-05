import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Called when user taps "Mark Rest Day Done" — advances the program counter.
// Workout completion advances the counter automatically via the complete route.
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: enrollment } = await supabase
      .from("program_enrollments")
      .select("id, program_id, current_day")
      .eq("athlete_id", user.id)
      .maybeSingle();

    if (!enrollment) {
      return NextResponse.json({ error: "Not enrolled in a program" }, { status: 404 });
    }

    const { id: enrollmentId, program_id, current_day } = enrollment as {
      id: string;
      program_id: string;
      current_day: number;
    };

    const { count: totalDays } = await supabase
      .from("program_days")
      .select("id", { count: "exact", head: true })
      .eq("program_id", program_id);

    const max = totalDays ?? 10;
    const nextDay = current_day >= max ? 1 : current_day + 1;

    await supabase
      .from("program_enrollments")
      .update({ current_day: nextDay, updated_at: new Date().toISOString() })
      .eq("id", enrollmentId);

    return NextResponse.json({ ok: true, nextDay });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
