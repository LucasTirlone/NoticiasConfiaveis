// Generates downloadable proposals only. No connection to either database.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { batchSql } from "./sql";
import { digest, validateSupplement } from "./supplement-plan";
const dir = "generated-artifacts/production-news-review-98";
const parent = "generated-artifacts/production-news-review-200";
const backup = JSON.parse(await fs.readFile(`${dir}/backup.json`, "utf8"));
const previous = JSON.parse(await fs.readFile(`${dir}/previous-decisions.json`, "utf8")).decisions;
for (const [name, hash] of Object.entries(backup.selection.parentHashes)) {
  assert.equal(digest(await fs.readFile(`${parent}/${name}`, "utf8")), hash, "Lote anterior alterado");
}
const retrievals = JSON.parse(await fs.readFile(`${dir}/retrieval-audit.json`, "utf8"));
assert.equal(retrievals.length, 98);
assert.equal(new Set(retrievals.map((r: any) => r.id)).size, 98);
const decisions = await Promise.all(backup.rows.map(async (row: any) => {
  const d = JSON.parse(await fs.readFile(`${dir}/decisions/${row.id}.json`, "utf8"));
  const earlier = previous.find((p: any) => p.id === d.id);
  d.previousReason = earlier.reason;
  d.previousReviewedAt = earlier.reviewedAt;
  d.retrieval = retrievals.find((r: any) => r.id === d.id);
  assert.ok(d.retrieval);
  assert.equal(digest(await fs.readFile(d.retrieval.capturedFile, "utf8")), d.retrieval.capturedSha256);
  if (d.material) {
    assert.equal(digest(await fs.readFile(d.material.evidenceFile, "utf8")), d.material.evidenceSha256);
  }
  return d;
}));
let holds: any[] = [];
try { holds = JSON.parse(await fs.readFile(`${dir}/manual-holds.json`, "utf8")); }
catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
for (const hold of holds) {
  const d = decisions.find(d => d.id === hold.id);
  assert.ok(d && hold.reason?.trim());
  d.automaticDecision = d.decision;
  d.manualReview = hold.reason;
  if (d.patch) { d.automaticPatch = d.patch; delete d.patch; }
  d.decision = "pending"; d.reason = hold.reason;
}
// A cautious additional gate: never suggest withdrawal on partial material.
for (const d of decisions) {
  if (d.decision === "withdraw" && (d.material.excerpt || d.material.truncated)) {
    d.automaticDecision = d.decision; d.decision = "pending";
    d.reason = "Trecho parcial não comprova ausência de todos os temas na matéria completa";
  }
}
const { corrections, withdrawals } = validateSupplement(backup.rows, previous, decisions);
const counts = { selected: 98, correct: corrections.length, withdraw: withdrawals.length,
  pending: decisions.filter(d => d.decision === "pending").length };
assert.equal(counts.correct + counts.withdraw + counts.pending, 98);
const groupPredicates: [string, (d: any) => boolean][] = [
  ["missingSource", (d: any) => d.previousReason === "Fonte original indisponível"],
  ["insufficientEvidence", (d: any) => d.previousReason !== "Fonte original indisponível"],
];
const byOriginalGroup = Object.fromEntries(groupPredicates.map(([name, predicate]) => {
  const group = decisions.filter(predicate);
  return [name, { selected: group.length, correct: group.filter(d => d.decision === "correct").length,
    withdraw: group.filter(d => d.decision === "withdraw").length, pending: group.filter(d => d.decision === "pending").length }] as const;
}));
const escape = (v: unknown) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const instructions = `COMPLEMENTO DAS 98 PENDÊNCIAS — NADA APLICADO.

Este lote é separado do lote anterior de 200 notícias. Contém somente seus 98 registros pendentes.
Os outros 102 registros NÃO entram nestes scripts. Não houve consulta nem escrita no banco nesta revisão.
As cópias são as do instante congelado anterior, não um novo backup do estado atual de produção.

1. Guarde o ZIP inteiro, especialmente backup-98-noticias.json e 03-desfazer-correcoes.sql.
2. Confira no relatório cada fonte, trecho literal e justificativa antes de autorizar qualquer aplicação futura.
3. 01-aplicar-correcoes.sql foi apenas preparado. Sua execução futura exige decisão explícita e a sessão correta do banco de produção.
   Execute o arquivo inteiro em uma sessão: qualquer diferença na linha completa aborta toda a transação.
   Não remova verificações de conflito. Reexecução idêntica é idempotente.
4. 03-desfazer-correcoes.sql reverte somente se as linhas ainda forem exatamente as propostas por este lote.
5. 02-simular-retiradas.sql sempre termina em ROLLBACK. Não efetiva retirada nem arquivamento.
   O esquema atual só admite exclusão física; este trabalho NÃO autoriza efetuá-la.
6. 04-restaurar-retiradas.sql é a recuperação correspondente, caso uma retirada seja autorizada separadamente.
7. Pendências não entram nos scripts de correção nem retirada. Falta de prova não equivale a irrelevância.

IDs, datas, fontes, níveis de alerta e demais campos fora do escopo são preservados.
Sem alterações de esquema, usuários, sessões ou código do aplicativo. Nenhum deploy foi feito.
Os resumos são fiéis ao material citado, não uma verificação independente de todo fato alegado.
Metadados, linhas finas e RSS são trechos parciais, não o texto completo da matéria.
`;
const csvCell = (v: unknown) => {
  let s = String(v ?? ""); if (/^\s*[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replaceAll('"', '""')}"`;
};
const files: Record<string, string> = {
  "01-aplicar-correcoes.sql": batchSql(corrections, "correct"),
  "02-simular-retiradas.sql": batchSql(withdrawals, "withdraw"),
  "03-desfazer-correcoes.sql": batchSql(corrections, "restore-corrections"),
  "04-restaurar-retiradas.sql": batchSql(withdrawals, "restore-withdrawals"),
  "backup-98-noticias.json": JSON.stringify(backup, null, 2),
  "propostas-e-evidencias.json": JSON.stringify({ generatedAt: new Date().toISOString(), applied: false, decisions }, null, 2),
  "recuperacao-e-proveniencia.json": JSON.stringify(retrievals, null, 2),
  "LEIA-ME.txt": instructions,
  "resumo-revisao.csv": "\uFEFF" + [
    ["id", "resultado", "motivo_anterior", "motivo_novo", "titulo", "temas_propostos", "fonte", "metodo"],
    ...decisions.map(d => [d.id, d.decision, d.previousReason, d.reason,
      d.patch?.title ?? d.title, d.patch?.tags.join("|") ?? "", d.material?.url ?? d.url, d.material?.method ?? ""]),
  ].map(line => line.map(csvCell).join(";")).join("\r\n"),
};
const reasons = decisions.filter(d => d.decision === "pending").reduce((a: Record<string, number>, d) =>
  (a[d.reason] = (a[d.reason] ?? 0) + 1, a), {});
files["manifesto.json"] = JSON.stringify({ generatedAt: new Date().toISOString(), applied: false,
  productionQueried: false, productionWritten: false, codePublished: false, counts,
  byOriginalGroup,
  recoveredMaterials: decisions.filter(d => d.material).length, previousMissingSources: 61,
  originalSelectionAt: backup.selection.capturedAt, parentHashes: backup.selection.parentHashes,
  models: { themes: "gemini-3.5-flash-lite", summaryAndFidelity: "gemini-2.5-flash" },
  pendingReasons: reasons,
  sha256: Object.fromEntries(Object.entries(files).map(([n, t]) => [n, digest(t)])) }, null, 2);
for (const [name, text] of Object.entries(files)) await fs.writeFile(`${dir}/${name}`, text);
const downloads = Object.entries(files).map(([name, text]) =>
  `<a download="${name}" href="data:application/octet-stream;base64,${Buffer.from(text).toString("base64")}">${name}</a>`).join("");
const labels: Record<string, string> = { correct: "Correção proposta", withdraw: "Retirada apenas simulada", pending: "Pendente — sem alteração" };
const details = decisions.map(d => `<details><summary>${escape(labels[d.decision])} — ${escape(d.title)}</summary>
<p>ID: ${escape(d.id)}</p><p><b>Pendência anterior:</b> ${escape(d.previousReason)}</p>
<p><b>Resultado desta revisão:</b> ${escape(d.reason)}</p>
<p><a href="${escape(d.material?.url ?? d.url)}" target="_blank" rel="noopener noreferrer">Fonte pública</a></p>
${d.material ? `<p><b>Proveniência:</b> ${escape(d.material.method)} · ${escape(d.material.retrievedAt)}</p>
<p>${escape(d.material.identityRationale)}</p><p>Material ${d.material.excerpt || d.material.truncated ? "parcial" : "delimitado da página/boletim"}; a captura pode refletir atualização da mesma matéria.</p>
<pre>${escape(d.material.content)}</pre>` : `<p>${escape(d.retrieval.reason)}</p>`}
${d.patch ? `<h3>Correção proposta</h3><p>${escape(d.patch.title)}</p><p>Temas: ${escape(d.patch.tags.join(", "))}</p><pre>${escape(d.patch.summary)}</pre>` : ""}
${d.audit ? `<p><b>Revisão Gemini 2.5 Flash:</b> ${escape(d.audit.motivo)}</p>` : ""}
${d.manualReview ? `<p><b>Conferência conservadora:</b> ${escape(d.manualReview)}</p>` : ""}
${d.draft ? `<h3>Afirmações e trechos literais</h3><pre>${escape(JSON.stringify(d.draft, null, 2))}</pre>` : ""}
<p><b>SHA-256 da cópia congelada:</b> ${escape(d.snapshotSha256)}</p></details>`).join("");
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Revisão complementar das 98 notícias pendentes</title><style>
body{font:16px/1.6 system-ui,sans-serif;background:#f2f5f8;color:#183149;margin:0}main{max-width:1050px;margin:auto;padding:28px 20px}h1{font-size:29px;line-height:1.2}
.notice{padding:16px;border-left:5px solid #23669e;background:#e5effa}table{border-collapse:collapse;width:100%;background:white;margin:24px 0}td,th{padding:10px;border:1px solid #cad7e3;text-align:left}a{color:#15528a}nav a{display:block;background:white;padding:9px 14px;margin:7px 0;border:1px solid #cad7e3;border-radius:5px}
details{background:white;border:1px solid #cad7e3;padding:13px;margin:10px 0;border-radius:6px}summary{cursor:pointer;font-weight:600}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#eef2f6;padding:12px;font:13px/1.6 ui-monospace,monospace}
</style><main><h1>Revisão complementar das 98 notícias pendentes</h1>
<div class="notice"><b>LOTE ADICIONAL PREPARADO — NÃO APLICADO.</b> Nenhuma alteração em produção e nenhum código publicado.</div>
<p>Exatamente as 98 pendências do lote anterior: 61 fontes não recuperadas e 37 divergências de evidência, classificação ou fidelidade.
A seleção congelada em ${escape(backup.selection.capturedAt)} foi preservada; nenhuma notícia recente foi incluída no lugar.</p>
<table><tr><th>Resultado</th><th>Quantidade</th></tr>
<tr><td>Registros reavaliados</td><td>98</td></tr><tr><td>Correções propostas e validadas</td><td>${counts.correct}</td></tr>
<tr><td>Retiradas somente simuladas</td><td>${counts.withdraw}</td></tr><tr><td>Continuam pendentes, sem alteração</td><td>${counts.pending}</td></tr></table>
<h2>Resultado por grupo original</h2><table><tr><th>Grupo</th><th>Selecionadas</th><th>Correções</th><th>Pendentes</th></tr>
${Object.entries(byOriginalGroup).map(([name, group]) => `<tr><td>${name === "missingSource" ? "Fontes antes indisponíveis" : "Evidência, classificação ou fidelidade insuficientes"}</td><td>${group.selected}</td><td>${group.correct}</td><td>${group.pending}</td></tr>`).join("")}</table>
<h2>Baixar os arquivos</h2><p>Os arquivos estão incorporados neste HTML. O ZIP entregue separadamente inclui as capturas públicas brutas e os registros das chamadas aos modelos.</p><nav>${downloads}</nav>
<h2>Segurança e limites</h2><pre>${escape(instructions)}</pre>
<ul><li>Gemini 3.5 Flash-Lite somente escolhe temas. Gemini 2.5 Flash gera resumos e revisa a fidelidade, incluindo suporte dos temas.</li>
<li>Resumos antigos da IA nunca são fonte. Não foram usados login, credenciais de editoras ou métodos para contornar paywalls.</li>
<li>Boletins do NHC usam arquivo histórico com conferência de ciclone, número e horário em UTC. Gráficos sem edição histórica comprovada ficam pendentes.</li>
<li>Quando só havia linha fina, RSS ou metadados públicos, somente esse trecho foi utilizado. Ausência de temas em trecho parcial não autoriza retirada.</li>
<li>Sem comprovação, evidência literal ou aprovação semântica, o registro continua pendente. Níveis de alerta não foram reavaliados.</li>
<li>O SQL verifica a linha completa e usa transação e bloqueios. Alterações concorrentes abortam o lote inteiro, sem sobregravar dados recentes.</li></ul>
<h2>Pendências por motivo</h2><table>${Object.entries(reasons).map(([r, n]) => `<tr><td>${escape(r)}</td><td>${n}</td></tr>`).join("")}</table>
<h2>Os 98 resultados individuais</h2>${details}</main></html>`;
await fs.writeFile(`${dir}/relatorio-revisao-98.html`, html);
console.log(JSON.stringify({ counts, pendingReasons: reasons, reportBytes: Buffer.byteLength(html) }, null, 2));
