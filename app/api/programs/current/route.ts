import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
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
      return NextResponse.json({ programState: null });
    }

    const { program_id, current_day } = enrollment as {
      id: string;
      program_id: string;
      current_day: number;
    };

    const [{ data: program }, { count: totalDays }, { data: dayData }] =
      await Promise.all([
        supabase.from("programs").select("name").eq("id", program_id).single(),
        supabase
          .from("program_days")
          .select("id", { count: "exact", head: true })
          .eq("program_id", program_id),
        supabase
          .from("program_days")
          .select("plan_id, label")
          .eq("program_id", program_id)
          .eq("day_number", current_day)
          .single(),
      ]);

    if (!program || !dayData) {
      return NextResponse.json({ programState: null });
    }

    const day = dayData as { plan_id: string | null; label: string };

    return NextResponse.json({
      programState: {
        programId: program_id,
        programName: (program as { name: string }).name,
        dayNumber: current_day,
        totalDays: totalDays ?? 10,
        label: day.label,
        isRestDay: day.plan_id === null,
        planId: day.plan_id,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
