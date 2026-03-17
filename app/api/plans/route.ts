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
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { data: plans, error } = await supabase
      .from("workout_plans")
      .select("id, name, description, scheduled_date, is_template, created_by, athlete_id")
      .or(`created_by.eq.${user.id},athlete_id.eq.${user.id}`)
      .order("scheduled_date", { ascending: true, nullsFirst: false });

    if (error) {
      return NextResponse.json(
        { error: error.message, code: "DB_ERROR" },
        { status: 400 }
      );
    }

    const athleteIds = [...new Set(
      (plans ?? [])
        .map((p) => (p as { athlete_id: string | null }).athlete_id)
        .filter(Boolean) as string[]
    )];
    const { data: profiles } = athleteIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", athleteIds)
      : { data: [] };
    const nameByAthlete = new Map(
      (profiles ?? []).map((p) => [(p as { id: string; full_name: string }).id, (p as { id: string; full_name: string }).full_name])
    );

    const { data: counts } = await supabase
      .from("workout_plan_exercises")
      .select("plan_id")
      .in("plan_id", (plans ?? []).map((p) => (p as { id: string }).id));

    const countByPlan = (counts ?? []).reduce(
      (acc, row) => {
        acc[row.plan_id] = (acc[row.plan_id] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const result = (plans ?? []).map((p) => {
      const plan = p as {
        id: string;
        name: string;
        description: string | null;
        scheduled_date: string | null;
        is_template: boolean;
        created_by: string;
        athlete_id: string | null;
      };
      return {
        ...plan,
        athlete_name: plan.athlete_id ? nameByAthlete.get(plan.athlete_id) ?? null : null,
        exercise_count: countByPlan[plan.id] ?? 0,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[API plans] GET error:", err);
    return NextResponse.json(
      { error: "Failed to list plans", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      scheduled_date,
      is_template,
      athlete_id,
      exercises,
    } = body as {
      name: string;
      description?: string | null;
      scheduled_date?: string | null;
      is_template?: boolean;
      athlete_id?: string | null;
      exercises: Array<{
        exercise_id: string;
        prescribed_sets: number | null;
        prescribed_reps: number | null;
        prescribed_weight_lbs: number | null;
        prescribed_duration_seconds: number | null;
        notes: string | null;
      }>;
    };

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Plan name is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { data: plan, error: planError } = await supabase
      .from("workout_plans")
      .insert({
        created_by: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        scheduled_date: scheduled_date || null,
        is_template: !!is_template,
        athlete_id: athlete_id || null,
      })
      .select("id")
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: planError?.message ?? "Failed to create plan", code: "DB_ERROR" },
        { status: 400 }
      );
    }

    const planId = (plan as { id: string }).id;
    if (exercises?.length) {
      const rows = exercises.map((ex, i) => ({
        plan_id: planId,
        exercise_id: ex.exercise_id,
        order_index: i,
        prescribed_sets: ex.prescribed_sets ?? null,
        prescribed_reps: ex.prescribed_reps ?? null,
        prescribed_weight_lbs: ex.prescribed_weight_lbs ?? null,
        prescribed_duration_seconds: ex.prescribed_duration_seconds ?? null,
        notes: ex.notes?.trim() || null,
      }));
      const { error: exError } = await supabase.from("workout_plan_exercises").insert(rows);
      if (exError) {
        await supabase.from("workout_plans").delete().eq("id", planId);
        return NextResponse.json(
          { error: exError.message, code: "DB_ERROR" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ id: planId });
  } catch (err) {
    console.error("[API plans] POST error:", err);
    return NextResponse.json(
      { error: "Failed to create plan", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
