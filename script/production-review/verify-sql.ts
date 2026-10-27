import fs from "node:fs/promises";
import {batchSql,dollarQuote} from "./sql";
import {DIR} from "./source-material";
const {rows}=JSON.parse(await fs.readFile(`${DIR}/backup.json`,"utf8"));
const before=rows.slice(0,2);
const after=before.map((r:any)=>({...r,title:"Teste O'Brien $review_data$ $review_block$; -- não executar como SQL",tags:["chuva_enchente"]}));
const changes=before.map((r:any,i:number)=>({before:r,after:after[i]}));
const target="pg_temp.news_review_test" as const;
const literal=(v:unknown)=>`${dollarQuote(JSON.stringify(v),"verify_json")}::jsonb`;
const assertState=(expected:unknown[])=>`DO ${dollarQuote(`
DECLARE actual jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(to_jsonb(n) ORDER BY n.id),'[]'::jsonb) INTO actual FROM ${target} n;
  IF actual IS DISTINCT FROM (SELECT coalesce(jsonb_agg(value ORDER BY value->>'id'),'[]'::jsonb) FROM jsonb_array_elements(${literal(expected)})) THEN
    RAISE EXCEPTION 'Verification state mismatch';
  END IF;
END;`,"verify_state")};`;
const insert=`INSERT INTO ${target} SELECT (jsonb_populate_record(NULL::${target},value)).* FROM jsonb_array_elements(${literal(before)});`;
const apply=batchSql(changes,"correct",{target});
const restore=batchSql(changes,"restore-corrections",{target});
const simulate=batchSql(changes,"withdraw",{target});
const remove=batchSql(changes,"withdraw",{target,commit:true});
const reinsert=batchSql(changes,"restore-withdrawals",{target});
const inner=apply.slice(apply.indexOf("\nDO ")+1,apply.lastIndexOf("\nCOMMIT;")).trim();
const id=before[1].id;
const firstId=before[0].id;
const conflict=`UPDATE ${target} SET title='Concurrent edit' WHERE id='${id}';
DO ${dollarQuote(`
DECLARE preserved jsonb;
BEGIN
  BEGIN
    EXECUTE ${dollarQuote(inner,"nested_verification")};
    RAISE EXCEPTION 'Expected conflict was not raised';
  EXCEPTION WHEN OTHERS THEN
    IF position('mudou desde a cópia' IN SQLERRM)=0 THEN RAISE; END IF;
  END;
  SELECT to_jsonb(n) INTO preserved FROM ${target} n WHERE id='${firstId}';
  IF preserved IS DISTINCT FROM ${literal(before[0])} THEN
    RAISE EXCEPTION 'Failed to roll back earlier row after conflict';
  END IF;
END;`,"verify_conflict")};`;
const script=`-- Development-only verification; every write targets a temporary table.
CREATE TEMP TABLE news_review_test (LIKE public.news_items INCLUDING ALL);
${insert}
${apply}
${assertState(after)}
${apply}
${assertState(after)}
${restore}
${assertState(before)}
${restore}
${assertState(before)}
${simulate}
${assertState(before)}
${remove}
${assertState([])}
${reinsert}
${assertState(before)}
${reinsert}
${assertState(before)}
${conflict}
SELECT 'passed: updates, idempotence, rollback-only withdrawals, restoration, conflict atomicity' AS verification;`;
await fs.writeFile(`${DIR}/verify-development-temp-only.sql`,script);
console.log("Temporary-table SQL verification prepared.");
