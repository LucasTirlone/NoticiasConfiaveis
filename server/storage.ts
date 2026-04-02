import { 
  type User, 
  type InsertUser,
  type Source,
  type InsertSource,
  type NewsItem,
  type InsertNewsItem,
  type UserPreferences,
  type InsertUserPreferences,
  users,
  sources,
  newsItems,
  userPreferences,
  systemLocks
} from "@shared/schema";
import { db } from "../db";
import { eq, desc, or, and, isNotNull, ne } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Sources
  getAllSources(): Promise<Source[]>;
  getSource(id: string): Promise<Source | undefined>;
  createSource(source: InsertSource): Promise<Source>;
  deleteSource(id: string): Promise<void>;
  updateSourceLastFetched(id: string): Promise<void>;
  findSourceByRssUrl(rssUrl: string, excludeId?: string): Promise<Source | undefined>;
  
  // News Items
  getAllNewsItems(limit?: number): Promise<NewsItem[]>;
  getNewsItem(id: string): Promise<NewsItem | undefined>;
  createNewsItem(item: InsertNewsItem): Promise<NewsItem>;
  getNewsItemsByTags(tags: string[], limit?: number): Promise<NewsItem[]>;
  findNewsItemByOriginalTitleOrUrl(originalTitle: string, originalUrl: string): Promise<NewsItem | undefined>;
  countNewsItems(): Promise<number>;
  updateNewsItemAiSummary(id: string, aiSummary: string): Promise<void>;
  updateNewsItemTags(id: string, tags: string[]): Promise<void>;
  updateNewsItemTitle(id: string, title: string): Promise<void>;
  
  // Refresh Lock (for distributed locking)
  acquireRefreshLock(): Promise<boolean>;
  releaseRefreshLock(): Promise<void>;
  
  // User Preferences
  getUserPreferences(id: string): Promise<UserPreferences | undefined>;
  createOrUpdateUserPreferences(prefs: InsertUserPreferences): Promise<UserPreferences>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Sources
  async getAllSources(): Promise<Source[]> {
    return await db.select().from(sources);
  }

  async getSource(id: string): Promise<Source | undefined> {
    const [source] = await db.select().from(sources).where(eq(sources.id, id));
    return source;
  }

  async createSource(source: InsertSource): Promise<Source> {
    const [newSource] = await db.insert(sources).values([source as any]).returning();
    return newSource;
  }

  async deleteSource(id: string): Promise<void> {
    await db.delete(sources).where(eq(sources.id, id));
  }

  async updateSourceLastFetched(id: string): Promise<void> {
    await db.update(sources)
      .set({ lastFetched: new Date() })
      .where(eq(sources.id, id));
  }

  async findSourceByRssUrl(rssUrl: string, excludeId?: string): Promise<Source | undefined> {
    if (!rssUrl) return undefined;
    
    const conditions = [eq(sources.rssUrl, rssUrl)];
    if (excludeId) {
      conditions.push(ne(sources.id, excludeId));
    }
    
    const [source] = await db.select().from(sources).where(and(...conditions));
    return source;
  }

  // News Items
  async getAllNewsItems(limit: number = 200): Promise<NewsItem[]> {
    return await db.select()
      .from(newsItems)
      .orderBy(desc(newsItems.timestamp))
      .limit(limit);
  }

  async getNewsItem(id: string): Promise<NewsItem | undefined> {
    const [item] = await db.select().from(newsItems).where(eq(newsItems.id, id));
    return item;
  }

  async createNewsItem(item: InsertNewsItem): Promise<NewsItem> {
    const [newItem] = await db.insert(newsItems).values([item as any]).returning();
    return newItem;
  }

  async getNewsItemsByTags(tags: string[], limit: number = 50): Promise<NewsItem[]> {
    const allItems = await db.select()
      .from(newsItems)
      .orderBy(desc(newsItems.timestamp))
      .limit(500);
    
    const filtered = allItems.filter(item => 
      item.tags.some(tag => tags.includes(tag))
    );
    
    return filtered.slice(0, limit);
  }

  async findNewsItemByOriginalTitleOrUrl(originalTitle: string, originalUrl: string): Promise<NewsItem | undefined> {
    // Prioridade: URL é o identificador mais confiável e estável.
    // Se a URL está disponível, ela é usada exclusivamente — evita falsos positivos por variações de título.
    // Título é usado apenas como fallback quando a URL não está presente no feed.
    if (originalUrl) {
      const [byUrl] = await db.select().from(newsItems).where(eq(newsItems.originalUrl, originalUrl));
      if (byUrl) return byUrl;
    }

    // Fallback: comparar pelo título original (inglês) apenas quando URL ausente
    if (originalTitle && !originalUrl) {
      const [byTitle] = await db.select().from(newsItems).where(eq(newsItems.originalTitle, originalTitle));
      return byTitle;
    }

    return undefined;
  }

  async countNewsItems(): Promise<number> {
    const items = await db.select().from(newsItems);
    return items.length;
  }

  async updateNewsItemAiSummary(id: string, aiSummary: string): Promise<void> {
    await db.update(newsItems)
      .set({ aiSummary })
      .where(eq(newsItems.id, id));
  }

  async updateNewsItemTags(id: string, tags: string[]): Promise<void> {
    await db.update(newsItems)
      .set({ tags })
      .where(eq(newsItems.id, id));
  }

  async updateNewsItemTitle(id: string, title: string): Promise<void> {
    await db.update(newsItems)
      .set({ title })
      .where(eq(newsItems.id, id));
  }

  // User Preferences
  async getUserPreferences(id: string): Promise<UserPreferences | undefined> {
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.id, id));
    return prefs;
  }

  async createOrUpdateUserPreferences(prefs: InsertUserPreferences): Promise<UserPreferences> {
    if (!prefs.id) {
      throw new Error("Preferences ID is required");
    }
    
    const existing = await this.getUserPreferences(prefs.id);
    
    if (existing) {
      const updateData: any = {
        ...(prefs.selectedTags !== undefined && { selectedTags: prefs.selectedTags }),
        ...(prefs.region !== undefined && { region: prefs.region }),
        ...(prefs.sensitivity !== undefined && { sensitivity: prefs.sensitivity as "all" | "critical_only" }),
        ...(prefs.textSize !== undefined && { textSize: prefs.textSize as "normal" | "large" | "extra_large" }),
        ...(prefs.highContrast !== undefined && { highContrast: prefs.highContrast }),
        ...(prefs.onboardingCompleted !== undefined && { onboardingCompleted: prefs.onboardingCompleted }),
        updatedAt: new Date()
      };
      
      const [updated] = await db.update(userPreferences)
        .set(updateData)
        .where(eq(userPreferences.id, prefs.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userPreferences).values([prefs as any]).returning();
      return created;
    }
  }

  // Refresh Lock - usando tabela de lock para coordenação entre instâncias
  private readonly REFRESH_LOCK_ID = "rss_refresh";
  private readonly LOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutos
  private instanceId = `instance_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  async acquireRefreshLock(): Promise<boolean> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.LOCK_DURATION_MS);
      
      // Operação atômica: INSERT ... ON CONFLICT DO UPDATE ONLY IF EXPIRED
      // Isso garante que apenas uma instância consiga o lock mesmo em condição de corrida
      const result = await db.execute(`
        INSERT INTO system_locks (id, locked_at, locked_by, expires_at)
        VALUES ('${this.REFRESH_LOCK_ID}', NOW(), '${this.instanceId}', NOW() + INTERVAL '10 minutes')
        ON CONFLICT (id) DO UPDATE 
        SET 
          locked_at = NOW(),
          locked_by = '${this.instanceId}',
          expires_at = NOW() + INTERVAL '10 minutes'
        WHERE system_locks.expires_at < NOW() OR system_locks.locked_by IS NULL
        RETURNING id, locked_by
      `);
      
      const rows = result.rows as Array<{ id: string; locked_by: string }>;
      
      // Verifica se conseguimos o lock (retornou nossa instância)
      if (rows.length > 0 && rows[0].locked_by === this.instanceId) {
        console.log(`[DB Lock] Lock adquirido por ${this.instanceId}`);
        return true;
      }
      
      // Lock não adquirido - verificar quem tem
      const existingLock = await db.select().from(systemLocks).where(eq(systemLocks.id, this.REFRESH_LOCK_ID));
      if (existingLock.length > 0) {
        console.log(`[DB Lock] Lock em uso por ${existingLock[0].lockedBy} até ${existingLock[0].expiresAt}`);
      }
      
      return false;
    } catch (error) {
      console.error("[DB Lock] Erro ao tentar adquirir lock:", error);
      return false;
    }
  }
  
  async releaseRefreshLock(): Promise<void> {
    try {
      // Só libera se for o dono do lock (operação atômica)
      await db.execute(`
        UPDATE system_locks 
        SET locked_at = NULL, locked_by = NULL, expires_at = NULL
        WHERE id = '${this.REFRESH_LOCK_ID}' AND locked_by = '${this.instanceId}'
      `);
      console.log(`[DB Lock] Lock liberado por ${this.instanceId}`);
    } catch (error) {
      console.error("[DB Lock] Erro ao liberar lock:", error);
    }
  }
}

export const storage = new DatabaseStorage();
