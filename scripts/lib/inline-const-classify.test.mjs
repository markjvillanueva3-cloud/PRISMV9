/**
 * inline-const-classify tests -- verify the matches-canonical vs divergent split.
 *
 * The divergent subset = kc1.1 values that are not ISO-group representatives. NOTE:
 * divergent is a triage signal, NOT an auto-bug -- per-material values (AISI 1045 =
 * 1780, aluminium = 750) are legitimately non-canonical. These tests pin real
 * reference values, not stubs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyInlineKc, CANONICAL_KC, INLINE_KC_VAL_RE } from "./inline-const-classify.mjs";

test("CANONICAL_KC holds the 6 ISO-group kc1.1 values", () => {
  assert.equal(CANONICAL_KC.size, 6);
  for (const v of [1800, 2100, 1100, 700, 2800, 3200]) assert.ok(CANONICAL_KC.has(v), `${v} canonical`);
  assert.ok(!CANONICAL_KC.has(1500), "1500 is NOT canonical");
});

test("canonical inline value -> matchesCanonical, not divergent", () => {
  const r = classifyInlineKc("const x = { kc1_1: 1800, mc: 0.25 };");
  assert.deepEqual(r.values, [1800]);
  assert.deepEqual(r.matchesCanonical, [1800]);
  assert.deepEqual(r.divergent, []);
});

test("non-canonical value (e.g. a drifted 1500 below ISO 3685) -> divergent bucket", () => {
  const r = classifyInlineKc("// legacy below ISO 3685\nconst steel = { kc1_1: 1500 };");
  assert.deepEqual(r.values, [1500]);
  assert.deepEqual(r.divergent, [1500]);
  assert.deepEqual(r.matchesCanonical, []);
});

test("mixed file -> both buckets populated", () => {
  const r = classifyInlineKc("const t = { P: { kc1_1: 1800 }, weird: { kc1_1: 1234 } };");
  assert.equal(r.values.length, 2);
  assert.deepEqual(r.matchesCanonical, [1800]);
  assert.deepEqual(r.divergent, [1234]);
});

test("field-name variants kc1_1 / kc11 / kc1.1 all matched", () => {
  assert.deepEqual(classifyInlineKc("kc1_1: 2100").values, [2100]);
  assert.deepEqual(classifyInlineKc("kc11 = 1100").values, [1100]);
  assert.deepEqual(classifyInlineKc("kc1.1: 700").values, [700]);
});

test("decimal canonical (1800.0) classified as canonical 1800", () => {
  const r = classifyInlineKc("kc1_1: 1800.0");
  assert.deepEqual(r.matchesCanonical, [1800]);
  assert.deepEqual(r.divergent, []);
});

test("equals or colon, with whitespace tolerance", () => {
  assert.deepEqual(classifyInlineKc("kc1_1   =   2800").values, [2800]);
  assert.deepEqual(classifyInlineKc("kc1_1:2800").values, [2800]);
});

test("no kc1.1 present -> empty", () => {
  const r = classifyInlineKc("const feedRate = 0.2; const ap = 2;");
  assert.deepEqual(r.values, []);
  assert.deepEqual(r.divergent, []);
});

test("non-string / empty input -> empty (fail-soft)", () => {
  assert.deepEqual(classifyInlineKc("").values, []);
  assert.deepEqual(classifyInlineKc(null).values, []);
  assert.deepEqual(classifyInlineKc(undefined).divergent, []);
});

test("unrelated identifier mykc1 does NOT match (word boundary)", () => {
  assert.deepEqual(classifyInlineKc("const mykc1value = 1800;").values, []);
});

test("INLINE_KC_VAL_RE is global (matchAll-safe)", () => {
  assert.ok(INLINE_KC_VAL_RE.global, "regex must be global for matchAll");
});
