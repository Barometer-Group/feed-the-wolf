"use client";

import { MessageCircle, Video } from "lucide-react";
import type { MediaListItem } from "@/lib/mediaTypes";

interface TrainerMediaFeedProps {
  items: MediaListItem[];
  onSelect: (item: MediaListItem) => void;
}

export function TrainerMediaFeed({ items, onSelect }: TrainerMediaFeedProps) {
  if (items.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        No media from your athletes yet.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.id}>
          <p className="mb-2 text-sm font-medium text-zinc-200">
            {item.uploader_name}
          </p>
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="relative w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 active:opacity-90"
          >
            <div className="aspect-video max-h-[220px] w-full">
              {item.type === "photo" ? (
                <img
                  src={item.signedUrl}
                  alt=""
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center gap-2 bg-zinc-950">
                  <Video className="h-12 w-12 text-cyan-400" />
                  <span className="text-sm text-muted-foreground">Video</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-zinc-800 px-3 py-2 text-left text-xs text-muted-foreground">
              <span>
                {new Date(item.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
              {item.trainer_feedback ? (
                <span className="flex items-center gap-1 text-cyan-400">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Feedback sent
                </span>
              ) : (
                <span>Tap to add feedback</span>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
