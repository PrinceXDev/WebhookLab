'use client';

import { useParams } from 'next/navigation';
import { EventFeed } from '@/components/events/event-feed';
import { EndpointHeader } from '@/components/endpoints/endpoint-header';

export default function EndpointDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <div className="container mx-auto py-8 px-4">
      <EndpointHeader slug={slug} />
      <EventFeed endpointSlug={slug} />
    </div>
  );
}
