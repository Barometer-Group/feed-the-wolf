"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/types";

type Exercise = Database["public"]["Tables"]["exercises"]["Row"];

export type PlanExerciseInputExercise = Pick<Exercise, "id" | "name" | "category">;

export interface PlanExerciseInput {
  exercise: PlanExerciseInputExercise;
  prescribed_sets: number | null;
  prescribed_reps: number | null;
  prescribed_weight_lbs: number | null;
  prescribed_duration_seconds: number | null;
  notes: string | null;
}

interface ExerciseRowProps {
  item: PlanExerciseInput;
  index: number;
  onUpdate: (index: number, updates: Partial<PlanExerciseInput>) => void;
  onRemove: (index: number) => void;
}

export function ExerciseRow({ item, index, onUpdate, onRemove }: ExerciseRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `ex-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-2 rounded border bg-card p-3 ${isDragging ? "opacity-50" : ""}`}
    >
      <button
        type="button"
        className="mt-2 flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded border bg-muted"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>
      <div className="min-w-0 flex-1 space-y-2">
        <span className="font-medium">{item.exercise.name}</span>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Sets</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={item.prescribed_sets ?? ""}
              onChange={(e) =>
                onUpdate(index, {
                  prescribed_sets: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Reps</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={item.prescribed_reps ?? ""}
              onChange={(e) =>
                onUpdate(index, {
                  prescribed_reps: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Weight (lbs)</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={item.prescribed_weight_lbs ?? ""}
              onChange={(e) =>
                onUpdate(index, {
                  prescribed_weight_lbs: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Duration (sec)</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={item.prescribed_duration_seconds ?? ""}
              onChange={(e) =>
                onUpdate(index, {
                  prescribed_duration_seconds: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Notes</Label>
          <Textarea
            value={item.notes ?? ""}
            onChange={(e) => onUpdate(index, { notes: e.target.value || null })}
            placeholder="Instructions..."
            className="min-h-[60px]"
          />
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="mt-1 min-h-[44px] min-w-[44px] shrink-0 text-destructive"
        onClick={() => onRemove(index)}
      >
        <X className="h-5 w-5" />
      </Button>
    </div>
  );
}
