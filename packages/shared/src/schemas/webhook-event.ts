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

/** Inferred shape from `webhookEventSchema` (distinct from `WebhookEvent` in `./types`). */
export type ParsedWebhookEvent = z.infer<typeof webhookEventSchema>;
