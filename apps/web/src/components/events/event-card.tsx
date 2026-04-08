"use client";

import { useState } from "react";
import type { WebhookEvent } from "@webhooklab/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SignatureBadge } from "./signature-badge";
import { LatencyBar, shouldShowLatencyBar } from "./latency-bar";
import { EventDetailsTabs } from "./event-details-tabs";
import { TimelineViewToggle } from "./timeline-view-toggle";
import { cn } from "@/lib/utils";

export const EventCard = ({
  event,
  endpointSlug,
}: {
  event: WebhookEvent;
  endpointSlug: string;
}) => {
  const [expanded, setExpanded] = useState(false);

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: "bg-blue-500",
      POST: "bg-green-500",
      PUT: "bg-yellow-500",
      PATCH: "bg-orange-500",
      DELETE: "bg-red-500",
    };
    return colors[method] || "bg-gray-500";
  };

  const getStatusBadge = () => {
    if (!event.timeline || event.timeline.length === 0) {
      return null;
    }

    const hasError = event.timeline.some((stage) => stage.status === "error");
    const allDone = event.timeline.every(
      (stage) => stage.status === "done" || stage.status === "error",
    );

    if (hasError) {
      return (
        <Badge variant="destructive" className="text-xs">
          Error
        </Badge>
      );
    }

    if (allDone) {
      return (
        <Badge variant="default" className="bg-green-500 text-xs">
          Success
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="text-xs">
        Processing
      </Badge>
    );
  };

  return (
    <Card className={cn("transition-all", expanded && "ring-2 ring-primary")}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <Badge className={getMethodColor(event.method)}>
              {event.method}
            </Badge>
            {getStatusBadge()}
            <SignatureBadge verification={event.signatureVerification} />

            {event.totalDurationMs !== undefined && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{event.totalDurationMs}ms</span>
              </div>
            )}

            <span className="text-sm font-mono text-muted-foreground">
              {event.id}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(event.timestamp), {
                addSuffix: true,
              })}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {expanded && (
          <div className="mt-6 space-y-6">
            {event.timeline && event.timeline.length > 0 && (
              <div className="rounded-lg border bg-card p-4">
                <TimelineViewToggle
                  timeline={event.timeline}
                  totalDurationMs={event.totalDurationMs}
                />
              </div>
            )}

            {shouldShowLatencyBar(event.timeline, event.totalDurationMs) && (
              <div className="rounded-lg border bg-card p-4">
                <LatencyBar
                  timeline={event.timeline}
                  totalDurationMs={event.totalDurationMs}
                />
              </div>
            )}

            <div className="rounded-lg border bg-card p-4">
              <EventDetailsTabs
                event={event}
                endpointSlug={endpointSlug}
                redisTtl="72h"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
