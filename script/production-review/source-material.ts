import fs from "node:fs/promises";
import Parser from "rss-parser";
import { cleanNewsContent } from "../../server/services/news-analysis";

export const DIR = "generated-artifacts/production-news-review-200";
export type Row = Record<string, any> & {id:string;original_url:string;original_title:string;timestamp:string;source_ids:string[]};
export type Material = {id:string;title:string;content:string;url:string;method:string;retrievedAt:string;sourceName:string;publishedAt?:string;truncated?:boolean};
const parser = new Parser();
export function articleUrl(raw:string):string {
  // Folha's RSS tracking wrapper contains the canonical publisher URL.
  const nested=raw.match(/\/\*(https?:\/\/.+)$/)?.[1];
  const u=new URL(nested??raw);
  for(const k of [...u.searchParams.keys()]) if(/^(utm_|at_|traffic_source|maca|campaign)/i.test(k))u.searchParams.delete(k);
  return `${u.hostname.replace(/^www\./,"")}${u.pathname.replace(/\/$/,"")}${u.search}`;
}
async function publicFetch(url:string):Promise<{text:string;url:string}> {
  const u=new URL(url);
  // Only frozen, public publisher URLs are inputs, never a user-supplied URL.
  if(!/^https?:$/.test(u.protocol) || u.username || u.password ||
    /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|\[|172\.(1[6-9]|2\d|3[01])\.)/i.test(u.hostname))throw Error("URL não pública");
  const r=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{"User-Agent":"Mozilla/5.0 (compatible; NewsReview/1.0)"}});
  if(!r.ok)throw Error(`HTTP ${r.status}`);
  const bytes=await r.arrayBuffer();
  if(bytes.byteLength>4_000_000)throw Error("Fonte grande demais");
  const head=new TextDecoder().decode(bytes.slice(0,500));
  const charset=head.match(/encoding=["']([^"']+)/i)?.[1]??r.headers.get("content-type")?.match(/charset=["']?([^;\s"']+)/i)?.[1]??"utf-8";
  return {text:new TextDecoder(charset).decode(bytes),url:r.url};
}
const plain=(s:string)=>cleanNewsContent(s).replace(/\s+/g," ").trim();
function metadata(html:string,key:string):string {
  for(const tag of html.match(/<meta\b[^>]*>/gi)??[]) {
    const attrs=Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m=>[m[1].toLowerCase(),m[2]??m[3]]));
    if(attrs.property===key||attrs.name===key)return plain(attrs.content??"");
  }
  return "";
}
function similarTitle(a:string,b:string):boolean {
  const tokens=(s:string)=>new Set(s.toLowerCase().normalize("NFD").replace(/\p{M}/gu,"").match(/[\p{L}\d]{3,}/gu)??[]);
  const x=tokens(a),y=tokens(b);
  return x.size>0 && [...x].filter(t=>y.has(t)).length/Math.min(x.size,y.size)>0.6;
}
export function extractPublisher(html:string,expectedTitle:string):{title:string;content:string;method:string;publishedAt?:string}|null {
  const ogTitle=metadata(html,"og:title")||metadata(html,"twitter:title");
  const articles:any[]=[];
  function visit(v:any) {
    if(!v||typeof v!=="object")return;
    if(Array.isArray(v)){v.forEach(visit);return;}
    if(v.articleBody && typeof v.articleBody==="string")articles.push(v);
    if(v["@graph"])visit(v["@graph"]);
  }
  for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try{visit(JSON.parse(m[1]));}catch{}
  }
  const article=articles.find(a=>similarTitle(a.headline??ogTitle,expectedTitle));
  if(article)return {title:plain(article.headline??ogTitle),content:cleanNewsContent(article.articleBody),method:"publisher_jsonld",publishedAt:article.datePublished};
  if(!ogTitle||!similarTitle(ogTitle,expectedTitle))return null;
  const description=metadata(html,"og:description")||metadata(html,"description")||metadata(html,"twitter:description");
  if(description.length<40)return null;
  return {title:ogTitle,content:description,method:"publisher_metadata_excerpt",publishedAt:metadata(html,"article:published_time")||undefined};
}
export async function collectMaterials():Promise<void> {
  const selection=JSON.parse(await fs.readFile(`${DIR}/selection.json`,"utf8"));
  const rows:Row[]=[];
  for(let i=0;i<200;i+=20)rows.push(...JSON.parse(await fs.readFile(`${DIR}/snapshot-${i}.json`,"utf8")));
  if(rows.length!==200||new Set(rows.map(r=>r.id)).size!==200||!selection.ids.every((id:string)=>rows.some(r=>r.id===id)))throw Error("Snapshot inválido");
  rows.sort((a,b)=>selection.ids.indexOf(a.id)-selection.ids.indexOf(b.id));
  await fs.writeFile(`${DIR}/backup.json`,JSON.stringify({selection,rows},null,2));
  const sources:any[]=JSON.parse(await fs.readFile(`${DIR}/sources.json`,"utf8"));
  const feeds:any[]=[];
  const materials:Material[]=[];
  const pending:{id:string;reason:string}[]=[];
  let nextSource=0;
  await Promise.all(Array.from({length:4},async()=>{
    while(nextSource<sources.length) {
      const source=sources[nextSource++];
      try {
        const raw=await publicFetch(source.rss_url);
        const feed=await parser.parseString(raw.text);
        feeds.push({source:source.id,retrievedAt:new Date().toISOString(),url:raw.url,
          items:feed.items.map(i=>({title:i.title,url:i.link,publishedAt:i.isoDate??i.pubDate,content:i.contentSnippet||i.content||i.summary||""}))});
      }catch(e){feeds.push({source:source.id,error:e instanceof Error?e.message:"Falha de recuperação"});}
    }
  }));
  await fs.writeFile(`${DIR}/publisher-feeds.json`,JSON.stringify(feeds,null,2));
  let cursor=0;
  await Promise.all(Array.from({length:4},async()=>{
    while(cursor<rows.length) {
      const row=rows[cursor++];
      const source=sources.find(s=>row.source_ids.includes(s.id));
      try {
        const entries=feeds.filter(f=>row.source_ids.includes(f.source)).flatMap(f=>f.items??[]);
        const match=entries.find(i=>i.url&&articleUrl(i.url)===articleUrl(row.original_url));
        let found:{title:string;content:string;method:string;publishedAt?:string}|null=null;
        let fetchedUrl=row.original_url;
        if(match && similarTitle(match.title??"",row.original_title??row.title))found={
          title:plain(match.title),content:cleanNewsContent(match.content),method:"publisher_rss",publishedAt:match.publishedAt,
        };
        if(!found?.content) {
          const raw=await publicFetch(row.original_url);
          if(articleUrl(raw.url)!==articleUrl(row.original_url))throw Error("Redirecionamento para outra página");
          fetchedUrl=raw.url;
          found=extractPublisher(raw.text,row.original_title??row.title);
        }
        if(!found?.content)throw Error("Texto original não recuperado com identificação suficiente");
        // Generic live bulletin URLs may have been reused for a later event.
        if(found.publishedAt) {
          const difference=Math.abs(Date.parse(found.publishedAt)-Date.parse(row.timestamp.replace(" ","T")+"Z"));
          if(Number.isFinite(difference)&&difference>6*3600000)throw Error("Data da fonte diverge; possível URL reutilizada");
        }
        const truncated=found.content.length>14000;
        materials.push({id:row.id,...found,content:found.content.slice(0,14000),url:fetchedUrl,sourceName:source?.name??"Fonte cadastrada",retrievedAt:new Date().toISOString(),truncated});
      }catch(e){pending.push({id:row.id,reason:e instanceof Error?e.message:"Falha na fonte"});}
      if((materials.length+pending.length)%20===0)console.log(JSON.stringify({recovered:materials.length,pending:pending.length,total:rows.length}));
    }
  }));
  const result={capturedAt:new Date().toISOString(),materials,pending};
  await fs.writeFile(`${DIR}/materials.json`,JSON.stringify(result,null,2));
  console.log(JSON.stringify({recovered:materials.length,pending:pending.length,backupRows:rows.length}));
}
