// Read-only application-model verification. No server, storage or DB imports.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { GoogleGenAI } from "@google/genai";
import {
  analyzeNews, NEWS_AI_MODEL, buildGroundingPrompt, groundingSchema,
  parseModelJson, type JsonModelCall, type NewsInput, type NewsDraft,
} from "../server/services/news-analysis";

const dir="generated-artifacts/gemini-analysis-verification";
await fs.mkdir(dir,{recursive:true});
const cases=JSON.parse(await fs.readFile("generated-artifacts/gemini-comparison-real/cases.json","utf8"));
const ai=new GoogleGenAI({
  apiKey:process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions:{baseUrl:process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,apiVersion:"",timeout:90000},
});
const calls:object[]=[];
const call:JsonModelCall=async(model,prompt,schema)=>{
  let response;
  try {
    response=await ai.models.generateContent({
      model,contents:prompt,
      config:{thinkingConfig:{thinkingBudget:0},responseMimeType:"application/json",responseJsonSchema:schema},
    });
  } catch(e) {
    console.error(JSON.stringify({model,status:(e as {status?:number}).status,type:e instanceof Error?e.name:"unknown"}));
    throw e;
  }
  assert.equal(response.modelVersion,model);
  calls.push({model,modelVersion:response.modelVersion,usage:response.usageMetadata,text:response.text});
  return response.text??"";
};
const results:object[]=[];
let previous:{results:any[];calls:object[]}|undefined;
try {previous=JSON.parse(await fs.readFile(`${dir}/results.json`,"utf8"));} catch {}
if(previous) calls.push(...previous.calls);
for(const id of ["01","02","05","08","10","11"]) {
  const item=cases.find((c:any)=>c.id===id);
  const input:NewsInput={title:item.title,content:item.content,isPortuguese:item.language==="pt"};
  const saved=previous?.results.find(r=>r.id===id && !r.error && ("result" in r));
  let result=saved?.result??null, error:string|undefined;
  for(let attempt=0;!saved&&attempt<2;attempt++) {
    try {result=await analyzeNews(input,call);error=undefined;break;}
    catch(e) {error=e instanceof Error && e.message.startsWith("Revisão")?e.message:(e instanceof Error?e.name:"erro");}
  }
  results.push({id,url:item.url,title:item.title,result,error});
  console.log(JSON.stringify(results.at(-1)));
  await fs.writeFile(`${dir}/results.json`,JSON.stringify({results,calls},null,2));
  if(["01","02","05","10"].includes(id)) {
    assert.ok(result,`Expected grounded result for case ${id}: ${error}`);
    for(const theme of item.themes) assert.ok(result.themes.includes(theme),`Missing ${theme} on ${id}`);
    for(const theme of result.themes) assert.ok([...item.themes,...item.optionalThemes].includes(theme),`Unexpected ${theme} on ${id}`);
  } else assert.equal(result,null,`Case ${id} has no supported catalog theme`);
  if(id==="05"&&result) assert.doesNotMatch(result.summary,/socorro|investiga|autoridades|equipe|resgat/i);
}
const bus=cases.find((c:any)=>c.id==="05");
const busInput:NewsInput={title:bus.title,content:bus.content,isPortuguese:false};
const inventedDraft:NewsDraft={
  titulo_traduzido:"80 feridos após ônibus cair perto de Barcelona",
  fatos:[{texto:"Equipes de socorro foram mobilizadas e as autoridades investigam as causas.",trecho_fonte:bus.content}],
  temas:[{id:"acidente_transporte",trecho_fonte:bus.content}],
};
const audit=parseModelJson(await call(NEWS_AI_MODEL,buildGroundingPrompt(busInput,inventedDraft),groundingSchema)) as {aprovado:boolean;motivo:string};
assert.equal(audit.aprovado,false,"Invented rescue/investigation must be rejected");
results.push({adversarial:"Invented rescue and investigation with a real source quote",audit});
await fs.writeFile(`${dir}/results.json`,JSON.stringify({results,calls},null,2));
console.log(JSON.stringify({status:"passed",realCases:6,inventedClaimsRejected:true,calls:calls.length}));
