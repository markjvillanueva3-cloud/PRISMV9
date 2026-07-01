// scripts/lib/daemon-latency-stats.test.mjs
// Real-value tests (R9) for the master-index-daemon latency-stats leaf. Pure -> deterministic.

import test from "node:test";
import assert from "node:assert/strict";
import { emptyLatencyStats, recordSearchLatency, DEFAULT_SLOW_MS } from "./daemon-latency-stats.mjs";

test("emptyLatencyStats: zeroed shape", () => {
  assert.deepEqual(emptyLatencyStats(), { count: 0, lastMs: null, maxMs: 0, slowCount: 0 });
});

test("recordSearchLatency: tracks count/last/max/slow across samples", () => {
  let s = emptyLatencyStats();
  s = recordSearchLatency(s, 100);
  assert.deepEqual(s, { count: 1, lastMs: 100, maxMs: 100, slowCount: 0 }, "fast sample, not slow");
  s = recordSearchLatency(s, 400); // >= DEFAULT_SLOW_MS (350) -> slow + new max
  assert.equal(s.count, 2);
  assert.equal(s.maxMs, 400);
  assert.equal(s.slowCount, 1, "400ms exceeds the 350ms timeout-risk threshold");
  s = recordSearchLatency(s, 50); // last updates, max holds, not slow
  assert.equal(s.lastMs, 50);
  assert.equal(s.maxMs, 400, "max is a high-water mark, not reset by a faster sample");
  assert.equal(s.slowCount, 1);
});

test("recordSearchLatency: boundary at exactly slowMs counts as slow (>=)", () => {
  assert.equal(recordSearchLatency(emptyLatencyStats(), DEFAULT_SLOW_MS).slowCount, 1);
  assert.equal(recordSearchLatency(emptyLatencyStats(), DEFAULT_SLOW_MS - 1).slowCount, 0, "just under is not slow");
});

test("recordSearchLatency: custom slowMs threshold honored", () => {
  assert.equal(recordSearchLatency(emptyLatencyStats(), 200, 150).slowCount, 1, "200 >= custom 150 -> slow");
  assert.equal(recordSearchLatency(emptyLatencyStats(), 200, 250).slowCount, 0, "200 < custom 250 -> not slow");
});

test("recordSearchLatency: fail-soft on bad samples (NaN/negative ignored, prior kept)", () => {
  const before = { count: 5, lastMs: 10, maxMs: 99, slowCount: 2 };
  assert.deepEqual(recordSearchLatency(before, NaN), before, "NaN ignored, prior stats preserved");
  assert.deepEqual(recordSearchLatency(before, -3), before, "negative ignored");
  assert.deepEqual(recordSearchLatency(before, Infinity), before, "Infinity ignored");
  // garbage prior -> reset to a clean zeroed fold of the valid sample
  const fromGarbage = recordSearchLatency(null, 120);
  assert.deepEqual(fromGarbage, { count: 1, lastMs: 120, maxMs: 120, slowCount: 0 });
});

test("recordSearchLatency: PURE -- does not mutate the input", () => {
  const orig = emptyLatencyStats();
  const out = recordSearchLatency(orig, 100);
  assert.equal(orig.count, 0, "input untouched");
  assert.notEqual(orig, out, "returns a new object");
});
