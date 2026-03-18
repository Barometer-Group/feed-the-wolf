"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaGrid } from "@/components/media/MediaGrid";
import { TrainerMediaFeed } from "@/components/media/TrainerMediaFeed";
import { MediaViewer } from "@/components/media/MediaViewer";
import type { MediaListItem } from "@/lib/mediaTypes";

interface FormReviewClientProps {
  role: string;
}

export function FormReviewClient({ role }: FormReviewClientProps) {
  const [items, setItems] = useState<MediaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MediaListItem | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const isTrainer = role === "trainer" || role === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/media");
      if (!res.ok) {
        toast.error("Failed to load media");
        setItems([]);
        return;
      }
      const j = (await res.json()) as { items?: MediaListItem[] };
      setItems(j.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!viewerOpen || !selected) return;
    const u = items.find((i) => i.id === selected.id);
    if (
      u &&
      (u.trainer_feedback !== selected.trainer_feedback ||
        u.feedback_read !== selected.feedback_read)
    ) {
      setSelected(u);
    }
  }, [items, viewerOpen, selected]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onRead = () => void load();
    window.addEventListener("media-feedback-read", onRead);
    return () => window.removeEventListener("media-feedback-read", onRead);
  }, [load]);

  const handleSelect = (item: MediaListItem) => {
    setSelected(item);
    setViewerOpen(true);
  };

  const handleViewerClose = (open: boolean) => {
    setViewerOpen(open);
    if (!open) setSelected(null);
  };

  const handleFeedbackSaved = () => {
    void load();
    window.dispatchEvent(new CustomEvent("media-feedback-read"));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <h1 className="text-2xl font-bold text-zinc-50">Form Review</h1>
      {isTrainer ? (
        <TrainerMediaFeed items={items} onSelect={handleSelect} />
      ) : (
        <MediaGrid items={items} onSelect={handleSelect} />
      )}
      <MediaViewer
        item={selected}
        open={viewerOpen}
        onOpenChange={handleViewerClose}
        isTrainer={isTrainer}
        onFeedbackSaved={handleFeedbackSaved}
      />
    </div>
  );
}
