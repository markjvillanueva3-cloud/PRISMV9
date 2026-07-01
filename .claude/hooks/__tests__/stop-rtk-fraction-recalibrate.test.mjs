// stop-rtk-fraction-recalibrate.test.mjs
//
// PSN-RTK-ADOPTION-MEASURE/U-RAM03 (2026-05-24, slot:alpha)
//
// Tests pure helpers exported from stop-rtk-fraction-recalibrate.mjs.
// Run via:  node --test H:/prism/.claude/hooks/__tests__/stop-rtk-fraction-recalibrate.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeTuningDeltas,
  shouldEmit,
  formatSuggestionEntry,
  extractCurrentFractions,
} from "../stop-rtk-fraction-recalibrate.mjs";

// ──────────────────────────────────────────────────────────────────────────
// computeTuningDeltas
// ──────────────────────────────────────────────────────────────────────────

test("computeTuningDeltas: returns significant relative-pct changes sorted by magnitude", () => {
  const oldT = { git: 0.70, npm: 0.85, vitest: 0.95, tsc: 0.83 };
  // git: +14.3% (significant), npm: +5.9% (under floor), vitest: -10.5% (sig), tsc: 0% (none)
  const newT = { git: 0.80, npm: 0.90, vitest: 0.85, tsc: 0.83 };
  const out = computeTuningDeltas(oldT, newT, 10);
  assert.equal(out.length, 2);
  // Sorted by abs(deltaPct) desc → git (14.3%) before vitest (10.5%)
  assert.equal(out[0].base, "git");
  assert.ok(Math.abs(out[0].deltaPct - 14.3) < 0.1);
  assert.equal(out[1].base, "vitest");
  assert.ok(out[1].deltaPct < 0);
});

test("computeTuningDeltas: filters bases below minDeltaPct floor", () => {
  const oldT = { git: 0.70, npm: 0.85 };
  const newT = { git: 0.73, npm: 0.86 }; // git +4.3%, npm +1.2% — both under 10%
  const out = computeTuningDeltas(oldT, newT, 10);
  assert.equal(out.length, 0);
});

test("computeTuningDeltas: skips new-only bases (schema-change events)", () => {
  const oldT = { git: 0.70 };
  const newT = { git: 0.70, brandnew: 0.50 };
  const out = computeTuningDeltas(oldT, newT, 10);
  // git unchanged (0%), brandnew not in oldT → both skipped
  assert.equal(out.length, 0);
});

test("computeTuningDeltas: fail-soft on null/malformed input", () => {
  assert.deepEqual(computeTuningDeltas(null, {}), []);
  assert.deepEqual(computeTuningDeltas({}, null), []);
  assert.deepEqual(computeTuningDeltas("not an object", {}), []);
  // old=0 → relative-pct undefined, skipped
  assert.deepEqual(computeTuningDeltas({ git: 0 }, { git: 0.5 }), []);
  // non-finite values skipped
  assert.deepEqual(computeTuningDeltas({ git: NaN }, { git: 0.5 }), []);
});

test("computeTuningDeltas: respects custom minDeltaPct", () => {
  const oldT = { git: 0.70 };
  const newT = { git: 0.74 }; // +5.7%
  assert.equal(computeTuningDeltas(oldT, newT, 10).length, 0);
  assert.equal(computeTuningDeltas(oldT, newT, 5).length, 1);
});

// ──────────────────────────────────────────────────────────────────────────
// shouldEmit (throttle gate)
// ──────────────────────────────────────────────────────────────────────────

test("shouldEmit: gate open when lockfile missing", () => {
  const fakeFs = { existsSync: () => false, statSync: () => ({ mtimeMs: 0 }) };
  assert.equal(shouldEmit("/tmp/nonexistent.lock", Date.now(), fakeFs), true);
});

test("shouldEmit: gate closed when lockfile fresh (<24h)", () => {
  const now = 1_000_000_000_000;
  const oneHourAgo = now - 60 * 60 * 1000;
  const fakeFs = {
    existsSync: () => true,
    statSync: () => ({ mtimeMs: oneHourAgo }),
  };
  assert.equal(shouldEmit("/tmp/lock", now, fakeFs), false);
});

test("shouldEmit: gate open when lockfile stale (>24h)", () => {
  const now = 1_000_000_000_000;
  const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;
  const fakeFs = {
    existsSync: () => true,
    statSync: () => ({ mtimeMs: twoDaysAgo }),
  };
  assert.equal(shouldEmit("/tmp/lock", now, fakeFs), true);
});

test("shouldEmit: fail-soft on fs error → gate closed", () => {
  const fakeFs = {
    existsSync: () => { throw new Error("disk gone"); },
    statSync: () => ({ mtimeMs: 0 }),
  };
  assert.equal(shouldEmit("/tmp/lock", Date.now(), fakeFs), false);
});

// ──────────────────────────────────────────────────────────────────────────
// formatSuggestionEntry
// ──────────────────────────────────────────────────────────────────────────

test("formatSuggestionEntry: produces valid JSONL with required fields", () => {
  const deltas = [{ base: "git", old: 0.70, new: 0.80, deltaPct: 14.3 }];
  const ts = "2026-05-24T12:00:00.000Z";
  const line = formatSuggestionEntry(deltas, ts);
  const parsed = JSON.parse(line);
  assert.equal(parsed.ts, ts);
  assert.equal(parsed.kind, "suggestion");
  assert.equal(parsed.source, "stop-rtk-fraction-recalibrate");
  assert.equal(parsed.advisoryOnly, true);
  assert.equal(parsed.deltas.length, 1);
  assert.equal(parsed.deltas[0].base, "git");
  assert.ok(typeof parsed.hint === "string" && parsed.hint.length > 0);
  // No trailing newline
  assert.ok(!line.endsWith("\n"));
});

test("formatSuggestionEntry: handles empty deltas array", () => {
  const line = formatSuggestionEntry([], "2026-05-24T00:00:00.000Z");
  const parsed = JSON.parse(line);
  assert.deepEqual(parsed.deltas, []);
  assert.equal(parsed.advisoryOnly, true);
});

test("formatSuggestionEntry: coerces non-array deltas to []", () => {
  const line = formatSuggestionEntry(null, "2026-05-24T00:00:00.000Z");
  const parsed = JSON.parse(line);
  assert.deepEqual(parsed.deltas, []);
});

// ──────────────────────────────────────────────────────────────────────────
// extractCurrentFractions
// ──────────────────────────────────────────────────────────────────────────

test("extractCurrentFractions: pulls table from source-hook text", () => {
  const src = `
    const NOMINAL = 1000;
    const FRACTIONS = {
      git: 0.70, gh: 0.55, npm: 0.85,
      "docker-compose": 0.80,
      vitest: 0.95,
    };
    const x = 1;
  `;
  const t = extractCurrentFractions(src);
  assert.ok(t);
  assert.equal(t.git, 0.70);
  assert.equal(t.gh, 0.55);
  assert.equal(t.npm, 0.85);
  assert.equal(t["docker-compose"], 0.80);
  assert.equal(t.vitest, 0.95);
});

test("extractCurrentFractions: returns null on missing/malformed source", () => {
  assert.equal(extractCurrentFractions(""), null);
  assert.equal(extractCurrentFractions(null), null);
  assert.equal(extractCurrentFractions("no FRACTIONS here"), null);
  // FRACTIONS present but body has no recognisable entries
  assert.equal(extractCurrentFractions("const FRACTIONS = { /* tbd */ };"), null);
});

// ──────────────────────────────────────────────────────────────────────────
// Adversarial / integration-shape
// ──────────────────────────────────────────────────────────────────────────

test("adversarial: extractCurrentFractions ignores non-numeric values", () => {
  const src = `const FRACTIONS = { git: 0.70, weird: "string", bad: null, ok: 0.5 };`;
  const t = extractCurrentFractions(src);
  assert.ok(t);
  assert.equal(t.git, 0.70);
  assert.equal(t.ok, 0.5);
  assert.equal(t.weird, undefined);
  assert.equal(t.bad, undefined);
});
