import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import {
  buildSecondaryTagSimulationSql,
  prepareSecondaryThemeReview,
  type HistoricalDecision,
  type HistoricalReviewRow,
} from "./secondary-theme-batch";

const sourceDir = "generated-artifacts/production-news-review-200";
const outputDir = "generated-artifacts/secondary-theme-review";
const backup = JSON.parse(await fs.readFile(`${sourceDir}/backup.json`, "utf8"));
const decisionsFile = JSON.parse(await fs.readFile(`${sourceDir}/propostas-e-evidencias.json`, "utf8"));
const manifest = JSON.parse(await fs.readFile(`${sourceDir}/manifesto.json`, "utf8"));
assert.equal(manifest.applied, false, "A revisão-base deve continuar sem aplicação");
assert.equal(backup.rows.length, 200);

const decisions: HistoricalDecision[] = decisionsFile.decisions;
const byId = new Map(decisions.map(decision => [decision.id, decision]));
for (const row of backup.rows as HistoricalReviewRow[]) {
  const decision = byId.get(row.id);
  assert.ok(decision, `Decisão ausente para ${row.id}`);
  const snapshotSha256 = crypto.createHash("sha256").update(JSON.stringify(row)).digest("hex");
  const raw = JSON.parse(await fs.readFile(`${sourceDir}/decisions/${row.id}.json`, "utf8"));
  assert.equal(raw.snapshotSha256, snapshotSha256, `Cópia mudou para ${row.id}`);
}

const reviews = prepareSecondaryThemeReview(backup.rows, decisions);
const corrections = reviews.filter(review => review.status === "correction_proposed");
const proposedIds = new Set(corrections.map(review => review.id));
const sql = buildSecondaryTagSimulationSql(corrections.map(review => ({
  before: review.before,
  afterTags: review.proposedTags,
})));
const newsScreenshot = {
  title: "Número de mortos em ataque de homens armados no nordeste da Nigéria sobe para 62",
  status: "Não localizada na cópia congelada de 200 notícias; sem ID confirmado, nenhuma alteração é proposta.",
};

await fs.mkdir(outputDir, { recursive: true });
const csvCell = (value: unknown) => {
  const text = String(value ?? "");
  const safe = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};
const csv = "\uFEFF" + [
  ["id", "resultado", "titulo", "etiquetas_atuais", "etiquetas_propostas", "motivo", "fonte", "metodo"],
  ...reviews.map(review => [
    review.id,
    review.status,
    review.title,
    review.currentTags.join("|"),
    review.status === "correction_proposed" ? review.proposedTags.join("|") : "",
    review.reason,
    review.url,
    review.sourceMethod ?? "",
  ]),
].map(row => row.map(csvCell).join(";")).join("\r\n");

const payload = {
  generatedAt: new Date().toISOString(),
  sourceSnapshotCapturedAt: backup.selection.capturedAt,
  environment: "production-snapshot",
  applied: false,
  summary: {
    rowsWithIncendio: reviews.length,
    correctionProposals: corrections.length,
    pending: reviews.filter(review => review.status === "pending").length,
    unchanged: reviews.filter(review => review.status === "unchanged").length,
  },
  nigeriaScreenshotReference: newsScreenshot,
  corrections: corrections.map(review => ({
    id: review.id,
    title: review.title,
    url: review.url,
    sourceMethod: review.sourceMethod,
    currentTags: review.currentTags,
    proposedTags: review.proposedTags,
    reason: review.reason,
    before: review.before,
  })),
  otherIncendioRows: reviews.filter(review => !proposedIds.has(review.id)).map(review => ({
    id: review.id,
    title: review.title,
    url: review.url,
    sourceMethod: review.sourceMethod,
    currentTags: review.currentTags,
    status: review.status,
    reason: review.reason,
  })),
  note: "Propostas geradas apenas a partir do snapshot e das revisões já existentes. Nenhuma chamada de IA ou escrita em banco foi feita.",
};

const json = JSON.stringify(payload, null, 2);
const readme = `REVISÃO DE ETIQUETAS SECUNDÁRIAS

Este pacote é uma proposta para conferência. Nada foi aplicado ao banco e nenhum código foi publicado.
Base: cópia congelada das 200 notícias mais recentes, capturada em ${backup.selection.capturedAt}.
Nenhuma chamada adicional de IA foi feita para produzir este pacote.

O SQL incluído é somente uma simulação: compara a linha completa com a cópia, altera apenas tags dentro da transação e termina em ROLLBACK.
Ele não pode persistir alterações tal como está.

Foram encontradas ${reviews.length} notícias com a etiqueta incendio na cópia. Propostas automáticas conservadoras: ${corrections.length}.
Registros sem fonte/evidência suficiente ou com decisão ambígua permanecem sem alteração e aparecem como pendentes.

O caso da captura (ataque armado no nordeste da Nigéria, 62 mortos) não foi encontrado no snapshot congelado. A consulta de produção desta sessão não retornou dados autenticados; portanto, não foi possível confirmar o ID do registro nem preparar uma alteração para ele. O texto da captura foi incluído como teste automatizado, não como prova de identidade de um registro.
`;

const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const downloadLink = (name: string, mime: string, text: string) =>
  `<a download="${escapeHtml(name)}" href="data:${mime};base64,${Buffer.from(text).toString("base64")}">${escapeHtml(name)}</a>`;
const label = (status: string) => ({
  correction_proposed: "Correção proposta",
  pending: "Pendente — sem alteração",
  unchanged: "Sem alteração proposta",
}[status] ?? status);
const rowsHtml = reviews.map(review => `
  <article class="item">
    <h3>${escapeHtml(label(review.status))}: ${escapeHtml(review.title)}</h3>
    <p><strong>ID:</strong> ${escapeHtml(review.id)}</p>
    <p><strong>Etiquetas atuais:</strong> ${escapeHtml(review.currentTags.join(", "))}</p>
    ${review.status === "correction_proposed" ? `<p><strong>Proposta:</strong> ${escapeHtml(review.proposedTags.join(", "))}</p>` : ""}
    <p>${escapeHtml(review.reason)}</p>
    <p><strong>Origem do material:</strong> ${escapeHtml(review.sourceMethod ?? "indisponível")}</p>
    ${review.url ? `<p><a href="${escapeHtml(review.url)}" target="_blank" rel="noopener noreferrer">Abrir notícia original</a></p>` : ""}
  </article>`).join("");
const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Revisão de filtros secundários</title>
<style>
body{margin:0;background:#f2f5f9;color:#182637;font:16px/1.55 system-ui,sans-serif}
main{max-width:960px;margin:0 auto;padding:28px 18px}
h1{font-size:28px;line-height:1.2}.notice{background:#e5efff;border-left:5px solid #2866cf;padding:14px 16px;margin:18px 0}
.warning{background:#fff2de;border-left:5px solid #b76600;padding:14px 16px;margin:18px 0}
.summary{display:flex;flex-wrap:wrap;gap:10px}.metric{background:white;border:1px solid #d7e0ec;border-radius:8px;padding:12px 16px}
.item{background:white;border:1px solid #d7e0ec;border-radius:9px;padding:12px 16px;margin:12px 0}.item h3{font-size:17px;margin:2px 0 8px}
.downloads a{display:inline-block;margin:5px 8px 5px 0;padding:9px 12px;background:white;border:1px solid #b8c7d9;border-radius:6px;color:#15549a}
a{color:#15549a}small{color:#586a7d}
</style></head><body><main>
<h1>Revisão de filtros secundários</h1>
<div class="notice"><strong>Somente propostas — não aplicadas.</strong> Este pacote não alterou notícias nem escreveu em produção.</div>
<p>Revisão dos registros com a etiqueta <strong>incendio</strong> na cópia congelada de 200 notícias, capturada em ${escapeHtml(backup.selection.capturedAt)}. O relatório usa propostas e material de origem já disponíveis; não fez novas chamadas de IA.</p>
<div class="summary">
  <div class="metric"><strong>${reviews.length}</strong><br>notícias com incendio</div>
  <div class="metric"><strong>${corrections.length}</strong><br>correções propostas</div>
  <div class="metric"><strong>${payload.summary.pending}</strong><br>pendentes</div>
  <div class="metric"><strong>${payload.summary.unchanged}</strong><br>sem alteração proposta</div>
</div>
<div class="warning"><strong>Exemplo enviado:</strong> ${escapeHtml(newsScreenshot.title)}<br>${escapeHtml(newsScreenshot.status)}</div>
<h2>Baixar arquivos</h2>
<p class="downloads">
${downloadLink("revisao-tags-secundarios.csv", "text/csv", csv)}
${downloadLink("propostas-tags-secundarios.json", "application/json", json)}
${downloadLink("simulacao-tags-secundarios.sql", "text/plain", sql)}
${downloadLink("LEIA-ME.txt", "text/plain", readme)}
</p>
<p><strong>O SQL termina em ROLLBACK deliberadamente.</strong> Ele só permite conferir se as duas propostas ainda correspondem integralmente às linhas congeladas; não persiste alterações.</p>
<h2>Registros revisados</h2>
${rowsHtml}
<p><small>O lote completo e o backup original de 200 notícias permanecem separados. Nenhum conteúdo, resumo, data, nível de alerta ou fonte será alterado por esta proposta: somente tags estariam sujeitas à correção se o usuário autorizar uma etapa futura.</small></p>
</main></body></html>`;

await fs.writeFile(`${outputDir}/relatorio-tags-secundarios.html`, html);
await fs.writeFile(`${outputDir}/revisao-tags-secundarios.csv`, csv);
await fs.writeFile(`${outputDir}/propostas-tags-secundarios.json`, json);
await fs.writeFile(`${outputDir}/simulacao-tags-secundarios.sql`, sql);
await fs.writeFile(`${outputDir}/LEIA-ME.txt`, readme);
console.log(JSON.stringify({
  outputDir,
  summary: payload.summary,
  corrections: corrections.map(({ id, title, currentTags, proposedTags }) => ({ id, title, currentTags, proposedTags })),
  screenshotReference: newsScreenshot,
  sqlEndsWithRollback: /ROLLBACK;\s*$/.test(sql),
}, null, 2));
