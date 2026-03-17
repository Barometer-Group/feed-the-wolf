"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SkipForward } from "lucide-react";

interface RestTimerProps {
  /** Initial seconds. Default 90. */
  initialSeconds?: number;
  onComplete?: () => void;
  onSkip?: () => void;
  className?: string;
}

function playBeep() {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.frequency.value = 440;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.2, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch {
    // Ignore if Web Audio not supported
  }
}

export function RestTimer({
  initialSeconds = 90,
  onComplete,
  onSkip,
  className = "",
}: RestTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const beepPlayed = useRef(false);

  const skip = useCallback(() => {
    onSkip?.();
  }, [onSkip]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (!beepPlayed.current) {
        beepPlayed.current = true;
        playBeep();
      }
      const t = setTimeout(() => onComplete?.(), 500);
      return () => clearTimeout(t);
    }
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [secondsLeft, onComplete]);

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  const display = `${m}:${s.toString().padStart(2, "0")}`;

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 rounded-lg border bg-card p-6 shadow-md ${className}`}
    >
      <p className="text-sm text-muted-foreground">Rest</p>
      <p className="text-5xl font-bold tabular-nums">{display}</p>
      <Button variant="outline" size="sm" onClick={skip}>
        <SkipForward className="mr-2 h-4 w-4" />
        Skip
      </Button>
    </div>
  );
}
