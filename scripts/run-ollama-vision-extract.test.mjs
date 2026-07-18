// scripts/run-ollama-vision-extract.test.mjs
// Tests for the runner's pure page-selection logic (U-PSGB-XRAY-MULTIPAGE #1).
// The render+VLM loop is integration-tested separately (GPU-bound); selectPages
// is the pure decision that governs WHICH pages get processed — the fix for the
// "page 0 only → ~76% of pages dropped" bug. Run: node --test <file>

import { test } from "node:test";
import assert from "node:assert/strict";
import { selectPages, buildRenderArgs } from "./run-ollama-vision-extract.mjs";

test("selectPages: default (no opts) → ALL pages (the multi-print fix)", () => {
  assert.deepEqual(selectPages(4), [0, 1, 2, 3]);
  assert.deepEqual(selectPages(1), [0]);
  assert.deepEqual(selectPages(31), Array.from({ length: 31 }, (_, i) => i));
});
test("selectPages: explicit --page N → just that page (back-compat)", () => {
  assert.deepEqual(selectPages(4, { page: 0 }), [0]);
  assert.deepEqual(selectPages(4, { page: 2 }), [2]);
  assert.deepEqual(selectPages(4, { page: 3 }), [3]);
});
test("selectPages: --page out of range → empty (caller errors loud)", () => {
  assert.deepEqual(selectPages(4, { page: 4 }), []);
  assert.deepEqual(selectPages(4, { page: 99 }), []);
  assert.deepEqual(selectPages(4, { page: -1 }), []);
});
test("selectPages: --max-pages caps the count, keeps leading pages", () => {
  assert.deepEqual(selectPages(31, { maxPages: 3 }), [0, 1, 2]);
  assert.deepEqual(selectPages(2, { maxPages: 5 }), [0, 1]); // cap > count → all
  assert.deepEqual(selectPages(10, { maxPages: 10 }), Array.from({ length: 10 }, (_, i) => i));
});
test("selectPages: --page overrides --max-pages (single page wins)", () => {
  assert.deepEqual(selectPages(31, { page: 5, maxPages: 3 }), [5]);
});
test("selectPages: zero/invalid page count → empty (no crash)", () => {
  assert.deepEqual(selectPages(0), []);
  assert.deepEqual(selectPages(-3), []);
  assert.deepEqual(selectPages(NaN), []);
  assert.deepEqual(selectPages("not a number"), []);
  assert.deepEqual(selectPages(undefined), []);
});
test("selectPages: fractional count/opts floored (defensive)", () => {
  assert.deepEqual(selectPages(3.9), [0, 1, 2]);
  assert.deepEqual(selectPages(10, { maxPages: 2.9 }), [0, 1]);
  assert.deepEqual(selectPages(10, { page: 2.9 }), [2]);
});
test("selectPages: maxPages 0 or negative = unlimited", () => {
  assert.deepEqual(selectPages(3, { maxPages: 0 }), [0, 1, 2]);
  assert.deepEqual(selectPages(3, { maxPages: -1 }), [0, 1, 2]);
});

// ── buildRenderArgs (#2 scan-preprocessing flag threading) ─────────
const BASE = ["scr.py", "x.pdf", "out.png", "--dpi", "150", "--page", "2"];
test("buildRenderArgs: no preprocessing → base render args only (back-compat rgb)", () => {
  assert.deepEqual(buildRenderArgs("scr.py", "x.pdf", "out.png", 150, 2), BASE);
  assert.deepEqual(buildRenderArgs("scr.py", "x.pdf", "out.png", 150, 2, {}), BASE);
});
test("buildRenderArgs: --grayscale appended", () => {
  assert.deepEqual(buildRenderArgs("scr.py", "x.pdf", "out.png", 150, 2, { grayscale: true }), [...BASE, "--grayscale"]);
});
test("buildRenderArgs: --preprocess appended (grayscale base implied in py)", () => {
  assert.deepEqual(buildRenderArgs("scr.py", "x.pdf", "out.png", 150, 2, { preprocess: true }), [...BASE, "--preprocess"]);
});
test("buildRenderArgs: --preprocess + --deskew", () => {
  assert.deepEqual(buildRenderArgs("scr.py", "x.pdf", "out.png", 150, 2, { preprocess: true, deskew: true }), [...BASE, "--preprocess", "--deskew"]);
});
test("buildRenderArgs: --preprocess WINS over --grayscale (preprocess includes grayscale base)", () => {
  // both set → only --preprocess (py renders grayscale then opencv); no duplicate --grayscale
  const a = buildRenderArgs("scr.py", "x.pdf", "out.png", 150, 2, { grayscale: true, preprocess: true });
  assert.deepEqual(a, [...BASE, "--preprocess"]);
  assert.ok(!a.includes("--grayscale"));
});
test("buildRenderArgs: --deskew WITHOUT --preprocess is dropped (deskew only meaningful with preprocess)", () => {
  assert.deepEqual(buildRenderArgs("scr.py", "x.pdf", "out.png", 150, 2, { deskew: true }), BASE);
});
