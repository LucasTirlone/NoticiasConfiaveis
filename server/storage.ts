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
  userPreferences
} from "@shared/schema";
import { db } from "../db";
import { eq, desc, or } from "drizzle-orm";

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
  
  // News Items
  getAllNewsItems(limit?: number): Promise<NewsItem[]>;
  getNewsItem(id: string): Promise<NewsItem | undefined>;
  createNewsItem(item: InsertNewsItem): Promise<NewsItem>;
  getNewsItemsByTags(tags: string[], limit?: number): Promise<NewsItem[]>;
  findNewsItemByUrlOrTitle(url: string, title: string): Promise<NewsItem | undefined>;
  countNewsItems(): Promise<number>;
  updateNewsItemAiSummary(id: string, aiSummary: string): Promise<void>;
  updateNewsItemTags(id: string, tags: string[]): Promise<void>;
  
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

  // News Items
  async getAllNewsItems(limit: number = 50): Promise<NewsItem[]> {
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

  async findNewsItemByUrlOrTitle(url: string, title: string): Promise<NewsItem | undefined> {
    const [item] = await db.select().from(newsItems).where(
      or(eq(newsItems.originalUrl, url), eq(newsItems.title, title))
    );
    return item;
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
}

export const storage = new DatabaseStorage();
