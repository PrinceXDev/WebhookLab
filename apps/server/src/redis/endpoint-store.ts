import { redisClient } from './client.js';

export interface StoredEndpoint {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  forwardingUrl: string | null;
  secretKey: string;
  webhookSecret?: string | null; // For signature verification (Stripe/GitHub/Shopify secret)
  userId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function storeEndpoint(endpoint: StoredEndpoint): Promise<void> {
  const key = `endpoint:${endpoint.id}`;
  const slugKey = `endpoint:slug:${endpoint.slug}`;
  const userEndpointsKey = `user:${endpoint.userId}:endpoints`;
  
  await redisClient.set(key, JSON.stringify(endpoint));
  await redisClient.set(slugKey, endpoint.id);
  
  await redisClient.sAdd('endpoints:all', endpoint.id);
  await redisClient.sAdd(userEndpointsKey, endpoint.id);
}

export async function getEndpoints(userId?: string): Promise<StoredEndpoint[]> {
  let endpointIds: string[];
  
  if (userId) {
    const userEndpointsKey = `user:${userId}:endpoints`;
    endpointIds = await redisClient.sMembers(userEndpointsKey);
  } else {
    endpointIds = await redisClient.sMembers('endpoints:all');
  }
  
  if (endpointIds.length === 0) {
    return [];
  }
  
  const endpoints: StoredEndpoint[] = [];
  
  for (const id of endpointIds) {
    const key = `endpoint:${id}`;
    const data = await redisClient.get(key);
    if (data) {
      endpoints.push(JSON.parse(data));
    }
  }
  
  endpoints.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  return endpoints;
}

export async function getEndpointBySlug(slug: string): Promise<StoredEndpoint | null> {
  const slugKey = `endpoint:slug:${slug}`;
  const endpointId = await redisClient.get(slugKey);
  
  if (!endpointId) {
    return null;
  }
  
  const key = `endpoint:${endpointId}`;
  const data = await redisClient.get(key);
  
  return data ? JSON.parse(data) : null;
}

/** @returns false if no endpoint existed for id */
export async function deleteEndpoint(
  id: string,
  userId?: string,
): Promise<boolean> {
  const key = `endpoint:${id}`;
  const raw = await redisClient.get(key);

  if (!raw) {
    return false;
  }

  const parsed = JSON.parse(raw) as StoredEndpoint;

  if (userId && parsed.userId !== userId) {
    throw new Error(
      'Unauthorized: Cannot delete endpoint owned by another user',
    );
  }

  const slugKey = `endpoint:slug:${parsed.slug}`;
  const userEndpointsKey = `user:${parsed.userId}:endpoints`;

  await redisClient.del(slugKey);
  await redisClient.sRem(userEndpointsKey, id);
  await redisClient.del(key);
  await redisClient.sRem('endpoints:all', id);
  return true;
}
