"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import type { ProgressRange } from "@/lib/progressRange";
import type { ExerciseProgressDay, PRRow } from "@/lib/progressTypes";

export interface LoggedExercise {
  id: string;
  name: string;
  lastLoggedAt: string;
}

export interface WorkoutByDate {
  date: string;
  durationMinutes: number;
}

export interface WeeklyCount {
  weekStart: string;
  weekLabel: string;
  count: number;
}

function useAsyncProgress<T>(
  cacheKey: string,
  load: () => Promise<{ ok: true; value: T } | { ok: false }>
): { data: T | null; isLoading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    void (async () => {
      const result = await loadRef.current();
      if (cancelled) return;
      if (!result.ok) {
        setError("Failed to load");
        toast.error("Failed to load progress data");
        setData(null);
      } else {
        setData(result.value);
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [cacheKey, version]);

  return { data, isLoading, error, refetch };
}

export function useLoggedExercises() {
  const load = useCallback(async () => {
    const res = await fetch("/api/progress/exercises");
    if (!res.ok) return { ok: false as const };
    const json = (await res.json()) as { exercises?: LoggedExercise[] };
    return { ok: true as const, value: json.exercises ?? [] };
  }, []);

  const { data, isLoading, error, refetch } = useAsyncProgress("exercises", load);
  return {
    exercises: data ?? [],
    isLoading,
    error,
    refetch,
  };
}

export function useExerciseProgress(exerciseId: string | null, range: ProgressRange) {
  const cacheKey = `${exerciseId ?? "none"}-${range}`;
  const load = useCallback(async () => {
    if (!exerciseId) {
      return { ok: true as const, value: [] as ExerciseProgressDay[] };
    }
    const res = await fetch(
      `/api/progress/exercise?exerciseId=${encodeURIComponent(exerciseId)}&range=${range}`
    );
    if (!res.ok) return { ok: false as const };
    const json = (await res.json()) as { data?: ExerciseProgressDay[] };
    return { ok: true as const, value: json.data ?? [] };
  }, [exerciseId, range]);

  const { data, isLoading, error, refetch } = useAsyncProgress(cacheKey, load);
  return {
    data: data ?? [],
    isLoading,
    error,
    refetch,
  };
}

export function useWorkoutProgress(range: ProgressRange) {
  const load = useCallback(async () => {
    const res = await fetch(`/api/progress/workouts?range=${range}`);
    if (!res.ok) return { ok: false as const };
    const json = (await res.json()) as {
      byDate?: WorkoutByDate[];
      weekly?: WeeklyCount[];
    };
    return {
      ok: true as const,
      value: {
        byDate: json.byDate ?? [],
        weekly: json.weekly ?? [],
      },
    };
  }, [range]);

  const { data, isLoading, error, refetch } = useAsyncProgress(
    `workouts-${range}`,
    load
  );
  return {
    byDate: data?.byDate ?? [],
    weekly: data?.weekly ?? [],
    isLoading,
    error,
    refetch,
  };
}

export function usePRs() {
  const load = useCallback(async () => {
    const res = await fetch("/api/progress/prs");
    if (!res.ok) return { ok: false as const };
    const json = (await res.json()) as { prs?: PRRow[] };
    return { ok: true as const, value: json.prs ?? [] };
  }, []);

  const { data, isLoading, error, refetch } = useAsyncProgress("prs", load);
  return {
    prs: data ?? [],
    isLoading,
    error,
    refetch,
  };
}
