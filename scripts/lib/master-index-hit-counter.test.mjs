// Tests for master-index-hit-counter.mjs
// Uses node:test (matches master-index-search-lib.test.mjs sibling).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SCHEMA_VERSION,
  DEFAULT_MAX_QUERIES,
  DEFAULT_MAX_NODES,
  mkEmptyState,
  applyHitDelta,
  pruneOverflow,
  summarizeState,
} from "./master-index-hit-counter.mjs";

const T1 = "2026-05-18T22:00:00.000Z";
const T2 = "2026-05-18T22:05:00.000Z";
const T3 = "2026-05-18T22:10:00.000Z";

const HIT_A = { label: "engineFoo", layer: "L7", status: "built" };
const HIT_B = { label: "engineBar", layer: "L7", status: "stub" };
const HIT_C = { label: "engineBaz", layer: "L4", status: "built" };

// --- mkEmptyState ----------------------------------------------------------

test("mkEmptyState returns canonical empty schema", () => {
  const s = mkEmptyState();
  assert.equal(s.schemaVersion, SCHEMA_VERSION);
  assert.equal(s.schemaVersion, "1.0.0");
  assert.equal(s.totalInjections, 0);
  assert.equal(s.totalHits, 0);
  assert.equal(s.queryCount, 0);
  assert.equal(s.nodeCount, 0);
  assert.equal(s.updatedAtIso, null);
  assert.deepEqual(s.queries, {});
  assert.deepEqual(s.nodes, {});
});

test("mkEmptyState produces independent instances", () => {
  const a = mkEmptyState();
  const b = mkEmptyState();
  a.queries["x"] = { count: 1 };
  assert.deepEqual(b.queries, {});
});

// --- applyHitDelta: happy path --------------------------------------------

test("applyHitDelta records new queries and new nodes", () => {
  const s0 = mkEmptyState();
  const s1 = applyHitDelta(s0, ["alpha", "beta"], [HIT_A, HIT_B], T1);
  assert.equal(s1.totalInjections, 1);
  assert.equal(s1.totalHits, 2);
  assert.equal(s1.queryCount, 2);
  assert.equal(s1.nodeCount, 2);
  assert.equal(s1.updatedAtIso, T1);
  assert.equal(s1.queries["alpha"].count, 1);
  assert.equal(s1.queries["alpha"].firstSeenIso, T1);
  assert.equal(s1.queries["alpha"].lastSeenIso, T1);
  assert.equal(s1.nodes["engineFoo"].count, 1);
  assert.equal(s1.nodes["engineFoo"].layer, "L7");
  assert.equal(s1.nodes["engineFoo"].status, "built");
});

test("applyHitDelta increments existing entries and updates lastSeen", () => {
  const s0 = mkEmptyState();
  const s1 = applyHitDelta(s0, ["alpha"], [HIT_A], T1);
  const s2 = applyHitDelta(s1, ["alpha"], [HIT_A], T2);
  assert.equal(s2.queries["alpha"].count, 2);
  assert.equal(s2.queries["alpha"].firstSeenIso, T1);
  assert.equal(s2.queries["alpha"].lastSeenIso, T2);
  assert.equal(s2.nodes["engineFoo"].count, 2);
  assert.equal(s2.nodes["engineFoo"].firstSeenIso, T1);
  assert.equal(s2.nodes["engineFoo"].lastSeenIso, T2);
  assert.equal(s2.totalInjections, 2);
  assert.equal(s2.totalHits, 2);
});

test("applyHitDelta refreshes node layer/status on later hits", () => {
  const s0 = mkEmptyState();
  const s1 = applyHitDelta(s0, [], [{ label: "engineFoo", layer: "L7", status: "stub" }], T1);
  const s2 = applyHitDelta(s1, [], [{ label: "engineFoo", layer: "L7", status: "built" }], T2);
  assert.equal(s2.nodes["engineFoo"].status, "built");
  assert.equal(s2.nodes["engineFoo"].layer, "L7");
});

test("applyHitDelta does NOT downgrade layer/status to null when later hit lacks them", () => {
  const s0 = mkEmptyState();
  const s1 = applyHitDelta(s0, [], [{ label: "engineFoo", layer: "L7", status: "built" }], T1);
  const s2 = applyHitDelta(s1, [], [{ label: "engineFoo" }], T2);
  assert.equal(s2.nodes["engineFoo"].layer, "L7");
  assert.equal(s2.nodes["engineFoo"].status, "built");
});

test("applyHitDelta dedupes tokens within a single event", () => {
  const s = applyHitDelta(mkEmptyState(), ["alpha", "alpha", "ALPHA"], [HIT_A], T1);
  // ALPHA (case-different) is a distinct token by design — both should appear.
  assert.equal(s.queries["alpha"].count, 1);
  assert.equal(s.queries["ALPHA"].count, 1);
  assert.equal(s.queryCount, 2);
});

// --- applyHitDelta: edge cases / fail-safe --------------------------------

test("applyHitDelta with empty tokens AND empty hits is a no-op", () => {
  const s0 = applyHitDelta(mkEmptyState(), ["alpha"], [HIT_A], T1);
  const s1 = applyHitDelta(s0, [], [], T2);
  assert.equal(s1.totalInjections, s0.totalInjections);
  assert.equal(s1.totalHits, s0.totalHits);
  assert.equal(s1.queryCount, s0.queryCount);
});

test("applyHitDelta skips malformed hits without throwing", () => {
  const s = applyHitDelta(
    mkEmptyState(),
    ["alpha"],
    [null, undefined, {}, { label: "" }, { label: 42 }, HIT_A],
    T1,
  );
  assert.equal(s.totalHits, 1);
  assert.equal(s.nodeCount, 1);
  assert.equal(s.nodes["engineFoo"].count, 1);
});

test("applyHitDelta with malformed state still returns valid state", () => {
  const out = applyHitDelta(null, ["q"], [HIT_A], T1);
  assert.equal(out.schemaVersion, SCHEMA_VERSION);
  assert.equal(out.queryCount, 1);
  assert.equal(out.nodeCount, 1);
});

test("applyHitDelta with non-array tokens coerces to []", () => {
  const s = applyHitDelta(mkEmptyState(), "not-an-array", [HIT_A], T1);
  assert.equal(s.queryCount, 0);
  assert.equal(s.nodeCount, 1);
});

test("applyHitDelta never mutates input state (purity)", () => {
  const s0 = mkEmptyState();
  const snap = JSON.stringify(s0);
  applyHitDelta(s0, ["alpha"], [HIT_A], T1);
  assert.equal(JSON.stringify(s0), snap);
});

// --- pruneOverflow ---------------------------------------------------------

test("pruneOverflow trims oldest by lastSeenIso", () => {
  let s = mkEmptyState();
  s = applyHitDelta(s, ["oldest"], [], T1);
  s = applyHitDelta(s, ["middle"], [], T2);
  s = applyHitDelta(s, ["newest"], [], T3);
  const pruned = pruneOverflow(s, 2, 5000);
  assert.equal(pruned.queryCount, 2);
  assert.equal(pruned.queries["oldest"], undefined);
  assert.ok(pruned.queries["middle"]);
  assert.ok(pruned.queries["newest"]);
});

test("pruneOverflow with cap above size is a no-op", () => {
  let s = mkEmptyState();
  s = applyHitDelta(s, ["a", "b"], [HIT_A, HIT_B], T1);
  const pruned = pruneOverflow(s, 100, 100);
  assert.equal(pruned.queryCount, 2);
  assert.equal(pruned.nodeCount, 2);
});

test("pruneOverflow with cap=0 empties the maps", () => {
  let s = mkEmptyState();
  s = applyHitDelta(s, ["a"], [HIT_A], T1);
  const pruned = pruneOverflow(s, 0, 0);
  assert.equal(pruned.queryCount, 0);
  assert.equal(pruned.nodeCount, 0);
});

test("pruneOverflow defaults are sane", () => {
  assert.equal(DEFAULT_MAX_QUERIES, 2000);
  assert.equal(DEFAULT_MAX_NODES, 5000);
});

// --- summarizeState --------------------------------------------------------

test("summarizeState returns top-K by count desc", () => {
  let s = mkEmptyState();
  s = applyHitDelta(s, ["hot"], [HIT_A], T1);
  s = applyHitDelta(s, ["hot"], [HIT_A], T2);
  s = applyHitDelta(s, ["hot"], [HIT_A], T3);
  s = applyHitDelta(s, ["warm"], [HIT_B], T2);
  s = applyHitDelta(s, ["warm"], [HIT_B], T3);
  s = applyHitDelta(s, ["cold"], [HIT_C], T1);
  const sum = summarizeState(s, { topQueries: 2, topNodes: 2 });
  assert.equal(sum.topQueries.length, 2);
  assert.equal(sum.topQueries[0].token, "hot");
  assert.equal(sum.topQueries[0].count, 3);
  assert.equal(sum.topQueries[1].token, "warm");
  assert.equal(sum.topNodes[0].label, "engineFoo");
  assert.equal(sum.topNodes[0].count, 3);
});

test("summarizeState preserves totals from state", () => {
  let s = mkEmptyState();
  s = applyHitDelta(s, ["a"], [HIT_A, HIT_B], T1);
  const sum = summarizeState(s);
  assert.equal(sum.totalInjections, 1);
  assert.equal(sum.totalHits, 2);
  assert.equal(sum.updatedAtIso, T1);
});

test("summarizeState handles null/empty state gracefully", () => {
  const sum = summarizeState(null);
  assert.equal(sum.totalInjections, 0);
  assert.equal(sum.totalHits, 0);
  assert.deepEqual(sum.topQueries, []);
  assert.deepEqual(sum.topNodes, []);
});

// --- regression guards (fail-on-revert) -----------------------------------

test("REGRESSION-GUARD: schemaVersion is locked at 1.0.0", () => {
  // Bumping requires a migration story; this test is the trip-wire.
  assert.equal(SCHEMA_VERSION, "1.0.0");
});

test("P1-FIX: summarizeState comparator survives malformed count (NaN/string/undef)", () => {
  // Reviewer A round-2 P1 — the prior 4-element input did NOT fail-on-revert
  // because V8 TimSort preserves insertion order for the NaN/string elements.
  // This stronger oracle:
  //  (1) uses an input where the BUGGY comparator's string-coerce flips a pair
  //  (2) asserts the finite entry leads (catches "comparator returns NaN" via
  //      Array.sort's well-known undefined behavior under non-numeric returns)
  //  (3) re-runs to confirm stability
  const s = mkEmptyState();
  // Buggy `cb - ca` on `count: "10" - count: 5` returns 5 (numeric coerce),
  // so buggy code would put "10"-string FIRST despite both being hostile;
  // the fix coerces "10" to 0 (Number.isFinite("10") === false) so 5 wins.
  s.nodes["finite5"] = { label: "finite5", layer: "L7", status: "built", count: 5, firstSeenIso: T1, lastSeenIso: T3 };
  s.nodes["str10"] = { label: "str10", layer: "L7", status: "built", count: "10", firstSeenIso: T1, lastSeenIso: T2 };
  s.nodes["nan"] = { label: "nan", layer: "L7", status: "built", count: NaN, firstSeenIso: T1, lastSeenIso: T1 };
  s.nodes["undef"] = { label: "undef", layer: "L7", status: "built", count: undefined, firstSeenIso: T1, lastSeenIso: T1 };
  s.nodes["finite7"] = { label: "finite7", layer: "L7", status: "built", count: 7, firstSeenIso: T1, lastSeenIso: T1 };
  const sum = summarizeState(s, { topNodes: 5 });
  // Under the fix: finite7 (count=7) > finite5 (count=5) > all non-finite (count→0).
  // Under the BUG (string subtraction): str10 would lead, finite7 second, finite5 third.
  // → asserting finite7 + finite5 lead catches the revert.
  assert.equal(sum.topNodes[0].label, "finite7", "finite count=7 must lead");
  assert.equal(sum.topNodes[1].label, "finite5", "finite count=5 must be second");
  // Stability: hostile entries must produce a deterministic order across re-runs.
  const sum2 = summarizeState(s, { topNodes: 5 });
  assert.deepEqual(
    sum.topNodes.map((n) => n.label),
    sum2.topNodes.map((n) => n.label),
    "sort must be deterministic — no NaN comparison leaks",
  );
});

test("REGRESSION-GUARD: cloneOrInit does not leak mutation across state copies", () => {
  // If applyHitDelta ever shares queries/nodes refs across returns, this
  // catches it deterministically.
  const s0 = mkEmptyState();
  const s1 = applyHitDelta(s0, ["a"], [HIT_A], T1);
  const s2 = applyHitDelta(s0, ["b"], [HIT_B], T2);
  // s1 should NOT contain 'b'; s2 should NOT contain 'a'.
  assert.equal(s1.queries["b"], undefined);
  assert.equal(s2.queries["a"], undefined);
  assert.equal(s1.queryCount, 1);
  assert.equal(s2.queryCount, 1);
});
