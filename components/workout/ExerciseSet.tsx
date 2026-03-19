"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/types";

type ExerciseLog = Database["public"]["Tables"]["exercise_logs"]["Row"];

export interface SetPayload {
  reps: number | null;
  weightLbs: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  notes: string | null;
}

export interface ExerciseSetRowProps {
  log: ExerciseLog;
  isEditing: boolean;
  highlightNew: boolean;
  onStartEdit: () => void;
  onSaveEdit: (payload: SetPayload) => Promise<void>;
  onCancelEdit: () => void;
  onDuplicate: () => void;
}

function parseNum(s: string): number | null {
  const v = s.trim();
  if (!v) return null;
  const n = v.includes(".") ? parseFloat(v) : parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export function ExerciseSetRow({
  log,
  isEditing,
  highlightNew,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDuplicate,
}: ExerciseSetRowProps) {
  const [reps, setReps] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [distanceMeters, setDistanceMeters] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setReps(log.reps != null ? String(log.reps) : "");
    setWeightLbs(
      log.weight_lbs != null ? String(Number(log.weight_lbs)) : ""
    );
    setDurationSeconds(
      log.duration_seconds != null ? String(log.duration_seconds) : ""
    );
    setDistanceMeters(
      log.distance_meters != null ? String(Number(log.distance_meters)) : ""
    );
    setNotes(log.notes ?? "");
  }, [log.id, log.reps, log.weight_lbs, log.duration_seconds, log.distance_meters, log.notes]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveEdit({
        reps: parseNum(reps),
        weightLbs: parseNum(weightLbs),
        durationSeconds: parseNum(durationSeconds),
        distanceMeters: parseNum(distanceMeters),
        notes: notes.trim() || null,
      });
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <tr className="border-b last:border-0 bg-zinc-900/50">
        <td colSpan={6} className="p-3">
          <div className="space-y-3 rounded border border-zinc-700 bg-zinc-900 p-3">
            <p className="text-xs font-medium text-zinc-400">Edit set</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor={`edit-reps-${log.id}`} className="text-zinc-300">
                  Reps
                </Label>
                <Input
                  id={`edit-reps-${log.id}`}
                  type="number"
                  inputMode="numeric"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  className="mt-1 border-zinc-700 bg-zinc-800"
                />
              </div>
              <div>
                <Label htmlFor={`edit-weight-${log.id}`} className="text-zinc-300">
                  Weight (lbs)
                </Label>
                <Input
                  id={`edit-weight-${log.id}`}
                  type="number"
                  inputMode="decimal"
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(e.target.value)}
                  className="mt-1 border-zinc-700 bg-zinc-800"
                />
              </div>
              <div>
                <Label htmlFor={`edit-duration-${log.id}`} className="text-zinc-300">
                  Duration (sec)
                </Label>
                <Input
                  id={`edit-duration-${log.id}`}
                  type="number"
                  inputMode="numeric"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(e.target.value)}
                  className="mt-1 border-zinc-700 bg-zinc-800"
                />
              </div>
              <div>
                <Label htmlFor={`edit-distance-${log.id}`} className="text-zinc-300">
                  Distance (m)
                </Label>
                <Input
                  id={`edit-distance-${log.id}`}
                  type="number"
                  inputMode="decimal"
                  value={distanceMeters}
                  onChange={(e) => setDistanceMeters(e.target.value)}
                  className="mt-1 border-zinc-700 bg-zinc-800"
                />
              </div>
            </div>
            <div>
              <Label htmlFor={`edit-notes-${log.id}`} className="text-zinc-300">
                Notes
              </Label>
              <Input
                id={`edit-notes-${log.id}`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
                className="mt-1 border-zinc-700 bg-zinc-800"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancelEdit}
                className="min-h-[44px] border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="min-h-[44px]"
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  const repsVal = log.reps;
  const weightVal = log.weight_lbs != null ? Number(log.weight_lbs) : null;
  const durVal = log.duration_seconds;
  const distVal =
    log.distance_meters != null ? Number(log.distance_meters) : null;

  return (
    <>
      {highlightNew && (
        <style
          dangerouslySetInnerHTML={{
            __html: `@keyframes setRowFlash { 0% { background-color: rgba(14, 165, 233, 0.35); } 100% { background-color: transparent; } } .set-row-flash { animation: setRowFlash 1.5s ease-out; }`,
          }}
        />
      )}
      <tr
        className={`border-b last:border-0 ${
          highlightNew ? "set-row-flash" : ""
        }`}
      >
      <td className="py-2 pr-4 font-medium">{log.set_number}</td>
      <td className="py-2 pr-4">{repsVal != null ? repsVal : "—"}</td>
      <td className="py-2 pr-4">{weightVal != null ? weightVal : "—"}</td>
      <td className="py-2 pr-4">{durVal != null ? durVal : "—"}</td>
      <td className="py-2 pr-2 text-center">
        <span className="text-primary" aria-hidden="true">
          ✓
        </span>
      </td>
      <td className="py-2">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={onStartEdit}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded border border-zinc-700 bg-zinc-800 text-zinc-200 transition-colors hover:bg-zinc-700"
            title="Edit set"
            aria-label="Edit set"
          >
            <span aria-hidden>✏️</span>
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded border border-zinc-700 bg-zinc-800 text-zinc-200 transition-colors hover:bg-zinc-700"
            title="Duplicate set"
            aria-label="Duplicate set"
          >
            <span aria-hidden>📋</span>
          </button>
        </div>
      </td>
    </tr>
    </>
  );
}
