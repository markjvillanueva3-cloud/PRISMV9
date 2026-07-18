/**
 * Tests for the Phase D1 print->program corpus assembler.
 *   npx tsx --test scripts/build-wedm-print2program-corpus.test.ts
 *
 * The load-bearing invariant (R9 / ML-expert "never leak test data"): the
 * oversampled TRUE print->program TRAIN copies must NEVER appear in val/test,
 * the component split boundaries are preserved, and oversampling inflates ONLY
 * train. Also covers dedup of accidental cross-source duplicates.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { assemblePrint2Program, loadJsonl, PP_TRUE_TRAIN_OVERSAMPLE } from "./build-wedm-print2program-corpus.js";

const mk = (n: string, k = "x"): { instruction: string; input: string; output: string } => ({ instruction: "inst-" + n, input: "in-" + n, output: "out-" + n + "-" + k });
const splitOf = (prefix: string, n: number) => ({
  train: Array.from({ length: n }, (_, i) => mk(prefix + "-tr" + i)),
  val: Array.from({ length: Math.max(1, Math.floor(n / 4)) }, (_, i) => mk(prefix + "-va" + i)),
  test: Array.from({ length: Math.max(1, Math.floor(n / 4)) }, (_, i) => mk(prefix + "-te" + i)),
});

const a2 = splitOf("a2", 12);
const r3 = splitOf("r3", 8);
const ppTrue = Array.from({ length: 5 }, (_, i) => mk("pp" + i)); // the 5 true print->program pairs

test("oversampled true-pair TRAIN copies never leak into val/test", () => {
  const r = assemblePrint2Program({ a2, r3, ppTrue, oversample: 10, seed: 42 });
  const keyOf = (x: { instruction: string; input: string; output: string }) => x.instruction + " " + x.input + " " + x.output;
  const valTest = new Set([...r.val, ...r.test].map(keyOf));
  const oversampled = r.train.filter((x) => x.meta && (x.meta as Record<string, unknown>).oversampled);
  assert.ok(oversampled.length > 0, "expected oversampled copies in train");
  for (const o of oversampled) assert.ok(!valTest.has(keyOf(o)), "leak: " + keyOf(o));
  assert.equal(r.stats.leakage_check, "ok");
});

test("true print->program pairs are present in ALL THREE splits (eval is possible)", () => {
  const r = assemblePrint2Program({ a2, r3, ppTrue, seed: 42 });
  const hasTrue = (rows: typeof r.train) => rows.some((x) => x.meta && (x.meta as Record<string, unknown>).corpus === "print-program-true");
  assert.ok(hasTrue(r.train), "true pair missing from train");
  assert.ok(hasTrue(r.val), "true pair missing from val");
  assert.ok(hasTrue(r.test), "true pair missing from test");
});

test("oversample inflates ONLY train; val/test counts are the natural mix", () => {
  const lo = assemblePrint2Program({ a2, r3, ppTrue, oversample: 1, seed: 42 });
  const hi = assemblePrint2Program({ a2, r3, ppTrue, oversample: 10, seed: 42 });
  assert.equal(lo.val.length, hi.val.length, "val must not change with oversample");
  assert.equal(lo.test.length, hi.test.length, "test must not change with oversample");
  assert.ok(hi.train.length > lo.train.length, "train must grow with oversample");
  // exactly (oversample-1) extra copies per true-train pair.
  assert.equal(hi.train.length - lo.train.length, hi.stats.true_pairs.train_after_oversample / 10 * 9);
});

test("dedup removes accidental cross-source duplicates within a split", () => {
  const dup = mk("shared-dup");
  const a2d = { train: [dup, mk("u1")], val: [mk("v")], test: [mk("t")] };
  const r3d = { train: [dup, mk("u2")], val: [mk("v2")], test: [mk("t2")] }; // dup repeated in train
  const r = assemblePrint2Program({ a2: a2d, r3: r3d, ppTrue: [mk("p")], oversample: 1, seed: 1 });
  assert.ok(r.stats.dedup_removed >= 1, "expected at least one dedup removal");
  const keyOf = (x: { instruction: string; input: string; output: string }) => x.instruction + " " + x.input + " " + x.output;
  const trainKeys = r.train.map(keyOf);
  assert.equal(trainKeys.filter((k) => k === keyOf(dup)).length, 1, "duplicate must appear once in train");
});

test("loadJsonl returns [] for a missing file (no throw)", () => {
  assert.deepEqual(loadJsonl("does/not/exist.jsonl"), []);
});

test("default oversample factor is the exported constant", () => {
  const r = assemblePrint2Program({ a2, r3, ppTrue, seed: 42 });
  const lo = assemblePrint2Program({ a2, r3, ppTrue, oversample: 1, seed: 42 });
  // train_after_oversample == trueTrainCount * PP_TRUE_TRAIN_OVERSAMPLE
  assert.equal(r.stats.true_pairs.train_after_oversample, (lo.stats.true_pairs.train_after_oversample) * PP_TRUE_TRAIN_OVERSAMPLE);
});
