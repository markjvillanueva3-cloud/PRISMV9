// benchmark.test.mjs - unit tests for the vLLM POC benchmark's pure aggregation.
// R9: reference values + invariants; the live HTTP runner is not exercised here
// (it needs a running server) - the math that produces the go/no-go numbers is.
// Run: node --test H:/prism/scripts/vllm-poc/benchmark.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { percentile, aggregate } from "./benchmark.mjs";

test("percentile: nearest-rank reference values", () => {
  const s = [100, 200, 300, 400]; // sorted asc
  assert.equal(percentile(s, 50), 200);  // ceil(.5*4)=2 -> idx1
  assert.equal(percentile(s, 95), 400);  // ceil(.95*4)=4 -> idx3
  assert.equal(percentile(s, 0), 100);
  assert.equal(percentile(s, 100), 400);
});

test("percentile: empty -> null (failure mode)", () => {
  assert.equal(percentile([], 50), null);
  assert.equal(percentile(null, 50), null);
});

test("aggregate: reference run (2 ok + 1 fail, 1000ms wall)", () => {
  const results = [
    { ok: true, latencyMs: 100, completionTokens: 50 },
    { ok: true, latencyMs: 200, completionTokens: 50 },
    { ok: false, latencyMs: 80, completionTokens: 0, error: "timeout" },
  ];
  const a = aggregate(results, 1000);
  assert.equal(a.requests, 3);
  assert.equal(a.ok, 2);
  assert.equal(a.fail, 1);
  assert.equal(a.successRate, 0.667);
  assert.equal(a.totalCompletionTokens, 100);
  assert.equal(a.tokensPerSec, 100);     // 100 tokens / 1.0s
  assert.equal(a.p50Ms, 100);            // nearest-rank over [100,200]: ceil(.5*2)=1 -> idx0
  assert.equal(a.p95Ms, 200);            // ceil(.95*2)=2 -> idx1
  assert.equal(a.meanMs, 150);
});

test("aggregate: all-fail run -> zero throughput, not NaN (adversarial)", () => {
  const a = aggregate([{ ok: false, latencyMs: 0, completionTokens: 0 }], 500);
  assert.equal(a.ok, 0);
  assert.equal(a.successRate, 0);
  assert.equal(a.tokensPerSec, 0);
  assert.equal(a.p50Ms, null);
  assert.equal(a.meanMs, null);
});

test("aggregate: zero wall time -> tokensPerSec 0, not Infinity (adversarial)", () => {
  const a = aggregate([{ ok: true, latencyMs: 10, completionTokens: 99 }], 0);
  assert.equal(a.tokensPerSec, 0);
});

test("aggregate: empty results -> safe zeros", () => {
  const a = aggregate([], 1000);
  assert.equal(a.requests, 0);
  assert.equal(a.successRate, 0);
  assert.equal(a.tokensPerSec, 0);
  assert.equal(a.p50Ms, null);
});
