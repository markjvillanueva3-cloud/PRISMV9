// U-PSN-WRITE-EXISTS (gap-A5, 2026-05-23, slot:alpha)
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatWriteExistsNudge, WRITE_EXISTS_MIN_BYTES } from "../pretool-write-exists-check.mjs";

test("formatWriteExistsNudge: Write of >4KB file emits nudge", () => {
  const n = formatWriteExistsNudge("Write", "engines/Foo.ts", 8192);
  assert.ok(n !== null);
  assert.ok(n.includes("Edit instead"));
  assert.ok(n.includes("MultiEdit"));
});

test("formatWriteExistsNudge: file size kb is reported", () => {
  const n = formatWriteExistsNudge("Write", "x.ts", 51200);
  assert.ok(n.includes("50KB") || n.includes("(50KB)"));
});

test("formatWriteExistsNudge: Edit tool → null (no over-fire)", () => {
  assert.equal(formatWriteExistsNudge("Edit", "x.ts", 999999), null);
});

test("formatWriteExistsNudge: Read tool → null", () => {
  assert.equal(formatWriteExistsNudge("Read", "x.ts", 999999), null);
});

test("formatWriteExistsNudge: tiny file → null (no nudge noise)", () => {
  assert.equal(formatWriteExistsNudge("Write", "x.ts", 100), null);
});

test("formatWriteExistsNudge: exactly threshold = no nudge", () => {
  assert.equal(formatWriteExistsNudge("Write", "x.ts", WRITE_EXISTS_MIN_BYTES - 1), null);
});

test("formatWriteExistsNudge: just over threshold → nudge", () => {
  assert.ok(formatWriteExistsNudge("Write", "x.ts", WRITE_EXISTS_MIN_BYTES + 1) !== null);
});

test("formatWriteExistsNudge: null filePath → null", () => {
  assert.equal(formatWriteExistsNudge("Write", null, 99999), null);
  assert.equal(formatWriteExistsNudge("Write", "", 99999), null);
});

test("formatWriteExistsNudge: non-number size → null", () => {
  assert.equal(formatWriteExistsNudge("Write", "x.ts", "huge"), null);
  assert.equal(formatWriteExistsNudge("Write", "x.ts", null), null);
});

test("formatWriteExistsNudge: includes kill-switch reference", () => {
  const n = formatWriteExistsNudge("Write", "x.ts", 10000);
  assert.ok(n.includes("PRISM_WRITE_EXISTS_DISABLE"));
});

test("WRITE_EXISTS_MIN_BYTES: sensible threshold (≥1KB, ≤100KB)", () => {
  assert.ok(WRITE_EXISTS_MIN_BYTES >= 1024);
  assert.ok(WRITE_EXISTS_MIN_BYTES <= 100 * 1024);
});
