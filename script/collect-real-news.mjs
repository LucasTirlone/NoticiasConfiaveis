import fs from "node:fs/promises";
import Parser from "rss-parser";

const dir = "generated-artifacts/gemini-comparison-real";
await fs.mkdir(dir, { recursive: true });
const parser = new Parser();
const response = await fetch(`https://${process.env.REPLIT_DEV_DOMAIN}/api/news?limit=100`);
if (!response.ok) throw new Error(`Feed API: ${response.status}`);
const news = await response.json();
if (!Array.isArray(news)) throw new Error("Unexpected feed API response");
const sources = [...new Map(news.flatMap(n=>n.sources??[]).map(s=>[s.rssUrl,s])).values()]
  .filter(s=>s.rssUrl && /bbc|guardian|g1|onu|al jazeera|space\.com/i.test(s.name));
const results = await Promise.all(sources.map(async source => {
  try {
    const res = await fetch(source.rssUrl, {signal:AbortSignal.timeout(30000)});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bytes = await res.arrayBuffer();
    const head = new TextDecoder().decode(bytes.slice(0,512));
    const charset = head.match(/encoding=["']([^"']+)/i)?.[1] ??
      res.headers.get("content-type")?.match(/charset=([^;\s]+)/i)?.[1] ?? "utf-8";
    const feed = await parser.parseString(new TextDecoder(charset).decode(bytes));
    return {source:source.name, rssUrl:source.rssUrl, retrievedAt:new Date().toISOString(),
      items:feed.items.map(item=>({
        title:item.title??"", url:item.link??"", publishedAt:item.isoDate??item.pubDate??null,
        content:(item.contentSnippet||item.content||item.summary||"").replace(/<[^>]*>?/gm,"").trim(),
      }))};
  } catch(error) {return {source:source.name,error:error.message};}
}));
await fs.writeFile(`${dir}/rss-snapshot.json`,JSON.stringify(results,null,2));
for (const r of results) {
  console.log(`\nSOURCE ${r.source} ${r.error??""}`);
  for (const [i,item] of (r.items??[]).slice(0,18).entries()) {
    console.log(JSON.stringify({index:i,...item,content:item.content.slice(0,1000)}));
  }
}
