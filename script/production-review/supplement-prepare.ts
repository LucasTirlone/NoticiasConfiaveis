// Offline preparation only: no database imports or connections.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import crypto from "node:crypto";
const original = "generated-artifacts/production-news-review-200";
const dir = "generated-artifacts/production-news-review-98";
const read = async (name: string) => JSON.parse(await fs.readFile(`${original}/${name}`, "utf8"));
const proposals = await read("propostas-e-evidencias.json");
const pending = proposals.decisions.filter((d: any) => d.decision === "pending");
const backup = await read("backup.json");
const rows = pending.map((d: any) => {
  const row = backup.rows.find((r: any) => r.id === d.id);
  assert.ok(row);
  assert.equal(d.snapshotSha256, crypto.createHash("sha256").update(JSON.stringify(row)).digest("hex"));
  return row;
});
assert.equal(rows.length, 98);
assert.equal(new Set(rows.map((r: any) => r.id)).size, 98);
assert.equal(pending.filter((d: any) => d.reason === "Fonte original indisponível").length, 61);
await fs.access(`${original}/relatorio-revisao-200.html`);
await fs.mkdir(`${dir}/retrievals`, { recursive: true });
const hashes: Record<string, string> = {};
for (const name of ["backup.json", "propostas-e-evidencias.json", "relatorio-revisao-200.html"]) {
  hashes[name] = crypto.createHash("sha256").update(await fs.readFile(`${original}/${name}`)).digest("hex");
}
const frozen = { selection: { ...backup.selection, ids: rows.map((r: any) => r.id),
  parentHashes: hashes, note: "Somente as 98 pendências do lote congelado; sem consulta ao banco." }, rows };
const file = `${dir}/backup.json`;
try {
  assert.deepEqual(JSON.parse(await fs.readFile(file, "utf8")), frozen);
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  await fs.writeFile(file, JSON.stringify(frozen, null, 2), { flag: "wx" });
}
await fs.writeFile(`${dir}/previous-decisions.json`, JSON.stringify({ decisions: pending }, null, 2));
await fs.writeFile(`${dir}/fetch-inputs.json`, JSON.stringify(rows.map((r: any) => ({
  id: r.id, title: r.original_title, url: r.original_url.replace(/^.*\/\*(https?:\/\/)/, "$1"),
  timestamp: r.timestamp,
})), null, 2));
console.log("98 pendências congeladas; lote anterior preservado.");
