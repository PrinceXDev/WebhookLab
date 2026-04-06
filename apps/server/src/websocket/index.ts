import { Server } from "socket.io";
import { createClient } from "redis";
import { getWebhookChannel } from "../redis/pubsub.js";
import type { StoredWebhookEvent } from "../redis/event-store.js";
import { logger } from "../utils/logger.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

/** One Redis listener per channel; duplicate subscribe() calls would deliver the same message N times. */
const redisChannelsWithListener = new Set<string>();

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

      if (!redisChannelsWithListener.has(channel)) {
        redisChannelsWithListener.add(channel);
        try {
          await redisSubClient.subscribe(channel, (message) => {
            const event = JSON.parse(message) as StoredWebhookEvent;
            const roomName = `endpoint:${event.endpointSlug}`;
            io.to(roomName).emit("webhook-event", event);
            logger.debug("📨 Pushed event to room", {
              eventId: event.id,
              room: roomName,
            });
          });
        } catch (error) {
          redisChannelsWithListener.delete(channel);
          logger.error("Redis subscribe failed", { channel, error });
        }
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
