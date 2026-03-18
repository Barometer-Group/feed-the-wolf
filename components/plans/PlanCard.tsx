"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PlanCardProps {
  plan: {
    id: string;
    name: string;
    scheduled_date: string | null;
    is_template: boolean;
    exercise_count: number;
    athlete_name?: string | null;
  };
  /** Show assignee when trainer views plans they created for an athlete */
  showAthleteName?: boolean;
  onClick: () => void;
}

export function PlanCard({ plan, showAthleteName, onClick }: PlanCardProps) {
  const dateStr = plan.scheduled_date
    ? new Date(plan.scheduled_date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Card
      className="cursor-pointer transition-colors active:bg-accent"
      onClick={onClick}
    >
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold">{plan.name}</span>
          {plan.is_template && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              Template
            </Badge>
          )}
        </div>
        {dateStr && (
          <span className="text-sm text-muted-foreground">{dateStr}</span>
        )}
        <span className="text-sm text-muted-foreground">
          {plan.exercise_count} exercise{plan.exercise_count !== 1 ? "s" : ""}
        </span>
        {showAthleteName && plan.athlete_name && (
          <span className="text-xs text-muted-foreground">
            For {plan.athlete_name}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
