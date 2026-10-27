import test from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES } from "../../shared/categories";
import {
  analyzeNews, cleanNewsContent, validateDraft, parseModelJson,
  NEWS_AI_MODEL, THEME_AI_MODEL, generationSchema, type JsonModelCall,
} from "./news-analysis";

const source = { title:"80 injured after bus plunges down embankment near Barcelona",
  content:"80 injured after bus plunges down embankment near Barcelona", isPortuguese:false };
const summary = {
  titulo_traduzido:"80 feridos após ônibus cair em barranco perto de Barcelona",
  fatos:[{texto:"Um ônibus caiu em um barranco perto de Barcelona, deixando 80 feridos.",trecho_fonte:source.content}],
};
const classification = {temas:[{id:"acidente_transporte",trecho_fonte:source.content}]};
const draft = {...summary,...classification};
const approved = JSON.stringify({aprovado:true,motivo:"Todas as afirmações constam da fonte."});
function mockCall(options: {summary?:object; themes?:object; audit?:string} = {}): {call:JsonModelCall;models:string[]} {
  const models: string[]=[];
  const call:JsonModelCall=async (model,prompt)=>{
    models.push(model);
    if(prompt.startsWith("Extraia")) return JSON.stringify(options.summary??summary);
    if(prompt.startsWith("Classifique")) return JSON.stringify(options.themes??classification);
    return options.audit??approved;
  };
  return {call,models};
}

test("real RSS: strips G1 related headlines without losing primary article or numbers",()=>{
  // Excerpt from the captured real G1 RSS, 2026-10-26:
  // https://g1.globo.com/pr/norte-noroeste/noticia/2026/10/26/ribeirao-transborda-cobre-totalmente-ponte-no-parana-e-caminhao-fica-preso-em-meio-a-agua.ghtml
  const body="A ponte da PR-554, em Doutor Camargo, no Norte do Paraná, amanheceu submersa em água nesta segunda-feira (26).\nPor conta das chuvas, cerca de 84 residências da região ficaram sem energia elétrica, de acordo com a Companhia Paranaense de Energia (Copel).";
  const noisy=body+"\nLeia também:\n'Tristeza, angústia, raiva', diz familiar sobre acidente com motorista bêbado que matou pai, mãe e três filhos no Paraná";
  assert.equal(cleanNewsContent(noisy),body);
  assert.equal(cleanNewsContent("<p>Ponte &amp; rio: 84 casas.</p><h2>Leia também:</h2><p>Guerra!</p>"),"Ponte & rio: 84 casas.");
  assert.equal(cleanNewsContent("Alerta\n✅ Clique aqui para seguir o canal do g1 no WhatsApp\nAgora no g1\n69 municípios"),"Alerta\n69 municípios");
  assert.equal(cleanNewsContent("Um morador disse: leia também o aviso.\nTexto principal."),"Um morador disse: leia também o aviso.\nTexto principal.");
});

test("role routing: only theme selection uses 3.5; summary and grounding stay on 2.5",async()=>{
  const {call,models}=mockCall();
  const result=await analyzeNews(source,call);
  assert.deepEqual(models,[NEWS_AI_MODEL,THEME_AI_MODEL,NEWS_AI_MODEL]);
  assert.equal(NEWS_AI_MODEL,"gemini-2.5-flash");
  assert.equal(THEME_AI_MODEL,"gemini-3.5-flash-lite");
  assert.deepEqual(result?.themes,["acidente_transporte"]);
  assert.equal(result?.summary,summary.fatos[0].texto);
  assert.equal(result?.translatedTitle,summary.titulo_traduzido);
});

test("all canonical IDs survive exactly; no substring/name mapping",()=>{
  for(const theme of CATEGORIES.flatMap(c=>c.themes)) {
    const result=validateDraft({...draft,temas:[{id:theme.id,trecho_fonte:source.content}]},source);
    assert.equal(result.temas[0].id,theme.id);
  }
  for(const id of ["Guerra / Conflito","Chuva Severa / Enchente","desconhecido","guerra"]) {
    assert.throws(()=>validateDraft({...draft,temas:[{id,trecho_fonte:source.content}]},source));
  }
});

test("invalid, duplicated or too many themes never become keyword fallbacks",async()=>{
  for(const temas of [
    [{id:"Eclipse",trecho_fonte:source.content}],
    [classification.temas[0],classification.temas[0]],
    ["eclipse","asteroide_meteoro","tsunami","terremoto"].map(id=>({id,trecho_fonte:source.content})),
  ]) await assert.rejects(()=>analyzeNews(source,mockCall({themes:{temas}}).call));
  const empty=mockCall({themes:{temas:[]}});
  assert.equal(await analyzeNews(source,empty.call),null);
  assert.equal(empty.models.length,2); // not audited/published without matching themes
});

test("fabricated quote, missing translation and extra response fields rejected before audit",async()=>{
  assert.throws(()=>validateDraft({...draft,fatos:[{texto:"Socorro mobilizado.",trecho_fonte:"Rescue teams arrived."}]},source));
  const {titulo_traduzido,...missing}=draft;
  assert.throws(()=>validateDraft(missing,source));
  assert.throws(()=>validateDraft({...draft,temas_extra:["apagao"]},source));
  assert.throws(()=>parseModelJson('{"fatos":[]} trailing text'));
  assert.deepEqual(parseModelJson('```json\n{"ok":true}\n```'),{ok:true});
});

test("a real quote does not bypass semantic review; invented rescue and bad audit are blocked",async()=>{
  const invented={...summary,fatos:[{texto:"Equipes de socorro foram mobilizadas.",trecho_fonte:source.content}]};
  await assert.rejects(()=>analyzeNews(source,mockCall({summary:invented,audit:JSON.stringify({aprovado:false,motivo:"Socorro não informado."})}).call),/Revisão de fidelidade/);
  await assert.rejects(()=>analyzeNews(source,mockCall({audit:JSON.stringify({aprovado:"true",motivo:"inválido"})}).call));
});

test("model schema exposes canonical enum and separates the summary contract from themes",()=>{
  const schema=generationSchema(false) as {properties:Record<string,unknown>;required:string[]};
  assert.ok(schema.required.includes("titulo_traduzido"));
  assert.equal("temas" in schema.properties,false);
});
