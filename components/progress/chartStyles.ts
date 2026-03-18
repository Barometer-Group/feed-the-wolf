export const CHART_PRIMARY = "#4FC3F7";
export const CHART_GRID = "#27272a";
export const CHART_AXIS = "#d4d4d8";
export const TOOLTIP_BG = "#1a1a1a";

export const tooltipProps = {
  contentStyle: {
    backgroundColor: TOOLTIP_BG,
    border: "none",
    borderRadius: "8px",
    color: "#fff",
  },
  labelStyle: { color: "#fff" },
  itemStyle: { color: "#fff" },
};

export function formatChartDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
