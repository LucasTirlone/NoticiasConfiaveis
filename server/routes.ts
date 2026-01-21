import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSourceSchema, insertUserPreferencesSchema } from "@shared/schema";
import { fetchAllRSS, fetchRSSFromSource } from "./services/rss-fetcher";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

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
let refreshProgress = { current: 0, total: 0, status: "idle", message: "", newsCount: 0 };

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
          const urlStr = validated.rssUrl || "";
          const url = new URL(urlStr);
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
      
      let totalNewsCount = 0;
      refreshProgress = { current: 0, total: sourcesWithRSS.length, status: "loading", message: "Iniciando...", newsCount: 0 };
      
      for (let i = 0; i < sourcesWithRSS.length; i++) {
        refreshProgress = { 
          current: i + 1, 
          total: sourcesWithRSS.length, 
          status: "loading", 
          message: `Buscando: ${sourcesWithRSS[i].name}`,
          newsCount: totalNewsCount
        };
        
        await fetchRSSFromSource(sourcesWithRSS[i].id, (stats) => {
          totalNewsCount += stats.count;
          refreshProgress.newsCount = totalNewsCount;
        });
      }
      
      refreshProgress = { 
        current: sourcesWithRSS.length, 
        total: sourcesWithRSS.length, 
        status: "complete", 
        message: `Concluído! ${totalNewsCount} novas notícias.`,
        newsCount: totalNewsCount
      };
      res.json({ success: true, message: "Feed refreshed successfully", newsCount: totalNewsCount });
    } catch (error) {
      refreshProgress = { current: 0, total: 0, status: "error", message: "Erro ao atualizar", newsCount: 0 };
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

  // ===== AI SUMMARIZATION =====
  app.post("/api/summarize", async (req, res) => {
    try {
      const { title, content, summary } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
        httpOptions: {
          apiVersion: "",
          baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
        },
      });

      const prompt = `Você é um jornalista brasileiro especializado em traduzir notícias complexas para linguagem simples e acessível.

Título da notícia: ${title}

Conteúdo original: ${content}

${summary ? `Resumo atual: ${summary}` : ""}

Por favor, crie um resumo muito claro e simples desta notícia em português brasileiro. O resumo deve:
- Ser fácil de entender por qualquer pessoa
- Explicar o que aconteceu de forma objetiva
- Ter no máximo 3 parágrafos curtos
- Evitar jargões técnicos
- Responder: O que? Onde? Quando? Por quê é importante?

Responda apenas com o resumo, sem introduções ou explicações adicionais.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const aiSummary = response.text || content;
      
      res.json({ summary: aiSummary });
    } catch (error) {
      console.error("Error generating AI summary:", error);
      res.status(500).json({ error: "Failed to generate summary", summary: req.body.content });
    }
  });

  return httpServer;
}
