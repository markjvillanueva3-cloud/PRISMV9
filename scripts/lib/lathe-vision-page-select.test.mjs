#!/usr/bin/env node
/**
 * Tests for lathe-vision-page-select.mjs -- slot:whiskey [KIENZLE G3]
 * Run: node scripts/lib/lathe-vision-page-select.test.mjs
 * R9: real-value asserts on the distribution math + edge cases (no stubs).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { selectVisionPages } from "./lathe-vision-page-select.mjs";

test("distributes the budget across a large catalog (the core fix)", () => {
  // A 300-page vendor catalog, budget 4 -> spread incl. first + last, NOT the first 4.
  assert.deepEqual(selectVisionPages(300, 4), [0, 100, 199, 299]);
  // This is the whole point: the old `range(4)` = [0,1,2,3] missed every body table.
  assert.notDeepEqual(selectVisionPages(300, 4), [0, 1, 2, 3]);
});

test("evenly spaced incl. endpoints for various budgets", () => {
  assert.deepEqual(selectVisionPages(100, 5), [0, 25, 50, 74, 99]);
  assert.deepEqual(selectVisionPages(11, 3), [0, 5, 10]);   // first, middle, last
  assert.deepEqual(selectVisionPages(2, 2), [0, 1]);
});

test("small doc (total <= budget) -> every page, no over-ask", () => {
  assert.deepEqual(selectVisionPages(3, 4), [0, 1, 2]);     // 3-page Siemens cycle doc
  assert.deepEqual(selectVisionPages(4, 4), [0, 1, 2, 3]);
  assert.deepEqual(selectVisionPages(1, 4), [0]);
});

test("budget 1 -> the MIDDLE page (a catalog cover is the worst single sample)", () => {
  assert.deepEqual(selectVisionPages(300, 1), [149]);
  assert.deepEqual(selectVisionPages(1, 1), [0]);
});

test("ascending + unique always (no duplicate rasters)", () => {
  for (const [t, b] of [[300, 4], [50, 7], [9, 4], [1000, 12]]) {
    const r = selectVisionPages(t, b);
    const sorted = [...r].sort((x, y) => x - y);
    assert.deepEqual(r, sorted, `not ascending for total=${t} budget=${b}`);
    assert.equal(new Set(r).size, r.length, `has duplicates for total=${t} budget=${b}`);
    assert.ok(r.every((i) => i >= 0 && i < t), `out of range for total=${t} budget=${b}`);
  }
});

test("guards bad input -> [] (never throws, never a bad page index)", () => {
  assert.deepEqual(selectVisionPages(0, 4), []);
  assert.deepEqual(selectVisionPages(-5, 4), []);
  assert.deepEqual(selectVisionPages(300, 0), []);
  assert.deepEqual(selectVisionPages(300, -1), []);
  assert.deepEqual(selectVisionPages(null, 4), []);
  assert.deepEqual(selectVisionPages(300, undefined), []);
  assert.deepEqual(selectVisionPages(NaN, 4), []);
});

test("non-integer inputs floored, not crashed (defensive)", () => {
  assert.deepEqual(selectVisionPages(3.9, 4), [0, 1, 2]);   // floor(3.9)=3 -> all 3
  assert.deepEqual(selectVisionPages(300, 4.7), [0, 100, 199, 299]); // floor(4.7)=4
});
