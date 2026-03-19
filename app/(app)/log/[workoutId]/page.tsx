"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import type { MediaListItem } from "@/lib/mediaTypes";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

import { Plus, ChevronRight, Video } from "lucide-react";
import { WorkoutSummary } from "@/components/workout/WorkoutSummary";
import { ExerciseSearchSheet } from "@/components/workout/ExerciseSearchSheet";
import { MediaUpload } from "@/components/media/MediaUpload";
import { useWorkout, type AddSetResult } from "@/hooks/useWorkout";
import { showBadgeToast } from "@/components/gamification/BadgeToast";
import { showPRToast } from "@/components/gamification/PRToast";

type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
type ExerciseLog = Database["public"]["Tables"]["exercise_logs"]["Row"];

type SetValues = {
  reps: number | null;
  weightLbs: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  notes: string | null;
};

type RestInlineEditKind = "last" | "next" | null;

type ExerciseWorkflowMode = "active" | "collapsed";

type ActiveStage = 0 | 1 | 2 | 3 | 5 | 4; // 5 = ready for next set (3B), 4 = move-on confirmation

type ExerciseWorkflow = {
  mode: ExerciseWorkflowMode;
  activeStage: ActiveStage;
  cameFromRest: boolean;

  setupDraft: SetValues;
  nextDraft: SetValues;
  lastSetDraft: SetValues;
  lastSetLogId: string | null;
  lastSetNumber: number | null;

  startMessage: string;
  activeMessage: string;
  restMessage: string;

  state4EditMode: boolean;
};

const START_MESSAGES = [
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
  "Get some rest, hunter"
] as const;

const NEXT_REPEAT_FIRST = "Sir, Can I Have Another";
const NEXT_REPEAT_SUBSEQUENT = ["One More for the Wolf 🐺", "Again.", "Let's go again"] as const;

function pickRandomMessage(list: readonly string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

function formatSetLine(log: ExerciseLog): string {
  const parts: string[] = [];
  if (log.reps != null) parts.push(`${log.reps} reps`);
  if (log.weight_lbs != null) parts.push(`@ ${Number(log.weight_lbs)} lbs`);
  if (log.duration_seconds != null && log.reps == null && log.weight_lbs == null) {
    parts.push(`${log.duration_seconds}s`);
  } else if (log.duration_seconds != null && (log.reps != null || log.weight_lbs != null)) {
    parts.push(`${log.duration_seconds}s`);
  }
  if (log.distance_meters != null) {
    parts.push(`${Number(log.distance_meters)}m`);
  }
  return parts.length ? parts.join(" ") : "—";
}

function SetsDotsIndicator({ count }: { count: number }) {
  const maxDots = 10;
  const dots = Math.min(count, maxDots);
  const extra = count - maxDots;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-400">Sets</span>
      <div className="flex items-center gap-1">
        {Array.from({ length: dots }).map((_, idx) => (
          <div
            key={idx}
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: "#22c55e" }}
          />
        ))}
        {extra > 0 ? (
          <span className="text-xs text-zinc-500">+{extra}</span>
        ) : null}
      </div>
    </div>
  );
}

function DotsOnlyIndicator({ count }: { count: number }) {
  const maxDots = 10;
  const dots = Math.min(count, maxDots);
  const extra = count - maxDots;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: dots }).map((_, idx) => (
        <div
          key={idx}
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: "#22c55e" }}
        />
      ))}
      {extra > 0 ? (
        <span className="text-xs text-zinc-500">+{extra}</span>
      ) : null}
    </div>
  );
}

function renderSetReadOnlyList(logs: ExerciseLog[]) {
  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div
          key={log.id}
          className="rounded-lg border border-zinc-800 bg-card/40 p-3 text-sm text-zinc-100"
        >
          Set {log.set_number} — {formatSetLine(log)}
        </div>
      ))}
    </div>
  );
}

function emptySetValues(): SetValues {
  return {
    reps: null,
    weightLbs: null,
    durationSeconds: null,
    distanceMeters: null,
    notes: null,
  };
}

function clampNullString(s: string): string | null {
  const v = s.trim();
  return v.length ? v : null;
}

function parseNullableInt(s: string): number | null {
  const v = s.trim();
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function parseNullableFloat(s: string): number | null {
  const v = s.trim();
  if (!v) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function playBeepOnce(ref: { current: boolean }): void {
  if (ref.current) return;
  ref.current = true;
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const audioContext = new AudioContextCtor();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.frequency.value = 440;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.2, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.2
    );
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch {
    // Ignore if Web Audio fails.
  }
}

function RestCountdown({
  initialSeconds,
  onDone,
  onSkip,
  className,
}: {
  initialSeconds: number;
  onDone: () => void;
  onSkip: () => void;
  className?: string;
}) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const intervalRef = useRef<number | null>(null);
  const beepPlayedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  const onSkipRef = useRef(onSkip);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    onSkipRef.current = onSkip;
  }, [onSkip]);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
    beepPlayedRef.current = false;

    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          window.clearInterval(id);
          intervalRef.current = null;
          playBeepOnce(beepPlayedRef);
          onDoneRef.current();
          return 0;
        }
        return next;
      });
    }, 1000);

    intervalRef.current = id;
    return () => {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [initialSeconds]);

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  const display = `${m}:${s.toString().padStart(2, "0")}`;

  const skip = useCallback(() => {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onSkipRef.current();
  }, []);

  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-xl border bg-card/50 p-4 ${className ?? ""}`}
    >
      <div className="text-5xl font-bold tabular-nums">{display}</div>
      <button
        type="button"
        onClick={skip}
        className="min-h-[44px] min-w-[44px] px-2 py-1 text-sm text-muted-foreground underline underline-offset-2"
      >
        Skip
      </button>
    </div>
  );
}

function SetupForm({
  initial,
  onCancel,
  onSave,
  saving,
}: {
  initial: SetValues;
  onCancel: () => void;
  onSave: (values: SetValues) => void;
  saving: boolean;
}) {
  const [reps, setReps] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [distanceMeters, setDistanceMeters] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setReps(initial.reps != null ? String(initial.reps) : "");
    setWeightLbs(initial.weightLbs != null ? String(initial.weightLbs) : "");
    setDurationSeconds(
      initial.durationSeconds != null ? String(initial.durationSeconds) : ""
    );
    setDistanceMeters(
      initial.distanceMeters != null ? String(initial.distanceMeters) : ""
    );
    setNotes(initial.notes ?? "");
  }, [initial]);

  const save = useCallback(() => {
    onSave({
      reps: parseNullableInt(reps),
      weightLbs: parseNullableFloat(weightLbs),
      durationSeconds: parseNullableInt(durationSeconds),
      distanceMeters: parseNullableFloat(distanceMeters),
      notes: clampNullString(notes),
    });
  }, [durationSeconds, distanceMeters, notes, onSave, reps, weightLbs]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-card/40 p-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground" htmlFor="setup-reps">
            Reps
          </Label>
          <Input
            id="setup-reps"
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="mt-1 border-zinc-700 bg-zinc-900"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground" htmlFor="setup-weight">
            Weight lbs
          </Label>
          <Input
            id="setup-weight"
            type="number"
            inputMode="decimal"
            value={weightLbs}
            onChange={(e) => setWeightLbs(e.target.value)}
            className="mt-1 border-zinc-700 bg-zinc-900"
          />
        </div>
        <div>
          <Label
            className="text-xs text-muted-foreground"
            htmlFor="setup-duration"
          >
            Duration sec
          </Label>
          <Input
            id="setup-duration"
            type="number"
            inputMode="numeric"
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(e.target.value)}
            className="mt-1 border-zinc-700 bg-zinc-900"
          />
        </div>
        <div>
          <Label
            className="text-xs text-muted-foreground"
            htmlFor="setup-distance"
          >
            Distance m
          </Label>
          <Input
            id="setup-distance"
            type="number"
            inputMode="decimal"
            value={distanceMeters}
            onChange={(e) => setDistanceMeters(e.target.value)}
            className="mt-1 border-zinc-700 bg-zinc-900"
          />
        </div>
      </div>
      <div className="mt-3">
        <Label className="text-xs text-muted-foreground" htmlFor="setup-notes">
          Notes
        </Label>
        <Input
          id="setup-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional"
          className="mt-1 border-zinc-700 bg-zinc-900"
        />
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="min-h-[44px] flex-1 border-zinc-700"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={save}
          disabled={saving}
          className="min-h-[44px] flex-1"
        >
          {saving ? "Saving..." : "Save Set"}
        </Button>
      </div>
    </div>
  );
}

function SimpleEditForm({
  title,
  initial,
  onCancel,
  onSave,
  saving,
}: {
  title: string;
  initial: { reps: number | null; weightLbs: number | null; notes: string | null };
  onCancel: () => void;
  onSave: (values: { reps: number | null; weightLbs: number | null; notes: string | null }) => void;
  saving: boolean;
}) {
  const [reps, setReps] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setReps(initial.reps != null ? String(initial.reps) : "");
    setWeightLbs(initial.weightLbs != null ? String(initial.weightLbs) : "");
    setNotes(initial.notes ?? "");
  }, [initial.notes, initial.reps, initial.weightLbs]);

  const save = useCallback(() => {
    onSave({
      reps: parseNullableInt(reps),
      weightLbs: parseNullableFloat(weightLbs),
      notes: clampNullString(notes),
    });
  }, [notes, onSave, reps, weightLbs]);

  return (
    <div className="rounded-xl border border-zinc-700 bg-card p-3">
      <div className="mb-2 text-sm font-medium text-zinc-100">{title}</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground" htmlFor="simple-reps">
            Reps
          </Label>
          <Input
            id="simple-reps"
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="mt-1 border-zinc-700 bg-zinc-900"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground" htmlFor="simple-weight">
            Weight lbs
          </Label>
          <Input
            id="simple-weight"
            type="number"
            inputMode="decimal"
            value={weightLbs}
            onChange={(e) => setWeightLbs(e.target.value)}
            className="mt-1 border-zinc-700 bg-zinc-900"
          />
        </div>
      </div>
      <div className="mt-3">
        <Label className="text-xs text-muted-foreground" htmlFor="simple-notes">
          Notes
        </Label>
        <Input
          id="simple-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional"
          className="mt-1 border-zinc-700 bg-zinc-900"
        />
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="min-h-[44px] flex-1 border-zinc-700"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={save}
          disabled={saving}
          className="min-h-[44px] flex-1"
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

function EditableSetRowFull({
  log,
  onUpdate,
}: {
  log: ExerciseLog;
  onUpdate: (payload: SetValues) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [reps, setReps] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [distanceMeters, setDistanceMeters] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    setReps(log.reps != null ? String(log.reps) : "");
    setWeightLbs(log.weight_lbs != null ? String(Number(log.weight_lbs)) : "");
    setDurationSeconds(
      log.duration_seconds != null ? String(log.duration_seconds) : ""
    );
    setDistanceMeters(
      log.distance_meters != null ? String(Number(log.distance_meters)) : ""
    );
    setNotes(log.notes ?? "");
  }, [
    editing,
    log.duration_seconds,
    log.distance_meters,
    log.id,
    log.notes,
    log.reps,
    log.weight_lbs,
  ]);

  const cancel = useCallback(() => {
    setEditing(false);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await onUpdate({
        reps: parseNullableInt(reps),
        weightLbs: parseNullableFloat(weightLbs),
        durationSeconds: parseNullableInt(durationSeconds),
        distanceMeters: parseNullableFloat(distanceMeters),
        notes: clampNullString(notes),
      });
      setEditing(false);
    } catch {
      toast.error("Failed to save set");
    } finally {
      setSaving(false);
    }
  }, [
    durationSeconds,
    distanceMeters,
    notes,
    onUpdate,
    reps,
    weightLbs,
  ]);

  if (!editing) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setEditing(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setEditing(true);
        }}
        className="min-h-[44px] cursor-pointer rounded-lg border border-zinc-800 bg-card p-3 active:bg-accent"
      >
        <div className="text-sm font-medium text-zinc-100">
          Set {log.set_number} — {formatSetLine(log)}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-card p-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground">
        Edit set {log.set_number}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground" htmlFor={`er-${log.id}`}>
            Reps
          </Label>
          <Input
            id={`er-${log.id}`}
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="mt-1 border-zinc-700 bg-zinc-900"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground" htmlFor={`ew-${log.id}`}>
            Weight lbs
          </Label>
          <Input
            id={`ew-${log.id}`}
            type="number"
            inputMode="decimal"
            value={weightLbs}
            onChange={(e) => setWeightLbs(e.target.value)}
            className="mt-1 border-zinc-700 bg-zinc-900"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground" htmlFor={`ed-${log.id}`}>
            Duration sec
          </Label>
          <Input
            id={`ed-${log.id}`}
            type="number"
            inputMode="numeric"
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(e.target.value)}
            className="mt-1 border-zinc-700 bg-zinc-900"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground" htmlFor={`ei-${log.id}`}>
            Distance m
          </Label>
          <Input
            id={`ei-${log.id}`}
            type="number"
            inputMode="decimal"
            value={distanceMeters}
            onChange={(e) => setDistanceMeters(e.target.value)}
            className="mt-1 border-zinc-700 bg-zinc-900"
          />
        </div>
      </div>
      <div className="mt-3">
        <Label className="text-xs text-muted-foreground" htmlFor={`en-${log.id}`}>
          Notes
        </Label>
        <Input
          id={`en-${log.id}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 border-zinc-700 bg-zinc-900"
        />
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={cancel}
          className="min-h-[44px] flex-1 border-zinc-700"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={save}
          disabled={saving}
          className="min-h-[44px] flex-1"
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

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
  const bg = variant === "green" ? "bg-green-500" : "bg-red-500";
  const hover = variant === "green" ? "hover:bg-green-400" : "hover:bg-red-400";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "mx-auto flex h-[220px] w-[220px] items-center justify-center rounded-full",
        "min-h-[200px] min-w-[200px] border border-black/10",
        bg,
        hover,
        "px-4 text-center text-white shadow-lg active:translate-y-px",
        disabled ? "opacity-50 cursor-not-allowed" : "",
      ].join(" ")}
    >
      <div className="text-center text-lg font-extrabold leading-tight">
        {message}
      </div>
    </button>
  );
}

export default function ActiveWorkoutPage() {
  const params = useParams();
  const workoutId = params.workoutId as string;
  const router = useRouter();

  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState("");

  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const [dismissedExerciseIds, setDismissedExerciseIds] = useState<Set<string>>(
    () => new Set()
  );

  const [pillExpandedExerciseId, setPillExpandedExerciseId] = useState<string | null>(null);

  const [workflowByExerciseId, setWorkflowByExerciseId] = useState<Record<string, ExerciseWorkflow>>({});

  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);

  const [exerciseLibrary, setExerciseLibrary] = useState<Exercise[]>([]);

  const [workoutMedia, setWorkoutMedia] = useState<MediaListItem[]>([]);

  const [restInlineEditKind, setRestInlineEditKind] = useState<RestInlineEditKind>(null);
  const [editingLastSaving, setEditingLastSaving] = useState(false);
  const [editingNextSaving, setEditingNextSaving] = useState(false);

  const [setupSaving, setSetupSaving] = useState(false);

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

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setAthleteId(user.id);
    });
  }, [supabase]);

  useEffect(() => {
    supabase
      .from("exercises")
      .select("id, name, category")
      .then(({ data }) => {
        setExerciseLibrary((data ?? []) as Exercise[]);
      });
  }, [supabase]);

  useEffect(() => {
    if (!workout || !startedAt) return;
    if (!workoutName && startedAt) {
      const d = new Date(startedAt);
      setWorkoutName(`Ad Hoc Workout ${d.toLocaleDateString()}`);
    }
  }, [startedAt, workout, workoutName]);

  useEffect(() => {
    if (loading) return;
    const currentExercises = exercisesInWorkout.map((e) => e.exercise.id);

    setWorkflowByExerciseId((prev) => {
      const nextMap = { ...prev };
      for (const exId of currentExercises) {
        if (nextMap[exId]) continue;
        const ex = exercisesInWorkout.find((x) => x.exercise.id === exId);
        const logs = ex?.logs ?? [];
        const last = logs[logs.length - 1];
        const lastDraft: SetValues = last
          ? {
              reps: last.reps,
              weightLbs: last.weight_lbs != null ? Number(last.weight_lbs) : null,
              durationSeconds: last.duration_seconds,
              distanceMeters: last.distance_meters != null ? Number(last.distance_meters) : null,
              notes: last.notes,
            }
          : emptySetValues();
        nextMap[exId] = {
          mode: "active",
          activeStage: 0,
          cameFromRest: false,
          setupDraft: lastDraft,
          nextDraft: lastDraft,
          lastSetDraft: lastDraft,
          lastSetLogId: last ? last.id : null,
          lastSetNumber: last ? last.set_number : null,
          startMessage: pickRandomMessage(START_MESSAGES),
          activeMessage: pickRandomMessage(ACTIVE_MESSAGES),
          restMessage: '',
          state4EditMode: false,
        };
      }

      for (const existingId of Object.keys(nextMap)) {
        if (!currentExercises.includes(existingId)) {
          delete nextMap[existingId];
        }
      }

      return nextMap;
    });
  }, [exercisesInWorkout, loading]);

  useEffect(() => {
    if (loading) return;
    if (activeExerciseId && dismissedExerciseIds.has(activeExerciseId)) {
      setActiveExerciseId(null);
    }
    if (
      activeExerciseId &&
      workflowByExerciseId[activeExerciseId]?.mode === "collapsed"
    ) {
      setActiveExerciseId(null);
    }

    const hasCollapsedPills = exercisesInWorkout.some(
      (e) =>
        e.logs.length > 0 &&
        workflowByExerciseId[e.exercise.id]?.mode === "collapsed"
    );
    if (hasCollapsedPills) return;

    if (activeExerciseId) return;
    const next = exercisesInWorkout.find((e) => {
      const id = e.exercise.id;
      return !dismissedExerciseIds.has(id) && workflowByExerciseId[id]?.mode !== "collapsed";
    });
    setActiveExerciseId(next?.exercise.id ?? null);
  }, [activeExerciseId, dismissedExerciseIds, exercisesInWorkout, loading, workflowByExerciseId]);

  const refreshWorkoutMedia = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/media?workout_log_id=${encodeURIComponent(workoutId)}`
      );
      const json = (await res.json()) as { items?: MediaListItem[] };
      setWorkoutMedia(json.items ?? []);
    } catch {
      toast.error("Failed to load media");
    }
  }, [workoutId]);

  useEffect(() => {
    if (!workout || workout.completed_at) return;
    void refreshWorkoutMedia();
  }, [refreshWorkoutMedia, workout]);

  const elapsed = useMemo(() => {
    if (!startedAt) return { m: 0, s: 0, display: "0:00" };
    const ms = Date.now() - startedAt.getTime();
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return { m, s, display: `${m}:${s.toString().padStart(2, "0")}` };
  }, [startedAt]);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const id = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);
  const timerDisplay = useMemo(() => {
    const m = Math.floor(elapsedSeconds / 60);
    const s = elapsedSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [elapsedSeconds]);

  const getActiveExercise = useMemo(() => {
    if (!activeExerciseId) return null;
    return exercisesInWorkout.find((e) => e.exercise.id === activeExerciseId) ?? null;
  }, [activeExerciseId, exercisesInWorkout]);

  const activeWorkflow = activeExerciseId ? workflowByExerciseId[activeExerciseId] : null;

  const updateWorkflow = useCallback(
    (exerciseId: string, updater: (w: ExerciseWorkflow) => ExerciseWorkflow) => {
      setWorkflowByExerciseId((prev) => {
        const current = prev[exerciseId];
        if (!current) return prev;
        return { ...prev, [exerciseId]: updater(current) };
      });
    },
    []
  );

  const chooseNextActiveExerciseId = useCallback((excludeExerciseId?: string) => {
    const next = exercisesInWorkout.find((e) => {
      const id = e.exercise.id;
      return (
        id !== (excludeExerciseId ?? null) &&
        !dismissedExerciseIds.has(id) &&
        workflowByExerciseId[id]?.mode !== "collapsed"
      );
    });
    setActiveExerciseId(next?.exercise.id ?? null);
    setPillExpandedExerciseId(null);
    setRestInlineEditKind(null);
  }, [dismissedExerciseIds, exercisesInWorkout, workflowByExerciseId]);

  const handleCancelSetup = useCallback(() => {
    if (!activeExerciseId || !activeWorkflow) return;
    const exercise = exercisesInWorkout.find((e) => e.exercise.id === activeExerciseId);
    const logsCount = exercise?.logs.length ?? 0;
    if (logsCount === 0) {
      setDismissedExerciseIds((prev) => {
        const next = new Set(prev);
        next.add(activeExerciseId);
        return next;
      });
      setActiveExerciseId(null);
      setRestInlineEditKind(null);
      return;
    }
    updateWorkflow(activeExerciseId, (w) => ({
      ...w,
      activeStage: 5,
      cameFromRest: false,
      state4EditMode: false,
    }));
    setRestInlineEditKind(null);
  }, [
    activeExerciseId,
    activeWorkflow,
    exercisesInWorkout,
    updateWorkflow,
  ]);

  const updateExerciseLogFull = useCallback(
    async (logId: string, payload: SetValues) => {
      const { error } = await supabase.from("exercise_logs").update({
        reps: payload.reps,
        weight_lbs: payload.weightLbs,
        duration_seconds: payload.durationSeconds,
        distance_meters: payload.distanceMeters,
        notes: payload.notes,
      }).eq("id", logId);

      if (error) throw error;
      await refetch();
    },
    [refetch, supabase]
  );

  const updateExerciseLogSimple = useCallback(
    async (logId: string, payload: { reps: number | null; weightLbs: number | null; notes: string | null }) => {
      const existing = (await supabase.from("exercise_logs").select("duration_seconds, distance_meters").eq("id", logId).single()) as unknown;
      if (!existing) throw new Error("Failed to fetch set for update");
      await supabase.from("exercise_logs").update({
        reps: payload.reps,
        weight_lbs: payload.weightLbs,
        notes: payload.notes,
      }).eq("id", logId);
      await refetch();
    },
    [refetch, supabase]
  );

  const handleSaveSetup = useCallback(
    async (values: SetValues, via: "manual" = "manual") => {
      if (!activeExerciseId) return;
      if (!workoutId) return;
      setSetupSaving(true);
      try {
        const result = await addSet(activeExerciseId, values, via);
        const addResult = result as AddSetResult | null;
        if (!addResult) return;

        const { prHint, logId, setNumber } = addResult;
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

        updateWorkflow(activeExerciseId, (w) => ({
          ...w,
          activeStage: 1,
          cameFromRest: false,
          lastSetLogId: logId,
          lastSetNumber: setNumber,
          lastSetDraft: values,
          setupDraft: values,
          nextDraft: w.nextDraft,
          startMessage: pickRandomMessage(START_MESSAGES),
          state4EditMode: false,
        }));
        setRestInlineEditKind(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save set");
      } finally {
        setSetupSaving(false);
      }
    },
    [addSet, activeExerciseId, updateWorkflow, workoutId]
  );

  const handleStartReady = useCallback(() => {
    if (!activeExerciseId) return;
    updateWorkflow(activeExerciseId, (w) => ({
      ...w,
      activeStage: 2,
      activeMessage: pickRandomMessage(ACTIVE_MESSAGES),
    }));
    setRestInlineEditKind(null);
  }, [activeExerciseId, updateWorkflow]);

  const handleCompleteActiveSet = useCallback(() => {
    if (!activeExerciseId || !activeWorkflow) return;
    updateWorkflow(activeExerciseId, (w) => ({
      ...w,
      activeStage: 3,
      restMessage: pickRandomMessage(REST_MESSAGES),
      nextDraft: w.lastSetDraft,
      state4EditMode: false,
    }));
    setRestInlineEditKind(null);
  }, [activeExerciseId, activeWorkflow, updateWorkflow]);

  const handleRestComplete = useCallback(() => {
    if (!activeExerciseId) return;
    updateWorkflow(activeExerciseId, (w) => ({
      ...w,
      activeStage: 5,
      state4EditMode: false,
    }));
    setRestInlineEditKind(null);
  }, [activeExerciseId, updateWorkflow]);

  const handleAdvanceToMoveOn = useCallback(() => {
    if (!activeExerciseId) return;
    updateWorkflow(activeExerciseId, (w) => ({
      ...w,
      activeStage: 4,
      state4EditMode: false,
    }));
    setRestInlineEditKind(null);
  }, [activeExerciseId, updateWorkflow]);

  const handleSirCanIHaveAnother = useCallback(async () => {
    if (!activeExerciseId || !activeWorkflow) return;

    const nextValues = activeWorkflow.nextDraft;
    const result = await addSet(activeExerciseId, nextValues, "manual");
    const addResult = result as AddSetResult | null;
    if (!addResult) {
      toast.error("Failed to start next set");
      return;
    }

    const { prHint, logId, setNumber } = addResult;
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

    updateWorkflow(activeExerciseId, (w) => ({
      ...w,
      activeStage: 2, // go directly to ACTIVE SET (red button)
      cameFromRest: true,
      lastSetLogId: logId,
      lastSetNumber: setNumber,
      lastSetDraft: nextValues,
      setupDraft: nextValues,
      state4EditMode: false,
      activeMessage: pickRandomMessage(ACTIVE_MESSAGES),
    }));
    setRestInlineEditKind(null);
  }, [activeExerciseId, activeWorkflow, addSet, updateWorkflow]);

  const handleSaveAndCollapseExercise = useCallback(() => {
    if (!activeExerciseId) return;
    updateWorkflow(activeExerciseId, (w) => ({
      ...w,
      mode: "collapsed",
      activeStage: 4,
      state4EditMode: false,
    }));
    setActiveExerciseId(null);
    setPillExpandedExerciseId(null);
    setRestInlineEditKind(null);
  }, [activeExerciseId, updateWorkflow]);

  const handleSaveAndFinish = useCallback(
    async (perceivedEffort: number | null, overallNotes: string | null) => {
      try {
        const result = await completeWorkout(perceivedEffort, overallNotes);
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

  const completedPills = useMemo(() => {
    return exercisesInWorkout
      .map((e) => e.exercise.id)
      .filter((id) => workflowByExerciseId[id]?.mode === "collapsed")
      .filter((id) => !dismissedExerciseIds.has(id));
  }, [dismissedExerciseIds, exercisesInWorkout, workflowByExerciseId]);

  const renderActiveStage = () => {
    if (!getActiveExercise || !activeWorkflow || !activeExerciseId) {
      return (
            <div className="space-y-4">
          <Button
            variant="outline"
            size="lg"
            className="min-h-[44px] w-full border-zinc-700"
            onClick={() => setShowExerciseSearch(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Exercise
          </Button>
          <ExerciseSearchSheet
            open={showExerciseSearch}
            onOpenChange={setShowExerciseSearch}
                exercises={exerciseLibrary}
            onSelect={(ex) => {
              addExercise(ex);
              setShowExerciseSearch(false);
              setActiveExerciseId(ex.id);
              setWorkflowByExerciseId((prev) => {
                const last = emptySetValues();
                if (prev[ex.id]) return prev;
                return {
                  ...prev,
                  [ex.id]: {
                    mode: "active",
                    activeStage: 0,
                    cameFromRest: false,
                    setupDraft: last,
                    nextDraft: last,
                    lastSetDraft: last,
                    lastSetLogId: null,
                    lastSetNumber: null,
                    startMessage: pickRandomMessage(START_MESSAGES),
                    activeMessage: pickRandomMessage(ACTIVE_MESSAGES),
                    restMessage: '',
                    state4EditMode: false,
                  },
                };
              });
            }}
          />
        </div>
      );
    }

    const logs = getActiveExercise.logs;

    if (activeWorkflow.mode !== "active") return null;

    if (activeWorkflow.activeStage === 0) {
      return (
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-zinc-100">
            {getActiveExercise.exercise.name}
          </h2>
          <SetupForm
            initial={activeWorkflow.setupDraft}
            saving={setupSaving}
            onCancel={handleCancelSetup}
            onSave={(v) => {
              void handleSaveSetup(v, "manual");
            }}
          />
        </div>
      );
    }

    if (activeWorkflow.activeStage === 1) {
      const setNumber = activeWorkflow.lastSetNumber ?? (logs.length || 1);
      const draft = activeWorkflow.lastSetDraft;
      const summaryBits: string[] = [];
      if (draft.reps != null) summaryBits.push(`${draft.reps} reps`);
      if (draft.weightLbs != null) summaryBits.push(`@ ${draft.weightLbs} lbs`);
      const summary = summaryBits.length ? summaryBits.join(" ") : "—";

      return (
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-zinc-100">
            {getActiveExercise.exercise.name}
          </h2>
          <div className="text-sm text-zinc-300">
            Set {setNumber} — {summary}
          </div>
          <CircleActionButton
            variant="green"
            message={activeWorkflow.startMessage}
            onClick={handleStartReady}
          />
        </div>
      );
    }

    if (activeWorkflow.activeStage === 2) {
      const setNumber = activeWorkflow.lastSetNumber ?? (logs.length || 1);
      return (
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-zinc-100">
            {getActiveExercise.exercise.name}
          </h2>
          <div className="text-sm text-zinc-300">
            Set {setNumber} in progress...
          </div>
          <CircleActionButton
            variant="red"
            message={activeWorkflow.activeMessage}
            onClick={handleCompleteActiveSet}
          />
        </div>
      );
    }

    if (activeWorkflow.activeStage === 3) {
      const setsCompleted = logs.length;
      const hasSets = setsCompleted > 0;
      const nextSetIndex = setsCompleted + 1;

      const completedSetsList =
        restInlineEditKind === "last" ? null : (
          <div className="space-y-2">
            {hasSets ? <SetsDotsIndicator count={setsCompleted} /> : null}
            <div className="space-y-2">
              {logs.map((log) => (
                <EditableSetRowFull
                  key={log.id}
                  log={log}
                  onUpdate={async (payload) => {
                    await updateExerciseLogFull(log.id, payload);
                    if (
                      activeWorkflow.lastSetLogId === log.id &&
                      activeExerciseId
                    ) {
                      const nextDraft = payload;
                      updateWorkflow(activeExerciseId, (w) => ({
                        ...w,
                        lastSetDraft: { ...w.lastSetDraft, ...nextDraft },
                        nextDraft: { ...w.nextDraft, ...nextDraft },
                      }));
                    }
                  }}
                />
              ))}
            </div>
          </div>
        );

      const editLastForm =
        restInlineEditKind === "last" && activeWorkflow.lastSetLogId ? (
          <div className="rounded-xl border border-zinc-800 bg-card/40 p-3">
            <div className="mb-2 text-xs font-medium text-zinc-400">
              Edit LAST set
            </div>
            <SetupForm
              initial={activeWorkflow.lastSetDraft}
              saving={editingLastSaving}
              onCancel={() => setRestInlineEditKind(null)}
              onSave={async (values) => {
                if (!activeWorkflow.lastSetLogId) return;
                setEditingLastSaving(true);
                try {
                  await updateExerciseLogFull(activeWorkflow.lastSetLogId, values);
                  if (activeExerciseId) {
                    updateWorkflow(activeExerciseId, (w) => ({
                      ...w,
                      lastSetDraft: { ...w.lastSetDraft, ...values },
                      nextDraft: { ...w.nextDraft, ...values },
                    }));
                  }
                  setRestInlineEditKind(null);
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Failed to save last set"
                  );
                } finally {
                  setEditingLastSaving(false);
                }
              }}
            />
          </div>
        ) : null;

      const editNextForm =
        restInlineEditKind === "next" ? (
          <div className="rounded-xl border border-zinc-800 bg-card/40 p-3">
            <div className="mb-2 text-xs font-medium text-zinc-400">
              Set {nextSetIndex}
            </div>
            <SetupForm
              initial={activeWorkflow.nextDraft}
              saving={editingNextSaving}
              onCancel={() => setRestInlineEditKind(null)}
              onSave={async (values) => {
                setEditingNextSaving(true);
                try {
                  updateWorkflow(activeExerciseId, (w) => ({
                    ...w,
                    nextDraft: { ...w.nextDraft, ...values },
                  }));
                  setRestInlineEditKind(null);
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Failed to save next set"
                  );
                } finally {
                  setEditingNextSaving(false);
                }
              }}
            />
            <div className="mt-3">{completedSetsList}</div>
          </div>
        ) : null;

      return (
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-zinc-100">
            {getActiveExercise.exercise.name}
          </h2>
          {activeWorkflow.restMessage !== '' ? (
            <div className="text-sm text-zinc-300 text-center">
              {activeWorkflow.restMessage}
            </div>
          ) : null}

          {editLastForm}
          {editNextForm}

          <RestCountdown
            initialSeconds={60}
            onDone={handleRestComplete}
            onSkip={handleRestComplete}
          />

          {restInlineEditKind === null && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="min-h-[44px] border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900"
                  onClick={() => setRestInlineEditKind("last")}
                >
                  Edit LAST set
                </Button>
                <Button
                  variant="outline"
                  className="min-h-[44px] border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900"
                  onClick={() => setRestInlineEditKind("next")}
                >
                  Edit NEXT set
                </Button>
              </div>
              {completedSetsList}
            </>
          )}
        </div>
      );
    }

    if (activeWorkflow.activeStage === 5) {
      const setsCompleted = logs.length;

      return (
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-zinc-100">
            {getActiveExercise.exercise.name}
          </h2>

          <CircleActionButton
            variant="green"
            message={NEXT_REPEAT_FIRST}
            onClick={handleSirCanIHaveAnother}
          />

          {setsCompleted > 0 ? <SetsDotsIndicator count={setsCompleted} /> : null}

          {setsCompleted > 0 ? (
            <div className="space-y-2">
              {logs.map((log) => (
                <EditableSetRowFull
                  key={log.id}
                  log={log}
                  onUpdate={async (payload) => {
                    await updateExerciseLogFull(log.id, payload);
                    if (
                      activeWorkflow.lastSetLogId === log.id &&
                      activeExerciseId
                    ) {
                      updateWorkflow(activeExerciseId, (w) => ({
                        ...w,
                        lastSetDraft: { ...w.lastSetDraft, ...payload },
                        nextDraft: { ...w.nextDraft, ...payload },
                      }));
                    }
                  }}
                />
              ))}
            </div>
          ) : null}

          {setsCompleted > 0 ? (
            <button
              type="button"
              className="mx-auto min-h-[44px] min-w-[140px] rounded-md text-sm text-zinc-400 hover:text-zinc-300"
              onClick={handleAdvanceToMoveOn}
            >
              Move On
            </button>
          ) : null}
        </div>
      );
    }

    if (activeWorkflow.activeStage === 4) {
      const setCount = logs.length;
      return (
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-zinc-100">
            {getActiveExercise.exercise.name}
          </h2>
          <div className="text-sm text-zinc-300">
            {setCount} set{setCount === 1 ? "" : "s"} completed
          </div>

          {setCount > 0 ? <SetsDotsIndicator count={setCount} /> : null}

          <div>{renderSetReadOnlyList(logs)}</div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] border-zinc-700 bg-zinc-900/40"
              onClick={() =>
                activeExerciseId &&
                updateWorkflow(activeExerciseId, (w) => ({
                  ...w,
                  activeStage: 5,
                  state4EditMode: false,
                }))
              }
            >
              Edit
            </Button>
            <Button
              type="button"
              className="min-h-[44px] bg-green-600 hover:bg-green-500"
              onClick={handleSaveAndCollapseExercise}
            >
              Done ✓
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderCompletedPills = () => {
    if (!completedPills.length) return null;
    return (
      <div className="space-y-2">
        {completedPills.map((exerciseId) => {
          const ex = exercisesInWorkout.find((e) => e.exercise.id === exerciseId);
          if (!ex) return null;
          const logs = ex.logs;
          const exerciseLogIds = new Set(logs.map((l) => l.id));
          const mediaItems = workoutMedia.filter((m) => {
            if (!m.exercise_log_id) return false;
            return exerciseLogIds.has(m.exercise_log_id);
          });
          const expanded = pillExpandedExerciseId === exerciseId;
          return (
            <div key={exerciseId}>
              <button
                type="button"
                className={[
                  "flex w-full items-center justify-between rounded-full border px-4 py-3",
                  "bg-green-600/15 border-green-500/30 text-zinc-100",
                  expanded ? "bg-green-600/20" : "",
                ].join(" ")}
                onClick={() =>
                  setPillExpandedExerciseId((prev) =>
                    prev === exerciseId ? null : exerciseId
                  )
                }
              >
                <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-semibold">
                    {ex.exercise.name}
                  </span>
                  <DotsOnlyIndicator count={logs.length} />
                </div>
                <ChevronRight className="h-4 w-4" />
              </button>

              {expanded && (
                <div className="mt-2 space-y-3 rounded-xl border border-zinc-800 bg-card p-3">
                  <div className="text-sm font-medium text-zinc-100">
                    Logged sets
                  </div>
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <EditableSetRowFull
                        key={log.id}
                        log={log}
                        onUpdate={async (payload) => {
                          await updateExerciseLogFull(log.id, payload);
                        }}
                      />
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      Add media
                    </div>
                    {mediaItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No media yet
                      </p>
                    ) : (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {mediaItems.map((m) => (
                          <div
                            key={m.id}
                            className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-zinc-700 bg-zinc-900"
                          >
                            {m.type === "photo" ? (
                              <img
                                src={m.signedUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Video className="h-6 w-6 text-cyan-400" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <MediaUpload
                      workoutLogId={workoutId}
                      exerciseLogId={logs[logs.length - 1]?.id ?? null}
                      onUploadComplete={refreshWorkoutMedia}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

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

  const exerciseCount = exercisesInWorkout.filter((e) => e.logs.length > 0).length;
  const setCount = exercisesInWorkout.reduce((sum, e) => sum + e.logs.length, 0);
  const totalVolume = exercisesInWorkout.reduce((sum, e) => {
    return (
      sum +
      e.logs.reduce((s, l) => {
        const reps = l.reps ?? 0;
        const w = l.weight_lbs != null ? Number(l.weight_lbs) : 0;
        return s + reps * w;
      }, 0)
    );
  }, 0);
  const durationMinutes = startedAt ? Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 60000)) : 0;

  const completedExercises = exercisesInWorkout.filter((e) => e.logs.length > 0);

  if (showSummary) {
    return (
      <WorkoutSummary
        durationMinutes={durationMinutes}
        totalVolume={totalVolume}
        exerciseCount={exerciseCount}
        setCount={setCount}
        exercisesWithLogs={completedExercises}
        onSaveAndFinish={handleSaveAndFinish}
      />
    );
  }

  return (
    <div className="space-y-4 pb-10">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Input
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            className="border-zinc-800 bg-transparent text-lg font-semibold text-zinc-100"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="tabular-nums font-mono text-lg text-zinc-200">
            {timerDisplay}
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFinishConfirm(true)}
            className="min-h-[44px]"
          >
            Finish Workout
          </Button>
        </div>
      </header>

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

      <div className="space-y-4">
        <Card className="border-zinc-800 bg-card/30 p-4">
          <CardContent className="space-y-4 p-0">
            {renderActiveStage()}
          </CardContent>
        </Card>

        {renderCompletedPills()}

        {activeExerciseId === null && completedPills.length === 0 && (
          <div className="text-sm text-muted-foreground">
            Add an exercise to get started.
          </div>
        )}
      </div>
    </div>
  );
}

