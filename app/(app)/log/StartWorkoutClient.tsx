"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell, Calendar } from "lucide-react";
import { toast } from "sonner";
import { WorkoutCard } from "@/components/workout/WorkoutCard";

interface RecentWorkout {
  id: string;
  date: string;
  duration: number;
  exerciseCount: number;
  totalVolume?: number;
}

interface StartWorkoutClientProps {
  athleteId: string;
  recentWorkouts: RecentWorkout[];
}

export function StartWorkoutClient({
  athleteId,
  recentWorkouts,
}: StartWorkoutClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStartAdHoc = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        toast.error("Please sign in to start a workout");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("workout_logs")
        .insert({ athlete_id: user.id })
        .select("id")
        .single();

      if (error) throw error;
      if (data) router.push(`/log/${data.id}`);
    } catch (err) {
      toast.error("Failed to start workout");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleStartAdHoc}
          disabled={loading}
          className="flex min-h-[120px] min-w-0 touch-manipulation flex-col items-center justify-center gap-2 rounded-lg border-2 border-primary bg-primary/5 p-6 transition-colors active:scale-[0.98] disabled:opacity-50"
        >
          <Dumbbell className="h-10 w-10 text-primary" />
          <span className="text-lg font-semibold">Start Ad Hoc Workout</span>
          <span className="text-sm text-muted-foreground">
            Add exercises as you go
          </span>
        </button>

        <Card className="flex min-h-[120px] min-w-0 flex-col items-center justify-center gap-2 border-dashed opacity-60">
          <CardContent className="flex flex-col items-center justify-center gap-2 pt-6">
            <Calendar className="h-10 w-10 text-muted-foreground" />
            <span className="text-lg font-semibold text-muted-foreground">
              Start From Plan
            </span>
            <span className="text-sm text-muted-foreground">
              Coming in next update
            </span>
          </CardContent>
        </Card>
      </div>

      {recentWorkouts.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Recent Workouts</h2>
          <ul className="space-y-2">
            {recentWorkouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
