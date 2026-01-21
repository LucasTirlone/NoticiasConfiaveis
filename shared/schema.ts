import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const sources = pgTable("sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  url: text("url").notNull(),
  type: text("type").notNull().$type<"official" | "media" | "blog">(),
  trusted: boolean("trusted").notNull().default(true),
  rssUrl: text("rss_url"),
  lastFetched: timestamp("last_fetched"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSourceSchema = createInsertSchema(sources).omit({
  id: true,
  createdAt: true,
  lastFetched: true,
});

export type InsertSource = z.infer<typeof insertSourceSchema>;
export type Source = typeof sources.$inferSelect;

export const newsItems = pgTable("news_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  fullContent: text("full_content").notNull(),
  tags: text("tags").array().notNull(),
  timestamp: timestamp("timestamp").notNull(),
  reliability: text("reliability").notNull().$type<"high" | "medium" | "low" | "investigating">(),
  alertLevel: text("alert_level").notNull().$type<"critical" | "warning" | "info">(),
  sourceIds: text("source_ids").array().notNull(),
  verificationNotes: text("verification_notes").notNull(),
  whyReliable: text("why_reliable").notNull(),
  originalUrl: text("original_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNewsItemSchema = createInsertSchema(newsItems).omit({
  id: true,
  createdAt: true,
});

export type InsertNewsItem = z.infer<typeof insertNewsItemSchema>;
export type NewsItem = typeof newsItems.$inferSelect;

export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  selectedTags: text("selected_tags").array().notNull().default(sql`ARRAY[]::text[]`),
  region: text("region").notNull().default(''),
  sensitivity: text("sensitivity").notNull().$type<"all" | "critical_only">().default("all"),
  textSize: text("text_size").notNull().$type<"normal" | "large" | "extra_large">().default("normal"),
  highContrast: boolean("high_contrast").notNull().default(false),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  updatedAt: true,
});

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
