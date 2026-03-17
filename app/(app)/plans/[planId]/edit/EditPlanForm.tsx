"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExerciseSearchSheet } from "@/components/workout/ExerciseSearchSheet";
import { DraggablePlanExerciseList } from "@/components/plans/DraggablePlanExerciseList";
import type { PlanExerciseInput } from "@/components/plans/ExerciseRow";
import type { Database } from "@/lib/supabase/types";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type Exercise = Database["public"]["Tables"]["exercises"]["Row"];

interface EditPlanFormProps {
  planId: string;
  initialData: {
    name: string;
    description: string;
    scheduled_date: string;
    is_template: boolean;
    athlete_id: string;
    plan_exercises: PlanExerciseInput[];
  };
  athletes: { id: string; full_name: string }[];
  exercises: Exercise[];
}

export function EditPlanForm({
  planId,
  initialData,
  athletes,
  exercises,
}: EditPlanFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData.name);
  const [description, setDescription] = useState(initialData.description);
  const [scheduledDate, setScheduledDate] = useState(
    initialData.scheduled_date ? initialData.scheduled_date.slice(0, 10) : ""
  );
  const [isTemplate, setIsTemplate] = useState(initialData.is_template);
  const [athleteId, setAthleteId] = useState(initialData.athlete_id);
  const [planExercises, setPlanExercises] = useState<PlanExerciseInput[]>(
    initialData.plan_exercises
  );
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAddExercise = (exercise: Exercise) => {
    if (planExercises.some((e) => e.exercise.id === exercise.id)) return;
    setPlanExercises((prev) => [
      ...prev,
      {
        exercise,
        prescribed_sets: null,
        prescribed_reps: null,
        prescribed_weight_lbs: null,
        prescribed_duration_seconds: null,
        notes: null,
      },
    ]);
    setShowExerciseSearch(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Plan name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/plans/${planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          scheduled_date: scheduledDate || null,
          is_template: isTemplate,
          athlete_id: athleteId || null,
          exercises: planExercises.map((e) => ({
            exercise_id: e.exercise.id,
            prescribed_sets: e.prescribed_sets,
            prescribed_reps: e.prescribed_reps,
            prescribed_weight_lbs: e.prescribed_weight_lbs,
            prescribed_duration_seconds: e.prescribed_duration_seconds,
            notes: e.notes,
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Failed to update plan");
        return;
      }
      router.push(`/plans/${planId}`);
    } catch {
      toast.error("Failed to update plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="plan-name">Plan name *</Label>
          <Input
            id="plan-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="plan-desc">Description</Label>
          <Textarea
            id="plan-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="plan-date">Scheduled date</Label>
          <Input
            id="plan-date"
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="plan-template"
            checked={isTemplate}
            onChange={(e) => setIsTemplate(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="plan-template">Save as template</Label>
        </div>
        {athletes.length > 0 && (
          <div>
            <Label>Assign to athlete</Label>
            <Select value={athleteId} onValueChange={setAthleteId}>
              <SelectTrigger>
                <SelectValue placeholder="Select athlete (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {athletes.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>Exercises</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            onClick={() => setShowExerciseSearch(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Exercise
          </Button>
        </div>
        {planExercises.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No exercises — add your first one
          </p>
        ) : (
          <DraggablePlanExerciseList
            items={planExercises}
            onItemsChange={setPlanExercises}
          />
        )}
      </div>

      <ExerciseSearchSheet
        open={showExerciseSearch}
        onOpenChange={setShowExerciseSearch}
        exercises={exercises}
        onSelect={handleAddExercise}
      />

      <Button
        className="min-h-[44px] w-full"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
