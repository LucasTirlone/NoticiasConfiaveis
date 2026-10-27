// Ask the SAME fidelity model for a specific rationale when it returned an empty one.
// Never changes the proposed themes, title or summary.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { NEWS_AI_MODEL, buildGroundingPrompt, groundingSchema, parseModelJson } from "../../server/services/news-analysis";
const dir = "generated-artifacts/production-news-review-98";
const ai = new GoogleGenAI({ apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: { baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL, apiVersion: "", timeout: 90000 } });
const auditSchema = z.object({ aprovado: z.boolean(), motivo: z.string().trim().min(1).max(800) }).strict();
for (const name of await fs.readdir(`${dir}/decisions`)) {
  const path = `${dir}/decisions/${name}`;
  const d = JSON.parse(await fs.readFile(path, "utf8"));
  if (d.decision !== "correct" || d.audit.motivo.trim()) continue;
  d.initialAudit = d.audit;
  await fs.mkdir(`${dir}/attempts`, { recursive: true });
  await fs.writeFile(`${dir}/attempts/${d.id}-before-rationale.json`, JSON.stringify(d, null, 2));
  try {
    const input = { title: d.material.title, content: d.material.content.replace(/\s+/g, " ").trim(),
      isPortuguese: /agência brasil|bbc news brasil|g1 - globo|onu news|uol|folha/i.test(d.material.sourceName) };
    const response = await ai.models.generateContent({ model: NEWS_AI_MODEL,
      contents: buildGroundingPrompt(input, d.draft) + `
Retorne motivo não vazio, específico desta notícia, explicando suporte ou problema de fidelidade.
Sua função é comparar apenas a proposta com a entrada, incluindo o título original; não usar lembranças
de outras notícias ou anos. Não escolha temas nem altere a proposta.`,
      config: { thinkingConfig: { thinkingBudget: 0 }, responseMimeType: "application/json", responseJsonSchema: groundingSchema } });
    assert.equal(response.modelVersion, NEWS_AI_MODEL);
    d.calls.push({ model: NEWS_AI_MODEL, modelVersion: response.modelVersion, stage: "fidelity_rationale",
      text: response.text, usage: response.usageMetadata });
    d.audit = auditSchema.parse(parseModelJson(response.text ?? ""));
    if (!d.audit.aprovado) {
      d.reason = "Revisão complementar de fidelidade rejeitou a proposta: " + d.audit.motivo;
      d.automaticPatch = d.patch; delete d.patch; d.decision = "pending";
    }
  } catch {
    d.reason = "Justificativa explícita da revisão de fidelidade não obtida";
    d.automaticPatch = d.patch; delete d.patch; d.decision = "pending";
  }
  d.rationaleReviewedAt = new Date().toISOString();
  await fs.writeFile(path, JSON.stringify(d, null, 2));
  console.log(d.id, d.decision);
  await new Promise(r => setTimeout(r, 1500));
}
