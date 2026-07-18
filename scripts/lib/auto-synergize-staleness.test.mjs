#!/usr/bin/env node
/**
 * auto-synergize-staleness.test.mjs -- AUTO-SYNERGIZE-MS0 (slot:india)
 * Run: node scripts/lib/auto-synergize-staleness.test.mjs   (node:test auto-runs on exit)
 *
 * R9 -- every assertion encodes WHY: a wrong threshold/clamp/debounce here either
 * thrashes regen-viz (24GB job) or lets the searchable graph rot silently.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeSynergyFingerprint,
  decideSynergyAction,
  summarizeDecision,
  DEFAULT_SOURCES,
  DEFAULT_THRESHOLDS,
} from "./auto-synergize-staleness.mjs";

const NOW = Date.parse("2026-06-29T12:00:00.000Z");
const iso = (ms) => new Date(ms).toISOString();
const hoursAgo = (h) => iso(NOW - h * 3_600_000);
const minsAgo = (m) => iso(NOW - m * 60_000);

// Deterministic injected walker: maps root -> {exists,count,mtimes}.
const mkWalk = (map) => (root) => map[root] ?? { exists: false, count: 0, mtimes: [] };

// ---- computeSynergyFingerprint ------------------------------------------------

test("fingerprint: counts only files changed strictly after sinceMs", () => {
  const since = NOW - 3 * 3_600_000; // 3h ago
  const walk = mkWalk({
    "knowledge/memories": { exists: true, count: 4, mtimes: [
      NOW - 1 * 3_600_000, NOW - 2 * 3_600_000, NOW - 5 * 3_600_000, NOW - 9 * 3_600_000,
    ] },
    "knowledge/wiki": { exists: true, count: 2, mtimes: [NOW - 30 * 60_000, NOW - 10 * 3_600_000] },
  });
  const fp = computeSynergyFingerprint({ sinceMs: since, walk });
  // memories: 2 of 4 are newer than 3h ago; wiki: 1 of 2.
  assert.equal(fp.totalChangedSince, 3, "must count exactly the post-since files");
  assert.equal(fp.totalFiles, 6);
  assert.equal(fp.newestMtimeMs, NOW - 30 * 60_000, "newest across all sources");
  assert.equal(fp.perSource.length, 2);
});

test("fingerprint: cold start (sinceMs<=0) counts ALL files as changed", () => {
  const walk = mkWalk({
    "knowledge/memories": { exists: true, count: 3, mtimes: [1, 2, 3] },
    "knowledge/wiki": { exists: true, count: 5, mtimes: [1, 2, 3, 4, 5] },
  });
  const fp = computeSynergyFingerprint({ sinceMs: 0, walk });
  assert.equal(fp.totalChangedSince, 8, "cold start => everything is 'changed'");
});

test("fingerprint: missing root contributes zero, never throws", () => {
  const walk = mkWalk({ "knowledge/memories": { exists: false, count: 0, mtimes: [] } });
  const fp = computeSynergyFingerprint({ sinceMs: NOW - 1000, walk });
  assert.equal(fp.totalChangedSince, 0);
  assert.equal(fp.perSource[0].exists, false);
});

test("fingerprint: a throwing walker is caught (fail-soft) and recorded", () => {
  const walk = (root) => {
    if (root === "knowledge/wiki") throw new Error("EACCES");
    return { exists: true, count: 2, mtimes: [NOW, NOW - 1] };
  };
  const fp = computeSynergyFingerprint({ sinceMs: 0, walk });
  const wiki = fp.perSource.find((s) => s.key === "wiki");
  assert.ok(wiki.error.includes("EACCES"), "error captured, not thrown");
  assert.equal(wiki.changedSince, 0, "throwing source contributes nothing");
  assert.equal(fp.totalChangedSince, 2, "other source still counted");
});

test("fingerprint: missing walk dependency throws TypeError", () => {
  assert.throws(() => computeSynergyFingerprint({ sinceMs: 0 }), TypeError);
});

// ---- decideSynergyAction ------------------------------------------------------

const freshFp = (changed = 0) => ({ totalChangedSince: changed, totalFiles: 100 });

test("decide: fresh (0 changed, recent synergize) -> none, sev 0", () => {
  const d = decideSynergyAction({
    fingerprint: freshFp(0),
    lastState: { lastSynergizeAt: hoursAgo(1), lastApplyAt: hoursAgo(1) },
    nowMs: NOW,
  });
  assert.equal(d.action, "none");
  assert.equal(d.severity, 0);
  assert.equal(d.triggered, false);
});

test("decide: stale by COUNT (>= minFilesForRegen) -> regen sev 2", () => {
  const d = decideSynergyAction({
    fingerprint: freshFp(DEFAULT_THRESHOLDS.minFilesForRegen),
    lastState: { lastSynergizeAt: hoursAgo(2), lastApplyAt: hoursAgo(2) },
    nowMs: NOW,
  });
  assert.equal(d.action, "regen");
  assert.equal(d.severity, 2);
  assert.ok(d.reasons.some((r) => r.includes("changed file(s) >=")));
});

test("decide: stale by TIME (>= maxHoursBeforeRegen) with 0 changes -> regen sev 2", () => {
  const d = decideSynergyAction({
    fingerprint: freshFp(0),
    lastState: { lastSynergizeAt: hoursAgo(13), lastApplyAt: hoursAgo(13) },
    nowMs: NOW,
  });
  assert.equal(d.action, "regen", "time floor fires even with no file changes");
  assert.equal(d.severity, 2);
});

test("decide: cold start (no lastSynergizeAt) -> regen sev 3", () => {
  const d = decideSynergyAction({ fingerprint: freshFp(0), lastState: {}, nowMs: NOW });
  assert.equal(d.action, "regen");
  assert.equal(d.severity, 3);
  assert.equal(d.coldStart, true);
});

test("decide: would-regen but DEBOUNCED (applied 10m ago < 90m) -> none, debounced", () => {
  const d = decideSynergyAction({
    fingerprint: freshFp(50), // well over count threshold
    lastState: { lastSynergizeAt: hoursAgo(13), lastApplyAt: minsAgo(10) },
    nowMs: NOW,
  });
  assert.equal(d.action, "none", "debounce suppresses the fold");
  assert.equal(d.debounced, true);
  assert.equal(d.triggered, true, "still reports it WOULD fire (for advisory honesty)");
  assert.ok(d.reasons.some((r) => r.includes("debounced")));
});

test("decide: force overrides debounce -> regen even inside window", () => {
  const d = decideSynergyAction({
    fingerprint: freshFp(0),
    lastState: { lastSynergizeAt: minsAgo(5), lastApplyAt: minsAgo(5) },
    nowMs: NOW,
    force: true,
  });
  assert.equal(d.action, "regen");
  assert.equal(d.severity, 3);
  assert.ok(d.reasons.includes("forced"));
});

test("decide: accumulating (changes < threshold, time < floor) -> none sev 1", () => {
  const d = decideSynergyAction({
    fingerprint: freshFp(5),
    lastState: { lastSynergizeAt: hoursAgo(2), lastApplyAt: hoursAgo(2) },
    nowMs: NOW,
  });
  assert.equal(d.action, "none");
  assert.equal(d.severity, 1, "non-zero changes register as accumulating");
});

// ---- adversarial --------------------------------------------------------------

test("adversarial: future lastApply (clock skew) clamps minutesSinceApply to >=0", () => {
  const d = decideSynergyAction({
    fingerprint: freshFp(50),
    lastState: { lastSynergizeAt: hoursAgo(13), lastApplyAt: iso(NOW + 60 * 60_000) }, // 1h in future
    nowMs: NOW,
  });
  assert.equal(d.minutesSinceApply, 0, "negative delta clamped, not propagated");
  assert.equal(d.debounced, true, "0m < 90m window => still debounced (safe)");
  assert.equal(d.action, "none");
});

test("adversarial: future lastSynergize never yields negative hours", () => {
  const d = decideSynergyAction({
    fingerprint: freshFp(0),
    lastState: { lastSynergizeAt: iso(NOW + 5 * 3_600_000), lastApplyAt: hoursAgo(2) },
    nowMs: NOW,
  });
  assert.equal(d.hoursSinceSynergize, 0, "clamped to 0, never negative");
  assert.equal(d.action, "none", "future synergize => not stale-by-time");
});

test("adversarial: invalid timestamp strings are treated as 'never' (cold start)", () => {
  const d = decideSynergyAction({
    fingerprint: freshFp(0),
    lastState: { lastSynergizeAt: "not-a-date", lastApplyAt: "garbage" },
    nowMs: NOW,
  });
  assert.equal(d.coldStart, true, "unparseable synergize ts => cold start");
  assert.equal(d.action, "regen");
});

test("decide: missing fingerprint throws TypeError", () => {
  assert.throws(() => decideSynergyAction({ lastState: {} }), TypeError);
});

// ---- summarizeDecision + invariants -------------------------------------------

test("summarizeDecision: renders tag + reasons", () => {
  const d = decideSynergyAction({ fingerprint: freshFp(0), lastState: {}, nowMs: NOW });
  const s = summarizeDecision(d);
  assert.ok(s.includes("STALE -> fold"));
  assert.ok(s.includes("cold start"));
  assert.equal(summarizeDecision(null), "auto-synergize: no decision");
});

test("invariant: DEFAULT_SOURCES + DEFAULT_THRESHOLDS are frozen", () => {
  assert.ok(Object.isFrozen(DEFAULT_SOURCES));
  assert.ok(Object.isFrozen(DEFAULT_THRESHOLDS));
  assert.deepEqual(DEFAULT_SOURCES.map((s) => s.key), ["memories", "wiki"]);
});
