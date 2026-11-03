import type { NewsItem, Source, UserPreferences } from "@shared/schema";

const API_BASE = "/api";

export interface RefreshProgress {
  current: number;
  total: number;
  status: "idle" | "loading" | "complete" | "error";
  message: string;
  newsCount?: number;
}

export interface NewsPage {
  items: NewsItem[];
  nextCursor: string | null;
}

export const api = {
  // News
  async getNewsPage(
    options: { limit?: number; tags?: string[]; cursor?: string; signal?: AbortSignal } = {},
  ): Promise<NewsPage> {
    const params = new URLSearchParams();
    params.set("limit", String(options.limit ?? 24));
    if (options.tags?.length) params.set("tags", options.tags.join(","));
    if (options.cursor !== undefined) params.set("cursor", options.cursor);
    const res = await fetch(`${API_BASE}/news-feed?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
      signal: options.signal,
    });
    if (!res.ok) throw new Error("Failed to fetch news page");
    return res.json();
  },

  async getNews(tags?: string[], signal?: AbortSignal): Promise<NewsItem[]> {
    let params = "";
    if (tags && tags.length > 0) {
      const searchParams = new URLSearchParams();
      searchParams.set("tags", tags.join(","));
      params = `?${searchParams.toString()}`;
    }
    const res = await fetch(`${API_BASE}/news${params}`, {
      credentials: "include",
      cache: "no-store",
      signal,
    });
    if (!res.ok) throw new Error("Failed to fetch news");
    return res.json();
  },

  async getNewsItem(id: string): Promise<NewsItem> {
    const res = await fetch(`${API_BASE}/news/${id}`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch news item");
    return res.json();
  },

  // Sources
  async getSources(): Promise<Source[]> {
    const res = await fetch(`${API_BASE}/sources`, { credentials: "include" });
    if (res.status === 401 || res.status === 403) return [];
    if (!res.ok) throw new Error("Failed to fetch sources");
    return res.json();
  },

  async createSource(source: Omit<Source, "id" | "createdAt" | "lastFetched">): Promise<Source> {
    const res = await fetch(`${API_BASE}/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(source),
    });
    if (!res.ok) throw new Error("Failed to create source");
    return res.json();
  },

  async deleteSource(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/sources/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to delete source");
  },

  // Preferences
  async getPreferences(id: string): Promise<UserPreferences | null> {
    const res = await fetch(`${API_BASE}/preferences/${id}`, { credentials: "include" });
    if (res.status === 404 || res.status === 401 || res.status === 403) return null;
    if (!res.ok) throw new Error("Failed to fetch preferences");
    return res.json();
  },

  async savePreferences(prefs: UserPreferences): Promise<UserPreferences> {
    const res = await fetch(`${API_BASE}/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(prefs),
    });
    if (!res.ok) throw new Error("Failed to save preferences");
    return res.json();
  },

  // Feed refresh with progress
  async refreshFeed(): Promise<void> {
    const res = await fetch(`${API_BASE}/refresh-feed`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to refresh feed");
  },

  async getRefreshProgress(): Promise<RefreshProgress> {
    const res = await fetch(`${API_BASE}/refresh-progress`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to get progress");
    return res.json();
  },
};
