import { createClient } from "redis";
import { logger } from "../utils/logger.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// node-redis only accepts redis:// or rediss:// URLs. A common mistake is using
// an Upstash REST URL (https://...), which fails deep inside the client with an
// opaque "Invalid protocol" error. Fail fast with an actionable message instead.
if (!/^rediss?:\/\//.test(REDIS_URL)) {
  throw new Error(
    `Invalid REDIS_URL protocol: "${REDIS_URL.split("://")[0]}://". ` +
      `Expected redis:// or rediss://. If using Upstash, use the TLS URL ` +
      `(rediss://default:<password>@<host>:6379), not the https:// REST URL.`
  );
}

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
