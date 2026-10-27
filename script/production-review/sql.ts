export type Change = { before: Record<string, any>; after?: Record<string, any> };
const fields=["title","original_title","summary","ai_summary","full_content","tags","impact_analysis","verification_notes"];
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function dollarQuote(value:string,prefix="review_data"):string {
  let suffix=0,tag=`$${prefix}$`;
  while(value.includes(tag))tag=`$${prefix}_${++suffix}$`;
  return `${tag}${value}${tag}`;
}
export function batchSql(changes:Change[],mode:"correct"|"restore-corrections"|"withdraw"|"restore-withdrawals",
  options:{target?:"public.news_items"|"pg_temp.news_review_test";commit?:boolean}={}):string {
  const target=options.target??"public.news_items";
  if(!["public.news_items","pg_temp.news_review_test"].includes(target))throw Error("Invalid SQL target");
  const seen=new Set<string>();
  for(const c of changes) {
    if(!uuid.test(c.before.id)||seen.has(c.before.id))throw Error("Invalid/duplicate ID");
    seen.add(c.before.id);
    if((mode==="correct"||mode==="restore-corrections")&&(!c.after||c.after.id!==c.before.id))throw Error("Missing after snapshot");
  }
  const data=dollarQuote(JSON.stringify(changes));
  const assignments=fields.map(field=>field==="tags"
    ?`tags = ARRAY(SELECT jsonb_array_elements_text(desired->'tags'))`
    :`${field} = desired->>'${field}'`).join(",\n        ");
  const correction=`
      expected := item->'${mode==="restore-corrections"?"after":"before"}';
      desired := item->'${mode==="restore-corrections"?"before":"after"}';
      IF actual IS NOT DISTINCT FROM desired THEN
        already_done := already_done + 1;
        CONTINUE;
      END IF;
      IF actual IS DISTINCT FROM expected THEN
        RAISE EXCEPTION 'Notícia % mudou desde a cópia: lote inteiro abortado.', row_id;
      END IF;
      UPDATE ${target} SET
        ${assignments}
      WHERE id = row_id;`;
  const withdrawal=`
      IF actual IS NULL THEN
        already_done := already_done + 1;
        CONTINUE;
      END IF;
      IF actual IS DISTINCT FROM item->'before' THEN
        RAISE EXCEPTION 'Notícia % mudou desde a cópia: exclusão abortada.', row_id;
      END IF;
      DELETE FROM ${target} WHERE id = row_id;`;
  const restore=`
      IF actual IS NOT DISTINCT FROM item->'before' THEN
        already_done := already_done + 1;
        CONTINUE;
      END IF;
      IF actual IS NOT NULL THEN
        RAISE EXCEPTION 'ID % já existe com outros dados: restauração abortada.', row_id;
      END IF;
      INSERT INTO ${target}
        SELECT (jsonb_populate_record(NULL::${target}, item->'before')).*;`;
  const body=mode==="withdraw"?withdrawal:mode==="restore-withdrawals"?restore:correction;
  const block=`
DECLARE
  plan jsonb := ${data}::jsonb;
  item jsonb;
  actual jsonb;
  expected jsonb;
  desired jsonb;
  row_id text;
  applied integer := 0;
  already_done integer := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('news-review-200-data-only'));
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='${target}'::regclass AND NOT tgisinternal AND tgenabled<>'D') THEN
    RAISE EXCEPTION 'Há gatilhos personalizados ativos: revisar efeitos em outros dados antes de aplicar.';
  END IF;
  ${mode==="withdraw"?`IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype='f' AND confrelid='${target}'::regclass AND confdeltype IN ('c','n','d')) THEN
    RAISE EXCEPTION 'Há dependências com efeitos de exclusão: operação bloqueada para proteger outros dados.';
  END IF;`:""}
  FOR item IN SELECT value FROM jsonb_array_elements(plan)
  LOOP
    row_id := item->'before'->>'id';
    SELECT to_jsonb(n) INTO actual FROM ${target} n WHERE n.id = row_id FOR UPDATE;
    ${body}
    applied := applied + 1;
  END LOOP;
  RAISE NOTICE 'Lote: % ações; % já estavam no estado desejado.', applied, already_done;
END;`;
  const commit=options.commit??mode!=="withdraw";
  return `-- REVISÃO DE DADOS: ${mode}; ${changes.length} notícias selecionadas explicitamente.
-- NÃO cria tabelas, NÃO altera o esquema e NÃO publica código.
-- Execute o arquivo INTEIRO, em uma única sessão, no banco correto.
-- Cada linha só muda se todos os campos ainda coincidirem com a cópia.
-- Qualquer conflito aborta o lote todo; execução repetida é idempotente.
${mode==="withdraw"?"-- ATENÇÃO: exclusão física, não arquivamento. Este arquivo SIMULA e termina com ROLLBACK.\n-- Só troque o ÚLTIMO ROLLBACK por COMMIT após revisar o relatório e guardar o backup.\n":""}
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '90s';
DO ${dollarQuote(block,"review_block")};
${commit?"COMMIT;":"ROLLBACK; -- SIMULAÇÃO: nenhuma alteração é persistida."}
`;
}
