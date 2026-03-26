"use client";

import { useState } from "react";
import type { ProgressRange } from "@/lib/progressRange";
import { useCategoryReps, usePRs } from "@/hooks/useProgress";
import { RangeSelector } from "@/components/progress/RangeSelector";
import { CategoryRepsChart } from "@/components/progress/CategoryRepsChart";
import { StreakStat } from "@/components/progress/StreakStat";
import { PRTable } from "@/components/progress/PRTable";

export function ProgressDashboard() {
  const [range, setRange] = useState<ProgressRange>("30d");

  const { data, longestStreak, currentStreak, isLoading: chartLoading } =
    useCategoryReps(range);
  const { prs, isLoading: prsLoading } = usePRs();

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-8">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-zinc-50">Progress</h1>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {/* Stacked reps chart */}
      <CategoryRepsChart data={data} isLoading={chartLoading} />

      {/* Streak */}
      <StreakStat
        longestStreak={longestStreak}
        currentStreak={currentStreak}
        isLoading={chartLoading}
      />

      {/* Personal bests table */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-200">Personal Bests</h2>
        <PRTable prs={prs} isLoading={prsLoading} />
      </section>
    </div>
  );
}
