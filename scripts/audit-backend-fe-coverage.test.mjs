/**
 * Tests for audit-backend-fe-coverage.mjs -- the backend->frontend coverage computation.
 * Run: node scripts/audit-backend-fe-coverage.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeCoverage } from "./audit-backend-fe-coverage.mjs";

function mkMap(obj) {
  // obj: { tool: [actions...] } -> Map<tool,{actions:Set,file}>
  const m = new Map();
  for (const [tool, acts] of Object.entries(obj)) m.set(tool, { actions: new Set(acts), file: `${tool}.ts` });
  return m;
}

test("flags an action absent from the FE string set as orphan", () => {
  const map = mkMap({ prism_x: ["wired_a", "orphan_b"] });
  const fe = new Set(["wired_a", "some_other"]);
  const r = computeCoverage(map, fe);
  const row = r.rows.find((x) => x.tool === "prism_x");
  assert.equal(row.total, 2);
  assert.equal(row.orphan, 1);
  assert.equal(row.referencedCeiling, 1);
  assert.deepEqual(row.orphanActions, ["orphan_b"]);
  assert.equal(row.coverageCeilingPct, 50);
});

test("a dispatcher with every action referenced has 0 orphan and 100% ceiling", () => {
  const map = mkMap({ prism_full: ["a", "b", "c"] });
  const fe = new Set(["a", "b", "c", "extra"]);
  const row = computeCoverage(map, fe).rows[0];
  assert.equal(row.orphan, 0);
  assert.equal(row.coverageCeilingPct, 100);
});

test("a dispatcher with no referenced action is fully orphan (0% ceiling)", () => {
  const map = mkMap({ prism_dark: ["x", "y"] });
  const row = computeCoverage(map, new Set(["unrelated"])).rows[0];
  assert.equal(row.orphan, 2);
  assert.equal(row.coverageCeilingPct, 0);
});

test("skips dispatchers with zero parsed actions (not counted)", () => {
  const map = mkMap({ prism_empty: [], prism_real: ["a"] });
  const r = computeCoverage(map, new Set());
  assert.equal(r.dispatchers, 1);
  assert.equal(r.rows[0].tool, "prism_real");
});

test("rows are sorted by orphan count descending (biggest unexposed surface first)", () => {
  const map = mkMap({ small: ["a", "b"], big: ["c", "d", "e", "f"], mid: ["g", "h", "i"] });
  const r = computeCoverage(map, new Set()); // nothing referenced -> orphan == total
  assert.deepEqual(r.rows.map((x) => x.tool), ["big", "mid", "small"]);
});

test("totals + overall ceiling aggregate across dispatchers", () => {
  const map = mkMap({ a: ["w", "o1", "o2"], b: ["o3", "o4"] });
  const fe = new Set(["w"]); // 1 of 5 referenced
  const r = computeCoverage(map, fe);
  assert.equal(r.totalActions, 5);
  assert.equal(r.totalOrphan, 4);
  assert.equal(r.totalReferencedCeiling, 1);
  assert.equal(r.overallCoverageCeilingPct, 20);
});

test("coverageCeilingPct is a true UPPER bound -- a coincidental common-word match counts as referenced", () => {
  // 'estimate' is a common FE word; the audit deliberately treats any string match as referenced
  // (ceiling), so the orphan set is the high-confidence signal, not the referenced count.
  const map = mkMap({ prism_calc: ["estimate", "kienzle_internal_x"] });
  const fe = new Set(["estimate"]); // coincidental match
  const row = computeCoverage(map, fe).rows[0];
  assert.equal(row.referencedCeiling, 1); // ceiling counts it
  assert.deepEqual(row.orphanActions, ["kienzle_internal_x"]); // the real gap
});

console.log("audit-backend-fe-coverage: all tests passed");
