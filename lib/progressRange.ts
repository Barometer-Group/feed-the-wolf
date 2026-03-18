export type ProgressRange = "7d" | "30d" | "90d" | "1y" | "all";

export function parseProgressRange(param: string | null): ProgressRange {
  const r = (param ?? "30d").toLowerCase();
  if (r === "7d" || r === "30d" || r === "90d" || r === "1y" || r === "all") {
    return r;
  }
  return "30d";
}

/** Inclusive lower bound for filtering by workout completed_at; null = no bound */
export function rangeStartIso(range: ProgressRange): string | null {
  if (range === "all") return null;
  const d = new Date();
  switch (range) {
    case "7d":
      d.setDate(d.getDate() - 7);
      break;
    case "30d":
      d.setDate(d.getDate() - 30);
      break;
    case "90d":
      d.setDate(d.getDate() - 90);
      break;
    case "1y":
      d.setFullYear(d.getFullYear() - 1);
      break;
    default:
      d.setDate(d.getDate() - 30);
  }
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function dateKeyUtc(iso: string): string {
  return iso.slice(0, 10);
}

/** Monday of the week (UTC date string yyyy-mm-dd) for grouping */
export function weekStartMondayUtc(isoCompletedAt: string): string {
  const d = new Date(isoCompletedAt);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
  return mon.toISOString().slice(0, 10);
}

export function formatWeekLabel(weekStartYmd: string): string {
  const [y, m, day] = weekStartYmd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day));
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
