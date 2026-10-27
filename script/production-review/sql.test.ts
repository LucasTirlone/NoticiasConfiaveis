import test from "node:test";
import assert from "node:assert/strict";
import {batchSql,dollarQuote} from "./sql";
import {extractPublisher,articleUrl} from "./source-material";

const before={id:"00000000-0000-4000-8000-000000000001",title:"Old",tags:["incendio"]};
const after={...before,title:"O'Brien; SELECT * FROM users; $review_data$ $review_block$",tags:["chuva_enchente"]};
test("SQL payload cannot break out of dollar quoting",()=>{
  const result=batchSql([{before,after}],"correct");
  assert.ok(result.includes("$review_data_1$"));
  assert.ok(result.includes("$review_block_1$"));
  assert.ok(result.endsWith("COMMIT;\n"));
  assert.ok(result.includes("actual IS DISTINCT FROM expected"));
  assert.ok(!result.includes("CREATE TABLE"));
  assert.equal(dollarQuote("no delimiter"),"$review_data$no delimiter$review_data$");
});
test("physical withdrawals are simulations by default; restore contains guarded inserts",()=>{
  const remove=batchSql([{before}],"withdraw");
  assert.ok(remove.endsWith("ROLLBACK; -- SIMULAÇÃO: nenhuma alteração é persistida.\n"));
  assert.ok(remove.includes("DELETE FROM public.news_items WHERE id = row_id"));
  assert.ok(remove.includes("confdeltype IN ('c','n','d')"));
  assert.ok(remove.includes("NOT tgisinternal"));
  const restore=batchSql([{before}],"restore-withdrawals");
  assert.ok(restore.includes("jsonb_populate_record"));
  assert.ok(restore.includes("já existe com outros dados"));
});
test("invalid targets, IDs, duplicate rows and missing snapshots are rejected",()=>{
  assert.throws(()=>batchSql([{before,after}],"correct",{target:"users" as any}));
  assert.throws(()=>batchSql([{before:{...before,id:"x'; DROP"}}],"withdraw"));
  assert.throws(()=>batchSql([{before},{before}],"withdraw"));
  assert.throws(()=>batchSql([{before}],"correct"));
});
test("canonical URLs preserve event parameters but drop tracking wrappers",()=>{
  assert.equal(articleUrl("https://redir.folha.com.br/a/*https://www1.folha.uol.com.br/a.shtml?utm_source=rss"),"www1.folha.uol.com.br/a.shtml");
  assert.equal(articleUrl("https://gdacs.org/report.aspx?eventid=1&eventtype=TC&at_campaign=rss"),"gdacs.org/report.aspx?eventid=1&eventtype=TC");
});
test("publisher snippets require a matching headline; arbitrary page text never becomes original source",()=>{
  assert.equal(extractPublisher('<meta property="og:title" content="Home"><meta name="description" content="This is a generic homepage description with many different stories.">',"Floods in Paraná"),null);
  const found=extractPublisher('<meta property="og:title" content="Floods in Paraná close highway"><meta name="description" content="Floods in Paraná closed a highway and left a truck stranded.">',"Floods in Paraná close highway");
  assert.equal(found?.method,"publisher_metadata_excerpt");
  assert.match(found?.content??"",/truck stranded/);
});
