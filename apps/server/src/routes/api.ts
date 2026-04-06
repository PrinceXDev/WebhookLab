import { Router } from "express";
import { nanoid } from "nanoid";
import { ZodError } from "zod";
import {
  getRecentEvents,
  getEventById,
  replaceWebhookEvent,
  type StoredWebhookEvent,
} from "../redis/event-store.js";
import {
  storeEndpoint,
  getEndpoints,
  deleteEndpoint,
  getEndpointBySlug,
} from "../redis/endpoint-store.js";
import { authenticateJWT, AuthRequest } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";
import {
  analyzeWebhookPayload,
  isOpenAiConfigured,
} from "../services/payload-analyzer.js";

export const apiRouter = Router();

apiRouter.get("/endpoints", authenticateJWT, async (req: AuthRequest, res) => {
  const { userId } = req;
  try {
    logger.info("📋 Fetching endpoints for user", { userId });
    const endpoints = await getEndpoints(userId!);
    logger.info("📋 Found endpoints", { userId, count: endpoints.length });
    return res.json(endpoints);
  } catch (error) {
    logger.error("Error fetching endpoints", { error, userId });
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
    logger.info("✅ Endpoint created", {
      endpointId: endpoint.id,
      slug: endpoint.slug,
      userId,
      hasWebhookSecret: !!webhookSecret,
    });

    return res.json(endpoint);
  } catch (error) {
    logger.error("Error creating endpoint", { error, userId });
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
    const { webhookSecret, forwardingUrl, name, description, isActive } = body;

    try {
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
        webhookSecret:
          webhookSecret === undefined ? endpoint.webhookSecret : webhookSecret,
        forwardingUrl:
          forwardingUrl === undefined ? endpoint.forwardingUrl : forwardingUrl,
        name: name === undefined ? endpoint.name : name,
        description:
          description === undefined ? endpoint.description : description,
        isActive: isActive === undefined ? endpoint.isActive : isActive,
        updatedAt: new Date().toISOString(),
      };

      await storeEndpoint(updatedEndpoint);
      logger.info("✏️ Endpoint updated", {
        endpointId: id,
        userId,
        updatedFields: Object.keys(body),
      });

      return res.json(updatedEndpoint);
    } catch (error) {
      logger.error("Error updating endpoint", {
        error,
        endpointId: id,
        userId,
      });
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
      await deleteEndpoint(id, userId!);
      logger.info("🗑️ Endpoint deleted", { endpointId: id, userId });

      return res.json({ success: true });
    } catch (error) {
      logger.error("Error deleting endpoint", {
        error,
        endpointId: id,
        userId,
      });
      return res.status(500).json({ error: "Failed to delete endpoint" });
    }
  },
);
