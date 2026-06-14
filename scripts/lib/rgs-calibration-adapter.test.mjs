/**
 * rgs-calibration-adapter.test.mjs — tests for the CAMConfidenceCalibration
 * Engine-backed confidence-calibration adapter (U-LIMA-A7).
 *
 * Coverage:
 *   - pure helpers: identityCalibration, readOutcomeLedger, readPlansSidecar,
 *     joinConfidences (incl. adversarial / prototype-pollution inputs)
 *   - the >=50 joined-sample gate (boundary 49 vs 50)
 *   - graceful degradation: engine null / malformed / throwing
 *   - the never-throws closure contract
 *   - REAL-DATA E2E (punch-list core lesson: hermetic fakes do NOT prove the
 *     production wiring — these exercise the actual compiled engine + real
 *     path resolution): #1 compiled-engine round-trip, #2 real default paths,
 *     #3 full join->feed->calibrate against the compiled engine.
 */

import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  identityCalibration,
  loadCalibrationEngine,
  readOutcomeLedger,
  readPlansSidecar,
  joinConfidences,
  makeCalibrationFn,
  MIN_CALIBRATION_OUTCOMES,
  CALIBRATION_TASK,
  DEFAULT_LEDGER_PATH,
  DEFAULT_SIDECAR_PATH,
} from "./rgs-calibration-adapter.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal fake engine exposing the four static methods the adapter
 * drives. `overrides` replaces any method (e.g. to make one throw).
 */
function makeFakeEngine(overrides = {}) {
  const recorded = [];
  const clears = []; // live array — `_clears.length` counts clearOutcomes calls
  const base = {
    clearOutcomes() {
      recorded.length = 0;
      clears.push(1);
    },
    recordOutcome(o) {
      recorded.push(o);
    },
    recommendMethod() {
      return "isotonic";
    },
    calibrate(raw) {
      return {
        rawConfidence: raw,
        calibratedConfidence: 0.99,
        uncertaintyInterval: [0.9, 1],
        method: "isotonic",
        calibrated: true,
      };
    },
  };
  const engine = { ...base, ...overrides };
  engine._recorded = recorded;
  engine._clears = clears;
  return engine;
}

/**
 * Write a tmp ledger (JSONL) + tmp sidecar (JSON) for `n` units. Each unit i
 * has one outcome record (shipped iff i % shipMod === 0) and — for the first
 * `sidecarKeys` units — a sidecar plan with `confidence`.
 */
function writeLedgerAndSidecar(dir, n, opts = {}) {
  const { sidecarKeys = n, confidence = 0.9, shipMod = 3 } = opts;
  const ledgerLines = [];
  const plans = {};
  for (let i = 0; i < n; i++) {
    const unitKey = `MS-TEST::U-CAL${i}`;
    ledgerLines.push(
      JSON.stringify({
        v: 1,
        ts: "2026-05-20T00:00:00Z",
        unitKey,
        outcome: i % shipMod === 0 ? "shipped" : "blocked",
        predictedPipelines: [],
        tier: "M",
        verdict: "build",
      }),
    );
    if (i < sidecarKeys) plans[unitKey] = { confidence };
  }
  const ledgerPath = path.join(dir, "ledger.jsonl");
  const sidecarPath = path.join(dir, "sidecar.json");
  fs.writeFileSync(ledgerPath, ledgerLines.join("\n") + "\n");
  fs.writeFileSync(
    sidecarPath,
    JSON.stringify({
      schemaVersion: "1.0.0",
      generatedAt: "2026-05-20",
      generator: "test",
      degraded: false,
      plans,
    }),
  );
  return { ledgerPath, sidecarPath };
}

/** mkdtemp a unique scratch dir and register recursive cleanup. */
function scratchDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rgs-cal-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// ---------------------------------------------------------------------------
// identityCalibration
// ---------------------------------------------------------------------------

test("identityCalibration returns its numeric input unchanged", () => {
  assert.equal(identityCalibration(0.42), 0.42);
  assert.equal(identityCalibration(0), 0);
  assert.equal(identityCalibration(1), 1);
});

test("identityCalibration passes through edge values verbatim", () => {
  assert.equal(identityCalibration(-0.3), -0.3);
  assert.equal(identityCalibration(1.7), 1.7);
  assert.ok(Number.isNaN(identityCalibration(NaN)));
});

// ---------------------------------------------------------------------------
// readOutcomeLedger
// ---------------------------------------------------------------------------

test("readOutcomeLedger returns [] for an absent file", () => {
  assert.deepEqual(readOutcomeLedger("/no/such/ledger-xyz.jsonl"), []);
});

test("readOutcomeLedger parses valid JSONL records", (t) => {
  const dir = scratchDir(t);
  const p = path.join(dir, "l.jsonl");
  fs.writeFileSync(
    p,
    [
      JSON.stringify({ v: 1, unitKey: "MS::U-1", outcome: "shipped" }),
      JSON.stringify({ v: 1, unitKey: "MS::U-2", outcome: "blocked" }),
      JSON.stringify({ v: 1, unitKey: "MS::U-3", outcome: "reverted" }),
    ].join("\n") + "\n",
  );
  const recs = readOutcomeLedger(p);
  assert.equal(recs.length, 3);
  assert.deepEqual(recs[0], { unitKey: "MS::U-1", outcome: "shipped" });
});

test("readOutcomeLedger skips a malformed line, keeps the rest", (t) => {
  const dir = scratchDir(t);
  const p = path.join(dir, "l.jsonl");
  fs.writeFileSync(
    p,
    [
      JSON.stringify({ unitKey: "MS::U-1", outcome: "shipped" }),
      "{ this is not json",
      JSON.stringify({ unitKey: "MS::U-2", outcome: "blocked" }),
    ].join("\n") + "\n",
  );
  const recs = readOutcomeLedger(p);
  assert.equal(recs.length, 2);
});

test("readOutcomeLedger filters records with missing/invalid fields", (t) => {
  const dir = scratchDir(t);
  const p = path.join(dir, "l.jsonl");
  fs.writeFileSync(
    p,
    [
      JSON.stringify({ unitKey: "MS::U-1", outcome: "shipped" }), // valid
      JSON.stringify({ outcome: "shipped" }), // no unitKey
      JSON.stringify({ unitKey: "", outcome: "shipped" }), // empty unitKey
      JSON.stringify({ unitKey: "MS::U-4", outcome: "unknown" }), // bad outcome
      JSON.stringify({ unitKey: "MS::U-5" }), // no outcome
      JSON.stringify(null), // null record
    ].join("\n") + "\n",
  );
  const recs = readOutcomeLedger(p);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].unitKey, "MS::U-1");
});

// ---------------------------------------------------------------------------
// readPlansSidecar
// ---------------------------------------------------------------------------

test("readPlansSidecar returns {} for an absent file", () => {
  assert.deepEqual(readPlansSidecar("/no/such/sidecar-xyz.json"), {});
});

test("readPlansSidecar returns {} for malformed JSON", (t) => {
  const dir = scratchDir(t);
  const p = path.join(dir, "s.json");
  fs.writeFileSync(p, "{ not json");
  assert.deepEqual(readPlansSidecar(p), {});
});

test("readPlansSidecar returns {} when the .plans key is absent", (t) => {
  const dir = scratchDir(t);
  const p = path.join(dir, "s.json");
  fs.writeFileSync(p, JSON.stringify({ schemaVersion: "1.0.0" }));
  assert.deepEqual(readPlansSidecar(p), {});
});

test("readPlansSidecar returns the plans map for a valid sidecar", (t) => {
  const dir = scratchDir(t);
  const p = path.join(dir, "s.json");
  fs.writeFileSync(
    p,
    JSON.stringify({ plans: { "MS::U-1": { confidence: 0.7 } } }),
  );
  assert.deepEqual(readPlansSidecar(p), { "MS::U-1": { confidence: 0.7 } });
});

// ---------------------------------------------------------------------------
// joinConfidences
// ---------------------------------------------------------------------------

test("joinConfidences yields one sample per unit, shipped wins", () => {
  const outcomes = [
    { unitKey: "MS::U-1", outcome: "blocked" },
    { unitKey: "MS::U-1", outcome: "shipped" }, // shipped wins for U-1
    { unitKey: "MS::U-2", outcome: "blocked" },
  ];
  const plans = { "MS::U-1": { confidence: 0.8 }, "MS::U-2": { confidence: 0.4 } };
  const pairs = joinConfidences(outcomes, plans);
  assert.equal(pairs.length, 2);
  const u1 = pairs.find((p) => p.unitKey === "MS::U-1");
  const u2 = pairs.find((p) => p.unitKey === "MS::U-2");
  assert.equal(u1.wasCorrect, true);
  assert.equal(u1.predictedConfidence, 0.8);
  assert.equal(u2.wasCorrect, false);
});

test("joinConfidences prefers rawConfidence over a calibrated confidence", () => {
  // After a calibrated run the plan's `confidence` is a calibrated value; the
  // join must recover the pre-calibration `rawConfidence` so the mapping
  // stays fit on raw model outputs (no calibrate-on-calibrated drift).
  const pairs = joinConfidences(
    [{ unitKey: "MS::U-1", outcome: "shipped" }],
    { "MS::U-1": { confidence: 0.42, rawConfidence: 0.8 } },
  );
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].predictedConfidence, 0.8);
});

test("joinConfidences falls back to confidence when rawConfidence is absent", () => {
  // A sidecar written before A7 / with calibration off has only `confidence`,
  // which IS the raw value in that case.
  const pairs = joinConfidences(
    [{ unitKey: "MS::U-1", outcome: "shipped" }],
    { "MS::U-1": { confidence: 0.65 } },
  );
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].predictedConfidence, 0.65);
});

test("joinConfidences drops a unit with no matching sidecar plan", () => {
  const pairs = joinConfidences(
    [{ unitKey: "MS::U-1", outcome: "shipped" }],
    {}, // no plan for U-1
  );
  assert.equal(pairs.length, 0);
});

test("joinConfidences drops a unit whose plan confidence is non-finite", () => {
  const plans = {
    "MS::U-1": { confidence: Number.NaN },
    "MS::U-2": { confidence: Infinity },
    "MS::U-3": { confidence: "0.5" }, // non-number
    "MS::U-4": {}, // no confidence
    "MS::U-5": { confidence: 0.6 }, // the only valid one
  };
  const outcomes = ["1", "2", "3", "4", "5"].map((n) => ({
    unitKey: `MS::U-${n}`,
    outcome: "shipped",
  }));
  const pairs = joinConfidences(outcomes, plans);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].unitKey, "MS::U-5");
});

test("joinConfidences tolerates non-array / non-object inputs", () => {
  assert.deepEqual(joinConfidences(null, null), []);
  assert.deepEqual(joinConfidences(undefined, undefined), []);
  assert.deepEqual(joinConfidences("nope", 42), []);
  assert.deepEqual(joinConfidences([null, undefined, {}], {}), []);
});

test("joinConfidences does not resolve a __proto__ unitKey to a prototype member", () => {
  // A "__proto__" unitKey must resolve to "no plan", never Object.prototype.
  const pairs = joinConfidences(
    [
      { unitKey: "__proto__", outcome: "shipped" },
      { unitKey: "constructor", outcome: "shipped" },
    ],
    { "MS::U-real": { confidence: 0.5 } },
  );
  assert.equal(pairs.length, 0);
});

// ---------------------------------------------------------------------------
// loadCalibrationEngine — real compiled-engine shape check
// ---------------------------------------------------------------------------

test("loadCalibrationEngine resolves the compiled engine with the expected shape", async () => {
  const engine = await loadCalibrationEngine();
  // dist must be built for this to be non-null; if so, verify the shape.
  if (engine != null) {
    assert.equal(typeof engine.calibrate, "function");
    assert.equal(typeof engine.recordOutcome, "function");
    assert.equal(typeof engine.clearOutcomes, "function");
    assert.equal(typeof engine.recommendMethod, "function");
  }
});

// ---------------------------------------------------------------------------
// makeCalibrationFn — degradation + gate
// ---------------------------------------------------------------------------

test("makeCalibrationFn returns identityCalibration when engine is null", async () => {
  const fn = await makeCalibrationFn({ engine: null });
  assert.equal(fn, identityCalibration);
});

test("makeCalibrationFn returns identity when the injected engine is malformed", async () => {
  // Missing clearOutcomes → fails the shape check → identity.
  const fn = await makeCalibrationFn({
    engine: { calibrate() {}, recordOutcome() {}, recommendMethod() {} },
  });
  assert.equal(fn, identityCalibration);
});

test("makeCalibrationFn passes through when the ledger is below the gate", async (t) => {
  const dir = scratchDir(t);
  const { ledgerPath, sidecarPath } = writeLedgerAndSidecar(dir, 10);
  const fn = await makeCalibrationFn({
    engine: makeFakeEngine(),
    ledgerPath,
    sidecarPath,
  });
  assert.equal(fn, identityCalibration);
});

test("makeCalibrationFn passes through when joined samples are below the gate", async (t) => {
  const dir = scratchDir(t);
  // 55 ledger records but only 10 have a sidecar plan → joined = 10 < 50.
  const { ledgerPath, sidecarPath } = writeLedgerAndSidecar(dir, 55, {
    sidecarKeys: 10,
  });
  const fn = await makeCalibrationFn({
    engine: makeFakeEngine(),
    ledgerPath,
    sidecarPath,
  });
  assert.equal(fn, identityCalibration);
});

test("makeCalibrationFn returns a calibrating closure once the gate is met", async (t) => {
  const dir = scratchDir(t);
  const { ledgerPath, sidecarPath } = writeLedgerAndSidecar(dir, 55);
  const engine = makeFakeEngine();
  const fn = await makeCalibrationFn({ engine, ledgerPath, sidecarPath });
  assert.notEqual(fn, identityCalibration);
  // The fake engine's calibrate() always returns 0.99 → proves the closure
  // routed through the engine rather than passing through.
  assert.equal(fn(0.5), 0.99);
  assert.equal(engine._recorded.length, 55);
  assert.equal(engine._recorded[0].task, CALIBRATION_TASK);
});

test("the calibrating closure never throws on non-finite / non-number input", async (t) => {
  const dir = scratchDir(t);
  const { ledgerPath, sidecarPath } = writeLedgerAndSidecar(dir, 55);
  const fn = await makeCalibrationFn({
    engine: makeFakeEngine(),
    ledgerPath,
    sidecarPath,
  });
  // Non-finite / non-number inputs are returned verbatim, never thrown.
  assert.ok(Number.isNaN(fn(NaN)));
  assert.equal(fn(Infinity), Infinity);
  assert.equal(fn(-Infinity), -Infinity);
  assert.equal(fn("0.5"), "0.5");
  assert.equal(fn(undefined), undefined);
});

test("the calibrating closure returns raw confidence when engine.calibrate throws", async (t) => {
  const dir = scratchDir(t);
  const { ledgerPath, sidecarPath } = writeLedgerAndSidecar(dir, 55);
  const fn = await makeCalibrationFn({
    engine: makeFakeEngine({
      calibrate() {
        throw new Error("calibrate boom");
      },
    }),
    ledgerPath,
    sidecarPath,
  });
  assert.equal(fn(0.42), 0.42); // raw, unchanged — no throw
});

test("the calibrating closure returns raw when calibrate yields a non-finite result", async (t) => {
  const dir = scratchDir(t);
  const { ledgerPath, sidecarPath } = writeLedgerAndSidecar(dir, 55);
  const fn = await makeCalibrationFn({
    engine: makeFakeEngine({
      calibrate: (raw) => ({ rawConfidence: raw, calibratedConfidence: NaN }),
    }),
    ledgerPath,
    sidecarPath,
  });
  assert.equal(fn(0.6), 0.6); // NaN result rejected → raw passthrough
});

test("makeCalibrationFn falls back to identity when recordOutcome throws", async (t) => {
  const dir = scratchDir(t);
  const { ledgerPath, sidecarPath } = writeLedgerAndSidecar(dir, 55);
  const engine = makeFakeEngine({
    recordOutcome() {
      throw new Error("record boom");
    },
  });
  const fn = await makeCalibrationFn({ engine, ledgerPath, sidecarPath });
  assert.equal(fn, identityCalibration);
  // The factory must best-effort wipe the process-global buffer on a failed
  // feed: clearOutcomes runs once at feed start + once in the catch.
  assert.equal(engine._clears.length, 2);
});

test("makeCalibrationFn gate boundary: 49 joined → identity, 50 → calibrating", async (t) => {
  const dir49 = scratchDir(t);
  const j49 = writeLedgerAndSidecar(dir49, 49);
  const fn49 = await makeCalibrationFn({
    engine: makeFakeEngine(),
    ledgerPath: j49.ledgerPath,
    sidecarPath: j49.sidecarPath,
  });
  assert.equal(fn49, identityCalibration, "49 < MIN must pass through");

  const dir50 = scratchDir(t);
  const j50 = writeLedgerAndSidecar(dir50, 50);
  const fn50 = await makeCalibrationFn({
    engine: makeFakeEngine(),
    ledgerPath: j50.ledgerPath,
    sidecarPath: j50.sidecarPath,
  });
  assert.notEqual(fn50, identityCalibration, "50 == MIN must calibrate");
  assert.equal(MIN_CALIBRATION_OUTCOMES, 50);
});

// ---------------------------------------------------------------------------
// REAL-DATA E2E — exercises the actual compiled engine, no mocks
// ---------------------------------------------------------------------------

test("E2E #1: compiled engine round-trips record -> calibrate", async (t) => {
  const engine = await loadCalibrationEngine();
  if (engine == null) {
    // dist not built — report an honest skip, not a false pass.
    t.skip("compiled engine (mcp-server/dist) not built — E2E skipped");
    return;
  }
  engine.clearOutcomes();
  try {
    for (let i = 0; i < 60; i++) {
      engine.recordOutcome({
        decisionId: `e2e-${i}`,
        task: CALIBRATION_TASK,
        predictedConfidence: 0.9,
        wasCorrect: i % 3 === 0, // ~33% correct at confidence 0.9
      });
    }
    assert.equal(engine.getOutcomeCount(CALIBRATION_TASK), 60);
    const r = engine.calibrate(0.9, { task: CALIBRATION_TASK, method: "isotonic" });
    assert.equal(r.calibrated, true);
    assert.ok(Number.isFinite(r.calibratedConfidence));
    // 0.9 raw but only ~33% actually correct → calibration pulls it down.
    assert.ok(r.calibratedConfidence < 0.7, `expected <0.7, got ${r.calibratedConfidence}`);
  } finally {
    engine.clearOutcomes();
  }
});

test("E2E #2: makeCalibrationFn() against the real default paths wires up", async (t) => {
  // No injected engine, no path overrides — exercises real engine import +
  // real DEFAULT_LEDGER_PATH / DEFAULT_SIDECAR_PATH resolution.
  assert.equal(typeof DEFAULT_LEDGER_PATH, "string");
  assert.equal(typeof DEFAULT_SIDECAR_PATH, "string");
  const fn = await makeCalibrationFn();
  assert.equal(typeof fn, "function");
  // The adapter either calibrates (real ledger >=50 joined) or degrades to
  // the identity pass-through — both are valid production states. Surface
  // which branch the LIVE ledger currently yields so the test is honest
  // about what it exercised rather than silently passing either way.
  const branch =
    fn === identityCalibration ? "identity (degenerate ledger)" : "calibrating";
  t.diagnostic(`E2E #2 — live default-path branch observed: ${branch}`);
  const out = fn(0.5);
  assert.ok(Number.isFinite(out) && out >= 0 && out <= 1, `fn(0.5)=${out}`);
  assert.doesNotThrow(() => fn(NaN)); // never throws on bad input
});

test("E2E #3: full join -> feed -> calibrate against the compiled engine", async (t) => {
  const engine = await loadCalibrationEngine();
  if (engine == null) {
    t.skip("compiled engine (mcp-server/dist) not built — E2E skipped");
    return;
  }

  const dir = scratchDir(t);
  // 60 units, confidence 0.9, ~33% shipped → deliberately miscalibrated.
  const { ledgerPath, sidecarPath } = writeLedgerAndSidecar(dir, 60, {
    confidence: 0.9,
    shipMod: 3,
  });
  engine.clearOutcomes();
  try {
    // No `engine` injection → adapter imports + uses the REAL compiled engine.
    const fn = await makeCalibrationFn({ ledgerPath, sidecarPath });
    assert.notEqual(fn, identityCalibration, "60 joined samples must calibrate");
    const out = fn(0.9);
    assert.ok(Number.isFinite(out) && out >= 0 && out <= 1, `fn(0.9)=${out}`);
    // The real isotonic mapping must pull 0.9 down toward the ~33% accuracy.
    assert.ok(out < 0.7, `expected calibration to remap 0.9 below 0.7, got ${out}`);
  } finally {
    engine.clearOutcomes();
  }
});

// ---------------------------------------------------------------------------
// Hostile-input contract: a __proto__ unitKey survives the WHOLE factory
// ---------------------------------------------------------------------------

test("makeCalibrationFn tolerates a hostile __proto__ unitKey in the ledger", async (t) => {
  const dir = scratchDir(t);
  const { ledgerPath, sidecarPath } = writeLedgerAndSidecar(dir, 55);
  // Append a hostile record — a "__proto__" unitKey must be harmlessly
  // dropped by the join, never crash the factory or poison the prototype.
  fs.appendFileSync(
    ledgerPath,
    JSON.stringify({ v: 1, unitKey: "__proto__", outcome: "shipped" }) + "\n",
  );
  const fn = await makeCalibrationFn({
    engine: makeFakeEngine(),
    ledgerPath,
    sidecarPath,
  });
  // The 55 legitimate units still join → gate met → calibrating closure;
  // the __proto__ record is silently dropped (no sidecar plan for it).
  assert.notEqual(fn, identityCalibration);
  assert.doesNotThrow(() => fn(0.5));
  // Prototype was not poisoned by parsing / looking up the hostile key.
  assert.equal({}.polluted, undefined);
});

// ---------------------------------------------------------------------------
// Suite teardown — leave the process-global compiled-engine buffer clean
// ---------------------------------------------------------------------------

after(async () => {
  // The real E2E tests clear in their own `finally`; this is a belt-and-
  // suspenders wipe so the process-global engine is clean for any
  // shared-process consumer that runs after this suite.
  const engine = await loadCalibrationEngine();
  if (engine != null) {
    try {
      engine.clearOutcomes();
    } catch {
      /* engine unusable — nothing to clean */
    }
  }
});
