/**
 * Tests for nn-graph-conformal-audit.mjs (ledger #9, slot:india 2026-06-16).
 *
 * Exercises the audit against the REAL dist engines (CrossProcessConformalClassification +
 * ConformalCalibrationMonitor) with deterministic synthetic data whose coverage outcome is
 * hand-verifiable -- NOT a live/fudged metric (R9 + india metrics discipline). Each test
 * runs the full calibrate -> predictionSet -> monitor.record -> status pipeline.
 *
 * Run: node --test scripts/nn-graph-conformal-audit.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  runConformalAudit,
  splitCalTest,
  parseArgs,
  parsePredictionsJsonl,
  MIN_MEANINGFUL_N,
} from "./nn-graph-conformal-audit.mjs";
import { CrossProcessConformalClassificationEngine } from "../mcp-server/dist/engines/CrossProcessConformalClassificationEngine.js";
import { ConformalCalibrationMonitorEngine } from "../mcp-server/dist/engines/ConformalCalibrationMonitorEngine.js";

const ENGINES = {
  Conformal: CrossProcessConformalClassificationEngine,
  Monitor: ConformalCalibrationMonitorEngine,
};

/** Deterministic K-class pair: true-class prob = trueProb, the rest split evenly (sum == 1). */
function calibratedPairs(n, K, trueProb) {
  const other = (1 - trueProb) / (K - 1);
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const label = i % K;
    const probs = new Array(K).fill(other);
    probs[label] = trueProb;
    out.push({ probs, label });
  }
  return out;
}

/**
 * Deterministic "model is WRONG" pair: the high prob `hi` sits on a NON-true class
 * (argmax = wrong), the true class gets 0.05, the remainder splits across the rest.
 * Because the engine's prediction set is the argmax-or-threshold-clearers, the true class
 * (low, non-argmax) is NOT in S(x) -> a genuine MISS (the only way to miss given the
 * non-empty argmax fallback).
 */
function wrongPredPairs(n, K, hi) {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const label = i % K;
    const wrong = (label + 1) % K;
    const probs = new Array(K).fill(0);
    probs[wrong] = hi;
    probs[label] = 0.05;
    const others = [];
    for (let c = 0; c < K; c += 1) if (c !== wrong && c !== label) others.push(c);
    const share = others.length ? (1 - hi - 0.05) / others.length : 0;
    others.forEach((c) => { probs[c] = share; });
    out.push({ probs, label });
  }
  return out;
}

// ---- Happy path: well-calibrated data -> the marginal guarantee holds --------
test("well-calibrated holdout: empirical coverage >= target, guarantee met, trustworthy", async () => {
  // cal + test both drawn from the same distribution (true-class prob 0.85, 3 classes).
  // LAC score = 1 - 0.85 = 0.15 for every cal pair; qHat = 0.15; a test point with true-class
  // prob 0.85 clears the (1 - qHat = 0.85) threshold -> covered. Coverage = 1.0 >= 0.9.
  const pairs = [...calibratedPairs(40, 3, 0.85), ...calibratedPairs(40, 3, 0.85)];
  const r = await runConformalAudit(pairs, { ...ENGINES, alpha: 0.1, calFraction: 0.5 });
  assert.equal(r.ok, true);
  assert.equal(r.nCal, 40);
  assert.equal(r.nTest, 40);
  assert.equal(r.targetCoverage, 0.9);
  assert.ok(r.empiricalCoverage >= r.targetCoverage - r.tolerance, `coverage ${r.empiricalCoverage} below ${r.targetCoverage - r.tolerance}`);
  assert.equal(r.marginalGuaranteeMet, true);
  assert.equal(r.trustworthy, true);
});

// ---- Miscoverage IS detected (the whole point of the audit) ------------------
test("partial-coverage holdout: audit reports ~0.5 coverage + flags the guarantee unmet", async () => {
  // cal: 40 @ true-prob 0.85 -> qHat 0.15 -> threshold (1-qHat) = 0.85.
  // test: 20 pairs -- 10 well-predicted (true class 0.85 >= 0.85 -> in set -> COVERED) +
  // 10 wrong-predicted (argmax = a WRONG class @0.85, true class @0.05 -> set = {wrong},
  // true class NOT in set -> MISS). Coverage = 10/20 = 0.5; guarantee (>=0.9) unmet.
  const cal = calibratedPairs(40, 3, 0.85);
  const testCovered = calibratedPairs(10, 3, 0.85);
  const testMiss = wrongPredPairs(10, 3, 0.85);
  const pairs = [...cal, ...testCovered, ...testMiss];
  const r = await runConformalAudit(pairs, { ...ENGINES, alpha: 0.1, calFraction: 40 / 60 });
  assert.equal(r.ok, true);
  assert.equal(r.nTest, 20);
  assert.ok(Math.abs(r.empiricalCoverage - 0.5) < 1e-9, `expected 0.5, got ${r.empiricalCoverage}`);
  assert.equal(r.marginalGuaranteeMet, false);
});

// ---- India discipline: REFUSE a coverage number on a meaningless holdout -----
test("refuses to emit coverage when n_test < MIN_MEANINGFUL_N", async () => {
  const pairs = calibratedPairs(30, 3, 0.85); // calFraction 0.5 -> test = 15 < 20
  const r = await runConformalAudit(pairs, { ...ENGINES, alpha: 0.1, calFraction: 0.5 });
  assert.equal(r.ok, false);
  assert.equal(r.refused, true);
  assert.equal(r.nTest, 15);
  assert.match(r.error, /insufficient holdout/i);
  assert.match(r.error, new RegExp(String(MIN_MEANINGFUL_N)));
});

// ---- India discipline: FLAG a trivially-inflated coverage (tiny calibration) -
test("flags untrustworthy coverage when most predictions fall back to the full set", async () => {
  // cal = 8 -> k = ceil(9*0.9) = 9 > 8 -> every predictionSet is the FULL label set -> coverage
  // is trivially 1.0 and meaningless. The audit must flag trustworthy=false + a warning.
  const pairs = [...calibratedPairs(8, 3, 0.85), ...calibratedPairs(32, 3, 0.85)];
  const r = await runConformalAudit(pairs, { ...ENGINES, alpha: 0.1, calFraction: 0.2 });
  assert.equal(r.ok, true);
  assert.equal(r.nCal, 8);
  assert.equal(r.nTest, 32);
  assert.equal(r.fullSetCount, 32);
  assert.equal(r.trustworthy, false);
  assert.ok(r.fullSetWarning && /full label set/i.test(r.fullSetWarning));
});

// ---- Adversarial: non-finite prob is rejected by the conformal engine --------
test("adversarial: NaN prob -> calibration fails cleanly (no crash)", async () => {
  const pairs = calibratedPairs(40, 3, 0.85);
  pairs[0].probs[0] = Number.NaN;
  const r = await runConformalAudit(pairs, { ...ENGINES, alpha: 0.1, calFraction: 0.5 });
  assert.equal(r.ok, false);
  assert.match(r.error, /calibration failed/i);
});

// ---- Adversarial: empty input ------------------------------------------------
test("adversarial: empty pairs -> ok:false, no crash", async () => {
  const r = await runConformalAudit([], { ...ENGINES });
  assert.equal(r.ok, false);
  assert.match(r.error, /no prediction pairs/i);
});

// ---- Failure: alpha out of (0,1) ---------------------------------------------
test("failure: alpha outside (0,1) is rejected", async () => {
  const pairs = calibratedPairs(60, 3, 0.85);
  const rHigh = await runConformalAudit(pairs, { ...ENGINES, alpha: 1.5 });
  assert.equal(rHigh.ok, false);
  assert.match(rHigh.error, /alpha/i);
  const rZero = await runConformalAudit(pairs, { ...ENGINES, alpha: 0 });
  assert.equal(rZero.ok, false);
});

// ---- Pure helpers ------------------------------------------------------------
test("splitCalTest splits deterministically by fraction", () => {
  const pairs = Array.from({ length: 10 }, (_, i) => ({ probs: [0.5, 0.5], label: i % 2 }));
  const { cal, test: tst } = splitCalTest(pairs, 0.6);
  assert.equal(cal.length, 6);
  assert.equal(tst.length, 4);
  // first-6 = calibration, last-4 = test (deterministic order preserved).
  assert.deepEqual(cal[0], pairs[0]);
  assert.deepEqual(tst[0], pairs[6]);
});

test("parsePredictionsJsonl parses valid lines + skips blanks + throws on malformed", () => {
  const text = '{"probs":[0.9,0.1],"label":0}\n\n{"probs":[0.2,0.8],"label":1}\n';
  const pairs = parsePredictionsJsonl(text);
  assert.equal(pairs.length, 2);
  assert.equal(pairs[1].label, 1);
  assert.throws(() => parsePredictionsJsonl('{"probs":[0.9,0.1]}'), /expected \{probs/);
  assert.throws(() => parsePredictionsJsonl("not json"), /not valid JSON/);
});

test("parseArgs reads the documented flags", () => {
  const a = parseArgs(["--predictions", "p.jsonl", "--alpha", "0.2", "--cal-fraction", "0.7", "--json", "--strict"]);
  assert.equal(a.predictions, "p.jsonl");
  assert.equal(a.alpha, 0.2);
  assert.equal(a.calFraction, 0.7);
  assert.equal(a.json, true);
  assert.equal(a.strict, true);
});

// ---- P3 regression: parseArgs rejects non-finite numeric flags rather than silently NaN
test("parseArgs throws a CLEAR error on a non-finite numeric flag (no silent NaN)", () => {
  assert.throws(() => parseArgs(["--predictions", "p.jsonl", "--alpha", "abc"]), /alpha.*finite/i);
  assert.throws(() => parseArgs(["--cal-fraction", "not-a-number"]), /cal-fraction.*finite/i);
  assert.throws(() => parseArgs(["--tolerance", "NaN"]), /tolerance.*finite/i);
});

// ---- P1 regression (false-green CI gate): --strict on an UNTRUSTWORTHY run must NOT exit 0.
// Spawns the real CLI to assert the exit code -- the bug being prevented is precisely a
// silent CI pass on a trivially-inflated coverage (the india invariant exists for this).
test("CLI --strict on an untrustworthy run exits 2 (no silent CI false-green)", () => {
  // cal=8 -> every predictionSet falls back to the full label set -> empirical=1.0 trivially.
  // trustworthy:false; without the strict-trustworthy gate, exit would be 0 (a false-green).
  const K = 3, tp = 0.85, other = (1 - tp) / (K - 1);
  const lines = [];
  for (let i = 0; i < 40; i += 1) {
    const label = i % K;
    const probs = new Array(K).fill(other);
    probs[label] = tp;
    lines.push(JSON.stringify({ probs, label }));
  }
  const fixture = path.join(os.tmpdir(), `_cf_strict_untrust_${process.pid}.jsonl`);
  fs.writeFileSync(fixture, lines.join("\n"));
  try {
    const cli = path.resolve(new URL("./nn-graph-conformal-audit.mjs", import.meta.url).pathname.replace(/^\//, ""));
    const r = spawnSync(process.execPath, [cli, "--predictions", fixture, "--cal-fraction", "0.2", "--strict", "--json"], {
      encoding: "utf8",
    });
    // With cal=8, n_test=32 (>= MIN), but qHat=1 (k=9>8) -> fullSetRate=1.0 -> trustworthy=false.
    // Under --strict the audit treats this as REFUSED (exit 2), NOT a silent green (exit 0).
    assert.equal(r.status, 2, `expected exit 2 (untrustworthy + strict), got ${r.status}; stdout=${r.stdout} stderr=${r.stderr}`);
  } finally {
    fs.rmSync(fixture, { force: true });
  }
});

// ---- P2 regression: a test label outside [0, numClasses) is refused, NOT silently miscounted
test("refuses an out-of-range test label (no silent miscount on mis-encoded class)", async () => {
  // n=80 -> nCal=40, nTest=40 (>= MIN_MEANINGFUL_N). 3 classes; valid labels are {0,1,2}.
  // Inject a label=9999 into the test split (index 50 falls in the test slice after split).
  const pairs = [];
  for (let i = 0; i < 80; i += 1) {
    const K = 3, tp = 0.85, other = (1 - tp) / (K - 1);
    const label = i % K;
    const probs = new Array(K).fill(other);
    probs[label] = tp;
    pairs.push({ probs, label });
  }
  pairs[50].label = 9999; // post-split this is test[10], out of range
  const r = await runConformalAudit(pairs, { ...ENGINES, alpha: 0.1, calFraction: 0.5 });
  assert.equal(r.ok, false);
  assert.match(r.error, /test label.*9999.*outside/i);
});
