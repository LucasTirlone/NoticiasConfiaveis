import test from "node:test";
import assert from "node:assert/strict";
import { digest, validateSupplement } from "./supplement-plan";

function fixture() {
  const rows = Array.from({ length: 98 }, (_, i) => ({ id: `frozen-${i}`, title: "Frozen row" }));
  const previous = rows.map(row => ({ id: row.id, decision: "pending", snapshotSha256: digest(JSON.stringify(row)) }));
  const decisions = rows.map(row => ({ id: row.id, decision: "pending", reason: "Fonte não comprovada",
    snapshotSha256: digest(JSON.stringify(row)), calls: [] }));
  return { rows, previous, decisions };
}
test("all 98 pending rows generate no applicable SQL changes", () => {
  const f = fixture();
  assert.deepEqual(validateSupplement(f.rows, f.previous, f.decisions), { corrections: [], withdrawals: [] });
});
test("cannot replace a frozen row with a recent article", () => {
  const f = fixture(); f.decisions[0].id = "new-recent-story";
  assert.throws(() => validateSupplement(f.rows, f.previous, f.decisions), /Seleção/);
});
test("duplicate decisions, missing rows and modified snapshots fail closed", () => {
  const f = fixture();
  assert.throws(() => validateSupplement(f.rows, f.previous, f.decisions.slice(1)));
  f.decisions[0].id = f.decisions[1].id;
  assert.throws(() => validateSupplement(f.rows, f.previous, f.decisions));
  const g = fixture(); g.rows[0].title = "Edited since freeze";
  assert.throws(() => validateSupplement(g.rows, g.previous, g.decisions));
});
test("previously approved rows cannot enter the supplementary batch", () => {
  const f = fixture(); f.previous[0].decision = "correct";
  assert.throws(() => validateSupplement(f.rows, f.previous, f.decisions));
});
test("pending decisions cannot smuggle an applicable patch", () => {
  const f = fixture(); Object.assign(f.decisions[0], { patch: { title: "Not verified" } });
  assert.throws(() => validateSupplement(f.rows, f.previous, f.decisions), /Pendência/);
});
test("wrong model routing is rejected even for unsuccessful attempts", () => {
  const f = fixture(); Object.assign(f.decisions[0], { calls: [{ model: "other-model", modelVersion: "other-model" }] });
  assert.throws(() => validateSupplement(f.rows, f.previous, f.decisions));
});
test("a correction without source evidence and semantic approval is rejected", () => {
  const f = fixture(); f.decisions[0].decision = "correct";
  assert.throws(() => validateSupplement(f.rows, f.previous, f.decisions));
});

function approvedFixture() {
  const f = fixture();
  const content = "Tropical Storm Vance has maximum winds of 55 kt.";
  const fact = { texto: "A tempestade tropical Vance tem ventos máximos de 55 nós.", trecho_fonte: content };
  const material = { title: "Storm bulletin", content, url: "https://www.nhc.noaa.gov/archive/2026/",
    sourceName: "NHC", identityRationale: "Historical bulletin", contentSha256: digest(content) };
  const draft = { fatos: [fact], temas: [{ id: "ciclone_tornado", trecho_fonte: content }], titulo_traduzido: "Boletim da tempestade" };
  const patch = { title: draft.titulo_traduzido, original_title: material.title, summary: fact.texto,
    ai_summary: fact.texto, full_content: content, tags: ["ciclone_tornado"], impact_analysis: fact.texto,
    verification_notes: "Proposta, não aplicada." };
  Object.assign(f.decisions[0], { decision: "correct", material, draft, patch,
    audit: { aprovado: true, motivo: "Fiel à entrada" },
    calls: ["gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash"].map(model => ({ model, modelVersion: model })) });
  return { ...f, patch, material };
}
test("a supported correction preserves the frozen before row and all other 97 rows", () => {
  const f = approvedFixture(), result = validateSupplement(f.rows, f.previous, f.decisions);
  assert.equal(result.corrections.length, 1);
  assert.deepEqual(result.corrections[0].before, f.rows[0]);
  assert.deepEqual(result.corrections[0].after, { ...f.rows[0], ...f.patch });
});
test("changed summaries, titles, source text and protected fields cannot enter SQL", () => {
  for (const update of [
    { summary: "Não sustentado" }, { title: "Título alterado fora da revisão" },
    { full_content: "Fonte diferente" }, { timestamp: "2027-01-01" },
  ]) {
    const f = approvedFixture(); Object.assign(f.patch, update);
    assert.throws(() => validateSupplement(f.rows, f.previous, f.decisions));
  }
});
test("even approved absence of themes cannot withdraw an article based on an excerpt", () => {
  const f = approvedFixture();
  Object.assign(f.decisions[0], { decision: "withdraw", classification: { temas: [] },
    calls: ["gemini-3.5-flash-lite", "gemini-2.5-flash"].map(model => ({ model, modelVersion: model })) });
  Object.assign(f.material, { excerpt: true });
  assert.throws(() => validateSupplement(f.rows, f.previous, f.decisions), /truncado/);
});
