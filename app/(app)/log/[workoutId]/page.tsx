"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Check, Video } from "lucide-react";
import { MediaUpload } from "@/components/media/MediaUpload";
import type { MediaListItem } from "@/lib/mediaTypes";
import { toast } from "sonner";
import { showPRToast } from "@/components/gamification/PRToast";
import { showBadgeToast } from "@/components/gamification/BadgeToast";
import { useWorkout } from "@/hooks/useWorkout";
import { ExerciseSearchSheet } from "@/components/workout/ExerciseSearchSheet";
import { ExerciseSetRow } from "@/components/workout/ExerciseSet";
import { VoiceInput, type VoiceInputSavePayload } from "@/components/workout/VoiceInput";
import { RestTimer } from "@/components/workout/RestTimer";
import { WorkoutSummary } from "@/components/workout/WorkoutSummary";
import type { Database } from "@/lib/supabase/types";

type Exercise = Database["public"]["Tables"]["exercises"]["Row"];
type ExerciseLog = Database["public"]["Tables"]["exercise_logs"]["Row"];

export default function ActiveWorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const workoutId = params.workoutId as string;

  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [addingSetFor, setAddingSetFor] = useState<string | null>(null);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [previousSessionValues, setPreviousSessionValues] = useState<
    Record<string, { reps?: number; weightLbs?: number; durationSeconds?: number }>
  >({});
  const [workoutMedia, setWorkoutMedia] = useState<MediaListItem[]>([]);
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

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setAthleteId(user.id);
    });
  }, [supabase]);

  useEffect(() => {
    supabase.from("exercises").select("id, name, category").then(({ data }) => {
      setExercises((data ?? []) as Exercise[]);
    });
  }, [supabase]);

  useEffect(() => {
    if (!workout || !athleteId) return;
    if (!workoutName && startedAt) {
      const d = new Date(startedAt);
      setWorkoutName(`Ad Hoc Workout ${d.toLocaleDateString()}`);
    }
  }, [workout, startedAt, workoutName, athleteId]);

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  useEffect(() => {
    if (!athleteId || exercisesInWorkout.length === 0) return;
    const exerciseIds = exercisesInWorkout.map((e) => e.exercise.id);
    supabase
      .from("workout_logs")
      .select("id")
      .eq("athlete_id", athleteId)
      .not("completed_at", "is", null)
      .neq("id", workoutId)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data: lastWorkout }) => {
        if (!lastWorkout) return;
        supabase
          .from("exercise_logs")
          .select("exercise_id, set_number, reps, weight_lbs, duration_seconds")
          .eq("workout_log_id", (lastWorkout as { id: string }).id)
          .in("exercise_id", exerciseIds)
          .then(({ data: logs }) => {
            const map: Record<string, { reps?: number; weightLbs?: number; durationSeconds?: number }> = {};
            const byEx = new Map<string, { set_number: number; reps?: number; weight_lbs?: string | null; duration_seconds?: number | null }[]>();
            for (const l of logs ?? []) {
              const log = l as { exercise_id: string; set_number: number; reps?: number; weight_lbs?: string | null; duration_seconds?: number | null };
              if (!byEx.has(log.exercise_id)) byEx.set(log.exercise_id, []);
              byEx.get(log.exercise_id)!.push(log);
            }
            for (const [eid, arr] of byEx) {
              const last = arr.sort((a, b) => b.set_number - a.set_number)[0];
              map[eid] = {
                reps: last.reps ?? undefined,
                weightLbs: last.weight_lbs ? Number(last.weight_lbs) : undefined,
                durationSeconds: last.duration_seconds ?? undefined,
              };
            }
            setPreviousSessionValues(map);
          });
      });
  }, [athleteId, exercisesInWorkout, workoutId, supabase]);

  const refreshWorkoutMedia = useCallback(() => {
    void fetch(`/api/media?workout_log_id=${encodeURIComponent(workoutId)}`)
      .then((r) => r.json())
      .then((d: { items?: MediaListItem[] }) => setWorkoutMedia(d.items ?? []));
  }, [workoutId]);

  useEffect(() => {
    if (!workout || workout.completed_at) return;
    refreshWorkoutMedia();
  }, [workout, refreshWorkoutMedia]);

  const handleSaveSet = useCallback(
    async (
      exerciseId: string,
      payload: {
        reps: number | null;
        weightLbs: number | null;
        durationSeconds: number | null;
        distanceMeters: number | null;
        notes: string | null;
      },
      via: "manual" | "voice"
    ) => {
      const pr = await addSet(exerciseId, payload, via);
      if (pr?.isPR && pr.prType) {
        prToastKeysRef.current.add(`${exerciseId}-${pr.prType}`);
        showPRToast({
          exerciseName: pr.exerciseName,
          prType: pr.prType,
          weightLbs: pr.weightLbs,
          reps: pr.reps,
        });
      }
      setAddingSetFor(null);
      setShowRestTimer(true);
    },
    [addSet]
  );

  const handleFinish = useCallback(async () => {
    setShowFinishConfirm(false);
    setShowSummary(true);
  }, []);

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
        for (const b of result.newBadges) {
          showBadgeToast(b);
        }
        router.push("/log");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save workout");
      }
    },
    [completeWorkout, router]
  );

  if (!workoutId) return null;

  if (loading || !workout) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (workout.completed_at) {
    router.replace("/log");
    return null;
  }

  const totalVolume = exercisesInWorkout.reduce((sum, { logs }) => {
    return (
      sum +
      logs.reduce((s, l) => {
        const reps = l.reps ?? 0;
        const w = l.weight_lbs ? Number(l.weight_lbs) : 0;
        return s + reps * w;
      }, 0)
    );
  }, 0);

  const totalSets = exercisesInWorkout.reduce((s, e) => s + e.logs.length, 0);
  const durationMs = startedAt ? Date.now() - startedAt.getTime() : 0;
  const durationMinutes = Math.round(durationMs / 60000);

  if (showSummary) {
    return (
      <WorkoutSummary
        durationMinutes={durationMinutes}
        totalVolume={totalVolume}
        exerciseCount={exercisesInWorkout.length}
        setCount={totalSets}
        exercisesWithLogs={exercisesInWorkout}
        onSaveAndFinish={handleSaveAndFinish}
      />
    );
  }

  const m = Math.floor(elapsedSeconds / 60);
  const s = elapsedSeconds % 60;
  const timerDisplay = `${m}:${s.toString().padStart(2, "0")}`;

  const exerciseNames = exercises.map((e) => e.name);

  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input
          type="text"
          value={workoutName}
          onChange={(e) => setWorkoutName(e.target.value)}
          className="min-w-0 flex-1 rounded border bg-transparent px-2 py-1 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex items-center gap-3">
          <span className="tabular-nums font-mono text-lg">{timerDisplay}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFinishConfirm(true)}
            className="min-h-[44px]"
          >
            Finish Workout
          </Button>
        </div>
      </div>

      {showRestTimer && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <RestTimer
            initialSeconds={90}
            onComplete={() => setShowRestTimer(false)}
            onSkip={() => setShowRestTimer(false)}
          />
        </div>
      )}

      <Button
        variant="outline"
        className="min-h-[44px] w-full"
        onClick={() => setShowExerciseSearch(true)}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Exercise
      </Button>

      <ExerciseSearchSheet
        open={showExerciseSearch}
        onOpenChange={setShowExerciseSearch}
        exercises={exercises}
        onSelect={(ex) => {
          addExercise(ex);
          setShowExerciseSearch(false);
        }}
      />

      <div className="space-y-4">
        {exercisesInWorkout.map(({ exercise, logs }) => {
          const prev = previousSessionValues[exercise.id];
          const isAddingSet = addingSetFor === exercise.id;

          return (
            <Card key={exercise.id}>
              <CardContent className="pt-4">
                <h3 className="mb-2 font-semibold">{exercise.name}</h3>
                {(prev || exercisesInWorkout.find((x) => x.exercise.id === exercise.id)?.prescribed) && (
                  <p className="mb-2 text-xs text-muted-foreground">
                    {[
                      (() => {
                        const p = exercisesInWorkout.find((x) => x.exercise.id === exercise.id)?.prescribed;
                        if (!p) return null;
                        const parts: string[] = [];
                        if (p.sets != null && p.reps != null) parts.push(`${p.sets}×${p.reps}`);
                        else if (p.reps != null) parts.push(`${p.reps} reps`);
                        if (p.weight_lbs != null) parts.push(`@ ${p.weight_lbs} lbs`);
                        if (p.duration_seconds != null) parts.push(`${p.duration_seconds}s`);
                        return parts.length ? `Prescribed: ${parts.join(" ")}` : null;
                      })(),
                      prev
                        ? `Last time: ${[
                            prev.reps != null && `${prev.reps} reps`,
                            prev.weightLbs != null && `${prev.weightLbs} lbs`,
                            prev.durationSeconds != null && `${prev.durationSeconds}s`,
                          ]
                            .filter(Boolean)
                            .join(", ")}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-4">Set</th>
                        <th className="py-2 pr-4">Reps</th>
                        <th className="py-2 pr-4">Weight</th>
                        <th className="py-2 pr-4">Dur</th>
                        <th className="py-2">✓</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <ExerciseSetRow
                          key={log.id}
                          setNumber={log.set_number}
                          reps={log.reps}
                          weightLbs={log.weight_lbs ? Number(log.weight_lbs) : null}
                          durationSeconds={log.duration_seconds}
                          distanceMeters={log.distance_meters ? Number(log.distance_meters) : null}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[44px]"
                    onClick={() =>
                      setAddingSetFor(isAddingSet ? null : exercise.id)
                    }
                  >
                    Add Set
                  </Button>
                  <VoiceInput
                    exerciseNames={exerciseNames}
                    onSave={(payload: VoiceInputSavePayload) =>
                      handleSaveSet(exercise.id, payload, "voice")
                    }
                  />
                </div>
                {isAddingSet && (
                  <SetForm
                    onSave={(p) => handleSaveSet(exercise.id, p, "manual")}
                    onCancel={() => setAddingSetFor(null)}
                  />
                )}
                <div className="mt-4 border-t border-border pt-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Add media
                  </p>
                  <WorkoutMediaThumbnails
                    items={workoutMedia.filter(
                      (m) =>
                        m.exercise_log_id &&
                        logs.some((l) => l.id === m.exercise_log_id)
                    )}
                  />
                  <MediaUpload
                    workoutLogId={workoutId}
                    exerciseLogId={logs[0]?.id ?? null}
                    onUploadComplete={refreshWorkoutMedia}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-lg border border-zinc-800 bg-card/30 p-4">
        <h3 className="mb-2 font-semibold">Workout media</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Photos or videos not tied to a specific exercise
        </p>
        <WorkoutMediaThumbnails
          items={workoutMedia.filter((m) => !m.exercise_log_id)}
        />
        <MediaUpload
          workoutLogId={workoutId}
          exerciseLogId={null}
          onUploadComplete={refreshWorkoutMedia}
        />
      </div>

      <Dialog open={showFinishConfirm} onOpenChange={setShowFinishConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End workout?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinishConfirm(false)}>
              Keep Going
            </Button>
            <Button onClick={handleFinish}>Finish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkoutMediaThumbnails({ items }: { items: MediaListItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
      {items.map((m) => (
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
  );
}

function SetForm({
  onSave,
  onCancel,
}: {
  onSave: (p: {
    reps: number | null;
    weightLbs: number | null;
    durationSeconds: number | null;
    distanceMeters: number | null;
    notes: string | null;
  }) => void;
  onCancel: () => void;
}) {
  const [reps, setReps] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [distanceMeters, setDistanceMeters] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = reps.trim() ? parseInt(reps, 10) : null;
    const w = weightLbs.trim() ? parseFloat(weightLbs) : null;
    const d = durationSeconds.trim() ? parseInt(durationSeconds, 10) : null;
    const dist = distanceMeters.trim() ? parseFloat(distanceMeters) : null;
    onSave({
      reps: r != null && !isNaN(r) ? r : null,
      weightLbs: w != null && !isNaN(w) ? w : null,
      durationSeconds: d != null && !isNaN(d) ? d : null,
      distanceMeters: dist != null && !isNaN(dist) ? dist : null,
      notes: notes.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded border p-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="set-reps">Reps</Label>
          <Input
            id="set-reps"
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="set-weight">Weight (lbs)</Label>
          <Input
            id="set-weight"
            type="number"
            inputMode="decimal"
            value={weightLbs}
            onChange={(e) => setWeightLbs(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="set-duration">Duration (sec)</Label>
          <Input
            id="set-duration"
            type="number"
            inputMode="numeric"
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="set-distance">Distance (m)</Label>
          <Input
            id="set-distance"
            type="number"
            inputMode="decimal"
            value={distanceMeters}
            onChange={(e) => setDistanceMeters(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="set-notes">Notes</Label>
        <Input
          id="set-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional"
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" className="min-h-[44px]">
          Save Set
        </Button>
      </div>
    </form>
  );
}
