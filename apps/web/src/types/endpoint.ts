/** Shape returned by GET /api/endpoints and PATCH responses */
export interface EndpointRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  forwardingUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  webhookSecret?: string | null;
  secretKey?: string;
}
