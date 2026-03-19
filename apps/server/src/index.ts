import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { webhookRouter } from "./routes/webhook.js";
import { apiRouter } from "./routes/api.js";
import { initializeWebSocket } from "./websocket/index.js";
import { redisClient, redisPubClient } from "./redis/client.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
// update the port while everything is running smooth

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || origin.startsWith("http://localhost:")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  },
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin.startsWith("http://localhost:")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use("/api", express.json());
app.use("/hook", webhookRouter);
app.use("/api", apiRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

initializeWebSocket(io);

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await redisClient.connect();
    await redisPubClient.connect();
    console.log("✅ Redis connected");

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 WebSocket server ready`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing server...");
  await redisClient.quit();
  await redisPubClient.quit();
  httpServer.close();
  process.exit(0);
});

startServer();
