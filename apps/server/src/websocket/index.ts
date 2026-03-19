import { Server } from "socket.io";
import { createClient } from "redis";
import { getWebhookChannel } from "../redis/pubsub.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export function initializeWebSocket(io: Server) {
  const redisSubClient = createClient({ url: REDIS_URL });

  redisSubClient.on("error", (err) =>
    console.error("Redis Sub Client Error:", err),
  );

  redisSubClient.connect().then(() => {
    console.log("✅ Redis subscriber connected");
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on("subscribe", async (endpointSlug: string) => {
      console.log(
        `📡 Client ${socket.id} subscribing to endpoint: ${endpointSlug}`,
      );

      const room = `endpoint:${endpointSlug}`;
      socket.join(room);

      const channel = getWebhookChannel(endpointSlug);

      const existingListeners = await redisSubClient.sendCommand([
        "PUBSUB",
        "NUMSUB",
        channel,
      ]);

      if (!existingListeners || (existingListeners as any[])[1] === 0) {
        await redisSubClient.subscribe(channel, (message) => {
          const event = JSON.parse(message);
          io.to(room).emit("webhook-event", event);
          console.log(`📨 Pushed event ${event.id} to room ${room}`);
        });
      }

      socket.emit("subscribed", { endpointSlug });
    });

    socket.on("unsubscribe", (endpointSlug: string) => {
      const room = `endpoint:${endpointSlug}`;
      socket.leave(room);
      console.log(`📴 Client ${socket.id} unsubscribed from ${endpointSlug}`);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
}
