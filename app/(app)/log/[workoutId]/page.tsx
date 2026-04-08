"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

import { ChevronRight, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkoutSummary } from "@/components/workout/WorkoutSummary";
import { ExerciseSearchSheet } from "@/components/workout/ExerciseSearchSheet";
import { useWorkout, type AddSetResult } from "@/hooks/useWorkout";
import { showBadgeToast } from "@/components/gamification/BadgeToast";
import { showPRToast } from "@/components/gamification/PRToast";
import { triggerConfetti } from "@/components/gamification/Confetti";
import { DrumInput } from "@/components/shared/DrumInput";

type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
type ExerciseLog = Database["public"]["Tables"]["exercise_logs"]["Row"];

// ─── Types ────────────────────────────────────────────────────────────────────

type SetValues = {
  reps: number | null;
  weightLbs: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  notes: string | null;
};

function emptySetValues(): SetValues {
  return { reps: null, weightLbs: null, durationSeconds: null, distanceMeters: null, notes: null };
}

/**
 * Stage machine per exercise:
 *
 *   setup  — pick reps/weight with drums, no timer yet
 *   active — red END SET circle only; exercise timer running
 *   rest   — rest countdown; edit/skip buttons; Next Exercise at bottom
 *
 * "ready" was merged back into "setup" — after rest, setup just
 * pre-loads the previous set's values so the drums are ready to go.
 */
type Stage = "setup" | "active" | "rest";

type ExerciseState = {
  stage: Stage;
  /** Values configured for the current/next set */
  setupValues: SetValues;
  /** Log ID of the last completed set — needed for Edit Last Set */
  lastLogId: string | null;
  /** A local copy of last log values so Edit Last Set can be driven by drums */
  lastLogValues: SetValues;
  /** unix ms when exercise timer started (first Begin Set tap) */
  exerciseStartedAt: number | null;
  beginMessage: string;
  activeMessage: string;
  restMessage: string;
};

// ─── Wolf messages ─────────────────────────────────────────────────────────────

const BEGIN_MESSAGES = [
  "LETS GO!",
  "Time to Hunt 🐺",
  "No Excuses",
  "Attack!",
  "Do It.",
  "Feed the Wolf 🐺",
  "Hunt.",
] as const;

const ACTIVE_MESSAGES = [
  "mama!!!!",
  "oh no, here we go...",
  "don't you dare stop",
  "the wolf is watching 🐺",
  "BREATHE!",
  "you got this... maybe",
  "almost there... probably",
  "RAHHHHH",
] as const;

const REST_MESSAGES = [
  "Good work!!! Fistbump! 🤜",
  "The wolf approves 🐺",
  "Earning it.",
  "That's what I'm talking about",
  "YES. 🐺",
  "Get some rest, hunter",
] as const;

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSetLine(log: ExerciseLog): string {
  const parts: string[] = [];
  if (log.reps != null) parts.push(`${log.reps} reps`);
  if (log.weight_lbs != null) parts.push(`@ ${Number(log.weight_lbs)} lbs`);
  if (log.duration_seconds != null && log.reps == null && log.weight_lbs == null)
    parts.push(`${log.duration_seconds}s`);
  return parts.length ? parts.join(" ") : "—";
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CircleActionButton({
  variant,
  message,
  onClick,
  disabled,
}: {
  variant: "green" | "red";
  message: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const colors =
    variant === "green"
      ? "bg-green-500 hover:bg-green-400 active:bg-green-600"
      : "bg-red-500 hover:bg-red-400 active:bg-red-600";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "mx-auto flex h-[220px] w-[220px] items-center justify-center rounded-full",
        "border border-black/10 px-4 text-center text-white shadow-lg",
        "transition-transform active:translate-y-px",
        colors,
        disabled ? "opacity-50 cursor-not-allowed" : "",
      ].join(" ")}
    >
      <div className="text-center text-lg font-extrabold leading-tight">{message}</div>
    </button>
  );
}

function RestCountdown({
  initialSeconds,
  onDone,
}: {
  initialSeconds: number;
  onDone: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          onDoneRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [initialSeconds]);

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-6xl font-bold tabular-nums text-zinc-100">
        {m}:{s.toString().padStart(2, "0")}
      </div>
      <div className="text-xs text-zinc-500 uppercase tracking-widest">rest</div>
    </div>
  );
}

function SetupDrums({
  values,
  onChange,
}: {
  values: SetValues;
  onChange: (v: SetValues) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <DrumInput
        value={values.reps ?? 0}
        onChange={(v) => onChange({ ...values, reps: v > 0 ? v : null })}
        label="Reps"
        min={0}
        max={200}
        step={1}
      />
      <DrumInput
        value={values.weightLbs ?? 0}
        onChange={(v) => onChange({ ...values, weightLbs: v > 0 ? v : null })}
        label="Weight"
        unit="lbs"
        min={0}
        max={999}
        step={2.5}
      />
    </div>
  );
}

function EditableSetRow({
  log,
  onUpdate,
}: {
  log: ExerciseLog;
  onUpdate: (v: { reps: number | null; weightLbs: number | null }) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [reps, setReps] = useState(log.reps ?? 0);
  const [weight, setWeight] = useState(log.weight_lbs != null ? Number(log.weight_lbs) : 0);
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-left active:bg-zinc-800"
      >
        <span className="text-sm text-zinc-500">Set {log.set_number}</span>
        <span className="text-sm text-zinc-200">{formatSetLine(log)}</span>
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-900/60 p-3">
      <div className="text-xs text-zinc-400">Edit set {log.set_number}</div>
      <div className="grid grid-cols-2 gap-3">
        <DrumInput value={reps} onChange={setReps} label="Reps" min={0} max={200} step={1} />
        <DrumInput value={weight} onChange={setWeight} label="Weight" unit="lbs" min={0} max={999} step={2.5} />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="min-h-[44px] flex-1 border-zinc-700" onClick={() => setEditing(false)}>
          Cancel
        </Button>
        <Button
          className="min-h-[44px] flex-1"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onUpdate({ reps: reps > 0 ? reps : null, weightLbs: weight > 0 ? weight : null });
              setEditing(false);
            } catch {
              toast.error("Failed to save");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function DotsIndicator({ count }: { count: number }) {
  const show = Math.min(count, 10);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: show }).map((_, i) => (
        <div key={i} className="h-2.5 w-2.5 rounded-full bg-green-500" />
      ))}
      {count > 10 && <span className="text-xs text-zinc-500">+{count - 10}</span>}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ActiveWorkoutPage() {
  const params = useParams();
  const workoutId = params.workoutId as string;
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [exerciseLibrary, setExerciseLibrary] = useState<Exercise[]>([]);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [pendingNavigateTo, setPendingNavigateTo] = useState<string | null>(null);

  // Flip true after the very first Begin Set tap — unlocks the workout timer
  const [workoutStarted, setWorkoutStarted] = useState(false);

  const [exerciseStates, setExerciseStates] = useState<Record<string, ExerciseState>>({});
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [doneExerciseIds, setDoneExerciseIds] = useState<string[]>([]);
  const [expandedDoneId, setExpandedDoneId] = useState<string | null>(null);
  const [restEditMode, setRestEditMode] = useState<"last" | "next" | null>(null);
  const [endingSet, setEndingSet] = useState(false);

  const prToastKeysRef = useRef<Set<string>>(new Set());

  const {
    workout,
    exercises: exercisesInWorkout,
    loading,
    startedAt,
    addExercise,
    addSet,
    completeWorkout,
    refetch,
  } = useWorkout(workoutId, athleteId ?? "");

  // Tick for exercise timers
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Overall workout elapsed — only counts once workoutStarted
  const [workoutElapsed, setWorkoutElapsed] = useState(0);
  const workoutStartedAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (!workoutStarted) return;
    if (!workoutStartedAtRef.current) workoutStartedAtRef.current = Date.now();
    const id = window.setInterval(() => {
      setWorkoutElapsed(Math.floor((Date.now() - workoutStartedAtRef.current!) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [workoutStarted]);

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setAthleteId(user.id);
    });
  }, [supabase]);

  // Exercise library
  useEffect(() => {
    supabase.from("exercises").select("id, name, category").then(({ data }) => {
      setExerciseLibrary((data ?? []) as Exercise[]);
    });
  }, [supabase]);

  // Initialize per-exercise state on load
  useEffect(() => {
    if (loading) return;
    setExerciseStates((prev) => {
      const next = { ...prev };
      for (const ex of exercisesInWorkout) {
        const id = ex.exercise.id;
        if (next[id]) continue;
        const last = ex.logs[ex.logs.length - 1];
        const lastValues: SetValues = last
          ? {
              reps: last.reps,
              weightLbs: last.weight_lbs != null ? Number(last.weight_lbs) : null,
              durationSeconds: last.duration_seconds,
              distanceMeters: last.distance_meters != null ? Number(last.distance_meters) : null,
              notes: last.notes,
            }
          : emptySetValues();
        next[id] = {
          stage: ex.logs.length > 0 ? "rest" : "setup",
          setupValues: lastValues,
          lastLogId: last?.id ?? null,
          lastLogValues: lastValues,
          exerciseStartedAt: ex.logs.length > 0 ? Date.now() : null,
          beginMessage: pick(BEGIN_MESSAGES),
          activeMessage: pick(ACTIVE_MESSAGES),
          restMessage: ex.logs.length > 0 ? pick(REST_MESSAGES) : "",
        };
      }
      return next;
    });
  }, [exercisesInWorkout, loading]);

  const updateExerciseState = useCallback(
    (id: string, updater: (s: ExerciseState) => ExerciseState) => {
      setExerciseStates((prev) => {
        const cur = prev[id];
        if (!cur) return prev;
        return { ...prev, [id]: updater(cur) };
      });
    },
    []
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleAddExercise = useCallback(
    (exercise: Exercise) => {
      addExercise(exercise);
      setActiveExerciseId(exercise.id);
      setRestEditMode(null);
      setShowExerciseSearch(false);
      setExerciseStates((prev) => {
        if (prev[exercise.id]) return prev;
        return {
          ...prev,
          [exercise.id]: {
            stage: "setup",
            setupValues: emptySetValues(),
            lastLogId: null,
            lastLogValues: emptySetValues(),
            exerciseStartedAt: null,
            beginMessage: pick(BEGIN_MESSAGES),
            activeMessage: pick(ACTIVE_MESSAGES),
            restMessage: "",
          },
        };
      });
    },
    [addExercise]
  );

  /** Begin Set: start exercise timer (only on first tap), enter active stage. */
  const handleBeginSet = useCallback(() => {
    if (!activeExerciseId) return;
    setWorkoutStarted(true);
    updateExerciseState(activeExerciseId, (s) => ({
      ...s,
      stage: "active",
      activeMessage: pick(ACTIVE_MESSAGES),
      exerciseStartedAt: s.exerciseStartedAt ?? Date.now(),
    }));
    setRestEditMode(null);
  }, [activeExerciseId, updateExerciseState]);

  /** End Set: write to DB, confetti, start rest. */
  const handleEndSet = useCallback(async () => {
    if (!activeExerciseId || endingSet) return;
    const state = exerciseStates[activeExerciseId];
    if (!state) return;

    setEndingSet(true);
    const values = state.setupValues;

    try {
      const result = await addSet(activeExerciseId, values, "manual");
      const addResult = result as AddSetResult | null;
      if (!addResult) {
        toast.error("Failed to log set");
        return;
      }

      const { prHint, logId } = addResult;

      if (prHint?.isPR && prHint.prType) {
        const k = `${activeExerciseId}-${prHint.prType}`;
        if (!prToastKeysRef.current.has(k)) {
          prToastKeysRef.current.add(k);
          showPRToast({
            exerciseName: prHint.exerciseName,
            prType: prHint.prType,
            weightLbs: prHint.prType === "weight" ? prHint.weightLbs : 0,
            reps: prHint.prType === "reps" ? prHint.reps : 0,
          });
        }
      }

      triggerConfetti("badge");

      updateExerciseState(activeExerciseId, (s) => ({
        ...s,
        stage: "rest",
        lastLogId: logId,
        lastLogValues: values,
        restMessage: pick(REST_MESSAGES),
      }));
      setRestEditMode(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log set");
    } finally {
      setEndingSet(false);
    }
  }, [activeExerciseId, endingSet, exerciseStates, addSet, updateExerciseState]);

  /** Rest done / Skip rest → back to setup with values pre-loaded. */
  const handleRestDone = useCallback(() => {
    if (!activeExerciseId) return;
    updateExerciseState(activeExerciseId, (s) => ({
      ...s,
      stage: "setup",
      beginMessage: pick(BEGIN_MESSAGES),
    }));
    setRestEditMode(null);
  }, [activeExerciseId, updateExerciseState]);

  /** Next Exercise: move current to done, open search for the next one. */
  const handleNextExercise = useCallback(() => {
    if (!activeExerciseId) return;
    setDoneExerciseIds((prev) =>
      prev.includes(activeExerciseId) ? prev : [...prev, activeExerciseId]
    );
    setActiveExerciseId(null);
    setRestEditMode(null);
    setShowExerciseSearch(true);
  }, [activeExerciseId]);

  /** Edit Last Set: update the DB record that was just written. */
  const handleSaveLastSet = useCallback(
    async (values: SetValues) => {
      if (!activeExerciseId) return;
      const state = exerciseStates[activeExerciseId];
      if (!state?.lastLogId) return;

      const { error } = await supabase
        .from("exercise_logs")
        .update({
          reps: values.reps,
          weight_lbs: values.weightLbs,
          duration_seconds: values.durationSeconds,
          distance_meters: values.distanceMeters,
          notes: values.notes,
        })
        .eq("id", state.lastLogId);

      if (error) {
        toast.error("Failed to update set");
        return;
      }

      await refetch();

      updateExerciseState(activeExerciseId, (s) => ({
        ...s,
        lastLogValues: values,
        setupValues: values,
      }));
      setRestEditMode(null);
    },
    [activeExerciseId, exerciseStates, supabase, refetch, updateExerciseState]
  );

  /** Edit Next Set: local state only — does not touch the DB. */
  const handleSaveNextSet = useCallback(
    (values: SetValues) => {
      if (!activeExerciseId) return;
      updateExerciseState(activeExerciseId, (s) => ({
        ...s,
        setupValues: values,
      }));
      setRestEditMode(null);
    },
    [activeExerciseId, updateExerciseState]
  );

  /** Update a completed set row (tap-to-edit). */
  const updateLog = useCallback(
    async (logId: string, values: { reps: number | null; weightLbs: number | null }) => {
      await supabase
        .from("exercise_logs")
        .update({ reps: values.reps, weight_lbs: values.weightLbs })
        .eq("id", logId);
      await refetch();
    },
    [supabase, refetch]
  );

  const handleFinish = useCallback(
    async (effort: number | null, notes: string | null) => {
      try {
        const result = await completeWorkout(effort, notes);
        for (const ev of result.prEvents) {
          const k = `${ev.exerciseId}-${ev.prType}`;
          if (prToastKeysRef.current.has(k)) continue;
          prToastKeysRef.current.add(k);
          showPRToast({
            exerciseName: ev.exerciseName,
            prType: ev.prType,
            weightLbs: ev.prType === "weight" ? ev.value : 0,
            reps: ev.prType === "reps" ? ev.value : 0,
          });
        }
        for (const b of result.newBadges) showBadgeToast(b);
        router.push("/log");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save workout");
      }
    },
    [completeWorkout, router]
  );

  // ── Derived ────────────────────────────────────────────────────────────────

  const activeExercise = useMemo(
    () => exercisesInWorkout.find((e) => e.exercise.id === activeExerciseId) ?? null,
    [activeExerciseId, exercisesInWorkout]
  );
  const activeState = activeExerciseId ? (exerciseStates[activeExerciseId] ?? null) : null;
  const activeStage = activeState?.stage ?? null;

  const exerciseTimerDisplay = useMemo(() => {
    if (!activeState?.exerciseStartedAt) return null;
    return formatElapsed(Math.floor((now - activeState.exerciseStartedAt) / 1000));
  }, [activeState, now]);

  const workoutTimerDisplay = useMemo(
    () => (workoutStarted ? formatElapsed(workoutElapsed) : null),
    [workoutStarted, workoutElapsed]
  );

  const exerciseCount = exercisesInWorkout.filter((e) => e.logs.length > 0).length;
  const setCount = exercisesInWorkout.reduce((s, e) => s + e.logs.length, 0);
  const totalVolume = exercisesInWorkout.reduce(
    (sum, e) =>
      sum + e.logs.reduce((s, l) => s + (l.reps ?? 0) * (Number(l.weight_lbs) || 0), 0),
    0
  );
  const durationMinutes = startedAt
    ? Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 60000))
    : 0;

  // ── Guard renders ──────────────────────────────────────────────────────────

  if (loading || !workout) {
    return (
      <div className="space-y-4 pb-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (workout.completed_at) {
    router.replace("/log");
    return null;
  }

  if (showSummary) {
    return (
      <WorkoutSummary
        durationMinutes={durationMinutes}
        totalVolume={totalVolume}
        exerciseCount={exerciseCount}
        setCount={setCount}
        exercisesWithLogs={exercisesInWorkout.filter((e) => e.logs.length > 0)}
        onSaveAndFinish={handleFinish}
      />
    );
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderExerciseHeader = (exercise: Exercise, logs: ExerciseLog[]) => (
    <div className="space-y-1">
      <h2 className="truncate text-2xl font-bold text-zinc-100">{exercise.name}</h2>
      {(logs.length > 0 || exerciseTimerDisplay) && (
        <div className="flex flex-wrap items-center gap-3">
          {logs.length > 0 && <DotsIndicator count={logs.length} />}
          {exerciseTimerDisplay && (
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <Timer className="h-3 w-3" />
              {exerciseTimerDisplay}
            </span>
          )}
        </div>
      )}
    </div>
  );

  const renderSetLog = (logs: ExerciseLog[]) =>
    logs.length > 0 ? (
      <div className="space-y-2">
        {logs.map((log) => (
          <EditableSetRow key={log.id} log={log} onUpdate={(v) => updateLog(log.id, v)} />
        ))}
      </div>
    ) : null;

  // ── Stage renders ──────────────────────────────────────────────────────────

  const renderActiveExercise = () => {
    if (!activeExercise || !activeState) return null;
    const { exercise, logs } = activeExercise;
    const { stage, setupValues, lastLogId, lastLogValues } = activeState;

    // ── ACTIVE: red circle only — nothing else ───────────────────────────────
    if (stage === "active") {
      return (
        <div className="space-y-6 py-4">
          {renderExerciseHeader(exercise, logs)}
          <CircleActionButton
            variant="red"
            message={activeState.activeMessage}
            onClick={handleEndSet}
            disabled={endingSet}
          />
        </div>
      );
    }

    // ── SETUP: drums + green circle ──────────────────────────────────────────
    if (stage === "setup") {
      const setNumber = logs.length + 1;
      return (
        <div className="space-y-4">
          {renderExerciseHeader(exercise, logs)}
          {logs.length > 0 && (
            <div className="text-center text-sm text-zinc-500">Set {setNumber}</div>
          )}
          <SetupDrums
            values={setupValues}
            onChange={(v) => updateExerciseState(exercise.id, (s) => ({ ...s, setupValues: v }))}
          />
          <CircleActionButton
            variant="green"
            message={activeState.beginMessage}
            onClick={handleBeginSet}
          />
          {renderSetLog(logs)}
        </div>
      );
    }

    // ── REST: Edit Last Set form ──────────────────────────────────────────────
    if (stage === "rest" && restEditMode === "last" && lastLogId) {
      return (
        <div className="space-y-4">
          {renderExerciseHeader(exercise, logs)}
          <div className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-900/60 p-4">
            <div className="text-sm font-medium text-zinc-300">
              What did you actually do?
            </div>
            <SetupDrums
              values={lastLogValues}
              onChange={(v) =>
                updateExerciseState(exercise.id, (s) => ({ ...s, lastLogValues: v }))
              }
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="min-h-[44px] flex-1 border-zinc-700"
                onClick={() => setRestEditMode(null)}
              >
                Cancel
              </Button>
              <Button
                className="min-h-[44px] flex-1"
                onClick={() => handleSaveLastSet(lastLogValues)}
              >
                Save
              </Button>
            </div>
          </div>
          {renderSetLog(logs)}
        </div>
      );
    }

    // ── REST: Edit Next Set form ──────────────────────────────────────────────
    if (stage === "rest" && restEditMode === "next") {
      return (
        <div className="space-y-4">
          {renderExerciseHeader(exercise, logs)}
          <div className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-900/60 p-4">
            <div className="text-sm font-medium text-zinc-300">
              Set {logs.length + 1} — adjust before you start
            </div>
            <SetupDrums
              values={setupValues}
              onChange={(v) =>
                updateExerciseState(exercise.id, (s) => ({ ...s, setupValues: v }))
              }
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="min-h-[44px] flex-1 border-zinc-700"
                onClick={() => setRestEditMode(null)}
              >
                Cancel
              </Button>
              <Button
                className="min-h-[44px] flex-1"
                onClick={() => handleSaveNextSet(setupValues)}
              >
                Done
              </Button>
            </div>
          </div>
          {renderSetLog(logs)}
        </div>
      );
    }

    // ── REST: default ─────────────────────────────────────────────────────────
    if (stage === "rest") {
      return (
        <div className="space-y-4">
          {renderExerciseHeader(exercise, logs)}
          {activeState.restMessage && (
            <div className="text-center text-base font-semibold text-zinc-200">
              {activeState.restMessage}
            </div>
          )}
          <RestCountdown initialSeconds={60} onDone={handleRestDone} />
          {/* Skip Rest directly under the timer */}
          <Button
            className="w-full min-h-[44px] bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            onClick={handleRestDone}
          >
            Skip Rest
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="min-h-[44px] border-zinc-700"
              onClick={() => setRestEditMode("last")}
            >
              Edit Last Set
            </Button>
            <Button
              variant="outline"
              className="min-h-[44px] border-zinc-700"
              onClick={() => setRestEditMode("next")}
            >
              Edit Next Set
            </Button>
          </div>
          {renderSetLog(logs)}
        </div>
      );
    }

    return null;
  };

  // ── Done exercise pills ────────────────────────────────────────────────────

  const renderDoneExercises = () => {
    if (!doneExerciseIds.length) return null;
    return (
      <div className="space-y-2">
        {doneExerciseIds.map((id) => {
          const ex = exercisesInWorkout.find((e) => e.exercise.id === id);
          if (!ex) return null;
          const expanded = expandedDoneId === id;
          return (
            <div key={id}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-full border border-green-500/30 bg-green-600/15 px-4 py-3 text-zinc-100 active:bg-green-600/25"
                onClick={() => setExpandedDoneId((prev) => (prev === id ? null : id))}
              >
                <span className="min-w-0 truncate text-sm font-semibold">{ex.exercise.name}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <DotsIndicator count={ex.logs.length} />
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
                  />
                </div>
              </button>
              {expanded && (
                <div className="mt-2 space-y-2 rounded-xl border border-zinc-800 bg-card p-3">
                  {ex.logs.map((log) => (
                    <EditableSetRow
                      key={log.id}
                      log={log}
                      onUpdate={(v) => updateLog(log.id, v)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <>
      {/* Main scroll area — extra bottom padding for fixed "Next Exercise" bar */}
      <div className="space-y-4 pb-32">
        {/* Top bar: workout timer (only after first Begin Set) + Finish */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-background py-2">
          <div className="tabular-nums font-mono text-lg text-zinc-200">
            {workoutTimerDisplay ?? ""}
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFinishConfirm(true)}
            className="min-h-[44px] border-zinc-700"
          >
            Finish Workout
          </Button>
        </header>

        {/* Active exercise card */}
        {activeExercise && activeState ? (
          <div className="rounded-xl border border-zinc-800 bg-card/30 p-4">
            {renderActiveExercise()}
          </div>
        ) : (
          /* No active exercise — pick one */
          <div className="rounded-xl border-2 border-dashed border-zinc-700 p-8 text-center">
            <p className="mb-6 text-zinc-400">
              {doneExerciseIds.length > 0
                ? "Choose your next exercise or finish your workout."
                : "Choose an exercise to get started."}
            </p>
            <Button
              size="lg"
              className="min-h-[56px] w-full"
              onClick={() => setShowExerciseSearch(true)}
            >
              Add Exercise
            </Button>
          </div>
        )}

        {/* Done exercises */}
        {renderDoneExercises()}
      </div>

      {/* "Next Exercise" — fixed just above the bottom nav, hidden during active set */}
      {activeExercise && activeStage !== "active" && (
        <div className="fixed bottom-14 left-0 right-0 z-40 border-t border-zinc-800 bg-background px-4 py-2">
          <Button
            variant="outline"
            className="w-full min-h-[44px] border-zinc-700 text-zinc-300"
            onClick={handleNextExercise}
          >
            Next Exercise
          </Button>
        </div>
      )}

      <ExerciseSearchSheet
        open={showExerciseSearch}
        onOpenChange={setShowExerciseSearch}
        exercises={exerciseLibrary}
        onSelect={handleAddExercise}
      />

      {/* Finish workout confirm */}
      <Dialog open={showFinishConfirm} onOpenChange={setShowFinishConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End workout?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowFinishConfirm(false)} className="flex-1">
              Keep Going
            </Button>
            <Button
              onClick={() => {
                setShowFinishConfirm(false);
                setShowSummary(true);
              }}
              className="flex-1"
            >
              Finish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Abandon workout confirm — triggered by nav tap during active workout */}
      <Dialog
        open={showAbandonConfirm}
        onOpenChange={(open) => {
          if (!open) {
            setShowAbandonConfirm(false);
            setPendingNavigateTo(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abandon workout?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400 px-1">
            You have a workout in progress. If you leave now, your logged sets will be saved but the workout won&apos;t be marked complete.
          </p>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAbandonConfirm(false);
                setPendingNavigateTo(null);
              }}
              className="flex-1"
            >
              Continue Workout
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowAbandonConfirm(false);
                router.push(pendingNavigateTo ?? "/dashboard");
              }}
              className="flex-1"
            >
              Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
