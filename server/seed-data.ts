import { storage } from "./storage";
import type { InsertSource } from "@shared/schema";

export async function seedInitialData() {
  // Get existing sources
  const existing = await storage.getAllSources();
  const existingNames = new Set(existing.map(s => s.name));

  const initialSources: InsertSource[] = [
    // --- ESPAÇO E ASTRONOMIA ---
    {
      name: "Space.com – NASA, Espaço e Astronomia",
      url: "https://www.space.com",
      rssUrl: "https://www.space.com/feeds.xml",
      type: "media",
      trusted: true,
    },
    {
      name: "Universe Today – Space & Astronomy News",
      url: "https://www.universetoday.com",
      rssUrl: "https://www.universetoday.com/feed/",
      type: "media",
      trusted: true,
    },
    {
      name: "NASA Breaking News (Press Releases)",
      url: "https://www.nasa.gov",
      rssUrl: "https://www.nasa.gov/rss/breaking_news.rss",
      type: "official",
      trusted: true,
    },
    {
      name: "ESA Top News (Agência Espacial Europeia)",
      url: "https://www.esa.int",
      rssUrl: "https://www.esa.int/rssfeed/TopNews",
      type: "official",
      trusted: true,
    },
    {
      name: "EarthSky – Space",
      url: "https://earthsky.org",
      rssUrl: "https://earthsky.org/feed/",
      type: "media",
      trusted: true,
    },
    {
      name: "Phys.org – Space News",
      url: "https://phys.org",
      rssUrl: "http://feeds.phys.org/physics-news/space",
      type: "media",
      trusted: true,
    },
    {
      name: "AccuWeather – Space and Astronomy",
      url: "https://www.accuweather.com",
      rssUrl: "https://www.accuweather.com/rss/en/space-weather",
      type: "media",
      trusted: true,
    },

    // --- FENÔMENOS NATURAIS ---
    {
      name: "USGS Significant Earthquakes",
      url: "https://earthquake.usgs.gov",
      rssUrl: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.atom",
      type: "official",
      trusted: true,
    },
    {
      name: "NOAA / NWS Tsunami Warnings (NTWC)",
      url: "https://www.tsunami.gov",
      rssUrl: "https://www.tsunami.gov/events/xml/PAAQAtom.xml",
      type: "official",
      trusted: true,
    },
    {
      name: "GDACS – Ciclones (7 dias)",
      url: "https://gdacs.org",
      rssUrl: "https://gdacs.org/xml/rss_tc_7d.xml",
      type: "official",
      trusted: true,
    },
    {
      name: "NASA Earth Observatory – Natural Events",
      url: "https://earthobservatory.nasa.gov",
      rssUrl: "https://earthobservatory.nasa.gov/Feeds/NaturalEvents",
      type: "official",
      trusted: true,
    },
    {
      name: "Smithsonian/USGS Weekly Volcanic Activity Report",
      url: "https://volcano.si.edu",
      rssUrl: "https://volcano.si.edu/news/WeeklyVolcanoRSS.xml",
      type: "official",
      trusted: true,
    },
    {
      name: "USGS Volcano Hazards – U.S. Volcano Updates",
      url: "https://volcanoes.usgs.gov",
      rssUrl: "https://volcanoes.usgs.gov/rss/vhpcaprss.xml",
      type: "official",
      trusted: true,
    },
    {
      name: "NHC/NWS Hurricane RSS (Atlântico)",
      url: "https://www.nhc.noaa.gov",
      rssUrl: "https://www.nhc.noaa.gov/index-at.xml",
      type: "official",
      trusted: true,
    },
    {
      name: "NHC/NWS Hurricane RSS (Pacífico Leste)",
      url: "https://www.nhc.noaa.gov",
      rssUrl: "https://www.nhc.noaa.gov/index-ep.xml",
      type: "official",
      trusted: true,
    },

    // --- RISCOS BIOLÓGICOS E AMBIENTAIS ---
    {
      name: "Outbreak News Today – Infectious Disease News",
      url: "http://outbreaknewstoday.com",
      rssUrl: "http://outbreaknewstoday.com/feed/",
      type: "media",
      trusted: true,
    },
    {
      name: "CDC Emerging Infectious Diseases (EID) Journal",
      url: "https://wwwnc.cdc.gov/eid",
      rssUrl: "https://wwwnc.cdc.gov/eid/rss.xml",
      type: "official",
      trusted: true,
    },
    {
      name: "Wildfire Today – Incêndios Florestais",
      url: "https://wildfiretoday.com",
      rssUrl: "https://wildfiretoday.com/feed/",
      type: "media",
      trusted: true,
    },
    {
      name: "IAEA News (Nuclear Incidents)",
      url: "https://www.iaea.org",
      rssUrl: "https://www.iaea.org/feeds/topnews",
      type: "official",
      trusted: true,
    },
    {
      name: "UN Environment Programme – Pollution & Climate",
      url: "https://www.unep.org",
      rssUrl: "https://www.unep.org/rss.xml",
      type: "official",
      trusted: true,
    },

    // --- RISCOS TECNOLÓGICOS ---
    {
      name: "Reuters World News – Desastres e Acidentes",
      url: "https://www.reuters.com",
      rssUrl: "http://feeds.reuters.com/Reuters/worldNews",
      type: "media",
      trusted: true,
    },
    {
      name: "BBC News – Science & Environment",
      url: "https://www.bbc.com",
      rssUrl: "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
      type: "media",
      trusted: true,
    },
    {
      name: "The Hacker News – Cybersecurity",
      url: "https://thehackernews.com",
      rssUrl: "https://feeds.feedburner.com/TheHackersNews",
      type: "media",
      trusted: true,
    },
    {
      name: "Krebs on Security – Blog RSS",
      url: "https://krebsonsecurity.com",
      rssUrl: "https://krebsonsecurity.com/feed/",
      type: "media",
      trusted: true,
    },
    {
      name: "Aviation Safety Network – Aviation Occurrences",
      url: "https://aviation-safety.net",
      rssUrl: "http://feeds.feedburner.com/aviation-safety-network",
      type: "media",
      trusted: true,
    },
    {
      name: "Power Outage US – Electrical Grid Incidents",
      url: "https://poweroutage.us",
      rssUrl: "https://poweroutage.us/rss",
      type: "media",
      trusted: true,
    },

    // --- GEOPOLÍTICA E CONFLITOS ---
    {
      name: "BBC News – World",
      url: "https://www.bbc.com",
      rssUrl: "http://feeds.bbci.co.uk/news/world/rss.xml",
      type: "media",
      trusted: true,
    },
    {
      name: "The Guardian – World News",
      url: "https://www.theguardian.com",
      rssUrl: "https://www.theguardian.com/world/rss",
      type: "media",
      trusted: true,
    },
    {
      name: "Al Jazeera English – Top Stories",
      url: "https://www.aljazeera.com",
      rssUrl: "https://www.aljazeera.com/xml/rss/all.xml",
      type: "media",
      trusted: true,
    },

    // --- FONTES PORTUGUESAS (ORIGINAIS) ---
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
