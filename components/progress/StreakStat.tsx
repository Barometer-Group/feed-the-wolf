"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Flame } from "lucide-react";

interface StreakStatProps {
  longestStreak: number;
  currentStreak: number;
  isLoading: boolean;
}

export function StreakStat({ longestStreak, currentStreak, isLoading }: StreakStatProps) {
  if (isLoading) {
    return <Skeleton className="h-8 w-48 rounded-md" />;
  }

  return (
    <div className="flex flex-col gap-1">
      {currentStreak > 1 && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-orange-400">
          <Flame className="h-4 w-4" />
          {currentStreak}-day streak — keep it going!
        </p>
      )}
      <p className="text-sm text-zinc-400">
        Longest streak:{" "}
        <span className="font-semibold text-zinc-200">
          {longestStreak} {longestStreak === 1 ? "day" : "days"}
        </span>
      </p>
    </div>
  );
}
