"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { WorkoutByDate, WeeklyCount } from "@/hooks/useProgress";
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

interface WorkoutChartsProps {
  byDate: WorkoutByDate[];
  weekly: WeeklyCount[];
  isLoading: boolean;
}

export function WorkoutCharts({ byDate, weekly, isLoading }: WorkoutChartsProps) {
  const durationData = byDate.map((d) => ({
    ...d,
    label: formatChartDate(d.date),
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  const axisProps = {
    stroke: CHART_AXIS,
    tick: { fill: CHART_AXIS, fontSize: 11 },
    tickLine: { stroke: CHART_GRID },
  };

  const emptyDuration = byDate.length === 0;
  const emptyWeekly = weekly.length === 0;

  if (emptyDuration && emptyWeekly) {
    return <EmptyChart />;
  }

  return (
    <div className="space-y-6">
      {emptyDuration ? (
        <EmptyChart />
      ) : (
        <Card className="border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-zinc-200">
              Workout Duration (min)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={durationData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="date" tickFormatter={formatChartDate} {...axisProps} />
                <YAxis {...axisProps} width={36} />
                <Tooltip
                  {...tooltipProps}
                  labelFormatter={(v) => formatChartDate(String(v))}
                  formatter={(val) => [`${Number(val)} min`, "Duration"]}
                />
                <Bar
                  dataKey="durationMinutes"
                  fill={CHART_PRIMARY}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {emptyWeekly ? (
        <EmptyChart />
      ) : (
        <Card className="border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-zinc-200">
              Workouts per Week
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={weekly}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="weekLabel" {...axisProps} />
                <YAxis {...axisProps} width={28} allowDecimals={false} />
                <Tooltip
                  {...tooltipProps}
                  formatter={(val) => [Number(val), "Workouts"]}
                  labelFormatter={(label) => `Week of ${label}`}
                />
                <Bar dataKey="count" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
