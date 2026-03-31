"use client";

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
}

interface EventFeedProps {
  endpointSlug: string;
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

  // Memoize the event handler to prevent unnecessary re-subscriptions
  const handleEvent = useCallback((event: WebhookEvent) => {
    setLiveEvents((prev) => [event, ...prev]);
  }, []);

  const { isConnected } = useWebSocket(endpointSlug, handleEvent);

  const allEvents = [...liveEvents, ...(historicalEvents || [])];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
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
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
