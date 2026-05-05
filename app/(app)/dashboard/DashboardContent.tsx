"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkoutCard } from "@/components/workout/WorkoutCard";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type Role = "admin" | "trainer" | "athlete";

const BADGE_EMOJI: Record<string, string> = {
  first_rep: "💪",
  on_fire: "🔥",
  streak_7: "⚡",
  pr_crusher: "🏆",
  form_check: "📹",
  consistent: "📅",
  heavy_lifter: "🐺",
  first_plan: "📋",
};

type DashboardContentProps = {
  userName: string;
  userRole: Role;
};

type ProgramState = {
  programId: string;
  programName: string;
  dayNumber: number;
  totalDays: number;
  label: string;
  isRestDay: boolean;
  planId: string | null;
};

interface AthletePayload {
  kind: "athlete";
  totalPoints: number;
  level: number;
  levelName: string;
  minPoints: number;
  nextLevelMin: number | null;
  pointsToNext: number;
  progressPct: number;
  currentStreak: number;
  longestStreak: number;
  last7Days: boolean[];
  recentBadges: { type: string; title: string; description: string }[];
  weekWorkouts: number;
  weekVolume: number;
  totalWorkouts: number;
  nextPlan: {
    id: string;
    name: string;
    scheduled_date: string | null;
    exercise_count: number;
  } | null;
  recentWorkouts: {
    id: string;
    date: string;
    duration: number;
    exerciseCount: number;
    totalVolume: number;
  }[];
  programState: ProgramState | null;
}

interface TrainerAthleteRow {
  id: string;
  name: string;
  lastWorkoutDate: string | null;
  streak: number;
  unreadMedia: number;
  daysSinceWorkout: number | null;
}

type TrainerResponse = { kind: "trainer"; athletes: TrainerAthleteRow[] };

function isAthletePayload(
  j: unknown
): j is AthletePayload & { kind: "athlete" } {
  return (
    typeof j === "object" &&
    j !== null &&
    (j as { kind?: string }).kind === "athlete"
  );
}

function isTrainerResponse(j: unknown): j is TrainerResponse {
  return (
    typeof j === "object" &&
    j !== null &&
    (j as { kind?: string }).kind === "trainer" &&
    Array.isArray((j as TrainerResponse).athletes)
  );
}

export function DashboardContent({ userName, userRole }: DashboardContentProps) {
  const [viewAs, setViewAs] = useState<Role>(
    userRole === "admin" ? "athlete" : userRole
  );
  const [athleteData, setAthleteData] = useState<AthletePayload | null>(null);
  const [trainerAthletes, setTrainerAthletes] = useState<TrainerAthleteRow[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const showTrainerDashboard =
    userRole === "trainer" ||
    (userRole === "admin" && viewAs === "trainer");
  const showAthleteDashboard =
    userRole === "athlete" ||
    (userRole === "admin" && viewAs === "athlete");
  const showAdminPanel = userRole === "admin" && viewAs === "admin";

  const load = useCallback(async () => {
    if (showAdminPanel) {
      setAthleteData(null);
      setTrainerAthletes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (showTrainerDashboard) {
        const res = await fetch("/api/dashboard?view=trainer");
        const j: unknown = await res.json();
        if (!res.ok) {
          toast.error(
            typeof j === "object" &&
              j !== null &&
              "error" in j &&
              typeof (j as { error: string }).error === "string"
              ? (j as { error: string }).error
              : "Failed to load trainer dashboard"
          );
          setTrainerAthletes([]);
          return;
        }
        if (isTrainerResponse(j)) {
          setTrainerAthletes(j.athletes);
        } else {
          setTrainerAthletes([]);
        }
        setAthleteData(null);
      } else {
        const res = await fetch("/api/dashboard");
        const j: unknown = await res.json();
        if (!res.ok) {
          toast.error(
            typeof j === "object" &&
              j !== null &&
              "error" in j &&
              typeof (j as { error: string }).error === "string"
              ? (j as { error: string }).error
              : "Failed to load dashboard"
          );
          setAthleteData(null);
          return;
        }
        if (isAthletePayload(j)) {
          setAthleteData({
            kind: "athlete",
            totalPoints: j.totalPoints,
            level: j.level,
            levelName: j.levelName,
            minPoints: j.minPoints,
            nextLevelMin: j.nextLevelMin,
            pointsToNext: j.pointsToNext,
            progressPct: j.progressPct,
            currentStreak: j.currentStreak,
            longestStreak: j.longestStreak,
            last7Days: j.last7Days,
            recentBadges: j.recentBadges,
            weekWorkouts: j.weekWorkouts,
            weekVolume: j.weekVolume,
            totalWorkouts: j.totalWorkouts,
            nextPlan: j.nextPlan,
            recentWorkouts: j.recentWorkouts,
            programState: j.programState ?? null,
          });
        } else {
          setAthleteData(null);
        }
        setTrainerAthletes([]);
      }
    } catch {
      toast.error("Failed to load dashboard");
      setAthleteData(null);
      setTrainerAthletes([]);
    } finally {
      setLoading(false);
    }
  }, [showAdminPanel, showTrainerDashboard]);

  useEffect(() => {
    void load();
  }, [load]);

  const startPlan = async (planId: string) => {
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });
      const j = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        toast.error(j.error ?? "Failed to start workout");
        return;
      }
      if (j.id) router.push(`/log/${j.id}`);
    } catch {
      toast.error("Failed to start workout");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[375px] space-y-6 px-1 sm:max-w-none sm:px-0">
      {/* Header — shown for trainer/admin only; athlete greeting lives inside AthleteDashboardView */}
      {!showAthleteDashboard && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Welcome, {userName}
            </h1>
            <Badge variant="secondary" className="mt-1 capitalize">
              {userRole}
            </Badge>
          </div>
          {userRole === "admin" && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">View as</span>
              <Select
                value={viewAs}
                onValueChange={(v) => setViewAs(v as Role)}
              >
                <SelectTrigger className="w-[140px] border-zinc-300 bg-zinc-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="athlete">Athlete</SelectItem>
                  <SelectItem value="trainer">Trainer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {showAdminPanel && (
        <Card className="border-zinc-200 bg-white">
          <CardHeader>
            <CardTitle className="text-zinc-900">Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="min-h-[44px]">
              <Link href="/admin">Open admin</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {showAthleteDashboard && (
        <>
          {loading ? (
            <DashboardAthleteSkeleton />
          ) : athleteData ? (
            <AthleteDashboardView
              data={athleteData}
              userName={userName}
              onStartPlan={startPlan}
            />
          ) : (
            <p className="text-sm text-zinc-500">No dashboard data.</p>
          )}
        </>
      )}

      {showTrainerDashboard && (
        <>
          {loading ? (
            <TrainerSkeleton />
          ) : (
            <TrainerDashboardView athletes={trainerAthletes} />
          )}
        </>
      )}
    </div>
  );
}

function DashboardAthleteSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-36 w-full rounded-xl bg-zinc-200" />
      <Skeleton className="h-28 w-full rounded-xl bg-zinc-200" />
      <Skeleton className="h-16 w-full rounded-xl bg-zinc-200" />
      <div className="flex gap-2">
        <Skeleton className="h-20 flex-1 rounded-lg bg-zinc-200" />
        <Skeleton className="h-20 flex-1 rounded-lg bg-zinc-200" />
        <Skeleton className="h-20 flex-1 rounded-lg bg-zinc-200" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl bg-zinc-200" />
    </div>
  );
}

function TrainerSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl bg-zinc-200" />
      ))}
    </div>
  );
}

type RecentPR = {
  exerciseName: string;
  bestWeight: number;
  bestReps: number;
  achievedAt: string;
};

function AthleteDashboardView({
  data,
  userName,
  onStartPlan,
}: {
  data: AthletePayload;
  userName: string;
  onStartPlan: (planId: string) => void;
}) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [advancingRest, setAdvancingRest] = useState(false);
  const [programState, setProgramState] = useState(data.programState);
  const [recentPRs, setRecentPRs] = useState<RecentPR[]>([]);

  useEffect(() => {
    fetch("/api/progress/prs")
      .then((r) => r.json())
      .then((j: { prs?: RecentPR[] }) => {
        setRecentPRs((j.prs ?? []).slice(0, 3));
      })
      .catch(() => {/* non-fatal */});
  }, []);

  const startAdHoc = async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/workouts", { method: "POST" });
      const j = (await res.json()) as { id?: string; error?: string; message?: string };
      if (!res.ok) { toast.error(j.error ?? j.message ?? "Failed to start workout"); return; }
      if (j.id) router.push(`/log/${j.id}`);
    } catch {
      toast.error("Failed to start workout");
    } finally {
      setStarting(false);
    }
  };

  const startProgramWorkout = async (planId: string) => {
    setStarting(true);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });
      const j = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) { toast.error(j.error ?? "Failed to start workout"); return; }
      if (j.id) router.push(`/log/${j.id}`);
    } catch {
      toast.error("Failed to start workout");
    } finally {
      setStarting(false);
    }
  };

  const markRestDone = async () => {
    setAdvancingRest(true);
    try {
      const res = await fetch("/api/programs/advance", { method: "POST" });
      if (!res.ok) { toast.error("Failed to advance program"); return; }
      const next = await res.json() as { nextDay?: number };
      // Refresh program state
      const updated = await fetch("/api/programs/current");
      const j = await updated.json() as { programState?: ProgramState | null };
      setProgramState(j.programState ?? null);
      toast.success(`Rest day done — Day ${next.nextDay ?? "?"} next`);
    } catch {
      toast.error("Failed");
    } finally {
      setAdvancingRest(false);
    }
  };

  // Day labels for the 7-day ring row (index 0 = 6 days ago, index 6 = today)
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString("en-US", { weekday: "narrow" });
  });

  return (
    <div className="space-y-5 pb-10">

      {/* Hero: greeting + streak */}
      <div className="pt-1">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Hey, {userName.split(" ")[0]}
        </h1>
        {data.currentStreak > 0 ? (
          <p className="mt-1 text-base font-semibold text-primary">
            {data.currentStreak}-day streak 🔥
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Start a streak today</p>
        )}
      </div>

      {/* Level + progress */}
      <div className="rounded-xl bg-surface-low px-4 py-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-foreground">
            Level {data.level} — {data.levelName}
          </span>
          <span className="text-xs text-muted-foreground">
            {data.totalPoints.toLocaleString()} pts
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-high">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${data.progressPct}%` }}
          />
        </div>
        {data.nextLevelMin != null && (
          <p className="mt-1.5 text-right text-[11px] text-muted-foreground">
            {data.pointsToNext.toLocaleString()} to next level
          </p>
        )}
      </div>

      {/* Primary CTA — program-aware */}
      {programState ? (
        programState.isRestDay ? (
          /* Rest day card */
          <div className="rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-6 py-5 text-center">
            <p className="font-display text-xl font-bold uppercase tracking-wide text-zinc-500">
              Rest Day 🛌
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Day {programState.dayNumber} of {programState.totalDays} · {programState.programName}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Recovery is part of the program. Come back tomorrow.
            </p>
            <button
              type="button"
              onClick={markRestDone}
              disabled={advancingRest}
              className="mt-4 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition-colors active:bg-zinc-100 disabled:opacity-50"
            >
              {advancingRest ? "Saving…" : "Mark Rest Day Done →"}
            </button>
          </div>
        ) : (
          /* Program workout CTA */
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {programState.programName} · Day {programState.dayNumber} of {programState.totalDays}
            </p>
            <button
              type="button"
              onClick={() => programState.planId && startProgramWorkout(programState.planId)}
              disabled={starting || !programState.planId}
              className="flex min-h-[80px] w-full flex-col items-center justify-center gap-1 rounded-2xl bg-primary px-4 font-display shadow-lg transition-transform active:scale-95 disabled:opacity-60"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-primary-foreground/70">
                Start Today&apos;s Workout
              </span>
              <span className="text-lg font-black uppercase tracking-wide text-primary-foreground">
                {starting ? "Starting…" : programState.label}
              </span>
            </button>
            <button
              type="button"
              onClick={startAdHoc}
              disabled={starting}
              className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-600 transition-colors active:bg-zinc-50 disabled:opacity-60"
            >
              Start a different workout
            </button>
          </div>
        )
      ) : (
        /* No program — plain ad-hoc CTA */
        <button
          type="button"
          onClick={startAdHoc}
          disabled={starting}
          className="flex min-h-[72px] w-full items-center justify-center rounded-2xl bg-primary font-display text-xl font-black uppercase tracking-widest text-primary-foreground shadow-lg transition-transform active:scale-95 disabled:opacity-60"
        >
          {starting ? "Starting…" : "Start Workout"}
        </button>
      )}

      {/* 7-day rings */}
      <div className="flex justify-between gap-1">
        {data.last7Days.map((filled, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`h-8 w-8 rounded-full border-2 transition-colors ${
                filled
                  ? "border-volt bg-volt/20"
                  : "border-surface-high bg-transparent"
              }`}
            />
            <span className="text-[10px] text-muted-foreground">{dayLabels[i]}</span>
          </div>
        ))}
      </div>

      {/* Recent workouts */}
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Recent workouts
        </h2>
        {data.recentWorkouts.length === 0 ? (
          <p className="text-sm text-zinc-600">None yet — go start one</p>
        ) : (
          <ul className="m-0 space-y-2 p-0">
            {data.recentWorkouts.map((w) => (
              <WorkoutCard
                key={w.id}
                workout={w}
                href={`/log/${w.id}`}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Recent PRs */}
      {recentPRs.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Recent PRs
          </h2>
          <div className="space-y-2">
            {recentPRs.map((pr) => (
              <div
                key={pr.exerciseName}
                className="flex items-center justify-between rounded-xl bg-surface-low px-4 py-3"
              >
                <span className="truncate text-sm font-medium text-foreground">
                  {pr.exerciseName}
                </span>
                <span className="ml-3 shrink-0 text-sm font-semibold text-volt">
                  {pr.bestWeight > 0 ? `${pr.bestWeight} lbs` : `${pr.bestReps} reps`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badges — below the fold */}
      {data.recentBadges.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Badges
            </h2>
            <Link href="/profile" className="text-xs text-sky-500 hover:underline">
              View all
            </Link>
          </div>
          <div className="-mx-1 flex gap-3 overflow-x-auto pb-2">
            {data.recentBadges.map((b) => (
              <div
                key={`${b.type}-${b.title}`}
                className="min-w-[96px] shrink-0 rounded-lg border border-zinc-200 bg-white p-3 text-center"
              >
                <div className="text-2xl" aria-hidden>
                  {BADGE_EMOJI[b.type] ?? "⭐"}
                </div>
                <p className="mt-1 text-xs font-medium leading-tight text-zinc-200">
                  {b.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TrainerDashboardView({
  athletes,
}: {
  athletes: TrainerAthleteRow[];
}) {
  return (
    <div className="space-y-4 pb-10">
      <h2 className="text-lg font-semibold text-zinc-900">Your athletes</h2>
      {athletes.length === 0 ? (
        <p className="text-sm text-zinc-500">No assigned athletes yet.</p>
      ) : (
        <ul className="m-0 space-y-3 p-0">
          {athletes.map((a) => {
            const stale = (a.daysSinceWorkout ?? 0) >= 7;
            return (
              <li key={a.id} className="list-none">
                <Card
                  className={`border-zinc-200 bg-white ${
                    stale ? "border-amber-800/60" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-zinc-900">
                            {a.name}
                          </span>
                          {stale && (
                            <span
                              className="inline-flex items-center gap-1 text-amber-500"
                              title="No workout in 7+ days"
                            >
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              <span className="text-xs">Inactive</span>
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-zinc-500">
                          Last workout:{" "}
                          {a.lastWorkoutDate
                            ? new Date(a.lastWorkoutDate).toLocaleDateString()
                            : "Never"}
                        </p>
                        <p className="text-sm text-zinc-500">
                          Streak: {a.streak}d
                          {a.unreadMedia > 0 && (
                            <span className="text-sky-400">
                              {" "}
                              · {a.unreadMedia} to review
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="mt-3 min-h-[44px] w-full border-zinc-300 bg-zinc-900 hover:bg-zinc-200"
                      asChild
                    >
                      <Link href={`/plans/new?athlete=${a.id}`}>
                        Assign workout
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
