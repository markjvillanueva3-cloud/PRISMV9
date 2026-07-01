#!/usr/bin/env node
/**
 * Tests for ensureHeapFloor — the MCP-boot-OOM fix. The load-bearing case is
 * OVERRIDING a too-small inherited cap (the portable-node 384MB shim cap that
 * crashed the server on boot), while preserving a deliberately-larger heap and
 * any other NODE_OPTIONS flags.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { ensureHeapFloor } from "./ensure-heap-floor.mjs";

test("THE BUG: overrides the inherited 384MB cap up to the 4096 floor (server can boot)", () => {
  assert.equal(ensureHeapFloor("--max-old-space-size=384", 4096), "--max-old-space-size=4096");
});

test("absent → sets the floor", () => {
  assert.equal(ensureHeapFloor("", 4096), "--max-old-space-size=4096");
  assert.equal(ensureHeapFloor(undefined, 4096), "--max-old-space-size=4096");
  assert.equal(ensureHeapFloor(null, 4096), "--max-old-space-size=4096");
});

test("respects a deliberately-LARGER heap (never downgrades)", () => {
  assert.equal(ensureHeapFloor("--max-old-space-size=8192", 4096), "--max-old-space-size=8192");
  assert.equal(ensureHeapFloor("--max-old-space-size=4096", 4096), "--max-old-space-size=4096");
});

test("preserves OTHER flags while overriding a too-small heap", () => {
  assert.equal(
    ensureHeapFloor("--enable-source-maps --max-old-space-size=384", 4096),
    "--enable-source-maps --max-old-space-size=4096"
  );
});

test("appends the floor alongside other flags when no heap is set", () => {
  assert.equal(ensureHeapFloor("--enable-source-maps", 4096), "--enable-source-maps --max-old-space-size=4096");
});

test("default floor is 4096 (matches the supervisor's spawn heap)", () => {
  assert.equal(ensureHeapFloor("--max-old-space-size=384"), "--max-old-space-size=4096");
});

test("defensive: bogus floorMb falls back to 4096", () => {
  assert.equal(ensureHeapFloor("", 0), "--max-old-space-size=4096");
  assert.equal(ensureHeapFloor("", -1), "--max-old-space-size=4096");
  assert.equal(ensureHeapFloor("", NaN), "--max-old-space-size=4096");
});
