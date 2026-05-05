/**
 * CAMConfidenceCalibrationEngine — CAM-EXHAUST-MS0/U-CAM119 tests
 *
 * Validates decision-confidence calibration over outcome history:
 *   - histogram / isotonic / Platt method correctness on synthetic data
 *   - graceful degradation when outcome count is below method thresholds
 *   - reliability metrics (Brier, ECE, MCE) and Wilson 95% intervals
 *   - calibrateDecision() AGIDecision integration
 *   - FIFO eviction at outcomeCap
 *   - input validation (rejects NaN, non-string ids, non-bool labels, bad caps)
 *   - edge cases: all-correct/all-wrong, single outcome, empty bin lookup
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CAMConfidenceCalibrationEngine,
  type CalibrationOutcome,
} from "../engines/CAMConfidenceCalibrationEngine.js";
import type {
  AGIDecision,
  AGIDecisionTask,
  SourceVote,
} from "../engines/CAMDeepLearningOrchestratorEngine.js";

// ── Constants ──────────────────────────────────────────────────────────────

const TASK: AGIDecisionTask = "strategy_recommend";
const TASK_ALT: AGIDecisionTask = "tool_select_advisor";
const ISOTONIC_THRESHOLD = 50;
const HISTOGRAM_THRESHOLD = 20;
const PLATT_THRESHOLD = 30;
const WILSON_95_TOLERANCE = 0.001;
const FIFO_TEST_CAP = 5;
const TOTAL_OUTCOMES_FIFO = 8;
const SEED_COUNT_FOR_HISTOGRAM = 100;
const PERFECT_CALIBRATION_TOLERANCE = 0.05;
const BRIER_TOLERANCE = 0.05;
const ECE_TOLERANCE = 0.05;
const HALF = 0.5;

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Seed N outcomes with a known calibration shape: predicted confidence p
 * matches actual accuracy p. With enough samples, the engine should converge
 * to identity calibration (raw → raw).
 */
const seedPerfectlyCalibrated = (n: number, task: AGIDecisionTask = TASK): void => {
  for (let i = 0; i < n; i++) {
    const conf = (i + 1) / (n + 1); // evenly spaced, avoids 0 and 1
    // Was-correct probability = conf. Use deterministic threshold so test is
    // reproducible: i is the random generator seed.
    const wasCorrect = pseudoRandom(i) < conf;
    CAMConfidenceCalibrationEngine.recordOutcome({
      decisionId: `dec-${i}`,
      task,
      predictedConfidence: conf,
      wasCorrect,
    });
  }
};

/**
 * Seed N over-confident outcomes: predicted confidence is uniform in [0,1]
 * but actual accuracy is half the predicted value. The engine should pull
 * calibrated values down.
 */
const seedOverConfident = (n: number, task: AGIDecisionTask = TASK): void => {
  for (let i = 0; i < n; i++) {
    const conf = (i + 1) / (n + 1);
    const wasCorrect = pseudoRandom(i + 1000) < conf * HALF;
    CAMConfidenceCalibrationEngine.recordOutcome({
      decisionId: `dec-over-${i}`,
      task,
      predictedConfidence: conf,
      wasCorrect,
    });
  }
};

/** Deterministic pseudo-random LCG for reproducible test outcomes. */
function pseudoRandom(seed: number): number {
  const A = 1103515245;
  const C = 12345;
  const M = 2 ** 31;
  return ((seed * A + C) % M) / M;
}

const makeAGIDecision = (
  conf: number,
  task: AGIDecisionTask = TASK
): AGIDecision<string> => ({
  task,
  value: "trochoidal",
  confidence: conf,
  escalateToHuman: false,
  rationale: "test decision",
  voices: [] as Array<SourceVote<string>>,
  totalLatencyMs: 0,
  agreeingSources: ["physics"],
  dissentingSources: [],
});

beforeEach(() => {
  CAMConfidenceCalibrationEngine.clearOutcomes();
  CAMConfidenceCalibrationEngine.setOutcomeCap(10000);
});

afterEach(() => {
  CAMConfidenceCalibrationEngine.clearOutcomes();
});

// ═══════════════════════════════════════════════════════════════════════════
// RECORD OUTCOME
// ═══════════════════════════════════════════════════════════════════════════

describe("CAMConfidenceCalibrationEngine.recordOutcome", () => {
  it("records and counts outcomes per task", () => {
    CAMConfidenceCalibrationEngine.recordOutcome({
      decisionId: "d1",
      task: TASK,
      predictedConfidence: 0.8,
      wasCorrect: true,
    });
    CAMConfidenceCalibrationEngine.recordOutcome({
      decisionId: "d2",
      task: TASK_ALT,
      predictedConfidence: 0.6,
      wasCorrect: false,
    });
    expect(CAMConfidenceCalibrationEngine.getOutcomeCount(TASK)).toBe(1);
    expect(CAMConfidenceCalibrationEngine.getOutcomeCount(TASK_ALT)).toBe(1);
    expect(CAMConfidenceCalibrationEngine.getOutcomeCount()).toBe(2);
  });

  it("clamps out-of-range confidence into [0, 1]", () => {
    CAMConfidenceCalibrationEngine.recordOutcome({
      decisionId: "high",
      task: TASK,
      predictedConfidence: 1.5,
      wasCorrect: true,
    });
    CAMConfidenceCalibrationEngine.recordOutcome({
      decisionId: "low",
      task: TASK,
      predictedConfidence: -0.3,
      wasCorrect: false,
    });
    seedPerfectlyCalibrated(HISTOGRAM_THRESHOLD); // hit threshold so calibrate works
    const m = CAMConfidenceCalibrationEngine.metrics({ task: TASK });
    // First bin (0..0.1) and last bin (0.9..1.0) should each have at least 1 outcome.
    expect(m.bins[0].count).toBeGreaterThanOrEqual(1);
    expect(m.bins[m.bins.length - 1].count).toBeGreaterThanOrEqual(1);
  });

  it("rejects bad inputs", () => {
    expect(() =>
      CAMConfidenceCalibrationEngine.recordOutcome({
        decisionId: "",
        task: TASK,
        predictedConfidence: 0.5,
        wasCorrect: true,
      })
    ).toThrow(/decisionId must be a non-empty string/);
    expect(() =>
      CAMConfidenceCalibrationEngine.recordOutcome({
        decisionId: "d",
        task: "" as AGIDecisionTask,
        predictedConfidence: 0.5,
        wasCorrect: true,
      })
    ).toThrow(/task must be a non-empty string/);
    expect(() =>
      CAMConfidenceCalibrationEngine.recordOutcome({
        decisionId: "d",
        task: TASK,
        predictedConfidence: NaN,
        wasCorrect: true,
      })
    ).toThrow(/predictedConfidence must be a finite number/);
    expect(() =>
      CAMConfidenceCalibrationEngine.recordOutcome({
        decisionId: "d",
        task: TASK,
        predictedConfidence: 0.5,
        wasCorrect: "yes" as unknown as boolean,
      })
    ).toThrow(/wasCorrect must be a boolean/);
  });

  it("FIFO-evicts old outcomes when cap is exceeded", () => {
    CAMConfidenceCalibrationEngine.setOutcomeCap(FIFO_TEST_CAP);
    for (let i = 0; i < TOTAL_OUTCOMES_FIFO; i++) {
      CAMConfidenceCalibrationEngine.recordOutcome({
        decisionId: `d${i}`,
        task: TASK,
        predictedConfidence: 0.5,
        wasCorrect: true,
      });
    }
    expect(CAMConfidenceCalibrationEngine.getOutcomeCount(TASK)).toBe(FIFO_TEST_CAP);
  });

  it("setOutcomeCap rejects non-positive values", () => {
    expect(() => CAMConfidenceCalibrationEngine.setOutcomeCap(0)).toThrow(/positive/);
    expect(() => CAMConfidenceCalibrationEngine.setOutcomeCap(-1)).toThrow(/positive/);
    expect(() => CAMConfidenceCalibrationEngine.setOutcomeCap(NaN)).toThrow(/positive/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CALIBRATE — fallback paths
// ═══════════════════════════════════════════════════════════════════════════

describe("CAMConfidenceCalibrationEngine.calibrate — fallback paths", () => {
  it("returns raw confidence with full uncertainty when no outcomes recorded", () => {
    const r = CAMConfidenceCalibrationEngine.calibrate(0.7, { task: TASK });
    expect(r.method).toBe("raw");
    expect(r.calibrated).toBe(false);
    expect(r.calibratedConfidence).toBe(0.7);
    expect(r.uncertaintyInterval).toEqual([0, 1]);
    expect(r.rationale).toContain("no outcomes");
  });

  it("falls back to raw when histogram requested but outcomes < threshold", () => {
    for (let i = 0; i < HISTOGRAM_THRESHOLD - 1; i++) {
      CAMConfidenceCalibrationEngine.recordOutcome({
        decisionId: `d${i}`,
        task: TASK,
        predictedConfidence: 0.5,
        wasCorrect: true,
      });
    }
    const r = CAMConfidenceCalibrationEngine.calibrate(0.5, {
      task: TASK,
      method: "histogram",
    });
    expect(r.method).toBe("raw");
    expect(r.calibrated).toBe(false);
    expect(r.rationale).toContain("insufficient outcomes");
  });

  it("rejects non-finite raw confidence", () => {
    expect(() => CAMConfidenceCalibrationEngine.calibrate(NaN)).toThrow(
      /must be a finite number/
    );
    expect(() => CAMConfidenceCalibrationEngine.calibrate(Infinity)).toThrow(
      /must be a finite number/
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CALIBRATE — histogram method
// ═══════════════════════════════════════════════════════════════════════════

describe("CAMConfidenceCalibrationEngine.calibrate — histogram", () => {
  it("returns the empirical accuracy of the matching bin", () => {
    // Seed bin [0.7, 0.8) with 3 correct out of 4 (accuracy = 0.75)
    const binSamples: Array<[number, boolean]> = [
      [0.71, true],
      [0.72, true],
      [0.78, true],
      [0.74, false],
    ];
    // Seed remaining bins with neutral data so threshold is hit
    for (let i = 0; i < HISTOGRAM_THRESHOLD; i++) {
      CAMConfidenceCalibrationEngine.recordOutcome({
        decisionId: `seed-${i}`,
        task: TASK,
        predictedConfidence: 0.1,
        wasCorrect: i % 2 === 0,
      });
    }
    binSamples.forEach(([c, ok], i) =>
      CAMConfidenceCalibrationEngine.recordOutcome({
        decisionId: `bin-${i}`,
        task: TASK,
        predictedConfidence: c,
        wasCorrect: ok,
      })
    );
    const r = CAMConfidenceCalibrationEngine.calibrate(0.75, {
      task: TASK,
      method: "histogram",
    });
    expect(r.method).toBe("histogram");
    expect(r.calibrated).toBe(true);
    expect(r.calibratedConfidence).toBeCloseTo(0.75, 2);
  });

  it("falls back when the bin is empty even if total ≥ threshold", () => {
    // Seed all outcomes into bin 0 so bin 7 stays empty
    for (let i = 0; i < HISTOGRAM_THRESHOLD; i++) {
      CAMConfidenceCalibrationEngine.recordOutcome({
        decisionId: `d${i}`,
        task: TASK,
        predictedConfidence: 0.05,
        wasCorrect: true,
      });
    }
    const r = CAMConfidenceCalibrationEngine.calibrate(0.75, {
      task: TASK,
      method: "histogram",
    });
    expect(r.calibrated).toBe(false);
    expect(r.method).toBe("histogram");
    expect(r.rationale).toContain("empty");
  });

  it("converges to identity on perfectly-calibrated synthetic data", () => {
    seedPerfectlyCalibrated(SEED_COUNT_FOR_HISTOGRAM);
    const r = CAMConfidenceCalibrationEngine.calibrate(0.5, {
      task: TASK,
      method: "histogram",
    });
    expect(r.calibrated).toBe(true);
    expect(r.calibratedConfidence).toBeCloseTo(0.5, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CALIBRATE — isotonic regression
// ═══════════════════════════════════════════════════════════════════════════

describe("CAMConfidenceCalibrationEngine.calibrate — isotonic", () => {
  it("produces a monotonic mapping on perfectly-calibrated data", () => {
    seedPerfectlyCalibrated(ISOTONIC_THRESHOLD * 2);
    const points = [0.1, 0.3, 0.5, 0.7, 0.9];
    const calibrated: number[] = [];
    for (const p of points) {
      const r = CAMConfidenceCalibrationEngine.calibrate(p, {
        task: TASK,
        method: "isotonic",
      });
      expect(r.method).toBe("isotonic");
      expect(r.calibrated).toBe(true);
      calibrated.push(r.calibratedConfidence);
    }
    for (let i = 1; i < calibrated.length; i++) {
      expect(calibrated[i]).toBeGreaterThanOrEqual(calibrated[i - 1]);
    }
  });

  it("pulls overconfident predictions down", () => {
    seedOverConfident(ISOTONIC_THRESHOLD * 4);
    const r = CAMConfidenceCalibrationEngine.calibrate(0.8, {
      task: TASK,
      method: "isotonic",
    });
    // Overconfident model: predicted 0.8 should map to ~0.4 (half).
    // Allow generous tolerance — the LCG is deterministic but coarse.
    expect(r.calibrated).toBe(true);
    expect(r.calibratedConfidence).toBeLessThan(0.8);
  });

  it("falls back to histogram when below isotonic threshold but above histogram", () => {
    seedPerfectlyCalibrated(HISTOGRAM_THRESHOLD + 1);
    const r = CAMConfidenceCalibrationEngine.calibrate(0.5, {
      task: TASK,
      method: "isotonic",
    });
    expect(r.method).toBe("histogram");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CALIBRATE — Platt scaling
// ═══════════════════════════════════════════════════════════════════════════

describe("CAMConfidenceCalibrationEngine.calibrate — platt", () => {
  it("fits a sigmoid mapping on overconfident data", () => {
    seedOverConfident(PLATT_THRESHOLD * 3);
    const r = CAMConfidenceCalibrationEngine.calibrate(0.9, {
      task: TASK,
      method: "platt",
    });
    expect(r.method).toBe("platt");
    expect(r.calibrated).toBe(true);
    expect(r.calibratedConfidence).toBeGreaterThanOrEqual(0);
    expect(r.calibratedConfidence).toBeLessThanOrEqual(1);
    expect(r.calibratedConfidence).toBeLessThan(0.9);
  });

  it("falls back to raw below platt threshold", () => {
    for (let i = 0; i < PLATT_THRESHOLD - 1; i++) {
      CAMConfidenceCalibrationEngine.recordOutcome({
        decisionId: `d${i}`,
        task: TASK,
        predictedConfidence: 0.5,
        wasCorrect: i % 2 === 0,
      });
    }
    const r = CAMConfidenceCalibrationEngine.calibrate(0.5, {
      task: TASK,
      method: "platt",
    });
    expect(r.method).toBe("raw");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// METRICS (Brier, ECE, MCE, bins)
// ═══════════════════════════════════════════════════════════════════════════

describe("CAMConfidenceCalibrationEngine.metrics", () => {
  it("returns zero metrics with empty bins when no outcomes", () => {
    const m = CAMConfidenceCalibrationEngine.metrics({ task: TASK });
    expect(m.outcomeCount).toBe(0);
    expect(m.brierScore).toBe(0);
    expect(m.ece).toBe(0);
    expect(m.mce).toBe(0);
    expect(m.bins).toEqual([]);
    expect(m.recommendedMethod).toBe("raw");
  });

  it("computes near-zero ECE on perfectly-calibrated data", () => {
    seedPerfectlyCalibrated(SEED_COUNT_FOR_HISTOGRAM * 5);
    const m = CAMConfidenceCalibrationEngine.metrics({ task: TASK });
    expect(m.outcomeCount).toBeGreaterThanOrEqual(SEED_COUNT_FOR_HISTOGRAM * 5);
    expect(m.ece).toBeLessThan(ECE_TOLERANCE);
    expect(m.recommendedMethod).toBe("isotonic");
  });

  it("computes large ECE on overconfident data", () => {
    seedOverConfident(SEED_COUNT_FOR_HISTOGRAM * 5);
    const m = CAMConfidenceCalibrationEngine.metrics({ task: TASK });
    expect(m.ece).toBeGreaterThan(ECE_TOLERANCE);
    expect(m.brierScore).toBeGreaterThan(0);
  });

  it("Brier score is bounded by 1 on labeled binary data", () => {
    seedPerfectlyCalibrated(SEED_COUNT_FOR_HISTOGRAM);
    const m = CAMConfidenceCalibrationEngine.metrics({ task: TASK });
    expect(m.brierScore).toBeGreaterThanOrEqual(0);
    expect(m.brierScore).toBeLessThanOrEqual(1);
    // For perfectly calibrated data, Brier should be small
    expect(m.brierScore).toBeLessThan(0.3);
  });

  it("populated bins carry Wilson 95% intervals matching their accuracy", () => {
    seedPerfectlyCalibrated(SEED_COUNT_FOR_HISTOGRAM * 2);
    const m = CAMConfidenceCalibrationEngine.metrics({ task: TASK });
    for (const b of m.bins) {
      if (b.count === 0) continue;
      expect(b.accuracyLower95).toBeLessThanOrEqual(b.accuracy + WILSON_95_TOLERANCE);
      expect(b.accuracyUpper95).toBeGreaterThanOrEqual(b.accuracy - WILSON_95_TOLERANCE);
      expect(b.accuracyLower95).toBeGreaterThanOrEqual(0);
      expect(b.accuracyUpper95).toBeLessThanOrEqual(1);
    }
  });

  it("recommendMethod scales with outcome count", () => {
    expect(CAMConfidenceCalibrationEngine.recommendMethod(TASK)).toBe("raw");
    seedPerfectlyCalibrated(PLATT_THRESHOLD);
    expect(CAMConfidenceCalibrationEngine.recommendMethod(TASK)).toBe("histogram");
    CAMConfidenceCalibrationEngine.clearOutcomes();
    seedPerfectlyCalibrated(ISOTONIC_THRESHOLD);
    expect(CAMConfidenceCalibrationEngine.recommendMethod(TASK)).toBe("isotonic");
  });

  it("aggregates across tasks when no task filter is given", () => {
    seedPerfectlyCalibrated(HISTOGRAM_THRESHOLD, TASK);
    seedPerfectlyCalibrated(HISTOGRAM_THRESHOLD, TASK_ALT);
    const m = CAMConfidenceCalibrationEngine.metrics();
    expect(m.task).toBe("all");
    expect(m.outcomeCount).toBe(HISTOGRAM_THRESHOLD * 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AGI DECISION INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

describe("CAMConfidenceCalibrationEngine.calibrateDecision", () => {
  it("calibrates an AGIDecision through the task-aware path", () => {
    // Use ample sample size so isotonic regression converges within tolerance.
    // Matches the dedicated convergence test (10× SEED_COUNT_FOR_HISTOGRAM).
    seedPerfectlyCalibrated(SEED_COUNT_FOR_HISTOGRAM * 10);
    const dec = makeAGIDecision(0.5, TASK);
    const r = CAMConfidenceCalibrationEngine.calibrateDecision(dec);
    expect(r.calibrated).toBe(true);
    expect(Math.abs(r.calibratedConfidence - 0.5)).toBeLessThan(
      PERFECT_CALIBRATION_TOLERANCE
    );
    expect(r.method).toBe("isotonic");
  });

  it("respects an explicit task override in opts", () => {
    seedPerfectlyCalibrated(ISOTONIC_THRESHOLD, TASK_ALT);
    const dec = makeAGIDecision(0.5, TASK);
    const r = CAMConfidenceCalibrationEngine.calibrateDecision(dec, {
      task: TASK_ALT,
    });
    expect(r.calibrated).toBe(true);
  });

  it("rejects null decision", () => {
    expect(() =>
      CAMConfidenceCalibrationEngine.calibrateDecision(
        null as unknown as AGIDecision<unknown>
      )
    ).toThrow(/non-null AGIDecision/);
  });

  it("returns raw fallback when the decision's task has no outcomes", () => {
    seedPerfectlyCalibrated(ISOTONIC_THRESHOLD, TASK_ALT);
    const dec = makeAGIDecision(0.7, TASK);
    const r = CAMConfidenceCalibrationEngine.calibrateDecision(dec);
    expect(r.method).toBe("raw");
    expect(r.calibratedConfidence).toBe(0.7);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════

describe("CAMConfidenceCalibrationEngine — edge cases", () => {
  it("handles all-correct outcomes: histogram returns 1.0 in populated bins", () => {
    for (let i = 0; i < HISTOGRAM_THRESHOLD; i++) {
      CAMConfidenceCalibrationEngine.recordOutcome({
        decisionId: `d${i}`,
        task: TASK,
        predictedConfidence: 0.5,
        wasCorrect: true,
      });
    }
    const r = CAMConfidenceCalibrationEngine.calibrate(0.5, {
      task: TASK,
      method: "histogram",
    });
    expect(r.calibratedConfidence).toBe(1);
    expect(r.calibrated).toBe(true);
  });

  it("handles all-wrong outcomes: histogram returns 0.0 in populated bins", () => {
    for (let i = 0; i < HISTOGRAM_THRESHOLD; i++) {
      CAMConfidenceCalibrationEngine.recordOutcome({
        decisionId: `d${i}`,
        task: TASK,
        predictedConfidence: 0.5,
        wasCorrect: false,
      });
    }
    const r = CAMConfidenceCalibrationEngine.calibrate(0.5, {
      task: TASK,
      method: "histogram",
    });
    expect(r.calibratedConfidence).toBe(0);
  });

  it("handles confidence = 1.0 (last bin inclusive)", () => {
    seedPerfectlyCalibrated(SEED_COUNT_FOR_HISTOGRAM);
    const r = CAMConfidenceCalibrationEngine.calibrate(1.0, {
      task: TASK,
      method: "histogram",
    });
    // Should not throw / return NaN; map to last bin
    expect(Number.isFinite(r.calibratedConfidence)).toBe(true);
    expect(r.calibratedConfidence).toBeGreaterThanOrEqual(0);
    expect(r.calibratedConfidence).toBeLessThanOrEqual(1);
  });

  it("handles confidence = 0.0", () => {
    seedPerfectlyCalibrated(SEED_COUNT_FOR_HISTOGRAM);
    const r = CAMConfidenceCalibrationEngine.calibrate(0, {
      task: TASK,
      method: "histogram",
    });
    expect(Number.isFinite(r.calibratedConfidence)).toBe(true);
  });

  it("clearOutcomes resets all task buckets and the global ledger", () => {
    seedPerfectlyCalibrated(HISTOGRAM_THRESHOLD, TASK);
    seedPerfectlyCalibrated(HISTOGRAM_THRESHOLD, TASK_ALT);
    expect(CAMConfidenceCalibrationEngine.getOutcomeCount()).toBe(
      HISTOGRAM_THRESHOLD * 2
    );
    CAMConfidenceCalibrationEngine.clearOutcomes();
    expect(CAMConfidenceCalibrationEngine.getOutcomeCount()).toBe(0);
    expect(CAMConfidenceCalibrationEngine.getOutcomeCount(TASK)).toBe(0);
    expect(CAMConfidenceCalibrationEngine.getOutcomeCount(TASK_ALT)).toBe(0);
  });

  it("recordOutcome returns the canonical CalibrationOutcome with timestamp", () => {
    const before = Date.now();
    const out: CalibrationOutcome = CAMConfidenceCalibrationEngine.recordOutcome({
      decisionId: "d1",
      task: TASK,
      predictedConfidence: 0.7,
      wasCorrect: true,
    });
    expect(out.decisionId).toBe("d1");
    expect(out.task).toBe(TASK);
    expect(out.predictedConfidence).toBe(0.7);
    expect(out.wasCorrect).toBe(true);
    expect(out.recordedAt).toBeGreaterThanOrEqual(before);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PERFECT CALIBRATION CONVERGENCE (statistical sanity)
// ═══════════════════════════════════════════════════════════════════════════

describe("CAMConfidenceCalibrationEngine — convergence", () => {
  it("calibrated value at p=0.5 lands within 5% on perfectly-calibrated data", () => {
    seedPerfectlyCalibrated(SEED_COUNT_FOR_HISTOGRAM * 10);
    const r = CAMConfidenceCalibrationEngine.calibrate(0.5, {
      task: TASK,
      method: "isotonic",
    });
    expect(Math.abs(r.calibratedConfidence - 0.5)).toBeLessThan(
      PERFECT_CALIBRATION_TOLERANCE
    );
  });

  it("Brier score on perfectly-calibrated data is dominated by aleatoric variance ~0.25", () => {
    seedPerfectlyCalibrated(SEED_COUNT_FOR_HISTOGRAM * 10);
    const m = CAMConfidenceCalibrationEngine.metrics({ task: TASK });
    // For perfectly-calibrated p ~ uniform[0,1], expected Brier ≈ 1/6 = 0.167.
    // Allow generous tolerance for sample size.
    expect(m.brierScore).toBeLessThan(0.3);
    expect(m.brierScore).toBeGreaterThan(BRIER_TOLERANCE);
  });
});
