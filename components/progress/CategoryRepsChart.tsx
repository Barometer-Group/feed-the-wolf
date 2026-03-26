"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CategoryRepsDay } from "@/app/api/progress/category-reps/route";
import {
  CHART_GRID,
  CHART_AXIS,
  tooltipProps,
  formatChartDate,
} from "./chartStyles";

const UPPER_COLOR = "#4FC3F7"; // cyan
const LOWER_COLOR = "#fb923c"; // orange
const CORE_COLOR  = "#4ade80"; // green

interface CategoryRepsChartProps {
  data: CategoryRepsDay[];
  isLoading: boolean;
}

const LABEL_MAP: Record<string, string> = {
  upperReps: "Upper Body",
  lowerReps: "Lower Body",
  coreReps:  "Core",
};

export function CategoryRepsChart({ data, isLoading }: CategoryRepsChartProps) {
  if (isLoading) {
    return <Skeleton className="h-[260px] w-full rounded-lg" />;
  }

  if (data.length === 0) {
    return (
      <Card className="border-zinc-800 bg-card/50">
        <CardContent className="flex min-h-[200px] items-center justify-center p-4">
          <p className="text-center text-sm text-muted-foreground">
            No data yet — log some workouts to see your progress
          </p>
        </CardContent>
      </Card>
    );
  }

  const axisBase = {
    tick: { fill: CHART_AXIS, fontSize: 11 },
    tickLine: false,
    axisLine: false,
  };

  return (
    <Card className="border-zinc-800">
      <CardHeader className="pb-1">
        <CardTitle className="text-base font-medium text-zinc-200">
          Reps by muscle group
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pr-2">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatChartDate}
              {...axisBase}
              interval="preserveStartEnd"
            />
            <YAxis {...axisBase} width={36} allowDecimals={false} />
            <Tooltip
              {...tooltipProps}
              labelFormatter={(v) => formatChartDate(String(v))}
              formatter={(val, name) => [Number(val), LABEL_MAP[name as string] ?? name]}
            />
            <Legend
              formatter={(value) => LABEL_MAP[value] ?? value}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Line type="monotone" dataKey="upperReps" stroke={UPPER_COLOR} strokeWidth={2} dot={{ fill: UPPER_COLOR, r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="lowerReps" stroke={LOWER_COLOR} strokeWidth={2} dot={{ fill: LOWER_COLOR, r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="coreReps"  stroke={CORE_COLOR}  strokeWidth={2} dot={{ fill: CORE_COLOR,  r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
