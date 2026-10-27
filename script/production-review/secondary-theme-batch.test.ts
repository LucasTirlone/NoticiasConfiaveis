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
  },
  draft: {
    temas: [{ id: "conflito_guerra", trecho_fonte: "Intercepted missiles cause damage" }],
  },
};

test("proposes only title-grounded removal of incidental incendio", () => {
  const [review] = prepareSecondaryThemeReview([row], [decision]);
  assert.equal(review.status, "correction_proposed");
  assert.deepEqual(review.currentTags, ["incendio"]);
  assert.deepEqual(review.proposedTags, ["conflito_guerra"]);
});

test("keeps decisions pending if a proposed theme is supported only by body text", () => {
  const bodyOnly: HistoricalDecision = {
    ...decision,
    patch: { tags: ["conflito_guerra"] },
    draft: { temas: [{ id: "conflito_guerra", trecho_fonte: "Damage is being assessed by officials" }] },
  };
  const [review] = prepareSecondaryThemeReview([row], [bodyOnly]);
  assert.equal(review.status, "pending");
  assert.deepEqual(review.proposedTags, row.tags);
});

test("simulation is guarded by the frozen row and always rolls back", () => {
  const sql = buildSecondaryTagSimulationSql([{ before: row, afterTags: ["conflito_guerra"] }]);
  assert.match(sql, /UPDATE public\.news_items/);
  assert.match(sql, /actual IS DISTINCT FROM expected/);
  assert.match(sql, /SET tags =/);
  assert.doesNotMatch(sql, /SET summary =/);
  assert.match(sql, /ROLLBACK;\s*$/);
});

test("rejects a proposed change that keeps incendio or repeats the current tags", () => {
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
