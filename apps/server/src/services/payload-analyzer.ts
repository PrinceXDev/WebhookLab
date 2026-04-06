import OpenAI from "openai";
import {
  aiPayloadAnalysisCoreSchema,
  type AiPayloadAnalysis,
} from "@webhooklab/shared";

const MAX_BODY_CHARS = 24_000;

const HEADER_HINTS = [
  "stripe-signature",
  "x-github-event",
  "x-github-delivery",
  "x-shopify-topic",
  "x-shopify-hmac-sha256",
  "x-slack-signature",
  "svix-id",
  "user-agent",
  "x-request-id",
] as const;

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function pickRelevantHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const picked: Record<string, string> = {};
  for (const h of HEADER_HINTS) {
    const key = Object.keys(headers).find((k) => k.toLowerCase() === h);
    if (key) picked[h] = headers[key]!;
  }
  return picked;
}

function buildUserPayload(input: {
  method: string;
  contentType: string;
  body: string;
  headers: Record<string, string>;
  signatureProviderHint?: string;
}): string {
  const body =
    input.body.length > MAX_BODY_CHARS
      ? `${input.body.slice(0, MAX_BODY_CHARS)}\n\n[...truncated for analysis]`
      : input.body;

  return JSON.stringify(
    {
      method: input.method,
      contentType: input.contentType,
      signatureProviderFromVerification: input.signatureProviderHint ?? null,
      relevantHeaders: pickRelevantHeaders(input.headers),
      rawBody: body,
    },
    null,
    2,
  );
}

const SYSTEM_PROMPT = `You are an expert at webhook integrations (Stripe, GitHub, Shopify, Slack, Svix, Paddle, Twilio, and generic JSON APIs).

Analyze the webhook request JSON the user sends next. Respond with ONLY a single JSON object (no markdown fences, no commentary). Shape:
{
  "providerGuess": "e.g. Stripe, GitHub, Shopify, or Unknown / custom",
  "providerConfidence": "high" | "medium" | "low",
  "eventType": "short identifier e.g. checkout.session.completed or pull_request.opened",
  "eventTypeDescription": "one sentence: what this event type means in product terms",
  "plainEnglishSummary": "2-4 sentences for a developer: what happened, notable IDs or amounts, suggested next steps",
  "suggestedHandler": {
    "language": "typescript" | "javascript" | "python",
    "code": "A concise handler sketch: verify signature if applicable, parse payload, switch on event type, idempotent processing. Use comments inside the code. No markdown.",
    "notes": "optional: verification, retries, or idempotency tips"
  },
  "keyFields": [ { "name": "field", "value": "short value" } ]
}

Rules:
- If unknown provider, lower confidence and say so in plainEnglishSummary.
- keyFields: at most 8 entries for the most important values (ids, types, amounts).
- suggestedHandler.code must be valid-looking source in the chosen language only.`;

export async function analyzeWebhookPayload(input: {
  method: string;
  contentType: string;
  body: string;
  headers: Record<string, string>;
  signatureProviderHint?: string;
}): Promise<AiPayloadAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const baseURL = process.env.OPENAI_BASE_URL?.trim();
  const client = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    max_completion_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Analyze this webhook request:\n${buildUserPayload(input)}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("Empty response from the model");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Model returned invalid JSON");
  }

  const core = aiPayloadAnalysisCoreSchema.parse(parsed);
  return {
    ...core,
    analyzedAt: Date.now(),
    model,
  };
}
