"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { PRRow } from "@/lib/progressTypes";

interface PRTableProps {
  prs: PRRow[];
  isLoading: boolean;
}

export function PRTable({ prs, isLoading }: PRTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (prs.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-6">
        Log workouts to see your personal bests here.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Exercise
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 text-right">
          Best Set
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 text-right">
          Max lbs
        </span>
      </div>

      {/* Scrollable rows */}
      <div className="overflow-y-auto max-h-72 divide-y divide-zinc-800/60">
        {prs.map((pr) => (
          // exerciseId is available here — wire up router.push('/progress/exercise/' + pr.exerciseId) when detail screen is built
          <div
            key={pr.exerciseId}
            className="grid grid-cols-[1fr_80px_80px] gap-2 px-4 py-3 bg-zinc-950 hover:bg-zinc-900 transition-colors"
          >
            <span className="text-sm text-zinc-200 truncate">{pr.exerciseName}</span>
            <span className="text-sm text-zinc-300 text-right tabular-nums">
              {pr.bestReps > 0 ? pr.bestReps : "—"}
            </span>
            <span className="text-sm text-zinc-300 text-right tabular-nums">
              {pr.bestWeight > 0 ? pr.bestWeight : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
