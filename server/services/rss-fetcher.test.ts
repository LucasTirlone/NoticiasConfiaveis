import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

// Bundle the REAL fetcher and analysis code. Only storage, feed transport and
// provider calls are substituted: no test imports the DB or writes live data.
const state = { rows:[] as any[], calls:[] as string[], reject:false, invalid:false, empty:false };
// Dummy credentials live only in this isolated test process; the SDK is mocked.
process.env.AI_INTEGRATIONS_GEMINI_API_KEY = "isolated-test-only";
process.env.AI_INTEGRATIONS_GEMINI_BASE_URL = "https://example.test";
(globalThis as any).__newsTest = state;
const bundled=await build({
  entryPoints:["server/services/rss-fetcher.ts"], bundle:true, write:false, format:"esm", platform:"node",
  plugins:[{name:"isolated-rss",setup(b) {
    b.onResolve({filter:/^(?:\.\.\/storage|rss-parser|@google\/genai)$/},args=>({path:args.path,namespace:"mock"}));
    b.onLoad({filter:/.*/,namespace:"mock"},args=>{
      if(args.path==="../storage") return {contents:`export const storage={
        getSource:async()=>({id:"test",name:"Al Jazeera English – Top Stories",url:"https://example.test",rssUrl:"https://example.test/rss",type:"media"}),
        findNewsItemByOriginalTitleOrUrl:async()=>null,
        createNewsItem:async row=>{globalThis.__newsTest.rows.push(row);return {...row,id:"new"};},
        updateSourceLastFetched:async()=>{}
      };`};
      if(args.path==="rss-parser") return {contents:`export default class Parser {
        async parseString(){return {items:[{
          title:"80 injured after bus plunges down embankment near Barcelona",
          link:"https://example.test/bus",pubDate:new Date().toUTCString(),
          contentSnippet:"80 injured after bus plunges down embankment near Barcelona\\nLeia também:\\nGuerra e apagão"
        }]};}
      }`};
      return {contents:`export class GoogleGenAI {
        models={generateContent:async ({model,contents,config})=>{
          const s=globalThis.__newsTest;s.calls.push(model);
          if(contents.includes("Guerra e apagão")) throw Error("Related news leaked");
          const quote="80 injured after bus plunges down embankment near Barcelona";
          const data=contents.startsWith("# ROLE") ? {aprovado:true,nivel_de_risco:"Alerta"}
            : contents.startsWith("Extraia") ? {titulo_traduzido:"80 feridos após ônibus cair perto de Barcelona",
                fatos:[{texto:"Um ônibus caiu perto de Barcelona, deixando 80 feridos.",trecho_fonte:quote}]}
            : contents.startsWith("Classifique") ? {temas:s.empty?[]:[{id:s.invalid?"Acidente de Transporte":"acidente_transporte",trecho_fonte:quote}]}
            : {aprovado:!s.reject,motivo:s.reject?"Acréscimo não sustentado":"Fiel"};
          return {text:JSON.stringify(data)};
        }};
      }`};
    });
  }}],
});
const {fetchRSSFromSource}=await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
const originalFetch=globalThis.fetch;
async function run(options:{reject?:boolean;invalid?:boolean;empty?:boolean}={}) {
  Object.assign(state,{rows:[],calls:[],reject:false,invalid:false,empty:false},options);
  globalThis.fetch=(async()=>new Response("<rss/>",{headers:{"content-type":"text/xml"}})) as typeof fetch;
  try {await fetchRSSFromSource("test");} finally {globalThis.fetch=originalFetch;}
}
test("publishes once, only after canonical tags, translation and fidelity pass; no keyword gate",async()=>{
  await run();
  assert.equal(state.rows.length,1);
  assert.deepEqual(state.calls,["gemini-2.5-flash","gemini-2.5-flash","gemini-3.5-flash-lite","gemini-2.5-flash"]);
  const row=state.rows[0];
  assert.deepEqual(row.tags,["acidente_transporte"]);
  assert.equal(row.aiSummary,row.summary);
  assert.match(row.title,/80 feridos/);
  assert.ok(!row.fullContent.includes("Leia também"));
  assert.ok(!row.fullContent.includes("Guerra"));
  assert.ok(row.fullContent.includes("Barcelona"));
});
test("audit refusal leaves zero provisional/partial rows, even after retry",async()=>{
  await run({reject:true});
  assert.equal(state.rows.length,0);
  assert.equal(state.calls.filter(m=>m==="gemini-3.5-flash-lite").length,2);
});
test("invalid display-name tags and empty classification never publish keyword tags",async()=>{
  await run({invalid:true});assert.equal(state.rows.length,0);
  await run({empty:true});assert.equal(state.rows.length,0);
});
