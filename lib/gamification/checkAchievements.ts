import type { SupabaseClient } from "@supabase/supabase-js";

function insertAchievementRow(
  client: SupabaseClient,
  row: {
    athlete_id: string;
    type: string;
    title: string;
    description: string;
  }
): Promise<{ error: { message: string } | null }> {
  const q = client.from("achievements") as unknown as {
    insert: (r: typeof row) => Promise<{ error: { message: string } | null }>;
  };
  return q.insert(row);
}

export interface NewAchievement {
  type: string;
  title: string;
  description: string;
}

function dateKeyUtc(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

function uniqueSortedDates(isoDates: string[]): string[] {
  const keys = [...new Set(isoDates.map(dateKeyUtc))].sort();
  return keys;
}

function currentStreak(sortedDateKeys: string[]): number {
  if (sortedDateKeys.length === 0) return 0;
  const today = dateKeyUtc(new Date().toISOString());
  let start = sortedDateKeys.length - 1;
  if (sortedDateKeys[start] !== today) {
    const y = new Date();
    y.setUTCDate(y.getUTCDate() - 1);
    const yKey = y.toISOString().slice(0, 10);
    if (sortedDateKeys[start] !== yKey) return 0;
  }
  let streak = 1;
  for (let i = start - 1; i >= 0; i--) {
    const a = new Date(sortedDateKeys[i + 1] + "T12:00:00Z");
    const b = new Date(sortedDateKeys[i] + "T12:00:00Z");
    const diff = (a.getTime() - b.getTime()) / 86400000;
    if (diff === 1) streak++;
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
    } else {
      run = 1;
    }
  }
  return best;
}

function hasThreeInWeek(sortedDateKeys: string[]): boolean {
  const set = new Set(sortedDateKeys);
  for (const d of sortedDateKeys) {
    const start = new Date(d + "T12:00:00Z");
    let count = 0;
    for (let k = 0; k < 7; k++) {
      const x = new Date(start);
      x.setUTCDate(x.getUTCDate() - k);
      if (set.has(x.toISOString().slice(0, 10))) count++;
    }
    if (count >= 3) return true;
  }
  return false;
}

export async function checkAndAwardAchievements(
  client: SupabaseClient,
  userId: string
): Promise<NewAchievement[]> {
  const { data: earned } = await client
    .from("achievements")
    .select("type")
    .eq("athlete_id", userId);
  const earnedSet = new Set(
    (earned ?? []).map((r) => (r as { type: string }).type)
  );

  const newOnes: NewAchievement[] = [];

  const tryAward = async (
    type: string,
    title: string,
    description: string
  ) => {
    if (earnedSet.has(type)) return;
    const { error } = await insertAchievementRow(client, {
      athlete_id: userId,
      type,
      title,
      description,
    });
    if (!error) {
      earnedSet.add(type);
      newOnes.push({ type, title, description });
    }
  };

  const { data: completedW } = await client
    .from("workout_logs")
    .select("id, completed_at, plan_id")
    .eq("athlete_id", userId)
    .not("completed_at", "is", null);

  const workouts = completedW ?? [];
  const workoutDates = (workouts as { completed_at: string }[]).map(
    (w) => w.completed_at
  );
  const dateKeys = uniqueSortedDates(workoutDates);

  if (workouts.length >= 1) {
    await tryAward("first_rep", "First Rep", "Logged your first workout");
  }

  if (hasThreeInWeek(dateKeys)) {
    await tryAward("on_fire", "On Fire", "3 workouts in one week");
  }

  if (currentStreak(dateKeys) >= 7) {
    await tryAward("streak_7", "Streak Master", "7-day workout streak");
  }

  if (longestStreak(dateKeys) >= 30) {
    await tryAward("consistent", "Consistent", "30-day workout streak");
  }

  const { data: ledgerRows } = await client
    .from("points_ledger")
    .select("reason")
    .eq("athlete_id", userId);
  const prCount = (ledgerRows ?? []).filter(
    (r) =>
      (r as { reason: string }).reason.startsWith("pr_weight:") ||
      (r as { reason: string }).reason.startsWith("pr_reps:")
  ).length;

  if (prCount >= 10) {
    await tryAward("pr_crusher", "PR Crusher", "10 personal records");
  }

  const { count: mediaCount } = await client
    .from("media_uploads")
    .select("id", { count: "exact", head: true })
    .eq("uploader_id", userId);

  if ((mediaCount ?? 0) >= 5) {
    await tryAward("form_check", "Form Check", "5 form videos uploaded");
  }

  const wIds = (workouts as { id: string }[]).map((w) => w.id);
  if (wIds.length > 0) {
    const { data: heavy } = await client
      .from("exercise_logs")
      .select("weight_lbs")
      .in("workout_log_id", wIds)
      .gte("weight_lbs", 300);
    if ((heavy ?? []).length > 0) {
      await tryAward("heavy_lifter", "Heavy Lifter", "Lifted over 300 lbs");
    }
  }

  for (const w of workouts as { plan_id: string | null }[]) {
    if (!w.plan_id) continue;
    const { data: plan } = await client
      .from("workout_plans")
      .select("created_by")
      .eq("id", w.plan_id)
      .single();
    if (!plan) continue;
    const creator = (plan as { created_by: string }).created_by;
    if (creator === userId) continue;
    const { data: cr } = await client
      .from("profiles")
      .select("role")
      .eq("id", creator)
      .single();
    const role = (cr as { role?: string } | null)?.role;
    if (role === "trainer") {
      await tryAward(
        "first_plan",
        "Plan Follower",
        "Completed a prescribed workout"
      );
      break;
    }
  }

  return newOnes;
}
