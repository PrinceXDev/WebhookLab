"use client";

import type { AiPayloadAnalysis } from "@webhooklab/shared";
import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { EventCard } from "./event-card";
import { Skeleton } from "@/components/ui/skeleton";

interface WebhookEvent {
  id: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  sourceIp: string;
  contentType: string;
  timestamp: number;
  signatureVerification?: {
    provider: string;
    isValid: boolean;
    status: string;
    algorithm?: string;
    message?: string;
  };
  aiAnalysis?: AiPayloadAnalysis;
}

interface EventFeedProps {
  endpointSlug: string;
}

const EVENT_FEED_SKELETON_KEYS = [
  "event-feed-skeleton-1",
  "event-feed-skeleton-2",
  "event-feed-skeleton-3",
] as const;

/** One row per event id: historical first, then live overlays; keep aiAnalysis if present on either. */
function mergeEventsDeduped(
  live: WebhookEvent[],
  historical: WebhookEvent[] | undefined,
): WebhookEvent[] {
  const byId = new Map<string, WebhookEvent>();
  for (const e of historical ?? []) {
    byId.set(e.id, e);
  }
  for (const e of live) {
    const existing = byId.get(e.id);
    byId.set(
      e.id,
      existing
        ? {
            ...existing,
            ...e,
            aiAnalysis: e.aiAnalysis ?? existing.aiAnalysis,
          }
        : e,
    );
  }
  return [...byId.values()].sort((a, b) => b.timestamp - a.timestamp);
}

export function EventFeed({ endpointSlug }: EventFeedProps) {
  const [liveEvents, setLiveEvents] = useState<WebhookEvent[]>([]);

  const { data: historicalEvents, isLoading } = useQuery<WebhookEvent[]>({
    queryKey: ["events", endpointSlug],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/endpoints/${endpointSlug}/events`,
      );
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
  });

  const handleEvent = useCallback((event: WebhookEvent) => {
    setLiveEvents((prev) => {
      if (prev.some((e) => e.id === event.id)) {
        return prev;
      }
      return [event, ...prev];
    });
  }, []);

  const { isConnected } = useWebSocket(endpointSlug, handleEvent);

  const allEvents = mergeEventsDeduped(liveEvents, historicalEvents);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {EVENT_FEED_SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Events ({allEvents.length})</h2>
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm text-muted-foreground">
            {isConnected ? "Live" : "Disconnected"}
          </span>
        </div>
      </div>

      {allEvents.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">
            No webhooks received yet. Send a POST request to your endpoint URL.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {allEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              endpointSlug={endpointSlug}
            />
          ))}
        </div>
      )}
    </div>
  );
}
