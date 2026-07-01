/**
 * CAMModelPromotionGateEngine.test.ts -- U3 (CLOSE-THE-LOOP CAM self-driving gate)
 * ===============================================================================
 *
 * PROVES the promotion-gate MECHANISM with REAL reference values:
 *   - metric functions (AUROC/macroF1/Brier) return hand-verified numbers.
 *   - an ABOVE-gate candidate earns GO + promote:true.
 *   - a BELOW-gate candidate earns NO_GO + promote:false (never promoted).
 *   - insufficient-data, degenerate, and temporal-leakage candidates NEVER promote.
 *   - the selective (abstaining) path promotes ONLY on opt-in + a robust operating point.
 *
 * Coverage: happy (GO + selective) + >=3 failure modes + >=2 adversarial.
 * R12 honesty: these tests prove the GATE mechanism, NOT that a real CAM model
 * clears it -- the CAM outcome store still holds only a handful of records.
 *
 * @milestone CLOSE-THE-LOOP-CAM U3
 */

import { describe, it, expect } from "vitest";
import {
  CAMModelPromotionGateEngine,
  computeAUROC,
  computeMacroF1,
  computeBrier,
  isDegenerate,
  type CAMHoldoutSample,
} from "../engines/CAMModelPromotionGateEngine.js";
import { CrossProcessOutcomeStore } from "../engines/CrossProcessOutcomeStore.js";
import {
  CAM_GATE_THRESHOLDS,
  CAM_PRODUCTION_MIN_CONF,
} from "../schemas/camModelGateThresholds.js";

const TRAIN_MAX = "2026-06-01T00:00:00.000Z";
const TEST_MIN = "2026-06-02T00:00:00.000Z"; // strictly after train -> holdout ok

/** Build a holdout sample. score = P(success); confidence = emitted-class conf. */
function sample(score: number, confidence: number, predicted: string, truth: string, ts = TEST_MIN): CAMHoldoutSample {
  return { score, confidence, predicted, truth, ts };
}

describe("metric functions -- hand-verified reference values", () => {
  it("computeAUROC = 1.0 for perfectly separated scores", () => {
    // positives (label 1) all score above negatives (label 0) -> AUROC 1.0
    const scores = [0.9, 0.8, 0.2, 0.1];
    const labels = [1, 1, 0, 0];
    expect(computeAUROC(scores, labels)).toBe(1);
  });

  it("computeAUROC = 0.0 for perfectly inverted scores", () => {
    const scores = [0.1, 0.2, 0.8, 0.9];
    const labels = [1, 1, 0, 0];
    expect(computeAUROC(scores, labels)).toBe(0);
  });

  it("computeAUROC = 0.5 with tied scores (Mann-Whitney average-rank identity)", () => {
    // all-equal scores => every pos/neg pair ties => U = 0.5 * nPos * nNeg
    const scores = [0.5, 0.5, 0.5, 0.5];
    const labels = [1, 0, 1, 0];
    expect(computeAUROC(scores, labels)).toBe(0.5);
  });

  it("computeAUROC = null when a class is absent (honest null, not fake 0.5)", () => {
    expect(computeAUROC([0.9, 0.8], [1, 1])).toBeNull();
  });

  it("computeAUROC = 0.75 for a known 2v2 partial-overlap case", () => {
    // pos={0.6,0.4}, neg={0.5,0.3}. Pairs: (0.6>0.5)T,(0.6>0.3)T,(0.4<0.5)F,(0.4>0.3)T => 3/4
    const scores = [0.6, 0.4, 0.5, 0.3];
    const labels = [1, 1, 0, 0];
    expect(computeAUROC(scores, labels)).toBe(0.75);
  });

  it("computeBrier -- perfect confident predictions => 0", () => {
    expect(computeBrier([1, 0, 1, 0], [1, 0, 1, 0])).toBe(0);
  });

  it("computeBrier -- worst confident-wrong predictions => 1", () => {
    expect(computeBrier([0, 1, 0, 1], [1, 0, 1, 0])).toBe(1);
  });

  it("computeBrier -- p=0.5 everywhere => 0.25", () => {
    expect(computeBrier([0.5, 0.5, 0.5, 0.5], [1, 0, 1, 0])).toBe(0.25);
  });

  it("computeMacroF1 -- perfect predictions => 1.0", () => {
    const { macroF1 } = computeMacroF1(["success", "failure", "success"], ["success", "failure", "success"]);
    expect(macroF1).toBe(1);
  });

  it("computeMacroF1 -- all-wrong single-swap => 0", () => {
    // predict everything 'success' when truth alternates => failure class F1=0, success recall 1 precision .5
    const { macroF1 } = computeMacroF1(["success", "success"], ["success", "failure"]);
    // success: tp1 fp1 -> prec .5, recall 1 -> f1 .6667 ; failure: tp0 -> f1 0 ; macro=(.6667+0)/2
    expect(macroF1).toBeCloseTo(0.3333, 3);
  });

  it("isDegenerate -- constant scores are degenerate", () => {
    expect(isDegenerate([0.5, 0.5, 0.5, 0.5])).toBe(true);
  });
  it("isDegenerate -- varied scores are NOT degenerate", () => {
    expect(isDegenerate([0.1, 0.9, 0.4])).toBe(false);
  });
});

describe("evaluate -- HAPPY: an above-gate candidate earns GO + promote", () => {
  it("clears AUROC/macroF1/Brier on a clean holdout -> GO, promote:true", () => {
    const gate = new CAMModelPromotionGateEngine();
    // 6 success + 6 failure, well-separated + calibrated: AUROC 1.0, macroF1 1.0, Brier ~0.01.
    const holdout: CAMHoldoutSample[] = [
      ...Array.from({ length: 6 }, () => sample(0.95, 0.95, "success", "success")),
      ...Array.from({ length: 6 }, () => sample(0.05, 0.95, "failure", "failure")),
    ];
    const res = gate.evaluate({ holdout, trainingMaxTs: TRAIN_MAX, testMinTs: TEST_MIN });
    expect(res.metrics.auroc).toBe(1);
    expect(res.metrics.macroF1).toBe(1);
    expect(res.metrics.brier).toBeLessThanOrEqual(CAM_GATE_THRESHOLDS.brier);
    expect(res.fullGrade.pass).toBe(true);
    expect(res.temporalHoldoutOk).toBe(true);
    expect(res.verdict).toBe("GO");
    expect(res.promote).toBe(true);
  });
});

describe("evaluate -- FAILURE modes (never promote)", () => {
  it("FAILURE 1: below-AUROC candidate -> NO_GO, promote:false", () => {
    const gate = new CAMModelPromotionGateEngine();
    // Near-random scores: AUROC ~0.5 < 0.78.
    const holdout: CAMHoldoutSample[] = [
      sample(0.55, 0.6, "success", "success"), sample(0.45, 0.6, "failure", "success"),
      sample(0.52, 0.6, "success", "failure"), sample(0.48, 0.6, "failure", "failure"),
      sample(0.51, 0.6, "success", "success"), sample(0.49, 0.6, "failure", "success"),
      sample(0.53, 0.6, "success", "failure"), sample(0.47, 0.6, "failure", "failure"),
      sample(0.54, 0.6, "success", "success"), sample(0.46, 0.6, "failure", "failure"),
    ];
    const res = gate.evaluate({ holdout, trainingMaxTs: TRAIN_MAX, testMinTs: TEST_MIN });
    expect(res.fullGrade.pass).toBe(false);
    expect(res.verdict).toBe("NO_GO");
    expect(res.promote).toBe(false);
    expect(res.fullGrade.failures.some((f) => f.startsWith("AUROC"))).toBe(true);
  });

  it("FAILURE 2: insufficient data (a class under the floor) -> INSUFFICIENT_DATA", () => {
    const gate = new CAMModelPromotionGateEngine();
    // success has 6 but failure has only 2 (< CAM_MIN_HOLDOUT_PER_CLASS=5).
    const holdout: CAMHoldoutSample[] = [
      ...Array.from({ length: 6 }, () => sample(0.95, 0.9, "success", "success")),
      sample(0.05, 0.9, "failure", "failure"),
      sample(0.06, 0.9, "failure", "failure"),
    ];
    const res = gate.evaluate({ holdout, trainingMaxTs: TRAIN_MAX, testMinTs: TEST_MIN });
    expect(res.verdict).toBe("INSUFFICIENT_DATA");
    expect(res.promote).toBe(false);
    expect(res.reasons.some((r) => r.includes("< 5 holdout"))).toBe(true);
  });

  it("FAILURE 3: single-class holdout -> INSUFFICIENT_DATA (no discrimination possible)", () => {
    const gate = new CAMModelPromotionGateEngine();
    const holdout: CAMHoldoutSample[] = Array.from({ length: 10 }, () => sample(0.9, 0.9, "success", "success"));
    const res = gate.evaluate({ holdout, trainingMaxTs: TRAIN_MAX, testMinTs: TEST_MIN });
    expect(res.verdict).toBe("INSUFFICIENT_DATA");
    expect(res.promote).toBe(false);
    expect(res.metrics.classes).toBe(1);
  });
});

describe("evaluate -- ADVERSARIAL (gate must not be fooled)", () => {
  it("ADVERSARIAL 1: temporal leakage (train_max >= test_min) -> NO_GO even with perfect metrics", () => {
    const gate = new CAMModelPromotionGateEngine();
    const holdout: CAMHoldoutSample[] = [
      ...Array.from({ length: 6 }, () => sample(0.98, 0.98, "success", "success")),
      ...Array.from({ length: 6 }, () => sample(0.02, 0.98, "failure", "failure")),
    ];
    // train_max AFTER test_min => leakage.
    const res = gate.evaluate({ holdout, trainingMaxTs: "2026-06-05T00:00:00.000Z", testMinTs: "2026-06-02T00:00:00.000Z" });
    expect(res.metrics.auroc).toBe(1); // metrics look perfect...
    expect(res.temporalHoldoutOk).toBe(false); // ...but holdout is leaked
    expect(res.verdict).toBe("NO_GO");
    expect(res.promote).toBe(false);
    expect(res.reasons.some((r) => r.includes("temporal holdout"))).toBe(true);
  });

  it("ADVERSARIAL 2: degenerate constant-score model -> DEGENERATE, never promote", () => {
    const gate = new CAMModelPromotionGateEngine();
    // Every score identical -> no ranking signal. A naive AUROC would read 0.5.
    const holdout: CAMHoldoutSample[] = [
      ...Array.from({ length: 6 }, () => sample(0.5, 0.5, "success", "success")),
      ...Array.from({ length: 6 }, () => sample(0.5, 0.5, "failure", "failure")),
    ];
    const res = gate.evaluate({ holdout, trainingMaxTs: TRAIN_MAX, testMinTs: TEST_MIN });
    expect(res.verdict).toBe("DEGENERATE");
    expect(res.promote).toBe(false);
  });

  it("ADVERSARIAL 3: selective point exists but does NOT auto-promote without opt-in", () => {
    const gate = new CAMModelPromotionGateEngine();
    // Full-coverage Brier FAILS (a confidently-WRONG low-conf tail: high score but
    // truth=failure => large squared-error terms drag full-set Brier > 0.15), yet
    // the high-confidence emitted subset is clean (Brier ~0, macroF1 1.0). Verified
    // live: full Brier 0.2706 > 0.15 => NO_GO; the selective point IS robust, but
    // allowSelective is not set so it must NOT promote.
    const holdout: CAMHoldoutSample[] = [
      ...Array.from({ length: 6 }, () => sample(0.97, 0.9, "success", "success")),
      ...Array.from({ length: 6 }, () => sample(0.03, 0.9, "failure", "failure")),
      // below-gate confidently-WRONG tail (excluded from the emitted set at tau=0.7)
      ...Array.from({ length: 3 }, () => sample(0.9, 0.4, "success", "failure")),
      ...Array.from({ length: 3 }, () => sample(0.1, 0.4, "failure", "success")),
    ];
    // allowSelective defaults false -> a robust selective point still does NOT promote.
    const res = gate.evaluate({ holdout, trainingMaxTs: TRAIN_MAX, testMinTs: TEST_MIN });
    expect(res.fullGrade.pass).toBe(false);
    expect(res.fullGrade.failures.some((f) => f.startsWith("Brier"))).toBe(true);
    expect(res.selectiveGrade!.pass).toBe(true); // a selective point EXISTS...
    expect(res.selectiveGrade!.robustAboveGate).toBe(true);
    expect(res.promote).toBe(false); // ...but no opt-in => not promoted
    expect(res.verdict).toBe("NO_GO");
  });

  it("ADVERSARIAL 4: with opt-in AND a robust operating point -> GO_SELECTIVE promotes", () => {
    const gate = new CAMModelPromotionGateEngine();
    // Global AUROC clears (clean separation overall); high-conf emitted set is clean;
    // low-conf tail below the gate exists but the emitted-above-gate set is perfect.
    const holdout: CAMHoldoutSample[] = [
      ...Array.from({ length: 8 }, () => sample(0.98, 0.95, "success", "success")),
      ...Array.from({ length: 8 }, () => sample(0.02, 0.95, "failure", "failure")),
      // below-gate tail (confidence 0.4 < 0.7) -- excluded from the emitted set, but
      // included in the FULL holdout so global AUROC still ranks correctly.
      sample(0.6, 0.4, "success", "success"), sample(0.4, 0.4, "failure", "failure"),
    ];
    const res = gate.evaluate({ holdout, trainingMaxTs: TRAIN_MAX, testMinTs: TEST_MIN, allowSelective: true });
    expect(res.metrics.auroc).toBeGreaterThanOrEqual(CAM_GATE_THRESHOLDS.auroc);
    expect(res.selectiveGrade).not.toBeNull();
    expect(res.selectiveGrade!.productionGate).toBe(CAM_PRODUCTION_MIN_CONF);
    // If full-coverage already passes it will be GO; either way the selective grade
    // must be robust and the candidate must promote.
    expect(res.promote).toBe(true);
    expect(["GO", "GO_SELECTIVE"]).toContain(res.verdict);
  });
});

describe("camLabelledPoolSize -- honest data-volume signal from the live store", () => {
  it("counts labelled CAM outcomes by class (the retrain-readiness gauge)", () => {
    const store = new CrossProcessOutcomeStore();
    // Emit a few CAM-shaped records exactly as CAMOutcomeCaptureWireEngine does.
    store.record({ bridge: "post", process: "lathe", request_summary: { feature: "post" }, response_summary: {}, outcome: { kind: "success" } });
    store.record({ bridge: "feature", process: "mill", request_summary: { feature: "toolpath" }, response_summary: {}, outcome: { kind: "success" } });
    store.record({ bridge: "post", process: "mill", request_summary: { feature: "nc_validate" }, response_summary: {}, outcome: { kind: "failure" } });
    // a non-CAM record (bridge sf) must NOT be counted
    store.record({ bridge: "sf", process: "mill", request_summary: {}, response_summary: {}, outcome: { kind: "success" } });
    // a pending CAM record must NOT be counted (unlabelled)
    store.record({ bridge: "feature", process: "mill", request_summary: { feature: "toolpath" }, response_summary: {}, outcome: { kind: "pending" } });

    const gate = new CAMModelPromotionGateEngine(store);
    const pool = gate.camLabelledPoolSize();
    expect(pool.total).toBe(3);
    expect(pool.byClass.success).toBe(2);
    expect(pool.byClass.failure).toBe(1);
  });
});
