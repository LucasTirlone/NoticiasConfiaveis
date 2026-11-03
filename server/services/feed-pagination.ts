const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface FeedCursor {
  since: string;
  until: string;
  before: { timestamp: string; id: string } | null;
}

export function readFeedCursor(value: unknown, now = new Date()): FeedCursor {
  if (value === undefined) {
    return {
      since: new Date(now.getTime() - WEEK_MS).toISOString(),
      until: now.toISOString(),
      before: null,
    };
  }
  if (typeof value !== "string" || !value || value.length > 2048) {
    throw new Error("Cursor inválido");
  }
  let cursor: FeedCursor;
  try {
    cursor = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    throw new Error("Cursor inválido");
  }
  const validDate = (date: unknown): date is string =>
    typeof date === "string" && Number.isFinite(Date.parse(date));
  if (!cursor || !validDate(cursor.since) || !validDate(cursor.until) ||
      !cursor.before || !validDate(cursor.before.timestamp) ||
      typeof cursor.before.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor.before.id) ||
      Date.parse(cursor.since) > Date.parse(cursor.until) ||
      Date.parse(cursor.before.timestamp) > Date.parse(cursor.until)) {
    throw new Error("Cursor inválido");
  }
  return {
    since: new Date(Math.max(Date.parse(cursor.since), now.getTime() - WEEK_MS)).toISOString(),
    until: new Date(Math.min(Date.parse(cursor.until), now.getTime())).toISOString(),
    before: cursor.before,
  };
}

export function encodeFeedCursor(cursor: FeedCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}
