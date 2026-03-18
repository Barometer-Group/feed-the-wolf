"use client";

import { MessageCircle, Video } from "lucide-react";
import type { MediaListItem } from "@/lib/mediaTypes";

interface MediaGridProps {
  items: MediaListItem[];
  onSelect: (item: MediaListItem) => void;
}

export function MediaGrid({ items, onSelect }: MediaGridProps) {
  if (items.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        No uploads yet. Add photos or videos from an active workout.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-2 sm:gap-3">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="relative aspect-square w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 active:opacity-90"
          >
            {item.type === "photo" ? (
              <img
                src={item.signedUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-zinc-950">
                <Video className="h-10 w-10 text-cyan-400" />
                <span className="text-xs text-muted-foreground">Video</span>
              </div>
            )}
            {item.trainer_feedback && (
              <span
                className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600/90 text-white shadow"
                aria-label="Has trainer feedback"
              >
                <MessageCircle className="h-4 w-4" />
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
