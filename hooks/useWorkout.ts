"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type WorkoutLog = Database["public"]["Tables"]["workout_logs"]["Row"];
type ExerciseLog = Database["public"]["Tables"]["exercise_logs"]["Row"];
type Exercise = Database["public"]["Tables"]["exercises"]["Row"];

export interface ExerciseInWorkout {
  exercise: Exercise;
  logs: ExerciseLog[];
}

export function useWorkout(workoutId: string | null, athleteId: string) {
  const [workout, setWorkout] = useState<WorkoutLog | null>(null);
  const [exercises, setExercises] = useState<ExerciseInWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [startedAt, setStartedAt] = useState<Date | null>(null);

  const supabase = createClient();

  const fetchWorkout = useCallback(async () => {
    if (!workoutId) return;
    const { data: w, error: we } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("id", workoutId)
      .single();
    if (we || !w) {
      setLoading(false);
      return;
    }
    setWorkout(w as WorkoutLog);
    setStartedAt(new Date((w as WorkoutLog).started_at));

    const { data: logs } = await supabase
      .from("exercise_logs")
      .select("*")
      .eq("workout_log_id", workoutId)
      .order("exercise_id")
      .order("set_number");

    if (!logs?.length) {
      setExercises([]);
      setLoading(false);
      return;
    }

    const exerciseIds = [...new Set((logs as ExerciseLog[]).map((l) => l.exercise_id))];
    const { data: exData } = await supabase
      .from("exercises")
      .select("*")
      .in("id", exerciseIds);

    const exMap = new Map((exData ?? []).map((e) => [e.id, e as Exercise]));
    const byExercise = new Map<string, ExerciseLog[]>();
    for (const log of logs as ExerciseLog[]) {
      if (!byExercise.has(log.exercise_id)) byExercise.set(log.exercise_id, []);
      byExercise.get(log.exercise_id)!.push(log);
    }

    const result: ExerciseInWorkout[] = [];
    for (const eid of exerciseIds) {
      const ex = exMap.get(eid);
      if (ex) result.push({ exercise: ex, logs: byExercise.get(eid) ?? [] });
    }
    setExercises(result);
    setLoading(false);
  }, [workoutId, supabase]);

  useEffect(() => {
    fetchWorkout();
  }, [fetchWorkout]);

  const addExercise = useCallback(
    async (exercise: Exercise) => {
      if (!workoutId) return;
      const alreadyAdded = exercises.some((e) => e.exercise.id === exercise.id);
      if (alreadyAdded) return;
      setExercises((prev) => [...prev, { exercise, logs: [] }]);
    },
    [workoutId, exercises]
  );

  const addSet = useCallback(
    async (
      exerciseId: string,
      payload: {
        reps: number | null;
        weightLbs: number | null;
        durationSeconds: number | null;
        distanceMeters: number | null;
        notes: string | null;
      },
      loggedVia: "manual" | "voice"
    ) => {
      if (!workoutId) return;
      const entry = exercises.find((e) => e.exercise.id === exerciseId);
      const nextSetNumber = (entry?.logs.length ?? 0) + 1;

      const { error } = await supabase.from("exercise_logs").insert({
        workout_log_id: workoutId,
        exercise_id: exerciseId,
        set_number: nextSetNumber,
        reps: payload.reps,
        weight_lbs: payload.weightLbs,
        duration_seconds: payload.durationSeconds,
        distance_meters: payload.distanceMeters,
        notes: payload.notes,
        logged_via: loggedVia,
      });

      if (!error) await fetchWorkout();
    },
    [workoutId, exercises, supabase, fetchWorkout]
  );

  const completeWorkout = useCallback(
    async (perceivedEffort: number | null, overallNotes: string | null) => {
      if (!workoutId) return;
      await supabase
        .from("workout_logs")
        .update({
          completed_at: new Date().toISOString(),
          perceived_effort: perceivedEffort,
          overall_notes: overallNotes,
        })
        .eq("id", workoutId);
    },
    [workoutId, supabase]
  );

  return {
    workout,
    exercises,
    loading,
    startedAt,
    addExercise,
    addSet,
    completeWorkout,
    refetch: fetchWorkout,
  };
}
