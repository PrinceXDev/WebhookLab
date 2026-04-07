"use client";

import { useParams } from "next/navigation";
import { EventFeed } from "@/components/events/event-feed";
import { EndpointHeader } from "@/components/endpoints/endpoint-header";
import { LatencyStats } from "@/components/events/latency-stats";

const EndpointDetailPage = () => {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <div className="container mx-auto py-8 px-4">
      <EndpointHeader slug={slug} />

      <div className="mt-6 mb-6">
        <LatencyStats endpointSlug={slug} />
      </div>

      <EventFeed endpointSlug={slug} />
    </div>
  );
};

export default EndpointDetailPage;
