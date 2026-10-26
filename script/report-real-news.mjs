import fs from "node:fs/promises";
import assert from "node:assert/strict";
import ts from "typescript";

const dir = "generated-artifacts/gemini-comparison-real";
const data = JSON.parse(await fs.readFile(`${dir}/raw-results.json`, "utf8"));
assert.equal(data.synthetic,false);
const source = await fs.readFile("shared/categories.ts","utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {CATEGORIES}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const themes=CATEGORIES.flatMap(c=>c.themes);
// Manual, non-blind editorial review. First four: predeclared fact bundles,
// 0 absent/wrong, 1 partial, 2 faithful. Fifth: unsupported event additions,
// 0 material, 1 minor, 2 none. General explanatory context is not automatically
// treated as an invented event.
const reviews = {
  "01":[
    [[2,2,2,2,2],"Preserva local, bloqueio sem previsão de liberação e números. Não afirma que a ponte desabou."],
    [[2,2,1,2,1],"Omite ausência de previsão de liberação e acrescenta isolamento das 20 chácaras, que a entrada só localiza nos arredores."],
  ],
  "02":[
    [[2,0,2,0,1],"Omite o decreto por 180 dias e a busca de auxílio federal; troca estiagem intensificada por El Niño por intensificação do fenômeno."],
    [[2,2,2,2,2],"Preserva decreto, números e o caráter ainda negociado do auxílio. Não o apresenta como benefício já pago."],
  ],
  "03":[
    [[2,2,1,1,2],"Preserva previsão e 69 municípios; omite limite do vento e janela semanal, e reduz mais de 80 mm a chegar a 80 mm."],
    [[2,2,1,1,2],"Preserva a natureza prevista, mas omite 60 km/h e faixa semanal de 20–60 mm."],
  ],
  "04":[
    [[2,2,2,2,2],"Preserva países, balanço do surto e 22 países em alerta, sem atribuir o total apenas à Nigéria."],
    [[2,2,2,2,1],"Preserva os números, mas chama a propagação de global; o trecho comprova expansão transfronteiriça, não mundial."],
  ],
  "05":[
    [[2,2,2,0,0],"Inventa investigação por autoridades locais e prestação de socorro; o RSS só informa ônibus, queda, local e 80 feridos."],
    [[2,2,2,0,0],"Inventa mobilização de equipes e atendimento médico no local, detalhes ausentes do RSS."],
  ],
  "06":[
    [[2,2,2,2,1],"Distingue a metáfora digital, mas chama o estilo de confronto de crucial, conclusão não demonstrada no trecho."],
    [[2,2,2,2,1],"Distingue a metáfora; acrescenta projeção nacional e qualifica a estratégia como bem-sucedida."],
  ],
  "07":[
    [[2,2,2,2,0],"Mantém a ausência de provas, mas chama Trump de ex-presidente, contrariando a identificação Presidente dos EUA no trecho."],
    [[2,2,2,2,2],"Mantém o cargo informado na fonte e a atribuição da alegação, sem apresentá-la como fraude comprovada."],
  ],
  "08":[
    [[2,2,2,2,2],"Resumo distingue Lua cheia e não afirma eclipse. A tag Eclipse está errada e é penalizada separadamente."],
    [[2,2,2,2,2],"Preserva Lua cheia, apelido e fim de semana. Explicação sazonal é contexto geral, não novo acontecimento."],
  ],
  "09":[
    [[2,2,2,2,1],"Preserva 27 dias e raios gama; acrescenta distância e explicação sobre morte de estrelas não explicitadas no trecho."],
    [[2,2,2,2,0],"Transforma comparação com Hulk em apelido e afirma todos os recordes anteriores de duração; o trecho não sustenta essa precisão."],
  ],
  "10":[
    [[2,2,2,2,2],"Preserva os efeitos como alegações da Força Aérea e as identidades não especificadas. Inclui um comentário metalinguístico desnecessário sobre a data."],
    [[1,2,2,1,0],"Apresenta destruição de veículos e baixas como fatos sem atribuí-los à Força Aérea; o trecho só traz essa alegação."],
  ],
  "11":[
    [[2,2,2,0,0],"Acrescenta guerra civil e desenvolvimentos na dinâmica de poder; o trecho não informa causa nem relação confirmada com confronto."],
    [[2,2,2,0,0],"Acrescenta agravamento da tensão geopolítica e riscos à área vizinha, consequências não informadas."],
  ],
  "12":[
    [[2,2,2,2,2],"Preserva dólar, interrupção da bolsa e condição apontada pelos analistas; não inventa medidas já adotadas."],
    [[2,2,2,2,1],"Preserva os dados, mas amplia estabilização dos mercados para recuperação econômica e impacto no custo de vida."],
  ],
};
const aliases={
  "Guerra / Conflito":"conflito_guerra", "Chuva Severa / Enchente":"chuva_enchente",
  "Tempestade Solar / Geomagnética":"tempestade_solar", "Seca Extrema":"onda_calor_seca",
  "Onda de Calor":"onda_calor_seca",
};
const unique=a=>[...new Set(a)];
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
const median=a=>{const s=[...a].sort((x,y)=>x-y);return (s[Math.floor((s.length-1)/2)]+s[Math.floor(s.length/2)])/2;};
const fmt=(n,d=1)=>n.toFixed(d).replace(".",",");
const esc=x=>String(x??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const themeNames=ids=>ids.map(id=>themes.find(t=>t.id===id)?.name??id).join(", ")||"nenhum";
const rows=data.results.map(row=>{
  const item=data.cases.find(c=>c.id===row.caseId);
  const [checks,note]=reviews[row.caseId][data.models.indexOf(row.model)];
  const actual=unique((row.summary.parsed?.temas??[]).map(n=>aliases[n]??themes.find(t=>t.name===n)?.id??`unknown:${n}`));
  const expected=unique([...item.themes,...actual.filter(id=>item.optionalThemes.includes(id))]);
  const tp=actual.filter(id=>expected.includes(id)).length;
  const f1=actual.length+expected.length?2*tp/(actual.length+expected.length):1;
  const exact=actual.length===expected.length && actual.every(id=>expected.includes(id));
  const usable=[
    typeof row.triage.parsed?.aprovado==="boolean",
    typeof row.summary.parsed?.resumo==="string" &&
      Array.isArray(row.summary.parsed?.temas) &&
      row.summary.parsed.temas.length<=3 &&
      row.summary.parsed.temas.every(n=>typeof n==="string") &&
      (item.language==="pt"||typeof row.summary.parsed.titulo_traduzido==="string"),
  ];
  const mapped=(row.summary.parsed?.temas??[]).map(n=>themes.find(t=>t.name.toLowerCase().includes(n.toLowerCase()))?.id).filter(Boolean);
  return {...row,expected:item,actual,f1,exact,usable,mapped,
    triageCorrect:row.triage.parsed?.aprovado===item.approved,
    review:{checks,note,score:checks.reduce((s,v)=>s+v,0)}};
});
const metrics=data.models.map(model=>{
  const a=rows.filter(r=>r.model===model);
  const calls=a.flatMap(r=>[r.triage,r.summary]);
  return {model,triageCorrect:a.filter(r=>r.triageCorrect).length,
    themesExact:a.filter(r=>r.exact).length,triage:10*avg(a.map(r=>+r.triageCorrect)),
    themes:10*avg(a.map(r=>r.f1)),summary:avg(a.map(r=>r.review.score)),
    format:10*avg(a.flatMap(r=>r.usable.map(Number))),
    validCalls:a.flatMap(r=>r.usable).filter(Boolean).length,
    medianMs:median(a.map(r=>r.triage.ms+r.summary.ms)),
    meanMs:avg(a.map(r=>r.triage.ms+r.summary.ms)),
    inputTokens:calls.reduce((s,r)=>s+(r.usage?.promptTokenCount??0),0),
    outputTokens:calls.reduce((s,r)=>s+(r.usage?.candidatesTokenCount??0),0),
    thoughtTokens:calls.reduce((s,r)=>s+(r.usage?.thoughtsTokenCount??0),0)};
});
assert.equal(rows.length,24);
assert.equal(data.cases.length,12);
for (const r of rows) {
  assert.equal(r.triage.modelVersion,r.model);
  assert.equal(r.summary.modelVersion,r.model);
  assert.ok(r.expected.url.startsWith("https://"));
  assert.equal(r.review.checks.length,5);
  assert.ok(r.review.checks.every(n=>Number.isInteger(n)&&n>=0&&n<=2));
  assert.ok(r.f1>=0&&r.f1<=1);
}
assert.deepEqual(metrics.map(m=>m.triageCorrect),[10,8]);
assert.deepEqual(metrics.map(m=>m.themesExact),[7,9]);
assert.deepEqual(metrics.map(m=>m.validCalls),[24,24]);
await fs.writeFile(`${dir}/evaluation.json`,JSON.stringify({rubric:"four predeclared facts × 0–2 plus unsupported assertions 0–2; human Agent review, non-blind",metrics,rows},null,2));
const gradeRows=[
  ["Triagem — aderência à política do app","triage"],
  ["Temas — F1 semântico médio","themes"],
  ["Resumo — cobertura e fidelidade","summary"],
  ["JSON consumível pelo código atual","format"],
].map(([label,key])=>`<tr><th>${label}</th>${metrics.map(m=>`<td>${fmt(m[key])}/10</td>`).join("")}</tr>`).join("");
const performanceRows=[
  ["Decisões corretas de triagem",m=>`${m.triageCorrect}/12`],
  ["Conjuntos de temas exatos (com opcionais aceitos)",m=>`${m.themesExact}/12`],
  ["Respostas JSON consumíveis",m=>`${m.validCalls}/24`],
  ["Mediana: Sentinela + resumo por notícia",m=>`${fmt(m.medianMs/1000,2)} s`],
  ["Média: Sentinela + resumo por notícia",m=>`${fmt(m.meanMs/1000,2)} s`],
  ["Tokens de entrada, 24 chamadas",m=>m.inputTokens],
  ["Tokens de saída, 24 chamadas",m=>m.outputTokens],
  ["Tokens de thinking reportados",m=>m.thoughtTokens],
].map(([label,value])=>`<tr><th>${label}</th>${metrics.map(m=>`<td>${value(m)}</td>`).join("")}</tr>`).join("");
const details=data.cases.map(c=>`<details><summary>${c.id}. ${esc(c.title)}</summary>
<p><a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">Abrir notícia na fonte</a> · ${esc(c.source)}</p>
<p>Publicação: ${esc(c.publishedAt)} · Captura do RSS: ${esc(c.retrievedAt)}</p>
<h3>Texto original recebido do RSS</h3><pre>${esc(c.content)}</pre>
<p><strong>Gabarito editorial anterior às chamadas:</strong> ${c.approved?"aprovar":"rejeitar"}; temas necessários: ${esc(themeNames(c.themes))}; opcionais aceitos: ${esc(themeNames(c.optionalThemes))}.</p>
<p>${esc(c.scenario)}</p><ol>${c.facts.map(f=>`<li>${esc(f)}</li>`).join("")}</ol>
${rows.filter(r=>r.caseId===c.id).map(r=>`<section><h3>${esc(r.model)}</h3>
<p>Triagem: ${r.triage.parsed?.aprovado?"aprova":"rejeita"} (${r.triageCorrect?"correta":"diverge do gabarito"}).
Temas: ${esc((r.summary.parsed?.temas??[]).join(", ")||"nenhum")}. F1: ${fmt(r.f1*10)} /10.</p>
<p>Resumo: <strong>${fmt(r.review.score)}/10</strong> = ${r.review.checks.join(" + ")}. ${esc(r.review.note)}</p>
<p>Temas que o mapeamento de nomes do app reconhece: ${esc(themeNames(r.mapped))}. Esta linha verifica somente o mapeamento, não simula publicação, filtros de data nem o portão por palavras-chave.</p>
<h4>Resposta bruta: Sentinela</h4><pre>${esc(r.triage.text)}</pre>
<h4>Resposta bruta: resumo/tradução/temas</h4><pre>${esc(r.summary.text)}</pre></section>`).join("")}</details>`).join("");
const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Teste com notícias reais — Gemini 2.5 × 3.5 Flash-Lite</title>
<style>body{margin:0;background:#f3f5f8;color:#172333;font:16px/1.6 system-ui,sans-serif}main{max-width:1000px;margin:auto;padding:32px 20px}h1,h2,h3{line-height:1.25}h1{font-size:30px}h2{margin-top:32px}table{width:100%;border-collapse:collapse;background:white}th,td{text-align:left;border:1px solid #d6dee7;padding:11px}thead{background:#e6edf5}th{font-weight:600}.callout{border-left:5px solid #2863a0;background:#e9f1fb;padding:16px}.warning{border-left:5px solid #b55c00;background:#fff2de;padding:16px}details{background:white;border:1px solid #d6dee7;border-radius:8px;padding:15px;margin:12px 0}summary{cursor:pointer;font-weight:650}section{border-top:2px solid #d6dee7;padding-top:10px;margin-top:22px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f2f5f8;padding:14px;font:13px/1.6 ui-monospace,monospace}a{color:#185a9d}small{color:#526070}@media(max-width:600px){main{padding:20px 12px}h1{font-size:25px}th,td{font-size:13px;padding:7px}}</style></head><body><main>
<h1>Gemini 2.5 Flash × Gemini 3.5 Flash-Lite</h1>
<p><strong>Teste com 12 notícias reais de RSS, não cenários inventados.</strong> G1, BBC, ONU News, Al Jazeera, The Guardian e Space.com. 48 chamadas efetivas, uma execução por notícia e modelo em cada etapa.</p>
<p>Início: ${esc(data.startedAt)} · Fim: ${esc(data.finishedAt)}.</p>
<div class="callout"><strong>Não houve vencedor absoluto.</strong> O 2.5 aderiu melhor à triagem restritiva do aplicativo; o 3.5 acertou mais conjuntos de temas. A avaliação editorial dos resumos ficou próxima, e ambos acrescentaram informações ausentes das entradas. Esta amostra não sustenta “o 3.5 é muito melhor em tudo”.</div>
<h2>Notas e resultados</h2><table><thead><tr><th>Critério</th><th>2.5 Flash</th><th>3.5 Flash-Lite</th></tr></thead><tbody>${gradeRows}</tbody></table>
<h2>Contagens, tempo e tokens</h2><table><thead><tr><th>Métrica</th><th>2.5 Flash</th><th>3.5 Flash-Lite</th></tr></thead><tbody>${performanceRows}</tbody></table>
<p>O 3.5 teve mediana ${fmt(100*(1-metrics[1].medianMs/metrics[0].medianMs))}% menor nesta execução. Não são medições de preço cobrado; tokens de modelos diferentes podem ter preços diferentes. Tempo de rede, infraestrutura e geração afetam os valores.</p>
<h2>O que mudou com notícias reais</h2><ul>
<li><strong>Lua do Caçador — BBC:</strong> o 2.5 rejeitou a curiosidade corretamente, mas, ao classificar isoladamente, atribuiu Eclipse. O 3.5 deixou os temas vazios corretamente, porém aprovou a notícia no Sentinela, contrariando o exemplo explícito do prompt que rejeita “Lua bonita hoje”.</li>
<li><strong>Explosão cósmica de 27 dias — Space.com:</strong> o 2.5 rejeitou o tema fora do catálogo, mas a etapa isolada de classificação marcou Tempestade Solar. O 3.5 não inventou essa tag, mas aprovou o evento fora dos cinco temas espaciais cadastrados.</li>
<li><strong>“Exército digital” — BBC Brasil:</strong> os dois entenderam a metáfora política, sem atribuir Guerra ou Ciberataque.</li>
<li><strong>Ônibus com 80 feridos perto de Barcelona — Al Jazeera:</strong> os dois reconheceram Acidente de Transporte, mas inventaram detalhes sobre atendimento ou investigação. O RSS recebido tinha somente uma frase.</li>
<li><strong>Fala de Trump sobre fraude — BBC Brasil:</strong> ambos rejeitaram a retórica no Sentinela, mas sugeriram Crise Diplomática na classificação isolada, embora o trecho não descreva ruptura. O 2.5 chamou Trump de ex-presidente, contrariando a fonte.</li>
<li><strong>Seca no Amapá — G1:</strong> o 3.5 preservou o decreto de emergência por 180 dias e a busca de auxílio; o 2.5 omitiu esses fatos importantes.</li></ul>
<h2>Critérios, gabarito e limites de interpretação</h2><ul>
<li>Decisões esperadas, temas necessários/opcionais e quatro conjuntos de fatos foram fixados antes das chamadas no arquivo de casos. O gabarito segue a política restritiva do app: não é uma afirmação de que notícias rejeitadas não tenham valor jornalístico.</li>
<li>Triagem = acertos/12 × 10. As decisões limítrofes são editoriais. O depósito de armas foi marcado como rejeitar por falta de contexto para confirmar confronto; ambos aprovaram. Se fosse aceito, ambos ganhariam um acerto, sem mudar a diferença entre modelos.</li>
<li>O crash foi marcado como aprovar porque o trecho informa interrupção real da bolsa, não só metáfora. Ambos o rejeitaram como discussão de mercado. A explosão cósmica foi marcada como fora do catálogo, apesar do interesse científico.</li>
<li>Temas = média do F1 por notícia × 10, com aliases semânticos para não confundir qualidade da IA com a falha de mapeamento do app. Opcionais só ampliam o gabarito quando previstos pelo modelo; temas obrigatórios continuam necessários. A comparação exata está na tabela de contagens. A categoria é inferida do tema; o prompt não pede IDs de categoria.</li>
<li>Resumo = quatro conjuntos de fatos, cada um com 0 (ausente/incorreto), 1 (parcial) ou 2 (fiel), mais 0 (adição material não sustentada), 1 (adição menor) ou 2 (nenhuma adição material). Revisão editorial manual do Agent, não cega nem independente; diferenças pequenas nessas notas não demonstram superioridade.</li>
<li>JSON = campos que o código atual precisa consumir, incluindo título traduzido nas cinco entradas em inglês. Não significa cumprimento perfeito de todo o contrato: houve campos nulos/omitidos no 2.5 e valores N/A de risco no 3.5 em rejeições.</li>
<li>As etapas foram chamadas isoladamente inclusive para notícias rejeitadas, para diagnosticar classificação e resumo. Esses erros posteriores não aconteceriam no fluxo normal após uma rejeição correta.</li></ul>
<h2>Problema do código que a troca de modelo não resolve</h2>
<div class="warning">O nome “Chuva Severa / Enchente” do prompt não coincide com “Chuva Forte / Enchente” no cadastro. O mesmo ocorre com “Guerra / Conflito” e “Conflito Armado / Guerra”. Isso pode perder o tema correto ou voltar às palavras-chave, mesmo quando a IA acertou.</div>
<p>Na notícia da ponte submersa, ambos sugeriram também Apagão e Acidente de Transporte, indevidos para o evento central: são 84 residências sem luz e um caminhão preso, não blackout massivo nem acidente coletivo. O RSS ainda contém manchetes de “Leia também”, que podem contaminar a análise. O mapeamento reconhece os dois temas adicionais e perde justamente Enchente. No ataque jordaniano, reconhece Terrorismo e perde Guerra. Verificação estática das respostas, sem publicação ou mudança de banco.</p>
<h2>Metodologia e limites</h2>
<p>Os textos vêm diretamente de feeds públicos das fontes cadastradas no app. Não foram usados os resumos já gerados no feed. Foram mantidos os trechos originais de RSS, inclusive chamadas e links relacionados presentes no texto. Alguns feeds entregam matéria longa; outros, só uma manchete. O relatório inclui as entradas integrais e os links abaixo. Fidelidade significa aderência ao trecho recebido, não checagem independente da veracidade da notícia.</p>
<p>O Sentinela recebeu título e os primeiros 500 caracteres da descrição, como no app. O resumo recebeu título e todo o trecho capturado. Os mesmos prompts do código foram usados com thinkingBudget: 0, temperatura padrão do serviço e sem seed fixa. Não mede a capacidade máxima com raciocínio ativado. As versões reportadas coincidiram com os nomes solicitados.</p>
<p>Seleção intencional de 12 casos, sete entradas em português e cinco em inglês; uma rodada, sem significância estatística. Não representa a taxa de erro de todo o feed e não isola totalmente tradução de resumo. Uma notícia da ONU é de 23 de outubro e foi incluída pelo conteúdo: filtros de idade, deduplicação, portão por palavras-chave e publicação não fazem parte deste teste dos modelos.</p>
<p><strong>Recomendação:</strong> não trocar o padrão somente por este teste. O 3.5 é candidato para extração de temas, mas seu Sentinela foi mais permissivo. Antes de decidir, alinhar os nomes/IDs de temas, exigir fidelidade ao trecho sem completar lacunas e repetir a avaliação em um lote maior. Nenhuma mudança no modelo padrão, nos prompts da aplicação ou nas notícias salvas foi feita.</p>
<small>Fontes dos prompts: server/services/rss-fetcher.ts. SHA-256: ${esc(data.sourceHash)}. Dados brutos e avaliação estão na mesma pasta deste relatório no workspace. Para refazer as chamadas pagas: script/benchmark-gemini.mjs; para recalcular este relatório sem chamadas: script/report-real-news.mjs.</small>
<h2>Entradas, links e respostas completas</h2>${details}</main></body></html>`;
await fs.writeFile(`${dir}/report.html`,html);
assert.ok(html.includes("https://g1.globo.com/"));
assert.equal((html.match(/<details>/g)??[]).length,12);
assert.equal((html.match(/<section>/g)??[]).length,24);
console.log(JSON.stringify({metrics,report:`${dir}/report.html`},null,2));
