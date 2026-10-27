export type TaggedNewsRow = {
  id: string;
  timestamp: string;
  tags: string[];
};

/** Frozen input only: this function never connects to a database or reclassifies rows. */
export function selectRecentPerTheme<T extends TaggedNewsRow>(
  rows: T[],
  themeIds: string[],
  limit = 2,
): {
  perTheme: Array<{ themeId: string; ids: string[] }>;
  selected: Array<{ row: T; selectedFor: string[] }>;
} {
  if (!Number.isInteger(limit) || limit < 1) throw new Error("Limite inválido");
  if (new Set(themeIds).size !== themeIds.length) throw new Error("Subfiltro duplicado");
  const timestamps = new Map<string, number>();
  for (const row of rows) {
    if (!row.id || timestamps.has(row.id)) throw new Error("ID ausente ou duplicado");
    if (!Array.isArray(row.tags)) throw new Error("Etiquetas ausentes");
    const date = row.timestamp.replace(" ", "T");
    const timestamp = Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/i.test(date) ? date : `${date}Z`);
    if (!Number.isFinite(timestamp)) throw new Error("Data inválida");
    timestamps.set(row.id, timestamp);
  }
  const sorted = [...rows].sort((a, b) =>
    timestamps.get(b.id)! - timestamps.get(a.id)! || a.id.localeCompare(b.id));
  const perTheme = themeIds.map(themeId => ({
    themeId,
    ids: sorted.filter(row => row.tags.includes(themeId)).slice(0, limit).map(row => row.id),
  }));
  const selectedFor = new Map<string, string[]>();
  for (const {themeId, ids} of perTheme) for (const id of ids) {
    selectedFor.set(id, [...(selectedFor.get(id) ?? []), themeId]);
  }
  return {
    perTheme,
    selected: sorted.filter(row => selectedFor.has(row.id))
      .map(row => ({row, selectedFor: selectedFor.get(row.id)!})),
  };
}
