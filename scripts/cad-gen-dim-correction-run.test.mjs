/**
 * Tests for cad-gen-dim-correction-run.mjs collectDivergences (U-DELTA-CADGEN-DIM-CORRECTION, slot:delta).
 * Run: node scripts/cad-gen-dim-correction-run.test.mjs   (node:test auto-runs on exit)
 *
 * R9: uses the REAL parseIntendedDims/dimDivergence/dimDivergenceToFixRow wiring (only the STEP-reading
 * bbox is injected), so the test exercises the genuine end-to-end diff, not a re-derivation.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { collectDivergences } from "./cad-gen-dim-correction-run.mjs";

// inject only the STEP->bbox reader (the I/O leg); parse/diff/row are the real lib functions.
const bboxOf = (map) => (stepText) => map[stepText] ?? null;

test("collectDivergences happy: a prismatic GEN part whose envelope DIVERGES -> 1 fix-row", () => {
  const records = [{ slug: "a-1-0-inch-cube-1", spec: "a 1.0 inch cube", stepText: "STEP_A" }];
  const r = collectDivergences(records, { bboxImpl: bboxOf({ STEP_A: { dims: [38.1, 25.4, 25.4] } }), stamp: "2026-06-28T00:00:00Z" });
  assert.equal(r.prismatic, 1);
  assert.equal(r.diverged, 1);
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].kind, "dimensional-divergence");
  assert.equal(r.rows[0].ts, "2026-06-28T00:00:00Z", "caller stamp propagates");
  assert.equal(r.rows[0].part, "cube");
});

test("collectDivergences: a prismatic part that MATCHES its spec -> 0 rows (no false correction)", () => {
  const records = [{ slug: "ok", spec: "a 1.0 inch cube", stepText: "S" }];
  const r = collectDivergences(records, { bboxImpl: bboxOf({ S: { dims: [25.4, 25.4, 25.4] } }) });
  assert.equal(r.prismatic, 1);
  assert.equal(r.diverged, 0);
  assert.equal(r.rows.length, 0);
});

test("collectDivergences: a non-prismatic (curved) part is SKIPPED, not counted prismatic (R12 no false flag)", () => {
  const records = [{ slug: "cyl", spec: "a 1.5 inch diameter by 2.0 inch tall cylinder", stepText: "S" }];
  const r = collectDivergences(records, { bboxImpl: bboxOf({ S: { dims: [50.8, 19.05, 0] } }) });
  assert.equal(r.prismatic, 0, "curved part must NOT be assessed by the point-bbox diff");
  assert.equal(r.diverged, 0);
  assert.equal(r.skipped, 1);
});

test("collectDivergences failure: an unreadable/unknown-unit STEP (bbox null) is SKIPPED, never a fake row", () => {
  const records = [{ slug: "bad", spec: "a 1.0 inch cube", stepText: "S" }];
  const r = collectDivergences(records, { bboxImpl: bboxOf({ /* S -> null */ }) });
  assert.equal(r.prismatic, 1, "spec parsed");
  assert.equal(r.skipped, 1, "but STEP unreadable -> skipped");
  assert.equal(r.rows.length, 0);
});

test("collectDivergences: mixed corpus -> correct tallies + only diverged prismatic parts make rows", () => {
  const records = [
    { slug: "div", spec: "a 2.0 inch cube", stepText: "BIG" },     // diverged
    { slug: "match", spec: "a 1.0 inch cube", stepText: "OK" },     // match
    { slug: "round", spec: "a 1.0 inch diameter disc 0.25 inch thick", stepText: "R" }, // gated
    { slug: "noread", spec: "a 0.5 inch cube", stepText: "NONE" },  // unreadable
  ];
  const r = collectDivergences(records, {
    bboxImpl: bboxOf({ BIG: { dims: [76.2, 50.8, 50.8] }, OK: { dims: [25.4, 25.4, 25.4] }, R: { dims: [25.4, 12, 0] } }),
    stamp: "2026-06-28T00:00:00Z",
  });
  assert.equal(r.checked, 4);
  assert.equal(r.prismatic, 3, "2 cubes assessed + the unreadable cube parsed but skipped pre-diff");
  assert.equal(r.diverged, 1);
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].slug ?? r.rows[0].source.includes("div"), true);
});

test("collectDivergences adversarial: empty / null records -> all-zero, no throw", () => {
  for (const x of [[], null, undefined]) {
    const r = collectDivergences(x, { bboxImpl: bboxOf({}) });
    assert.deepEqual([r.checked, r.prismatic, r.diverged, r.skipped, r.rows.length], [x === null || x === undefined ? 0 : 0, 0, 0, 0, 0]);
  }
});
