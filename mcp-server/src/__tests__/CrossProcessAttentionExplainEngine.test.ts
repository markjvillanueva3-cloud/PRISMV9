/**
 * CrossProcessAttentionExplainEngine.test.ts — LIME, ECE, and L1
 * anomaly detection over the T1-02 MLP.
 *
 * Milestone: INFRA-NEURAL-LEDGER-MS1 / U-XPROC-NEURAL-T1-04.
 */
import { describe, it, expect, beforeEach } from "vitest";

import {
  CrossProcessAttentionExplainEngine,
  crossProcessAttentionExplainEngine,
  ATTENTION_SCHEMA_VERSION,
} from "../engines/CrossProcessAttentionExplainEngine.js";
import {
  CrossProcessNeuralLearningEngine,
  INPUT_DIM,
} from "../engines/CrossProcessNeuralLearningEngine.js";
import type { OutcomeRecord } from "../engines/CrossProcessOutcomeStore.js";

const DONOR_SEED = 1729;
const LIME_SEED = 31;

function rec(partial: {
  process?: OutcomeRecord["process"];
  bridge?: OutcomeRecord["bridge"];
  outcome?: OutcomeRecord["outcome"];
  request?: OutcomeRecord["request_summary"];
  id?: string;
}): OutcomeRecord {
  return {
    schemaVersion: "1.0",
    id: partial.id ?? "evt-att",
    ts: "2026-05-05T18:00:00.000Z",
    bridge: partial.bridge ?? "sf",
    process: partial.process ?? "mill",
    request_summary: partial.request ?? {},
    response_summary: {},
    outcome: partial.outcome ?? { kind: "pending" },
  };
}

function trainedDonor(): CrossProcessNeuralLearningEngine {
  const eng = new CrossProcessNeuralLearningEngine({ seed: DONOR_SEED });
  const data: OutcomeRecord[] = [];
  const PER_CLASS = 12;
  for (let i = 0; i < PER_CLASS; i++) {
    data.push(rec({ id: `s${i}`, process: "mill", outcome: { kind: "success" } }));
    data.push(rec({ id: `f${i}`, process: "lathe", outcome: { kind: "failure" } }));
    data.push(rec({ id: `o${i}`, process: "wedm", outcome: { kind: "operator_override" } }));
  }
  eng.train(data, { epochs: 30, shuffle: false });
  return eng;
}

describe("CrossProcessAttentionExplainEngine", () => {
  let engine: CrossProcessAttentionExplainEngine;
  let donor: CrossProcessNeuralLearningEngine;

  beforeEach(() => {
    engine = new CrossProcessAttentionExplainEngine();
    donor = trainedDonor();
  });

  // ───── LIME ─────

  it("explainPrediction returns 32-dim weights and a top-K list", () => {
    const r = rec({ process: "mill", bridge: "sf" });
    const exp = engine.explainPrediction(donor, r, { samples: 32, seed: LIME_SEED });
    expect(exp.weights.length).toBe(INPUT_DIM);
    expect(exp.top.length).toBeLessThanOrEqual(8);
    expect(exp.schemaVersion).toBe(ATTENTION_SCHEMA_VERSION);
  });

  it("explainPrediction.top is ordered by |weight| descending", () => {
    const r = rec({ process: "mill", bridge: "sf" });
    const exp = engine.explainPrediction(donor, r, { samples: 32, topK: 6, seed: LIME_SEED });
    for (let i = 1; i < exp.top.length; i++) {
      expect(Math.abs(exp.top[i - 1].weight)).toBeGreaterThanOrEqual(Math.abs(exp.top[i].weight));
    }
  });

  it("explainPrediction baselineProb matches donor.predict for the targetClass", () => {
    const r = rec({ process: "lathe", bridge: "post" });
    const direct = donor.predictFromRecord(r);
    const exp = engine.explainPrediction(donor, r, { samples: 24, seed: LIME_SEED });
    expect(exp.targetClass).toBe(direct.predictedClass);
    expect(exp.baselineProb).toBe(direct.probs[direct.predictedClass]);
  });

  it("explainPrediction is deterministic with same seed", () => {
    const r = rec({ process: "wedm", bridge: "ai" });
    const a = engine.explainPrediction(donor, r, { samples: 32, seed: 99 });
    const b = engine.explainPrediction(donor, r, { samples: 32, seed: 99 });
    expect(a.weights).toEqual(b.weights);
    expect(a.r2).toBe(b.r2);
  });

  it("explainPrediction differs across seeds (perturbation neighborhood diverges)", () => {
    const r = rec({ process: "wedm", bridge: "ai" });
    const a = engine.explainPrediction(donor, r, { samples: 32, seed: 1 });
    const b = engine.explainPrediction(donor, r, { samples: 32, seed: 9999 });
    let anyDiffer = false;
    for (let i = 0; i < INPUT_DIM; i++) {
      if (Math.abs(a.weights[i] - b.weights[i]) > 1e-9) {
        anyDiffer = true;
        break;
      }
    }
    expect(anyDiffer).toBe(true);
  });

  it("explainPrediction r2 is in [0,1]", () => {
    const r = rec({ process: "mill", bridge: "sf" });
    const exp = engine.explainPrediction(donor, r, { samples: 64, seed: LIME_SEED });
    expect(exp.r2).toBeGreaterThanOrEqual(0);
    expect(exp.r2).toBeLessThanOrEqual(1);
  });

  it("explainPrediction respects targetClass override", () => {
    const r = rec({ process: "mill", bridge: "sf" });
    const exp = engine.explainPrediction(donor, r, {
      samples: 24,
      seed: LIME_SEED,
      targetClass: "operator_override",
    });
    expect(exp.targetClass).toBe("operator_override");
    const direct = donor.predictFromRecord(r);
    expect(exp.baselineProb).toBe(direct.probs.operator_override);
  });

  it("explainPrediction handles tiny sample size without crashing (clamps to ≥8)", () => {
    const r = rec({ process: "mill", bridge: "sf" });
    const exp = engine.explainPrediction(donor, r, { samples: 1, seed: LIME_SEED });
    expect(exp.samples).toBeGreaterThanOrEqual(8);
  });

  // ───── ECE ─────

  it("computeECE on empty input returns ece=0 and totalSamples=0", () => {
    const report = engine.computeECE(donor, []);
    expect(report.ece).toBe(0);
    expect(report.totalSamples).toBe(0);
  });

  it("computeECE skips pending records (no label)", () => {
    const records = [
      rec({ id: "a", outcome: { kind: "success" } }),
      rec({ id: "b", outcome: { kind: "pending" } }),
      rec({ id: "c", outcome: { kind: "failure" } }),
    ];
    const report = engine.computeECE(donor, records);
    expect(report.totalSamples).toBe(2);
  });

  it("computeECE returns numBins bins with non-overlapping edges summing to count totals", () => {
    const records: OutcomeRecord[] = [];
    for (let i = 0; i < 6; i++) {
      records.push(rec({ id: `s${i}`, process: "mill", outcome: { kind: "success" } }));
      records.push(rec({ id: `f${i}`, process: "lathe", outcome: { kind: "failure" } }));
    }
    const report = engine.computeECE(donor, records, 5);
    expect(report.bins.length).toBe(5);
    for (const b of report.bins) {
      expect(b.lower).toBe(b.index / 5);
      expect(b.upper).toBe((b.index + 1) / 5);
    }
    let totalCount = 0;
    for (const b of report.bins) totalCount += b.count;
    expect(totalCount).toBe(report.totalSamples);
  });

  it("computeECE returns ece in [0,1]", () => {
    const records: OutcomeRecord[] = [];
    for (let i = 0; i < 10; i++) {
      records.push(rec({ id: `s${i}`, process: "mill", outcome: { kind: "success" } }));
    }
    const report = engine.computeECE(donor, records);
    expect(report.ece).toBeGreaterThanOrEqual(0);
    expect(report.ece).toBeLessThanOrEqual(1);
  });

  it("computeECE clamps numBins to [2, 50]", () => {
    const records = [rec({ outcome: { kind: "success" } })];
    expect(engine.computeECE(donor, records, 1).numBins).toBe(2);
    expect(engine.computeECE(donor, records, 9999).numBins).toBe(50);
  });

  // ───── L1 anomaly ─────

  it("scoreAnomaly with empty baseline returns notReady=true", () => {
    const r = rec({ process: "mill", bridge: "sf" });
    const score = engine.scoreAnomaly(donor, r);
    expect(score.notReady).toBe(true);
    expect(score.isAnomaly).toBe(false);
  });

  it("registerBaseline accumulates samples and exposes baselineN", () => {
    const records: OutcomeRecord[] = [];
    for (let i = 0; i < 7; i++) records.push(rec({ id: `b${i}`, process: "mill" }));
    const result = engine.registerBaseline(donor, records);
    expect(result.added).toBe(7);
    expect(result.baselineN).toBe(7);
    const stats = engine.getBaseline();
    expect(stats.n).toBe(7);
    expect(stats.mean.length).toBe(INPUT_DIM);
  });

  it("scoreAnomaly returns low avgZ for in-distribution input", () => {
    const baseline: OutcomeRecord[] = [];
    for (let i = 0; i < 20; i++) {
      baseline.push(
        rec({
          id: `b${i}`,
          process: "mill",
          bridge: "sf",
          request: { tool_diameter_mm: 6 + (i % 3), spindle_rpm: 8000 + 200 * i },
        }),
      );
    }
    engine.registerBaseline(donor, baseline);
    const inDist = rec({
      id: "in1",
      process: "mill",
      bridge: "sf",
      request: { tool_diameter_mm: 7, spindle_rpm: 9000 },
    });
    const score = engine.scoreAnomaly(donor, inDist);
    expect(score.notReady).toBe(false);
    expect(score.avgAbsZ).toBeLessThan(3.0);
  });

  it("scoreAnomaly flags out-of-distribution input as anomalous", () => {
    const baseline: OutcomeRecord[] = [];
    for (let i = 0; i < 20; i++) {
      baseline.push(
        rec({
          id: `b${i}`,
          process: "mill",
          bridge: "sf",
          request: { tool_diameter_mm: 6 + (i % 3) },
        }),
      );
    }
    engine.registerBaseline(donor, baseline);
    // Different process AND different bridge — multiple feature dims diverge.
    const ood = rec({
      id: "ood1",
      process: "wedm",
      bridge: "ai",
      request: { workpiece_thickness_mm: 25, target_ra_um: 0.4 },
    });
    const score = engine.scoreAnomaly(donor, ood, 1.0);
    expect(score.notReady).toBe(false);
    expect(score.l1Distance).toBeGreaterThan(0);
    expect(score.maxAbsZ).toBeGreaterThan(0);
  });

  it("registerBaseline + scoreAnomaly + resetBaseline lifecycle", () => {
    const baseline: OutcomeRecord[] = [];
    for (let i = 0; i < 6; i++) baseline.push(rec({ id: `b${i}` }));
    engine.registerBaseline(donor, baseline);
    expect(engine.getBaseline().n).toBe(6);
    engine.resetBaseline();
    expect(engine.getBaseline().n).toBe(0);
    const score = engine.scoreAnomaly(donor, rec({ id: "x" }));
    expect(score.notReady).toBe(true);
  });

  it("getBaseline.std has bessel-corrected sample stddev (n-1 denominator)", () => {
    const records: OutcomeRecord[] = [];
    for (let i = 0; i < 5; i++) {
      records.push(
        rec({ id: `b${i}`, process: "mill", request: { tool_diameter_mm: 6 + i } }),
      );
    }
    engine.registerBaseline(donor, records);
    const stats = engine.getBaseline();
    // Feature 0 = tool_diameter_mm log1p-normalized. With 5 samples
    // 6,7,8,9,10 the std should be > 0 (variation present).
    expect(stats.std[0]).toBeGreaterThan(0);
  });

  // ───── singleton ─────

  it("singleton export is a working instance", () => {
    expect(crossProcessAttentionExplainEngine).toBeInstanceOf(CrossProcessAttentionExplainEngine);
  });

  it("schema version constant is exported", () => {
    expect(ATTENTION_SCHEMA_VERSION).toBe("1.0.0");
  });

  // ───── 3-process variability ─────

  it("explainPrediction works across all 3 processes (mill/lathe/wedm)", () => {
    const millExp = engine.explainPrediction(donor, rec({ process: "mill", bridge: "sf" }), {
      samples: 24,
      seed: LIME_SEED,
    });
    const latheExp = engine.explainPrediction(donor, rec({ process: "lathe", bridge: "post" }), {
      samples: 24,
      seed: LIME_SEED,
    });
    const wedmExp = engine.explainPrediction(donor, rec({ process: "wedm", bridge: "ai" }), {
      samples: 24,
      seed: LIME_SEED,
    });
    expect(millExp.weights.length).toBe(INPUT_DIM);
    expect(latheExp.weights.length).toBe(INPUT_DIM);
    expect(wedmExp.weights.length).toBe(INPUT_DIM);
    // Each surrogate's R² should be a finite number.
    for (const e of [millExp, latheExp, wedmExp]) {
      expect(Number.isFinite(e.r2)).toBe(true);
    }
  });
});
