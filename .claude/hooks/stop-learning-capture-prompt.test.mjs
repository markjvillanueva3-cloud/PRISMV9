#!/usr/bin/env node
/**
 * Tests for stop-learning-capture-prompt.mjs — pure-function units.
 * Run: node --test .claude/hooks/stop-learning-capture-prompt.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";

const { isThrottled, renderAdvisory } = await import("./stop-learning-capture-prompt.mjs");

// ---------- isThrottled ----------

test("isThrottled returns false on empty / non-string stamp", () => {
  assert.equal(isThrottled(""), false);
  assert.equal(isThrottled(null), false);
  assert.equal(isThrottled(undefined), false);
  assert.equal(isThrottled(42), false);
});

test("isThrottled returns false for unparseable stamp", () => {
  assert.equal(isThrottled("not-a-date"), false);
});

test("isThrottled returns true within throttle window", () => {
  const now = Date.parse("2026-05-15T12:00:00.000Z");
  const recent = "2026-05-15T11:55:00.000Z"; // 5 min ago
  assert.equal(isThrottled(recent, now, 900), true);
});

test("isThrottled returns false past throttle window", () => {
  const now = Date.parse("2026-05-15T12:00:00.000Z");
  const old = "2026-05-15T11:00:00.000Z"; // 60 min ago
  assert.equal(isThrottled(old, now, 900), false);
});

test("isThrottled uses custom throttleSec parameter", () => {
  const now = Date.parse("2026-05-15T12:00:00.000Z");
  const stamp = "2026-05-15T11:59:50.000Z"; // 10s ago
  assert.equal(isThrottled(stamp, now, 5), false);   // throttle=5s → expired
  assert.equal(isThrottled(stamp, now, 60), true);   // throttle=60s → still throttled
});

// ---------- renderAdvisory ----------

test("renderAdvisory returns empty for null result", () => {
  assert.equal(renderAdvisory(null), "");
  assert.equal(renderAdvisory(undefined), "");
});

test("renderAdvisory returns empty when ok=false", () => {
  assert.equal(renderAdvisory({ ok: false, uncapturedHits: 100 }), "");
});

test("renderAdvisory returns empty when zero uncaptured", () => {
  const r = { ok: true, uncapturedHits: 0, hits: [], counts: { critical: 0, warn: 0, info: 0 } };
  assert.equal(renderAdvisory(r), "");
});

test("renderAdvisory returns empty when uncaptured count but hits array empty", () => {
  // Defensive — pathological inputs from caller.
  const r = { ok: true, uncapturedHits: 5, hits: [], counts: { critical: 1, warn: 2, info: 2 } };
  assert.equal(renderAdvisory(r), "");
});

test("renderAdvisory surfaces count + severity breakdown + top hits", () => {
  const r = {
    ok: true,
    uncapturedHits: 3,
    counts: { critical: 1, warn: 2, info: 0 },
    hits: [
      { severity: "critical", category: "critical", match: "P0", source: "git:abc123" },
      { severity: "warn", category: "regression", match: "regression", source: "diff:HEAD" },
      { severity: "warn", category: "critical", match: "FAIL", source: "git:def456" },
    ],
  };
  const out = renderAdvisory(r, 5);
  assert.ok(out.includes("3 uncaptured"));
  assert.ok(out.includes("Critical: 1"));
  assert.ok(out.includes("Warn: 2"));
  assert.ok(out.includes("P0"));
  assert.ok(out.includes("regression"));
  assert.ok(out.includes("git:abc123"));
  assert.ok(out.includes("/learn-from-mistake"));
});

test("renderAdvisory respects maxHits limit", () => {
  const r = {
    ok: true,
    uncapturedHits: 10,
    counts: { critical: 0, warn: 10, info: 0 },
    hits: Array.from({ length: 10 }, (_, i) => ({
      severity: "warn",
      category: "regression",
      match: `kw${i}`,
      source: `git:sha${i}`,
    })),
  };
  const out = renderAdvisory(r, 2);
  assert.ok(out.includes("kw0"));
  assert.ok(out.includes("kw1"));
  assert.ok(!out.includes("kw2"), "kw2 should be capped out");
});

test("renderAdvisory uses default maxHits when arg omitted", () => {
  const r = {
    ok: true,
    uncapturedHits: 8,
    counts: { critical: 0, warn: 8, info: 0 },
    hits: Array.from({ length: 8 }, (_, i) => ({
      severity: "warn", category: "x", match: `m${i}`, source: `s${i}`,
    })),
  };
  const out = renderAdvisory(r);
  assert.ok(out.length > 0);
});

test("renderAdvisory missing counts field is tolerated", () => {
  const r = {
    ok: true,
    uncapturedHits: 1,
    hits: [{ severity: "warn", category: "x", match: "FAIL", source: "git:abc" }],
  };
  const out = renderAdvisory(r);
  assert.ok(out.includes("FAIL"));
  assert.ok(out.includes("Critical: 0"));
});

test("renderAdvisory ends with capture-action hint", () => {
  const r = {
    ok: true,
    uncapturedHits: 1,
    counts: { critical: 1, warn: 0, info: 0 },
    hits: [{ severity: "critical", category: "critical", match: "P0", source: "git:abc" }],
  };
  const out = renderAdvisory(r);
  assert.ok(out.includes("/learn-from-mistake") || out.includes("feedback_"));
});
