"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number | null;
  className?: string;
}

/**
 * Displays a number with a mechanical roll-in animation.
 * - Rolls up   when the value increases (or on first mount)
 * - Rolls down when the value decreases
 * - Duration: 200ms — fast enough to feel instant, slow enough to feel satisfying
 *
 * Swap usage:
 *   Before: {setNumber}
 *   After:  <OdometerNumber value={setNumber} />
 */
export function OdometerNumber({ value, className = "" }: Props) {
  // Start animKey at 1 so the very first render plays the entry animation
  const [animKey, setAnimKey] = useState(1);
  const [displayValue, setDisplayValue] = useState(value);
  const [direction, setDirection] = useState<"up" | "down">("up");
  const prevRef = useRef<number | null>(value);

  useEffect(() => {
    if (value === prevRef.current) return;
    const dir = (prevRef.current ?? 0) <= (value ?? 0) ? "up" : "down";
    setDirection(dir);
    setDisplayValue(value);
    prevRef.current = value;
    setAnimKey((k) => k + 1);
  }, [value]);

  const str = displayValue == null ? "—" : String(displayValue);

  return (
    // key forces a DOM remount on each animKey change → CSS animation restarts cleanly
    <span
      key={animKey}
      className={`inline-block ${className}`}
      style={{
        animation: `odometer-${direction} 0.2s cubic-bezier(0.23, 1, 0.32, 1) both`,
      }}
    >
      {str}
    </span>
  );
}
