"use client";

import { useEffect, useRef, useState } from "react";
import type { ProgressRange } from "@/lib/progressRange";
import {
  useLoggedExercises,
  useExerciseProgress,
  useWorkoutProgress,
  usePRs,
} from "@/hooks/useProgress";
import { RangeSelector } from "@/components/progress/RangeSelector";
import { ExerciseCharts } from "@/components/progress/ExerciseCharts";
import { WorkoutCharts } from "@/components/progress/WorkoutCharts";
import { PRList } from "@/components/progress/PRList";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export function ProgressDashboard() {
  const [range, setRange] = useState<ProgressRange>("30d");
  const { exercises, isLoading: exercisesLoading } = useLoggedExercises();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null
  );
  const initialized = useRef(false);

  useEffect(() => {
    if (exercisesLoading || exercises.length === 0) return;
    if (!initialized.current) {
      initialized.current = true;
      const latest = exercises.reduce((a, b) =>
        a.lastLoggedAt > b.lastLoggedAt ? a : b
      );
      setSelectedExerciseId(latest.id);
    }
  }, [exercisesLoading, exercises]);

  const { data: exerciseData, isLoading: exerciseChartLoading } =
    useExerciseProgress(selectedExerciseId, range);
  const { byDate, weekly, isLoading: workoutLoading } =
    useWorkoutProgress(range);
  const { prs, isLoading: prsLoading } = usePRs();

  return (
    <div className="mx-auto max-w-lg space-y-8 pb-8">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-zinc-50">Progress</h1>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-200">
          Exercise progress
        </h2>
        {exercisesLoading ? (
          <Skeleton className="h-11 w-full rounded-md" />
        ) : exercises.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Log workouts to track exercise progress here.
          </p>
        ) : (
          <Select
            value={selectedExerciseId ?? undefined}
            onValueChange={setSelectedExerciseId}
          >
            <SelectTrigger className="min-h-[44px] w-full">
              <SelectValue placeholder="Select exercise" />
            </SelectTrigger>
            <SelectContent>
              {exercises.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {!exercisesLoading && exercises.length > 0 && selectedExerciseId && (
          <ExerciseCharts
            data={exerciseData}
            isLoading={exerciseChartLoading}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-200">
          Workout summary
        </h2>
        <WorkoutCharts
          byDate={byDate}
          weekly={weekly}
          isLoading={workoutLoading}
        />
      </section>

      <section>
        <PRList prs={prs} isLoading={prsLoading} />
      </section>
    </div>
  );
}
