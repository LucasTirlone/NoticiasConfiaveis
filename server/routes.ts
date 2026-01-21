import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSourceSchema, insertUserPreferencesSchema } from "@shared/schema";
import { fetchAllRSS, fetchRSSFromSource } from "./services/rss-fetcher";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ===== NEWS ITEMS =====
  app.get("/api/news", async (req, res) => {
    try {
      const items = await storage.getAllNewsItems(50);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  app.get("/api/news/:id", async (req, res) => {
    try {
      const item = await storage.getNewsItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "News item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch news item" });
    }
  });

  // ===== SOURCES =====
  app.get("/api/sources", async (req, res) => {
    try {
      const sources = await storage.getAllSources();
      res.json(sources);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sources" });
    }
  });

  app.post("/api/sources", async (req, res) => {
    try {
      const validated = insertSourceSchema.parse(req.body);
      const source = await storage.createSource(validated);
      res.status(201).json(source);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create source" });
    }
  });

  app.delete("/api/sources/:id", async (req, res) => {
    try {
      await storage.deleteSource(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete source" });
    }
  });

  // ===== USER PREFERENCES =====
  app.get("/api/preferences/:id", async (req, res) => {
    try {
      const prefs = await storage.getUserPreferences(req.params.id);
      if (!prefs) {
        return res.status(404).json({ error: "Preferences not found" });
      }
      res.json(prefs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  app.post("/api/preferences", async (req, res) => {
    try {
      const validated = insertUserPreferencesSchema.parse(req.body);
      const prefs = await storage.createOrUpdateUserPreferences(validated);
      res.json(prefs);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to save preferences" });
    }
  });

  // ===== RSS REFRESH =====
  app.post("/api/refresh-feed", async (req, res) => {
    try {
      await fetchAllRSS();
      res.json({ success: true, message: "Feed refreshed successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to refresh feed" });
    }
  });

  app.post("/api/refresh-source/:id", async (req, res) => {
    try {
      await fetchRSSFromSource(req.params.id);
      res.json({ success: true, message: "Source refreshed successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to refresh source" });
    }
  });

  return httpServer;
}
