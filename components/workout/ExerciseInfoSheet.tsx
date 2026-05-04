"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Database } from "@/lib/supabase/types";

type Exercise = Database["public"]["Tables"]["exercises"]["Row"];

interface ExerciseInfoSheetProps {
  exercise: Exercise | null;
  onClose: () => void;
}

export function ExerciseInfoSheet({ exercise, onClose }: ExerciseInfoSheetProps) {
  if (!exercise) return null;

  const raw = exercise.description ?? "";
  const splitIdx = raw.indexOf("\n\n🏕️");
  const mainInstructions = splitIdx >= 0 ? raw.slice(0, splitIdx).trim() : raw.trim();
  const campingNote = splitIdx >= 0 ? raw.slice(splitIdx + 4).trim() : null;

  const hasContent = mainInstructions || campingNote || exercise.demo_video_url;

  return (
    <Sheet open={!!exercise} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-lg uppercase tracking-wide">
            {exercise.name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5 pb-6">
          {mainInstructions ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                How to do it
              </p>
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                {mainInstructions}
              </p>
            </div>
          ) : null}

          {campingNote ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-green-700">
                🏕️ No equipment version
              </p>
              <p className="text-sm leading-relaxed text-green-900">
                {campingNote}
              </p>
            </div>
          ) : null}

          {exercise.demo_video_url ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Watch
              </p>
              <a
                href={exercise.demo_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
              >
                Watch demonstration →
              </a>
            </div>
          ) : null}

          {!hasContent ? (
            <p className="text-sm text-muted-foreground">
              Instructions coming soon.
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
