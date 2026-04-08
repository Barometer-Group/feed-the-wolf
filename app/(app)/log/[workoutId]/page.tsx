"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

import { Plus, Timer } from "lucide-react";
import { WorkoutSummary } from "@/components/workout/WorkoutSummary";
import { ExerciseSearchSheet } from "@/components/workout/ExerciseSearchSheet";
import { useWorkout } from "@/hooks/useWorkout";
import { showBadgeToast } from "@/components/gamification/BadgeToast";
import { showPRToast } from "@/components/gamification/PRToast";
import { triggerConfetti } from "@/components/gamification/Confetti";

type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
type ExerciseLog = Database["public"]["Tables"]["exercise_logs"]["Row"];

type ExerciseUIState = {
  reps: string;
  weight: string;
  /** unix ms when rest ends, null = not resting */
  restEndsAt: number | null;
  savingSet: boolean;
};

function emptyUIState(): ExerciseUIState {
  return { reps: "", weight: "", restEndsAt: null, savingSet: false };
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatSetLine(log: ExerciseLog): string {
  const parts: string[] = [];
  if (log.reps != null) parts.push(`${log.reps} reps`);
  if (log.weight_lbs != null) parts.push(`@ ${Number(log.weight_lbs)} lbs`);
  return parts.length ? parts.join(" ") : "—";
}

function playBeep() {
  try {
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 440;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    /* ignore */
  }
}

const REST_SECONDS = 60;

export default function ActiveWorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const workoutId = params?.workoutId as string | undefined;

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [exerciseLibrary, setExerciseLibrary] = useState<Exercise[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [exerciseUIStates, setExerciseUIStates] = useState<Record<string, ExerciseUIState>>({});
  const [now, setNow] = useState(Date.now());
  const prToastKeysRef = useRef<Set<string>>(new Set());

  const { workout, exercises, loading, startedAt, addExercise, addSet, completeWorkout } =
    useWorkout(workoutId ?? null, athleteId ?? "");

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setAthleteId(user.id);
    });
  }, [supabase]);

  // Exercise library
  useEffect(() => {
    supabase
      .from("exercises")
      .select("id, name, category")
      .then(({ data }) => setExerciseLibrary((data ?? []) as Exercise[]));
  }, [supabase]);

  // Clock + rest timer cleanup
  useEffect(() => {
    const id = setInterval(() => {
      const nowMs = Date.now();
      setNow(nowMs);
      setExerciseUIStates((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const eid of Object.keys(next)) {
          const s = next[eid];
          if (s.restEndsAt != null && nowMs >= s.restEndsAt) {
            next[eid] = { ...s, restEndsAt: null };
            changed = true;
            playBeep();
          }
        }
        return changed ? next : prev;
      });
    }, 500);
    return () => clearInterval(id);
  }, []);

  const elapsedSeconds = startedAt
    ? Math.floor((now - startedAt.getTime()) / 1000)
    : 0;

  const patchUIState = useCallback(
    (exerciseId: string, patch: Partial<ExerciseUIState>) => {
      setExerciseUIStates((prev) => ({
        ...prev,
        [exerciseId]: { ...(prev[exerciseId] ?? emptyUIState()), ...patch },
      }));
    },
    []
  );

  const getUIState = (exerciseId: string): ExerciseUIState =>
    exerciseUIStates[exerciseId] ?? emptyUIState();

  const handleAddExercise = useCallback(
    (exercise: Exercise) => {
      addExercise(exercise);
      setActiveExerciseId(exercise.id);
      setExerciseUIStates((prev) =>
        prev[exercise.id] ? prev : { ...prev, [exercise.id]: emptyUIState() }
      );
    },
    [addExercise]
  );

  const saveSet = useCallback(
    async (exerciseId: string, reps: number | null, weight: number | null) => {
      if (!reps && !weight) {
        toast.error("Enter reps or weight");
        return;
      }
      patchUIState(exerciseId, { savingSet: true });
      setActiveExerciseId(exerciseId);
      const result = await addSet(
        exerciseId,
        { reps, weightLbs: weight, durationSeconds: null, distanceMeters: null, notes: null },
        "manual"
      );
      if (!result) {
        toast.error("Failed to log set");
        patchUIState(exerciseId, { savingSet: false });
        return;
      }
      if (result.prHint?.isPR) {
        const key = `${exerciseId}-${result.setNumber}`;
        if (!prToastKeysRef.current.has(key)) {
          prToastKeysRef.current.add(key);
          showPRToast({ ...result.prHint });
          triggerConfetti("pr");
        }
      }
      patchUIState(exerciseId, {
        savingSet: false,
        restEndsAt: Date.now() + REST_SECONDS * 1000,
      });
    },
    [addSet, patchUIState]
  );

  const handleLogSet = useCallback(
    (exerciseId: string) => {
      const s = getUIState(exerciseId);
      const reps = s.reps ? parseInt(s.reps, 10) : null;
      const weight = s.weight ? parseFloat(s.weight) : null;
      saveSet(exerciseId, reps, weight);
    },
    [getUIState, saveSet]
  );

  const handleLogAnother = useCallback(
    (exerciseId: string, lastLog: ExerciseLog) => {
      const reps = lastLog.reps;
      const weight = lastLog.weight_lbs != null ? Number(lastLog.weight_lbs) : null;
      saveSet(exerciseId, reps, weight);
    },
    [saveSet]
  );

  const handleFinish = useCallback(
    async (perceivedEffort: number | null, overallNotes: string | null) => {
      if (!workout) return;
      try {
        const result = await completeWorkout(perceivedEffort, overallNotes);
        for (const pr of result.prEvents) {
          showPRToast({
            exerciseName: pr.exerciseName,
            prType: pr.prType,
            weightLbs: pr.value,
            reps: pr.value,
          });
        }
        for (const badge of result.newBadges) {
          showBadgeToast(badge);
        }
        if (result.prEvents.length > 0 || result.newBadges.length > 0) triggerConfetti("pr");
        router.push("/log");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to finish workout");
      }
    },
    [workout, completeWorkout, router]
  );

  // Active exercise first, rest in original order
  const sortedExercises = [...exercises].sort((a, b) => {
    if (a.exercise.id === activeExerciseId) return -1;
    if (b.exercise.id === activeExerciseId) return 1;
    return 0;
  });

  const totalSets = exercises.reduce((sum, e) => sum + e.logs.length, 0);
  const totalVolume = exercises.reduce(
    (sum, e) =>
      sum + e.logs.reduce((s, l) => s + (l.reps ?? 0) * (Number(l.weight_lbs) || 0), 0),
    0
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-200" />
      </div>
    );
  }

  if (showSummary) {
    return (
      <WorkoutSummary
        durationMinutes={Math.floor(elapsedSeconds / 60)}
        totalVolume={totalVolume}
        exerciseCount={exercises.filter((e) => e.logs.length > 0).length}
        setCount={totalSets}
        exercisesWithLogs={exercises}
        onSaveAndFinish={handleFinish}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-800 bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-zinc-400" />
          <span className="tabular-nums font-medium text-zinc-100">
            {formatElapsed(elapsedSeconds)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowSummary(true)}
          className="min-h-[44px] rounded-lg border border-zinc-700 px-4 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white"
        >
          Finish Workout
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4 p-4">
        {/* Add Exercise */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-700 text-zinc-400 transition-colors active:border-zinc-500 active:text-zinc-200"
        >
          <Plus className="h-5 w-5" />
          <span className="text-base font-medium">Add Exercise</span>
        </button>

        {/* Exercise cards */}
        {sortedExercises.map(({ exercise, logs, prescribed }) => {
          const s = getUIState(exercise.id);
          const restSecondsLeft =
            s.restEndsAt != null
              ? Math.max(0, Math.ceil((s.restEndsAt - now) / 1000))
              : null;
          const isResting = restSecondsLeft != null && restSecondsLeft > 0;
          const lastLog = logs[logs.length - 1];

          const repPlaceholder =
            prescribed?.reps != null ? String(prescribed.reps) : "0";
          const weightPlaceholder =
            prescribed?.weight_lbs != null ? String(prescribed.weight_lbs) : "0";

          return (
            <div
              key={exercise.id}
              className="rounded-xl border border-zinc-800 bg-card/60"
              onPointerDown={() => setActiveExerciseId(exercise.id)}
            >
              {/* Card header */}
              <div className="flex items-center justify-between px-4 py-3">
                <span className="font-semibold text-zinc-100">{exercise.name}</span>
                {logs.length > 0 && (
                  <span className="text-sm text-zinc-500">
                    {logs.length} set{logs.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Rest timer banner */}
              {isResting && (
                <div className="mx-4 mb-3 flex items-center justify-between rounded-lg bg-zinc-800/80 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-zinc-400" />
                    <span className="tabular-nums text-xl font-bold text-zinc-100">
                      {Math.floor(restSecondsLeft / 60)}:
                      {(restSecondsLeft % 60).toString().padStart(2, "0")}
                    </span>
                    <span className="text-sm text-zinc-400">rest</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => patchUIState(exercise.id, { restEndsAt: null })}
                    className="min-h-[44px] px-2 text-sm text-zinc-400 underline underline-offset-2"
                  >
                    Skip
                  </button>
                </div>
              )}

              {/* Input area — always visible, even while resting */}
              <div className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-zinc-500">Reps</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder={repPlaceholder}
                      value={s.reps}
                      onChange={(e) => patchUIState(exercise.id, { reps: e.target.value })}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-center text-2xl font-bold tabular-nums text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-zinc-500">Weight (lbs)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder={weightPlaceholder}
                      value={s.weight}
                      onChange={(e) => patchUIState(exercise.id, { weight: e.target.value })}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-center text-2xl font-bold tabular-nums text-zinc-100 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleLogSet(exercise.id)}
                  disabled={s.savingSet}
                  className="flex min-h-[56px] w-full items-center justify-center rounded-xl bg-green-600 text-base font-bold text-white transition-colors active:bg-green-700 disabled:opacity-50"
                >
                  {s.savingSet
                    ? "Logging…"
                    : logs.length === 0
                      ? "Log Set"
                      : `Log Set ${logs.length + 1}`}
                </button>

                {lastLog && (
                  <button
                    type="button"
                    onClick={() => handleLogAnother(exercise.id, lastLog)}
                    disabled={s.savingSet}
                    className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-zinc-700 text-sm text-zinc-400 transition-colors active:border-zinc-500 active:text-zinc-200 disabled:opacity-50"
                  >
                    + Same Again ({formatSetLine(lastLog)})
                  </button>
                )}
              </div>

              {/* Logged sets */}
              {logs.length > 0 && (
                <div className="border-t border-zinc-800 px-4 py-3 space-y-1.5">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">Set {log.set_number}</span>
                      <span className="text-zinc-300">{formatSetLine(log)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {exercises.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-zinc-500">Tap Add Exercise to start</p>
          </div>
        )}
      </div>

      <ExerciseSearchSheet
        open={searchOpen}
        onOpenChange={setSearchOpen}
        exercises={exerciseLibrary}
        onSelect={handleAddExercise}
      />
    </div>
  );
}
