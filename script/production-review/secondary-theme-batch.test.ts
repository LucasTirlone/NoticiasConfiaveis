import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSecondaryTagSimulationSql,
  prepareSecondaryThemeReview,
  type HistoricalDecision,
  type HistoricalReviewRow,
} from "./secondary-theme-batch";

const row: HistoricalReviewRow = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Intercepted missiles cause damage in Saudi city",
  original_title: "Intercepted missiles cause damage in Saudi city",
  original_url: "https://news.example.test/missiles",
  tags: ["incendio"],
  summary: "Untouched original summary",
};

const decision: HistoricalDecision = {
  id: row.id,
  decision: "correct",
  audit: { aprovado: true },
  patch: { tags: ["conflito_guerra"] },
  material: {
    url: row.original_url,
    title: row.original_title,
    method: "publisher_metadata_excerpt",
    content: "Intercepted missiles cause damage in Saudi city. Officials reported a military strike.",
  },
  draft: {
    temas: [{ id: "conflito_guerra", trecho_fonte: "Intercepted missiles cause damage" }],
  },
  contextualReview: { approved: true, reason: "O ataque militar é o evento central; o fogo é um dano incidental." },
};

test("proposes removal only after evidence and contextual review agree", () => {
  const [review] = prepareSecondaryThemeReview([row], [decision]);
  assert.equal(review.status, "correction_proposed");
  assert.deepEqual(review.currentTags, ["incendio"]);
  assert.deepEqual(review.proposedTags, ["conflito_guerra"]);
});

test("accepts contextual evidence from the body, not only the headline", () => {
  const bodyOnly: HistoricalDecision = {
    ...decision,
    patch: { tags: ["conflito_guerra"] },
    draft: { temas: [{ id: "conflito_guerra", trecho_fonte: "Officials reported a military strike." }] },
  };
  const [review] = prepareSecondaryThemeReview([row], [bodyOnly]);
  assert.equal(review.status, "correction_proposed");
  assert.deepEqual(review.proposedTags, ["conflito_guerra"]);
});

test("old decisions or fabricated evidence do not become contextual approvals", () => {
  for(const unsupported of [
    {...decision,contextualReview:undefined},
    {...decision,draft:{temas:[{id:"conflito_guerra",trecho_fonte:"Unsupported quote"}]}},
  ]) {
    const [review]=prepareSecondaryThemeReview([row],[unsupported]);
    assert.equal(review.status,"pending");
    assert.deepEqual(review.proposedTags,row.tags);
  }
});

test("simulation is guarded by the frozen row and always rolls back", () => {
  const sql = buildSecondaryTagSimulationSql([{ before: row, afterTags: ["conflito_guerra"] }]);
  assert.match(sql, /UPDATE public\.news_items/);
  assert.match(sql, /actual IS DISTINCT FROM expected/);
  assert.match(sql, /SET tags =/);
  assert.doesNotMatch(sql, /SET summary =/);
  assert.match(sql, /ROLLBACK;\s*$/);
});

test("rejects a proposed change that keeps incendio or repeats a row ID", () => {
  assert.throws(
    () => buildSecondaryTagSimulationSql([{ before: row, afterTags: ["incendio"] }]),
    /não remove incendio/,
  );
  assert.throws(
    () => buildSecondaryTagSimulationSql([
      { before: row, afterTags: ["conflito_guerra"] },
      { before: row, afterTags: ["conflito_guerra"] },
    ]),
    /duplicado/,
  );
});
