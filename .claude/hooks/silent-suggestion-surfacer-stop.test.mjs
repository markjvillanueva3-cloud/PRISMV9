// node --test H:/prism/.claude/hooks/silent-suggestion-surfacer-stop.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSilentSummary, decideFire, renderAdvisory } from "./silent-suggestion-surfacer-stop.mjs";

const NOW = Date.parse("2026-05-20T17:00:00Z");
const HOUR_AGO = NOW - 3600 * 1000;
const FOUR_HOURS_AGO = NOW - 4 * 3600 * 1000;
const FIVE_HOURS_AGO = NOW - 5 * 3600 * 1000;

const makeEvent = (over = {}) => ({
  ts: new Date(HOUR_AGO).toISOString(),
  hook: "ollama-task-offloader",
  decision: "suggest",
  category: "summary",
  extras: { mode: "silent", reason: "below-confidence" },
  ...over,
});

test("computeSilentSummary: empty / non-array → zeros", () => {
  assert.equal(computeSilentSummary([], FOUR_HOURS_AGO, NOW).total, 0);
  assert.equal(computeSilentSummary(null, FOUR_HOURS_AGO, NOW).total, 0);
  assert.equal(computeSilentSummary(undefined, FOUR_HOURS_AGO, NOW).total, 0);
});

test("computeSilentSummary: counts only suggest+silent within window", () => {
  const events = [
    makeEvent(),                                          // ✓ in window, silent
    makeEvent({ extras: { mode: "injected" } }),          // ✗ not silent
    makeEvent({ decision: "keep" }),                      // ✗ wrong decision
    makeEvent({ decision: "offload" }),                   // ✗ wrong decision
    makeEvent({ ts: new Date(FIVE_HOURS_AGO).toISOString() }), // ✗ outside window
  ];
  const r = computeSilentSummary(events, FOUR_HOURS_AGO, NOW);
  assert.equal(r.total, 1);
  assert.equal(r.byCategory.summary, 1);
  assert.equal(r.byReason["below-confidence"], 1);
  assert.equal(r.topCategory, "summary");
  assert.equal(r.topReason, "below-confidence");
  assert.equal(r.windowEvents, 4); // 5 minus the out-of-window one
});

test("computeSilentSummary: tolerates legacy top-level mode/reason", () => {
  const events = [
    { ts: new Date(HOUR_AGO).toISOString(), decision: "suggest", category: "explanation", mode: "silent", reason: "rate-limited" },
  ];
  const r = computeSilentSummary(events, FOUR_HOURS_AGO, NOW);
  assert.equal(r.total, 1);
  assert.equal(r.byCategory.explanation, 1);
  assert.equal(r.byReason["rate-limited"], 1);
});

test("computeSilentSummary: ranks top category/reason by count, deterministic tie-break", () => {
  const events = [
    makeEvent({ category: "alpha", extras: { mode: "silent", reason: "x" } }),
    makeEvent({ category: "alpha", extras: { mode: "silent", reason: "y" } }),
    makeEvent({ category: "beta",  extras: { mode: "silent", reason: "x" } }),
  ];
  const r = computeSilentSummary(events, FOUR_HOURS_AGO, NOW);
  assert.equal(r.total, 3);
  assert.equal(r.topCategory, "alpha"); // count 2 vs 1
  assert.equal(r.topReason, "x");        // count 2 vs 1
});

test("computeSilentSummary: drops events with bad/missing timestamp", () => {
  const events = [
    makeEvent({ ts: "not-a-date" }),
    makeEvent({ ts: null }),
    makeEvent({ ts: undefined }),
    makeEvent(), // good one
  ];
  const r = computeSilentSummary(events, FOUR_HOURS_AGO, NOW);
  assert.equal(r.total, 1);
});

test("computeSilentSummary: defaults missing category/reason to 'unknown'/'unspecified'", () => {
  const events = [
    { ts: new Date(HOUR_AGO).toISOString(), decision: "suggest", extras: { mode: "silent" } },
  ];
  const r = computeSilentSummary(events, FOUR_HOURS_AGO, NOW);
  assert.equal(r.byCategory.unknown, 1);
  assert.equal(r.byReason.unspecified, 1);
});

test("decideFire: below min-findings → no fire", () => {
  const summary = { total: 2, byCategory: {}, byReason: {}, topCategory: null, topReason: null, windowEvents: 10 };
  const g = decideFire(summary, -Infinity, NOW, 14400, 3);
  assert.equal(g.fire, false);
  assert.equal(g.reason, "below-min-findings");
});

test("decideFire: cooldown active → no fire", () => {
  const summary = { total: 10, byCategory: {}, byReason: {}, topCategory: "x", topReason: "y", windowEvents: 50 };
  const g = decideFire(summary, NOW - 1000, NOW, 14400, 3);
  assert.equal(g.fire, false);
  assert.equal(g.reason, "cooldown-active");
});

test("decideFire: cooldown expired + meets min → fire", () => {
  const summary = { total: 10, byCategory: {}, byReason: {}, topCategory: "x", topReason: "y", windowEvents: 50 };
  const g = decideFire(summary, NOW - 20000 * 1000, NOW, 14400, 3);
  assert.equal(g.fire, true);
  assert.equal(g.reason, "ok");
});

test("decideFire: no-previous-fire (lastFire = -Infinity) → fire when met", () => {
  const summary = { total: 5, byCategory: {}, byReason: {}, topCategory: "x", topReason: "y", windowEvents: 20 };
  const g = decideFire(summary, -Infinity, NOW, 14400, 3);
  assert.equal(g.fire, true);
});

test("renderAdvisory: contains top-N categories + window label", () => {
  const summary = {
    total: 12,
    byCategory: { summary: 7, explanation: 3, documentation: 2 },
    byReason: { "below-confidence": 9, "rate-limited": 3 },
    topCategory: "summary",
    topReason: "below-confidence",
    windowEvents: 50,
  };
  const m = renderAdvisory(summary, 4);
  assert.match(m, /silent-offload-surfacer \(last 4h\)/);
  assert.match(m, /12 silent suggestion/);
  assert.match(m, /summary=7/);
  assert.match(m, /explanation=3/);
  assert.match(m, /below-confidence=9/);
  assert.match(m, /ollama-offload-dashboard\.mjs --window=4h/);
});

test("renderAdvisory: handles empty category/reason gracefully", () => {
  const summary = { total: 0, byCategory: {}, byReason: {}, topCategory: null, topReason: null, windowEvents: 0 };
  const m = renderAdvisory(summary, 1);
  assert.match(m, /top categories: \(none\)/);
  assert.match(m, /top reasons:\s+\(none\)/);
});
