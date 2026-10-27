// Public evidence only. Never reads historical AI summaries as source material.
import fs from "node:fs/promises";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { cleanNewsContent } from "../../server/services/news-analysis";
import { extractPublisher, type Material, type Row } from "./source-material";

export const SUPPLEMENT = "generated-artifacts/production-news-review-98";
const parent = "generated-artifacts/production-news-review-200";
const plain = (s: string) => cleanNewsContent(s
  .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
  .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
  .replace(/\\([\\[\]*_])/g, "$1")
  .replace(/^[#*]+\s*/gm, "").replace(/\*\*/g, ""));
const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const { rows }: { rows: Row[] } = JSON.parse(await fs.readFile(`${SUPPLEMENT}/backup.json`, "utf8"));
const sources = JSON.parse(await fs.readFile(`${parent}/sources.json`, "utf8"));
const previous: Material[] = JSON.parse(await fs.readFile(`${parent}/materials.json`, "utf8")).materials;
const materials: any[] = [], pending: any[] = [], attempts: any[] = [];
for (const row of rows) {
  const path = `${SUPPLEMENT}/retrievals/${row.id}.json`;
  const raw = await fs.readFile(path, "utf8");
  const retrieval = JSON.parse(raw);
  let md: string = retrieval.response?.markdown ?? "";
  const host = new URL(row.original_url.replace(/^.*\/\*(https?:\/\/)/, "$1")).hostname;
  let title = row.original_title, text = "", method = "public_publisher_markdown";
  let url = retrieval.url, detail = "", excerpt = false;
  let evidenceFile = path, evidenceHash = sha(raw);
  try {
    if (host.includes("nhc.noaa.gov")) {
      if (row.original_title.includes("Graphics")) {
        throw Error("URL gráfica reutilizada: a captura mostra o cone atual, sem emissão histórica identificável. Arquivo gráfico público consultado, mas não comprova esta versão.");
      }
      evidenceFile = `${SUPPLEMENT}/retrievals/${row.id}-archive.json`;
      const archived = await fs.readFile(evidenceFile, "utf8");
      evidenceHash = sha(archived);
      const source = JSON.parse(archived);
      md = source.response.markdown;
      text = md.match(/```\s*([\s\S]*?)```/)?.[1]?.trim() ?? "";
      assert.ok(text.length > 150, "Boletim histórico não recuperado");
      const number = text.match(/(?:Number|NUMBER)\s+(\d+)/)?.[1];
      assert.equal(Number(number), source.number, "Número do boletim divergente");
      const date = text.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|MON|TUE|WED|THU|FRI|SAT|SUN)\s+Oct\s+(\d+)\s+2026/i);
      assert.ok(date, "Data do boletim não encontrada");
      const issued = text.match(/(\d{1,4})\s*(AM|PM)?\s+(UTC|CST|MST|AST)\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+Oct\s+(\d+)\s+2026/i);
      assert.ok(issued, "Hora de emissão não encontrada");
      let hours = Math.floor(Number(issued[1]) / 100), minutes = Number(issued[1]) % 100;
      if (issued[2]) hours = hours % 12 + (issued[2].toUpperCase() === "PM" ? 12 : 0);
      const offset = { UTC: 0, CST: 6, MST: 7, AST: 4 }[issued[3].toUpperCase()]!;
      const utc = Date.UTC(2026, 9, Number(issued[4]), hours + offset, minutes);
      const frozenTime = Date.parse(row.timestamp.replace(/Z$/, "") + "Z");
      assert.ok(Math.abs(utc - frozenTime) < 3600000, "Emissão diverge do instante congelado");
      assert.ok(text.includes(row.original_title.includes("Josephine") ? "AL102026" : "EP222026"));
      const declared = row.original_title.match(/Number (\d+)/)?.[1];
      if (declared) assert.equal(number, declared);
      url = source.archiveUrl;
      method = "public_nhc_historical_bulletin";
      detail = `Arquivo oficial: mesma bacia, ciclone, data e emissão ${number}. URLs refresh foram rejeitadas por exibirem boletins posteriores.`;
    } else if (host.includes("thehackernews.com")) {
      // Normal, unauthenticated GET of the same public article; no alternate/paywall endpoint.
      const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes(`content='${row.original_title.replaceAll("'", "&#39;")}'`) ||
        html.includes(row.original_title), "Título da página divergente");
      const body = html.split(/<div[^>]*id=['"]articlebody['"][^>]*>/i)[1]
        ?.split(/<div[^>]*class=['"](?:clear|cf|post-footer)/i)[0];
      assert.ok(body);
      text = [...body.matchAll(/<(p|li|h[23])(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)]
        .map(m => cleanNewsContent(m[2])).filter(Boolean).join("\n\n");
      assert.ok(text.length > 300);
      evidenceFile = `${SUPPLEMENT}/retrievals/${row.id}-public.html`;
      await fs.writeFile(evidenceFile, html);
      evidenceHash = sha(html);
      method = "public_publisher_html_articlebody";
      detail = "Corpo da matéria recuperado por GET público normal no URL original, sem autenticação.";
    } else if (host.includes("dw.com")) {
      if (url.includes("/live-")) throw Error("Cobertura ao vivo: captura truncada e múltiplas atualizações; edição histórica ainda não comprovada.");
      const firstImage = md.indexOf("Image:");
      assert.ok(firstImage >= 0, "Corpo identificado da DW não encontrado");
      const start = md.indexOf("\n\n", firstImage);
      text = md.slice(start).replace(/^\s*Advertisement\s*/, "")
        .split(/\n## (?:Explore more|Similar stories|More on )/)[0];
      text = text.replace(/## [^\n]+\n\nTo view this video[\s\S]*?\n\n\d\d:\d\d/g, "");
      detail = "Mesma página e identificador editorial; texto público até o início das recomendações. Título congelado preservado quando o cabeçalho foi atualizado.";
    } else if (host.includes("aljazeera.com")) {
      if (url.includes("/liveblog/")) throw Error("Cobertura ao vivo: o trecho recuperado não comprova a atualização histórica do título congelado.");
      const published = md.match(/Published On [^\n]+\n/);
      assert.ok(published, "Data e início editorial não recuperados");
      text = md.slice(md.indexOf(published[0]) + published[0].length)
        .replace(/## Recommended Stories[\s\S]*?end of list/, "")
        .split(/\n\* \* \*/)[0];
      detail = "Texto público da mesma matéria após data editorial, sem bloco de notícias recomendadas nem controles de áudio.";
    } else if (host.includes("bbc.")) {
      // Embedded advertising error pages can contain their own H1 before the BBC.
      const editorial = md.indexOf("[Skip to content]");
      if (editorial >= 0) md = md.slice(editorial);
      const heading = md.match(/^# (.+)$/m);
      if (!heading && url.includes("/weather/")) {
        assert.ok(md.includes("Lead Weather Presenter") && md.includes("Published"), "Identificação BBC Weather insuficiente");
        text = md.slice(md.indexOf("**")).split(/\n(?:## Related|\* \* \*)/)[0];
        excerpt = true;
      } else {
        assert.ok(heading, "Cabeçalho editorial não recuperado");
        title = plain(heading[1]);
        text = md.slice(md.indexOf(heading[0]) + heading[0].length)
        .split(/\n(?:### Explore More|\* \* \*|## Related|## More on this story)/)[0];
      }
      detail = "Mesma página com identificador editorial; navegação, vídeos recomendados e links isolados excluídos.";
    } else if (host.includes("theguardian.com")) {
      if (url.includes("/live/")) throw Error("Cobertura ao vivo: captura truncada; não usar atualizações posteriores como substitutas da seleção congelada.");
      const heading = md.match(/^# (.+)$/m);
      assert.ok(heading);
      title = plain(heading[1]);
      text = md.slice(md.indexOf(heading[0]) + heading[0].length)
        .split(/\n(?:## Explore more|Explore more on these topics|Most viewed|More on this story)/)[0];
      // First Thing is a roundup: only the headline's first story is evidence.
      if (url.includes("/first-thing-")) text = text.split(/\n## /)[0];
      detail = "Texto público da mesma matéria; no boletim First Thing, somente o primeiro assunto ligado ao título foi incluído.";
    } else if (host.includes("globo.com")) {
      const heading = md.match(/^# (.+)$/m);
      assert.ok(heading);
      title = plain(heading[1]);
      text = md.slice(md.indexOf(heading[0]) + heading[0].length)
        .split(/\n(?:Player\s*$|# A virada histórica|!\[Agora no g1|## (?:Veja os vídeos|Vídeos mais assistidos)|### Resumo do dia)/m)[0];
      detail = "Texto público da matéria original; módulos de vídeo ao vivo e recomendações excluídos.";
    } else if (host.includes("universetoday.com")) {
      text = md.split(/\n### \[/)[0];
      detail = "Texto público do mesmo URL; biografia do autor excluída.";
    } else if (host.includes("gdacs.org")) {
      throw Error("Relatório dinâmico do GDACS: comprova o evento, mas não a versão do alerta publicada no instante congelado.");
    } else if (host.includes("scmp.com")) {
      const heading = md.match(/^# (.+)$/m), deck = md.match(/^### (.+)$/m);
      assert.ok(heading && deck, "Cabeçalho público e linha fina não recuperados");
      title = plain(heading[1]); text = plain(deck[1]);
      method = "public_publisher_headline_deck"; excerpt = true;
      detail = "Somente título e linha fina públicos acima do corpo da matéria. Nenhum parágrafo do corpo ou conteúdo de assinatura usado.";
    } else if (host.includes("lemonde.fr")) {
      const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
      assert.equal(response.status, 200);
      const html = await response.text();
      // extractPublisher can see JSON-LD bodies, but only public meta tags are passed.
      const meta = (html.match(/<meta\b[^>]*>/gi) ?? []).join("\n");
      const found = extractPublisher(meta, row.original_title);
      assert.ok(found, "Metadados públicos com título correspondente não recuperados");
      title = found.title; text = found.content; method = "publisher_metadata_excerpt"; excerpt = true;
      evidenceFile = `${SUPPLEMENT}/retrievals/${row.id}-metadata.html`;
      await fs.writeFile(evidenceFile, meta);
      evidenceHash = sha(meta);
      detail = "Somente tags meta públicas; corpo e texto de assinatura ignorados.";
    } else {
      // Subscription publishers: use ONLY publisher RSS/metadata already captured,
      // not an extracted body that might be restricted.
      const earlier = previous.find(m => m.id === row.id);
      if (!earlier) throw Error("Corpo com restrição de acesso ou sem identificação; nenhum trecho público previamente comprovado. Não foi tentado contornar autenticação.");
      assert.ok(["publisher_rss", "publisher_metadata_excerpt"].includes(earlier.method));
      text = earlier.content; title = earlier.title; url = earlier.url;
      method = earlier.method; excerpt = true;
      evidenceFile = `${parent}/materials.json`;
      evidenceHash = sha(await fs.readFile(evidenceFile, "utf8"));
      detail = "Somente trecho público de RSS/metadados previamente capturado. Corpo extraído da página não usado; não houve login nem tentativa de acesso alternativo.";
    }
    if (method === "public_publisher_markdown") {
      text = text.split("\n").filter(line => !/^\s*(?:!\[|\[|Advertisement|Share$|Save$|Listen|Get instant|Yes, keep|notification-important)/.test(line)).join("\n");
      text = plain(text);
    }
    assert.ok(text.trim().length >= 80, "Texto público insuficiente");
    const truncated = text.length > 18000 || !!retrieval.response?.truncated;
    text = text.slice(0, 18000);
    const sourceName = sources.find((s: any) => row.source_ids.includes(s.id))?.name ?? host;
    const material = { id: row.id, title, content: text, url, method, sourceName,
      retrievedAt: retrieval.retrievedAt, truncated, excerpt, evidenceFile, evidenceSha256: evidenceHash,
      contentSha256: sha(text), identityRationale: detail };
    materials.push(material);
    attempts.push({ originalUrl: row.original_url, capturedFile: path,
      capturedSha256: sha(raw), result: "material", ...material, content: undefined });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    pending.push({ id: row.id, reason });
    attempts.push({ id: row.id, originalUrl: row.original_url, capturedFile: path,
      capturedSha256: sha(raw), result: "pending", reason });
  }
}
await fs.writeFile(`${SUPPLEMENT}/materials.json`, JSON.stringify({ capturedAt: new Date().toISOString(), materials, pending }, null, 2));
await fs.writeFile(`${SUPPLEMENT}/retrieval-audit.json`, JSON.stringify(attempts, null, 2));
console.log(JSON.stringify({ materials: materials.length, pending: pending.length }));
