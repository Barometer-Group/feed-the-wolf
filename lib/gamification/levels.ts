export interface LevelInfo {
  level: number;
  name: string;
  minPoints: number;
  nextLevelMin: number | null;
}

const LEVELS: { min: number; name: string }[] = [
  { min: 0, name: "Pup" },
  { min: 500, name: "Scout" },
  { min: 1000, name: "Hunter" },
  { min: 2000, name: "Alpha" },
  { min: 3500, name: "Apex Predator" },
];

export function getLevelInfo(totalPoints: number): LevelInfo {
  let idx = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalPoints >= LEVELS[i].min) {
      idx = i;
      break;
    }
  }
  const next = LEVELS[idx + 1];
  return {
    level: idx + 1,
    name: LEVELS[idx].name,
    minPoints: LEVELS[idx].min,
    nextLevelMin: next ? next.min : null,
  };
}
