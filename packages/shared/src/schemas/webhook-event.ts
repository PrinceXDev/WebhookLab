import { z } from 'zod';

export const webhookEventSchema = z.object({
  id: z.string(),
  endpointSlug: z.string(),
  method: z.string(),
  headers: z.record(z.string()),
  body: z.string(),
  queryParams: z.record(z.string()).optional(),
  sourceIp: z.string(),
  contentType: z.string(),
  timestamp: z.number(),
});

export type WebhookEvent = z.infer<typeof webhookEventSchema>;
