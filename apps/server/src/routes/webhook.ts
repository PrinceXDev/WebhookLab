import { Router } from "express";
import { nanoid } from "nanoid";
import { storeWebhookEvent } from "../redis/event-store.js";
import { publishWebhookEvent } from "../redis/pubsub.js";
import { getEndpointBySlug } from "../redis/endpoint-store.js";
import { logger } from "../utils/logger.js";
import { verifyWebhookSignature } from "../services/signature-verifier.js";
import type { StoredWebhookEvent } from "../redis/event-store.js";

export const webhookRouter = Router();

webhookRouter.use("/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    const rawBody = await getRawBody(req);

    // Get endpoint configuration (for webhook secret)
    const endpoint = await getEndpointBySlug(slug);

    // Verify signature
    const signatureVerification = verifyWebhookSignature(
      req.headers as Record<string, string>,
      rawBody,
      endpoint?.webhookSecret || undefined,
    );

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
      signatureVerification: {
        provider: signatureVerification.provider,
        isValid: signatureVerification.isValid,
        status: signatureVerification.status,
        algorithm: signatureVerification.algorithm,
        message: signatureVerification.message,
      },
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
      provider: signatureVerification.provider,
      signatureStatus: signatureVerification.status,
      signatureValid: signatureVerification.isValid,
    });

    res.status(200).json({
      success: true,
      message: "Webhook received",
      eventId: event.id,
      timestamp: event.timestamp,
      signatureVerification: {
        provider: signatureVerification.provider,
        status: signatureVerification.status,
        isValid: signatureVerification.isValid,
      },
    });
  } catch (error) {
    logger.error("Error processing webhook", {
      error,
      slug,
      method: req.method,
    });
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
