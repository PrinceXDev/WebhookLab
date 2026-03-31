import { createClient } from "redis";
import { logger } from "../utils/logger.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redisClient = createClient({
  url: REDIS_URL,
});

export const redisPubClient = createClient({
  url: REDIS_URL,
});

redisClient.on("error", (err) => 
  logger.error("Redis Client Error", { error: err })
);

redisPubClient.on("error", (err) =>
  logger.error("Redis Pub Client Error", { error: err })
);
