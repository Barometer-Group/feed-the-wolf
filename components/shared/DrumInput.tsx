"use client";

/**
 * DrumInput — a no-keyboard number picker.
 *
 * Three ways to change the value:
 *  1. Tap ▲ / ▼ buttons  (step increment)
 *  2. Drag up / down on the number face  (continuous)
 *  3. Mouse-wheel over the number face  (desktop)
 *
 * The displayed number uses OdometerNumber so it rolls as it changes.
 */

import { useEffect, useRef, useState } from "react";
import { OdometerNumber } from "./OdometerNumber";

interface DrumInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  /** px of drag travel equal to one step (default 10) */
  dragSensitivity?: number;
}

export function DrumInput({
  value,
  onChange,
  label,
  unit,
  min = 0,
  max = 999,
  step = 1,
  dragSensitivity = 10,
}: DrumInputProps) {
  const faceRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  // refs so event handlers don't stale-close over value
  const dragging = useRef(false);
  const startY = useRef(0);
  const startValue = useRef(value);

  const clamp = (v: number) =>
    Math.round(Math.max(min, Math.min(max, v)) / step) * step;

  // ── mouse wheel ──────────────────────────────────────────────────────────
  useEffect(() => {
    const el = faceRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      onChange(clamp(value + (e.deltaY < 0 ? step : -step)));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [value, step, min, max, onChange]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── pointer drag ─────────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    startY.current = e.clientY;
    startValue.current = value;
    setActive(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const deltaY = startY.current - e.clientY; // drag up → positive → increase
    const steps = Math.round(deltaY / dragSensitivity);
    onChange(clamp(startValue.current + steps * step));
  };

  const onPointerUp = () => {
    dragging.current = false;
    setActive(false);
  };

  const btn =
    "flex h-9 w-full items-center justify-center text-zinc-400 " +
    "hover:text-zinc-100 active:text-white transition-colors " +
    "select-none cursor-pointer text-sm";

  return (
    <div className="flex flex-col items-center gap-0">
      {/* label */}
      <span className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-400">
        {label}
      </span>

      {/* ▲ */}
      <button
        type="button"
        className={`${btn} rounded-t-xl bg-zinc-800/70 hover:bg-zinc-700`}
        onClick={() => onChange(clamp(value + step))}
      >
        ▲
      </button>

      {/* number face — drag zone */}
      <div
        ref={faceRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={[
          "flex w-full cursor-ns-resize select-none touch-none",
          "items-center justify-center border-x border-zinc-700 bg-zinc-900 py-4",
          "transition-colors duration-75",
          active ? "bg-zinc-800" : "",
        ].join(" ")}
      >
        <OdometerNumber
          value={value}
          className="text-4xl font-bold tabular-nums text-zinc-100"
        />
      </div>

      {/* ▼ */}
      <button
        type="button"
        className={`${btn} rounded-b-xl bg-zinc-800/70 hover:bg-zinc-700`}
        onClick={() => onChange(clamp(value - step))}
      >
        ▼
      </button>

      {/* unit */}
      {unit && (
        <span className="mt-1.5 text-xs text-zinc-500">{unit}</span>
      )}
    </div>
  );
}
