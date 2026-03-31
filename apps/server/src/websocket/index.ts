import { Server } from "socket.io";
import { createClient } from "redis";
import { getWebhookChannel } from "../redis/pubsub.js";
import { logger } from "../utils/logger.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export function initializeWebSocket(io: Server) {
  const redisSubClient = createClient({ url: REDIS_URL });

  redisSubClient.on("error", (err) =>
    logger.error("Redis Sub Client Error", { error: err }),
  );

  redisSubClient.connect().then(() => {
    logger.info("✅ Redis subscriber connected");
  });

  io.on("connection", (socket) => {
    logger.info("🔌 Client connected", { socketId: socket.id });

    socket.on("subscribe", async (endpointSlug: string) => {
      logger.info("📡 Client subscribing to endpoint", { 
        socketId: socket.id, 
        endpointSlug 
      });

      const room = `endpoint:${endpointSlug}`;
      socket.join(room);

      const channel = getWebhookChannel(endpointSlug);

      // Subscribe to the Redis channel (Redis will handle duplicate subscriptions automatically)
      try {
        await redisSubClient.subscribe(channel, (message) => {
          const event = JSON.parse(message);
          io.to(room).emit("webhook-event", event);
          logger.debug("📨 Pushed event to room", { 
            eventId: event.id, 
            room, 
            endpointSlug 
          });
        });
      } catch {
        logger.debug("Already subscribed to channel", { channel });
      }

      socket.emit("subscribed", { endpointSlug });
    });

    socket.on("unsubscribe", (endpointSlug: string) => {
      const room = `endpoint:${endpointSlug}`;
      socket.leave(room);
      logger.info("📴 Client unsubscribed", { 
        socketId: socket.id, 
        endpointSlug 
      });
    });

    socket.on("disconnect", () => {
      logger.info("🔌 Client disconnected", { socketId: socket.id });
    });
  });
}
