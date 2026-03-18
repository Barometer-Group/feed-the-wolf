"use client";

import Link from "next/link";

interface WorkoutCardProps {
  workout: {
    id: string;
    date: string;
    duration: number;
    exerciseCount: number;
    totalVolume?: number;
  };
  href?: string;
}

export function WorkoutCard({ workout, href }: WorkoutCardProps) {
  const volumeStr =
    workout.totalVolume != null && workout.totalVolume > 0
      ? `${workout.totalVolume.toLocaleString()} lbs`
      : null;

  const inner = (
    <div className="flex min-h-[44px] items-center justify-between rounded-lg border border-zinc-800 bg-card px-4 py-3 transition-colors active:bg-accent">
      <span className="font-medium">{workout.date}</span>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground sm:gap-4">
        <span>{workout.duration} min</span>
        <span>{workout.exerciseCount} exercises</span>
        {volumeStr && <span>{volumeStr}</span>}
      </div>
    </div>
  );

  return (
    <li className="list-none">
      {href ? (
        <Link href={href} className="block">
          {inner}
        </Link>
      ) : (
        <div role="button" tabIndex={0}>
          {inner}
        </div>
      )}
    </li>
  );
}
