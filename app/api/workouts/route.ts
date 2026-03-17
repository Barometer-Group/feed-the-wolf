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
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error("[API workouts] Missing Supabase env vars");
      return NextResponse.json(
        { error: "Server misconfiguration", code: "CONFIG_ERROR" },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const planId = (body as { plan_id?: string }).plan_id ?? null;

    const { data, error } = await supabase
      .from("workout_logs")
      .insert({ athlete_id: user.id, plan_id: planId || undefined })
      .select("id")
      .single();

    if (error) {
      console.error("[API workouts] Supabase insert error:", {
        message: error.message,
        code: (error as { code?: string }).code,
        details: (error as { details?: string }).details,
        hint: (error as { hint?: string }).hint,
      });
      return NextResponse.json(
        {
          error: error.message,
          code: (error as { code?: string }).code ?? "DB_ERROR",
          details: (error as { details?: string }).details,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error("[API workouts] Unexpected error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to create workout",
        code: "UNKNOWN_ERROR",
      },
      { status: 500 }
    );
  }
}
