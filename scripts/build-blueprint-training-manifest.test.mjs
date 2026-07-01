// Tests for build-blueprint-training-manifest.mjs (U-PSGB-XRAY training push).
// Run: node --test scripts/build-blueprint-training-manifest.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyDoc, foldRecord, emptyAgg } from "./build-blueprint-training-manifest.mjs";

test("classifyDoc — print_score>=min + text layer + no OCR → blueprint_text_ready", () => {
  assert.equal(classifyDoc({ print_score: 5, has_text_layer: true, needs_ocr: false }, 1), "blueprint_text_ready");
});
test("classifyDoc — print-like but needs_ocr → blueprint_needs_ocr", () => {
  assert.equal(classifyDoc({ print_score: 5, has_text_layer: false, needs_ocr: true }, 1), "blueprint_needs_ocr");
});
test("classifyDoc — print-like + no text layer → needs_ocr (scanned drawing)", () => {
  assert.equal(classifyDoc({ print_score: 3, has_text_layer: false }, 1), "blueprint_needs_ocr");
});
test("classifyDoc — needs_real_ocr overrides a present text layer", () => {
  assert.equal(classifyDoc({ print_score: 9, has_text_layer: true, needs_ocr: false, needs_real_ocr: true }, 1), "blueprint_needs_ocr");
});
test("classifyDoc — low score + business role → non_blueprint", () => {
  assert.equal(classifyDoc({ print_score: -6, inferred_role: "QUOTE", has_text_layer: true, needs_ocr: false }, 1), "non_blueprint");
});
test("classifyDoc — role match (ENGINEERING_DRAWING) rescues a low print_score", () => {
  assert.equal(classifyDoc({ print_score: -2, inferred_role_v2: "ENGINEERING_DRAWING", has_text_layer: true, needs_ocr: false }, 1), "blueprint_text_ready");
});
test("classifyDoc — score exactly at threshold is print-like", () => {
  assert.equal(classifyDoc({ print_score: 1, has_text_layer: true, needs_ocr: false }, 1), "blueprint_text_ready");
});
test("classifyDoc — null/garbage never throws → non_blueprint", () => {
  assert.equal(classifyDoc(null, 1), "non_blueprint");
  assert.equal(classifyDoc(undefined, 1), "non_blueprint");
  assert.equal(classifyDoc({ print_score: "NaN" }, 1), "non_blueprint");
  assert.equal(classifyDoc(42, 1), "non_blueprint");
});
test("classifyDoc — threshold is honored (score 2 below min 5 + no role → non_blueprint)", () => {
  assert.equal(classifyDoc({ print_score: 2, inferred_role: "UNKNOWN" }, 5), "non_blueprint");
});

test("emptyAgg — shape", () => {
  const a = emptyAgg();
  assert.deepEqual(a.counts, { blueprint_text_ready: 0, blueprint_needs_ocr: 0, non_blueprint: 0 });
  assert.equal(a.total, 0);
});
test("foldRecord — counts + total + histogram + capped samples", () => {
  const opts = { printScoreMin: 1, sample: 1 };
  let a = emptyAgg();
  foldRecord(a, { id: "x1", print_score: 5, has_text_layer: true, needs_ocr: false, disk_path: "p1" }, opts);
  foldRecord(a, { id: "x2", print_score: 5, has_text_layer: true, needs_ocr: false, disk_path: "p2" }, opts);
  foldRecord(a, { id: "b1", print_score: -9, inferred_role: "INVOICE" }, opts);
  assert.equal(a.total, 3);
  assert.equal(a.counts.blueprint_text_ready, 2);
  assert.equal(a.counts.non_blueprint, 1);
  assert.equal(a.samples.blueprint_text_ready.length, 1); // capped at sample=1
  assert.equal(a.printScoreHistogram[">=5"], 2);
  assert.equal(a.printScoreHistogram["<=-5"], 1);
});
