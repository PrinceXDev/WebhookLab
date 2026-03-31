import { Router } from "express";
import { getRecentEvents, getEventById } from "../redis/event-store.js";
import {
  storeEndpoint,
  getEndpoints,
  deleteEndpoint,
} from "../redis/endpoint-store.js";
import { authenticateJWT, AuthRequest } from "../middleware/auth.js";
import { logger } from "../utils/logger.js";

// Unique string ID generator for JavaScript.
import { nanoid } from "nanoid";

export const apiRouter = Router();

apiRouter.get("/endpoints", authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    logger.info("📋 Fetching endpoints for user", { userId });
    const endpoints = await getEndpoints(userId);
    logger.info("📋 Found endpoints", { userId, count: endpoints.length });
    res.json(endpoints);
  } catch (error) {
    logger.error("Error fetching endpoints", { error, userId: req.userId });
    res.status(500).json({ error: "Failed to fetch endpoints" });
  }
});

apiRouter.post("/endpoints", authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const { name, description, forwardingUrl } = req.body;
    const userId = req.userId!;

    const endpoint = {
      id: nanoid(), // ex:- aB3kLm9PqR
      slug: nanoid(10),
      name,
      description: description || null,
      forwardingUrl: forwardingUrl || null,
      secretKey: nanoid(32), // ex:- V1StGXR8_Z5jdHi6B-myT3kLm9PqR2x
      userId,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await storeEndpoint(endpoint);
    logger.info("✅ Endpoint created", { 
      endpointId: endpoint.id, 
      slug: endpoint.slug, 
      userId 
    });

    res.json(endpoint);
  } catch (error) {
    logger.error("Error creating endpoint", { error, userId: req.userId });
    res.status(500).json({ error: "Failed to create endpoint" });
  }
});

apiRouter.get("/endpoints/:slug/events", async (req, res) => {
  try {
    const { slug } = req.params;
    const limitParam = Array.isArray(req.query.limit) 
      ? req.query.limit[0] 
      : req.query.limit;
    const limit = Number.parseInt(limitParam || "50", 10);

    const events = await getRecentEvents(slug, limit);
    logger.debug("Fetched events for endpoint", { slug, count: events.length, limit });
    res.json(events);
  } catch (error) {
    logger.error("Error fetching events", { error, slug: req.params.slug });
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

apiRouter.get("/endpoints/:slug/events/:eventId", async (req, res) => {
  try {
    const { slug, eventId } = req.params;

    const event = await getEventById(slug, eventId);

    if (!event) {
      logger.warn("Event not found", { slug, eventId });
      return res.status(404).json({ error: "Event not found" });
    }

    res.json(event);
  } catch (error) {
    logger.error("Error fetching event", { 
      error, 
      slug: req.params.slug, 
      eventId: req.params.eventId 
    });
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

apiRouter.delete("/endpoints/:id", authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    await deleteEndpoint(id, userId);
    logger.info("🗑️ Endpoint deleted", { endpointId: id, userId });

    res.json({ success: true });
  } catch (error) {
    logger.error("Error deleting endpoint", { 
      error, 
      endpointId: req.params.id, 
      userId: req.userId 
    });
    res.status(500).json({ error: "Failed to delete endpoint" });
  }
});
