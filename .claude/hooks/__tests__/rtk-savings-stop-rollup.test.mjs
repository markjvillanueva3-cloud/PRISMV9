import { test } from "node:test";
import assert from "node:assert/strict";
import { rollupLedger } from "../rtk-savings-stop-rollup.mjs";

test("rollupLedger: empty/null → empty byDay", () => {
  assert.deepEqual(rollupLedger("").byDay, {});
  assert.deepEqual(rollupLedger(null).byDay, {});
});

test("rollupLedger: per-day aggregation with hit + miss", () => {
  const jsonl = [
    JSON.stringify({ ts: "2026-05-24T10:00:00Z", sessionId: "s1", base: "git", kind: "hit", est_tokens: 700 }),
    JSON.stringify({ ts: "2026-05-24T11:00:00Z", sessionId: "s1", base: "git", kind: "miss", est_tokens: 700 }),
    JSON.stringify({ ts: "2026-05-24T12:00:00Z", sessionId: "s2", base: "vitest", kind: "miss", est_tokens: 950 }),
  ].join("\n");
  const { byDay } = rollupLedger(jsonl);
  assert.ok(byDay["2026-05-24"]);
  assert.equal(byDay["2026-05-24"].hits, 1);
  assert.equal(byDay["2026-05-24"].misses, 2);
  assert.equal(byDay["2026-05-24"].savedTokens, 700);
  assert.equal(byDay["2026-05-24"].missedTokens, 1650);
  assert.equal(byDay["2026-05-24"].uniqueSessions, 2);
  assert.equal(byDay["2026-05-24"].byBase.git, 700);
  assert.equal(byDay["2026-05-24"].byBase.vitest, 950);
});

test("rollupLedger: spans multiple days", () => {
  const jsonl = [
    JSON.stringify({ ts: "2026-05-23T10:00:00Z", sessionId: "s1", base: "git", kind: "miss", est_tokens: 700 }),
    JSON.stringify({ ts: "2026-05-24T11:00:00Z", sessionId: "s2", base: "git", kind: "miss", est_tokens: 700 }),
  ].join("\n");
  const { byDay } = rollupLedger(jsonl);
  assert.equal(Object.keys(byDay).length, 2);
  assert.ok(byDay["2026-05-23"]);
  assert.ok(byDay["2026-05-24"]);
});

test("rollupLedger: malformed lines skipped silently", () => {
  const jsonl = [
    "not-json",
    JSON.stringify({ ts: "2026-05-24T10:00:00Z", sessionId: "s1", base: "git", kind: "miss", est_tokens: 700 }),
    "{broken",
  ].join("\n");
  const { byDay } = rollupLedger(jsonl);
  assert.equal(byDay["2026-05-24"].misses, 1);
});

test("rollupLedger: skip-kind not counted", () => {
  const jsonl = [
    JSON.stringify({ ts: "2026-05-24T10:00:00Z", sessionId: "s1", base: "ls", kind: "skip", est_tokens: 650 }),
    JSON.stringify({ ts: "2026-05-24T11:00:00Z", sessionId: "s1", base: "git", kind: "miss", est_tokens: 700 }),
  ].join("\n");
  const { byDay } = rollupLedger(jsonl);
  assert.equal(byDay["2026-05-24"].misses, 1);
  assert.equal(byDay["2026-05-24"].hits, 0);
});

test("rollupLedger: malformed ts skipped (no day-10-char prefix)", () => {
  const jsonl = JSON.stringify({ ts: "bad", sessionId: "s1", base: "git", kind: "miss", est_tokens: 700 });
  const { byDay } = rollupLedger(jsonl);
  assert.deepEqual(byDay, {});
});

test("rollupLedger: sessions deduped across entries", () => {
  const jsonl = [
    JSON.stringify({ ts: "2026-05-24T10:00:00Z", sessionId: "s1", base: "git", kind: "miss", est_tokens: 700 }),
    JSON.stringify({ ts: "2026-05-24T11:00:00Z", sessionId: "s1", base: "git", kind: "miss", est_tokens: 700 }),
    JSON.stringify({ ts: "2026-05-24T12:00:00Z", sessionId: "s1", base: "git", kind: "miss", est_tokens: 700 }),
  ].join("\n");
  const { byDay } = rollupLedger(jsonl);
  assert.equal(byDay["2026-05-24"].uniqueSessions, 1);
});
