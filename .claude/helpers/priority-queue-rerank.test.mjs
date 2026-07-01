// Tests for priority-queue.mjs U4: applyEvalRerank + readAccumulatedScores. Real
// values; fail on real regression (R9). Pure functions tested directly; scores
// injected so no live loop-state dependency.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { applyEvalRerank, readAccumulatedScores } from "./priority-queue.mjs";

const ids = (arr) => arr.map((u) => u.unit_id);

// ---- applyEvalRerank ----
test("empty scores -> identity order", () => {
  const units = [{ unit_id: "A", _priority: 0, _category: "x" }, { unit_id: "B", _priority: 0, _category: "y" }];
  assert.deepEqual(ids(applyEvalRerank(units, {})), ["A", "B"]);
  assert.deepEqual(ids(applyEvalRerank(units, null)), ["A", "B"]);
});
test("within a tier: healthier category sorts ahead of a failing one", () => {
  const units = [
    { unit_id: "FAIL", _priority: 0, _category: "backend-dev" },
    { unit_id: "OK", _priority: 0, _category: "other" },
  ];
  const scores = { "backend-dev": { n: 3, mean: 0.1 }, other: { n: 3, mean: 0.9 } };
  assert.deepEqual(ids(applyEvalRerank(units, scores)), ["OK", "FAIL"]); // OK rises within tier
});
test("NEVER crosses a priority tier (failing high-prio stays ahead of healthy low-prio)", () => {
  const units = [
    { unit_id: "P0FAIL", _priority: 0, _category: "backend-dev" },
    { unit_id: "P1OK", _priority: 1, _category: "bridge" },
  ];
  const scores = { "backend-dev": { n: 5, mean: 0.05 }, bridge: { n: 5, mean: 0.99 } };
  assert.deepEqual(ids(applyEvalRerank(units, scores)), ["P0FAIL", "P1OK"]); // tier dominates
});
test("homogeneous tier (same category) -> identity no-op (the common case)", () => {
  const units = [
    { unit_id: "A", _priority: 0, _category: "backend-dev" },
    { unit_id: "B", _priority: 0, _category: "backend-dev" },
    { unit_id: "C", _priority: 0, _category: "backend-dev" },
  ];
  const scores = { "backend-dev": { n: 9, mean: 0.2 } };
  assert.deepEqual(ids(applyEvalRerank(units, scores)), ["A", "B", "C"]); // stable, unchanged
});
test("unknown category treated as healthy (mean 1) -> not depressed by absence", () => {
  const units = [
    { unit_id: "KNOWN_LOW", _priority: 0, _category: "backend-dev" },
    { unit_id: "UNSCORED", _priority: 0, _category: "novel" },
  ];
  const scores = { "backend-dev": { n: 3, mean: 0.1 } };
  assert.deepEqual(ids(applyEvalRerank(units, scores)), ["UNSCORED", "KNOWN_LOW"]); // unscored=1 > 0.1
});
test("degenerate: <2 units or non-array -> safe", () => {
  assert.deepEqual(applyEvalRerank([{ unit_id: "A" }], { x: { n: 1, mean: 0 } }).map((u) => u.unit_id), ["A"]);
  assert.deepEqual(applyEvalRerank(null, {}), []);
});

// ---- readAccumulatedScores ----
test("readAccumulatedScores: missing dir -> {} (fail-soft)", () => {
  assert.deepEqual(readAccumulatedScores({ dir: path.join(os.tmpdir(), `no-loops-${Date.now()}`) }), {});
});
test("readAccumulatedScores: n-weighted merge across loop files", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pq-rerank-"));
  try {
    fs.writeFileSync(path.join(dir, "loop-a.json"), JSON.stringify({ evalsByType: { "backend-dev": { n: 2, mean: 1.0 } } }));
    fs.writeFileSync(path.join(dir, "loop-b.json"), JSON.stringify({ evalsByType: { "backend-dev": { n: 2, mean: 0.0 } } }));
    fs.writeFileSync(path.join(dir, "loop-c.json"), JSON.stringify({ junk: true })); // ignored
    const m = readAccumulatedScores({ dir });
    assert.equal(m["backend-dev"].n, 4);
    assert.ok(Math.abs(m["backend-dev"].mean - 0.5) < 1e-9); // (2*1 + 2*0)/4
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test("readAccumulatedScores: corrupt file skipped, never throws", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pq-rerank-corrupt-"));
  try {
    fs.writeFileSync(path.join(dir, "loop-bad.json"), "{not json");
    fs.writeFileSync(path.join(dir, "loop-ok.json"), JSON.stringify({ evalsByType: { bridge: { n: 1, mean: 0.7 } } }));
    const m = readAccumulatedScores({ dir });
    assert.deepEqual(m.bridge, { n: 1, mean: 0.7 });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
