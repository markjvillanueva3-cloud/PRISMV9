/**
 * Tests for decidePreemptRestart (MCP-CONCURRENCY-HARDEN, slot golf 2026-06-09).
 *
 * The function gates a DESTRUCTIVE restart, so the tests pin every branch: the five
 * skip gates, restart-in-a-lull, defer-mid-burst, the hard-ceiling override that
 * recycles a true leak even mid-burst, and the unknown-inflight fail-safe that
 * preserves pre-2026-06-09 behavior on an older server.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { decidePreemptRestart } from "./mcp-preempt-decision.mjs";

// Baseline: under pressure, eligible, no burst -> restart. Spread + override per case.
const base = {
  rssMB: 20000,
  rssThresholdMB: 18432,
  rssHardMB: 28672,
  inflight: 0,
  inflightDeferAt: 8,
  sinceLastPreemptMs: 9_999_999,
  cooldownMs: 1_800_000,
  uptimeSec: 600,
};

test("feature disabled (rssThresholdMB <= 0) -> skip", () => {
  const d = decidePreemptRestart({ ...base, rssThresholdMB: 0 });
  assert.equal(d.action, "skip");
  assert.equal(d.reason, "preempt-disabled");
});

test("unknown RSS (null) -> skip", () => {
  const d = decidePreemptRestart({ ...base, rssMB: null });
  assert.equal(d.action, "skip");
  assert.equal(d.reason, "rss-unknown");
});

test("RSS below threshold -> skip", () => {
  const d = decidePreemptRestart({ ...base, rssMB: 12000 });
  assert.equal(d.action, "skip");
  assert.equal(d.reason, "rss-below-threshold");
});

test("server still cold-starting (uptime < 60s) -> skip", () => {
  const d = decidePreemptRestart({ ...base, uptimeSec: 30 });
  assert.equal(d.action, "skip");
  assert.equal(d.reason, "uptime-too-low");
});

test("within cooldown window -> skip", () => {
  const d = decidePreemptRestart({ ...base, sinceLastPreemptMs: 1000, cooldownMs: 1_800_000 });
  assert.equal(d.action, "skip");
  assert.equal(d.reason, "cooldown");
});

test("pressure + eligible + low inflight (lull) -> restart", () => {
  const d = decidePreemptRestart({ ...base, inflight: 2 });
  assert.equal(d.action, "restart");
  assert.match(d.reason, /^rss-pressure-/);
  assert.equal(d.hardLeak, false);
});

test("pressure + parallel-agent burst (inflight >= defer) below hard ceiling -> defer", () => {
  const d = decidePreemptRestart({ ...base, inflight: 40, rssMB: 20000 });
  assert.equal(d.action, "defer");
  assert.equal(d.reason, "burst-inflight-40");
  assert.equal(d.hardLeak, false);
});

test("hard-ceiling override: RSS past rssHardMB recycles even mid-burst", () => {
  const d = decidePreemptRestart({ ...base, inflight: 200, rssMB: 30000, rssHardMB: 28672 });
  assert.equal(d.action, "restart");
  assert.equal(d.hardLeak, true);
  assert.match(d.reason, /^hard-ceiling-/);
});

test("unknown inflight is a fail-safe: never defers (treated as 0) -> restart", () => {
  const d = decidePreemptRestart({ ...base, inflight: null, rssMB: 20000 });
  assert.equal(d.action, "restart");
  assert.equal(d.inflight, 0);
});

test("inflightDeferAt = 0 disables defer: always restart under pressure even with high inflight", () => {
  const d = decidePreemptRestart({ ...base, inflightDeferAt: 0, inflight: 500, rssMB: 20000 });
  assert.equal(d.action, "restart");
});

test("burst exactly at the defer threshold defers (>= is inclusive)", () => {
  const d = decidePreemptRestart({ ...base, inflight: 8, inflightDeferAt: 8 });
  assert.equal(d.action, "defer");
});

test("burst one below the threshold restarts", () => {
  const d = decidePreemptRestart({ ...base, inflight: 7, inflightDeferAt: 8 });
  assert.equal(d.action, "restart");
});
