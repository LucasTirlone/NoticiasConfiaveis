import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import type { Source as DBSource, UserPreferences as DBUserPreferences } from "@shared/schema";
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
  whyReliable: string;
  originalUrl?: string | null;
  createdAt: string | Date;
}

export const AVAILABLE_TAGS = [
  "tempestade solar", "aurora boreal", "terremoto", "tufão", "ciclone", "chuva forte", 
  "enchente", "onda de calor", "deslizamento", "epidemia", "erupção", "vírus", "seca",
  "vulcão", "incêndio", "incêndio florestal", "tsunami", "maremoto", "doenças",
  "comportamentos animais", "luzes no céu", "apocalipse"
];

const USER_ID = "default-user";

interface StoreContextType {
  preferences: UserPreferences;
  feed: NewsItem[];
  sources: Source[];
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  toggleTag: (tag: string) => void;
  markOnboardingComplete: () => void;
  refreshFeed: () => Promise<void>;
  loadNews: (tags?: string[]) => Promise<void>;
  isLoading: boolean;
  refreshProgress: RefreshProgress;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>({
    id: USER_ID,
    selectedTags: [],
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
  const [refreshProgress, setRefreshProgress] = useState<RefreshProgress>({
    current: 0,
    total: 0,
    status: "idle",
    message: ""
  });

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await api.getPreferences(USER_ID);
        if (prefs) {
          setPreferences(prefs);
        }
      } catch (error) {
        console.error("Failed to load preferences:", error);
      }
    };
    loadPreferences();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", preferences.highContrast);
    document.documentElement.style.fontSize = 
      preferences.textSize === "large" ? "20px" : 
      preferences.textSize === "extra_large" ? "24px" : "16px";
  }, [preferences.highContrast, preferences.textSize]);

  const loadNews = async (tags?: string[]) => {
    try {
      const newsData = await api.getNews(tags);
      setFeed(newsData as NewsItem[]);
    } catch (error) {
      console.error("Failed to load news:", error);
    }
  };

  const refreshFeed = async () => {
    setIsLoading(true);
    setRefreshProgress({ current: 0, total: 0, status: "loading", message: "Iniciando..." });
    
    let lastTotal = 0;
    
    try {
      // Start the refresh process
      const refreshPromise = api.refreshFeed();
      
      // Poll for progress
      const pollProgress = async () => {
        try {
          const progress = await api.getRefreshProgress();
          setRefreshProgress(progress);
          lastTotal = progress.total;
          
          if (progress.status === "loading") {
            setTimeout(pollProgress, 300);
          }
        } catch (e) {
          // Ignore polling errors
        }
      };
      
      pollProgress();
      await refreshPromise;
      
      // Load news with user's selected tags
      const tagsToUse = preferences.selectedTags.length > 0 ? preferences.selectedTags : undefined;
      await loadNews(tagsToUse);
      
      const sourcesData = await api.getSources();
      setSources(sourcesData);
      
      // Use actual total from backend
      setRefreshProgress({ current: lastTotal, total: lastTotal, status: "complete", message: "Concluído!" });
    } catch (error) {
      console.error("Failed to refresh feed:", error);
      setRefreshProgress({ current: 0, total: 0, status: "error", message: "Erro ao atualizar" });
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setRefreshProgress({ current: 0, total: 0, status: "idle", message: "" });
      }, 2000);
    }
  };

  // Initial load
  useEffect(() => {
    const initialLoad = async () => {
      setIsLoading(true);
      setRefreshProgress({ current: 0, total: 1, status: "loading", message: "Carregando notícias..." });
      
      try {
        const [newsData, sourcesData] = await Promise.all([
          api.getNews(preferences.selectedTags.length > 0 ? preferences.selectedTags : undefined),
          api.getSources()
        ]);
        setFeed(newsData as NewsItem[]);
        setSources(sourcesData);
        setRefreshProgress({ current: 1, total: 1, status: "complete", message: "Carregado!" });
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

  const toggleTag = (tag: string) => {
    const exists = preferences.selectedTags.includes(tag);
    const newTags = exists 
      ? preferences.selectedTags.filter(t => t !== tag) 
      : [...preferences.selectedTags, tag];
    
    updatePreferences({ selectedTags: newTags });
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
      toggleTag, 
      markOnboardingComplete,
      refreshFeed,
      loadNews,
      isLoading,
      refreshProgress
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
