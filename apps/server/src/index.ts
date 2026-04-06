import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import morgan from "morgan";
import { webhookRouter } from "./routes/webhook.js";
import { apiRouter } from "./routes/api.js";
import { initializeWebSocket } from "./websocket/index.js";
import { redisClient, redisPubClient } from "./redis/client.js";
import { logger, morganStream } from "./utils/logger.js";

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

// Morgan HTTP request logging
app.use(
  morgan(
    ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms',
    { stream: morganStream },
  ),
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
    logger.info("✅ Redis connected");

    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`🔌 WebSocket server ready`);
    });
  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, closing server...");
  await redisClient.quit();
  await redisPubClient.quit();
  httpServer.close();
  process.exit(0);
});

startServer();
