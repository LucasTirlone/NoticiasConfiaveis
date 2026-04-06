import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "../db/index";

const app = express();
const httpServer = createServer(app);

// Trust Replit's reverse proxy so req.secure = true for HTTPS connections.
// Without this, express-session refuses to set Secure cookies (they never
// reach the browser), making every authenticated request return 401.
app.set("trust proxy", 1);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const PgSession = connectPgSimple(session);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "sentinela-ia-super-secret-2025",
    resave: false,
    saveUninitialized: false,
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: "lax",
    },
  })
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Seed initial data
  const { seedInitialData } = await import("./seed-data");
  await seedInitialData();

  const { fetchAllRSS } = await import("./services/rss-fetcher");
  const { storage } = await import("./storage");

  // On startup, check the DB to see when news was last fetched.
  // If it has been more than 1h (or never), trigger a fetch immediately.
  // This fixes the setInterval-only approach which resets on every server restart.
  try {
    const allSources = await storage.getAllSources();
    const sourcesWithRSS = allSources.filter(s => s.rssUrl);
    const lastFetchedDates = sourcesWithRSS
      .map(s => s.lastFetched)
      .map(d => {
        if (d instanceof Date && !isNaN(d.getTime())) return d;
        if (typeof d === "string" || typeof d === "number") {
          const parsed = new Date(d);
          return isNaN(parsed.getTime()) ? null : parsed;
        }
        return null;
      })
      .filter((d): d is Date => d !== null);

    const mostRecentFetch = lastFetchedDates.length > 0
      ? new Date(Math.max(...lastFetchedDates.map(d => d.getTime())))
      : null;

    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);

    if (!mostRecentFetch || mostRecentFetch < oneHourAgo) {
      const ageHours = mostRecentFetch
        ? Math.round((Date.now() - mostRecentFetch.getTime()) / 3_600_000)
        : null;
      const reason = !mostRecentFetch
        ? "nenhum fetch anterior encontrado"
        : `último fetch foi há ${ageHours}h (${mostRecentFetch.toISOString()})`;
      log(`Iniciando fetch de startup: ${reason}`, "rss");
      fetchAllRSS().then(() => log("Fetch de startup concluído", "rss")).catch(err => log(`Erro no fetch de startup: ${err}`, "rss"));
    } else {
      const ageMinutes = Math.round((Date.now() - mostRecentFetch.getTime()) / 60_000);
      const nextFetch = new Date(mostRecentFetch.getTime() + 1 * 60 * 60 * 1000);
      log(`Fetch não necessário no startup. Último há ${ageMinutes}min. Próximo: ${nextFetch.toISOString()}`, "rss");
    }
  } catch (err) {
    log(`Erro ao verificar último fetch no startup: ${err}`, "rss");
  }

  log("RSS auto-refresh configurado: a cada 1h ou pelo botão de refresh", "rss");

  // Periodic refresh every 1 hour (safety net for long-running instances)
  setInterval(async () => {
    log("Starting periodic news refresh (1h interval)...", "rss");
    try {
      await fetchAllRSS();
      log("Periodic news refresh completed", "rss");
    } catch (error) {
      log(`Error in periodic news refresh: ${error}`, "rss");
    }
  }, 1 * 60 * 60 * 1000); // 1 hour

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
