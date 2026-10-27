import fs from "node:fs/promises";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { DIR, type Row } from "./source-material";
import { batchSql, type Change } from "./sql";
import { CATEGORIES } from "../../shared/categories";

const backup=JSON.parse(await fs.readFile(`${DIR}/backup.json`,"utf8"));
const rows:Row[]=backup.rows;
assert.equal(rows.length,200);
const decisions=await Promise.all(rows.map(async row=>{
  const d=JSON.parse(await fs.readFile(`${DIR}/decisions/${row.id}.json`,"utf8"));
  assert.equal(d.id,row.id);
  assert.equal(d.snapshotSha256,crypto.createHash("sha256").update(JSON.stringify(row)).digest("hex"));
  return d;
}));
// Manual review can only WITHHOLD an action, never invent a theme or approve an ungrounded summary.
let manualReviews:{id:string;decision:string;reason:string}[]=[];
try {manualReviews=JSON.parse(await fs.readFile(`${DIR}/manual-review.json`,"utf8"));}catch(e) {
  if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;
}
for(const hold of manualReviews) {
  assert.equal(hold.decision,"pending");
  const d=decisions.find(d=>d.id===hold.id);
  assert.ok(d&&hold.reason.trim());
  d.automaticDecision=d.decision;
  if(d.patch){d.automaticPatch=d.patch;delete d.patch;}
  d.manualReview=hold.reason;
  d.decision="pending";
  d.reason=hold.reason;
}
const corrections:Change[]=[],withdrawals:Change[]=[];
for(const d of decisions) {
  const row=rows.find(r=>r.id===d.id)!;
  if(d.decision==="correct") {
    assert.equal(d.audit.aprovado,true);
    assert.ok(d.patch.tags.length>0&&d.patch.tags.length<=3);
    assert.ok(d.material.url&&d.material.content);
    corrections.push({before:row,after:{...row,...d.patch}});
  }
  if(d.decision==="withdraw") {
    assert.equal(d.classification.temas.length,0);
    assert.equal(d.audit.aprovado,true);
    assert.ok(d.audit.motivo.trim());
    withdrawals.push({before:row});
  }
}
const files:Record<string,string>={
  "01-aplicar-correcoes.sql":batchSql(corrections,"correct"),
  "02-simular-retiradas.sql":batchSql(withdrawals,"withdraw"),
  "03-desfazer-correcoes.sql":batchSql(corrections,"restore-corrections"),
  "04-restaurar-retiradas.sql":batchSql(withdrawals,"restore-withdrawals"),
  "backup-200-noticias.json":JSON.stringify(backup,null,2),
  "propostas-e-evidencias.json":JSON.stringify({generatedAt:new Date().toISOString(),decisions},null,2),
};
const csvCell=(value:unknown)=>{
  let text=String(value??"");
  if(/^\s*[=+\-@]/.test(text))text="'"+text;
  return `"${text.replaceAll('"','""')}"`;
};
files["resumo-revisao.csv"]="\uFEFF"+[
  ["id","resultado","titulo_original","titulo_proposto","temas_atuais","temas_propostos","motivo","fonte","metodo_recuperacao"],
  ...decisions.map((d,i)=>[d.id,d.decision,rows[i].original_title,d.patch?.title??"",rows[i].tags.join("|"),d.patch?.tags.join("|")??"",d.reason,d.url,d.material?.method??""]),
].map(line=>line.map(csvCell).join(";")).join("\r\n");
const counts={selected:rows.length,correct:corrections.length,withdraw:withdrawals.length,
  pending:decisions.filter(d=>d.decision==="pending").length};
assert.equal(counts.correct+counts.withdraw+counts.pending,200);
const reasons=decisions.filter(d=>d.decision==="pending").reduce((a:Record<string,number>,d)=>(a[d.reason]=(a[d.reason]??0)+1,a),{});
const hashes=Object.fromEntries(Object.entries(files).map(([name,text])=>[name,crypto.createHash("sha256").update(text).digest("hex")]));
files["manifesto.json"]=JSON.stringify({generatedAt:new Date().toISOString(),environment:"production",applied:false,
  selectedAt:backup.selection.capturedAt,counts,pendingReasons:reasons,sha256:hashes,
  note:"Cópia somente das 200 notícias selecionadas, não um backup integral do banco. Nenhum SQL foi aplicado."},null,2);
for(const [name,text]of Object.entries(files))await fs.writeFile(`${DIR}/${name}`,text);
const escape=(v:unknown)=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const themeName=(ids:string[])=>ids.map(id=>CATEGORIES.flatMap(c=>c.themes).find(t=>t.id===id)?.name??id).join(", ")||"nenhum";
const label=(d:string)=>({correct:"Correção proposta",withdraw:"Retirada proposta",pending:"Pendente — sem alteração"}[d]??d);
const instructions=`IMPORTANTE: NADA FOI APLICADO E NENHUM CÓDIGO FOI PUBLICADO.

O banco de desenvolvimento não atualiza produção. Estes arquivos destinam-se ao banco de PRODUÇÃO.
Guarde primeiro backup-200-noticias.json e os arquivos de restauração fora do ambiente de trabalho.
O backup contém somente as 200 notícias deste lote, não o banco inteiro.

1. Leia o relatório e confira as propostas.
2. Para as correções validadas, execute 01-aplicar-correcoes.sql INTEIRO em uma única sessão no banco de produção.
   O script atualiza títulos, original_title, resumos, conteúdo-fonte, tags, primeira afirmação revisada na análise e notas.
   IDs, fontes, data da notícia e níveis de alerta são preservados. Níveis de alerta NÃO foram reavaliados.
3. Se houver conflito com dados que mudaram desde a cópia, a transação inteira aborta. Não remova as proteções.
4. 02-simular-retiradas.sql termina com ROLLBACK: simula e NÃO efetiva exclusões.
   O banco atual não tem arquivamento. Efetivar a retirada significa EXCLUIR FISICAMENTE as linhas.
   Só após conferir cada proposta e guardar o backup, substitua o ÚLTIMO ROLLBACK por COMMIT se desejar efetivá-las.
5. 03-desfazer-correcoes.sql reverte correções se as linhas ainda estiverem como este lote as deixou.
   04-restaurar-retiradas.sql reinsere as linhas retiradas, mas aborta se encontrar IDs com conteúdo diferente.
6. Notícias pendentes não entram nos scripts de correção nem retirada.

Os scripts só alteram dados. Não criam tabelas, não alteram esquema, não publicam código.
Execute cada arquivo inteiro; não execute comandos em sessões separadas.
Guarde os avisos de contagem retornados pelo PostgreSQL e confira o feed após a aplicação.
Repetir o mesmo script não reaplica alterações já concluídas.
`;
await fs.writeFile(`${DIR}/LEIA-ME.txt`,instructions);
files["LEIA-ME.txt"]=instructions;
const links=Object.entries(files).map(([name,text])=>{
  const mime=name.endsWith(".json")?"application/json":"text/plain";
  return `<a class="download" download="${escape(name)}" href="data:${mime};base64,${Buffer.from(text).toString("base64")}">${escape(name)}</a>`;
}).join("");
const details=decisions.map((d,i)=>{
  const row=rows[i];
  return `<details data-state="${escape(d.decision)}"><summary><span class="state ${escape(d.decision)}">${label(d.decision)}</span> ${escape(row.original_title||row.title)}</summary>
  <p><strong>ID:</strong> ${escape(row.id)} · ${escape(row.timestamp)}</p>
  <p><a href="${escape(row.original_url)}" target="_blank" rel="noopener noreferrer">Notícia original</a></p>
  <p><strong>Motivo:</strong> ${escape(d.reason)}${d.detail?` — ${escape(d.detail)}`:""}</p>
  <p><strong>Temas atuais:</strong> ${escape(themeName(row.tags))}</p>
  <p><strong>Resumo atual:</strong> ${escape(row.ai_summary||row.summary)}</p>
  ${d.decision==="correct"?`<h3>Após a correção proposta</h3><p><strong>${escape(d.patch.title)}</strong></p><p><strong>Temas:</strong> ${escape(themeName(d.patch.tags))}</p><pre>${escape(d.patch.ai_summary)}</pre>`:""}
  ${d.material?`<h3>Material recuperado da fonte</h3><p>${escape(d.material.sourceName)} · ${escape(d.material.method)} · capturado em ${escape(d.material.retrievedAt)}</p><pre>${escape(d.material.content)}</pre>`:""}
  ${d.audit?`<p><strong>Justificativa retornada pelo revisor de IA (pode conter erros):</strong> ${escape(d.audit.motivo||"Aprovada com suporte textual.")}</p>`:""}
  ${d.manualReview?`<p><strong>Conferência conservadora posterior:</strong> ${escape(d.manualReview)}</p>`:""}
  ${d.draft?`<details><summary>Afirmações e citações verificadas</summary><pre>${escape(JSON.stringify(d.draft,null,2))}</pre></details>`:""}
  </details>`;
}).join("");
const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Revisão das 200 notícias de produção — propostas</title>
<style>body{font:16px/1.6 system-ui,sans-serif;color:#162638;background:#f2f5f8;margin:0}main{max-width:1050px;margin:auto;padding:30px 20px}h1,h2,h3{line-height:1.25}h1{font-size:30px}h2{margin-top:32px}.notice{padding:16px;border-left:5px solid #205e9b;background:#e5f0fc}.danger{padding:16px;border-left:5px solid #aa4b00;background:#fff0dc}table{border-collapse:collapse;width:100%;background:white}th,td{border:1px solid #ccd6e2;text-align:left;padding:10px}details{background:white;padding:14px;border:1px solid #cdd8e5;border-radius:7px;margin:12px 0}summary{cursor:pointer;font-weight:600}.state{display:inline-block;font-size:12px;padding:2px 7px;border-radius:4px;margin-right:7px}.correct{background:#e1f2e9;color:#15583e}.withdraw{background:#ffebdf;color:#883a03}.pending{background:#edf0f4;color:#465267}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.6 ui-monospace,monospace;background:#f1f4f7;padding:13px}.download{display:block;background:white;border:1px solid #b9cde2;border-radius:5px;padding:10px 14px;margin:8px 0;color:#164f8b;text-decoration:none}a{color:#165a9a}small{color:#4c5e73}@media(max-width:600px){main{padding:20px 12px}h1{font-size:25px}th,td{padding:7px;font-size:13px}}</style></head><body><main>
<h1>Revisão das 200 notícias mais recentes de produção</h1>
<div class="notice"><strong>LOTE PREPARADO — NÃO APLICADO.</strong> Nenhum registro de produção ou desenvolvimento foi corrigido ou retirado. Nenhum código foi publicado. Os arquivos abaixo exigem aplicação manual em produção.</div>
<p>Seleção congelada em ${escape(backup.selection.capturedAt)}. As notícias foram ordenadas por data decrescente e ID. Novas publicações posteriores não entram neste lote.</p>
<table><thead><tr><th>Resultado</th><th>Quantidade</th></tr></thead><tbody>
<tr><td>Notícias selecionadas e copiadas</td><td>${counts.selected}</td></tr>
<tr><td>Correções com temas e resumo validados</td><td>${counts.correct}</td></tr>
<tr><td>Retiradas propostas: fora do catálogo, com revisão adicional</td><td>${counts.withdraw}</td></tr>
<tr><td>Pendências: nenhuma alteração proposta</td><td>${counts.pending}</td></tr></tbody></table>
<h2>Baixar o lote</h2><p>Este relatório é autocontido: os arquivos estão incorporados e podem ser baixados mesmo depois de salvar o HTML.</p>${links}
<h2>Aplicação e recuperação</h2><pre>${escape(instructions)}</pre>
<div class="danger"><strong>Retirada não é arquivamento:</strong> sem mudar o app, o banco atual não permite ocultar reversivelmente uma linha. O arquivo de retiradas só simula. Exclusão física exige decisão explícita após guardar o backup; a recuperação depende de executar a restauração. Remover dados de produção não impede que o código antigo volte a coletá-los no futuro.</div>
<h2>Método e limites</h2>
<ul><li>Gemini 3.5 Flash-Lite escolhe IDs de tema; Gemini 2.5 Flash gera os resumos e revisa a fidelidade. O 2.5 também precisa confirmar expressamente uma conclusão de ausência de temas antes de propor retirada.</li>
<li>Textos recuperados de RSS, metadados públicos ou JSON-LD das páginas originais. Metadados são trechos, não matérias completas. A fidelidade é ao trecho recebido, não uma checagem independente dos fatos.</li>
<li>Resumos antigos da IA não foram usados como fonte. Ausência de fonte, contexto insuficiente, falha do provedor, evidências inexistentes ou revisão negativa deixam o registro pendente.</li>
<li>Uma conferência conservadora pode suspender uma proposta automática de correção ou retirada. Ela nunca inventa um tema nem aprova um resumo rejeitado.</li>
<li>Respostas exigem IDs canônicos e citações literais; uma revisão semântica adicional precisa aprovar todas as afirmações. Essa checagem reduz erros, mas não garante ausência de erro.</li>
<li>O critério desta revisão é enquadramento nos temas e fidelidade factual. Níveis de alerta e a escala global do evento não foram reavaliados.</li>
<li>O novo full_content proposto guarda o trecho original recuperado. O ai_summary e summary guardam o resumo revisado. A análise antiga é substituída pela primeira afirmação revisada, sem opinião adicional.</li>
<li>As propostas não alteram usuários, sessões, fontes, esquema ou outras notícias. Cada script verifica a linha completa para impedir sobrescrever alterações posteriores.</li></ul>
<h2>Pendências por motivo</h2><table>${Object.entries(reasons).map(([r,n])=>`<tr><th>${escape(r)}</th><td>${n}</td></tr>`).join("")}</table>
<h2>Resultado individual</h2>${details}<p><small>Hashes SHA-256 dos arquivos no manifesto.json. O backup deve ser guardado antes de qualquer aplicação.</small></p>
</main></body></html>`;
await fs.writeFile(`${DIR}/relatorio-revisao-200.html`,html);
console.log(JSON.stringify({counts,pendingReasons:reasons,bytes:Buffer.byteLength(html),report:`${DIR}/relatorio-revisao-200.html`},null,2));
