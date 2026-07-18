// scripts/octopus-utilization-driver.test.mjs
//
// Real-assertion tests for the octopus utilization driver (U-ALPHA-OCTOPUS-DRIVER).
// Covers: deterministic rotation (reference values), wrap-around selection,
// the dry/injected tick path (no network), per-question failure mapping,
// harness-ok vs voice-ok exit semantics, arg parsing, and adversarial inputs.
//
// Run: node scripts/octopus-utilization-driver.test.mjs   (node:test auto-runs on exit)

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  QUESTION_POOL,
  rotationIndex,
  selectQuestions,
  defaultReadLedgerCount,
  runUtilizationTick,
  parseArgs,
} from "./octopus-utilization-driver.mjs";

// --- pool integrity -------------------------------------------------------

test("QUESTION_POOL: 10 frozen entries, valid galaxy domains, consensus prompts", () => {
  assert.equal(QUESTION_POOL.length, 10);
  assert.ok(Object.isFrozen(QUESTION_POOL));
  const validDomains = new Set([
    "speed-feed", "lathe", "wedm", "cam", "cad", "quoting",
    "post-processor", "mill", "business", "token-optimization",
  ]);
  const ids = new Set();
  for (const q of QUESTION_POOL) {
    assert.ok(Object.isFrozen(q), `entry ${q.id} must be frozen`);
    assert.ok(validDomains.has(q.domain), `domain ${q.domain} must be a real galaxy`);
    assert.ok(q.prompt.startsWith("Consensus check:"), `${q.id} prompt must self-classify`);
    assert.ok(q.prompt.length > 80, `${q.id} prompt must be a real question`);
    assert.ok(!ids.has(q.id), `id ${q.id} must be unique`);
    ids.add(q.id);
  }
});

// --- rotationIndex (pure, reference values) -------------------------------

test("rotationIndex: modulo of ledger count", () => {
  assert.equal(rotationIndex(60, 10), 0); // 60 lifetime runs -> top of pool
  assert.equal(rotationIndex(63, 10), 3);
  assert.equal(rotationIndex(9, 10), 9);
  assert.equal(rotationIndex(10, 10), 0);
});

test("rotationIndex: normalizes negative + non-finite to a valid index", () => {
  assert.equal(rotationIndex(-1, 10), 9);   // never negative
  assert.equal(rotationIndex(-13, 10), 7);
  assert.equal(rotationIndex(NaN, 10), 0);
  assert.equal(rotationIndex(Infinity, 10), 0);
  assert.equal(rotationIndex(3.9, 10), 3);  // truncates
});

test("rotationIndex: invalid poolLen falls back to len 1 -> index 0 (adversarial)", () => {
  assert.equal(rotationIndex(5, 0), 0);
  assert.equal(rotationIndex(5, -2), 0);
  assert.equal(rotationIndex(5, NaN), 0);
});

// --- selectQuestions (pure) -----------------------------------------------

test("selectQuestions: deterministic in-order slice (reference ids)", () => {
  const q = selectQuestions(0, 3);
  assert.deepEqual(q.map((x) => x.id), ["sf-4140-rough", "lathe-17-4-css", "wedm-d2-recast"]);
});

test("selectQuestions: wraps around the end of the pool", () => {
  const q = selectQuestions(9, 3);
  assert.deepEqual(q.map((x) => x.id), ["token-offload-vs-filter", "sf-4140-rough", "lathe-17-4-css"]);
});

test("selectQuestions: count > pool length laps the full pool, length === count", () => {
  const q = selectQuestions(0, 12);
  assert.equal(q.length, 12);
  // First full lap is all 10 distinct, then it repeats from the top.
  assert.equal(new Set(q.slice(0, 10).map((x) => x.id)).size, 10);
  assert.equal(q[10].id, q[0].id);
});

test("selectQuestions: clamps count<1 to 1; empty pool falls back to QUESTION_POOL (adversarial)", () => {
  assert.equal(selectQuestions(0, 0).length, 1);
  assert.equal(selectQuestions(0, -5).length, 1);
  const fromEmpty = selectQuestions(0, 2, []);
  assert.equal(fromEmpty.length, 2);
  assert.equal(fromEmpty[0].id, QUESTION_POOL[0].id); // fell back to the real pool
});

test("selectQuestions: does not mutate the source pool", () => {
  const before = QUESTION_POOL.map((q) => q.id).join(",");
  selectQuestions(3, 5);
  assert.equal(QUESTION_POOL.map((q) => q.id).join(","), before);
});

// --- runUtilizationTick (injected runLive, no network) --------------------

/** A fake runLive that records its calls and returns a scripted result. */
function fakeRunLive(scriptFn) {
  const calls = [];
  const fn = async (args) => {
    calls.push(args);
    return scriptFn(args, calls.length - 1);
  };
  fn.calls = calls;
  return fn;
}

test("runUtilizationTick: happy path -- voices answer -> harness ok, succeeded counted", async () => {
  const run = fakeRunLive(() => ({ ok: true, summary: { ok: true, reason: "ok", voiceCount: 3, verdict: "trochoidal" } }));
  const res = await runUtilizationTick({ count: 2, runLive: run, readLedgerCount: () => 0 });
  assert.equal(res.ok, true);
  assert.equal(res.attempted, 2);
  assert.equal(res.succeeded, 2);
  assert.equal(res.startIndex, 0);
  assert.equal(res.results[0].domain, "speed-feed");
  assert.equal(res.results[0].voiceCount, 3);
  assert.equal(run.calls.length, 2);
});

test("runUtilizationTick: voices DOWN -> still HARNESS-ok (recorded blocker), succeeded=0", async () => {
  // runLive returns ok:false with a recorded dispatch-unavailable summary -- this
  // is the Ollama-down case: the ledger entry IS written, the cron must NOT flap.
  const run = fakeRunLive(() => ({ ok: false, summary: { ok: false, reason: "dispatch-unavailable:engine", voiceCount: 0 } }));
  const res = await runUtilizationTick({ count: 3, runLive: run, readLedgerCount: () => 0 });
  assert.equal(res.ok, true, "harness recorded all attempts -> ok despite zero voices");
  assert.equal(res.attempted, 3);
  assert.equal(res.succeeded, 0);
  assert.ok(res.results.every((r) => r.ok === true && r.succeeded === false));
  assert.equal(res.results[0].reason, "dispatch-unavailable:engine");
});

test("runUtilizationTick: a runLive THROW on one item -> that item ok:false, loop continues, harness ok=false", async () => {
  const run = fakeRunLive((_args, i) => {
    if (i === 1) throw new Error("engine import failed");
    return { ok: true, summary: { ok: true, reason: "ok", voiceCount: 2 } };
  });
  const res = await runUtilizationTick({ count: 3, runLive: run, readLedgerCount: () => 0 });
  assert.equal(res.attempted, 3, "loop did not abort on the throw");
  assert.equal(res.ok, false, "a thrown item makes the harness unhealthy");
  assert.equal(res.results[1].ok, false);
  assert.match(res.results[1].reason, /runLive-threw:engine import failed/);
  assert.equal(res.results[0].succeeded, true);
  assert.equal(res.results[2].succeeded, true);
});

test("runUtilizationTick: rotation start follows the injected ledger count", async () => {
  const run = fakeRunLive(() => ({ ok: true, summary: { ok: true, reason: "ok", voiceCount: 2 } }));
  const res = await runUtilizationTick({ count: 1, runLive: run, readLedgerCount: () => 63 });
  assert.equal(res.startIndex, 3); // 63 % 10
  assert.equal(res.results[0].domain, "cam");
  assert.equal(run.calls[0].prompt, QUESTION_POOL[3].prompt);
});

test("runUtilizationTick: threads dry + withHermesGrok + slot + timeout into runLive", async () => {
  const run = fakeRunLive(() => ({ ok: true, summary: { ok: true, reason: "ok", voiceCount: 3 } }));
  await runUtilizationTick({
    count: 1, runLive: run, readLedgerCount: () => 0,
    dry: true, withHermesGrok: true, slot: "alpha", timeoutMs: 5000,
  });
  const call = run.calls[0];
  assert.equal(call.dry, true);
  assert.equal(call.includeHermesGrok, true);
  assert.equal(call.slot, "alpha");
  assert.equal(call.timeoutMs, 5000);
});

test("runUtilizationTick: count<1 clamps to a single attempt (adversarial)", async () => {
  const run = fakeRunLive(() => ({ ok: true, summary: { ok: true, reason: "ok", voiceCount: 2 } }));
  const res = await runUtilizationTick({ count: 0, runLive: run, readLedgerCount: () => 0 });
  assert.equal(res.attempted, 1);
});

// --- defaultReadLedgerCount (fail-soft against the real ledger) ------------

test("defaultReadLedgerCount: returns a non-negative integer, never throws", () => {
  const n = defaultReadLedgerCount();
  assert.ok(Number.isInteger(n) && n >= 0, `expected >=0 integer, got ${n}`);
});

// --- parseArgs (pure) -----------------------------------------------------

test("parseArgs: defaults", () => {
  const a = parseArgs([]);
  assert.equal(a.count, 1);
  assert.equal(a.dry, false);
  assert.equal(a.json, false);
  assert.equal(a.withHermesGrok, false);
  assert.equal(a.slot, null);
  assert.equal(a.prompt, null);
});

test("parseArgs: flags + values", () => {
  const a = parseArgs(["--json", "--dry", "--with-hermes-grok", "--count", "4", "--slot", "alpha", "--timeout-ms", "9000"]);
  assert.equal(a.json, true);
  assert.equal(a.dry, true);
  assert.equal(a.withHermesGrok, true);
  assert.equal(a.count, 4);
  assert.equal(a.slot, "alpha");
  assert.equal(a.timeoutMs, 9000);
});

test("parseArgs: a non-numeric --count falls back to 1 (adversarial)", () => {
  assert.equal(parseArgs(["--count", "abc"]).count, 1);
  assert.equal(parseArgs(["--count", "-3"]).count, 1);
});
