/**
 * Tests for cad-generation-quality-report.mjs (slot:delta, U-CAD-GEN-QUALITY-REPORT). Hermetic.
 * Intent asserts (R9 + R12): accuracy rates are over the MEASURED subset only -- a gen whose kernelAccuracy
 * was never computed (null/absent) must NOT be counted as accurate OR as a failure, or the report would
 * silently inflate/deflate convergence. Outliers must be enumerated (fail-loud), not just counted.
 *   run: node --test scripts/cad-generation-quality-report.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { summarizeGenerations, scanGenerations } from "./cad-generation-quality-report.mjs";

test("summarizeGenerations: rates + archetype dist + enumerated outliers", () => {
  const rows = [
    { slug: "a", executed: true, hasStep: true, predictedClass: "prismatic", isOutlier: false, nearestSim: 0.99, kernelAccurate: true, selfCheckAccurate: true },
    { slug: "b", executed: true, hasStep: true, predictedClass: "freeform", isOutlier: true, nearestSim: 0.7, kernelAccurate: false, selfCheckAccurate: undefined },
    { slug: "c", executed: false, hasStep: false },
  ];
  const s = summarizeGenerations(rows);
  assert.equal(s.total, 3);
  assert.equal(s.executed, 2);
  assert.equal(s.executedRate, 0.667);
  assert.equal(s.precedentEvaluated, 2);
  assert.deepEqual(s.byPredictedClass, { prismatic: 1, freeform: 1 });
  assert.equal(s.outlierCount, 1);
  assert.equal(s.outlierRate, 0.5);
  assert.equal(s.kernelMeasured, 2);
  assert.equal(s.kernelAccurateRate, 0.5, "a=true,b=false -> 0.5");
  assert.equal(s.selfCheckMeasured, 1, "only a measured (b undefined, c absent)");
  assert.equal(s.selfCheckAccurateRate, 1);
  assert.equal(s.anomalies.length, 1);
  assert.equal(s.anomalies[0].slug, "b", "outlier enumerated, not just counted");
});

test("summarizeGenerations: dim self-check split by bbox reliability (exact prismatic vs advisory curved)", () => {
  const rows = [
    { slug: "cube1", executed: true, hasStep: true, selfCheckAccurate: true, selfCheckReliable: true },   // exact, accurate
    { slug: "cube2", executed: true, hasStep: true, selfCheckAccurate: false, selfCheckReliable: true },  // exact, inaccurate (real defect)
    { slug: "cyl1", executed: true, hasStep: true, selfCheckAccurate: false, selfCheckReliable: false },  // advisory (measurement-limited)
    { slug: "cyl2", executed: true, hasStep: true, selfCheckAccurate: true, selfCheckReliable: false },   // advisory
  ];
  const s = summarizeGenerations(rows);
  assert.equal(s.selfCheckAccurateRate, 0.5, "aggregate 2/4");
  assert.equal(s.selfCheckExactMeasured, 2);
  assert.equal(s.selfCheckExactAccurateRate, 0.5, "prismatic exact: 1/2 real dim-accuracy");
  assert.equal(s.selfCheckAdvisoryMeasured, 2);
  assert.equal(s.selfCheckAdvisoryAccurateRate, 0.5, "curved advisory reported separately, not folded into the real signal");
});

test("curved diameter accuracy: summarize rate + scanGenerations wires curvedDimFn", () => {
  const s = summarizeGenerations([
    { slug: "c1", executed: true, hasStep: true, curvedDimAccurate: true },
    { slug: "c2", executed: true, hasStep: true, curvedDimAccurate: false },
    { slug: "c3", executed: true, hasStep: true }, // not measured
  ]);
  assert.equal(s.curvedDimMeasured, 2);
  assert.equal(s.curvedDimAccurateRate, 0.5);
  const dirent = (n) => ({ name: n, isDirectory: () => true });
  const files = { "/g/x/status.json": JSON.stringify({ executed: true }), "/g/x/request.json": JSON.stringify({ request: "a 15.88 mm diameter cylinder" }), "/g/x/model.step": "STEP" };
  const norm = (p) => String(p).replace(/\\/g, "/");
  let sawReq = null;
  const rows = scanGenerations("/g", {
    readdirImpl: () => [dirent("x")], existsImpl: (p) => norm(p) in files,
    readFileImpl: (p) => { const k = norm(p); if (k in files) return files[k]; throw new Error("ENOENT"); },
    curvedDimFn: (req, text) => { sawReq = req; return { applicable: true, accurate: true, deltaPct: 0 }; },
  });
  assert.equal(sawReq, "a 15.88 mm diameter cylinder", "curvedDimFn fed the request string");
  assert.equal(rows[0].curvedDimAccurate, true);
});

test("summarizeGenerations R12: null/absent measurement is NOT counted (no silent inflate/deflate)", () => {
  const rows = [
    { slug: "x", executed: true, hasStep: true, kernelAccurate: null },
    { slug: "y", executed: true, hasStep: true, kernelAccurate: true },
  ];
  const s = summarizeGenerations(rows);
  assert.equal(s.kernelMeasured, 1, "null kernelAccurate is NOT a measurement");
  assert.equal(s.kernelAccurateRate, 1, "rate over the 1 measured, not 2");
});

test("summarizeGenerations: empty -> zeros + null rates, no throw", () => {
  const e = summarizeGenerations([]);
  assert.equal(e.total, 0);
  assert.equal(e.executedRate, 0);
  assert.equal(e.outlierRate, null);
  assert.equal(e.kernelAccurateRate, null);
  assert.deepEqual(e.byPredictedClass, {});
});

test("scanGenerations: hermetic -- reads status.json + computes precedent via injected fn", () => {
  const dirent = (name) => ({ name, isDirectory: () => true });
  const files = {
    "/gen/g1/status.json": JSON.stringify({ executed: true, kernelAccuracy: { accurate: true }, selfCheck: { accurate: true } }),
    "/gen/g1/model.step": "STEP-TEXT-1",
    "/gen/g2/status.json": JSON.stringify({ executed: false }),
  };
  const norm = (p) => String(p).replace(/\\/g, "/");
  const rows = scanGenerations("/gen", {
    readdirImpl: () => [dirent("g1"), dirent("g2")],
    existsImpl: (p) => norm(p) in files,
    readFileImpl: (p) => { const k = norm(p); if (k in files) return files[k]; throw new Error("ENOENT"); },
    precedentFn: (text) => ({ applicable: true, predictedClass: "prismatic", isOutlier: false, nearestSim: 0.95 }),
    indexRows: [{ geometryClass: "prismatic", vector: [1, 0] }],
  });
  assert.equal(rows.length, 2);
  const g1 = rows.find((r) => r.slug === "g1");
  assert.equal(g1.executed, true);
  assert.equal(g1.hasStep, true);
  assert.equal(g1.kernelAccurate, true);
  assert.equal(g1.predictedClass, "prismatic", "precedent computed for a gen with a step");
  const g2 = rows.find((r) => r.slug === "g2");
  assert.equal(g2.executed, false);
  assert.equal(g2.hasStep, false);
  assert.equal(g2.predictedClass, undefined, "no step -> no precedent");
});

test("scanGenerations: FRESH selfCheck (request.json + model.step) fills gens whose status.json lacks it", () => {
  const dirent = (name) => ({ name, isDirectory: () => true });
  const files = {
    "/gen/g1/status.json": JSON.stringify({ executed: true }), // NO selfCheck field
    "/gen/g1/request.json": JSON.stringify({ request: "a 10mm cube" }),
    "/gen/g1/model.step": "STEP-TEXT",
  };
  const norm = (p) => String(p).replace(/\\/g, "/");
  let sawReq = null;
  const rows = scanGenerations("/gen", {
    readdirImpl: () => [dirent("g1")],
    existsImpl: (p) => norm(p) in files,
    readFileImpl: (p) => { const k = norm(p); if (k in files) return files[k]; throw new Error("ENOENT"); },
    selfCheckFn: (req, text) => { sawReq = req; return { accurate: true }; },
  });
  assert.equal(sawReq, "a 10mm cube", "selfCheckFn is fed the request string from request.json");
  assert.equal(rows[0].selfCheckAccurate, true, "fresh selfCheck fills the absent status.json value (comprehensive)");
});
