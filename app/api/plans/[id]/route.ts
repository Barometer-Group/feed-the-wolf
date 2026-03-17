import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { data: plan, error } = await supabase
      .from("workout_plans")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !plan) {
      return NextResponse.json(
        { error: "Plan not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const { data: planEx } = await supabase
      .from("workout_plan_exercises")
      .select("id, exercise_id, order_index, prescribed_sets, prescribed_reps, prescribed_weight_lbs, prescribed_duration_seconds, notes")
      .eq("plan_id", id)
      .order("order_index");

    const exerciseIds = [...new Set((planEx ?? []).map((pe) => (pe as { exercise_id: string }).exercise_id))];
    const { data: exData } = exerciseIds.length
      ? await supabase.from("exercises").select("id, name, category").in("id", exerciseIds)
      : { data: [] };
    const exMap = new Map((exData ?? []).map((e) => [(e as { id: string }).id, e]));

    const plan_exercises = (planEx ?? []).map((pe) => {
      const row = pe as {
        id: string;
        exercise_id: string;
        order_index: number;
        prescribed_sets: number | null;
        prescribed_reps: number | null;
        prescribed_weight_lbs: number | null;
        prescribed_duration_seconds: number | null;
        notes: string | null;
      };
      return {
        ...row,
        exercise: exMap.get(row.exercise_id) ?? null,
      };
    });

    const athleteName = (plan as { athlete_id: string | null }).athlete_id
      ? (await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", (plan as { athlete_id: string }).athlete_id)
          .single()
        ).data?.full_name ?? null
      : null;

    return NextResponse.json({
      ...plan,
      athlete_name: athleteName,
      plan_exercises,
    });
  } catch (err) {
    console.error("[API plans] GET [id] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch plan", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { data: existing } = await supabase
      .from("workout_plans")
      .select("created_by")
      .eq("id", id)
      .single();
    if (!existing || (existing as { created_by: string }).created_by !== user.id) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
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
      name?: string;
      description?: string | null;
      scheduled_date?: string | null;
      is_template?: boolean;
      athlete_id?: string | null;
      exercises?: Array<{
        exercise_id: string;
        prescribed_sets: number | null;
        prescribed_reps: number | null;
        prescribed_weight_lbs: number | null;
        prescribed_duration_seconds: number | null;
        notes: string | null;
      }>;
    };

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (scheduled_date !== undefined) updates.scheduled_date = scheduled_date || null;
    if (is_template !== undefined) updates.is_template = is_template;
    if (athlete_id !== undefined) updates.athlete_id = athlete_id || null;

    if (Object.keys(updates).length > 0) {
      const { error: upError } = await supabase
        .from("workout_plans")
        .update(updates)
        .eq("id", id);
      if (upError) {
        return NextResponse.json(
          { error: upError.message, code: "DB_ERROR" },
          { status: 400 }
        );
      }
    }

    if (exercises !== undefined) {
      await supabase.from("workout_plan_exercises").delete().eq("plan_id", id);
      if (exercises.length > 0) {
        const rows = exercises.map((ex: { exercise_id: string; prescribed_sets?: number | null; prescribed_reps?: number | null; prescribed_weight_lbs?: number | null; prescribed_duration_seconds?: number | null; notes?: string | null }, i: number) => ({
          plan_id: id,
          exercise_id: ex.exercise_id,
          order_index: i,
          prescribed_sets: ex.prescribed_sets ?? null,
          prescribed_reps: ex.prescribed_reps ?? null,
          prescribed_weight_lbs: ex.prescribed_weight_lbs ?? null,
          prescribed_duration_seconds: ex.prescribed_duration_seconds ?? null,
          notes: ex.notes?.trim() || null,
        }));
        await supabase.from("workout_plan_exercises").insert(rows);
      }
    }

    return NextResponse.json({ id });
  } catch (err) {
    console.error("[API plans] PUT error:", err);
    return NextResponse.json(
      { error: "Failed to update plan", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { data: existing } = await supabase
      .from("workout_plans")
      .select("created_by")
      .eq("id", id)
      .single();
    if (!existing || (existing as { created_by: string }).created_by !== user.id) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { error } = await supabase.from("workout_plans").delete().eq("id", id);
    if (error) {
      return NextResponse.json(
        { error: error.message, code: "DB_ERROR" },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API plans] DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete plan", code: "UNKNOWN_ERROR" },
      { status: 500 }
    );
  }
}
