"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { WebhookEvent } from "@webhooklab/shared";
import { useWebSocket } from "@/hooks/use-websocket";
import { EventCard } from "./event-card";
import { EventFiltersComponent, type EventFilters } from "./event-filters";

const EventFeed = ({ endpointSlug }: { endpointSlug: string }) => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<EventFilters>(emptyFilters);

  const { data: events = [], isLoading } = useQuery<WebhookEvent[]>({
    queryKey: ["events", endpointSlug],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/endpoints/${endpointSlug}/events`,
      );
      if (!res.ok) {
        throw new Error("Failed to fetch events");
      }
      return res.json();
    },
  });

  const handleEvent = useCallback(
    (event: WebhookEvent) => {
      queryClient.setQueryData<WebhookEvent[]>(
        ["events", endpointSlug],
        (oldEvents = []) => {
          const existingIndex = oldEvents.findIndex((e) => e.id === event.id);

          if (existingIndex >= 0) {
            const updated = [...oldEvents];
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...event,
              aiAnalysis: event.aiAnalysis ?? updated[existingIndex].aiAnalysis,
            };
            return updated;
          }

          return [event, ...oldEvents];
        },
      );
    },
    [queryClient, endpointSlug],
  );

  const { isConnected } = useWebSocket(endpointSlug, handleEvent);

  const filteredEvents = events.filter((event) => {
    const { status: statusFilter, providers, methods } = filters;
    if (statusFilter.size > 0) {
      const status = getEventStatus(event);
      if (!statusFilter.has(status)) {
        return false;
      }
    }

    if (providers.size > 0) {
      const provider = event.signatureVerification?.provider ?? "unknown";
      if (!providers.has(provider)) {
        return false;
      }
    }

    if (methods.size > 0 && !methods.has(event.method)) {
      return false;
    }

    return true;
  });

  const availableProviders = Array.from(
    new Set(events.map((e) => e.signatureVerification?.provider ?? "unknown")),
  );

  const availableMethods = Array.from(new Set(events.map((e) => e.method)));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <svg
              className="h-8 w-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold">Loading Webhook Events</p>
            <p className="text-sm text-muted-foreground">
              Fetching recent webhook activity...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">
            {`Events (${filteredEvents.length}${
              filteredEvents.length === events.length
                ? ""
                : ` of ${events.length}`
            })`}
          </h2>
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

        <EventFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          availableProviders={availableProviders}
          availableMethods={availableMethods}
        />
      </div>

      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">
            {events.length === 0
              ? "No webhooks received yet. Send a POST request to your endpoint URL."
              : "No events match the current filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => (
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
};

const emptyFilters = (): EventFilters => ({
  status: new Set(),
  providers: new Set(),
  methods: new Set(),
});

const getEventStatus = (
  event: WebhookEvent,
): "success" | "error" | "processing" => {
  if (!event.timeline || event.timeline.length === 0) {
    return "processing";
  }
  const hasError = event.timeline.some((stage) => stage.status === "error");
  if (hasError) {
    return "error";
  }
  const allDone = event.timeline.every(
    (stage) => stage.status === "done" || stage.status === "error",
  );
  return allDone ? "success" : "processing";
};

export default EventFeed;
