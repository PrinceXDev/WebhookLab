'use client';

import { useQuery } from '@tanstack/react-query';
import { EndpointCard } from './endpoint-card';
import { Skeleton } from '@/components/ui/skeleton';

interface Endpoint {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export function EndpointList() {
  const { data: endpoints, isLoading } = useQuery<Endpoint[]>({
    queryKey: ['endpoints'],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/endpoints`);
      if (!res.ok) throw new Error('Failed to fetch endpoints');
      return res.json();
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
