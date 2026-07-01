/**
 * v11-cycle-time-conformal.test.mjs — concrete-value tests for the
 * conformal-prediction cycle-time interval calibrator.
 *
 * Conformal quantile hand-checks:
 *   N=10, residuals [1..10], α=0.1 (90%):
 *     index = ⌈11×0.9⌉ - 1 = ⌈9.9⌉ - 1 = 10 - 1 = 9 → sorted[9] = 10
 *   N=5, residuals [2,4,6,8,10], α=0.2 (80%):
 *     index = ⌈6×0.8⌉ - 1 = ⌈4.8⌉ - 1 = 5 - 1 = 4 → sorted[4] = 10
 *   N=10, residuals [1..10], α=0.5 (50%):
 *     index = ⌈11×0.5⌉ - 1 = ⌈5.5⌉ - 1 = 6 - 1 = 5 → sorted[5] = 6
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-NOVEL-CYCLE-TIME-CONFORMAL
 * @slot echo · @iter 31 · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CONFORMAL_SCHEMA_VERSION,
  DEFAULT_WINDOW_SIZE,
  DEFAULT_ALPHA,
  MIN_WINDOW_FOR_CALIBRATION,
  createConformalState,
  recordOutcome,
  computeQuantile,
  predictInterval,
  recommendBidPadding,
  summarizeCalibration,
  renderQuoteAdvisory,
} from "./v11-cycle-time-conformal.mjs";

describe("constants", () => {
  it("CONFORMAL_SCHEMA_VERSION = 1", () => {
    assert.equal(CONFORMAL_SCHEMA_VERSION, 1);
  });
  it("DEFAULT_WINDOW_SIZE = 50", () => {
    assert.equal(DEFAULT_WINDOW_SIZE, 50);
  });
  it("DEFAULT_ALPHA = 0.1 (90% interval)", () => {
    assert.equal(DEFAULT_ALPHA, 0.1);
  });
  it("MIN_WINDOW_FOR_CALIBRATION = 5", () => {
    assert.equal(MIN_WINDOW_FOR_CALIBRATION, 5);
  });
});

describe("createConformalState", () => {
  it("defaults: windowSize=50, alpha=0.1, residuals=[]", () => {
    const s = createConformalState();
    assert.equal(s.windowSize, 50);
    assert.equal(s.alpha, 0.1);
    assert.deepEqual(s.residuals, []);
  });
  it("custom windowSize=100", () => {
    assert.equal(createConformalState({ windowSize: 100 }).windowSize, 100);
  });
  it("custom alpha=0.05 (95% interval)", () => {
    assert.equal(createConformalState({ alpha: 0.05 }).alpha, 0.05);
  });
  it("invalid alpha=0 → falls back to default 0.1", () => {
    assert.equal(createConformalState({ alpha: 0 }).alpha, 0.1);
  });
  it("invalid alpha=1 → falls back to default 0.1", () => {
    assert.equal(createConformalState({ alpha: 1 }).alpha, 0.1);
  });
  it("invalid windowSize=-5 → falls back to default 50", () => {
    assert.equal(createConformalState({ windowSize: -5 }).windowSize, 50);
  });
  it("schemaVersion = 1", () => {
    assert.equal(createConformalState().schemaVersion, 1);
  });
});

describe("recordOutcome: residual computation + window rolling", () => {
  it("predicted=10, actual=12 → residual=2 added to window", () => {
    const s0 = createConformalState();
    const s1 = recordOutcome(s0, { predictedMin: 10, actualMin: 12 });
    assert.equal(s1.residuals[0], 2);
  });
  it("predicted=10, actual=8 → residual=2 (absolute value)", () => {
    const s0 = createConformalState();
    const s1 = recordOutcome(s0, { predictedMin: 10, actualMin: 8 });
    assert.equal(s1.residuals[0], 2);
  });
  it("3 observations → 3 residuals", () => {
    let s = createConformalState();
    s = recordOutcome(s, { predictedMin: 10, actualMin: 12 });
    s = recordOutcome(s, { predictedMin: 15, actualMin: 18 });
    s = recordOutcome(s, { predictedMin: 20, actualMin: 17 });
    assert.equal(s.residuals.length, 3);
  });
  it("window cap respected: windowSize=3 + 5 outcomes → length 3", () => {
    let s = createConformalState({ windowSize: 3 });
    for (let i = 0; i < 5; i++) {
      s = recordOutcome(s, { predictedMin: 10, actualMin: 10 + i });
    }
    assert.equal(s.residuals.length, 3);
  });
  it("window rolls FIFO: oldest residual evicted", () => {
    let s = createConformalState({ windowSize: 3 });
    s = recordOutcome(s, { predictedMin: 10, actualMin: 11 }); // r=1
    s = recordOutcome(s, { predictedMin: 10, actualMin: 12 }); // r=2
    s = recordOutcome(s, { predictedMin: 10, actualMin: 13 }); // r=3
    s = recordOutcome(s, { predictedMin: 10, actualMin: 14 }); // r=4 → evicts r=1
    assert.deepEqual(s.residuals, [2, 3, 4]);
  });
  it("immutable: original state unchanged", () => {
    const s0 = createConformalState();
    recordOutcome(s0, { predictedMin: 10, actualMin: 12 });
    assert.equal(s0.residuals.length, 0);
  });
  it("invalid predictedMin (NaN) → state unchanged", () => {
    const s0 = createConformalState();
    const s1 = recordOutcome(s0, { predictedMin: NaN, actualMin: 12 });
    assert.equal(s1.residuals.length, 0);
  });
  it("negative actualMin → state unchanged", () => {
    const s0 = createConformalState();
    const s1 = recordOutcome(s0, { predictedMin: 10, actualMin: -5 });
    assert.equal(s1.residuals.length, 0);
  });
  it("null event → state returned unchanged", () => {
    const s0 = createConformalState();
    assert.equal(recordOutcome(s0, null), s0);
  });
});

describe("computeQuantile: hand-checked conformal index", () => {
  function buildState(residuals, alpha) {
    return { schemaVersion: 1, windowSize: 100, alpha, residuals };
  }
  it("N=10, residuals [1..10], α=0.1 → quantile=10", () => {
    const s = buildState([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.1);
    assert.equal(computeQuantile(s), 10);
  });
  it("N=5, residuals [2,4,6,8,10], α=0.2 → quantile=10", () => {
    const s = buildState([2, 4, 6, 8, 10], 0.2);
    assert.equal(computeQuantile(s), 10);
  });
  it("N=10, residuals [1..10], α=0.5 → quantile=6", () => {
    const s = buildState([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.5);
    assert.equal(computeQuantile(s), 6);
  });
  it("unsorted input: residuals [5,1,3,2,4], α=0.2 → sorted[4]=5", () => {
    const s = buildState([5, 1, 3, 2, 4], 0.2);
    assert.equal(computeQuantile(s), 5);
  });
  it("N=4 (below MIN_WINDOW_FOR_CALIBRATION=5) → null (undertrained)", () => {
    const s = buildState([1, 2, 3, 4], 0.1);
    assert.equal(computeQuantile(s), null);
  });
  it("null state → null", () => {
    assert.equal(computeQuantile(null), null);
  });
  it("empty residuals → null", () => {
    assert.equal(computeQuantile(buildState([], 0.1)), null);
  });
});

describe("predictInterval", () => {
  function buildCalibratedState() {
    let s = createConformalState({ windowSize: 100, alpha: 0.1 });
    for (let i = 1; i <= 10; i++) {
      // synthesize residuals [1..10] via predicted=10, actual=10+i
      s = recordOutcome(s, { predictedMin: 10, actualMin: 10 + i });
    }
    return s;
  }
  it("calibrated: predicted=15, quantile=10 → [5, 25]", () => {
    const s = buildCalibratedState();
    const iv = predictInterval(s, 15);
    assert.equal(iv.lower, 5);
    assert.equal(iv.upper, 25);
  });
  it("calibrated: source = 'conformal'", () => {
    const s = buildCalibratedState();
    assert.equal(predictInterval(s, 15).source, "conformal");
  });
  it("calibrated: coverage = 0.9 (1 - alpha 0.1)", () => {
    const s = buildCalibratedState();
    assert.equal(Math.abs(predictInterval(s, 15).coverage - 0.9) < 1e-9, true);
  });
  it("lower bound clamped to 0: predicted=3, quantile=10 → [0, 13]", () => {
    const s = buildCalibratedState();
    const iv = predictInterval(s, 3);
    assert.equal(iv.lower, 0);
    assert.equal(iv.upper, 13);
  });
  it("undertrained state → point estimate (lower=upper=predicted)", () => {
    const s = createConformalState();
    const iv = predictInterval(s, 15);
    assert.equal(iv.lower, 15);
    assert.equal(iv.upper, 15);
  });
  it("undertrained → source = 'undertrained_point_estimate'", () => {
    const s = createConformalState();
    assert.equal(predictInterval(s, 15).source, "undertrained_point_estimate");
  });
  it("invalid input (NaN) → source = 'invalid_input', lower/upper null", () => {
    const s = createConformalState();
    const iv = predictInterval(s, NaN);
    assert.equal(iv.source, "invalid_input");
    assert.equal(iv.lower, null);
  });
  it("negative input → source = 'invalid_input'", () => {
    const s = createConformalState();
    assert.equal(predictInterval(s, -5).source, "invalid_input");
  });
});

describe("recommendBidPadding", () => {
  function buildCalibratedState() {
    let s = createConformalState({ windowSize: 100, alpha: 0.1 });
    for (let i = 1; i <= 10; i++) {
      s = recordOutcome(s, { predictedMin: 10, actualMin: 10 + i });
    }
    return s;
  }
  it("balanced tier: padMin = quantile × 1.0 = 10", () => {
    const s = buildCalibratedState();
    assert.equal(recommendBidPadding(s, 15).padMin, 10);
  });
  it("conservative tier: padMin = quantile × 1.5 = 15", () => {
    const s = buildCalibratedState();
    assert.equal(recommendBidPadding(s, 15, { safetyTier: "conservative" }).padMin, 15);
  });
  it("aggressive tier: padMin = quantile × 0.5 = 5", () => {
    const s = buildCalibratedState();
    assert.equal(recommendBidPadding(s, 15, { safetyTier: "aggressive" }).padMin, 5);
  });
  it("balanced tier: padPct = 10/15 ≈ 0.6667", () => {
    const s = buildCalibratedState();
    const pad = recommendBidPadding(s, 15);
    assert.equal(Math.abs(pad.padPct - 10 / 15) < 1e-9, true);
  });
  it("balanced tier: upper = predicted + pad = 25", () => {
    const s = buildCalibratedState();
    assert.equal(recommendBidPadding(s, 15).upper, 25);
  });
  it("undertrained fallback: padPct=0.2, basis='undertrained_fallback_20pct'", () => {
    const s = createConformalState();
    const pad = recommendBidPadding(s, 15);
    assert.equal(pad.padPct, 0.2);
    assert.equal(pad.basis, "undertrained_fallback_20pct");
  });
  it("undertrained: padMin = 15 × 0.2 = 3", () => {
    const s = createConformalState();
    assert.equal(recommendBidPadding(s, 15).padMin, 3);
  });
  it("invalid input → basis='invalid_input', padMin=null", () => {
    const s = createConformalState();
    const pad = recommendBidPadding(s, NaN);
    assert.equal(pad.basis, "invalid_input");
    assert.equal(pad.padMin, null);
  });
});

describe("summarizeCalibration", () => {
  function buildCalibratedState() {
    let s = createConformalState({ windowSize: 100, alpha: 0.1 });
    for (let i = 1; i <= 10; i++) {
      s = recordOutcome(s, { predictedMin: 10, actualMin: 10 + i });
    }
    return s;
  }
  it("fresh state: calibrated=false, sampleCount=0", () => {
    const s = createConformalState();
    const sm = summarizeCalibration(s);
    assert.equal(sm.calibrated, false);
    assert.equal(sm.sampleCount, 0);
  });
  it("calibrated state: calibrated=true, sampleCount=10", () => {
    const s = buildCalibratedState();
    const sm = summarizeCalibration(s);
    assert.equal(sm.calibrated, true);
    assert.equal(sm.sampleCount, 10);
  });
  it("calibrated: quantile=10", () => {
    const s = buildCalibratedState();
    assert.equal(summarizeCalibration(s).quantile, 10);
  });
  it("MAE = (1+2+...+10)/10 = 5.5", () => {
    const s = buildCalibratedState();
    assert.equal(summarizeCalibration(s).meanAbsoluteError, 5.5);
  });
  it("maxAbsoluteError = 10", () => {
    const s = buildCalibratedState();
    assert.equal(summarizeCalibration(s).maxAbsoluteError, 10);
  });
  it("coverage = 0.9", () => {
    const s = buildCalibratedState();
    assert.equal(Math.abs(summarizeCalibration(s).coverage - 0.9) < 1e-9, true);
  });
  it("schemaVersion = 1", () => {
    assert.equal(summarizeCalibration(createConformalState()).schemaVersion, 1);
  });
});

describe("renderQuoteAdvisory", () => {
  function buildCalibratedState() {
    let s = createConformalState({ windowSize: 100, alpha: 0.1 });
    for (let i = 1; i <= 10; i++) {
      s = recordOutcome(s, { predictedMin: 10, actualMin: 10 + i });
    }
    return s;
  }
  it("calibrated: includes header 'PRISM CYCLE-TIME QUOTE ADVISORY'", () => {
    const s = buildCalibratedState();
    assert.equal(renderQuoteAdvisory(s, 15).includes("PRISM CYCLE-TIME QUOTE ADVISORY"), true);
  });
  it("calibrated: includes '90% interval'", () => {
    const s = buildCalibratedState();
    assert.equal(renderQuoteAdvisory(s, 15).includes("90% interval"), true);
  });
  it("calibrated: includes interval bounds [5.00, 25.00]", () => {
    const s = buildCalibratedState();
    assert.equal(renderQuoteAdvisory(s, 15).includes("[5.00, 25.00]"), true);
  });
  it("undertrained: includes 'undertrained' marker", () => {
    const s = createConformalState();
    assert.equal(renderQuoteAdvisory(s, 15).includes("undertrained"), true);
  });
  it("invalid input: includes 'invalid input' marker", () => {
    const s = createConformalState();
    assert.equal(renderQuoteAdvisory(s, NaN).includes("invalid input"), true);
  });
});
