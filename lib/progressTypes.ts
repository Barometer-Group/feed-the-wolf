export interface ExerciseProgressDay {
  date: string;
  maxWeight: number;
  totalReps: number;
  volume: number;
}

export interface PRRow {
  exerciseId: string;
  exerciseName: string;
  bestWeight: number;
  bestReps: number;
  /** Latest of weight/reps PR dates (for sorting) */
  achievedAt: string;
  bestWeightAt: string;
  bestRepsAt: string;
}
