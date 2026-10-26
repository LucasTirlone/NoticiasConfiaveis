// Isolated API benchmark. Does not import the server, connect to the DB, or write news.
import fs from "node:fs/promises";
import crypto from "node:crypto";
import ts from "typescript";
import { GoogleGenAI } from "@google/genai";

const source = await fs.readFile("server/services/rss-fetcher.ts", "utf8");
const ast = ts.createSourceFile("rss-fetcher.ts", source, ts.ScriptTarget.Latest, true);
function initializer(name) {
  let value;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) {
      value = node.initializer?.getText(ast);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (!value) throw new Error(`App prompt missing: ${name}`);
  return value;
}
// Evaluate only trusted template expressions extracted from the app's own code.
const sentinel = new Function(`return ${initializer("SENTINELA_PROMPT")}`)();
const summaryPrompt = new Function("isPortuguese", "title", "content",
  `const TEMAS_POR_CATEGORIA = ${initializer("TEMAS_POR_CATEGORIA")};
   return ${initializer("prompt")};`);

const casesPath = process.argv[2] ?? "generated-artifacts/gemini-comparison-real/cases.json";
const output = process.argv[3] ?? "generated-artifacts/gemini-comparison-real";
const cases = JSON.parse(await fs.readFile(casesPath, "utf8"));
await fs.mkdir(output, { recursive: true });
const models = ["gemini-2.5-flash", "gemini-3.5-flash-lite"];
const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
    apiVersion: "",
    timeout: 90000,
  },
});
const report = {
  startedAt: new Date().toISOString(),
  synthetic: !cases.every(c => c.url && c.source && c.retrievedAt),
  models,
  sourceHash: crypto.createHash("sha256").update(source).digest("hex"),
  config: { thinkingConfig: { thinkingBudget: 0 } },
  methodology: "Same app prompts, 500-character Sentinel excerpt, all cases tested in both stages even if rejected. Two models called concurrently; cases sequential. One run per case; no app/DB mutation.",
  cases,
  results: [],
};
async function call(model, stage, contents) {
  const start = performance.now();
  try {
    const response = await ai.models.generateContent({
      model, contents, config: report.config,
    });
    const text = response.text ?? "";
    let parsed = null;
    try { parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? ""); } catch {}
    return {
      model, stage, ms: Math.round(performance.now() - start),
      modelVersion: response.modelVersion, text, parsed, usage: response.usageMetadata,
    };
  } catch (error) {
    // Do not serialize SDK errors, which might contain request configuration.
    return { model, stage, ms: Math.round(performance.now() - start),
      error: { status: error.status ?? null, type: error.constructor.name } };
  }
}
for (const item of cases) {
  const results = await Promise.all(models.map(async model => {
    const inputData = `{\n  "título": "${item.title.replace(/"/g, '\\"')}",\n  "descrição": "${item.content.replace(/"/g, '\\"').slice(0, 500)}"\n}`;
    const triage = await call(model, "sentinel", `${sentinel}\n\nNotícia para análise:\n${inputData}`);
    const summary = await call(model, "summary", summaryPrompt(item.language === "pt", item.title, item.content));
    return { caseId: item.id, model, triage, summary };
  }));
  report.results.push(...results);
  await fs.writeFile(`${output}/raw-results.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ caseId: item.id, results: results.map(r => ({
    model: r.model, approved: r.triage.parsed?.aprovado,
    themes: r.summary.parsed?.temas, ms: r.triage.ms + r.summary.ms,
    errors: [r.triage.error, r.summary.error].filter(Boolean),
  })) }));
}
report.finishedAt = new Date().toISOString();
await fs.writeFile(`${output}/raw-results.json`, JSON.stringify(report, null, 2));
console.log(`Saved ${output}/raw-results.json`);
