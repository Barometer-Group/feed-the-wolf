"use client";

const STROKE_COLOR = "white";
const EYE_ACCENT = "#4FC3F7";
const STAGGER_MS = 60;

const FACETS: { d: string; stroke?: string }[] = [
  { d: "M 100 20 L 70 55 L 100 50 Z" },
  { d: "M 100 20 L 130 55 L 100 50 Z" },
  { d: "M 45 55 L 70 55 L 60 75 Z" },
  { d: "M 155 55 L 130 55 L 140 75 Z" },
  { d: "M 60 75 L 70 55 L 85 65 Z" },
  { d: "M 140 75 L 130 55 L 115 65 Z" },
  { d: "M 85 65 L 100 50 L 115 65 Z" },
  { d: "M 100 50 L 85 65 L 75 85 Z" },
  { d: "M 100 50 L 115 65 L 125 85 Z" },
  { d: "M 55 85 L 75 85 L 70 100 Z" },
  { d: "M 145 85 L 125 85 L 130 100 Z" },
  { d: "M 70 100 L 75 85 L 90 95 Z" },
  { d: "M 130 100 L 125 85 L 110 95 Z" },
  { d: "M 90 95 L 100 85 L 110 95 Z" },
  { d: "M 70 85 L 60 95 L 75 100 Z", stroke: EYE_ACCENT },
  { d: "M 130 85 L 140 95 L 125 100 Z", stroke: EYE_ACCENT },
  { d: "M 100 85 L 90 95 L 100 120 Z" },
  { d: "M 100 85 L 110 95 L 100 120 Z" },
  { d: "M 100 120 L 90 95 L 80 110 Z" },
  { d: "M 100 120 L 110 95 L 120 110 Z" },
  { d: "M 80 110 L 70 100 L 85 130 Z" },
  { d: "M 120 110 L 130 100 L 115 130 Z" },
  { d: "M 85 130 L 100 120 L 100 155 Z" },
  { d: "M 115 130 L 100 120 L 100 155 Z" },
  { d: "M 70 100 L 85 130 L 75 140 Z" },
  { d: "M 130 100 L 115 130 L 125 140 Z" },
  { d: "M 75 140 L 100 155 L 90 165 Z" },
  { d: "M 125 140 L 100 155 L 110 165 Z" },
];

export function WolfLogo() {
  return (
    <>
      <style>{`
        @keyframes wolf-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes wolf-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        .wolf-facet {
          fill: none;
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: wolf-draw 0.12s ease-out forwards;
        }
        .wolf-container {
          animation: wolf-breathe 3s ease-in-out 1.8s infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .wolf-facet { animation: none; stroke-dashoffset: 0; }
          .wolf-container { animation: none; }
        }
      `}</style>
      <svg
        viewBox="0 0 200 200"
        className="wolf-container w-[200px] h-[200px]"
        aria-hidden
      >
        {FACETS.map((facet, i) => (
          <path
            key={i}
            d={facet.d}
            stroke={facet.stroke ?? STROKE_COLOR}
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            className="wolf-facet"
            style={{
              animationDelay: `${i * STAGGER_MS}ms`,
              animationFillMode: "forwards",
            } as React.CSSProperties}
          />
        ))}
      </svg>
    </>
  );
}
