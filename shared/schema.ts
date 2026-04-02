import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").unique(),
  displayName: text("display_name"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  emailVerified: boolean("email_verified").notNull().default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const registerUserSchema = z.object({
  email: z.string().email("E-mail inválido"),
  displayName: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(60),
  password: z
    .string()
    .min(8, "Senha deve ter ao menos 8 caracteres")
    .regex(/[A-Z]/, "Senha deve conter ao menos uma letra maiúscula")
    .regex(/[0-9]/, "Senha deve conter ao menos um número"),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Você deve aceitar os termos" }) }),
});

export const loginUserSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe sua senha"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;

export const sources = pgTable("sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  url: text("url").notNull(),
  type: text("type").notNull().$type<"official" | "media" | "blog">(),
  trusted: boolean("trusted").notNull().default(true),
  rssUrl: text("rss_url").unique(),
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
  originalTitle: text("original_title"),
  summary: text("summary").notNull(),
  fullContent: text("full_content").notNull(),
  aiSummary: text("ai_summary"),
  tags: text("tags").array().notNull(),
  timestamp: timestamp("timestamp").notNull(),
  reliability: text("reliability").notNull().$type<"high" | "medium" | "low" | "investigating">(),
  alertLevel: text("alert_level").notNull().$type<"critical" | "warning" | "info">(),
  sourceIds: text("source_ids").array().notNull(),
  verificationNotes: text("verification_notes").notNull(),
  impactAnalysis: text("impact_analysis"),
  riskLevel: text("risk_level"),
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

// Lock table for distributed coordination
export const systemLocks = pgTable("system_locks", {
  id: varchar("id").primaryKey(),
  lockedAt: timestamp("locked_at"),
  lockedBy: text("locked_by"),
  expiresAt: timestamp("expires_at"),
});

export * from "./models/chat";
