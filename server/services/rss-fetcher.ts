import Parser from "rss-parser";
import { storage } from "../storage";
import type { InsertNewsItem } from "@shared/schema";

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
  "tempestade solar": ["solar storm", "tempestade solar", "ejeção de massa coronal", "cme"],
  "aurora boreal": ["aurora", "northern lights", "aurora boreal"],
  "terremoto": ["earthquake", "terremoto", "sismo"],
  "ciclone": ["cyclone", "ciclone", "hurricane", "furacão"],
  "chuva": ["rain", "chuva", "precipitação"],
  "enchente": ["flood", "enchente", "inundação"],
  "onda de calor": ["heat wave", "onda de calor", "calor extremo"],
  "incêndio": ["fire", "incêndio", "wildfire"],
  "vulcão": ["volcano", "vulcão", "erupção"],
  "vírus": ["virus", "vírus", "pandemic", "pandemia"],
  "epidemia": ["epidemic", "epidemia", "outbreak", "surto"],
};

function extractTags(text: string): string[] {
  const foundTags: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.some(kw => lowerText.includes(kw.toLowerCase()))) {
      foundTags.push(tag);
    }
  }
  
  return foundTags.length > 0 ? foundTags : ["geral"];
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
  const criticalTags = ["terremoto", "tsunami", "vulcão", "epidemia", "ciclone"];
  const warningTags = ["onda de calor", "enchente", "incêndio", "tempestade solar"];
  
  if (tags.some(t => criticalTags.includes(t))) return "critical";
  if (tags.some(t => warningTags.includes(t))) return "warning";
  return "info";
}

export async function fetchRSSFromSource(sourceId: string): Promise<void> {
  const source = await storage.getSource(sourceId);
  if (!source || !source.rssUrl) return;

  try {
    const feed = await parser.parseURL(source.rssUrl);
    
    for (const item of feed.items.slice(0, 5)) { // Limit to 5 most recent
      const title = item.title || "Sem título";
      const originalUrl = item.link || source.url;
      
      // Check for duplicates before inserting
      const existing = await storage.findNewsItemByUrlOrTitle(originalUrl, title);
      if (existing) {
        continue; // Skip duplicate
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

      await storage.createNewsItem(newsItem);
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
