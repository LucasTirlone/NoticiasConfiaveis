import test from "node:test";
import assert from "node:assert/strict";
import { encodeFeedCursor, readFeedCursor } from "./feed-pagination";

const now = new Date("2026-11-03T20:00:00.000Z");
const before = { timestamp: "2026-11-02T00:00:00.000Z", id: "00000000-0000-4000-8000-000000000001" };

test("initial feed is limited to the existing seven-day window", () => {
  assert.deepEqual(readFeedCursor(undefined, now), {
    since: "2026-10-27T20:00:00.000Z", until: now.toISOString(), before: null,
  });
});

test("continuation retains the snapshot and timestamp/id position", () => {
  const cursor = { ...readFeedCursor(undefined, now), before };
  assert.deepEqual(readFeedCursor(encodeFeedCursor(cursor), now), cursor);
});

test("continuations cannot widen the seven-day window or include future news", () => {
  const cursor = readFeedCursor(encodeFeedCursor({
    since: "2020-01-01T00:00:00Z", until: "2030-01-01T00:00:00Z", before,
  }), now);
  assert.equal(cursor.since, "2026-10-27T20:00:00.000Z");
  assert.equal(cursor.until, now.toISOString());
});

test("malformed cursors are rejected instead of restarting or skipping pages", () => {
  for (const value of ["", "nonsense", "bnVsbA", ["abc"], encodeFeedCursor({
    since: now.toISOString(), until: now.toISOString(),
    before: { ...before, timestamp: "invalid" },
  })]) {
    assert.throws(() => readFeedCursor(value, now), /Cursor inválido/);
  }
});
