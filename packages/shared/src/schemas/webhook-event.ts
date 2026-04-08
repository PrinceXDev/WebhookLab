import { z } from "zod";
import { aiPayloadAnalysisCoreSchema } from "./payload-analysis";

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

export const signatureVerificationSchema = z.object({
  provider: z.string(),
  isValid: z.boolean(),
  status: z.string(),
  algorithm: z.string().optional(),
  message: z.string().optional(),
});

/** AI analysis with metadata (stored on events after manual analysis). */
export const aiPayloadAnalysisSchema = aiPayloadAnalysisCoreSchema.extend({
  analyzedAt: z.number(),
  model: z.string(),
});

export const webhookEventSchema = z.object({
  id: z.string(),
  endpointSlug: z.string(),
  method: z.string(),
  headers: z.record(z.string()),
  body: z.string(),
  queryParams: z.record(z.string()),
  sourceIp: z.string(),
  contentType: z.string(),
  timestamp: z.number(),
  signatureVerification: signatureVerificationSchema.optional(),
  aiAnalysis: aiPayloadAnalysisSchema.optional(),
  timeline: z.array(timelineStageSchema).optional(),
  forwardingResult: forwardingResultSchema.optional(),
  retryCount: z.number().optional(),
  totalDurationMs: z.number().optional(),
});

export type WebhookEvent = z.infer<typeof webhookEventSchema>;
export type TimelineStage = z.infer<typeof timelineStageSchema>;
export type ForwardingResult = z.infer<typeof forwardingResultSchema>;
export type SignatureVerification = z.infer<typeof signatureVerificationSchema>;
