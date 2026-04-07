"use client";

import { Chart } from "react-google-charts";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TIMELINE_STAGE_LABELS,
  TIMELINE_CHART_LEGEND_ITEMS,
  buildGoogleTimelineChartData,
  getTimelineStageDotClass,
  GOOGLE_TIMELINE_CHART_OPTIONS,
  type TimelineStage,
} from "@/constants/timeline";

interface GoogleTimelineChartProps {
  readonly timeline?: TimelineStage[];
  readonly totalDurationMs?: number;
}

export const GoogleTimelineChart = ({
  timeline,
  totalDurationMs,
}: GoogleTimelineChartProps) => {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        <span>No timeline data available</span>
      </div>
    );
  }

  const chartData = buildGoogleTimelineChartData(timeline);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Timeline Visualization</h3>
        {totalDurationMs !== undefined && (
          <div className="text-sm font-medium text-muted-foreground">
            Total: <span className="text-foreground">{totalDurationMs}ms</span>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card p-4">
        <Chart
          chartType="Timeline"
          data={chartData}
          width="100%"
          height="300px"
          options={GOOGLE_TIMELINE_CHART_OPTIONS}
          loader={<GoogleTimelineChartLoader />}
        />
      </div>

      <TimelineChartLegend />

      <div className="grid gap-2 text-xs">
        {timeline.map((stage, index) => (
          <TimelineStageDetailRow
            key={`${stage.name}-${index}`}
            stage={stage}
          />
        ))}
      </div>
    </div>
  );
};

const GoogleTimelineChartLoader = () => (
  <div className="flex h-[300px] flex-col items-center justify-center space-y-4">
    <div className="relative">
      <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      <svg
        className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    </div>
    <div className="text-center space-y-2">
      <p className="text-sm font-medium">Building Timeline Chart</p>
      <p className="text-xs text-muted-foreground">
        Preparing visualization of webhook stages...
      </p>
    </div>
  </div>
);

const TimelineChartLegend = () => (
  <div className="rounded-lg border bg-muted/50 p-3">
    <p className="text-xs font-semibold mb-2 text-muted-foreground">
      Stage Colors
    </p>
    <div className="flex flex-wrap gap-3 text-xs">
      {TIMELINE_CHART_LEGEND_ITEMS.map(({ id, label, swatchClass }) => (
        <div key={id} className="flex items-center gap-2">
          <div className={cn("h-3 w-3 rounded", swatchClass)} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  </div>
);

const TimelineStageDetailRow = ({
  stage,
}: {
  readonly stage: TimelineStage;
}) => {
  const { name, status, timestamp, durationMs, error } = stage;
  const dotClass = getTimelineStageDotClass(name, status);

  return (
    <div className="flex items-center justify-between rounded-md border bg-card p-2">
      <div className="flex items-center gap-2">
        <div className={cn("h-2 w-2 rounded-full", dotClass)} />
        <span className="font-medium">{TIMELINE_STAGE_LABELS[name]}</span>
      </div>
      <div className="flex items-center gap-3 text-muted-foreground">
        <span>
          {new Date(timestamp).toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            fractionalSecondDigits: 3,
          })}
        </span>
        {durationMs !== undefined && durationMs > 0 && (
          <span className="font-medium text-foreground">{durationMs}ms</span>
        )}
        {error && (
          <span className="text-red-600 dark:text-red-400">⚠ {error}</span>
        )}
      </div>
    </div>
  );
};
