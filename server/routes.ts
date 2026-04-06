import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSourceSchema, insertUserPreferencesSchema, loginUserSchema, registerUserSchema } from "@shared/schema";
import { fetchAllRSS, fetchRSSFromSource } from "./services/rss-fetcher";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function verifyPassword(supplied: string, stored: string): Promise<boolean> {
  try {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch {
    return false;
  }
}

const ADMIN_EMAIL = "lucastirlone@gmail.com";

function requireAuth(req: Request, res: Response, next: () => void) {
  if (!req.session?.userId) {
    res.status(401).json({ message: "Não autenticado" });
    return;
  }
  next();
}

async function requireAdmin(req: Request, res: Response, next: () => void) {
  if (!req.session?.userId) {
    res.status(401).json({ message: "Não autenticado" });
    return;
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || user.email !== ADMIN_EMAIL) {
    res.status(403).json({ message: "Acesso restrito ao administrador" });
    return;
  }
  next();
}

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
  
  // ===== AUTH =====
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerUserSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: parsed.error.issues[0].message });
        return;
      }
      const { email, displayName, password } = parsed.data;

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        res.status(409).json({ message: "Este e-mail já está cadastrado." });
        return;
      }

      const passwordHash = await hashPassword(password);
      const user = await storage.createAuthUser({ email, displayName, passwordHash });

      req.session.userId = user.id;
      res.status(201).json({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Erro ao criar conta." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginUserSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: parsed.error.issues[0].message });
        return;
      }
      const { email, password } = parsed.data;

      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        res.status(401).json({ message: "E-mail ou senha incorretos." });
        return;
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ message: "E-mail ou senha incorretos." });
        return;
      }

      req.session.userId = user.id;
      res.json({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erro ao fazer login." });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ message: "Logout realizado com sucesso." });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId) {
      res.status(401).json({ message: "Não autenticado" });
      return;
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      res.status(401).json({ message: "Sessão inválida" });
      return;
    }
    res.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    });
  });

  // ===== NEWS ITEMS =====
  app.get("/api/news", async (req, res) => {
    try {
      const tags = req.query.tags ? String(req.query.tags).split(",") : null;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 200;
      const safeLimit = Math.min(Math.max(limit, 1), 500); // Entre 1 e 500
      
      let items;
      if (tags && tags.length > 0) {
        items = await storage.getNewsItemsByTags(tags, safeLimit);
      } else {
        items = await storage.getAllNewsItems(safeLimit);
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
  app.get("/api/sources", requireAdmin, async (req, res) => {
    try {
      const sources = await storage.getAllSources();
      res.json(sources);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sources" });
    }
  });

  app.post("/api/sources", requireAdmin, async (req, res) => {
    try {
      const validated = insertSourceSchema.parse(req.body);
      
      // Verificar se já existe uma fonte com o mesmo RSS URL
      if (validated.rssUrl) {
        const existingSource = await storage.findSourceByRssUrl(validated.rssUrl);
        if (existingSource) {
          return res.status(400).json({ 
            error: `Já existe uma fonte com este RSS: "${existingSource.name}". Cada fonte deve ter um RSS único.` 
          });
        }
      }
      
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

  app.delete("/api/sources/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteSource(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete source" });
    }
  });

  // ===== USER PREFERENCES =====
  app.get("/api/preferences/:id", requireAuth, async (req, res) => {
    if (req.session.userId !== req.params.id) {
      return res.status(403).json({ error: "Acesso negado" });
    }
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

  app.post("/api/preferences", requireAuth, async (req, res) => {
    try {
      const validated = insertUserPreferencesSchema.parse(req.body);
      if (validated.id !== req.session.userId) {
        return res.status(403).json({ error: "Acesso negado" });
      }
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

  app.post("/api/refresh-feed", requireAdmin, async (req, res) => {
    try {
      const allSources = await storage.getAllSources();
      const sourcesWithRSS = allSources.filter(s => s.rssUrl);

      refreshProgress = { current: 0, total: sourcesWithRSS.length, status: "loading", message: "Buscando notícias em paralelo...", newsCount: 0 };

      const started = await fetchAllRSS();

      if (!started) {
        refreshProgress = { current: sourcesWithRSS.length, total: sourcesWithRSS.length, status: "complete", message: "Atualização já em andamento.", newsCount: 0 };
        return res.json({ success: true, message: "Refresh already in progress" });
      }

      const allNews = await storage.getAllNewsItems();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentCount = allNews.filter(n => new Date(n.timestamp) >= sevenDaysAgo).length;

      refreshProgress = {
        current: sourcesWithRSS.length,
        total: sourcesWithRSS.length,
        status: "complete",
        message: `Concluído! ${recentCount} notícias nos últimos 7 dias.`,
        newsCount: recentCount
      };
      res.json({ success: true, message: "Feed refreshed successfully", newsCount: recentCount });
    } catch (error) {
      refreshProgress = { current: 0, total: 0, status: "error", message: "Erro ao atualizar", newsCount: 0 };
      res.status(500).json({ error: "Failed to refresh feed" });
    }
  });

  app.post("/api/refresh-source/:id", requireAdmin, async (req, res) => {
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
