"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type WorkoutLog = Database["public"]["Tables"]["workout_logs"]["Row"];
type ExerciseLog = Database["public"]["Tables"]["exercise_logs"]["Row"];
type Exercise = Database["public"]["Tables"]["exercises"]["Row"];

export interface PrescribedValues {
  sets: number | null;
  reps: number | null;
  weight_lbs: number | null;
  duration_seconds: number | null;
}

export interface ExerciseInWorkout {
  exercise: Exercise;
  logs: ExerciseLog[];
  prescribed?: PrescribedValues;
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

    const planId = (w as WorkoutLog).plan_id;
    let result: ExerciseInWorkout[] = [];

    if (logs?.length) {
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
      for (const eid of exerciseIds) {
        const ex = exMap.get(eid);
        if (ex) result.push({ exercise: ex, logs: byExercise.get(eid) ?? [] });
      }
    }

    if (planId) {
      const { data: planEx } = await supabase
        .from("workout_plan_exercises")
        .select("exercise_id, prescribed_sets, prescribed_reps, prescribed_weight_lbs, prescribed_duration_seconds")
        .eq("plan_id", planId)
        .order("order_index");
      const prescribedByEx = new Map(
        (planEx ?? []).map((pe) => {
          const row = pe as {
            exercise_id: string;
            prescribed_sets: number | null;
            prescribed_reps: number | null;
            prescribed_weight_lbs: number | null;
            prescribed_duration_seconds: number | null;
          };
          const w = row.prescribed_weight_lbs;
          return [
            row.exercise_id,
            {
              sets: row.prescribed_sets,
              reps: row.prescribed_reps,
              weight_lbs: w != null ? Number(w) : null,
              duration_seconds: row.prescribed_duration_seconds,
            },
          ] as const;
        })
      );
      for (const e of result) {
        const p = prescribedByEx.get(e.exercise.id);
        if (p) e.prescribed = p;
      }

      const loggedIds = new Set(result.map((e) => e.exercise.id));
      const planExIds = (planEx ?? []).map((pe) => (pe as { exercise_id: string }).exercise_id);
      const { data: planExData } = planExIds.length
        ? await supabase.from("exercises").select("*").in("id", planExIds)
        : { data: [] };
      const planExMap = new Map((planExData ?? []).map((e) => [e.id, e as Exercise]));
      for (const eid of planExIds) {
        if (loggedIds.has(eid)) continue;
        const ex = planExMap.get(eid);
        if (ex) {
          const p = prescribedByEx.get(eid);
          result.push({ exercise: ex, logs: [], prescribed: p });
        }
      }

      const byId = new Map(result.map((e) => [e.exercise.id, e]));
      const ordered: ExerciseInWorkout[] = [];
      for (const eid of planExIds) {
        const e = byId.get(eid);
        if (e) ordered.push(e);
      }
      for (const e of result) {
        if (!planExIds.includes(e.exercise.id)) ordered.push(e);
      }
      result = ordered;
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
