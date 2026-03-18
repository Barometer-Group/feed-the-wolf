"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ExerciseProgressDay } from "@/lib/progressTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CHART_PRIMARY,
  CHART_GRID,
  CHART_AXIS,
  tooltipProps,
  formatChartDate,
} from "./chartStyles";

function ChartSkeleton() {
  return <Skeleton className="h-[200px] w-full rounded-lg" />;
}

function EmptyChart() {
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

interface ExerciseChartsProps {
  data: ExerciseProgressDay[];
  isLoading: boolean;
}

export function ExerciseCharts({ data, isLoading }: ExerciseChartsProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatChartDate(d.date),
  }));

  const hasWeight = data.some((d) => d.maxWeight > 0 || d.volume > 0);
  const hasAny = data.length > 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  if (!hasAny) {
    return <EmptyChart />;
  }

  const axisProps = {
    stroke: CHART_AXIS,
    tick: { fill: CHART_AXIS, fontSize: 11 },
    tickLine: { stroke: CHART_GRID },
  };

  return (
    <div className="space-y-6">
      {hasWeight && (
        <Card className="border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-zinc-200">
              Max Weight (lbs)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="date" tickFormatter={formatChartDate} {...axisProps} />
                <YAxis {...axisProps} width={36} />
                <Tooltip
                  {...tooltipProps}
                  labelFormatter={(v) => formatChartDate(String(v))}
                  formatter={(val) => [`${Number(val)} lbs`, "Max"]}
                />
                <Line
                  type="monotone"
                  dataKey="maxWeight"
                  stroke={CHART_PRIMARY}
                  strokeWidth={2}
                  dot={{ fill: CHART_PRIMARY, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-zinc-200">
            Total Reps
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="date" tickFormatter={formatChartDate} {...axisProps} />
              <YAxis {...axisProps} width={36} />
                <Tooltip
                  {...tooltipProps}
                  labelFormatter={(v) => formatChartDate(String(v))}
                  formatter={(val) => [Number(val), "Reps"]}
                />
              <Bar dataKey="totalReps" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {hasWeight && (
        <Card className="border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-zinc-200">
              Volume (lbs)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="date" tickFormatter={formatChartDate} {...axisProps} />
                <YAxis {...axisProps} width={44} />
                <Tooltip
                  {...tooltipProps}
                  labelFormatter={(v) => formatChartDate(String(v))}
                  formatter={(val) => [Number(val).toLocaleString(), "Volume"]}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  stroke={CHART_PRIMARY}
                  strokeWidth={2}
                  dot={{ fill: CHART_PRIMARY, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
