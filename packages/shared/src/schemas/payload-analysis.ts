import { z } from "zod";

/** Core fields produced by the LLM (validated after parse). */
export const aiPayloadAnalysisCoreSchema = z.object({
  providerGuess: z.string().min(1),
  providerConfidence: z.enum(["high", "medium", "low"]),
  eventType: z.string().min(1),
  eventTypeDescription: z.string().min(1),
  plainEnglishSummary: z.string().min(1),
  suggestedHandler: z.object({
    language: z.enum(["typescript", "javascript", "python"]),
    code: z.string().min(1),
    notes: z.string().optional(),
  }),
  keyFields: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
  anomalyDetection: z
    .object({
      score: z.number().min(0).max(100),
      level: z.enum(["none", "low", "medium", "high"]),
      flags: z.array(z.string()),
      explanation: z.string(),
    })
    .optional(),
  changeDetection: z
    .object({
      hasChanges: z.boolean(),
      changes: z.array(
        z.object({
          field: z.string(),
          previousValue: z.string().optional(),
          currentValue: z.string(),
          changeType: z.enum(["added", "removed", "modified"]),
        }),
      ),
      summary: z.string(),
    })
    .optional(),
  businessIntent: z.string().optional(),
  suggestedActions: z.array(z.string()).optional(),
});

export type AiPayloadAnalysisCore = z.infer<typeof aiPayloadAnalysisCoreSchema>;

/** Persisted on webhook events after analysis completes. */
export type AiPayloadAnalysis = AiPayloadAnalysisCore & {
  analyzedAt: number;
  model: string;
};
