#!/usr/bin/env node
/**
 * feature-counter.test.mjs — unit tests for S6 shared counter lib.
 * Run: node --test .claude/helpers/feature-counter.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  mergeCount,
  buildFreshState,
  incrementFeature,
  readState,
  SCHEMA_VERSION,
} from "./feature-counter.mjs";

const _tmpFiles = new Set();
function tmpFile() {
  const f = path.join(os.tmpdir(), `feature-counter-${Date.now()}-${Math.random()}.json`);
  _tmpFiles.add(f);
  return f;
}
process.on("exit", () => {
  for (const f of _tmpFiles) {
    try { fs.unlinkSync(f); } catch { /* best-effort */ }
  }
});

// ---- buildFreshState -------------------------------------------------------

test("buildFreshState: produces a v1.0.0 empty state", () => {
  const s = buildFreshState();
  assert.equal(s.schemaVersion, SCHEMA_VERSION);
  assert.equal(s.totalIncrements, 0);
  assert.deepEqual(s.features, {});
  assert.ok(s.updatedAtIso);
});

// ---- mergeCount domain dim (U-GALAXY-MS1-E2, Phase C, 2026-05-26) ---------

test("mergeCount: domain param populates perDomain + lastDomain + perDomainTotals", () => {
  const s = mergeCount(null, "PSN", { slot: "alpha", domain: "mill", nowIso: "2026-05-27T01:00:00Z" });
  assert.equal(s.features.PSN.count, 1);
  assert.equal(s.features.PSN.lastDomain, "mill");
  assert.deepEqual(s.features.PSN.perDomain, { mill: 1 });
  assert.deepEqual(s.perDomainTotals, { mill: 1 });
  // Second increment with different domain accumulates per-feature + top-level
  const s2 = mergeCount(s, "PSN", { slot: "charlie", domain: "quoting", nowIso: "2026-05-27T01:01:00Z" });
  assert.deepEqual(s2.features.PSN.perDomain, { mill: 1, quoting: 1 });
  assert.deepEqual(s2.perDomainTotals, { mill: 1, quoting: 1 });
  assert.equal(s2.features.PSN.lastDomain, "quoting");
});

test("mergeCount: backwards-compat — legacy call without domain preserves null + empty perDomain", () => {
  // Legacy callers that haven't been patched to pass domain (the 9 D-tier wire sites from Phase 5)
  // must continue to work; entries get null lastDomain + empty perDomain + no perDomainTotals bump.
  const s = mergeCount(null, "SystemViz", { slot: "alpha", nowIso: "2026-05-27T01:02:00Z" });
  assert.equal(s.features.SystemViz.lastDomain, null);
  assert.deepEqual(s.features.SystemViz.perDomain, {});
  assert.deepEqual(s.perDomainTotals, {});
  // Re-incrementing without domain still does not introduce a domain key
  const s2 = mergeCount(s, "SystemViz", { slot: "bravo", nowIso: "2026-05-27T01:03:00Z" });
  assert.deepEqual(s2.features.SystemViz.perDomain, {});
  assert.deepEqual(s2.perDomainTotals, {});
});

// ---- mergeCount (pure-core) ------------------------------------------------

test("mergeCount: first increment seeds the feature entry", () => {
  const s = mergeCount(null, "PSN", { slot: "alpha", nowIso: "2026-05-26T17:00:00Z" });
  assert.equal(s.features.PSN.count, 1);
  assert.equal(s.features.PSN.firstSeenIso, "2026-05-26T17:00:00Z");
  assert.equal(s.features.PSN.lastSeenIso, "2026-05-26T17:00:00Z");
  assert.equal(s.features.PSN.lastSlot, "alpha");
  assert.deepEqual(s.features.PSN.perSlot, { alpha: 1 });
  assert.equal(s.totalIncrements, 1);
});

test("mergeCount: second increment preserves firstSeen, advances lastSeen", () => {
  const s1 = mergeCount(null, "PSN", { slot: "alpha", nowIso: "2026-05-26T17:00:00Z" });
  const s2 = mergeCount(s1, "PSN", { slot: "alpha", nowIso: "2026-05-26T17:05:00Z" });
  assert.equal(s2.features.PSN.count, 2);
  assert.equal(s2.features.PSN.firstSeenIso, "2026-05-26T17:00:00Z"); // preserved
  assert.equal(s2.features.PSN.lastSeenIso, "2026-05-26T17:05:00Z"); // advanced
  assert.equal(s2.features.PSN.perSlot.alpha, 2);
  assert.equal(s2.totalIncrements, 2);
});

test("mergeCount: per-slot subcount tracks each slot independently", () => {
  let s = mergeCount(null, "PSN", { slot: "alpha", nowIso: "2026-05-26T17:00:00Z" });
  s = mergeCount(s, "PSN", { slot: "bravo", nowIso: "2026-05-26T17:01:00Z" });
  s = mergeCount(s, "PSN", { slot: "alpha", nowIso: "2026-05-26T17:02:00Z" });
  assert.equal(s.features.PSN.count, 3);
  assert.equal(s.features.PSN.perSlot.alpha, 2);
  assert.equal(s.features.PSN.perSlot.bravo, 1);
  assert.equal(s.features.PSN.lastSlot, "alpha");
});

test("mergeCount: different features stay independent", () => {
  let s = mergeCount(null, "PSN", { slot: "alpha" });
  s = mergeCount(s, "WikiInject", { slot: "alpha" });
  s = mergeCount(s, "PSN", { slot: "alpha" });
  assert.equal(s.features.PSN.count, 2);
  assert.equal(s.features.WikiInject.count, 1);
  assert.equal(s.totalIncrements, 3);
});

test("mergeCount: schema-mismatch state is treated as fresh", () => {
  const bogus = { schemaVersion: "0.9.0-old", features: { x: { count: 999 } } };
  const s = mergeCount(bogus, "PSN", { slot: "alpha" });
  assert.equal(s.schemaVersion, SCHEMA_VERSION);
  assert.equal(s.features.PSN.count, 1);
  assert.equal(s.features.x, undefined, "stale features dropped on schema reset");
});

test("mergeCount: empty/whitespace featureName is a no-op (returns state unchanged)", () => {
  const prior = buildFreshState();
  assert.equal(mergeCount(prior, "", { slot: "alpha" }), prior);
  assert.equal(mergeCount(prior, "   ", { slot: "alpha" }), prior);
});

test("mergeCount: null slot doesn't touch perSlot", () => {
  const s = mergeCount(null, "PSN", { slot: null, nowIso: "2026-05-26T17:00:00Z" });
  assert.equal(s.features.PSN.count, 1);
  assert.deepEqual(s.features.PSN.perSlot, {});
  assert.equal(s.features.PSN.lastSlot, null);
});

// ---- incrementFeature (IO) -------------------------------------------------

test("incrementFeature: writes a new state file when none exists", () => {
  const f = tmpFile();
  const count = incrementFeature("PSN", { slot: "alpha", stateFile: f });
  assert.equal(count, 1);
  assert.ok(fs.existsSync(f));
  const parsed = JSON.parse(fs.readFileSync(f, "utf8"));
  assert.equal(parsed.features.PSN.count, 1);
});

test("incrementFeature: accumulates across multiple calls", () => {
  const f = tmpFile();
  incrementFeature("PSN", { slot: "alpha", stateFile: f });
  incrementFeature("PSN", { slot: "alpha", stateFile: f });
  const count = incrementFeature("PSN", { slot: "bravo", stateFile: f });
  assert.equal(count, 3);
  const parsed = JSON.parse(fs.readFileSync(f, "utf8"));
  assert.equal(parsed.features.PSN.perSlot.alpha, 2);
  assert.equal(parsed.features.PSN.perSlot.bravo, 1);
});

test("incrementFeature: PRISM_FEATURE_COUNTER_DISABLE=1 returns null (no-op)", () => {
  const f = tmpFile();
  const prior = process.env.PRISM_FEATURE_COUNTER_DISABLE;
  process.env.PRISM_FEATURE_COUNTER_DISABLE = "1";
  try {
    const count = incrementFeature("PSN", { slot: "alpha", stateFile: f });
    assert.equal(count, null);
    assert.equal(fs.existsSync(f), false, "no file written under disable");
  } finally {
    if (prior === undefined) delete process.env.PRISM_FEATURE_COUNTER_DISABLE;
    else process.env.PRISM_FEATURE_COUNTER_DISABLE = prior;
  }
});

test("incrementFeature: corrupt JSON file is treated as fresh (no throw)", () => {
  const f = tmpFile();
  fs.writeFileSync(f, "{not valid json", "utf8");
  const count = incrementFeature("PSN", { slot: "alpha", stateFile: f });
  assert.equal(count, 1, "corrupt file resets cleanly to fresh state");
});

test("readState: returns fresh state when file missing", () => {
  const f = tmpFile();
  const s = readState(f);
  assert.equal(s.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(s.features, {});
});

test("readState: returns parsed state when file present", () => {
  const f = tmpFile();
  incrementFeature("WikiInject", { slot: "alpha", stateFile: f });
  const s = readState(f);
  assert.equal(s.features.WikiInject.count, 1);
});
