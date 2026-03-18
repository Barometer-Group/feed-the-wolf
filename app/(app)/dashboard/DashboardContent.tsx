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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Welcome, {userName}
          </h1>
          <Badge variant="secondary" className="mt-1 capitalize">
            {userRole}
          </Badge>
        </div>
        {userRole === "admin" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">View as</span>
            <Select
              value={viewAs}
              onValueChange={(v) => setViewAs(v as Role)}
            >
              <SelectTrigger className="w-[140px] border-zinc-700 bg-zinc-900">
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

      {showAdminPanel && (
        <Card className="border-zinc-800 bg-zinc-950/50">
          <CardHeader>
            <CardTitle className="text-zinc-100">Admin</CardTitle>
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
              onStartPlan={startPlan}
            />
          ) : (
            <p className="text-sm text-zinc-400">No dashboard data.</p>
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
      <Skeleton className="h-36 w-full rounded-xl bg-zinc-800" />
      <Skeleton className="h-28 w-full rounded-xl bg-zinc-800" />
      <Skeleton className="h-16 w-full rounded-xl bg-zinc-800" />
      <div className="flex gap-2">
        <Skeleton className="h-20 flex-1 rounded-lg bg-zinc-800" />
        <Skeleton className="h-20 flex-1 rounded-lg bg-zinc-800" />
        <Skeleton className="h-20 flex-1 rounded-lg bg-zinc-800" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl bg-zinc-800" />
    </div>
  );
}

function TrainerSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl bg-zinc-800" />
      ))}
    </div>
  );
}

function AthleteDashboardView({
  data,
  onStartPlan,
}: {
  data: AthletePayload;
  onStartPlan: (planId: string) => void;
}) {
  return (
    <div className="space-y-6 pb-10">
      <Card className="border-zinc-800 bg-zinc-950/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-zinc-100">
            Level {data.level} — {data.levelName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-3xl font-bold text-sky-400">
            {data.totalPoints.toLocaleString()}{" "}
            <span className="text-base font-normal text-zinc-500">pts</span>
          </p>
          {data.nextLevelMin != null && (
            <>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all"
                  style={{ width: `${data.progressPct}%` }}
                />
              </div>
              <p className="text-sm text-zinc-400">
                {data.pointsToNext.toLocaleString()} pts to next level
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-950/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-zinc-100">Streak</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between text-sm text-zinc-300">
            <span>Current: {data.currentStreak} days</span>
            <span className="text-zinc-500">Best: {data.longestStreak}</span>
          </div>
          <div className="mt-3 flex justify-between gap-1.5">
            {data.last7Days.map((filled, i) => (
              <div
                key={i}
                className={`h-9 min-w-0 flex-1 rounded-full ${
                  filled ? "bg-sky-600" : "bg-zinc-800"
                }`}
                title={filled ? "Workout logged" : "Rest day"}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold text-zinc-100">Recent badges</h2>
          <Link
            href="/profile"
            className="text-sm text-sky-400 hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="-mx-1 flex gap-3 overflow-x-auto pb-2">
          {data.recentBadges.length === 0 ? (
            <p className="text-sm text-zinc-500">No badges yet</p>
          ) : (
            data.recentBadges.map((b) => (
              <div
                key={`${b.type}-${b.title}`}
                className="min-w-[104px] shrink-0 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-center"
              >
                <div className="text-2xl" aria-hidden>
                  {BADGE_EMOJI[b.type] ?? "⭐"}
                </div>
                <p className="mt-1 text-xs font-medium leading-tight text-zinc-200">
                  {b.title}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card className="border-zinc-800 bg-zinc-950/50">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-zinc-100">
              {data.weekWorkouts}
            </p>
            <p className="text-[11px] text-zinc-500">This week</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-950/50">
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-zinc-100">
              {data.weekVolume > 999
                ? `${(data.weekVolume / 1000).toFixed(1)}k`
                : data.weekVolume.toLocaleString()}
            </p>
            <p className="text-[11px] text-zinc-500">Vol (lbs)</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-950/50">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-zinc-100">
              {data.totalWorkouts}
            </p>
            <p className="text-[11px] text-zinc-500">All time</p>
          </CardContent>
        </Card>
      </div>

      {data.nextPlan && (
        <Card className="border-sky-900/40 bg-sky-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-zinc-100">
              Next workout
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-semibold text-zinc-100">{data.nextPlan.name}</p>
            <p className="text-sm text-zinc-400">
              {data.nextPlan.scheduled_date
                ? new Date(data.nextPlan.scheduled_date).toLocaleDateString(
                    "en-US",
                    { weekday: "short", month: "short", day: "numeric" }
                  )
                : "Anytime"}{" "}
              · {data.nextPlan.exercise_count} exercises
            </p>
            <Button
              className="min-h-[44px] w-full bg-sky-600 hover:bg-sky-500"
              onClick={() => onStartPlan(data.nextPlan!.id)}
            >
              Start
            </Button>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-3 font-semibold text-zinc-100">Recent workouts</h2>
        {data.recentWorkouts.length === 0 ? (
          <p className="text-sm text-zinc-500">None yet</p>
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
      <h2 className="text-lg font-semibold text-zinc-100">Your athletes</h2>
      {athletes.length === 0 ? (
        <p className="text-sm text-zinc-500">No assigned athletes yet.</p>
      ) : (
        <ul className="m-0 space-y-3 p-0">
          {athletes.map((a) => {
            const stale = (a.daysSinceWorkout ?? 0) >= 7;
            return (
              <li key={a.id} className="list-none">
                <Card
                  className={`border-zinc-800 bg-zinc-950/50 ${
                    stale ? "border-amber-800/60" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-zinc-100">
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
                        <p className="mt-1 text-sm text-zinc-400">
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
                      className="mt-3 min-h-[44px] w-full border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
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
