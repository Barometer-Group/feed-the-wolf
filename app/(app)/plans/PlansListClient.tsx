"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlanCard } from "@/components/plans/PlanCard";

interface PlanWithMeta {
  id: string;
  name: string;
  scheduled_date: string | null;
  is_template: boolean;
  created_by: string;
  athlete_id: string | null;
  athlete_name: string | null;
  exercise_count: number;
}

interface PlansListClientProps {
  plans: PlanWithMeta[];
  currentUserId: string;
}

export function PlansListClient({ plans, currentUserId }: PlansListClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"my" | "assigned">("my");

  const myPlans = plans.filter((p) => p.created_by === currentUserId);
  const assignedPlans = plans.filter(
    (p) => p.athlete_id === currentUserId && p.created_by !== currentUserId
  );

  const displayPlans = tab === "my" ? myPlans : assignedPlans;

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("my")}
          className={`min-h-[44px] flex-1 rounded-md px-4 text-sm font-medium ${
            tab === "my"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          My Plans
        </button>
        <button
          type="button"
          onClick={() => setTab("assigned")}
          className={`min-h-[44px] flex-1 rounded-md px-4 text-sm font-medium ${
            tab === "assigned"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          Assigned to Me
        </button>
      </div>

      {displayPlans.length === 0 ? (
        <p className="text-muted-foreground">No plans yet — create your first one</p>
      ) : (
        <ul className="space-y-2">
          {displayPlans.map((plan) => (
            <li key={plan.id}>
              <PlanCard
                plan={plan}
                onClick={() => router.push(`/plans/${plan.id}`)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
