"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, GitBranch } from "lucide-react";
import type { TimelineStage } from "@/constants/timeline";
import { EventTimeline } from "./event-timeline";
import { GoogleTimelineChart } from "./google-timeline-chart";

interface TimelineViewToggleProps {
  readonly timeline?: TimelineStage[];
  readonly totalDurationMs?: number;
}

type ViewMode = "google" | "vertical";

export const TimelineViewToggle = ({
  timeline,
  totalDurationMs,
}: TimelineViewToggleProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("google");

  if (!timeline || timeline.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Timeline Visualization</h3>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "google" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("google")}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Gantt View
          </Button>
          <Button
            variant={viewMode === "vertical" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("vertical")}
          >
            <GitBranch className="mr-2 h-4 w-4" />
            Flow View
          </Button>
        </div>
      </div>

      {viewMode === "google" ? (
        <GoogleTimelineChart
          timeline={timeline}
          totalDurationMs={totalDurationMs}
        />
      ) : (
        <EventTimeline timeline={timeline} totalDurationMs={totalDurationMs} />
      )}
    </div>
  );
};
