import { test } from "node:test";
import assert from "node:assert/strict";
import { isMcpDown, DEFAULT_STALE_MS } from "../lib/mcp-state-check.mjs";

const now = 1_000_000_000_000;

test("isMcpDown: null state → not-down (fail-safe)", () => {
  assert.equal(isMcpDown(null).down, false);
  assert.equal(isMcpDown(undefined).down, false);
  assert.equal(isMcpDown("string").down, false);
});

test("isMcpDown: state without lastStatus → not-down (fail-safe)", () => {
  assert.equal(isMcpDown({ lastProbeAt: now }).down, false);
});

test("isMcpDown: fresh + lastStatus.ok=false → down", () => {
  const r = isMcpDown({ lastProbeAt: now, lastStatus: { ok: false, error: "ECONNREFUSED" } }, { nowMs: now + 1000 });
  assert.equal(r.down, true);
  assert.ok(r.reason.includes("mcp-disconnect"));
  assert.ok(r.reason.includes("ECONNREFUSED"));
});

test("isMcpDown: fresh + lastStatus.ok=true → not-down", () => {
  const r = isMcpDown({ lastProbeAt: now, lastStatus: { ok: true, status: 200 } }, { nowMs: now + 1000 });
  assert.equal(r.down, false);
  assert.equal(r.reason, "mcp-up");
});

test("isMcpDown: stale state (older than staleMs) → not-down (fail-safe)", () => {
  const r = isMcpDown(
    { lastProbeAt: now, lastStatus: { ok: false, error: "ECONNREFUSED" } },
    { nowMs: now + 6 * 60_000, staleMs: 5 * 60_000 }
  );
  assert.equal(r.down, false);
  assert.ok(r.reason.startsWith("stale"));
});

test("isMcpDown: at exact stale boundary → considered fresh", () => {
  const r = isMcpDown(
    { lastProbeAt: now, lastStatus: { ok: false, error: "ECONNREFUSED" } },
    { nowMs: now + DEFAULT_STALE_MS, staleMs: DEFAULT_STALE_MS }
  );
  // ageMs === staleMs is NOT > staleMs, so fresh
  assert.equal(r.down, true);
});

test("isMcpDown: ageMs reported correctly", () => {
  const r = isMcpDown(
    { lastProbeAt: now, lastStatus: { ok: false } },
    { nowMs: now + 30_000 }
  );
  assert.equal(r.ageMs, 30_000);
});
