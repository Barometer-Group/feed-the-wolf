"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import type { MediaListItem } from "@/lib/mediaTypes";

interface MediaViewerProps {
  item: MediaListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isTrainer: boolean;
  onFeedbackSaved: () => void;
}

export function MediaViewer({
  item,
  open,
  onOpenChange,
  isTrainer,
  onFeedbackSaved,
}: MediaViewerProps) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item || !open) {
      setDisplayUrl(null);
      return;
    }
    setFeedbackText(item.trainer_feedback ?? "");
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/media/${item.id}/url`);
      if (!res.ok || cancelled) return;
      const j = (await res.json()) as { signedUrl?: string };
      if (!cancelled && j.signedUrl) setDisplayUrl(j.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [item, open]);

  useEffect(() => {
    if (!open || !item || isTrainer) return;
    if (item.trainer_feedback && !item.feedback_read) {
      void fetch(`/api/media/${item.id}/read`, { method: "PATCH" }).then(() => {
        window.dispatchEvent(new CustomEvent("media-feedback-read"));
        onFeedbackSaved();
      });
    }
  }, [open, item, isTrainer, onFeedbackSaved]);

  const handleSaveFeedback = async () => {
    if (!item) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/media/${item.id}/feedback`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedbackText }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        toast.error(j.error ?? "Failed to save");
        return;
      }
      toast.success("Feedback saved");
      onFeedbackSaved();
    } catch {
      toast.error("Failed to save feedback");
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[95vh] overflow-y-auto border-zinc-800 bg-zinc-950 p-0"
      >
        <SheetHeader className="sticky top-0 z-10 flex flex-row items-center justify-between border-b border-zinc-800 bg-zinc-950 p-4">
          <SheetTitle className="text-left text-zinc-100">Form review</SheetTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px]"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </SheetHeader>

        <div className="space-y-4 p-4">
          <div className="overflow-hidden rounded-lg bg-black">
            {displayUrl ? (
              item.type === "video" ? (
                <video
                  src={displayUrl}
                  controls
                  className="max-h-[50vh] w-full object-contain"
                  playsInline
                />
              ) : (
                <img
                  src={displayUrl}
                  alt=""
                  className="max-h-[50vh] w-full object-contain"
                />
              )
            ) : (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                Loading…
              </div>
            )}
          </div>

          <div className="text-sm text-zinc-300">
            <p>
              <span className="text-muted-foreground">From </span>
              {item.uploader_name}
            </p>
            <p>
              <span className="text-muted-foreground">Uploaded </span>
              {new Date(item.created_at).toLocaleString()}
            </p>
            {item.exercise_name && (
              <p>
                <span className="text-muted-foreground">Exercise </span>
                {item.exercise_name}
              </p>
            )}
            {item.workout_date && (
              <p>
                <span className="text-muted-foreground">Workout date </span>
                {item.workout_date}
              </p>
            )}
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <p className="mb-2 text-sm font-medium text-zinc-200">
              Trainer feedback
            </p>
            {isTrainer ? (
              <div className="space-y-3">
                <Textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Write feedback for your athlete…"
                  className="min-h-[100px] border-zinc-700 bg-zinc-900 text-zinc-100"
                />
                <Button
                  type="button"
                  className="min-h-[44px] w-full"
                  disabled={saving}
                  onClick={() => void handleSaveFeedback()}
                >
                  {saving ? "Saving…" : "Save Feedback"}
                </Button>
              </div>
            ) : item.trainer_feedback ? (
              <blockquote className="rounded-lg border border-cyan-900/50 bg-cyan-950/30 p-4 text-sm italic text-zinc-200">
                {item.trainer_feedback}
              </blockquote>
            ) : (
              <p className="text-sm text-muted-foreground">
                No feedback yet from your trainer.
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
