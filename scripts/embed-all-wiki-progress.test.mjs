// scripts/embed-all-wiki-progress.test.mjs
// Tests for the embed-progress HONESTY classifier (Q2: lying "running" marker).
// Pure core only -- nowMs / isPidAlive / stalenessMs are injected. Run: node --test <file>

import { test } from "node:test";
import assert from "node:assert/strict";

import { classifyEmbedProgress, isPidAlive } from "./embed-all-wiki.mjs";

const T0 = Date.parse("2026-06-09T00:00:00.000Z");
const aliveAll = () => true;
const deadAll = () => false;

test("running + fresh heartbeat + alive pid => running (not stale)", () => {
  const m = { state: "running", pid: 1234, updatedAt: new Date(T0 - 60_000).toISOString() };
  const r = classifyEmbedProgress(m, { nowMs: T0, isPidAlive: aliveAll });
  assert.equal(r.state, "running");
  assert.equal(r.stale, false);
});

test("running + dead pid => stale EVEN IF heartbeat is fresh (SIGKILL-robust signal)", () => {
  const m = { state: "running", pid: 1234, updatedAt: new Date(T0 - 1_000).toISOString() };
  const r = classifyEmbedProgress(m, { nowMs: T0, isPidAlive: deadAll });
  assert.equal(r.state, "stale");
  assert.equal(r.stale, true);
  assert.equal(r.reason, "writer pid is dead");
});

test("running + stale heartbeat + NO pid => stale (time fallback for old schema-v1 markers)", () => {
  const m = { state: "running", updatedAt: new Date(T0 - 20 * 60_000).toISOString() };
  const r = classifyEmbedProgress(m, { nowMs: T0, isPidAlive: aliveAll, stalenessMs: 15 * 60_000 });
  assert.equal(r.state, "stale");
  assert.equal(r.reason, "heartbeat older than stalenessMs");
  assert.ok(r.ageMs > 15 * 60_000);
});

test("running + alive pid + fresh, no time-staleness => running", () => {
  const m = { state: "running", pid: 4321, updatedAt: new Date(T0 - 10_000).toISOString() };
  const r = classifyEmbedProgress(m, { nowMs: T0, isPidAlive: aliveAll, stalenessMs: 15 * 60_000 });
  assert.equal(r.state, "running");
  assert.equal(r.stale, false);
});

test("LIVE BUG REPRO: the real 24h-stale schema-v1 marker classifies as stale, not running", () => {
  // The exact lying marker observed 2026-06-09 (state:running done:0, ~24h old, no pid).
  const m = { schemaVersion: 1, state: "running", totalMd: 39235, toEmbed: 6609, done: 0, failed: 0, updatedAt: "2026-06-08T16:25:57.909Z" };
  const now = Date.parse("2026-06-09T16:25:57.909Z"); // exactly 24h later
  const r = classifyEmbedProgress(m, { nowMs: now, isPidAlive: aliveAll });
  assert.equal(r.state, "stale", "a 24h-old running marker must NOT report as running");
  assert.equal(r.stale, true);
  assert.ok(r.ageMs >= 24 * 60 * 60_000);
});

test("terminal state done => done, not stale", () => {
  const r = classifyEmbedProgress({ state: "done", done: 6609 }, { nowMs: T0, isPidAlive: deadAll });
  assert.equal(r.state, "done");
  assert.equal(r.stale, false);
});

test("terminal state aborted => aborted, not stale (graceful Ollama-error path)", () => {
  const r = classifyEmbedProgress({ state: "aborted", updatedAt: "2026-01-01T00:00:00Z" }, { nowMs: T0, isPidAlive: deadAll });
  assert.equal(r.state, "aborted");
  assert.equal(r.stale, false);
});

test("null / invalid marker => unknown (never throws)", () => {
  for (const bad of [null, undefined, 42, "running", {}, { state: 99 }]) {
    const r = classifyEmbedProgress(bad, { nowMs: T0 });
    assert.equal(r.state, "unknown");
    assert.equal(r.stale, false);
  }
});

test("running + pid present but NO isPidAlive probe + fresh time => running (pid ignored without probe)", () => {
  const m = { state: "running", pid: 999, updatedAt: new Date(T0 - 5_000).toISOString() };
  const r = classifyEmbedProgress(m, { nowMs: T0 }); // no isPidAlive
  assert.equal(r.state, "running");
  assert.equal(r.stale, false);
});

test("running with unparseable updatedAt + alive pid => running (ageMs null, not falsely stale)", () => {
  const m = { state: "running", pid: 7, updatedAt: "not-a-date" };
  const r = classifyEmbedProgress(m, { nowMs: T0, isPidAlive: aliveAll });
  assert.equal(r.state, "running");
  assert.equal(r.ageMs, null);
});

test("isPidAlive: self pid is alive; pid<=0 and non-integer are dead (guard)", () => {
  assert.equal(isPidAlive(process.pid), true);
  assert.equal(isPidAlive(0), false);
  assert.equal(isPidAlive(-1), false);
  assert.equal(isPidAlive(3.5), false);
  assert.equal(isPidAlive("x"), false);
});
