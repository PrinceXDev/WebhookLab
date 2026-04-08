export interface Endpoint {
  id: string;
  userId: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  forwardingUrl: string | null;
  secretKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReplayLog {
  id: string;
  eventId: string;
  endpointId: string;
  targetUrl: string;
  responseStatus: number | null;
  responseBody: string | null;
  responseHeaders: Record<string, string> | null;
  latencyMs: number | null;
  error: string | null;
  replayedAt: Date;
}
