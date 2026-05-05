"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

import { ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkoutSummary } from "@/components/workout/WorkoutSummary";
import { ExerciseSearchSheet } from "@/components/workout/ExerciseSearchSheet";
import { useWorkout, type AddSetResult } from "@/hooks/useWorkout";
import { showBadgeToast } from "@/components/gamification/BadgeToast";
import { showPRToast } from "@/components/gamification/PRToast";
import { triggerConfetti } from "@/components/gamification/Confetti";
import { DrumInput } from "@/components/shared/DrumInput";
import { ExerciseInfoSheet } from "@/components/workout/ExerciseInfoSheet";

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

type CardioMode = "timed" | "hiit";

/**
 * STRENGTH stages:  setup → active → rest  (loops)
 * TIMED CARDIO:     setup → warmup → countdown → celebrate
 * HIIT:             setup → prestart → intense → recovery → (loop) → celebrate
 */
type Stage =
  | "setup"
  | "active"       // strength: set in progress
  | "rest"         // strength: between sets
  | "warmup"       // timed cardio: 45s get-moving phase
  | "countdown"    // timed cardio: main timer counting down
  | "celebrate"    // timed/hiit: done
  | "prestart"     // hiit: 10s countdown before first interval
  | "intense"      // hiit: high-intensity phase (green)
  | "recovery";    // hiit: recovery phase (orange)

type ExerciseState = {
  stage: Stage;

  // ── Strength fields ──────────────────────────────────────────────────────
  setupValues: SetValues;
  lastLogId: string | null;
  lastLogValues: SetValues;
  /** unix ms when exercise timer started */
  exerciseStartedAt: number | null;
  /** unix ms when the rest period started — null if not resting */
  restStartedAt: number | null;
  beginMessage: string;
  activeMessage: string;
  restMessage: string;

  // ── Cardio fields ────────────────────────────────────────────────────────
  cardioMode: CardioMode;
  timedDurationMinutes: number;
  timedNotes: string;
  hiitIntenseSecs: number;
  hiitRestSecs: number;
  hiitCycles: number;
  /** unix ms when current timed/hiit phase started */
  phaseStartedAt: number | null;
  /** HIIT: current cycle index (0-based) */
  hiitCurrentCycle: number;
  /** HIIT: how many full cycles completed (for logging on early stop) */
  hiitCyclesCompleted: number;
  /** unix ms when the whole cardio session started (after warmup) */
  cardioSessionStartedAt: number | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const REST_DURATION_SECS = 60;
const WARMUP_SECS = 45;
const HIIT_PRESTART_SECS = 10;

// ─── Messages ─────────────────────────────────────────────────────────────────

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

/** Message shown on the timed-cardio button based on elapsed + remaining seconds */
function timedButtonMessage(elapsedSecs: number, remainingSecs: number): string {
  if (remainingSecs <= 3 && remainingSecs > 2) return "YOU";
  if (remainingSecs <= 2 && remainingSecs > 1) return "DID";
  if (remainingSecs <= 1) return "IT!";
  if (remainingSecs <= 60) return "PULLING INTO THE GARAGE";
  if (remainingSecs <= 180) return "SLOW IT DOWN";
  if (elapsedSecs >= 300) return "I GIVE UP";
  if (elapsedSecs >= 120) return "YOU GOT THIS";
  return "GO GO GO!!!";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSetLine(log: ExerciseLog): string {
  const parts: string[] = [];
  if (log.reps != null) parts.push(`${log.reps} reps`);
  if (log.weight_lbs != null) parts.push(`@ ${Number(log.weight_lbs)} lbs`);
  if (log.duration_seconds != null && log.reps == null && log.weight_lbs == null)
    parts.push(`${Math.round(log.duration_seconds / 60)}m`);
  return parts.length ? parts.join(" ") : "—";
}

function formatSecs(totalSecs: number): string {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function hiitTotalMinutes(intenseSecs: number, restSecs: number, cycles: number): number {
  return Math.round(((intenseSecs + restSecs) * cycles) / 60);
}

function isCardio(exercise: Exercise): boolean {
  return exercise.category === "cardio";
}

function makeInitialState(exercise: Exercise, existingLogs: ExerciseLog[]): ExerciseState {
  const last = existingLogs[existingLogs.length - 1];
  const lastValues: SetValues = last
    ? {
        reps: last.reps,
        weightLbs: last.weight_lbs != null ? Number(last.weight_lbs) : null,
        durationSeconds: last.duration_seconds,
        distanceMeters:
          last.distance_meters != null ? Number(last.distance_meters) : null,
        notes: last.notes,
      }
    : emptySetValues();

  return {
    stage: existingLogs.length > 0 ? (isCardio(exercise) ? "setup" : "rest") : "setup",
    setupValues: lastValues,
    lastLogId: last?.id ?? null,
    lastLogValues: lastValues,
    exerciseStartedAt: existingLogs.length > 0 ? Date.now() : null,
    restStartedAt: existingLogs.length > 0 && !isCardio(exercise) ? Date.now() : null,
    beginMessage: pick(BEGIN_MESSAGES),
    activeMessage: pick(ACTIVE_MESSAGES),
    restMessage: existingLogs.length > 0 ? pick(REST_MESSAGES) : "",
    cardioMode: "timed",
    timedDurationMinutes: 30,
    timedNotes: "",
    hiitIntenseSecs: 30,
    hiitRestSecs: 15,
    hiitCycles: 10,
    phaseStartedAt: null,
    hiitCurrentCycle: 0,
    hiitCyclesCompleted: 0,
    cardioSessionStartedAt: null,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CircleButton({
  color,
  message,
  onClick,
  disabled,
}: {
  color: "green" | "red" | "orange";
  message: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const colors = {
    green:  "bg-volt text-[#0e0e0f] active:scale-95",
    red:    "bg-solar text-[#0e0e0f] active:scale-95",
    orange: "bg-orange-500 text-white active:scale-95",
  }[color];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "mx-auto flex h-[220px] w-[220px] items-center justify-center rounded-full",
        "px-4 text-center shadow-lg font-display",
        "transition-transform",
        colors,
        disabled ? "opacity-50 cursor-not-allowed" : "",
      ].join(" ")}
    >
      <div className="text-center text-xl font-extrabold leading-tight tracking-wide">{message}</div>
    </button>
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
  const [weight, setWeight] = useState(
    log.weight_lbs != null ? Number(log.weight_lbs) : 0
  );
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-left active:bg-zinc-100"
      >
        <span className="text-sm text-zinc-500">Set {log.set_number}</span>
        <span className="text-sm text-zinc-800">{formatSetLine(log)}</span>
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-zinc-300 bg-white p-3">
      <div className="text-xs text-zinc-400">Edit set {log.set_number}</div>
      <div className="grid grid-cols-2 gap-3">
        <DrumInput value={reps} onChange={setReps} label="Reps" min={0} max={200} step={1} />
        <DrumInput
          value={weight}
          onChange={setWeight}
          label="Weight"
          unit="lbs"
          min={0}
          max={999}
          step={2.5}
        />
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="min-h-[44px] flex-1 border-zinc-300"
          onClick={() => setEditing(false)}
        >
          Cancel
        </Button>
        <Button
          className="min-h-[44px] flex-1"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onUpdate({
                reps: reps > 0 ? reps : null,
                weightLbs: weight > 0 ? weight : null,
              });
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

  const [workoutStarted, setWorkoutStarted] = useState(false);
  const workoutStartedAtRef = useRef<number | null>(null);
  const [workoutElapsed, setWorkoutElapsed] = useState(0);

  const [exerciseStates, setExerciseStates] = useState<Record<string, ExerciseState>>({});
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [doneExerciseIds, setDoneExerciseIds] = useState<string[]>([]);
  // Exercises stopped before completion get a red outline in the done list
  const [incompleteExerciseIds, setIncompleteExerciseIds] = useState<Set<string>>(new Set());
  const [expandedDoneId, setExpandedDoneId] = useState<string | null>(null);
  const [restEditMode, setRestEditMode] = useState<"last" | "next" | null>(null);
  const [endingSet, setEndingSet] = useState(false);
  const [infoExercise, setInfoExercise] = useState<Exercise | null>(null);
  const hasAutoStartedRef = useRef(false);

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

  // Lock body scroll for the entire workout screen — prevents accidental page
  // scroll when dragging drum inputs or swiping between stages.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Master tick — drives all timers
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  // Workout-level elapsed timer
  useEffect(() => {
    if (!workoutStarted) return;
    if (!workoutStartedAtRef.current) workoutStartedAtRef.current = Date.now();
    const id = window.setInterval(() => {
      setWorkoutElapsed(
        Math.floor((Date.now() - workoutStartedAtRef.current!) / 1000)
      );
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
    supabase
      .from("exercises")
      .select("id, name, category, description, demo_video_url")
      .then(({ data }) => setExerciseLibrary((data ?? []) as Exercise[]));
  }, [supabase]);

  // Init per-exercise state on load
  useEffect(() => {
    if (loading) return;
    setExerciseStates((prev) => {
      const next = { ...prev };
      for (const ex of exercisesInWorkout) {
        const id = ex.exercise.id;
        if (next[id]) continue;
        next[id] = makeInitialState(ex.exercise, ex.logs);
      }
      return next;
    });
  }, [exercisesInWorkout, loading]);

  // For plan-based workouts: auto-activate the first exercise on load
  // so the user lands on the exercise screen, not the "Add Exercise" picker.
  useEffect(() => {
    if (loading || hasAutoStartedRef.current || activeExerciseId) return;
    if (workout?.plan_id && exercisesInWorkout.length > 0) {
      hasAutoStartedRef.current = true;
      setActiveExerciseId(exercisesInWorkout[0].exercise.id);
    }
  }, [loading, workout?.plan_id, exercisesInWorkout, activeExerciseId]);

  // HIIT auto-advance: watch for phase timer expiry
  useEffect(() => {
    if (!activeExerciseId) return;
    const state = exerciseStates[activeExerciseId];
    if (!state || !state.phaseStartedAt) return;

    const elapsedSecs = Math.floor((now - state.phaseStartedAt) / 1000);

    if (state.stage === "prestart" && elapsedSecs >= HIIT_PRESTART_SECS) {
      setExerciseStates((prev) => {
        const s = prev[activeExerciseId];
        if (!s || s.stage !== "prestart") return prev;
        return {
          ...prev,
          [activeExerciseId]: {
            ...s,
            stage: "intense",
            phaseStartedAt: Date.now(),
            cardioSessionStartedAt: s.cardioSessionStartedAt ?? Date.now(),
          },
        };
      });
    }

    if (state.stage === "intense" && elapsedSecs >= state.hiitIntenseSecs) {
      const cyclesCompleted = state.hiitCyclesCompleted + 1;
      const lastCycle = cyclesCompleted >= state.hiitCycles;
      setExerciseStates((prev) => {
        const s = prev[activeExerciseId];
        if (!s || s.stage !== "intense") return prev;
        return {
          ...prev,
          [activeExerciseId]: {
            ...s,
            stage: lastCycle ? "celebrate" : "recovery",
            phaseStartedAt: lastCycle ? null : Date.now(),
            hiitCyclesCompleted: cyclesCompleted,
          },
        };
      });
      if (lastCycle) {
        triggerConfetti("pr");
        const elapsed = state.cardioSessionStartedAt
          ? Math.floor((Date.now() - state.cardioSessionStartedAt) / 1000)
          : 0;
        const notes = state.timedNotes
          ? `${cyclesCompleted} of ${state.hiitCycles} cycles — ${state.timedNotes}`
          : `${cyclesCompleted} of ${state.hiitCycles} cycles`;
        void addSet(activeExerciseId, { ...emptySetValues(), durationSeconds: elapsed, notes }, "manual");
        // Don't clear activeExerciseId here — celebrate screen needs to render first.
        // handleNextExercise (shown during celebrate) moves the exercise to doneExerciseIds.
      }
    }

    if (state.stage === "recovery" && elapsedSecs >= state.hiitRestSecs) {
      setExerciseStates((prev) => {
        const s = prev[activeExerciseId];
        if (!s || s.stage !== "recovery") return prev;
        const nextCycle = s.hiitCurrentCycle + 1;
        return {
          ...prev,
          [activeExerciseId]: {
            ...s,
            stage: "intense",
            phaseStartedAt: Date.now(),
            hiitCurrentCycle: nextCycle,
          },
        };
      });
    }

    // Timed cardio countdown finished
    if (state.stage === "countdown" && state.phaseStartedAt) {
      const totalSecs = state.timedDurationMinutes * 60;
      const elapsed = Math.floor((now - state.phaseStartedAt) / 1000);
      if (elapsed >= totalSecs) {
        setExerciseStates((prev) => {
          const s = prev[activeExerciseId];
          if (!s || s.stage !== "countdown") return prev;
          return { ...prev, [activeExerciseId]: { ...s, stage: "celebrate" } };
        });
        triggerConfetti("pr");
        void addSet(
          activeExerciseId,
          { ...emptySetValues(), durationSeconds: totalSecs, notes: state.timedNotes || null },
          "manual"
        );
        // Don't clear activeExerciseId here — celebrate screen needs to render first.
        // handleNextExercise (shown during celebrate) moves the exercise to doneExerciseIds.
      }
    }

    // Warmup finished → start countdown
    if (state.stage === "warmup" && state.phaseStartedAt) {
      const elapsed = Math.floor((now - state.phaseStartedAt) / 1000);
      if (elapsed >= WARMUP_SECS) {
        setExerciseStates((prev) => {
          const s = prev[activeExerciseId];
          if (!s || s.stage !== "warmup") return prev;
          return {
            ...prev,
            [activeExerciseId]: {
              ...s,
              stage: "countdown",
              phaseStartedAt: Date.now(),
              cardioSessionStartedAt: Date.now(),
            },
          };
        });
      }
    }

    // Strength rest auto-advance — moved here from render to avoid
    // repeated setState calls every 500ms tick while restLeft === 0.
    if (state.stage === "rest" && state.restStartedAt && restEditMode === null) {
      const restElapsed = Math.floor((now - state.restStartedAt) / 1000);
      if (restElapsed >= REST_DURATION_SECS) {
        setExerciseStates((prev) => {
          const s = prev[activeExerciseId];
          if (!s || s.stage !== "rest") return prev;
          return {
            ...prev,
            [activeExerciseId]: {
              ...s,
              stage: "setup",
              restStartedAt: null,
              beginMessage: pick(BEGIN_MESSAGES),
            },
          };
        });
        setRestEditMode(null);
      }
    }
  }, [now, activeExerciseId, exerciseStates, restEditMode]);

  const updateState = useCallback(
    (id: string, updater: (s: ExerciseState) => ExerciseState) => {
      setExerciseStates((prev) => {
        const cur = prev[id];
        if (!cur) return prev;
        return { ...prev, [id]: updater(cur) };
      });
    },
    []
  );

  // ── Strength actions ───────────────────────────────────────────────────────

  const handleBeginSet = useCallback(() => {
    if (!activeExerciseId) return;
    setWorkoutStarted(true);
    updateState(activeExerciseId, (s) => ({
      ...s,
      stage: "active",
      activeMessage: pick(ACTIVE_MESSAGES),
      exerciseStartedAt: s.exerciseStartedAt ?? Date.now(),
    }));
    setRestEditMode(null);
  }, [activeExerciseId, updateState]);

  const handleEndSet = useCallback(async () => {
    if (!activeExerciseId || endingSet) return;
    const state = exerciseStates[activeExerciseId];
    if (!state) return;
    setEndingSet(true);
    try {
      const result = await addSet(activeExerciseId, state.setupValues, "manual");
      const addResult = result as AddSetResult | null;
      if (!addResult) { toast.error("Failed to log set"); return; }
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
      updateState(activeExerciseId, (s) => ({
        ...s,
        stage: "rest",
        lastLogId: logId,
        lastLogValues: s.setupValues,
        restStartedAt: Date.now(),
        restMessage: pick(REST_MESSAGES),
      }));
      setRestEditMode(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log set");
    } finally {
      setEndingSet(false);
    }
  }, [activeExerciseId, endingSet, exerciseStates, addSet, updateState]);

  const handleRestDone = useCallback(() => {
    if (!activeExerciseId) return;
    updateState(activeExerciseId, (s) => ({
      ...s,
      stage: "setup",
      restStartedAt: null,
      beginMessage: pick(BEGIN_MESSAGES),
    }));
    setRestEditMode(null);
  }, [activeExerciseId, updateState]);

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
      if (error) { toast.error("Failed to update set"); return; }
      await refetch();
      updateState(activeExerciseId, (s) => ({
        ...s,
        lastLogValues: values,
        setupValues: values,
        // restStartedAt unchanged — rest timer keeps running
      }));
      setRestEditMode(null);
    },
    [activeExerciseId, exerciseStates, supabase, refetch, updateState]
  );

  const handleSaveNextSet = useCallback(
    (values: SetValues) => {
      if (!activeExerciseId) return;
      updateState(activeExerciseId, (s) => ({ ...s, setupValues: values }));
      setRestEditMode(null);
    },
    [activeExerciseId, updateState]
  );

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

  // ── Cardio actions ─────────────────────────────────────────────────────────

  /** Timed: begin → warmup phase */
  const handleTimedBegin = useCallback(() => {
    if (!activeExerciseId) return;
    setWorkoutStarted(true);
    updateState(activeExerciseId, (s) => ({
      ...s,
      stage: "warmup",
      phaseStartedAt: Date.now(),
    }));
  }, [activeExerciseId, updateState]);

  /** Timed: tap button during countdown = early stop, still celebrate */
  const handleTimedStop = useCallback(() => {
    if (!activeExerciseId) return;
    const state = exerciseStates[activeExerciseId];
    if (!state) return;
    const elapsed = state.cardioSessionStartedAt
      ? Math.floor((Date.now() - state.cardioSessionStartedAt) / 1000)
      : 0;
    // Update UI immediately — no waiting for DB
    triggerConfetti("pr");
    updateState(activeExerciseId, (s) => ({ ...s, stage: "celebrate" }));
    // Don't clear activeExerciseId here — celebrate screen needs to render first.
    // handleNextExercise (shown during celebrate) moves the exercise to doneExerciseIds.
    // Fire DB write in background
    void addSet(
      activeExerciseId,
      { ...emptySetValues(), durationSeconds: elapsed, notes: state.timedNotes || null },
      "manual"
    );
  }, [activeExerciseId, exerciseStates, addSet, updateState]);

  /** HIIT: begin → 10s pre-start countdown */
  const handleHiitBegin = useCallback(() => {
    if (!activeExerciseId) return;
    setWorkoutStarted(true);
    updateState(activeExerciseId, (s) => ({
      ...s,
      stage: "prestart",
      phaseStartedAt: Date.now(),
      hiitCurrentCycle: 0,
      hiitCyclesCompleted: 0,
    }));
  }, [activeExerciseId, updateState]);

  /** HIIT: stop at any phase — log what was done, no celebration */
  const handleHiitStop = useCallback(() => {
    if (!activeExerciseId) return;
    const state = exerciseStates[activeExerciseId];
    if (!state) return;
    const elapsed = state.cardioSessionStartedAt
      ? Math.floor((Date.now() - state.cardioSessionStartedAt) / 1000)
      : 0;
    const cycleInfo = `${state.hiitCyclesCompleted} of ${state.hiitCycles} cycles`;
    // Update UI immediately
    setDoneExerciseIds((prev) =>
      prev.includes(activeExerciseId) ? prev : [...prev, activeExerciseId]
    );
    setIncompleteExerciseIds((prev) => new Set([...prev, activeExerciseId]));
    setActiveExerciseId(null);
    updateState(activeExerciseId, (s) => ({
      ...s,
      stage: "setup",
      phaseStartedAt: null,
      hiitCurrentCycle: 0,
      hiitCyclesCompleted: 0,
      cardioSessionStartedAt: null,
    }));
    // Fire DB write in background
    void addSet(
      activeExerciseId,
      {
        ...emptySetValues(),
        durationSeconds: elapsed,
        notes: state.timedNotes ? `${cycleInfo} — ${state.timedNotes}` : cycleInfo,
      },
      "manual"
    );
  }, [activeExerciseId, exerciseStates, addSet, updateState]);

  // ── Move on / finish ───────────────────────────────────────────────────────

  const handleNextExercise = useCallback(() => {
    if (!activeExerciseId) return;
    const newDone = doneExerciseIds.includes(activeExerciseId)
      ? doneExerciseIds
      : [...doneExerciseIds, activeExerciseId];
    setDoneExerciseIds(newDone);
    setRestEditMode(null);

    // Plan workouts: walk through exercises in order, skip ones already done
    if (workout?.plan_id) {
      const next = exercisesInWorkout.find(
        (e) => e.exercise.id !== activeExerciseId && !newDone.includes(e.exercise.id)
      );
      if (next) {
        setActiveExerciseId(next.exercise.id);
        return;
      }
    }

    // Ad-hoc workout or all plan exercises done — show search / let them finish
    setActiveExerciseId(null);
    setShowExerciseSearch(true);
  }, [activeExerciseId, doneExerciseIds, exercisesInWorkout, workout?.plan_id]);

  const handleAddExercise = useCallback(
    (exercise: Exercise) => {
      addExercise(exercise);
      setActiveExerciseId(exercise.id);
      setRestEditMode(null);
      setShowExerciseSearch(false);
      setExerciseStates((prev) => {
        if (prev[exercise.id]) return prev;
        return { ...prev, [exercise.id]: makeInitialState(exercise, []) };
      });
    },
    [addExercise]
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
  const activeState = activeExerciseId
    ? (exerciseStates[activeExerciseId] ?? null)
    : null;
  const activeStage = activeState?.stage ?? null;

  const workoutTimerDisplay = useMemo(
    () => (workoutStarted ? formatSecs(workoutElapsed) : null),
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

  // ── Guards ─────────────────────────────────────────────────────────────────

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

  const renderHeader = (exercise: Exercise, logs: ExerciseLog[]) => (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-2">
        <h2 className="truncate font-display text-2xl font-bold uppercase tracking-wide text-foreground">
          {exercise.name}
        </h2>
        <button
          type="button"
          onClick={() => setInfoExercise(exercise)}
          className="shrink-0 rounded-full border border-zinc-300 p-1.5 text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700"
          title="How to do this exercise"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>
      {logs.length > 0 && <DotsIndicator count={logs.length} />}
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

  // ── Strength stages ────────────────────────────────────────────────────────

  const renderStrength = () => {
    if (!activeExercise || !activeState) return null;
    const { exercise, logs } = activeExercise;
    const { stage, setupValues, lastLogId, lastLogValues, restStartedAt } = activeState;

    // Active: red circle only
    if (stage === "active") {
      return (
        <div className="space-y-6 py-4">
          {renderHeader(exercise, logs)}
          <CircleButton
            color="red"
            message={activeState.activeMessage}
            onClick={handleEndSet}
            disabled={endingSet}
          />
        </div>
      );
    }

    // Setup — first set shows drums; subsequent sets show values as hint only
    if (stage === "setup") {
      const isFirstSet = logs.length === 0;
      const repHint = setupValues.reps != null ? `${setupValues.reps} reps` : null;
      const weightHint = setupValues.weightLbs != null ? `@ ${setupValues.weightLbs} lbs` : null;
      const hint = [repHint, weightHint].filter(Boolean).join(" ");

      return (
        <div className="space-y-4">
          {renderHeader(exercise, logs)}
          {!isFirstSet && hint && (
            <div className="text-center text-sm text-zinc-400">
              Set {logs.length + 1} — {hint}
            </div>
          )}
          {isFirstSet ? (
            <SetupDrums
              values={setupValues}
              onChange={(v) => updateState(exercise.id, (s) => ({ ...s, setupValues: v }))}
            />
          ) : null}
          <CircleButton
            color="green"
            message={activeState.beginMessage}
            onClick={handleBeginSet}
          />
          {renderSetLog(logs)}
        </div>
      );
    }

    // Rest — restStartedAt drives the countdown; edit forms don't reset it
    if (stage === "rest") {
      const restElapsed = restStartedAt
        ? Math.floor((now - restStartedAt) / 1000)
        : REST_DURATION_SECS;
      const restLeft = Math.max(0, REST_DURATION_SECS - restElapsed);

      const rm = Math.floor(restLeft / 60);
      const rs = restLeft % 60;

      // Edit Last Set
      if (restEditMode === "last" && lastLogId) {
        return (
          <div className="space-y-4">
            {renderHeader(exercise, logs)}
            <div className="space-y-3 rounded-xl border border-zinc-300 bg-white p-4">
              <div className="text-sm font-medium text-zinc-700">
                What did you actually do?
              </div>
              <SetupDrums
                values={lastLogValues}
                onChange={(v) =>
                  updateState(exercise.id, (s) => ({ ...s, lastLogValues: v }))
                }
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="min-h-[44px] flex-1 border-zinc-300"
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

      // Edit Next Set
      if (restEditMode === "next") {
        return (
          <div className="space-y-4">
            {renderHeader(exercise, logs)}
            <div className="space-y-3 rounded-xl border border-zinc-300 bg-white p-4">
              <div className="text-sm font-medium text-zinc-700">
                Set {logs.length + 1} — adjust before you start
              </div>
              <SetupDrums
                values={setupValues}
                onChange={(v) =>
                  updateState(exercise.id, (s) => ({ ...s, setupValues: v }))
                }
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="min-h-[44px] flex-1 border-zinc-300"
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

      // Default rest
      return (
        <div className="space-y-4">
          {renderHeader(exercise, logs)}
          {activeState.restMessage && (
            <div className="text-center text-base font-semibold text-zinc-800">
              {activeState.restMessage}
            </div>
          )}
          <div className="flex flex-col items-center gap-1">
            <div className="text-6xl font-bold tabular-nums text-zinc-900">
              {rm}:{rs.toString().padStart(2, "0")}
            </div>
            <div className="text-xs uppercase tracking-widest text-zinc-500">rest</div>
          </div>
          <Button
            className="w-full min-h-[44px] bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            onClick={handleRestDone}
          >
            Skip Rest
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="min-h-[44px] border-zinc-300"
              onClick={() => setRestEditMode("last")}
            >
              Edit Last Set
            </Button>
            <Button
              variant="outline"
              className="min-h-[44px] border-zinc-300"
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

  // ── Cardio stages ──────────────────────────────────────────────────────────

  const renderCardio = () => {
    if (!activeExercise || !activeState) return null;
    const { exercise, logs } = activeExercise;
    const { stage, cardioMode, timedDurationMinutes, timedNotes,
            hiitIntenseSecs, hiitRestSecs, hiitCycles,
            phaseStartedAt, hiitCurrentCycle, hiitCyclesCompleted } = activeState;

    // ── Setup ──────────────────────────────────────────────────────────────
    if (stage === "setup") {
      const hiitTotal = hiitTotalMinutes(hiitIntenseSecs, hiitRestSecs, hiitCycles);
      return (
        <div className="space-y-5">
          {renderHeader(exercise, logs)}

          {/* Mode toggle */}
          <div className="flex rounded-lg border border-zinc-300 overflow-hidden">
            {(["timed", "hiit"] as CardioMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => updateState(exercise.id, (s) => ({ ...s, cardioMode: m }))}
                className={[
                  "flex-1 min-h-[44px] text-sm font-semibold uppercase tracking-wider transition-colors",
                  cardioMode === m
                    ? "bg-zinc-100 text-zinc-900"
                    : "bg-transparent text-zinc-500 hover:text-zinc-800",
                ].join(" ")}
              >
                {m === "timed" ? "Timed" : "HIIT"}
              </button>
            ))}
          </div>

          {cardioMode === "timed" ? (
            <div className="space-y-4">
              <DrumInput
                value={timedDurationMinutes}
                onChange={(v) =>
                  updateState(exercise.id, (s) => ({ ...s, timedDurationMinutes: Math.max(1, v) }))
                }
                label="Duration"
                unit="min"
                min={1}
                max={120}
                step={1}
              />
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Notes / resistance</label>
                <input
                  type="text"
                  value={timedNotes}
                  onChange={(e) =>
                    updateState(exercise.id, (s) => ({ ...s, timedNotes: e.target.value }))
                  }
                  placeholder="e.g. Level 8, 85 rpm..."
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
              </div>
              <CircleButton color="green" message="LET'S RIDE 🐺" onClick={handleTimedBegin} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <DrumInput
                  value={hiitIntenseSecs}
                  onChange={(v) =>
                    updateState(exercise.id, (s) => ({ ...s, hiitIntenseSecs: Math.max(10, v) }))
                  }
                  label="Intense"
                  unit="sec"
                  min={10}
                  max={300}
                  step={5}
                />
                <DrumInput
                  value={hiitRestSecs}
                  onChange={(v) =>
                    updateState(exercise.id, (s) => ({ ...s, hiitRestSecs: Math.max(5, v) }))
                  }
                  label="Rest"
                  unit="sec"
                  min={5}
                  max={120}
                  step={5}
                />
                <DrumInput
                  value={hiitCycles}
                  onChange={(v) =>
                    updateState(exercise.id, (s) => ({ ...s, hiitCycles: Math.max(1, v) }))
                  }
                  label="Cycles"
                  min={1}
                  max={50}
                  step={1}
                />
              </div>
              <div className="text-center text-sm text-zinc-400">
                ≈ {hiitTotal} min total
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Notes / resistance</label>
                <input
                  type="text"
                  value={timedNotes}
                  onChange={(e) =>
                    updateState(exercise.id, (s) => ({ ...s, timedNotes: e.target.value }))
                  }
                  placeholder="e.g. Level 8, 85 rpm..."
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
              </div>
              <CircleButton color="green" message="LET'S GO 🐺" onClick={handleHiitBegin} />
            </div>
          )}
        </div>
      );
    }

    // ── Timed: warmup ──────────────────────────────────────────────────────
    if (stage === "warmup") {
      const elapsed = phaseStartedAt
        ? Math.floor((now - phaseStartedAt) / 1000)
        : 0;
      const left = Math.max(0, WARMUP_SECS - elapsed);
      return (
        <div className="space-y-6 py-4">
          {renderHeader(exercise, logs)}
          <div className="flex flex-col items-center gap-2">
            <div className="text-5xl font-bold tabular-nums text-zinc-900">
              {formatSecs(left)}
            </div>
            <div className="text-xs uppercase tracking-widest text-zinc-500">
              warm up
            </div>
          </div>
          <div className="text-center text-2xl font-bold text-green-400">
            GET MOVING 🐺
          </div>
        </div>
      );
    }

    // ── Timed: countdown ──────────────────────────────────────────────────
    if (stage === "countdown") {
      const totalSecs = timedDurationMinutes * 60;
      const elapsed = phaseStartedAt
        ? Math.floor((now - phaseStartedAt) / 1000)
        : 0;
      const remaining = Math.max(0, totalSecs - elapsed);
      const msg = timedButtonMessage(elapsed, remaining);
      return (
        <div className="space-y-6 py-4">
          {renderHeader(exercise, logs)}
          <div className="flex flex-col items-center gap-2">
            <div className="text-6xl font-bold tabular-nums text-zinc-900">
              {formatSecs(remaining)}
            </div>
            <div className="text-xs uppercase tracking-widest text-zinc-500">
              remaining
            </div>
          </div>
          <CircleButton color="red" message={msg} onClick={handleTimedStop} />
        </div>
      );
    }

    // ── HIIT: pre-start ───────────────────────────────────────────────────
    if (stage === "prestart") {
      const elapsed = phaseStartedAt ? Math.floor((now - phaseStartedAt) / 1000) : 0;
      const left = Math.max(0, HIIT_PRESTART_SECS - elapsed);
      return (
        <div className="space-y-6 py-4">
          {renderHeader(exercise, logs)}
          <div className="flex flex-col items-center gap-2">
            <div className="text-6xl font-bold tabular-nums text-zinc-900">{left}</div>
            <div className="text-xs uppercase tracking-widest text-zinc-500">
              get ready
            </div>
          </div>
          <div className="text-center text-sm text-zinc-400">
            {hiitCycles} cycles · {hiitIntenseSecs}s on / {hiitRestSecs}s off
          </div>
          <Button
            variant="outline"
            className="w-full min-h-[44px] border-zinc-300 text-zinc-400"
            onClick={handleHiitStop}
          >
            Cancel
          </Button>
        </div>
      );
    }

    // ── HIIT: intense ─────────────────────────────────────────────────────
    if (stage === "intense") {
      const elapsed = phaseStartedAt ? Math.floor((now - phaseStartedAt) / 1000) : 0;
      const left = Math.max(0, hiitIntenseSecs - elapsed);
      return (
        <div className="space-y-4 py-4">
          {renderHeader(exercise, logs)}
          <div className="text-center text-sm text-zinc-400">
            Cycle {hiitCyclesCompleted + 1} of {hiitCycles}
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="text-6xl font-bold tabular-nums text-green-400">
              {formatSecs(left)}
            </div>
            <div className="text-xs uppercase tracking-widest text-green-600">
              intense
            </div>
          </div>
          <CircleButton color="green" message="STOP" onClick={handleHiitStop} />
        </div>
      );
    }

    // ── HIIT: recovery ────────────────────────────────────────────────────
    if (stage === "recovery") {
      const elapsed = phaseStartedAt ? Math.floor((now - phaseStartedAt) / 1000) : 0;
      const left = Math.max(0, hiitRestSecs - elapsed);
      const comingUp = left <= 10;
      return (
        <div className="space-y-4 py-4">
          {renderHeader(exercise, logs)}
          <div className="text-center text-sm text-zinc-400">
            Cycle {hiitCyclesCompleted + 1} of {hiitCycles} next
          </div>
          <div className="flex flex-col items-center gap-2">
            <div
              className={[
                "text-6xl font-bold tabular-nums",
                comingUp ? "text-yellow-400" : "text-orange-400",
              ].join(" ")}
            >
              {formatSecs(left)}
            </div>
            <div
              className={[
                "text-xs uppercase tracking-widest",
                comingUp ? "text-yellow-600" : "text-orange-600",
              ].join(" ")}
            >
              {comingUp ? "COMING UP…" : "recovery"}
            </div>
          </div>
          <CircleButton color="orange" message="STOP" onClick={handleHiitStop} />
        </div>
      );
    }

    // ── Celebrate ─────────────────────────────────────────────────────────
    if (stage === "celebrate") {
      const isHiit = cardioMode === "hiit";
      return (
        <div className="space-y-4 py-6 text-center">
          {renderHeader(exercise, logs)}
          <div className="text-4xl font-extrabold text-zinc-900">
            {isHiit
              ? `${hiitCyclesCompleted} cycles done! 🐺`
              : "You did it! 🎉"}
          </div>
          <div className="text-zinc-400 text-sm">
            {isHiit
              ? `${hiitIntenseSecs}s on / ${hiitRestSecs}s off`
              : `${timedDurationMinutes} min`}
          </div>
        </div>
      );
    }

    return null;
  };

  // ── Done pills ─────────────────────────────────────────────────────────────

  const renderDoneExercises = () => {
    if (!doneExerciseIds.length) return null;
    return (
      <div className="space-y-2">
        {doneExerciseIds.map((id) => {
          const ex = exercisesInWorkout.find((e) => e.exercise.id === id);
          if (!ex) return null;
          const expanded = expandedDoneId === id;
          const incomplete = incompleteExerciseIds.has(id);
          return (
            <div key={id}>
              <button
                type="button"
                className={[
                  "flex w-full items-center justify-between rounded-full border px-4 py-3 text-zinc-900",
                  incomplete
                    ? "border-red-400/60 bg-red-50 active:bg-red-100"
                    : "border-green-500/50 bg-green-50 active:bg-green-100",
                ].join(" ")}
                onClick={() => setExpandedDoneId((prev) => (prev === id ? null : id))}
              >
                <span className="min-w-0 truncate text-sm font-semibold">
                  {ex.exercise.name}
                  {incomplete && (
                    <span className="ml-2 text-xs font-normal text-red-600">stopped early</span>
                  )}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <DotsIndicator count={ex.logs.length} />
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
                  />
                </div>
              </button>
              {expanded && (
                <div className="mt-2 space-y-2 rounded-xl border border-zinc-200 bg-card p-3">
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

  // Is the current stage one where tapping away would be disruptive?
  const isActiveStage =
    activeStage === "active" ||
    activeStage === "warmup" ||
    activeStage === "countdown" ||
    activeStage === "intense" ||
    activeStage === "recovery" ||
    activeStage === "prestart";

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-4 pb-32">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-background py-2">
          <button
            type="button"
            onClick={() => setShowAbandonConfirm(true)}
            className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors px-1 py-2 min-h-[44px]"
            title="Cancel workout"
          >
            Cancel
          </button>
          <div className="tabular-nums font-mono text-lg text-zinc-800">
            {workoutTimerDisplay ?? ""}
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFinishConfirm(true)}
            className="min-h-[44px] border-zinc-300"
          >
            Finish
          </Button>
        </header>

        {/* Active exercise */}
        {activeExercise && activeState ? (
          <div className="rounded-xl bg-surface-low p-4">
            {isCardio(activeExercise.exercise) ? renderCardio() : renderStrength()}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-zinc-300 bg-white p-8 text-center">
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

        {renderDoneExercises()}
      </div>

      {/* Next Exercise — fixed above tabs, hidden during active/timed/hiit phases */}
      {activeExercise && !isActiveStage && activeStage !== "celebrate" && (
        <div className="fixed bottom-14 left-0 right-0 z-40 border-t border-zinc-200 bg-background px-4 py-2">
          <Button
            variant="outline"
            className="w-full min-h-[44px] border-zinc-300 text-zinc-700"
            onClick={handleNextExercise}
          >
            Next Exercise
          </Button>
        </div>
      )}

      {/* After celebrate, show Next Exercise */}
      {activeExercise && activeStage === "celebrate" && (
        <div className="fixed bottom-14 left-0 right-0 z-40 border-t border-zinc-200 bg-background px-4 py-2">
          <Button
            className="w-full min-h-[44px]"
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

      <Dialog open={showFinishConfirm} onOpenChange={setShowFinishConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End workout?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFinishConfirm(false)}
              className="flex-1"
            >
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

      <ExerciseInfoSheet
        exercise={infoExercise}
        onClose={() => setInfoExercise(null)}
      />

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
            You have a workout in progress. Your logged sets are saved but the workout
            won&apos;t be marked complete.
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
