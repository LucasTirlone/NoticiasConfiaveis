// Prepares tests against a TEMPORARY table only. Never executes production SQL.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { batchSql, dollarQuote } from "./sql";
import { validateSupplement, digest } from "./supplement-plan";
const dir = "generated-artifacts/production-news-review-98";
const backup = JSON.parse(await fs.readFile(`${dir}/backup-98-noticias.json`, "utf8"));
const decisions = JSON.parse(await fs.readFile(`${dir}/propostas-e-evidencias.json`, "utf8")).decisions;
const previous = JSON.parse(await fs.readFile(`${dir}/previous-decisions.json`, "utf8")).decisions;
const plan = validateSupplement(backup.rows, previous, decisions);
let { corrections, withdrawals } = plan;
const manifest = JSON.parse(await fs.readFile(`${dir}/manifesto.json`, "utf8"));
for (const [name, hash] of Object.entries(manifest.sha256)) {
  assert.equal(digest(await fs.readFile(`${dir}/${name}`, "utf8")), hash, `Hash divergente: ${name}`);
}
assert.equal(await fs.readFile(`${dir}/01-aplicar-correcoes.sql`, "utf8"), batchSql(corrections, "correct"));
assert.equal(await fs.readFile(`${dir}/02-simular-retiradas.sql`, "utf8"), batchSql(withdrawals, "withdraw"));
assert.equal(await fs.readFile(`${dir}/03-desfazer-correcoes.sql`, "utf8"), batchSql(corrections, "restore-corrections"));
assert.equal(await fs.readFile(`${dir}/04-restaurar-retiradas.sql`, "utf8"), batchSql(withdrawals, "restore-withdrawals"));
const sampled = process.argv.includes("--sample");
if (sampled) {
  // The SQL callback has a per-process argument limit. Exercise the same generated
  // guards with two REAL corrections plus one REAL pending row, not invented rows.
  const pending = decisions.find((d: any) => d.decision === "pending");
  const selected = new Set([...corrections.slice(0, 2).map(c => c.before.id), pending?.id]);
  backup.rows = backup.rows.filter((r: any) => selected.has(r.id));
  corrections = corrections.slice(0, 2);
  withdrawals = [];
}
const target = "pg_temp.news_review_test" as const;
const literal = (v: unknown) => `${dollarQuote(JSON.stringify(v), "verify_json")}::jsonb`;
const state = (fixture: "before" | "after") => `DO ${dollarQuote(`
DECLARE actual jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(to_jsonb(n) ORDER BY n.id),'[]'::jsonb) INTO actual FROM ${target} n;
  IF actual IS DISTINCT FROM (SELECT jsonb_agg(value ORDER BY value->>'id') FROM jsonb_array_elements((SELECT payload FROM pg_temp.news_review_fixtures WHERE name='${fixture}'))) THEN
    RAISE EXCEPTION 'Estado divergente: revisão complementar';
  END IF;
END;`, "verify_state")};`;
const after = backup.rows.map((row: any) => corrections.find(c => c.before.id === row.id)?.after ?? row);
// Store large evidence payloads once per session; all generated actions are otherwise identical.
const tempBatch = (changes: typeof corrections, mode: "correct" | "restore-corrections" | "withdraw") =>
  batchSql(changes, mode, { target }).replace(`${dollarQuote(JSON.stringify(changes))}::jsonb`,
    `(SELECT payload FROM pg_temp.news_review_fixtures WHERE name='${mode === "withdraw" ? "withdrawals" : "corrections"}')`);
const sql: string[] = [
  "CREATE TEMP TABLE news_review_fixtures (name text PRIMARY KEY, payload jsonb NOT NULL);",
  `INSERT INTO pg_temp.news_review_fixtures VALUES ('before',${literal(backup.rows)}),('after',${literal(after)}),('corrections',${literal(corrections)}),('withdrawals',${literal(withdrawals)});`,
  "CREATE TEMP TABLE news_review_test (LIKE public.news_items INCLUDING ALL);",
  `INSERT INTO ${target} SELECT (jsonb_populate_record(NULL::${target},value)).* FROM jsonb_array_elements((SELECT payload FROM pg_temp.news_review_fixtures WHERE name='before'));`,
  state("before"),
  tempBatch(corrections, "correct"), state("after"),
  tempBatch(corrections, "correct"), state("after"),
  tempBatch(corrections, "restore-corrections"), state("before"),
  tempBatch(corrections, "restore-corrections"), state("before"),
  tempBatch(withdrawals, "withdraw"), state("before"),
];
if (corrections.length >= 2) {
  const conflictId = corrections.at(-1)!.before.id;
  const first = corrections[0].before;
  const apply = tempBatch(corrections, "correct");
  const inner = apply.slice(apply.indexOf("\nDO ") + 1, apply.lastIndexOf("\nCOMMIT;")).trim();
  sql.push(`UPDATE ${target} SET title='Edição concorrente de teste' WHERE id=${dollarQuote(conflictId)};`);
  sql.push(`DO ${dollarQuote(`
DECLARE preserved jsonb;
BEGIN
  BEGIN
    EXECUTE ${dollarQuote(inner, "verify_nested")};
    RAISE EXCEPTION 'Conflito deveria abortar';
  EXCEPTION WHEN OTHERS THEN
    IF position('mudou desde a cópia' IN SQLERRM)=0 THEN RAISE; END IF;
  END;
  SELECT to_jsonb(n) INTO preserved FROM ${target} n WHERE id=${dollarQuote(first.id)};
  IF preserved IS DISTINCT FROM ${literal(first)} THEN RAISE EXCEPTION 'Lote parcial não revertido'; END IF;
END;`, "verify_conflict")};`);
}
sql.push(`SELECT 'OK: ${backup.rows.length} cópias reais${sampled ? " (amostra; integridade das 98 conferida separadamente)" : ""}; correções; pendências intocadas; idempotência; restauração; retirada com ROLLBACK; conflito atômico' AS verification;`);
await fs.writeFile(`${dir}/verify-development-${sampled ? "sample-" : ""}temp-only.sql`, sql.join("\n"));
console.log("Integridade do lote e SQL conferidos; teste preparado apenas para tabela temporária.");
