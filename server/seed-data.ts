import { storage } from "./storage";
import type { InsertSource } from "@shared/schema";

export async function seedInitialData() {
  // Check if sources already exist
  const existing = await storage.getAllSources();
  if (existing.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

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
      name: "BBC News Brasil",
      url: "https://www.bbc.com/portuguese",
      rssUrl: "https://feeds.bbci.co.uk/portuguese/rss.xml",
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
      name: "Reuters Science",
      url: "https://www.reuters.com",
      rssUrl: "https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best",
      type: "media",
      trusted: true,
    },
  ];

  for (const source of initialSources) {
    try {
      await storage.createSource(source);
      console.log(`✓ Created source: ${source.name}`);
    } catch (error) {
      console.error(`✗ Failed to create source ${source.name}:`, error);
    }
  }

  console.log("Initial data seeded successfully!");
}
