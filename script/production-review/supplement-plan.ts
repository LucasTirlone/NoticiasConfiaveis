import assert from "node:assert/strict";
import crypto from "node:crypto";
import { CATEGORIES } from "../../shared/categories";
import { NEWS_AI_MODEL, THEME_AI_MODEL, validateDraft } from "../../server/services/news-analysis";
import type { Change } from "./sql";

export const digest = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
export function validateSupplement(rows: any[], previous: any[], decisions: any[]) {
  assert.equal(rows.length, 98);
  assert.equal(previous.length, 98);
  assert.equal(decisions.length, 98);
  assert.equal(new Set(rows.map(r => r.id)).size, 98);
  assert.equal(new Set(previous.map(r => r.id)).size, 98);
  assert.equal(new Set(decisions.map(r => r.id)).size, 98);
  const corrections: Change[] = [], withdrawals: Change[] = [];
  for (const row of rows) {
    const before = previous.find(d => d.id === row.id);
    const d = decisions.find(d => d.id === row.id);
    assert.ok(before && d, "Seleção não corresponde às pendências congeladas");
    assert.equal(before.decision, "pending");
    const hash = digest(JSON.stringify(row));
    assert.equal(before.snapshotSha256, hash);
    assert.equal(d.snapshotSha256, hash);
    assert.ok(d.reason?.trim());
    assert.ok(["correct", "withdraw", "pending"].includes(d.decision));
    for (const call of d.calls ?? []) {
      assert.ok([NEWS_AI_MODEL, THEME_AI_MODEL].includes(call.model));
      assert.equal(call.model, call.modelVersion);
    }
    if (d.decision === "pending") {
      assert.ok(!d.patch, "Pendência não pode ter alteração aplicável");
      continue;
    }
    assert.ok(d.material?.url && d.material?.content && d.material?.identityRationale);
    assert.equal(d.material.contentSha256, digest(d.material.content));
    assert.equal(d.audit?.aprovado, true);
    assert.ok(d.audit.motivo.trim());
    assert.equal(d.calls[0]?.model, THEME_AI_MODEL);
    assert.equal(d.calls.at(-1)?.model, NEWS_AI_MODEL);
    if (d.decision === "correct") {
      assert.deepEqual(d.calls.slice(0, 3).map((c: any) => c.model), [THEME_AI_MODEL, NEWS_AI_MODEL, NEWS_AI_MODEL]);
      for (const call of d.calls.slice(3)) {
        assert.equal(call.model, NEWS_AI_MODEL);
        assert.equal(call.stage, "fidelity_rationale");
      }
      const validated = validateDraft(d.draft, {
        title: d.material.title, content: d.material.content,
        isPortuguese: /agência brasil|bbc news brasil|g1 - globo|onu news|uol|folha/i.test(d.material.sourceName),
      });
      assert.ok(validated.temas.length);
      assert.deepEqual(d.patch.tags, validated.temas.map(t => t.id));
      assert.ok(d.patch.tags.every((id: string) => CATEGORIES.some(c => c.themes.some(t => t.id === id))));
      assert.equal(d.patch.full_content, d.material.content);
      assert.equal(d.patch.original_title, d.material.title);
      const isPortuguese = /agência brasil|bbc news brasil|g1 - globo|onu news|uol|folha/i.test(d.material.sourceName);
      assert.equal(d.patch.title, isPortuguese ? d.material.title : validated.titulo_traduzido);
      assert.equal(d.patch.summary, validated.fatos.map(f => f.texto).reduce((text, fact, i) =>
        text + (i ? i % 2 ? " " : "\n\n" : "") + fact, ""));
      assert.equal(d.patch.ai_summary, d.patch.summary);
      assert.equal(d.patch.impact_analysis, validated.fatos[0].texto);
      const permitted = ["title", "original_title", "summary", "ai_summary", "full_content", "tags", "impact_analysis", "verification_notes"];
      assert.ok(Object.keys(d.patch).every(k => permitted.includes(k)), "Campo não autorizado");
      corrections.push({ before: row, after: { ...row, ...d.patch } });
    } else {
      assert.deepEqual(d.calls.map((c: any) => c.model), [THEME_AI_MODEL, NEWS_AI_MODEL]);
      assert.deepEqual(d.classification.temas, []);
      // A partial excerpt cannot prove absence across an entire article.
      assert.ok(!d.material.excerpt && !d.material.truncated, "Retirada exige material não truncado");
      withdrawals.push({ before: row });
    }
  }
  return { corrections, withdrawals };
}
