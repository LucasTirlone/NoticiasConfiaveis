import { storage } from "../storage";
import { fetchRSSFromSource } from "../services/rss-fetcher";
import { db } from "../../db";
import { newsItems } from "@shared/schema";

async function rework() {
  console.log("Iniciando retrabalho das notícias...");
  await db.delete(newsItems);
  console.log("Banco de notícias limpo.");
  
  const sources = await storage.getAllSources();
  for (const source of sources) {
    console.log(`Processando fonte: ${source.name}`);
    await fetchRSSFromSource(source.id);
  }
  
  console.log("Retrabalho concluído!");
  process.exit(0);
}

rework().catch(err => {
  console.error(err);
  process.exit(1);
});
