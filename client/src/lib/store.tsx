import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import type { Source as DBSource, UserPreferences as DBUserPreferences } from "@shared/schema";
import { CATEGORIES, getAllThemeIds } from "@shared/categories";
import { api, type RefreshProgress } from "./api";

export type ReliabilityLevel = "high" | "medium" | "low" | "investigating";
export type AlertLevel = "critical" | "warning" | "info";

export interface Source extends DBSource {}
export interface UserPreferences extends DBUserPreferences {}

export interface NewsItem {
  id: string;
  title: string;
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

const USER_ID = "default-user";

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
  loadNews: (themes?: string[]) => Promise<void>;
  isLoading: boolean;
  refreshProgress: RefreshProgress;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  paginatedFeed: NewsItem[];
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const ITEMS_PER_PAGE = 3;

export function StoreProvider({ children }: { children: ReactNode }) {
  const allThemes = getAllThemeIds();
  
  const [preferences, setPreferences] = useState<UserPreferences>({
    id: USER_ID,
    selectedTags: [...allThemes],
    region: "",
    sensitivity: "all",
    textSize: "normal",
    highContrast: false,
    onboardingCompleted: false,
    updatedAt: new Date(),
  });

  const [feed, setFeed] = useState<NewsItem[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshProgress, setRefreshProgress] = useState<RefreshProgress>({
    current: 0,
    total: 0,
    status: "idle",
    message: ""
  });

  const now = new Date();
  const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  
  const filteredFeed = feed.filter(item => {
    const itemDate = new Date(item.timestamp);
    return itemDate >= seventyTwoHoursAgo;
  });

  const totalPages = Math.max(1, Math.ceil(filteredFeed.length / ITEMS_PER_PAGE));
  const paginatedFeed = filteredFeed.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const prefs = await api.getPreferences(USER_ID);
        if (prefs) {
          setPreferences(prefs);
        }
      } catch (error) {
        console.error("Failed to load preferences:", error);
      }
    };
    loadPrefs();
  }, []);

  const loadNews = async (themes?: string[]) => {
    setIsLoading(true);
    try {
      const tagsToUse = themes || preferences.selectedTags;
      if (tagsToUse.length === 0) {
        setFeed([]);
        return;
      }
      const newsData = await api.getNews(tagsToUse);
      setFeed(newsData as NewsItem[]);
      setCurrentPage(1);
    } catch (error) {
      console.error("Failed to load news:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshFeed = async () => {
    setRefreshProgress({ current: 0, total: 1, status: "loading", message: "Buscando notícias..." });
    
    try {
      await api.refreshFeed();
      setRefreshProgress({ current: 1, total: 1, status: "loading", message: "Carregando..." });
      
      const newsData = await api.getNews(preferences.selectedTags.length > 0 ? preferences.selectedTags : undefined);
      setFeed(newsData as NewsItem[]);
      setCurrentPage(1);
      setRefreshProgress({ current: 1, total: 1, status: "complete", message: "Atualizado!" });
    } catch (error) {
      console.error("Failed to refresh:", error);
      setRefreshProgress({ current: 0, total: 0, status: "error", message: "Erro" });
    } finally {
      setTimeout(() => {
        setRefreshProgress({ current: 0, total: 0, status: "idle", message: "" });
      }, 2000);
    }
  };

  useEffect(() => {
    const initialLoad = async () => {
      setIsLoading(true);
      setRefreshProgress({ current: 0, total: 1, status: "loading", message: "Carregando notícias..." });
      
      try {
        if (preferences.selectedTags.length === 0) {
          setFeed([]);
          const sourcesData = await api.getSources();
          setSources(sourcesData);
          setRefreshProgress({ current: 1, total: 1, status: "complete", message: "Carregado!" });
        } else {
          const [newsData, sourcesData] = await Promise.all([
            api.getNews(preferences.selectedTags),
            api.getSources()
          ]);
          setFeed(newsData as NewsItem[]);
          setSources(sourcesData);
          setRefreshProgress({ current: 1, total: 1, status: "complete", message: "Carregado!" });
        }
      } catch (error) {
        console.error("Failed to load initial data:", error);
        setRefreshProgress({ current: 0, total: 0, status: "error", message: "Erro" });
      } finally {
        setIsLoading(false);
        setTimeout(() => {
          setRefreshProgress({ current: 0, total: 0, status: "idle", message: "" });
        }, 1500);
      }
    };
    initialLoad();
  }, [preferences.selectedTags]);

  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    const updated = { ...preferences, ...newPrefs };
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
      feed: filteredFeed, 
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
      loadNews,
      isLoading,
      refreshProgress,
      currentPage,
      setCurrentPage,
      totalPages,
      paginatedFeed
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
