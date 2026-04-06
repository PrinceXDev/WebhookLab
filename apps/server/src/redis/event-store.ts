import type { AiPayloadAnalysis } from "@webhooklab/shared";
import { redisClient } from "./client.js";

const MAX_EVENTS_PER_ENDPOINT = 500;
const EVENT_TTL_SECONDS = 72 * 60 * 60; // 72 hours

export interface StoredWebhookEvent {
  id: string;
  endpointSlug: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  queryParams: Record<string, string>;
  sourceIp: string;
  contentType: string;
  timestamp: number;
  signatureVerification?: {
    provider: string;
    isValid: boolean;
    status: string;
    algorithm?: string;
    message?: string;
  };
  aiAnalysis?: AiPayloadAnalysis;
}

export async function storeWebhookEvent(
  endpointSlug: string,
  event: StoredWebhookEvent,
): Promise<void> {
  const key = `webhook:${endpointSlug}:events`;
  const timestamp = Date.now();

  await redisClient.zAdd(key, {
    score: timestamp,
    value: JSON.stringify(event),
  });

  await redisClient.zRemRangeByRank(key, 0, -(MAX_EVENTS_PER_ENDPOINT + 1));

  await redisClient.expire(key, EVENT_TTL_SECONDS);
}

export async function getRecentEvents(
  endpointSlug: string,
  limit: number = 50,
): Promise<StoredWebhookEvent[]> {
  const key = `webhook:${endpointSlug}:events`;

  const events = await redisClient.zRange(key, -limit, -1, { REV: true });

  return events.map((event) => JSON.parse(event));
}

export async function getEventById(
  endpointSlug: string,
  eventId: string,
): Promise<StoredWebhookEvent | null> {
  const key = `webhook:${endpointSlug}:events`;
  const events = await redisClient.zRange(key, 0, -1);

  const event = events.find((e) => {
    const parsed = JSON.parse(e);
    return parsed.id === eventId;
  });

  return event ? JSON.parse(event) : null;
}

export async function getEventCount(endpointSlug: string): Promise<number> {
  const key = `webhook:${endpointSlug}:events`;
  return await redisClient.zCard(key);
}

/** Replace a stored event member (same id + timestamp) after e.g. attaching AI analysis. */
export async function replaceWebhookEvent(
  endpointSlug: string,
  eventId: string,
  updated: StoredWebhookEvent,
): Promise<boolean> {
  const key = `webhook:${endpointSlug}:events`;
  const members = await redisClient.zRange(key, 0, -1);

  for (const member of members) {
    const parsed = JSON.parse(member) as StoredWebhookEvent;
    if (parsed.id === eventId) {
      await redisClient.zRem(key, member);
      await redisClient.zAdd(key, {
        score: parsed.timestamp,
        value: JSON.stringify(updated),
      });
      return true;
    }
  }

  return false;
}
