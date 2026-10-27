import { dollarQuote } from "./sql";

export type HistoricalReviewRow = Record<string, any> & {
  id: string;
  title: string;
  original_title?: string;
  tags: string[];
  original_url: string;
};

export type HistoricalDecision = {
  id: string;
  decision: string;
  reason?: string;
  audit?: { approved?: boolean; aprovado?: boolean; reason?: string; motivo?: string };
  patch?: { tags?: string[] };
  material?: { url?: string; title?: string; method?: string };
  draft?: { temas?: Array<{ id: string; trecho_fonte: string }> };
  manualReview?: string;
};

export type SecondaryThemeReview = {
  id: string;
  title: string;
  url: string;
  sourceMethod?: string;
  currentTags: string[];
  proposedTags: string[];
  status: "correction_proposed" | "pending" | "unchanged";
  reason: string;
  before: HistoricalReviewRow;
};

const normalize = (text: string) => text.normalize("NFC").replace(/\s+/g, " ").trim();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function prepareSecondaryThemeReview(
  rows: HistoricalReviewRow[],
  decisions: HistoricalDecision[],
): SecondaryThemeReview[] {
  const decisionsById = new Map(decisions.map(decision => [decision.id, decision]));
  return rows.filter(row => row.tags?.includes("incendio")).map(row => {
    const decision = decisionsById.get(row.id);
    const title = row.original_title || row.title;
    const base = {
      id: row.id,
      title,
      url: row.original_url,
      sourceMethod: decision?.material?.method,
      currentTags: [...row.tags],
      proposedTags: [...row.tags],
      before: row,
    };

    if (!decision) return {
      ...base,
      status: "pending" as const,
      reason: "Não existe uma revisão histórica correspondente; nenhuma mudança proposta.",
    };

    const tags = decision.patch?.tags;
    const evidence = decision.draft?.temas ?? [];
    const titleOnlyEvidence = Boolean(
      decision.material?.url &&
      decision.material?.title &&
      tags?.length &&
      tags.every(tag => {
        const theme = evidence.find(item => item.id === tag);
        return theme && normalize(decision.material!.title!).includes(normalize(theme.trecho_fonte));
      }),
    );
    const reviewApproved = decision.audit?.aprovado === true || decision.audit?.approved === true;
    const withdrawnByManualReview = Boolean(decision.manualReview);

    if (
      decision.decision === "correct" &&
      !withdrawnByManualReview &&
      reviewApproved &&
      tags?.length &&
      !tags.includes("incendio") &&
      titleOnlyEvidence
    ) {
      return {
        ...base,
        proposedTags: [...tags],
        status: "correction_proposed" as const,
        reason: "A proposta revisada não atribui incêndio e todos os temas propostos têm evidência no título da fonte.",
      };
    }

    if (tags?.includes("incendio") && !titleOnlyEvidence) {
      return {
        ...base,
        status: "pending" as const,
        reason: "A evidência de incêndio não está no título da fonte; a nova regra exige confirmação editorial antes de remover ou manter a etiqueta.",
      };
    }

    if (decision.decision === "pending" || withdrawnByManualReview || !reviewApproved) {
      return {
        ...base,
        status: "pending" as const,
        reason: decision.manualReview || decision.reason || "A revisão anterior não aprovou uma alteração automática.",
      };
    }

    return {
      ...base,
      proposedTags: tags ? [...tags] : [...row.tags],
      status: "unchanged" as const,
      reason: "A revisão anterior manteve incêndio; não há nova evidência suficiente para alterar essa decisão automaticamente.",
    };
  });
}

export function buildSecondaryTagSimulationSql(
  changes: Array<{ before: HistoricalReviewRow; afterTags: string[] }>,
): string {
  const ids = new Set<string>();
  for (const change of changes) {
    if (!UUID.test(change.before.id) || ids.has(change.before.id)) throw new Error("ID inválido ou duplicado");
    if (!Array.isArray(change.before.tags) || !Array.isArray(change.afterTags)) throw new Error("Etiquetas ausentes");
    if (change.afterTags.includes("incendio")) throw new Error("A proposta não remove incendio");
    if (JSON.stringify(change.before.tags) === JSON.stringify(change.afterTags)) throw new Error("A proposta não altera etiquetas");
    ids.add(change.before.id);
  }
  const plan = dollarQuote(JSON.stringify(changes), "secondary_theme_plan");
  const block = `
DECLARE
  plan jsonb := ${plan}::jsonb;
  item jsonb;
  actual jsonb;
  expected jsonb;
  desired jsonb;
  row_id text;
  simulated integer := 0;
  already_done integer := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('news-secondary-theme-review'));
  FOR item IN SELECT value FROM jsonb_array_elements(plan)
  LOOP
    row_id := item->'before'->>'id';
    SELECT to_jsonb(n) INTO actual FROM public.news_items n WHERE n.id = row_id FOR UPDATE;
    expected := item->'before';
    desired := jsonb_set(expected, '{tags}', item->'afterTags');
    IF actual IS NOT DISTINCT FROM desired THEN
      already_done := already_done + 1;
      CONTINUE;
    END IF;
    IF actual IS DISTINCT FROM expected THEN
      RAISE EXCEPTION 'Notícia % mudou desde a cópia; simulação interrompida.', row_id;
    END IF;
    UPDATE public.news_items
      SET tags = ARRAY(SELECT jsonb_array_elements_text(item->'afterTags'))
      WHERE id = row_id;
    simulated := simulated + 1;
  END LOOP;
  RAISE NOTICE 'Simulação: % correções; % já estavam no estado proposto.', simulated, already_done;
END;`;
  return `-- PROPOSTA DE REVISÃO DE TEMAS — SIMULAÇÃO SOMENTE.
-- Executar o arquivo inteiro no banco de produção apenas para conferir os conflitos.
-- A última instrução ROLLBACK é intencional: nenhuma alteração será persistida.
-- Atualiza somente tags, compara a linha inteira e aborta se algum dado mudou.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '90s';
DO ${dollarQuote(block, "secondary_theme_block")};
ROLLBACK;
`;
}
