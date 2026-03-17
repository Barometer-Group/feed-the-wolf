"use client";

interface ExerciseSetRowProps {
  setNumber: number;
  reps: number | null;
  weightLbs: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
}

export function ExerciseSetRow({
  setNumber,
  reps,
  weightLbs,
  durationSeconds,
  distanceMeters,
}: ExerciseSetRowProps) {
  const parts: string[] = [];
  if (reps != null) parts.push(`${reps} reps`);
  if (weightLbs != null) parts.push(`${weightLbs} lbs`);
  if (durationSeconds != null) parts.push(`${durationSeconds}s`);
  if (distanceMeters != null) parts.push(`${distanceMeters}m`);

  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-4 font-medium">{setNumber}</td>
      <td className="py-2 pr-4">{reps ?? "—"}</td>
      <td className="py-2 pr-4">{weightLbs != null ? `${weightLbs}` : "—"}</td>
      <td className="py-2 pr-4">{durationSeconds ?? "—"}</td>
      <td className="py-2 text-center">
        <span className="text-primary" aria-hidden="true">
          ✓
        </span>
      </td>
    </tr>
  );
}
