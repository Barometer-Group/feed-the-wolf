"use client";

import { toast } from "sonner";
import { triggerConfetti } from "./Confetti";

export function showPRToast(params: {
  exerciseName: string;
  prType: "weight" | "reps" | null;
  weightLbs: number;
  reps: number;
}): void {
  triggerConfetti("pr");
  const line =
    params.prType === "weight" && params.weightLbs > 0
      ? `${params.exerciseName} — ${params.weightLbs} lbs`
      : params.prType === "reps" && params.reps > 0
        ? `${params.exerciseName} — ${params.reps} reps`
        : params.weightLbs > 0
          ? `${params.exerciseName} — ${params.weightLbs} lbs`
          : `${params.exerciseName} — ${params.reps} reps`;

  toast.custom(
    () => (
      <div className="flex w-full max-w-sm flex-col gap-1 rounded-lg border border-cyan-800/50 bg-zinc-950 p-4 shadow-lg">
        <p className="text-lg font-bold text-cyan-400">🏆 New PR!</p>
        <p className="text-sm text-zinc-100">{line}</p>
      </div>
    ),
    { duration: 5000 }
  );
}
