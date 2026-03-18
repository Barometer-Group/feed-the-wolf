"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { MediaType } from "@/lib/mediaTypes";

interface MediaUploadProps {
  workoutLogId: string;
  exerciseLogId: string | null;
  onUploadComplete: () => void;
  disabled?: boolean;
}

function mediaTypeFromFile(file: File): MediaType {
  return file.type.startsWith("video/") ? "video" : "photo";
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export function MediaUpload({
  workoutLogId,
  exerciseLogId,
  onUploadComplete,
  disabled,
}: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = async (file: File | null) => {
    if (!file || !file.type.match(/^(image|video)\//)) {
      if (file) toast.error("Please choose a photo or video");
      return;
    }

    setUploading(true);
    setProgress(10);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sign in required");
        return;
      }

      const path = `${user.id}/${workoutLogId}/${Date.now()}-${safeFilename(file.name)}`;
      setProgress(30);

      const { error: upErr } = await supabase.storage
        .from("workout-media")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (upErr) {
        toast.error(upErr.message);
        return;
      }

      setProgress(70);

      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workout_log_id: workoutLogId,
          exercise_log_id: exerciseLogId,
          storage_path: path,
          type: mediaTypeFromFile(file),
        }),
      });

      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        toast.error(j.error ?? "Failed to save media record");
        await supabase.storage.from("workout-media").remove([path]);
        return;
      }

      setProgress(100);
      toast.success("Media uploaded");
      onUploadComplete();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || uploading}
        className="min-h-[44px] w-full sm:w-auto"
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {progress < 100 ? `Uploading… ${progress}%` : "Finishing…"}
          </>
        ) : (
          <>
            <Camera className="mr-2 h-4 w-4" />
            Add Photo/Video
          </>
        )}
      </Button>
    </div>
  );
}
