import Parser from "rss-parser";
import { storage } from "../storage";
import type { InsertNewsItem } from "@shared/schema";
import { GoogleGenAI } from "@google/genai";

const parser = new Parser();

interface RSSFeedItem {
  title?: string;
  link?: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
  guid?: string;
}

const TAG_KEYWORDS: Record<string, string[]> = {
  "tempestade solar": ["solar storm", "tempestade solar", "ejeção de massa coronal", "cme", "geomagnetic"],
  "aurora boreal": ["aurora", "northern lights", "aurora boreal", "aurora australis"],
  "terremoto": ["earthquake", "terremoto", "sismo", "magnitude", "richter"],
  "tsunami": ["tsunami", "maremoto"],
  "ciclone": ["cyclone", "ciclone", "hurricane", "furacão", "tufão", "typhoon"],
  "chuva forte": ["heavy rain", "chuva forte", "chuva intensa", "precipitação intensa", "temporal"],
  "enchente": ["flood", "enchente", "inundação", "alagamento", "flooding"],
  "onda de calor": ["heat wave", "onda de calor", "calor extremo", "hot weather"],
  "incêndio": ["fire", "incêndio", "wildfire", "queimada", "fogo florestal"],
  "vulcão": ["volcano", "vulcão", "erupção", "volcanic", "lava"],
  "vírus": ["virus", "vírus", "covid", "gripe", "influenza"],
  "epidemia": ["epidemic", "epidemia", "outbreak", "surto", "pandemia", "pandemic"],
  "deslizamento": ["landslide", "deslizamento", "desmoronamento", "mudslide"],
  "seca": ["drought", "seca", "estiagem"],
  "granizo": ["hail", "granizo", "chuva de pedra"],
  "tornado": ["tornado", "twister"],
  "nevasca": ["blizzard", "nevasca", "snowstorm", "tempestade de neve"],
  "radiação": ["radiation", "radiação", "nuclear", "radioativo"],
  "poluição": ["pollution", "poluição", "smog", "qualidade do ar", "air quality"],
  "maré alta": ["high tide", "maré alta", "ressaca", "storm surge"],
  "frio extremo": ["extreme cold", "frio extremo", "onda de frio", "cold wave", "freezing"],
};

function extractTags(text: string): string[] {
  const foundTags: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.some(kw => lowerText.includes(kw.toLowerCase()))) {
      foundTags.push(tag);
    }
  }
  
  if (foundTags.length === 0) {
    return ["chuva forte"];
  }
  
  return foundTags;
}

function calculateReliability(sourceType: "official" | "media" | "blog", sourceCount: number): {
  reliability: "high" | "medium" | "low" | "investigating";
  whyReliable: string;
} {
  if (sourceType === "official" && sourceCount >= 2) {
    return {
      reliability: "high",
      whyReliable: `Confirmado por ${sourceCount} fontes oficiais.`
    };
  } else if (sourceType === "official" || (sourceType === "media" && sourceCount >= 2)) {
    return {
      reliability: "high",
      whyReliable: sourceType === "official" 
        ? "Confirmado por fonte oficial governamental."
        : `Reportado por ${sourceCount} veículos de imprensa reconhecidos.`
    };
  } else if (sourceType === "media") {
    return {
      reliability: "medium",
      whyReliable: "Reportado por veículo de imprensa, aguardando confirmação oficial."
    };
  } else {
    return {
      reliability: "investigating",
      whyReliable: "Fonte independente, requer verificação adicional."
    };
  }
}

function determineAlertLevel(tags: string[]): "critical" | "warning" | "info" {
  const criticalTags = ["terremoto", "tsunami", "vulcão", "epidemia", "ciclone", "tornado"];
  const warningTags = ["onda de calor", "enchente", "incêndio", "tempestade solar", "deslizamento", "nevasca", "frio extremo"];
  
  if (tags.some(t => criticalTags.includes(t))) return "critical";
  if (tags.some(t => warningTags.includes(t))) return "warning";
  return "info";
}

async function generateAiSummary(title: string, content: string): Promise<string | null> {
  try {
    if (!process.env.AI_INTEGRATIONS_GEMINI_API_KEY || !process.env.AI_INTEGRATIONS_GEMINI_BASE_URL) {
      console.log("AI integration not configured, skipping summary generation");
      return null;
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      httpOptions: {
        apiVersion: "",
        baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
      },
    });

    const prompt = `Você é um jornalista brasileiro especializado em traduzir notícias complexas para linguagem simples e acessível.

Título da notícia: ${title}

Conteúdo original: ${content}

Por favor, crie um resumo muito claro e simples desta notícia em português brasileiro. O resumo deve:
- Ser fácil de entender por qualquer pessoa
- Explicar o que aconteceu de forma objetiva
- Ter no máximo 3 parágrafos curtos
- Evitar jargões técnicos
- Responder: O que? Onde? Quando? Por quê é importante?

Responda apenas com o resumo, sem introduções ou explicações adicionais.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || null;
  } catch (error) {
    console.error("Error generating AI summary:", error);
    return null;
  }
}

export async function fetchRSSFromSource(sourceId: string): Promise<void> {
  const source = await storage.getSource(sourceId);
  if (!source || !source.rssUrl) return;

  try {
    const feed = await parser.parseURL(source.rssUrl);
    
    for (const item of feed.items.slice(0, 5)) {
      const title = item.title || "Sem título";
      const originalUrl = item.link || source.url;
      
      const existing = await storage.findNewsItemByUrlOrTitle(originalUrl, title);
      if (existing) {
        continue;
      }
      
      const content = item.contentSnippet || item.content || item.summary || "";
      const tags = extractTags(`${title} ${content}`);
      const { reliability, whyReliable } = calculateReliability(source.type, 1);
      const alertLevel = determineAlertLevel(tags);

      const newsItem: InsertNewsItem = {
        title,
        summary: content.slice(0, 300) + (content.length > 300 ? "..." : ""),
        fullContent: content.slice(0, 1000),
        tags,
        timestamp: item.pubDate ? new Date(item.pubDate) : new Date(),
        reliability,
        alertLevel,
        sourceIds: [sourceId],
        verificationNotes: `Fonte: ${source.name}`,
        whyReliable,
        originalUrl,
      };

      const createdItem = await storage.createNewsItem(newsItem);
      
      const aiSummary = await generateAiSummary(title, content);
      if (aiSummary) {
        await storage.updateNewsItemAiSummary(createdItem.id, aiSummary);
      }
    }

    await storage.updateSourceLastFetched(sourceId);
  } catch (error) {
    console.error(`Error fetching RSS from ${source.name}:`, error);
  }
}

export async function fetchAllRSS(): Promise<void> {
  const allSources = await storage.getAllSources();
  const sourcesWithRSS = allSources.filter(s => s.rssUrl);
  
  for (const source of sourcesWithRSS) {
    await fetchRSSFromSource(source.id);
  }
}
