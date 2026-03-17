"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface PlanExercise {
  id: string;
  exercise_id: string;
  order_index: number;
  prescribed_sets: number | null;
  prescribed_reps: number | null;
  prescribed_weight_lbs: number | null;
  prescribed_duration_seconds: number | null;
  notes: string | null;
  exercise: { id: string; name: string; category: string } | null;
}

interface PlanDetailClientProps {
  plan: {
    id: string;
    name: string;
    description: string | null;
    scheduled_date: string | null;
    is_template: boolean;
    created_by: string;
    athlete_id: string | null;
    athlete_name: string | null;
    plan_exercises: PlanExercise[];
  };
  currentUserId: string;
}

export function PlanDetailClient({ plan, currentUserId }: PlanDetailClientProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canEdit = plan.created_by === currentUserId;
  const dateStr = plan.scheduled_date
    ? new Date(plan.scheduled_date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : null;

  const handleStartWorkout = async () => {
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
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/plans/${plan.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        toast.error(body.error ?? "Failed to delete plan");
        return;
      }
      setShowDeleteConfirm(false);
      router.push("/plans");
    } catch {
      toast.error("Failed to delete plan");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <div className="flex flex-wrap items-start gap-2">
          <h1 className="text-2xl font-bold">{plan.name}</h1>
          {plan.is_template && (
            <Badge variant="secondary">Template</Badge>
          )}
        </div>
        {dateStr && (
          <p className="text-muted-foreground">{dateStr}</p>
        )}
        {plan.description && (
          <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
        )}
        {plan.athlete_name && (
          <p className="mt-1 text-sm text-muted-foreground">
            Assigned to {plan.athlete_name}
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-2 font-semibold">Exercises</h2>
        {plan.plan_exercises.length === 0 ? (
          <p className="text-sm text-muted-foreground">No exercises</p>
        ) : (
          <ul className="space-y-2">
            {plan.plan_exercises.map((pe) => {
              const sets = pe.prescribed_sets ?? "-";
              const reps = pe.prescribed_reps ?? "-";
              const weight =
                pe.prescribed_weight_lbs != null ? `${pe.prescribed_weight_lbs} lbs` : "";
              const dur =
                pe.prescribed_duration_seconds != null
                  ? `${pe.prescribed_duration_seconds}s`
                  : "";
              const main = `${sets}×${reps}${weight ? ` @ ${weight}` : ""}${dur ? `, ${dur}` : ""}`;
              return (
                <li
                  key={pe.id}
                  className="rounded border bg-card p-3"
                >
                  <span className="font-medium">{pe.exercise?.name ?? "Unknown"}</span>
                  <p className="text-sm text-muted-foreground">{main}</p>
                  {pe.notes && (
                    <p className="mt-1 text-sm text-muted-foreground">{pe.notes}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Button
          className="min-h-[44px] w-full"
          onClick={handleStartWorkout}
        >
          Start This Workout
        </Button>
        {canEdit && (
          <>
            <Link href={`/plans/${plan.id}/edit`}>
              <Button variant="outline" className="min-h-[44px] w-full">
                Edit Plan
              </Button>
            </Link>
            <Button
              variant="destructive"
              className="min-h-[44px] w-full"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Plan
            </Button>
          </>
        )}
      </div>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete plan?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
