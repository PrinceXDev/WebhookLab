import { Router } from "express";
import { nanoid } from "nanoid";
import { publishWebhookEvent } from "../redis/pubsub.js";
import { getEndpointBySlug } from "../redis/endpoint-store.js";
import { logger } from "../utils/logger.js";
import { verifyWebhookSignature } from "../services/signature-verifier.js";
import { forwardWebhook } from "../services/webhook-forwarder.js";
import {
  storeWebhookEvent,
  replaceWebhookEvent,
  type StoredWebhookEvent,
  type TimelineStage,
} from "../redis/event-store.js";

export const webhookRouter = Router();

webhookRouter.use("/:slug", async (req, res) => {
  const { slug } = req.params;
  const startTime = Date.now();
  const timeline: TimelineStage[] = [];

  try {
    timeline.push({
      name: "received",
      status: "done",
      timestamp: startTime,
      durationMs: 0,
    });

    const rawBody = await getRawBody(req);

    const endpoint = await getEndpointBySlug(slug);

    const verifyStartTime = Date.now();
    timeline.push({
      name: "verified",
      status: "active",
      timestamp: verifyStartTime,
    });

    const signatureVerification = verifyWebhookSignature(
      req.headers as Record<string, string>,
      rawBody,
      endpoint?.webhookSecret || undefined,
    );

    const verifyEndTime = Date.now();
    const lastVerifyStage = timeline.at(-1);
    if (lastVerifyStage) {
      timeline[timeline.length - 1] = {
        ...lastVerifyStage,
        status: signatureVerification.isValid ? "done" : "error",
        durationMs: verifyEndTime - verifyStartTime,
        error: signatureVerification.isValid
          ? undefined
          : signatureVerification.message,
      };
    }

    const parseStartTime = Date.now();
    timeline.push({
      name: "parsed",
      status: "active",
      timestamp: parseStartTime,
    });

    try {
      if (
        rawBody &&
        req.headers["content-type"]?.includes("application/json")
      ) {
        JSON.parse(rawBody);
      }
      const parseEndTime = Date.now();
      const lastParseStage = timeline.at(-1);
      if (lastParseStage) {
        timeline[timeline.length - 1] = {
          ...lastParseStage,
          status: "done",
          durationMs: parseEndTime - parseStartTime,
        };
      }
    } catch (e) {
      const parseEndTime = Date.now();
      const parseError = e instanceof Error ? e.message : "Parse failed";
      const lastParseStage = timeline.at(-1);
      if (lastParseStage) {
        timeline[timeline.length - 1] = {
          ...lastParseStage,
          status: "error",
          durationMs: parseEndTime - parseStartTime,
          error: parseError,
        };
      }
    }

    const event: StoredWebhookEvent = {
      id: nanoid(),
      endpointSlug: slug,
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: rawBody,
      queryParams: req.query as Record<string, string>,
      sourceIp: req.ip || req.socket.remoteAddress || "unknown",
      contentType: req.headers["content-type"] || "unknown",
      timestamp: startTime,
      signatureVerification: {
        provider: signatureVerification.provider,
        isValid: signatureVerification.isValid,
        status: signatureVerification.status,
        algorithm: signatureVerification.algorithm,
        message: signatureVerification.message,
      },
      timeline,
      retryCount: 0,
    };

    await storeWebhookEvent(slug, event);
    await publishWebhookEvent(slug, event);

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

    if (endpoint?.forwardingUrl && endpoint.isActive) {
      const forwardStartTime = Date.now();
      timeline.push({
        name: "forwarded",
        status: "active",
        timestamp: forwardStartTime,
      });

      const forwardingResult = await forwardWebhook(
        endpoint.forwardingUrl,
        req.method,
        req.headers as Record<string, string>,
        rawBody,
      );

      const forwardEndTime = Date.now();
      const lastForwardStage = timeline.at(-1);
      if (lastForwardStage) {
        timeline[timeline.length - 1] = {
          ...lastForwardStage,
          status: forwardingResult.error ? "error" : "done",
          durationMs: forwardEndTime - forwardStartTime,
          error: forwardingResult.error,
        };
      }

      if (forwardingResult.statusCode) {
        const respondStartTime = Date.now();
        timeline.push({
          name: "responded",
          status: "done",
          timestamp: respondStartTime,
          durationMs: 0,
        });
      }

      const totalDurationMs = Date.now() - startTime;
      const updatedEvent: StoredWebhookEvent = {
        ...event,
        timeline,
        forwardingResult,
        totalDurationMs,
      };

      await replaceWebhookEvent(slug, event.id, updatedEvent);
      await publishWebhookEvent(slug, updatedEvent);

      logger.info("📥 Webhook processed with forwarding", {
        eventId: event.id,
        slug,
        totalDurationMs,
        forwardingStatus: forwardingResult.statusCode,
      });
    } else {
      const totalDurationMs = Date.now() - startTime;
      const updatedEvent: StoredWebhookEvent = {
        ...event,
        totalDurationMs,
      };
      await replaceWebhookEvent(slug, event.id, updatedEvent);
    }

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
