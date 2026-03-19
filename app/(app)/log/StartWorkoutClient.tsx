"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dumbbell, Calendar } from "lucide-react";
import { toast } from "sonner";
import { WorkoutCard } from "@/components/workout/WorkoutCard";

interface RecentWorkout {
  id: string;
  date: string;
  duration: number;
  exerciseCount: number;
  totalVolume?: number;
}

interface AssignedPlan {
  id: string;
  name: string;
  scheduled_date: string | null;
  exercise_count: number;
}

interface StartWorkoutClientProps {
  athleteId: string;
  recentWorkouts: RecentWorkout[];
  assignedPlans: AssignedPlan[];
}

export function StartWorkoutClient({
  athleteId,
  recentWorkouts,
  assignedPlans,
}: StartWorkoutClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPlanSheet, setShowPlanSheet] = useState(false);

  useEffect(() => {
    const openPlan = searchParams.get("openPlan");
    if (openPlan === "1" || openPlan === "true") {
      setShowPlanSheet(true);
    }
  }, [searchParams]);

  const handleStartAdHoc = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workouts", { method: "POST" });
      const body = await res.json();

      if (!res.ok) {
        console.error("[StartWorkout] API error:", {
          status: res.status,
          code: body.code,
          message: body.message,
          details: body.details,
        });
        toast.error(body.message ?? "Failed to start workout");
        setLoading(false);
        return;
      }

      if (body.id) router.push(`/log/${body.id}`);
    } catch (err) {
      console.error("[StartWorkout] Fetch error:", err);
      toast.error("Failed to start workout");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleStartAdHoc}
          disabled={loading}
          className="flex min-h-[120px] min-w-0 touch-manipulation flex-col items-center justify-center gap-2 rounded-lg border-2 border-primary bg-primary/5 p-6 transition-colors active:scale-[0.98] disabled:opacity-50"
        >
          <Dumbbell className="h-10 w-10 text-primary" />
          <span className="text-lg font-semibold">Start Ad Hoc Workout</span>
          <span className="text-sm text-muted-foreground">
            Add exercises as you go
          </span>
        </button>

        <button
          type="button"
          onClick={() => setShowPlanSheet(true)}
          disabled={loading}
          className="flex min-h-[120px] min-w-0 touch-manipulation flex-col items-center justify-center gap-2 rounded-lg border-2 border-primary bg-primary/5 p-6 transition-colors active:scale-[0.98] disabled:opacity-50"
        >
          <Calendar className="h-10 w-10 text-primary" />
          <span className="text-lg font-semibold">Start From Plan</span>
          <span className="text-sm text-muted-foreground">
            Use a prescribed workout
          </span>
        </button>
      </div>

      <Sheet open={showPlanSheet} onOpenChange={setShowPlanSheet}>
        <SheetContent side="bottom" className="max-h-[85vh]">
          <SheetHeader>
            <SheetTitle>Choose a plan</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {assignedPlans.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No plans assigned to you
              </p>
            ) : (
              <ul className="space-y-2">
                {assignedPlans.map((plan) => (
                  <li key={plan.id}>
                    <button
                      type="button"
                      className="flex w-full min-h-[44px] flex-col items-start rounded-lg border bg-card px-4 py-3 text-left transition-colors active:bg-accent"
                      onClick={async () => {
                        setShowPlanSheet(false);
                        setLoading(true);
                        try {
                          const res = await fetch("/api/workouts", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ plan_id: plan.id }),
                          });
                          const body = await res.json();
                          if (!res.ok) {
                            toast.error(body.error ?? "Failed to start workout");
                            return;
                          }
                          router.push(`/log/${body.id}`);
                        } catch {
                          toast.error("Failed to start workout");
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      <span className="font-medium">{plan.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {plan.scheduled_date
                          ? new Date(plan.scheduled_date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })
                          : "No date"}{" "}
                        · {plan.exercise_count} exercises
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {recentWorkouts.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Recent Workouts</h2>
          <ul className="space-y-2">
            {recentWorkouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
