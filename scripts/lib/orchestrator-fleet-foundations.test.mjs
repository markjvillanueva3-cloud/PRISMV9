// scripts/lib/orchestrator-fleet-foundations.test.mjs
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DRIFT_WARN_PCT, DRIFT_ROLLBACK_PCT, EXPLAIN_LOW_N_THRESHOLD, EXPLAIN_DRIFT_WARN_THRESHOLD,
  createModelLock, evaluateDrift, buildExplainTrace, createWinLoseLoop, applyWrightCurveToBatch,
} from "./orchestrator-fleet-foundations.mjs";

// ---------------------------------------------------------------------------
// 1. createModelLock — multi-agent safety
// ---------------------------------------------------------------------------

describe("createModelLock (U-MMO-MULTI-AGENT-MODEL-LOCK)", () => {
  it("rejects missing lockAcquire", () => {
    assert.throws(() => createModelLock({}), /lockAcquire fn required/);
  });

  it("acquires + releases lock around writeFn", async () => {
    const log = [];
    const lock = createModelLock({
      lockAcquire: async (k) => { log.push(`acq:${k}`); return async () => log.push(`rel:${k}`); },
    });
    const r = await lock("model::SSF", async () => { log.push("write"); return 42; });
    assert.equal(r, 42);
    assert.deepEqual(log, ["acq:model::SSF", "write", "rel:model::SSF"]);
  });

  it("releases lock even if writeFn throws", async () => {
    let released = false;
    const lock = createModelLock({
      lockAcquire: async () => async () => { released = true; },
    });
    await assert.rejects(
      lock("k", async () => { throw new Error("write crash"); }),
      /write crash/
    );
    assert.equal(released, true);
  });

  it("R12: rejects missing key", async () => {
    const lock = createModelLock({ lockAcquire: async () => async () => {} });
    await assert.rejects(lock(null, async () => {}), /key \(string\) required/);
  });

  it("R12: rejects missing writeFn", async () => {
    const lock = createModelLock({ lockAcquire: async () => async () => {} });
    await assert.rejects(lock("k", null), /writeFn required/);
  });
});

// ---------------------------------------------------------------------------
// 2. evaluateDrift — nightly regression gate
// ---------------------------------------------------------------------------

describe("evaluateDrift (U-MMO-DRIFT-REGRESSION-NIGHTLY)", () => {
  it("'stable' verdict when within ±5%", () => {
    const r = evaluateDrift({ baselineMAE: 0.10, currentMAE: 0.102 });
    assert.equal(r.verdict, "stable");
    assert.equal(r.severity, "ok");
  });

  it("'warn' verdict when MAE rises 5-15%", () => {
    const r = evaluateDrift({ baselineMAE: 0.10, currentMAE: 0.108 });
    assert.equal(r.verdict, "warn");
    assert.equal(r.severity, "elevated");
  });

  it("'rollback' verdict when MAE rises ≥15%", () => {
    const r = evaluateDrift({ baselineMAE: 0.10, currentMAE: 0.13 });
    assert.equal(r.verdict, "rollback");
    assert.equal(r.severity, "critical");
    assert.match(r.action, /AUTO-ROLLBACK/);
  });

  it("'improved' verdict when MAE drops ≥5%", () => {
    const r = evaluateDrift({ baselineMAE: 0.10, currentMAE: 0.094 });
    assert.equal(r.verdict, "improved");
  });

  it("R12: rejects non-positive baseline", () => {
    assert.throws(() => evaluateDrift({ baselineMAE: 0, currentMAE: 0.1 }), /baselineMAE/);
    assert.throws(() => evaluateDrift({ baselineMAE: NaN, currentMAE: 0.1 }), /baselineMAE/);
  });

  it("R12: rejects negative currentMAE", () => {
    assert.throws(() => evaluateDrift({ baselineMAE: 0.1, currentMAE: -0.1 }), /currentMAE/);
  });

  it("thresholds are exported tunable constants", () => {
    assert.equal(DRIFT_WARN_PCT, 0.05);
    assert.equal(DRIFT_ROLLBACK_PCT, 0.15);
  });
});

// ---------------------------------------------------------------------------
// 3. buildExplainTrace — stakeholder UX
// ---------------------------------------------------------------------------

describe("buildExplainTrace (U-MMO-CONFIDENCE-EXPLAIN-TRACE)", () => {
  it("high N + low drift → confident, no uncertainty surfaced", () => {
    const r = buildExplainTrace({
      recommendation: { rpm: 2400 },
      prior: { n: 50, distribution: { mean: 2400, std: 200 } },
      evidence: ["Kienzle 4140"], confidence: 0.92,
      driftStatus: { value: 0.05, level: "ok" },
    });
    assert.equal(r.surface_uncertainty, false);
    assert.match(r.confidence_display, /92%$/);
    assert.ok(r.confidence_interval[1] - r.confidence_interval[0] <= 0.11);
  });

  it("low N → surface_uncertainty + wider CI + descriptive label", () => {
    const r = buildExplainTrace({
      recommendation: "X", prior: { n: 5 }, evidence: [], confidence: 0.80,
    });
    assert.equal(r.surface_uncertainty, true);
    assert.match(r.confidence_display, /low confidence/);
    assert.ok(r.confidence_interval[1] - r.confidence_interval[0] >= 0.30);
  });

  it("high drift → surface_uncertainty regardless of N", () => {
    const r = buildExplainTrace({
      recommendation: "X", prior: { n: 100 }, evidence: [], confidence: 0.85,
      driftStatus: { value: 0.20, level: "elevated" },
    });
    assert.equal(r.surface_uncertainty, true);
  });

  it("R12: rejects bad confidence", () => {
    assert.throws(() => buildExplainTrace({
      recommendation: "X", prior: { n: 50 }, evidence: [], confidence: 1.5,
    }), /confidence must be in/);
  });

  it("R12: rejects missing prior.n", () => {
    assert.throws(() => buildExplainTrace({
      recommendation: "X", prior: {}, evidence: [], confidence: 0.9,
    }), /prior\.n required/);
  });

  it("thresholds exported", () => {
    assert.equal(EXPLAIN_LOW_N_THRESHOLD, 20);
    assert.equal(EXPLAIN_DRIFT_WARN_THRESHOLD, 0.15);
  });
});

// ---------------------------------------------------------------------------
// 4. createWinLoseLoop — quote outcome trainer
// ---------------------------------------------------------------------------

describe("createWinLoseLoop (U-MMO-WIN-LOSE-LOOP)", () => {
  it("ingests won quote with high margin → nudges price UP", () => {
    const updates = [];
    const loop = createWinLoseLoop({ onPriceUpdate: (d, r) => updates.push({ d, r }) });
    const r = loop.ingest({ quoteId: "Q1", quotedDollars: 1000, outcome: "won", actualMargin: 0.30 });
    assert.equal(r.deltaPct, 0.02);
    assert.match(r.reason, /room to raise/);
    assert.equal(updates.length, 1);
    assert.ok(updates[0].d > 0);
  });

  it("ingests lost quote → nudges price DOWN", () => {
    const loop = createWinLoseLoop({});
    const r = loop.ingest({ quoteId: "Q2", quotedDollars: 1500, outcome: "lost", actualMargin: 0 });
    assert.equal(r.deltaPct, -0.02);
    assert.match(r.reason, /above market/);
  });

  it("ingests abandoned quote → no price update", () => {
    const loop = createWinLoseLoop({});
    const r = loop.ingest({ quoteId: "Q3", quotedDollars: 1000, outcome: "abandoned" });
    assert.equal(r.deltaPct, 0);
  });

  it("won quote with thin margin → no price nudge", () => {
    const loop = createWinLoseLoop({});
    const r = loop.ingest({ quoteId: "Q4", quotedDollars: 1000, outcome: "won", actualMargin: 0.05 });
    assert.equal(r.deltaPct, 0);
  });

  it("snapshot aggregates win rate", () => {
    const loop = createWinLoseLoop({});
    loop.ingest({ quoteId: "A", quotedDollars: 100, outcome: "won", actualMargin: 0.2 });
    loop.ingest({ quoteId: "B", quotedDollars: 100, outcome: "won", actualMargin: 0.2 });
    loop.ingest({ quoteId: "C", quotedDollars: 100, outcome: "lost" });
    const s = loop.snapshot();
    assert.equal(s.won, 2);
    assert.equal(s.lost, 1);
    assert.ok(Math.abs(s.winRate - 2 / 3) < 1e-9);
  });

  it("R12: rejects invalid outcome", () => {
    const loop = createWinLoseLoop({});
    assert.throws(() => loop.ingest({ quoteId: "X", quotedDollars: 100, outcome: "maybe" }), /outcome must be/);
  });

  it("R12: rejects non-positive quotedDollars", () => {
    const loop = createWinLoseLoop({});
    assert.throws(() => loop.ingest({ quoteId: "X", quotedDollars: -1, outcome: "won" }), /quotedDollars/);
  });

  it("winRate is null on empty history", () => {
    const loop = createWinLoseLoop({});
    assert.equal(loop.winRate(), null);
  });

  it("price-update callback failure does not break ingest", () => {
    const loop = createWinLoseLoop({ onPriceUpdate: () => { throw new Error("sink"); } });
    const r = loop.ingest({ quoteId: "X", quotedDollars: 100, outcome: "lost" });
    assert.equal(r.recorded, true);
  });
});

// ---------------------------------------------------------------------------
// 5. applyWrightCurveToBatch — quote-engine integration
// ---------------------------------------------------------------------------

describe("applyWrightCurveToBatch (U-MMO-WRIGHT-CURVE-WRAPPER)", () => {
  it("batch=1 → totalCost = costN1, perUnit = costN1, no savings", () => {
    const r = applyWrightCurveToBatch({ costN1: 100, batchSize: 1 });
    assert.equal(r.total_cost, 100);
    assert.equal(r.per_unit_cost, 100);
    assert.equal(r.savings_vs_naive, 0);
  });

  it("batch=10 with 80% Wright → per-unit cost < N1", () => {
    const r = applyWrightCurveToBatch({ costN1: 100, batchSize: 10 });
    assert.ok(r.per_unit_cost < 100);
    assert.ok(r.savings_vs_naive > 0);
  });

  it("savings grow with batch size", () => {
    const r10 = applyWrightCurveToBatch({ costN1: 100, batchSize: 10 });
    const r100 = applyWrightCurveToBatch({ costN1: 100, batchSize: 100 });
    assert.ok(r100.savings_vs_naive > r10.savings_vs_naive);
    assert.ok(r100.per_unit_cost < r10.per_unit_cost);
  });

  it("higher learning factor (more learning) → bigger savings", () => {
    const moreLearning = applyWrightCurveToBatch({ costN1: 100, batchSize: 50, learningFactor: 0.70 });
    const lessLearning = applyWrightCurveToBatch({ costN1: 100, batchSize: 50, learningFactor: 0.90 });
    assert.ok(moreLearning.savings_vs_naive > lessLearning.savings_vs_naive);
  });

  it("R12: rejects negative costN1", () => {
    assert.throws(() => applyWrightCurveToBatch({ costN1: -1, batchSize: 5 }), /costN1/);
  });

  it("R12: rejects non-integer batchSize", () => {
    assert.throws(() => applyWrightCurveToBatch({ costN1: 100, batchSize: 1.5 }), /batchSize/);
    assert.throws(() => applyWrightCurveToBatch({ costN1: 100, batchSize: 0 }), /batchSize/);
  });

  it("R12: rejects out-of-range learning factor", () => {
    assert.throws(() => applyWrightCurveToBatch({ costN1: 100, batchSize: 5, learningFactor: 1.5 }), /learningFactor/);
    assert.throws(() => applyWrightCurveToBatch({ costN1: 100, batchSize: 5, learningFactor: 0 }), /learningFactor/);
  });
});
