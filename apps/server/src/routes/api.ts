import { Router } from "express";
import { getRecentEvents, getEventById } from "../redis/event-store.js";
import {
  storeEndpoint,
  getEndpoints,
  deleteEndpoint,
} from "../redis/endpoint-store.js";

// Unique string ID generator for JavaScript.
import { nanoid } from "nanoid";

export const apiRouter = Router();

apiRouter.get("/endpoints", async (_req, res) => {
  try {
    const endpoints = await getEndpoints();
    res.json(endpoints);
  } catch (error) {
    console.error("Error fetching endpoints:", error);
    res.status(500).json({ error: "Failed to fetch endpoints" });
  }
});

apiRouter.post("/endpoints", async (req, res) => {
  try {
    const { name, description, forwardingUrl } = req.body;

    const endpoint = {
      id: nanoid(), // ex:- aB3kLm9PqR
      slug: nanoid(10),
      name,
      description: description || null,
      forwardingUrl: forwardingUrl || null,
      secretKey: nanoid(32), // ex:- V1StGXR8_Z5jdHi6B-myT3kLm9PqR2x
      userId: "demo-user",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await storeEndpoint(endpoint);

    res.json(endpoint);
  } catch (error) {
    console.error("Error creating endpoint:", error);
    res.status(500).json({ error: "Failed to create endpoint" });
  }
});

apiRouter.get("/endpoints/:slug/events", async (req, res) => {
  try {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const events = await getRecentEvents(slug, limit);
    res.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

apiRouter.get("/endpoints/:slug/events/:eventId", async (req, res) => {
  try {
    const { slug, eventId } = req.params;

    const event = await getEventById(slug, eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

apiRouter.delete("/endpoints/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await deleteEndpoint(id);

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting endpoint:", error);
    res.status(500).json({ error: "Failed to delete endpoint" });
  }
});
