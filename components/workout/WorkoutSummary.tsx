"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/lib/supabase/types";

type ExerciseLog = Database["public"]["Tables"]["exercise_logs"]["Row"];
type Exercise = Database["public"]["Tables"]["exercises"]["Row"];

interface ExerciseWithLogs {
  exercise: Exercise;
  logs: ExerciseLog[];
}

interface WorkoutSummaryProps {
  durationMinutes: number;
  totalVolume: number;
  exerciseCount: number;
  setCount: number;
  exercisesWithLogs: ExerciseWithLogs[];
  onSaveAndFinish: (perceivedEffort: number | null, overallNotes: string | null) => Promise<void>;
}

export function WorkoutSummary({
  durationMinutes,
  totalVolume,
  exerciseCount,
  setCount,
  exercisesWithLogs,
  onSaveAndFinish,
}: WorkoutSummaryProps) {
  const [effort, setEffort] = useState<number>(5);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveAndFinish(effort, notes.trim() || null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background p-4">
      <h2 className="mb-4 text-2xl font-bold">Workout Complete</h2>

      <Card className="mb-4">
        <CardHeader>
          <h3 className="text-lg font-semibold">Summary</h3>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Duration: {durationMinutes} min</p>
          <p>Total volume: {totalVolume.toLocaleString()} lbs</p>
          <p>Exercises: {exerciseCount}</p>
          <p>Sets: {setCount}</p>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <h3 className="text-lg font-semibold">Exercises</h3>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {exercisesWithLogs.map(({ exercise, logs }) => (
              <li key={exercise.id} className="text-sm">
                <span className="font-medium">{exercise.name}</span>
                <span className="ml-2 text-muted-foreground">
                  {logs.length} set{logs.length !== 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <h3 className="text-lg font-semibold">How hard was that?</h3>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={10}
              value={effort}
              onChange={(e) => setEffort(parseInt(e.target.value, 10))}
              className="flex-1"
            />
            <span className="w-8 text-sm font-medium">{effort}</span>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4">
        <Label htmlFor="workout-notes">Overall notes</Label>
        <Textarea
          id="workout-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional"
          className="mt-1"
        />
      </div>

      <Button
        className="min-h-[44px] w-full"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save & Finish"}
      </Button>
    </div>
  );
}
