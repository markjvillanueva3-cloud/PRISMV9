// Tests for partitionBySize (the CLI OOM guard, U-CROSS-PC-VERIFY-CLI-BOUND, slot:bravo 2026-06-14).
// Injected statSizeFn -> hermetic, no filesystem. R9 intent-tests: the over-cap file MUST land in
// `skipped` (not `scan`), because a regression that scans it would readFileSync a 700MB+ dump -> OOM.
import { test } from "node:test";
import assert from "node:assert/strict";
import { partitionBySize } from "./cross-pc-handoff-verify.mjs";

const CAP = 1000;
const sizes = {
  "small.json": 100,
  "exact.json": 1000,          // == cap -> scan (<=)
  "huge.json": 700_000_000,    // 700MB dump -> skip (the real OOM offender)
};
const statFn = (f) => {
  if (f in sizes) return sizes[f];
  throw new Error(`ENOENT ${f}`);
};

test("R9: an over-cap file lands in skipped, NOT scan (the OOM guard -- fails if the gate is removed)", () => {
  const { scan, skipped } = partitionBySize(["small.json", "huge.json"], statFn, CAP);
  assert.deepEqual(scan, ["small.json"]);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].file, "huge.json");
  assert.equal(skipped[0].bytes, 700_000_000);
});

test("boundary: bytes === cap -> scanned (<=, not <)", () => {
  const { scan, skipped } = partitionBySize(["exact.json"], statFn, CAP);
  assert.deepEqual(scan, ["exact.json"]);
  assert.deepEqual(skipped, []);
});

test("mixed set partitions correctly", () => {
  const { scan, skipped } = partitionBySize(["small.json", "exact.json", "huge.json"], statFn, CAP);
  assert.deepEqual(scan.sort(), ["exact.json", "small.json"]);
  assert.deepEqual(skipped.map((s) => s.file), ["huge.json"]);
});

test("statFn throws (unstattable) -> skipped with bytes null (do NOT read what we can't size)", () => {
  const { scan, skipped } = partitionBySize(["gone.json"], statFn, CAP);
  assert.deepEqual(scan, []);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].bytes, null);
});

test("non-finite size (NaN) -> skipped bytes null, never scanned", () => {
  const { scan, skipped } = partitionBySize(["x"], () => NaN, CAP);
  assert.deepEqual(scan, []);
  assert.equal(skipped[0].bytes, null);
});

test("empty / null input -> {scan:[],skipped:[]}", () => {
  assert.deepEqual(partitionBySize([], statFn, CAP), { scan: [], skipped: [] });
  assert.deepEqual(partitionBySize(null, statFn, CAP), { scan: [], skipped: [] });
});

test("backslash paths normalized in skipped.file", () => {
  const { skipped } = partitionBySize(["C:\\dir\\huge.json"], () => 999_999_999, CAP);
  assert.equal(skipped[0].file, "C:/dir/huge.json");
});

test("default cap (no cap arg) is the 16MB production default -> a 700MB file still skipped", () => {
  const { scan, skipped } = partitionBySize(["huge.json"], statFn);
  assert.deepEqual(scan, []);
  assert.equal(skipped.length, 1);
});
