"use client";

import { cn } from "@/lib/utils";
import {
  TIMELINE_STAGE_BG_CLASS,
  TIMELINE_STAGE_LABELS_SHORT,
  type TimelineStage,
} from "@/constants/timeline";

interface LatencyBarProps {
  readonly timeline?: TimelineStage[];
  readonly totalDurationMs?: number;
}

/** True when the bar has at least one segment to draw (avoids empty bordered shells in parents). */
export const shouldShowLatencyBar = (
  timeline: TimelineStage[] | undefined,
  totalDurationMs: number | undefined,
): boolean => {
  if (
    !timeline ||
    timeline.length === 0 ||
    totalDurationMs === undefined ||
    totalDurationMs <= 0
  ) {
    return false;
  }
  return timeline.some(
    (stage) => stage.durationMs !== undefined && stage.durationMs > 0,
  );
};

export const LatencyBar = ({ timeline, totalDurationMs }: LatencyBarProps) => {
  if (!shouldShowLatencyBar(timeline, totalDurationMs)) {
    return null;
  }
  if (timeline === undefined || totalDurationMs === undefined) {
    return null;
  }

  const segments = timeline
    .filter(
      (stage): stage is TimelineStage & { durationMs: number } =>
        stage.durationMs !== undefined && stage.durationMs > 0,
    )
    .map((stage) => ({
      name: stage.name,
      durationMs: stage.durationMs,
      percentage: (stage.durationMs / totalDurationMs) * 100,
    }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Latency Breakdown</h4>
        <span className="text-xs text-muted-foreground">
          Total: {totalDurationMs}ms
        </span>
      </div>

      <div className="flex h-8 w-full overflow-hidden rounded-lg">
        {segments.map(({ name, durationMs, percentage }, index) => (
          <div
            key={`${name}-${index}`}
            className={cn(
              "relative flex items-center justify-center transition-all hover:opacity-80",
              TIMELINE_STAGE_BG_CLASS[name],
            )}
            style={{ width: `${percentage}%` }}
            title={`${TIMELINE_STAGE_LABELS_SHORT[name]}: ${durationMs}ms (${percentage.toFixed(1)}%)`}
          >
            {percentage > 10 && (
              <span className="text-xs font-medium text-white">
                {durationMs}ms
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 md:grid-cols-5">
        {segments.map(({ name, durationMs, percentage }, index) => (
          <div
            key={`${name}-legend-${index}`}
            className="flex items-center gap-2"
          >
            <div
              className={cn("h-3 w-3 rounded", TIMELINE_STAGE_BG_CLASS[name])}
            />
            <div className="flex-1">
              <div className="font-medium">
                {TIMELINE_STAGE_LABELS_SHORT[name]}
              </div>
              <div className="text-muted-foreground">
                {durationMs}ms ({percentage.toFixed(1)}%)
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
