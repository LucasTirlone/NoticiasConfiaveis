import type { NewsItem, Source, UserPreferences } from "@shared/schema";

const API_BASE = "/api";

export const api = {
  // News
  async getNews(): Promise<NewsItem[]> {
    const res = await fetch(`${API_BASE}/news`);
    if (!res.ok) throw new Error("Failed to fetch news");
    return res.json();
  },

  async getNewsItem(id: string): Promise<NewsItem> {
    const res = await fetch(`${API_BASE}/news/${id}`);
    if (!res.ok) throw new Error("Failed to fetch news item");
    return res.json();
  },

  // Sources
  async getSources(): Promise<Source[]> {
    const res = await fetch(`${API_BASE}/sources`);
    if (!res.ok) throw new Error("Failed to fetch sources");
    return res.json();
  },

  async createSource(source: Omit<Source, "id" | "createdAt" | "lastFetched">): Promise<Source> {
    const res = await fetch(`${API_BASE}/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(source),
    });
    if (!res.ok) throw new Error("Failed to create source");
    return res.json();
  },

  async deleteSource(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/sources/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete source");
  },

  // Preferences
  async getPreferences(id: string): Promise<UserPreferences | null> {
    const res = await fetch(`${API_BASE}/preferences/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Failed to fetch preferences");
    return res.json();
  },

  async savePreferences(prefs: UserPreferences): Promise<UserPreferences> {
    const res = await fetch(`${API_BASE}/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    if (!res.ok) throw new Error("Failed to save preferences");
    return res.json();
  },

  // Feed refresh
  async refreshFeed(): Promise<void> {
    const res = await fetch(`${API_BASE}/refresh-feed`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to refresh feed");
  },
};
