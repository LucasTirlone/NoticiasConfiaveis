import { useState, useEffect, useRef, createContext, useContext, ReactNode } from "react";
import type { Source as DBSource, UserPreferences as DBUserPreferences } from "@shared/schema";
import { CATEGORIES, getAllThemeIds } from "@shared/categories";
import { api, type RefreshProgress } from "./api";
import { useAuth } from "./auth";

export type ReliabilityLevel = "high" | "medium" | "low" | "investigating";
export type AlertLevel = "critical" | "warning" | "info";

export interface Source extends DBSource {}
export interface UserPreferences extends DBUserPreferences {}

export interface NewsItem {
  id: string;
  title: string;
  originalTitle?: string | null;
  summary: string;
  fullContent: string;
  aiSummary?: string | null;
  tags: string[];
  timestamp: string | Date;
  reliability: ReliabilityLevel;
  alertLevel: AlertLevel;
  sourceIds: string[];
  sources: Source[];
  verificationNotes: string;
  impactAnalysis?: string | null;
  riskLevel?: string | null;
  whyReliable: string;
  originalUrl?: string | null;
  createdAt: string | Date;
}

export { CATEGORIES, getAllThemeIds };

interface StoreContextType {
  preferences: UserPreferences;
  feed: NewsItem[];
  sources: Source[];
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  toggleTheme: (themeId: string) => void;
  selectAllThemes: () => void;
  clearAllThemes: () => void;
  selectCategory: (categoryId: string) => void;
  deselectCategory: (categoryId: string) => void;
  selectAllThemesInCategory: (categoryId: string) => void;
  clearAllThemesInCategory: (categoryId: string) => void;
  markOnboardingComplete: () => void;
  refreshFeed: () => Promise<void>;
  retryFeed: () => Promise<void>;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  feedError: string | null;
  loadNextPage: () => Promise<void>;
  refreshProgress: RefreshProgress;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const allThemes = getAllThemeIds();
  
  const [preferences, setPreferences] = useState<UserPreferences>({
    id: "",
    selectedTags: [...allThemes],
    region: "",
    sensitivity: "all",
    textSize: "normal",
    highContrast: false,
    onboardingCompleted: true,
    updatedAt: new Date(),
  });

  const [feed, setFeed] = useState<NewsItem[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;
  const tagsRef = useRef(preferences.selectedTags);
  tagsRef.current = preferences.selectedTags;
  const cursorRef = useRef<string | null>(null);
  const generationRef = useRef(0);
  const firstRequestRef = useRef<AbortController | null>(null);
  const moreRequestRef = useRef<AbortController | null>(null);
  const firstLoadingRef = useRef(false);
  const moreLoadingRef = useRef(false);
  const [refreshProgress, setRefreshProgress] = useState<RefreshProgress>({
    current: 0,
    total: 0,
    status: "idle",
    message: ""
  });

  const displayItems = (items: NewsItem[]) => items.map(item => ({
    ...item,
    summary: item.aiSummary && item.aiSummary.length > 400
      ? item.aiSummary.substring(0, 400).trim() + "..."
      : (item.aiSummary || item.summary),
  }));

  const loadFirstPage = async (tags: string[], showLoading = true, force = false) => {
    if (firstLoadingRef.current && !force) return;
    firstRequestRef.current?.abort();
    moreRequestRef.current?.abort();
    const generation = ++generationRef.current;
    const controller = new AbortController();
    firstRequestRef.current = controller;
    firstLoadingRef.current = true;
    moreLoadingRef.current = false;
    cursorRef.current = null;
    setFeed([]);
    setHasMore(false);
    setFeedError(null);
    setIsLoadingMore(false);
    if (showLoading) setIsLoading(true);
    try {
      const page = await api.getNewsPage({ limit: 24, tags: tags.length ? tags : undefined, signal: controller.signal });
      if (generation !== generationRef.current || controller.signal.aborted) return;
      const items = page.items as unknown as NewsItem[];
      const unique = Array.from(new Map(items.map(item => [item.id, item])).values());
      setFeed(displayItems(unique));
      cursorRef.current = page.nextCursor;
      setHasMore(page.nextCursor !== null);
    } catch (error) {
      if (generation !== generationRef.current || controller.signal.aborted) return;
      console.error("Failed to load news:", error);
      setFeedError("Não foi possível carregar as notícias.");
    } finally {
      if (generation === generationRef.current) {
        firstLoadingRef.current = false;
        firstRequestRef.current = null;
        setIsLoading(false);
      }
    }
  };

  const loadNextPage = async () => {
    const cursor = cursorRef.current;
    if (cursor === null || moreLoadingRef.current || firstLoadingRef.current) return;
    const generation = generationRef.current;
    const controller = new AbortController();
    moreRequestRef.current?.abort();
    moreRequestRef.current = controller;
    moreLoadingRef.current = true;
    setIsLoadingMore(true);
    setFeedError(null);
    try {
      const page = await api.getNewsPage({
        limit: 24,
        tags: tagsRef.current.length ? tagsRef.current : undefined,
        cursor,
        signal: controller.signal,
      });
      if (generation !== generationRef.current || controller.signal.aborted) return;
      const items = page.items as unknown as NewsItem[];
      setFeed(previous => {
        const seen = new Set(previous.map(item => item.id));
        const additions = Array.from(new Map(
          items.filter(item => !seen.has(item.id)).map(item => [item.id, item]),
        ).values());
        return [...previous, ...displayItems(additions)];
      });
      cursorRef.current = page.nextCursor;
      setHasMore(page.nextCursor !== null);
    } catch (error) {
      if (generation !== generationRef.current || controller.signal.aborted) return;
      console.error("Failed to load next news page:", error);
      setFeedError("Não foi possível carregar mais notícias.");
    } finally {
      if (generation === generationRef.current) {
        moreLoadingRef.current = false;
        moreRequestRef.current = null;
        setIsLoadingMore(false);
      }
    }
  };

  const retryFeed = async () => {
    await loadFirstPage(tagsRef.current, true, true);
  };

  useEffect(() => {
    if (!user?.id) return;
    const loadPrefs = async () => {
      const defaults: UserPreferences = {
        id: user.id,
        selectedTags: [...allThemes],
        region: "",
        sensitivity: "all",
        textSize: "normal",
        highContrast: false,
        onboardingCompleted: true,
        updatedAt: new Date(),
      };
      try {
        const prefs = await api.getPreferences(user.id);
        if (prefs) {
          setPreferences(prefs);
        } else {
          setPreferences(defaults);
          await api.savePreferences(defaults);
        }
      } catch (error) {
        console.error("Failed to load preferences:", error);
        setPreferences(defaults);
      }
    };
    loadPrefs();
  }, [user?.id]);

  const refreshFeed = async () => {
    setRefreshProgress({ current: 0, total: 1, status: "loading", message: "Iniciando atualização...", newsCount: 0 });
    
    let pollingInterval: ReturnType<typeof setInterval> | null = null;
    
    try {
      // Start polling for progress updates
      pollingInterval = setInterval(async () => {
        try {
          const progress = await api.getRefreshProgress();
          if (progress.status === "loading" || progress.status === "complete") {
            setRefreshProgress(progress);
          }
        } catch (e) {
          // Ignore polling errors
        }
      }, 500);
      
      // Trigger the refresh (this will take time)
      await api.refreshFeed();
      
      // Stop polling
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
      
      // Get final progress
      const finalProgress = await api.getRefreshProgress();
      setRefreshProgress(finalProgress);
      
      // Reload news
      await loadFirstPage(tagsRef.current, true, true);
    } catch (error) {
      console.error("Failed to refresh:", error);
      setRefreshProgress({ current: 0, total: 0, status: "error", message: "Erro ao atualizar", newsCount: 0 });
    } finally {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      setTimeout(() => {
        setRefreshProgress({ current: 0, total: 0, status: "idle", message: "", newsCount: 0 });
      }, 3000);
    }
  };

  const selectedTagsKey = JSON.stringify(preferences.selectedTags);
  useEffect(() => {
    let active = true;
    let resetTimer: ReturnType<typeof setTimeout> | undefined;
    const tags: string[] = JSON.parse(selectedTagsKey);
    const readLatestNews = async (initial = false) => {
      if (!active || firstLoadingRef.current) return;
      if (initial) setRefreshProgress({ current: 0, total: 1, status: "loading", message: "Carregando notícias..." });
      await loadFirstPage(tags);
      if (!active) return;
      if (initial) {
        setRefreshProgress({ current: 1, total: 1, status: "complete", message: "Carregado!" });
        resetTimer = setTimeout(() => {
          setRefreshProgress({ current: 0, total: 0, status: "idle", message: "" });
        }, 1500);
      }
    };

    // Read only stored news: returning to the app must never trigger RSS or AI.
    const onVisible = () => {
      if (document.visibilityState === "visible") void readLatestNews();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void readLatestNews();
    };
    void readLatestNews(true);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      active = false;
      generationRef.current += 1;
      firstRequestRef.current?.abort();
      moreRequestRef.current?.abort();
      firstRequestRef.current = null;
      moreRequestRef.current = null;
      firstLoadingRef.current = false;
      moreLoadingRef.current = false;
      if (resetTimer) clearTimeout(resetTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [selectedTagsKey, user?.id]);

  useEffect(() => {
    let active = true;
    api.getSources().then(data => {
      if (active) setSources(data);
    }).catch(error => console.error("Failed to load sources:", error));
    return () => { active = false; };
  }, [user?.id]);

  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    const updated = { ...preferencesRef.current, ...newPrefs };
    preferencesRef.current = updated;
    setPreferences(updated);
    
    try {
      await api.savePreferences(updated);
    } catch (error) {
      console.error("Failed to save preferences:", error);
    }
  };

  const toggleTheme = (themeId: string) => {
    const exists = preferences.selectedTags.includes(themeId);
    const newTags = exists 
      ? preferences.selectedTags.filter(t => t !== themeId) 
      : [...preferences.selectedTags, themeId];
    
    updatePreferences({ selectedTags: newTags });
  };

  const selectAllThemes = () => {
    updatePreferences({ selectedTags: [...allThemes] });
  };

  const clearAllThemes = () => {
    updatePreferences({ selectedTags: [] });
  };

  const selectCategory = (categoryId: string) => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;
    
    const categoryThemeIds = category.themes.map(t => t.id);
    const newTags = Array.from(new Set([...preferences.selectedTags, ...categoryThemeIds]));
    updatePreferences({ selectedTags: newTags });
  };

  const deselectCategory = (categoryId: string) => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;
    
    const categoryThemeIds = category.themes.map(t => t.id);
    const newTags = preferences.selectedTags.filter(t => !categoryThemeIds.includes(t));
    updatePreferences({ selectedTags: newTags });
  };

  const selectAllThemesInCategory = (categoryId: string) => {
    selectCategory(categoryId);
  };

  const clearAllThemesInCategory = (categoryId: string) => {
    deselectCategory(categoryId);
  };

  const markOnboardingComplete = () => {
    updatePreferences({ onboardingCompleted: true });
  };

  return (
    <StoreContext.Provider value={{ 
      preferences, 
      feed,
      sources, 
      updatePreferences, 
      toggleTheme, 
      selectAllThemes,
      clearAllThemes,
      selectCategory,
      deselectCategory,
      selectAllThemesInCategory,
      clearAllThemesInCategory,
      markOnboardingComplete,
      refreshFeed,
      retryFeed,
      isLoading,
      isLoadingMore,
      hasMore,
      feedError,
      loadNextPage,
      refreshProgress,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
}
