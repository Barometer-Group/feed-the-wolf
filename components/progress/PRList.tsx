"use client";

import type { PRRow } from "@/lib/progressTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatAchieved(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface PRListProps {
  prs: PRRow[];
  isLoading: boolean;
}

export function PRList({ prs, isLoading }: PRListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (prs.length === 0) {
    return (
      <Card className="border-zinc-800 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg">Personal Records</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No data yet — log some workouts to see your progress
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-zinc-100">
        Personal Records
      </h2>
      <ul className="space-y-2">
        {prs.map((pr) => (
          <li key={pr.exerciseId}>
            <Card className="border-zinc-800">
              <CardContent className="p-4">
                <p className="font-medium text-zinc-100">{pr.exerciseName}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <div>
                    <span className="text-muted-foreground">Best weight</span>
                    <p className="font-medium text-zinc-200">
                      {pr.bestWeight > 0 ? `${pr.bestWeight} lbs` : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Best reps</span>
                    <p className="font-medium text-zinc-200">
                      {pr.bestReps > 0 ? pr.bestReps : "—"}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-2">
                    <span className="text-muted-foreground">Date achieved</span>
                    <p className="font-medium text-zinc-200">
                      {pr.bestWeightAt === pr.bestRepsAt
                        ? formatAchieved(pr.bestWeightAt)
                        : `${formatAchieved(pr.bestWeightAt)} (wt) · ${formatAchieved(pr.bestRepsAt)} (reps)`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
