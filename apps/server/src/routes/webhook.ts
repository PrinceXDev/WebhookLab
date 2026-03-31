import { Router } from "express";
import { nanoid } from "nanoid";
import { storeWebhookEvent } from "../redis/event-store.js";
import { publishWebhookEvent } from "../redis/pubsub.js";
import { logger } from "../utils/logger.js";
import type { StoredWebhookEvent } from "../redis/event-store.js";

export const webhookRouter = Router();

webhookRouter.use("/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    const rawBody = await getRawBody(req);

    const event: StoredWebhookEvent = {
      id: nanoid(),
      endpointSlug: slug,
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: rawBody,
      queryParams: req.query as Record<string, string>,
      sourceIp: req.ip || req.socket.remoteAddress || "unknown",
      contentType: req.headers["content-type"] || "unknown",
      timestamp: Date.now(),
    };

    await storeWebhookEvent(slug, event);
    await publishWebhookEvent(slug, event);

    logger.info("📥 Webhook received", {
      eventId: event.id,
      slug,
      method: req.method,
      contentType: event.contentType,
      sourceIp: event.sourceIp,
      bodySize: rawBody.length,
    });

    res.status(200).json({
      success: true,
      message: "Webhook received",
      eventId: event.id,
      timestamp: event.timestamp,
    });
  } catch (error) {
    logger.error("Error processing webhook", { error, slug, method: req.method });
    res.status(500).json({
      success: false,
      message: "Failed to process webhook",
    });
  }
});

async function getRawBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on("end", () => {
      resolve(data);
    });
    req.on("error", reject);
  });
}
