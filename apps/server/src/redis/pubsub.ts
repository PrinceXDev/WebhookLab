import { redisPubClient } from './client.js';
import { logger } from '../utils/logger.js';
import type { StoredWebhookEvent } from './event-store.js';

export async function publishWebhookEvent(
  endpointSlug: string,
  event: StoredWebhookEvent
): Promise<void> {
  const channel = `webhook:${endpointSlug}`;
  await redisPubClient.publish(channel, JSON.stringify(event));
  logger.debug("📢 Published webhook event", { 
    channel, 
    eventId: event.id, 
    endpointSlug 
  });
}

export function getWebhookChannel(endpointSlug: string): string {
  return `webhook:${endpointSlug}`;
}
