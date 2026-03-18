import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { MediaListItem } from "@/lib/mediaTypes";
import { awardPoints } from "@/lib/gamification/awardPoints";
import { checkAndAwardAchievements } from "@/lib/gamification/checkAchievements";

const BUCKET = "workout-media";
const SIGNED_TTL = 3600;

async function signPath(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_TTL);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

function isStoragePath(stored: string): boolean {
  return !stored.startsWith("http://") && !stored.startsWith("https://");
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

    const { searchParams } = new URL(request.url);
    const workoutLogId = searchParams.get("workout_log_id");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = (profile as { role?: string } | null)?.role ?? "athlete";

    let query = supabase.from("media_uploads").select("*");

    if (role === "trainer") {
      const { data: ta } = await supabase
        .from("trainer_athletes")
        .select("athlete_id")
        .eq("trainer_id", user.id);
      const athleteIds = (ta ?? []).map(
        (r) => (r as { athlete_id: string }).athlete_id
      );
      if (athleteIds.length === 0) {
        return NextResponse.json({ items: [] as MediaListItem[] });
      }
      query = query.in("uploader_id", athleteIds);
    } else if (role === "admin") {
      /* all rows */
    } else {
      query = query.eq("uploader_id", user.id);
      if (workoutLogId) {
        query = query.eq("workout_log_id", workoutLogId);
      }
    }

    const { data: rows, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const list = rows ?? [];
    const workoutIds = [
      ...new Set(
        list
          .map((r) => (r as { workout_log_id: string | null }).workout_log_id)
          .filter(Boolean) as string[]
      ),
    ];
    const exerciseLogIds = [
      ...new Set(
        list
          .map((r) => (r as { exercise_log_id: string | null }).exercise_log_id)
          .filter(Boolean) as string[]
      ),
    ];
    const uploaderIds = [...new Set(list.map((r) => (r as { uploader_id: string }).uploader_id))];

    const workoutDates = new Map<string, string | null>();
    if (workoutIds.length > 0) {
      const { data: wl } = await supabase
        .from("workout_logs")
        .select("id, completed_at, started_at")
        .in("id", workoutIds);
      for (const w of wl ?? []) {
        const row = w as { id: string; completed_at: string | null; started_at: string };
        const d = row.completed_at ?? row.started_at;
        workoutDates.set(
          row.id,
          d ? new Date(d).toISOString().slice(0, 10) : null
        );
      }
    }

    const exerciseNames = new Map<string, string>();
    if (exerciseLogIds.length > 0) {
      const { data: el } = await supabase
        .from("exercise_logs")
        .select("id, exercise_id")
        .in("id", exerciseLogIds);
      const exIds = [...new Set((el ?? []).map((e) => (e as { exercise_id: string }).exercise_id))];
      const { data: ex } =
        exIds.length > 0
          ? await supabase.from("exercises").select("id, name").in("id", exIds)
          : { data: [] };
      const nameByEx = new Map((ex ?? []).map((e) => [(e as { id: string }).id, (e as { name: string }).name]));
      for (const row of el ?? []) {
        const r = row as { id: string; exercise_id: string };
        const n = nameByEx.get(r.exercise_id);
        if (n) exerciseNames.set(r.id, n);
      }
    }

    const uploaderNames = new Map<string, string>();
    if (uploaderIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", uploaderIds);
      for (const p of profs ?? []) {
        uploaderNames.set(
          (p as { id: string }).id,
          (p as { full_name: string }).full_name
        );
      }
    }

    const items: MediaListItem[] = [];
    for (const row of list) {
      const r = row as {
        id: string;
        url: string;
        type: "photo" | "video";
        created_at: string;
        uploader_id: string;
        workout_log_id: string | null;
        exercise_log_id: string | null;
        trainer_feedback: string | null;
        feedback_read: boolean;
      };
      const path = isStoragePath(r.url) ? r.url : r.url;
      let signedUrl: string | null = null;
      if (isStoragePath(r.url)) {
        signedUrl = await signPath(supabase, r.url);
      } else {
        signedUrl = r.url;
      }
      if (!signedUrl) continue;

      items.push({
        id: r.id,
        signedUrl,
        type: r.type,
        created_at: r.created_at,
        uploader_id: r.uploader_id,
        uploader_name: uploaderNames.get(r.uploader_id) ?? "Unknown",
        workout_log_id: r.workout_log_id,
        exercise_log_id: r.exercise_log_id,
        workout_date: r.workout_log_id
          ? workoutDates.get(r.workout_log_id) ?? null
          : null,
        exercise_name: r.exercise_log_id
          ? exerciseNames.get(r.exercise_log_id) ?? null
          : null,
        trainer_feedback: r.trainer_feedback,
        feedback_read: r.feedback_read ?? false,
      });
    }

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Failed to list media" }, { status: 500 });
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      workout_log_id: string;
      exercise_log_id?: string | null;
      storage_path: string;
      type: "photo" | "video";
    };

    if (!body.workout_log_id || !body.storage_path || !body.type) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const prefix = `${user.id}/`;
    if (!body.storage_path.startsWith(prefix)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 403 });
    }

    const { data: wl, error: wErr } = await supabase
      .from("workout_logs")
      .select("id, athlete_id")
      .eq("id", body.workout_log_id)
      .single();

    if (wErr || !wl || (wl as { athlete_id: string }).athlete_id !== user.id) {
      return NextResponse.json({ error: "Workout not found" }, { status: 403 });
    }

    if (body.exercise_log_id) {
      const { data: el, error: eErr } = await supabase
        .from("exercise_logs")
        .select("id, workout_log_id")
        .eq("id", body.exercise_log_id)
        .single();
      if (
        eErr ||
        !el ||
        (el as { workout_log_id: string }).workout_log_id !== body.workout_log_id
      ) {
        return NextResponse.json({ error: "Invalid exercise log" }, { status: 400 });
      }
    }

    const { data: inserted, error: insErr } = await supabase
      .from("media_uploads")
      .insert({
        workout_log_id: body.workout_log_id,
        exercise_log_id: body.exercise_log_id ?? null,
        uploader_id: user.id,
        url: body.storage_path,
        type: body.type,
        feedback_read: false,
      })
      .select("id")
      .single();

    if (insErr || !inserted) {
      return NextResponse.json(
        { error: insErr?.message ?? "Insert failed" },
        { status: 400 }
      );
    }

    const mid = (inserted as { id: string }).id;
    try {
      await awardPoints(supabase, user.id, 2, `media_upload:${mid}`);
      await checkAndAwardAchievements(supabase, user.id);
    } catch {
      /* points non-fatal */
    }

    return NextResponse.json({ id: mid });
  } catch {
    return NextResponse.json({ error: "Failed to save media" }, { status: 500 });
  }
}
