// route-suggest-decay.test.mjs -- real-behavior tests for the advisory-decay actor.
// node --test scripts/lib/route-suggest-decay.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  computeSuppressSet,
  loadSuppressSet,
  isRouteSuggestDecaySuppressed,
  _resetCache,
  DEFAULT_MAX_AGE_MS,
} from "./route-suggest-decay.mjs";

const NOW = 1781200000000; // fixed reference instant
const freshTs = (offsetMs = 0) => new Date(NOW - offsetMs).toISOString();

// Build an audit object shaped like audit-mcp-route-takerate.mjs summarize() output.
function mkAudit(rows, ageMs = 0) {
  return { summary: {}, rows, meta: { ts: freshTs(ageMs) } };
}

// ---- computeSuppressSet: happy path ----
test("suppress row with measured takes is in the set", () => {
  const a = mkAudit([{ classifier: "doctrineSurface", fires: 4357, takes: 10, recommendation: "suppress" }]);
  const r = computeSuppressSet(a, { now: NOW });
  assert.equal(r.suppressed.has("doctrineSurface"), true);
  assert.equal(r.stale, false);
  assert.equal(r.reason, "ok");
});

test("multiple suppress rows all land in the set", () => {
  const a = mkAudit([
    { classifier: "isBroadGrep", fires: 800, takes: 5, recommendation: "suppress" },
    { classifier: "doctrineSurface", fires: 4357, takes: 10, recommendation: "suppress" },
    { classifier: "ollama", fires: 200, takes: 90, recommendation: "keep" },
  ]);
  const r = computeSuppressSet(a, { now: NOW });
  assert.deepEqual([...r.suppressed].sort(), ["doctrineSurface", "isBroadGrep"]);
});

// ---- non-suppress recommendations are never muted ----
test("keep / retune / verify-wiring rows are NOT suppressed", () => {
  const a = mkAudit([
    { classifier: "ollama", fires: 200, takes: 90, recommendation: "keep" },
    { classifier: "isVerboseBash", fires: 40, takes: 1, recommendation: "retune" },
    { classifier: "backendAuditChain", fires: 4108, takes: 0, recommendation: "verify-wiring" },
  ]);
  const r = computeSuppressSet(a, { now: NOW });
  assert.equal(r.suppressed.size, 0);
});

// ---- U-CLASSIFY-SUPPRESS-CANDIDATE: the advisory verdict is NEVER auto-decayed ----
// The operator chose hybrid Option A: a dominant proven-net-cost 0-take classifier is graded
// 'suppress-candidate' (advisory) so the dashboard flags it WITHOUT the decay actor muting it.
// This is the load-bearing guarantee -- the decay actor matches recommendation==='suppress' EXACTLY,
// so the lookalike 'suppress-candidate' string must not slip through.
test("suppress-candidate (advisory, takes===0, dominant) is NEVER suppressed -- nudges keep firing", () => {
  const a = mkAudit([
    { classifier: "isVerboseBash", fires: 368, takes: 0, recommendation: "suppress-candidate" },
    { classifier: "doctrineSurface", fires: 71, takes: 0, recommendation: "suppress-candidate" },
  ]);
  const r = computeSuppressSet(a, { now: NOW });
  assert.equal(r.suppressed.size, 0, "suppress-candidate must not be treated as suppress");
  assert.equal(r.suppressed.has("isVerboseBash"), false);
});

// ---- safety: verify-wiring measurement artifact never muted (failure mode) ----
test("verify-wiring with 0 takes is never suppressed", () => {
  const a = mkAudit([{ classifier: "isLargeRead", fires: 7325, takes: 0, recommendation: "verify-wiring" }]);
  const r = computeSuppressSet(a, { now: NOW });
  assert.equal(r.suppressed.has("isLargeRead"), false);
});

// ---- adversarial: malformed audit marks suppress but takes===0 -> belt-and-suspenders blocks it ----
test("ADVERSARIAL: suppress row with takes===0 is refused (measurement artifact)", () => {
  const a = mkAudit([{ classifier: "isLargeRead", fires: 7325, takes: 0, recommendation: "suppress" }]);
  const r = computeSuppressSet(a, { now: NOW });
  assert.equal(r.suppressed.has("isLargeRead"), false);
});

// ---- adversarial: suppress row with fires===0 refused ----
test("ADVERSARIAL: suppress row with fires===0 is refused", () => {
  const a = mkAudit([{ classifier: "isBroadGlob", fires: 0, takes: 3, recommendation: "suppress" }]);
  const r = computeSuppressSet(a, { now: NOW });
  assert.equal(r.suppressed.has("isBroadGlob"), false);
});

// ---- adversarial: empty-string classifier never added ----
test("ADVERSARIAL: empty classifier name never added", () => {
  const a = mkAudit([{ classifier: "", fires: 999, takes: 5, recommendation: "suppress" }]);
  const r = computeSuppressSet(a, { now: NOW });
  assert.equal(r.suppressed.size, 0);
});

// ---- freshness guard (failure mode) ----
test("stale audit (>7d) yields empty set + stale flag", () => {
  const a = mkAudit([{ classifier: "doctrineSurface", fires: 4357, takes: 10, recommendation: "suppress" }], DEFAULT_MAX_AGE_MS + 60000);
  const r = computeSuppressSet(a, { now: NOW });
  assert.equal(r.suppressed.size, 0);
  assert.equal(r.stale, true);
  assert.equal(r.reason, "stale-audit");
});

test("audit just under the staleness ceiling still applies", () => {
  const a = mkAudit([{ classifier: "doctrineSurface", fires: 4357, takes: 10, recommendation: "suppress" }], DEFAULT_MAX_AGE_MS - 60000);
  const r = computeSuppressSet(a, { now: NOW });
  assert.equal(r.suppressed.has("doctrineSurface"), true);
  assert.equal(r.stale, false);
});

// ---- null / malformed input (failure modes) ----
test("null audit yields empty set with reason no-audit", () => {
  const r = computeSuppressSet(null, { now: NOW });
  assert.equal(r.suppressed.size, 0);
  assert.equal(r.reason, "no-audit");
});

test("audit with no rows array yields empty set", () => {
  const r = computeSuppressSet({ meta: { ts: freshTs() } }, { now: NOW });
  assert.equal(r.suppressed.size, 0);
});

// ---- loadSuppressSet: IO fail-safe + round-trip ----
test("loadSuppressSet on unreadable file yields empty + audit-unreadable", () => {
  const missing = path.join(os.tmpdir(), "prism-decay-does-not-exist-xyz.json");
  const r = loadSuppressSet({ auditFile: missing, now: NOW });
  assert.equal(r.suppressed.size, 0);
  assert.equal(r.reason, "audit-unreadable");
});

test("loadSuppressSet round-trips a real audit file on disk", () => {
  const f = path.join(os.tmpdir(), `prism-decay-rt-${process.pid}.json`);
  fs.writeFileSync(f, JSON.stringify(mkAudit([{ classifier: "doctrineSurface", fires: 4357, takes: 10, recommendation: "suppress" }])));
  try {
    const r = loadSuppressSet({ auditFile: f, now: NOW });
    assert.equal(r.suppressed.has("doctrineSurface"), true);
  } finally {
    fs.rmSync(f, { force: true });
  }
});

// ---- isRouteSuggestDecaySuppressed: predicate + knob ----
test("predicate returns true for a suppressed classifier via real file", () => {
  _resetCache();
  const f = path.join(os.tmpdir(), `prism-decay-pred-${process.pid}.json`);
  fs.writeFileSync(f, JSON.stringify(mkAudit([{ classifier: "doctrineSurface", fires: 4357, takes: 10, recommendation: "suppress" }])));
  try {
    assert.equal(isRouteSuggestDecaySuppressed("doctrineSurface", { auditFile: f, now: NOW, fresh: true }), true);
    assert.equal(isRouteSuggestDecaySuppressed("ollama", { auditFile: f, now: NOW, fresh: true }), false);
  } finally {
    fs.rmSync(f, { force: true });
    _resetCache();
  }
});

test("ADVERSARIAL: PRISM_ROUTE_DECAY_DISABLE=1 forces false unconditionally", () => {
  _resetCache();
  const prev = process.env.PRISM_ROUTE_DECAY_DISABLE;
  process.env.PRISM_ROUTE_DECAY_DISABLE = "1";
  try {
    // even with a suppress verdict on disk, the knob wins
    assert.equal(isRouteSuggestDecaySuppressed("doctrineSurface", { fresh: true }), false);
  } finally {
    if (prev === undefined) delete process.env.PRISM_ROUTE_DECAY_DISABLE; else process.env.PRISM_ROUTE_DECAY_DISABLE = prev;
    _resetCache();
  }
});

test("predicate returns false for empty / non-string classifier", () => {
  assert.equal(isRouteSuggestDecaySuppressed("", { fresh: true }), false);
  assert.equal(isRouteSuggestDecaySuppressed(null, { fresh: true }), false);
});
