// scripts/cag-galaxy-warm-sweep.test.mjs
// Tests for U-CAG-WARM-SWEEP pure fns. Real reference-value asserts (R9): each pins
// the concrete resume/abort/summary behaviour that would FAIL if the sweep regressed.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BASE_WARMING_QUERIES,
  warmingQueriesFor,
  parseCursorDone,
  partitionByResumeCursor,
  shouldAbortForPressure,
  summarizeWarmRun,
  classifyResult,
  cursorPathFor,
} from "./cag-galaxy-warm-sweep.mjs";

// -- warmingQueriesFor --
test("warmingQueriesFor: a valid galaxy returns the base set (>=3, all non-empty strings)", () => {
  const qs = warmingQueriesFor("mill");
  assert.ok(qs.length >= 3, "at least 3 warming queries");
  assert.equal(qs.length, BASE_WARMING_QUERIES.length);
  for (const q of qs) assert.ok(typeof q === "string" && q.length > 10, "real question, not a stub");
  // returns a COPY, not the frozen source (caller must not be able to mutate the policy)
  qs.push("x");
  assert.equal(warmingQueriesFor("mill").length, BASE_WARMING_QUERIES.length, "source not mutated");
});
test("warmingQueriesFor: null / non-string -> empty array (fail-soft)", () => {
  assert.deepEqual(warmingQueriesFor(null), []);
  assert.deepEqual(warmingQueriesFor(42), []);
  assert.deepEqual(warmingQueriesFor(""), []);
});

// -- parseCursorDone --
test("parseCursorDone: parses jsonl rows into a Set of galaxy keys", () => {
  const txt = '{"galaxy":"mill","hits":2,"at":"t"}\n{"galaxy":"lathe","hits":0,"at":"t"}\n';
  const done = parseCursorDone(txt);
  assert.ok(done.has("mill") && done.has("lathe"));
  assert.equal(done.size, 2);
});
test("parseCursorDone: skips torn/blank/malformed lines (fail-soft, no throw)", () => {
  const txt = '{"galaxy":"mill"}\n\n{not json\n{"galaxy":"cam"}\n{"galaxy":"tr';  // torn last line
  const done = parseCursorDone(txt);
  assert.ok(done.has("mill") && done.has("cam"));
  assert.equal(done.has("tr"), false, "torn partial line ignored");
  assert.equal(done.size, 2);
});
test("parseCursorDone: empty / non-string -> empty Set", () => {
  assert.equal(parseCursorDone("").size, 0);
  assert.equal(parseCursorDone(null).size, 0);
  assert.equal(parseCursorDone(undefined).size, 0);
});
test("parseCursorDone: maxAgeHours window -> stale rows re-warm, fresh rows skip (daily-cron cycle-awareness)", () => {
  const now = Date.parse("2026-06-17T12:00:00Z");
  const fresh = new Date(now - 1 * 3600 * 1000).toISOString();   // 1h ago -> within 20h window
  const stale = new Date(now - 25 * 3600 * 1000).toISOString();  // 25h ago -> outside -> re-warm
  const txt = `{"galaxy":"mill","at":"${fresh}"}\n{"galaxy":"lathe","at":"${stale}"}\n`;
  const done = parseCursorDone(txt, { maxAgeHours: 20, nowMs: now });
  assert.ok(done.has("mill"), "1h-old row is fresh -> done (skip)");
  assert.equal(done.has("lathe"), false, "25h-old row is stale -> NOT done -> re-warm this cycle");
});
test("parseCursorDone: window active + missing/undated row -> treated as stale (re-warm)", () => {
  const now = Date.parse("2026-06-17T12:00:00Z");
  const txt = '{"galaxy":"mill"}\n{"galaxy":"cam","at":"not-a-date"}\n';
  const done = parseCursorDone(txt, { maxAgeHours: 20, nowMs: now });
  assert.equal(done.size, 0, "undated rows cannot be proven fresh -> re-warm");
});
test("parseCursorDone: maxAgeHours<=0 or no nowMs -> count ALL rows (back-compat single-run resume)", () => {
  const txt = '{"galaxy":"mill","at":"2020-01-01T00:00:00Z"}\n{"galaxy":"lathe"}\n';
  assert.equal(parseCursorDone(txt).size, 2, "no opts -> count all (within-run resume)");
  assert.equal(parseCursorDone(txt, { maxAgeHours: 0, nowMs: Date.now() }).size, 2, "window 0 disables age filter");
  assert.equal(parseCursorDone(txt, { maxAgeHours: 20 }).size, 2, "no nowMs -> cannot age-filter -> count all");
});

// -- partitionByResumeCursor --
test("partitionByResumeCursor: splits pending vs done, preserves order", () => {
  const galaxies = ["mill", "lathe", "cam", "cad"];
  const { pending, done } = partitionByResumeCursor(galaxies, new Set(["lathe", "cad"]));
  assert.deepEqual(pending, ["mill", "cam"], "pending excludes done, order preserved");
  assert.deepEqual(done, ["lathe", "cad"]);
});
test("partitionByResumeCursor: empty done-set -> all pending; non-array galaxies -> empty", () => {
  assert.deepEqual(partitionByResumeCursor(["a", "b"], new Set()).pending, ["a", "b"]);
  assert.deepEqual(partitionByResumeCursor(null, new Set()).pending, []);
  // a non-Set doneSet is treated as empty (defensive)
  assert.deepEqual(partitionByResumeCursor(["a"], null).pending, ["a"]);
});

// -- shouldAbortForPressure (C:-free box-cascade floor) --
test("shouldAbortForPressure: free RAM below the floor -> abort", () => {
  const GB = 1024 * 1024 * 1024;
  assert.equal(shouldAbortForPressure(2 * GB, 6144), true, "2GB free < 6GB floor -> abort");
  assert.equal(shouldAbortForPressure(10 * GB, 6144), false, "10GB free > 6GB floor -> continue");
});
test("shouldAbortForPressure: floor<=0 disables (never abort); unknown freeBytes -> never abort", () => {
  assert.equal(shouldAbortForPressure(1, 0), false, "floor 0 disables the gate");
  assert.equal(shouldAbortForPressure(1, -5), false);
  assert.equal(shouldAbortForPressure(NaN, 6144), false, "unknown free -> do not abort");
  assert.equal(shouldAbortForPressure(-1, 6144), false);
});

// -- summarizeWarmRun --
test("summarizeWarmRun: counts hits / ollamaCalls / errors + warmRate over non-error queries", () => {
  const results = [
    { galaxy: "mill", query: "q1", cached: false, ok: true },  // cold miss -> ollama ran
    { galaxy: "mill", query: "q2", cached: true, ok: true },   // warm hit
    { galaxy: "lathe", query: "q1", cached: true, ok: true },  // warm hit
    { galaxy: "cam", query: "q1", cached: false, ok: false, error: "boom" }, // error row
  ];
  const s = summarizeWarmRun(results);
  assert.equal(s.galaxiesWarmed, 3, "mill, lathe, cam");
  assert.equal(s.cacheHits, 2);
  assert.equal(s.ollamaCalls, 1);
  assert.equal(s.errors, 1);
  assert.equal(s.queries, 4);
  // warmRate = hits / (queries - errors) = 2 / 3
  assert.ok(Math.abs(s.warmRate - 2 / 3) < 1e-9, `warmRate ~0.667, got ${s.warmRate}`);
});
test("summarizeWarmRun: empty / all-error -> warmRate null (no false 100%)", () => {
  assert.equal(summarizeWarmRun([]).warmRate, null);
  const allErr = summarizeWarmRun([{ galaxy: "x", ok: false }, { galaxy: "y", ok: false }]);
  assert.equal(allErr.warmRate, null, "0 non-error queries -> null, never a fabricated rate");
  assert.equal(allErr.errors, 2);
});

// -- classifyResult (degraded-path silent-skip fix, scrutiny arm C P1) --
test("classifyResult: warm hit / cold-warmed / hard-fail map correctly", () => {
  assert.deepEqual(classifyResult({ ok: true, cached: true }), { ok: true, cached: true, degraded: false });
  assert.deepEqual(classifyResult({ ok: true, cached: false }), { ok: true, cached: false, degraded: false });
  assert.deepEqual(classifyResult({ ok: false, error: "boom" }), { ok: false, cached: false, degraded: false });
});
test("classifyResult: a DEGRADED result (ok:true but Ollama down -> cache NOT written) counts as NOT-ok", () => {
  // The bug fix: degraded carries ok:true but did not warm the cache. If treated as ok, the galaxy
  // gets cursor-marked done + permanently skipped on resume while still cold.
  const r = classifyResult({ ok: true, degraded: true, error: "ollama timeout" });
  assert.equal(r.ok, false, "degraded MUST be not-ok so the galaxy retries on resume");
  assert.equal(r.degraded, true);
});
test("classifyResult: null / undefined / non-object -> not-ok, not-cached (fail-soft, no throw)", () => {
  assert.deepEqual(classifyResult(null), { ok: false, cached: false, degraded: false });
  assert.deepEqual(classifyResult(undefined), { ok: false, cached: false, degraded: false });
  assert.deepEqual(classifyResult("nope"), { ok: false, cached: false, degraded: false });
});

// -- cursorPathFor (deep-reasoning warm uses a SEPARATE cursor) --
test("cursorPathFor: deep mode uses a -deep cursor; default unchanged (no cross-contamination)", () => {
  assert.equal(cursorPathFor(false, "x/cag-warm-cursor.jsonl"), "x/cag-warm-cursor.jsonl");
  assert.equal(cursorPathFor(true, "x/cag-warm-cursor.jsonl"), "x/cag-warm-cursor-deep.jsonl");
  // deep + default resolve to DISTINCT paths (the whole point -- separate cache-key resume state)
  assert.notEqual(cursorPathFor(true), cursorPathFor(false));
});
