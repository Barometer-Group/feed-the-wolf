"use client";

import confetti from "canvas-confetti";

const COLORS = ["#ffffff", "#4FC3F7", "#94a3b8"];

export function triggerConfetti(kind: "pr" | "badge"): void {
  if (typeof window === "undefined") return;

  if (kind === "pr") {
    void confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.45 },
      colors: COLORS,
    });
    return;
  }

  const count = 80;
  const defaults = { colors: COLORS, startVelocity: 25, scalar: 0.9 };

  void confetti({
    ...defaults,
    particleCount: count,
    angle: 60,
    spread: 55,
    origin: { x: 0, y: 0.65 },
  });
  void confetti({
    ...defaults,
    particleCount: count,
    angle: 120,
    spread: 55,
    origin: { x: 1, y: 0.65 },
  });
}
