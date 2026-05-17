#!/usr/bin/env node
/**
 * magic-number-detector.test.mjs — regression tests for noise-stripping.
 *
 * SLOT-DRIFT-FIX-MS0/U-SDF09 (2026-05-17): every comment date like
 * "2026-05-17" was triggering 2-4 false-positive MAGIC NUMBER warnings
 * on every Edit. The fix strips comments+strings+date patterns before
 * the magic-number regex scan. These tests pin the strip behavior.
 *
 * Plain node:test (no vitest dependency).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { stripNoiseForScan } from "./magic-number-detector.mjs";

test("strips ISO date pattern from comment", () => {
  const stripped = stripNoiseForScan("// SLOT-FIX (2026-05-17): comment");
  // Date "2026-05-17" gone, and the entire line comment is also gone.
  assert.ok(!stripped.includes("2026-05-17"));
  assert.ok(!stripped.includes("SLOT-FIX"));
});

test("strips line comment with magic-looking numbers", () => {
  const stripped = stripNoiseForScan("if (x === 42) { /* good code */ } // saves 800 tokens");
  // The "saves 800 tokens" line comment must be stripped; "42" in real code stays.
  assert.ok(!stripped.includes("800"));
  assert.ok(stripped.includes("42"));
});

test("strips block comment with magic numbers", () => {
  const stripped = stripNoiseForScan("/* 1234 5678 90 magic */ const x = 42;");
  assert.ok(!stripped.includes("1234"));
  assert.ok(!stripped.includes("5678"));
  assert.ok(stripped.includes("42"));
});

test("strips multi-line block comment", () => {
  const stripped = stripNoiseForScan(`/*
   * Old code with magic 9999
   * More magic 8888
   */
const real = 42;`);
  assert.ok(!stripped.includes("9999"));
  assert.ok(!stripped.includes("8888"));
  assert.ok(stripped.includes("42"));
});

test("strips double-quoted string", () => {
  const stripped = stripNoiseForScan('const msg = "fee=$1234.50 dollars";');
  assert.ok(!stripped.includes("1234.50"));
});

test("strips single-quoted string", () => {
  const stripped = stripNoiseForScan("const msg = 'price 99.99';");
  assert.ok(!stripped.includes("99.99"));
});

test("strips backtick template literal", () => {
  const stripped = stripNoiseForScan("const msg = `total ${total} at 5.99 each`;");
  assert.ok(!stripped.includes("5.99"));
});

test("preserves URLs in code (not treated as line comment)", () => {
  // https:// is a URL, not a comment. The // strip rule excludes preceding /.
  const stripped = stripNoiseForScan('const u = "https://example.com/api";');
  // String literal entirely stripped — URL content goes too. That's fine.
  // The point is the code surrounding it isn't disrupted.
  assert.ok(stripped.includes("const u ="));
});

test("preserves real code with magic numbers", () => {
  const stripped = stripNoiseForScan("if (count > 42) throw new Error();");
  assert.ok(stripped.includes("42"));
  assert.ok(stripped.includes("count"));
});

test("strips slash-delimited dates", () => {
  const stripped = stripNoiseForScan("// updated 2026/05/17");
  assert.ok(!stripped.includes("2026"));
  assert.ok(!stripped.includes("05"));
  assert.ok(!stripped.includes("17"));
});

test("handles empty input safely", () => {
  assert.equal(stripNoiseForScan(""), "");
});

test("handles non-string input safely", () => {
  assert.equal(stripNoiseForScan(null), "");
  assert.equal(stripNoiseForScan(undefined), "");
  assert.equal(stripNoiseForScan(123), "");
});

test("preserves indentation/structure of remaining code", () => {
  const input = `function foo() {
  // comment with 999
  const x = 42;
  return x;
}`;
  const stripped = stripNoiseForScan(input);
  assert.ok(stripped.includes("function foo()"));
  assert.ok(stripped.includes("const x = 42"));
  assert.ok(stripped.includes("return x"));
  assert.ok(!stripped.includes("999"));
});

test("real-world case: my own commit comments don't flag false-positives", () => {
  // Reproduces the actual spam I was seeing.
  const input = `// SLOT-DRIFT-FIX-MS0/U-SDF08 (2026-05-17): lean-mode injection
  if (count > 30) return null;`;
  const stripped = stripNoiseForScan(input);
  // Date stripped, real 30 preserved
  assert.ok(!stripped.includes("2026-05-17"));
  assert.ok(stripped.includes("30"));
});
