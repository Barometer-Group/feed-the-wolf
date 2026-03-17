"use client";

interface WorkoutCardProps {
  workout: {
    id: string;
    date: string;
    duration: number;
    exerciseCount: number;
    totalVolume?: number;
  };
}

export function WorkoutCard({ workout }: WorkoutCardProps) {
  const volumeStr =
    workout.totalVolume != null && workout.totalVolume > 0
      ? `${workout.totalVolume.toLocaleString()} lbs`
      : null;

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        className="flex min-h-[44px] items-center justify-between rounded-lg border bg-card px-4 py-3 transition-colors active:bg-accent"
        onClick={() => {}}
        onKeyDown={(e) => e.key === "Enter" && (() => {})()}
      >
        <span className="font-medium">{workout.date}</span>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{workout.duration} min</span>
          <span>{workout.exerciseCount} exercises</span>
          {volumeStr && <span>{volumeStr}</span>}
        </div>
      </div>
    </li>
  );
}
