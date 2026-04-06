"use client";

import { EndpointCard } from "./endpoint-card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { apiClient } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import type { EndpointRecord } from "@/types/endpoint";

export function EndpointList() {
  const { data: endpoints, isLoading, isError } = useQuery<EndpointRecord[]>({
    queryKey: ['endpoints'],
    queryFn: async () => {
      try {
        return await apiClient.get<EndpointRecord[]>("/api/endpoints");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load endpoints';
        toast({
          variant: 'destructive',
          title: 'Failed to load endpoints',
          description: message,
        });
        throw err;
      }
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12 text-center text-sm text-destructive">
        Could not load endpoints. Check the notification or refresh the page.
      </div>
    );
  }

  if (!endpoints || endpoints.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          No endpoints yet. Create your first webhook endpoint to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {endpoints.map((endpoint) => (
        <EndpointCard key={endpoint.id} endpoint={endpoint} />
      ))}
    </div>
  );
}
