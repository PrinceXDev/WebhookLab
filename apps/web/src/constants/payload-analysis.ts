import type { AiPayloadAnalysis } from "@webhooklab/shared";

export const ANALYSIS_STEPS = [
  { key: "provider", label: "Provider" },
  { key: "event", label: "Event type" },
  { key: "meaning", label: "What it means" },
  { key: "handler", label: "Handler code" },
] as const;

export const getConfidenceVariant = (
  confidence: AiPayloadAnalysis["providerConfidence"],
): "default" | "secondary" | "outline" => {
  const variantMap: Record<
    AiPayloadAnalysis["providerConfidence"],
    "default" | "secondary" | "outline"
  > = {
    high: "default",
    medium: "secondary",
    low: "outline",
  };
  return variantMap[confidence];
};

export const COPY_FEEDBACK_DURATION = 2000;
