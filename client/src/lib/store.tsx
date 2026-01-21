import { useState, useEffect, createContext, useContext, ReactNode } from "react";

export type ReliabilityLevel = "high" | "medium" | "low" | "investigating";
export type AlertLevel = "critical" | "warning" | "info";

export interface Source {
  id: string;
  name: string;
  url: string;
  type: "official" | "media" | "blog"; // Official = Gov/Science inst, Media = Major news, Blog = Independent
  trusted: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string; // Short summary for feed
  fullContent: string; // Detailed simple explanation
  tags: string[];
  timestamp: string;
  reliability: ReliabilityLevel;
  alertLevel: AlertLevel;
  sources: Source[]; // List of sources confirming this
  verificationNotes: string; // "Confirmed by NASA and NOAA"
  whyReliable: string; // "Consensus among 3 official sources"
}

export interface UserPreferences {
  onboardingCompleted: boolean;
  selectedTags: string[];
  region: string;
  sensitivity: "all" | "critical_only";
  textSize: "normal" | "large" | "extra_large";
  highContrast: boolean;
}

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

// --- MOCK DATA ---

const MOCK_SOURCES: Source[] = [
  { id: "s1", name: "NASA", url: "https://nasa.gov", type: "official", trusted: true },
  { id: "s2", name: "NOAA", url: "https://noaa.gov", type: "official", trusted: true },
  { id: "s3", name: "Defesa Civil", url: "https://defesacivil.gov.br", type: "official", trusted: true },
  { id: "s4", name: "G1", url: "https://g1.globo.com", type: "media", trusted: true },
  { id: "s5", name: "BBC Brasil", url: "https://bbc.com/portuguese", type: "media", trusted: true },
  { id: "s6", name: "Blog do Zé", url: "https://blogdoze.fake", type: "blog", trusted: false },
];

const MOCK_NEWS: NewsItem[] = [
  {
    id: "n1",
    title: "Alerta de Tempestade Solar: Risco Baixo para Eletrônicos",
    summary: "Uma tempestade solar moderada atingirá a Terra hoje à noite. Pode haver auroras, mas celulares e internet funcionarão normalmente.",
    fullContent: "Cientistas da NASA e NOAA confirmaram uma ejeção de massa coronal (tempestade solar) que chegará à Terra nas próximas 24 horas. Apesar de boatos nas redes sociais, NÃO há risco de 'apagão da internet' global. Satélites e redes de energia estão preparados. O único efeito visível poderá ser auroras boreais em latitudes mais baixas que o normal.",
    tags: ["tempestade solar", "aurora boreal", "eletrônicos"],
    timestamp: new Date().toISOString(),
    reliability: "high",
    alertLevel: "info",
    sources: [MOCK_SOURCES[0], MOCK_SOURCES[1], MOCK_SOURCES[4]],
    verificationNotes: "Confirmado por NASA e NOAA. Desmentido risco de apagão.",
    whyReliable: "Informação cruzada entre agências espaciais oficiais e grandes veículos de imprensa."
  },
  {
    id: "n2",
    title: "Boato sobre 'Apocalipse Zumbi' é Falso",
    summary: "Vídeos circulando no WhatsApp sobre um vírus que transforma pessoas são falsos. Trata-se de um trailer de filme.",
    fullContent: "Não existe nenhum vírus novo causando comportamento agressivo ou 'zumbi'. As imagens que circulam são, na verdade, cenas de um filme independente lançado na semana passada. Não compartilhe mensagens de pânico.",
    tags: ["vírus", "doenças", "apocalipse"],
    timestamp: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    reliability: "low", // The news item explains it's low reliability/fake
    alertLevel: "info",
    sources: [MOCK_SOURCES[3], MOCK_SOURCES[4]],
    verificationNotes: "Agências de checagem confirmaram que é trecho de filme.",
    whyReliable: "Consenso entre agências de verificação de fatos."
  },
  {
    id: "n3",
    title: "Onda de Calor Extremo: Cuidados Necessários",
    summary: "Temperaturas acima da média nos próximos 3 dias. Hidrate-se e evite sol entre 10h e 16h.",
    fullContent: "A Defesa Civil emitiu um alerta para onda de calor em várias regiões. As temperaturas podem superar 40°C. Recomenda-se beber muita água, usar roupas leves e evitar exposição direta ao sol nos horários de pico. Idosos e crianças precisam de atenção redobrada.",
    tags: ["onda de calor", "saúde"],
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    reliability: "high",
    alertLevel: "warning",
    sources: [MOCK_SOURCES[2], MOCK_SOURCES[3]],
    verificationNotes: "Alerta oficial da Defesa Civil.",
    whyReliable: "Fonte oficial do governo (Defesa Civil)."
  },
  {
    id: "n4",
    title: "Possível Ciclone no Sul (Em Apuração)",
    summary: "Meteorologistas monitoram formação de ventos fortes. Ainda não há confirmação de rota ou intensidade perigosa.",
    fullContent: "Alguns modelos meteorológicos indicam a formação de um ciclone extratropical perto da costa. Ainda é cedo para afirmar se ele atingirá o continente com força. A Defesa Civil ainda NÃO emitiu alerta de evacuação. Acompanhe as atualizações aqui.",
    tags: ["ciclone", "vento", "chuva"],
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    reliability: "investigating",
    alertLevel: "info",
    sources: [MOCK_SOURCES[3]],
    verificationNotes: "Aguardando confirmação oficial da Defesa Civil.",
    whyReliable: "Informação preliminar de apenas um veículo de imprensa, sem nota oficial ainda."
  }
];

export const AVAILABLE_TAGS = [
  "tempestade solar", "terremoto", "tufão", "chuva", "enchente", "onda de calor", 
  "deslizamento", "epidemia", "maremoto", "vulcão", "incêndio", "seca", 
  "vírus", "doenças", "golpes", "segurança", "apocalipse", "luzes no céu"
];

// --- STORE PROVIDER ---

export function StoreProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem("verifica_prefs");
    return saved ? JSON.parse(saved) : {
      onboardingCompleted: false,
      selectedTags: [],
      region: "",
      sensitivity: "all",
      textSize: "normal",
      highContrast: false,
    };
  });

  const [feed, setFeed] = useState<NewsItem[]>([]);
  const [sources, setSources] = useState<Source[]>(MOCK_SOURCES);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem("verifica_prefs", JSON.stringify(preferences));
    // Apply visual preferences to document body
    document.documentElement.classList.toggle("dark", preferences.highContrast);
    document.documentElement.style.fontSize = 
      preferences.textSize === "large" ? "20px" : 
      preferences.textSize === "extra_large" ? "24px" : "16px";
  }, [preferences]);

  // Simulate Fetching Data
  const refreshFeed = () => {
    setIsLoading(true);
    setTimeout(() => {
      // Filter mock news based on prefs could happen here, but for now return all
      // In a real app, we'd fetch RSS here
      setFeed(MOCK_NEWS);
      setIsLoading(false);
    }, 1500);
  };

  useEffect(() => {
    refreshFeed();
  }, []);

  const updatePreferences = (newPrefs: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPrefs }));
  };

  const toggleTag = (tag: string) => {
    setPreferences(prev => {
      const exists = prev.selectedTags.includes(tag);
      return {
        ...prev,
        selectedTags: exists 
          ? prev.selectedTags.filter(t => t !== tag) 
          : [...prev.selectedTags, tag]
      };
    });
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
