// Offline, proposals only: no provider, network transport or database imports.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { CATEGORIES } from "../../shared/categories";
import { selectRecentPerTheme } from "./recent-theme-selection";

const inputDir = "generated-artifacts/production-news-review-200";
const outputDir = "generated-artifacts/contextual-theme-review";
const backup = JSON.parse(await fs.readFile(`${inputDir}/backup.json`, "utf8"));
const materials = JSON.parse(await fs.readFile(`${inputDir}/materials.json`, "utf8")).materials;
const manual: Array<{
  id: string; status: "correction_proposed" | "unchanged"; tags: string[]; reason: string;
  evidence?: Array<{id: string; trecho_fonte: string}>;
}> = JSON.parse(await fs.readFile(`${outputDir}/conferencia-editorial.json`, "utf8"));
const themeIds = CATEGORIES.flatMap(category => category.themes.map(theme => theme.id));
const allowed = new Set(themeIds);
const sample = selectRecentPerTheme<any>(backup.rows, themeIds);
const selectedIds = new Set(sample.selected.map(item => item.row.id));
assert.equal(new Set(manual.map(item => item.id)).size, manual.length, "Conferência duplicada");
assert.ok(manual.every(item => selectedIds.has(item.id)), "Conferência fora do recorte permitido");
const normalize = (text: string) => text.normalize("NFC").replace(/\s+/g, " ").trim();
const records = await Promise.all(sample.selected.map(async ({row, selectedFor}) => {
  const material = materials.find((item: any) => item.id === row.id);
  const previous = JSON.parse(await fs.readFile(`${inputDir}/decisions/${row.id}.json`, "utf8"));
  assert.equal(previous.snapshotSha256, crypto.createHash("sha256").update(JSON.stringify(row)).digest("hex"));
  const review = manual.find(item => item.id === row.id);
  const base = {
    id: row.id, title: row.original_title || row.title, timestamp: row.timestamp,
    selectedFor, currentTags: row.tags, before: row, material,
  };
  if (!review || !material?.url || !material?.content) return {
    ...base, status: "pending", proposedTags: null, evidence: [],
    reason: !material ? "Fonte original não recuperada; nenhuma alteração proposta."
      : "A fonte disponível não permite confirmar com segurança o enquadramento contextual de todos os temas; nenhuma alteração proposta.",
  };
  assert.ok(review.reason.trim());
  assert.ok(review.tags.length > 0 && review.tags.length <= 3);
  assert.equal(new Set(review.tags).size, review.tags.length);
  assert.ok(review.tags.every(tag => allowed.has(tag)));
  const evidence = review.evidence ?? review.tags.map(id => {
    const quote = previous.draft?.temas?.find((theme: any) => theme.id === id);
    assert.ok(quote, `Evidência ausente para ${row.id}/${id}`);
    return quote;
  });
  assert.equal(evidence.length, review.tags.length);
  assert.deepEqual([...evidence.map(item => item.id)].sort(), [...review.tags].sort());
  for (const item of evidence) {
    assert.ok(normalize(item.trecho_fonte));
    assert.ok(normalize(`${material.title}\n${material.content}`).includes(normalize(item.trecho_fonte)),
      `Citação não encontrada para ${row.id}/${item.id}`);
  }
  const sameTags = JSON.stringify([...row.tags].sort()) === JSON.stringify([...review.tags].sort());
  assert.equal(sameTags, review.status === "unchanged", `Estado incoerente para ${row.id}`);
  return {...base, status: review.status, proposedTags: review.tags, evidence, reason: review.reason};
}));
const payload = {
  generatedAt: new Date().toISOString(), applied: false, newGeminiCalls: 0,
  snapshotCapturedAt: backup.selection.capturedAt,
  scope: "Até duas notícias mais recentes por subfiltro dentro da cópia congelada disponível, ordenadas por data e ID; duplicatas por ID consolidadas.",
  limitation: "A cópia contém apenas 200 notícias. Não é possível afirmar que este recorte ainda seja o das duas mais recentes de toda a produção, nem completar subfiltros com menos de duas linhas na cópia. Não houve nova leitura de produção nesta etapa.",
  method: "Conferência editorial offline sobre material de editoras já recuperado; citações anteriores foram reutilizadas somente após essa conferência. Não é uma nova avaliação dos modelos.",
  taxonomy: CATEGORIES.map(category => ({
    id: category.id, name: category.name, guidance: category.editorialGuidance,
    themes: category.themes.map(theme => ({id: theme.id, name: theme.name, guidance: theme.editorialGuidance})),
  })),
  counts: {
    uniqueNews: records.length,
    correctionProposals: records.filter(item => item.status === "correction_proposed").length,
    unchanged: records.filter(item => item.status === "unchanged").length,
    pending: records.filter(item => item.status === "pending").length,
  },
  coverage: sample.perTheme,
  records,
};
const escape = (text: unknown) => String(text ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const json = JSON.stringify(payload, null, 2);
const csvCell = (value: unknown) => {
  const text = String(value ?? "");
  return `"${(/^\s*[=+\-@]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
};
const csv = "\uFEFF" + [
  ["id", "estado", "titulo", "selecionada_por", "temas_atuais", "temas_propostos", "motivo", "fonte"],
  ...records.map(item => [item.id, item.status, item.title, item.selectedFor.join("|"),
    item.currentTags.join("|"), item.proposedTags?.join("|") ?? "", item.reason, item.material?.url ?? ""]),
].map(line => line.map(csvCell).join(";")).join("\r\n");
const download = (name: string, mime: string, content: string) =>
  `<a download="${name}" href="data:${mime};base64,${Buffer.from(content).toString("base64")}">${name}</a>`;
const names = (ids: string[]) => ids.map(id => CATEGORIES.flatMap(category => category.themes)
  .find(theme => theme.id === id)?.name ?? id).join(", ");
const labels: Record<string, string> = {
  correction_proposed: "Correção proposta", unchanged: "Temas mantidos", pending: "Pendente — sem alteração",
};
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Conferência contextual dos filtros</title>
<style>body{margin:0;background:#f4f6f9;color:#17283b;font:16px/1.55 system-ui,sans-serif}main{max-width:1020px;margin:auto;padding:28px 20px}
h1,h2,h3{line-height:1.25}.notice{padding:16px;background:#e7f0ff;border-left:4px solid #2863b0}.warning{padding:16px;background:#fff0d9;border-left:4px solid #b87613}
article,details{margin:12px 0;padding:16px;background:#fff;border:1px solid #d2dce8;border-radius:6px}summary{cursor:pointer;font-weight:600}
pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f3f6fa;padding:12px;font:13px/1.5 monospace}
a{color:#195993}.downloads a{display:inline-block;margin:10px 12px 10px 0}.metrics{display:flex;flex-wrap:wrap;gap:15px;padding:15px 0}
.metrics span{background:white;border:1px solid #d2dce8;padding:12px}.muted{color:#53647a}li{margin:7px 0}</style></head><body><main>
<h1>Conferência contextual dos filtros</h1><p class="notice"><strong>Somente propostas.</strong> Nenhuma notícia foi modificada. Nenhum código foi publicado e nenhuma nova chamada Gemini foi feita nesta etapa.</p>
<p>Base disponível: cópia de 200 notícias capturada em ${escape(payload.snapshotCapturedAt)}. ${escape(payload.scope)}</p>
<p class="warning">${escape(payload.limitation)}</p><p>${escape(payload.method)}</p>
<div class="metrics"><span>${payload.counts.uniqueNews} notícias distintas</span><span>${payload.counts.correctionProposals} correções propostas</span>
<span>${payload.counts.unchanged} sem mudança de temas</span><span>${payload.counts.pending} pendentes</span></div>
<p>As propostas alterariam apenas etiquetas. Resumos, títulos, conteúdo, fontes, datas e níveis de alerta não foram reavaliados nem serão alterados por este pacote. Não há SQL de aplicação.</p>
<p class="downloads">${download("conferencia-contextual.json","application/json",json)}${download("conferencia-contextual.csv","text/csv",csv)}</p>
<details><summary>Cobertura por subfiltro</summary><ul>${sample.perTheme.map(item =>
  `<li>${escape(names([item.themeId]))}: ${item.ids.length}/2 na cópia disponível</li>`).join("")}</ul></details>
<details><summary>Referências editoriais de categorias e subfiltros</summary>${CATEGORIES.map(category =>
  `<h3>${escape(category.name)}</h3><p>${escape(category.editorialGuidance)}</p><ul>${category.themes.map(theme =>
    `<li><strong>${escape(theme.name)}:</strong> ${escape(theme.editorialGuidance)}</li>`).join("")}</ul>`).join("")}</details>
<h2>Resultado por notícia</h2>${records.map(item => `<article>
<h3>${escape(labels[item.status])}: ${escape(item.title)}</h3><p class="muted">${escape(item.timestamp)} · ${escape(item.id)}</p>
<p>Selecionada por: ${escape(names(item.selectedFor))}</p><p><strong>Temas atuais:</strong> ${escape(names(item.currentTags))}</p>
${item.proposedTags ? `<p><strong>Temas após a proposta:</strong> ${escape(names(item.proposedTags))}</p>` : ""}
<p>${escape(item.reason)}</p>${item.material ? `<details><summary>Material e evidências</summary>
<p>Origem: ${escape(item.material.method)} · recuperação: ${escape(item.material.retrievedAt)}</p>
<p><a href="${escape(item.material.url)}" target="_blank" rel="noopener noreferrer">Abrir fonte</a></p><pre>${escape(item.material.title)}\n\n${escape(item.material.content)}</pre>
<pre>${escape(JSON.stringify(item.evidence,null,2))}</pre></details>` : ""}</article>`).join("")}
</main></body></html>`;
await fs.mkdir(outputDir, {recursive: true});
await fs.writeFile(`${outputDir}/conferencia-contextual.json`, json);
await fs.writeFile(`${outputDir}/conferencia-contextual.csv`, csv);
await fs.writeFile(`${outputDir}/relatorio-contextual.html`, html);
console.log(JSON.stringify({outputDir, ...payload.counts, coverage:sample.perTheme.map(item => ({
  theme:item.themeId, count:item.ids.length,
}))}, null, 2));
