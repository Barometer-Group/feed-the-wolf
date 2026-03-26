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
import type { ExerciseProgressDay } from "@/lib/progressTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CHART_PRIMARY,
  CHART_SECONDARY,
  CHART_GRID,
  CHART_AXIS,
  tooltipProps,
  formatChartDate,
} from "./chartStyles";

interface ExerciseChartsProps {
  data: ExerciseProgressDay[];
  isLoading: boolean;
}

export function ExerciseCharts({ data, isLoading }: ExerciseChartsProps) {
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

  const hasWeight = data.some((d) => d.maxWeight > 0);
  const hasReps   = data.some((d) => d.totalReps > 0);

  const axisBase = {
    tick: { fontSize: 11 },
    tickLine: false,
    axisLine: false,
  };

  return (
    <Card className="border-zinc-800">
      <CardHeader className="pb-1">
        <CardTitle className="text-base font-medium text-zinc-200">
          Weight &amp; Reps over time
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pr-2">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            data={data}
            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />

            {/* X axis */}
            <XAxis
              dataKey="date"
              tickFormatter={formatChartDate}
              {...axisBase}
              tick={{ ...axisBase.tick, fill: CHART_AXIS }}
            />

            {/* Left axis — weight */}
            {hasWeight && (
              <YAxis
                yAxisId="weight"
                orientation="left"
                {...axisBase}
                tick={{ ...axisBase.tick, fill: CHART_PRIMARY }}
                width={40}
                tickFormatter={(v) => `${v}`}
              />
            )}

            {/* Right axis — reps */}
            {hasReps && (
              <YAxis
                yAxisId="reps"
                orientation="right"
                {...axisBase}
                tick={{ ...axisBase.tick, fill: CHART_SECONDARY }}
                width={32}
                allowDecimals={false}
              />
            )}

            <Tooltip
              {...tooltipProps}
              labelFormatter={(v) => formatChartDate(String(v))}
              formatter={(val, name) =>
                name === "maxWeight"
                  ? [`${Number(val)} lbs`, "Weight"]
                  : [Number(val), "Reps"]
              }
            />

            <Legend
              formatter={(value) =>
                value === "maxWeight" ? "Weight (lbs)" : "Reps"
              }
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />

            {hasWeight && (
              <Line
                yAxisId="weight"
                type="monotone"
                dataKey="maxWeight"
                stroke={CHART_PRIMARY}
                strokeWidth={2}
                dot={{ fill: CHART_PRIMARY, r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            )}

            {hasReps && (
              <Line
                yAxisId="reps"
                type="monotone"
                dataKey="totalReps"
                stroke={CHART_SECONDARY}
                strokeWidth={2}
                dot={{ fill: CHART_SECONDARY, r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
