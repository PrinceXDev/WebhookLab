"use client";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { AlertCircle } from "lucide-react";
import {
  TIMELINE_STAGE_LABELS,
  type TimelineStage,
} from "@/constants/timeline";
import { TIMELINE_STAGE_STATUS_ICONS } from "@/constants/timeline-stage-icons";

interface EventTimelineProps {
  readonly timeline?: TimelineStage[];
  readonly totalDurationMs?: number;
}

const getLatencyBetweenStages = (
  stages: TimelineStage[],
  index: number,
): number | null => {
  if (index === 0) {
    return null;
  }
  const current = stages[index];
  const previous = stages[index - 1];
  return current.timestamp - previous.timestamp;
};

const getLatencyColor = (latencyMs: number): string => {
  if (latencyMs < 10) {
    return "text-green-600 bg-green-50 dark:bg-green-950";
  }
  if (latencyMs < 50) {
    return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950";
  }
  if (latencyMs < 200) {
    return "text-orange-600 bg-orange-50 dark:bg-orange-950";
  }
  return "text-red-600 bg-red-50 dark:bg-red-950";
};

const EventTimeline = ({ timeline, totalDurationMs }: EventTimelineProps) => {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        <span>No timeline data available</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Timeline</h3>
        {totalDurationMs !== undefined && (
          <div className="text-sm font-medium text-muted-foreground">
            Total: <span className="text-foreground">{totalDurationMs}ms</span>
          </div>
        )}
      </div>

      <div className="relative">
        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-green-500 via-blue-500 to-purple-500" />

        <div className="space-y-6">
          {timeline.map((stage, index) => {
            const { name, status, timestamp, durationMs, error } = stage;
            const latency = getLatencyBetweenStages(timeline, index);

            return (
              <div key={`${name}-${index}`} className="relative">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 border-background",
                      status === "done" && "bg-green-500",
                      status === "error" && "bg-red-500",
                      status === "active" && "bg-blue-500",
                      status === "pending" && "bg-gray-400",
                    )}
                  >
                    {TIMELINE_STAGE_STATUS_ICONS[status]}
                  </div>

                  <div className="flex-1 pt-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold">
                          {TIMELINE_STAGE_LABELS[name]}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(timestamp), "HH:mm:ss.SSS")} UTC
                        </p>
                      </div>

                      {durationMs !== undefined && durationMs > 0 && (
                        <div className="text-xs font-medium text-muted-foreground">
                          {durationMs}ms
                        </div>
                      )}
                    </div>

                    {error && (
                      <div className="mt-2 rounded-md bg-red-50 dark:bg-red-950 p-2 text-xs text-red-600 dark:text-red-400">
                        {error}
                      </div>
                    )}

                    {latency !== null && latency > 0 && (
                      <div className="mt-2">
                        <div
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                            getLatencyColor(latency),
                          )}
                        >
                          +{latency}ms
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EventTimeline;
