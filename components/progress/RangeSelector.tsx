"use client";

import type { ProgressRange } from "@/lib/progressRange";

const RANGES: { value: ProgressRange; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "1y", label: "1Y" },
  { value: "all", label: "All" },
];

interface RangeSelectorProps {
  value: ProgressRange;
  onChange: (r: ProgressRange) => void;
}

export function RangeSelector({ value, onChange }: RangeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {RANGES.map(({ value: v, label }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`min-h-[44px] min-w-[44px] rounded-md px-3 text-sm font-medium transition-colors ${
            value === v
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
