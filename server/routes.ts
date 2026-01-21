import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSourceSchema, insertUserPreferencesSchema } from "@shared/schema";
import { fetchAllRSS, fetchRSSFromSource } from "./services/rss-fetcher";
import { z } from "zod";

// Helper to enrich news items with full source objects
async function enrichNewsItems(items: any[]) {
  const allSources = await storage.getAllSources();
  const sourcesMap = new Map(allSources.map(s => [s.id, s]));
  
  return items.map(item => ({
    ...item,
    sources: item.sourceIds.map((id: string) => sourcesMap.get(id)).filter(Boolean)
  }));
}

// Track refresh progress for SSE
let refreshProgress = { current: 0, total: 0, status: "idle", message: "" };

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ===== NEWS ITEMS =====
  app.get("/api/news", async (req, res) => {
    try {
      const tags = req.query.tags ? String(req.query.tags).split(",") : null;
      
      let items;
      if (tags && tags.length > 0) {
        items = await storage.getNewsItemsByTags(tags, 50);
      } else {
        items = await storage.getAllNewsItems(50);
      }
      
      const enriched = await enrichNewsItems(items);
      res.json(enriched);
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
      const [enriched] = await enrichNewsItems([item]);
      res.json(enriched);
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
      
      // Se o URL do site for igual ao RSS (ou estiver vazio), tenta extrair o base URL
      if (!validated.url || validated.url === validated.rssUrl) {
        try {
          const url = new URL(validated.rssUrl);
          let hostname = url.hostname;
          // Tenta limpar subdomínios comuns de feeds
          hostname = hostname.replace(/^(feeds|feed|rss|newsfeeds)\./, "www.");
          validated.url = `${url.protocol}//${hostname}`;
        } catch (e) {
          // Mantém o original se falhar
        }
      }

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
  app.get("/api/refresh-progress", (req, res) => {
    res.json(refreshProgress);
  });

  app.post("/api/refresh-feed", async (req, res) => {
    try {
      const allSources = await storage.getAllSources();
      const sourcesWithRSS = allSources.filter(s => s.rssUrl);
      
      refreshProgress = { current: 0, total: sourcesWithRSS.length, status: "loading", message: "Iniciando..." };
      
      for (let i = 0; i < sourcesWithRSS.length; i++) {
        refreshProgress = { 
          current: i + 1, 
          total: sourcesWithRSS.length, 
          status: "loading", 
          message: `Buscando: ${sourcesWithRSS[i].name}` 
        };
        await fetchRSSFromSource(sourcesWithRSS[i].id);
      }
      
      refreshProgress = { current: sourcesWithRSS.length, total: sourcesWithRSS.length, status: "complete", message: "Concluído!" };
      res.json({ success: true, message: "Feed refreshed successfully" });
    } catch (error) {
      refreshProgress = { current: 0, total: 0, status: "error", message: "Erro ao atualizar" };
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
