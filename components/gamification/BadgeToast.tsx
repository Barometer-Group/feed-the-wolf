"use client";

import { toast } from "sonner";
import { triggerConfetti } from "./Confetti";

const EMOJI: Record<string, string> = {
  first_rep: "💪",
  on_fire: "🔥",
  streak_7: "⚡",
  pr_crusher: "🏆",
  form_check: "📹",
  consistent: "📅",
  heavy_lifter: "🐺",
  first_plan: "📋",
};

export function showBadgeToast(params: {
  type: string;
  title: string;
  description: string;
}): void {
  triggerConfetti("badge");
  const icon = EMOJI[params.type] ?? "⭐";
  toast.custom(
    () => (
      <div className="flex w-full max-w-sm flex-col gap-1 rounded-lg border border-zinc-700 bg-zinc-950 p-4 shadow-lg">
        <p className="text-lg font-bold text-zinc-100">
          {icon} Badge earned!
        </p>
        <p className="font-semibold text-cyan-400">{params.title}</p>
        <p className="text-sm text-muted-foreground">{params.description}</p>
      </div>
    ),
    { duration: 6000 }
  );
}
