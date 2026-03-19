import { redisPubClient } from './client.js';
import type { StoredWebhookEvent } from './event-store.js';

export async function publishWebhookEvent(
  endpointSlug: string,
  event: StoredWebhookEvent
): Promise<void> {
  const channel = `webhook:${endpointSlug}`;
  await redisPubClient.publish(channel, JSON.stringify(event));
}

export function getWebhookChannel(endpointSlug: string): string {
  return `webhook:${endpointSlug}`;
}
