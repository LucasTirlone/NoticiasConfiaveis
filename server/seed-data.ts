import { storage } from "./storage";
import type { InsertSource } from "@shared/schema";

export async function seedInitialData() {
  // Get existing sources
  const existing = await storage.getAllSources();
  const existingNames = new Set(existing.map(s => s.name));

  const initialSources: InsertSource[] = [
    {
      name: "NASA Space Weather",
      url: "https://www.nasa.gov",
      rssUrl: "https://www.nasa.gov/rss/dyn/breaking_news.rss",
      type: "official",
      trusted: true,
    },
    {
      name: "NOAA Weather",
      url: "https://www.noaa.gov",
      rssUrl: "https://www.weather.gov/rss/",
      type: "official",
      trusted: true,
    },
    {
      name: "NOAA - National Hurricane Center",
      url: "https://www.nhc.noaa.gov",
      rssUrl: "https://www.nhc.noaa.gov/index-at.xml",
      type: "media",
      trusted: true,
    },
    {
      name: "NOAA - Tsunami Warning (EUA)",
      url: "https://www.tsunami.gov",
      rssUrl: "https://ptwc.weather.gov/feeds/ptwc_rss.xml",
      type: "official",
      trusted: true,
    },
    {
      name: "USGS - Earthquakes (Serviço Geológico dos EUA)",
      url: "https://earthquake.usgs.gov",
      rssUrl: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.atom",
      type: "official",
      trusted: true,
    },
    {
      name: "CDC - Emerging Infectious Diseases (EUA)",
      url: "https://www.cdc.gov",
      rssUrl: "https://tools.cdc.gov/api/v2/resources/media/132608.rss",
      type: "media",
      trusted: true,
    },
    {
      name: "BBC News Brasil",
      url: "https://www.bbc.com/portuguese",
      rssUrl: "https://feeds.bbci.co.uk/portuguese/rss.xml",
      type: "media",
      trusted: true,
    },
    {
      name: "BBC News World",
      url: "https://www.bbc.co.uk",
      rssUrl: "http://feeds.bbci.co.uk/news/world/rss.xml",
      type: "media",
      trusted: true,
    },
    {
      name: "G1 - Globo",
      url: "https://g1.globo.com",
      rssUrl: "https://g1.globo.com/rss/g1/",
      type: "media",
      trusted: true,
    },
    {
      name: "Agência Brasil (Nacional)",
      url: "https://agenciabrasil.ebc.com.br",
      rssUrl: "https://agenciabrasil.ebc.com.br/rss/geral/feed.xml",
      type: "media",
      trusted: true,
    },
    {
      name: "ONU News (Nações Unidas - em Português)",
      url: "https://news.un.org/pt",
      rssUrl: "https://news.un.org/feed/subscribe/pt/news/all/rss.xml",
      type: "media",
      trusted: true,
    },
    {
      name: "The Guardian World",
      url: "https://www.theguardian.com",
      rssUrl: "https://www.theguardian.com/world/rss",
      type: "media",
      trusted: true,
    },
    {
      name: "ScienceDaily - Earth & Climate",
      url: "https://www.sciencedaily.com",
      rssUrl: "https://www.sciencedaily.com/rss/earth_climate.xml",
      type: "media",
      trusted: true,
    },
  ];

  let addedCount = 0;
  for (const source of initialSources) {
    if (existingNames.has(source.name)) {
      continue;
    }
    try {
      await storage.createSource(source);
      console.log(`✓ Created source: ${source.name}`);
      addedCount++;
    } catch (error) {
      console.error(`✗ Failed to create source ${source.name}:`, error);
    }
  }

  if (addedCount > 0) {
    console.log(`Added ${addedCount} new sources!`);
  } else {
    console.log("All sources already exist.");
  }
}
