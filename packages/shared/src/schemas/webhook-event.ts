import { z } from "zod";

export const timelineStageSchema = z.object({
  name: z.enum(["received", "verified", "parsed", "forwarded", "responded"]),
  status: z.enum(["pending", "active", "done", "error"]),
  timestamp: z.number(),
  durationMs: z.number().optional(),
  error: z.string().optional(),
});

export const forwardingResultSchema = z.object({
  targetUrl: z.string(),
  statusCode: z.number().optional(),
  responseBody: z.string().optional(),
  responseHeaders: z.record(z.string()).optional(),
  latencyMs: z.number().optional(),
  error: z.string().optional(),
  attemptedAt: z.number(),
});

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
  timeline: z.array(timelineStageSchema).optional(),
  forwardingResult: forwardingResultSchema.optional(),
  retryCount: z.number().optional(),
  totalDurationMs: z.number().optional(),
});

/** Inferred shape from `webhookEventSchema` (distinct from `WebhookEvent` in `./types`). */
export type ParsedWebhookEvent = z.infer<typeof webhookEventSchema>;
export type TimelineStage = z.infer<typeof timelineStageSchema>;
export type ForwardingResult = z.infer<typeof forwardingResultSchema>;
