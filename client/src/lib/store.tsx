import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import type { Source as DBSource, UserPreferences as DBUserPreferences } from "@shared/schema";
import { api } from "./api";

export type ReliabilityLevel = "high" | "medium" | "low" | "investigating";
export type AlertLevel = "critical" | "warning" | "info";

export interface Source extends DBSource {}
export interface UserPreferences extends DBUserPreferences {}

// Extended NewsItem that includes populated sources from the API
export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  fullContent: string;
  tags: string[];
  timestamp: string | Date;
  reliability: ReliabilityLevel;
  alertLevel: AlertLevel;
  sourceIds: string[];
  sources: Source[]; // Populated by backend
  verificationNotes: string;
  whyReliable: string;
  originalUrl?: string | null;
  createdAt: string | Date;
}

export const AVAILABLE_TAGS = [
  "tempestade solar", "aurora boreal", "terremoto", "tufão", "ciclone", "chuva", 
  "enchente", "onda de calor", "deslizamento", "epidemia", "maremoto", "tsunami",
  "vulcão", "erupção", "incêndio", "incêndio florestal", "seca", "vírus", "doenças",
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
  refreshFeed: () => void;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(false);

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

  const refreshFeed = async () => {
    setIsLoading(true);
    try {
      const [newsData, sourcesData] = await Promise.all([
        api.getNews(),
        api.getSources()
      ]);
      setFeed(newsData as NewsItem[]);
      setSources(sourcesData);
    } catch (error) {
      console.error("Failed to refresh feed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshFeed();
  }, []);

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
      isLoading
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
