import { Router } from "express";
import { nanoid } from "nanoid";
import { ZodError } from "zod";
import { updateEndpointSchema } from "@webhooklab/shared";
import {
  getRecentEvents,
  getEventById,
  replaceWebhookEvent,
  storeWebhookEvent,
  type StoredWebhookEvent,
} from "../redis/event-store.js";
import {
  storeEndpoint,
  getEndpoints,
  deleteEndpoint,
  getEndpointBySlug,
} from "../redis/endpoint-store.js";
import { publishWebhookEvent } from "../redis/pubsub.js";
import { authenticateJWT, AuthRequest } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";
import {
  analyzeWebhookPayload,
  isOpenAiConfigured,
} from "../services/payload-analyzer.js";

function valueIfPatched<T>(patched: T | undefined, current: T): T {
  if (patched === undefined) {
    return current;
  }
  return patched;
}

export const apiRouter = Router();

apiRouter.get("/endpoints", authenticateJWT, async (req: AuthRequest, res) => {
  const { userId } = req;
  try {
    const endpoints = await getEndpoints(userId!);
    return res.json(endpoints);
  } catch {
    return res.status(500).json({ error: "Failed to fetch endpoints" });
  }
});

apiRouter.post("/endpoints", authenticateJWT, async (req: AuthRequest, res) => {
  const { body, userId } = req;
  const { name, description, forwardingUrl, webhookSecret } = body;

  try {
    const endpoint = {
      id: nanoid(), // ex:- aB3kLm9PqR
      slug: nanoid(10),
      name,
      description: description || null,
      forwardingUrl: forwardingUrl || null,
      webhookSecret: webhookSecret || null, // For signature verification
      secretKey: nanoid(32), // ex:- V1StGXR8_Z5jdHi6B-myT3kLm9PqR2x
      userId: userId!,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await storeEndpoint(endpoint);
    return res.json(endpoint);
  } catch {
    return res.status(500).json({ error: "Failed to create endpoint" });
  }
});

apiRouter.get("/endpoints/:slug/events", async (req, res) => {
  const { slug: slugParam } = req.params;
  const slug = String(slugParam);
  const { limit: limitQuery } = req.query;
  const limitParam = Array.isArray(limitQuery) ? limitQuery[0] : limitQuery;

  try {
    const limit = Number.parseInt(String(limitParam ?? "50"), 10);

    const events = await getRecentEvents(slug, limit);
    logger.debug("Fetched events for endpoint", {
      slug,
      count: events.length,
      limit,
    });
    return res.json(events);
  } catch (error) {
    logger.error("Error fetching events", { error, slug });
    return res.status(500).json({ error: "Failed to fetch events" });
  }
});

apiRouter.get("/endpoints/:slug/events/:eventId", async (req, res) => {
  const { slug: slugParam, eventId: eventIdParam } = req.params;
  const slug = String(slugParam);
  const eventId = String(eventIdParam);

  try {
    const event = await getEventById(slug, eventId);

    if (!event) {
      logger.warn("Event not found", { slug, eventId });
      return res.status(404).json({ error: "Event not found" });
    }

    return res.json(event);
  } catch (error) {
    logger.error("Error fetching event", {
      error,
      slug,
      eventId,
    });
    return res.status(500).json({ error: "Failed to fetch event" });
  }
});

apiRouter.post(
  "/endpoints/:slug/events/:eventId/analyze",
  authenticateJWT,
  async (req: AuthRequest, res) => {
    const { slug: slugParam, eventId: eventIdParam } = req.params;
    const slug = String(slugParam);
    const eventId = String(eventIdParam);
    const { userId, body = {} } = req;
    const { regenerate } = body as { regenerate?: boolean };

    try {
      if (!isOpenAiConfigured()) {
        return res.status(503).json({
          error:
            "AI analysis is not configured. Set OPENAI_API_KEY on the API server.",
        });
      }

      const endpoint = await getEndpointBySlug(slug);
      if (endpoint?.userId !== userId) {
        return res.status(404).json({ error: "Endpoint not found" });
      }

      const event = await getEventById(slug, eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (event.aiAnalysis && !regenerate) {
        return res.json(event);
      }

      const {
        method,
        contentType,
        body: rawBody,
        headers,
        signatureVerification,
      } = event;

      const analysis = await analyzeWebhookPayload({
        method,
        contentType,
        body: rawBody,
        headers,
        signatureProviderHint: signatureVerification?.provider,
      });

      const updated: StoredWebhookEvent = { ...event, aiAnalysis: analysis };
      const persisted = await replaceWebhookEvent(slug, eventId, updated);
      if (!persisted) {
        return res.status(500).json({ error: "Failed to persist analysis" });
      }

      logger.info("AI payload analysis stored", { slug, eventId, userId });
      return res.json(updated);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("AI output failed schema validation", {
          issues: error.issues,
          slug,
          eventId,
        });
        return res.status(502).json({
          error:
            "The model returned data we could not parse. Try Regenerate or a different payload.",
        });
      }
      logger.error("AI payload analysis failed", {
        error,
        slug,
        eventId,
      });
      const message =
        error instanceof Error ? error.message : "Analysis failed";
      return res.status(500).json({ error: message });
    }
  },
);

apiRouter.patch(
  "/endpoints/:id",
  authenticateJWT,
  async (req: AuthRequest, res) => {
    const { params, body, userId } = req;
    const { id: idParam } = params;
    const id = String(idParam);

    try {
      const parsedBody = updateEndpointSchema.safeParse(body);
      if (!parsedBody.success) {
        const flat = parsedBody.error.flatten().fieldErrors;
        return res.status(400).json({
          error: "Invalid request",
          details: flat,
        });
      }

      const patch = parsedBody.data;
      const endpoints = await getEndpoints(userId!);
      const endpoint = endpoints.find((e) => e.id === id);

      if (!endpoint) {
        return res.status(404).json({ error: "Endpoint not found" });
      }

      if (endpoint.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const updatedEndpoint = {
        ...endpoint,
        name: valueIfPatched(patch.name, endpoint.name),
        description: valueIfPatched(patch.description, endpoint.description),
        forwardingUrl: valueIfPatched(
          patch.forwardingUrl,
          endpoint.forwardingUrl,
        ),
        webhookSecret: valueIfPatched(
          patch.webhookSecret,
          endpoint.webhookSecret,
        ),
        isActive: valueIfPatched(patch.isActive, endpoint.isActive),
        updatedAt: new Date().toISOString(),
      };

      await storeEndpoint(updatedEndpoint);

      return res.json(updatedEndpoint);
    } catch {
      return res.status(500).json({ error: "Failed to update endpoint" });
    }
  },
);

apiRouter.delete(
  "/endpoints/:id",
  authenticateJWT,
  async (req: AuthRequest, res) => {
    const { params, userId } = req;
    const { id: idParam } = params;
    const id = String(idParam);

    try {
      const deleted = await deleteEndpoint(id, userId!);
      if (!deleted) {
        return res.status(404).json({ error: "Endpoint not found" });
      }

      return res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("Unauthorized")) {
        return res.status(403).json({ error: "Forbidden" });
      }
      return res.status(500).json({ error: "Failed to delete endpoint" });
    }
  },
);

apiRouter.post(
  "/endpoints/:slug/events/:eventId/replay",
  authenticateJWT,
  async (req: AuthRequest, res) => {
    const { slug: slugParam, eventId: eventIdParam } = req.params;
    const slug = String(slugParam);
    const eventId = String(eventIdParam);
    const { userId } = req;

    try {
      const endpoint = await getEndpointBySlug(slug);
      if (!endpoint) {
        return res.status(404).json({ error: "Endpoint not found" });
      }

      if (endpoint.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const originalEvent = await getEventById(slug, eventId);
      if (!originalEvent) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (!endpoint.forwardingUrl) {
        return res.status(400).json({
          error: "No forwarding URL configured for this endpoint",
        });
      }

      const { forwardWebhook } =
        await import("../services/webhook-forwarder.js");

      const startTime = Date.now();
      const forwardingResult = await forwardWebhook(
        endpoint.forwardingUrl,
        originalEvent.method,
        originalEvent.headers,
        originalEvent.body,
      );

      const totalDurationMs = Date.now() - startTime;

      const replayEvent: StoredWebhookEvent = {
        ...originalEvent,
        id: nanoid(),
        timestamp: startTime,
        retryCount: (originalEvent.retryCount || 0) + 1,
        forwardingResult,
        totalDurationMs,
        timeline: [
          {
            name: "received",
            status: "done",
            timestamp: startTime,
            durationMs: 0,
          },
          {
            name: "verified",
            status: originalEvent.signatureVerification?.isValid
              ? "done"
              : "error",
            timestamp: startTime + 1,
            durationMs: 0,
          },
          {
            name: "parsed",
            status: "done",
            timestamp: startTime + 2,
            durationMs: 0,
          },
          {
            name: "forwarded",
            status: forwardingResult.error ? "error" : "done",
            timestamp: forwardingResult.attemptedAt,
            durationMs: forwardingResult.latencyMs,
            error: forwardingResult.error,
          },
          ...(forwardingResult.statusCode
            ? [
                {
                  name: "responded" as const,
                  status: "done" as const,
                  timestamp: Date.now(),
                  durationMs: 0,
                },
              ]
            : []),
        ],
      };

      await storeWebhookEvent(slug, replayEvent);
      await publishWebhookEvent(slug, replayEvent);

      logger.info("Event replayed successfully", {
        originalEventId: eventId,
        replayEventId: replayEvent.id,
        slug,
        userId,
      });

      return res.json({
        success: true,
        replayEvent,
        originalEventId: eventId,
      });
    } catch (error) {
      logger.error("Error replaying event", {
        error,
        slug,
        eventId,
      });
      return res.status(500).json({ error: "Failed to replay event" });
    }
  },
);

apiRouter.get("/endpoints/:slug/stats", async (req, res) => {
  const { slug: slugParam } = req.params;
  const slug = String(slugParam);

  try {
    const events = await getRecentEvents(slug, 500);

    const latencies = events
      .filter((e) => e.totalDurationMs !== undefined)
      .map((e) => e.totalDurationMs as number);

    if (latencies.length === 0) {
      return res.json({
        count: 0,
        p50: null,
        p95: null,
        p99: null,
        min: null,
        max: null,
        avg: null,
      });
    }

    const sorted = [...latencies].sort((a, b) => a - b);
    const count = sorted.length;

    const percentile = (p: number) => {
      const index = Math.ceil((p / 100) * count) - 1;
      const value = sorted[Math.max(0, index)];
      return value !== undefined ? value : 0;
    };

    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const avg = sum / count;

    const stageStats = new Map<
      string,
      { durations: number[]; count: number }
    >();

    for (const event of events) {
      if (event.timeline) {
        for (const stage of event.timeline) {
          if (stage.durationMs !== undefined && stage.durationMs > 0) {
            if (!stageStats.has(stage.name)) {
              stageStats.set(stage.name, { durations: [], count: 0 });
            }
            const stats = stageStats.get(stage.name)!;
            stats.durations.push(stage.durationMs);
            stats.count++;
          }
        }
      }
    }

    const stageLatencies: Record<
      string,
      { p50: number; p95: number; p99: number; avg: number; count: number }
    > = {};

    for (const [stageName, stats] of stageStats.entries()) {
      const sortedDurations = [...stats.durations].sort((a, b) => a - b);
      const stageCount = sortedDurations.length;

      if (stageCount > 0) {
        const stagePercentile = (p: number) => {
          const index = Math.ceil((p / 100) * stageCount) - 1;
          const value = sortedDurations[Math.max(0, index)];
          return value !== undefined ? value : 0;
        };

        const stageSum = sortedDurations.reduce((acc, val) => acc + val, 0);
        const stageAvg = stageSum / stageCount;

        stageLatencies[stageName] = {
          p50: stagePercentile(50),
          p95: stagePercentile(95),
          p99: stagePercentile(99),
          avg: Math.round(stageAvg * 100) / 100,
          count: stageCount,
        };
      }
    }

    const successCount = events.filter((e) => {
      if (!e.timeline) {
        return false;
      }
      return !e.timeline.some((stage) => stage.status === "error");
    }).length;

    const errorCount = events.filter((e) => {
      if (!e.timeline) {
        return false;
      }
      return e.timeline.some((stage) => stage.status === "error");
    }).length;

    return res.json({
      count,
      p50: percentile(50),
      p95: percentile(95),
      p99: percentile(99),
      min: sorted[0],
      max: sorted[count - 1],
      avg: Math.round(avg * 100) / 100,
      stageLatencies,
      successRate:
        events.length > 0
          ? Math.round((successCount / events.length) * 10000) / 100
          : 0,
      successCount,
      errorCount,
    });
  } catch (error) {
    logger.error("Error calculating stats", { error, slug });
    return res.status(500).json({ error: "Failed to calculate statistics" });
  }
});
