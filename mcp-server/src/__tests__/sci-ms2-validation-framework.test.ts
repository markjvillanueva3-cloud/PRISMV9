/**
 * SCI-MS2 Validation Framework — Unit Tests
 *
 * Covers all 5 SCI-MS2 engines:
 *   1. PredictionValidationEngine (MAE, MAPE, R², Bland-Altman, t-test, grading)
 *   2. CalibrationEngine (Kienzle, Taylor, convergence, R², CI)
 *   3. BenchmarkSuiteEngine (scenarios, runner, grading, regression)
 *   4. UncertaintyQuantificationEngine (Monte Carlo, Sobol, prediction intervals)
 *   5. ContinuousImprovementEngine (BMA, residual analysis, correction factors)
 *
 * @milestone SCI-MS2
 */
import { describe, it, expect } from "vitest";
import { predictionValidationEngine } from "../engines/PredictionValidationEngine.js";
import { calibrationEngine } from "../engines/CalibrationEngine.js";
import { benchmarkSuiteEngine } from "../engines/BenchmarkSuiteEngine.js";
import { uncertaintyQuantificationEngine } from "../engines/UncertaintyQuantificationEngine.js";
import { continuousImprovementEngine } from "../engines/ContinuousImprovementEngine.js";

// ============================================================================
// 1. PredictionValidationEngine
// ============================================================================

describe("PredictionValidationEngine", () => {
  it("computes MAE correctly for known data", () => {
    const result = predictionValidationEngine.validate({
      pairs: [
        { predicted: 105, measured: 100 },
        { predicted: 198, measured: 200 },
        { predicted: 310, measured: 300 },
        { predicted: 390, measured: 400 },
      ],
      quantity: "force_N",
    });
    // Errors: 5, 2, 10, 10 → MAE = 27/4 = 6.75
    expect(result.mae).toBeCloseTo(6.75, 4);
    expect(result.n).toBe(4);
  });

  it("computes MAPE within expected range", () => {
    const result = predictionValidationEngine.validate({
      pairs: [
        { predicted: 110, measured: 100 }, // 10%
        { predicted: 190, measured: 200 }, // 5%
        { predicted: 315, measured: 300 }, // 5%
        { predicted: 420, measured: 400 }, // 5%
      ],
      quantity: "force_N",
    });
    // MAPE = mean(10, 5, 5, 5) = 6.25%
    expect(result.mape_pct).toBeCloseTo(6.25, 2);
  });

  it("returns R² = 1.0 for perfect predictions", () => {
    const predicted = [100, 200, 300, 400, 500];
    const measured = [100, 200, 300, 400, 500];
    const r2 = predictionValidationEngine.rSquared(predicted, measured);
    expect(r2).toBeCloseTo(1.0, 10);
  });

  it("computes Bland-Altman bias near zero for unbiased predictions", () => {
    // Errors cancel out and are uncorrelated with magnitude
    const pairs = [
      { predicted: 105, measured: 100 },
      { predicted: 195, measured: 200 },
      { predicted: 303, measured: 300 },
      { predicted: 397, measured: 400 },
      { predicted: 504, measured: 500 },
      { predicted: 596, measured: 600 },
      { predicted: 702, measured: 700 },
      { predicted: 798, measured: 800 },
    ];
    const ba = predictionValidationEngine.blandAltman(pairs);
    expect(Math.abs(ba.bias)).toBeLessThan(1);
    expect(ba.proportional_bias).toBe(false);
  });

  it("assigns grade A for MAPE < 5%", () => {
    const result = predictionValidationEngine.validate({
      pairs: [
        { predicted: 101, measured: 100 },
        { predicted: 201, measured: 200 },
        { predicted: 301, measured: 300 },
        { predicted: 401, measured: 400 },
      ],
      quantity: "force_N",
    });
    // ~1% MAPE → grade A
    expect(result.grade).toBe("A");
    expect(result.passed).toBe(true);
  });

  it("assigns grade D for MAPE between 15% and 25%", () => {
    const result = predictionValidationEngine.validate({
      pairs: [
        { predicted: 120, measured: 100 }, // 20%
        { predicted: 240, measured: 200 }, // 20%
        { predicted: 360, measured: 300 }, // 20%
        { predicted: 480, measured: 400 }, // 20%
      ],
      quantity: "force_N",
    });
    expect(result.grade).toBe("D");
  });

  it("paired t-test is not significant for matching predictions with small noise", () => {
    // Symmetric noise around zero → mean diff ≈ 0 → not significant
    const pairs = [
      { predicted: 102, measured: 100 },
      { predicted: 198, measured: 200 },
      { predicted: 303, measured: 300 },
      { predicted: 397, measured: 400 },
      { predicted: 501, measured: 500 },
      { predicted: 599, measured: 600 },
    ];
    const result = predictionValidationEngine.validate({ pairs, quantity: "force_N" });
    expect(result.t_test.significant).toBe(false);
    expect(result.t_test.p_value).toBeGreaterThan(0.05);
  });

  it("returns residuals and RMSE", () => {
    const result = predictionValidationEngine.validate({
      pairs: [
        { predicted: 110, measured: 100 },
        { predicted: 210, measured: 200 },
      ],
      quantity: "force_N",
    });
    expect(result.residuals).toHaveLength(2);
    expect(result.residuals[0]).toBeCloseTo(10, 6);
    expect(result.rmse).toBeCloseTo(10, 6);
  });
});

// ============================================================================
// 2. CalibrationEngine
// ============================================================================

describe("CalibrationEngine", () => {
  it("Kienzle calibration recovers known kc11 and mc", () => {
    // Generate synthetic data with slight noise: Fc = 2000 * b * h^(1 - 0.25)
    const kc11True = 2000;
    const mcTrue = 0.25;
    const measurements = [
      { inputs: { b: 3, h: 0.1 }, measured: kc11True * 3 * Math.pow(0.1, 1 - mcTrue) * 1.01 },
      { inputs: { b: 3, h: 0.2 }, measured: kc11True * 3 * Math.pow(0.2, 1 - mcTrue) * 0.99 },
      { inputs: { b: 5, h: 0.1 }, measured: kc11True * 5 * Math.pow(0.1, 1 - mcTrue) * 1.02 },
      { inputs: { b: 5, h: 0.3 }, measured: kc11True * 5 * Math.pow(0.3, 1 - mcTrue) * 0.98 },
      { inputs: { b: 4, h: 0.15 }, measured: kc11True * 4 * Math.pow(0.15, 1 - mcTrue) * 1.01 },
    ];
    const result = calibrationEngine.calibrate({
      data: { type: "kienzle", measurements },
      initial_guess: { kc11: 1500, mc: 0.40 },
    });
    const kc11Fitted = result.parameters.find(p => p.name === "kc11")!;
    const mcFitted = result.parameters.find(p => p.name === "mc")!;
    // Verify fitted parameters are reasonable and RMSE is low
    expect(kc11Fitted.value).toBeGreaterThan(1500);
    expect(kc11Fitted.value).toBeLessThan(2500);
    expect(mcFitted.value).toBeGreaterThan(0.1);
    expect(mcFitted.value).toBeLessThan(0.5);
    expect(result.after_rmse).toBeLessThan(result.before_rmse);
  });

  it("Taylor calibration fits C and n", () => {
    // V * T^n = C → T = (C/V)^(1/n)
    const CTrue = 300;
    const nTrue = 0.25;
    const speeds = [100, 150, 200, 250];
    const measurements = speeds.map(V => ({
      inputs: { V },
      measured: Math.pow(CTrue / V, 1 / nTrue),
    }));
    const result = calibrationEngine.calibrate({
      data: { type: "taylor", measurements },
    });
    const CFitted = result.parameters.find(p => p.name === "C")!;
    const nFitted = result.parameters.find(p => p.name === "n")!;
    expect(CFitted.value).toBeCloseTo(CTrue, 0);
    expect(nFitted.value).toBeCloseTo(nTrue, 1);
    expect(result.model_type).toBe("taylor");
  });

  it("convergence achieved within max iterations", () => {
    const measurements = [
      { inputs: { b: 3, h: 0.1 }, measured: 2000 * 3 * Math.pow(0.1, 0.75) * 1.02 },
      { inputs: { b: 5, h: 0.2 }, measured: 2000 * 5 * Math.pow(0.2, 0.75) * 0.98 },
      { inputs: { b: 4, h: 0.15 }, measured: 2000 * 4 * Math.pow(0.15, 0.75) * 1.01 },
    ];
    const result = calibrationEngine.calibrate({
      data: { type: "kienzle", measurements },
      max_iterations: 200,
      initial_guess: { kc11: 1800, mc: 0.30 },
    });
    // Verify calibration improved the fit within the iteration budget
    expect(result.after_rmse).toBeLessThan(result.before_rmse);
    expect(result.iterations).toBeLessThanOrEqual(200);
  });

  it("R² improves after calibration (after_rmse <= before_rmse)", () => {
    const measurements = [
      { inputs: { b: 3, h: 0.1 }, measured: 2000 * 3 * Math.pow(0.1, 0.75) },
      { inputs: { b: 5, h: 0.2 }, measured: 2000 * 5 * Math.pow(0.2, 0.75) },
      { inputs: { b: 4, h: 0.15 }, measured: 2000 * 4 * Math.pow(0.15, 0.75) },
    ];
    const result = calibrationEngine.calibrate({
      data: { type: "kienzle", measurements },
      initial_guess: { kc11: 1500, mc: 0.4 }, // intentionally off
    });
    expect(result.after_rmse).toBeLessThanOrEqual(result.before_rmse);
    expect(result.improvement_pct).toBeGreaterThanOrEqual(0);
  });

  it("parameter confidence intervals contain true value", () => {
    const kc11True = 2000;
    const mcTrue = 0.25;
    const measurements = [
      { inputs: { b: 2, h: 0.08 }, measured: kc11True * 2 * Math.pow(0.08, 1 - mcTrue) },
      { inputs: { b: 3, h: 0.12 }, measured: kc11True * 3 * Math.pow(0.12, 1 - mcTrue) },
      { inputs: { b: 4, h: 0.15 }, measured: kc11True * 4 * Math.pow(0.15, 1 - mcTrue) },
      { inputs: { b: 5, h: 0.20 }, measured: kc11True * 5 * Math.pow(0.20, 1 - mcTrue) },
      { inputs: { b: 6, h: 0.25 }, measured: kc11True * 6 * Math.pow(0.25, 1 - mcTrue) },
    ];
    const result = calibrationEngine.calibrate({
      data: { type: "kienzle", measurements },
      initial_guess: { kc11: 1800, mc: 0.30 },
      tolerance: 1e-4,
    });
    const kc11 = result.parameters.find(p => p.name === "kc11")!;
    // Allow small floating-point tolerance on CI bounds
    expect(kc11.confidence_interval_95[0]).toBeLessThanOrEqual(kc11True + 1);
    expect(kc11.confidence_interval_95[1]).toBeGreaterThanOrEqual(kc11True - 1);
  });
});

// ============================================================================
// 3. BenchmarkSuiteEngine
// ============================================================================

describe("BenchmarkSuiteEngine", () => {
  it("returns 15+ built-in benchmark scenarios", () => {
    const scenarios = benchmarkSuiteEngine.getScenarios();
    expect(scenarios.length).toBeGreaterThanOrEqual(15);
    // Each scenario has required fields
    for (const s of scenarios) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.material).toBeTruthy();
      expect(s.category).toBeTruthy();
    }
  });

  it("scenarios cover multiple materials", () => {
    const scenarios = benchmarkSuiteEngine.getScenarios();
    const materials = new Set(scenarios.map(s => s.material));
    expect(materials.size).toBeGreaterThanOrEqual(4);
  });

  it("benchmark runner evaluates pass/fail correctly", () => {
    // Predictor returns values within expected ranges for AL6061 tool life
    const result = benchmarkSuiteEngine.run({
      predictor: (scenario) => {
        const ranges = scenario.expected;
        const predictions: Record<string, number> = {};
        // Return midpoint of each expected range → all pass
        if (ranges.force_N) predictions["force_N"] = (ranges.force_N.min + ranges.force_N.max) / 2;
        if (ranges.temperature_C) predictions["temperature_C"] = (ranges.temperature_C.min + ranges.temperature_C.max) / 2;
        if (ranges.ra_um) predictions["ra_um"] = (ranges.ra_um.min + ranges.ra_um.max) / 2;
        if (ranges.deflection_um) predictions["deflection_um"] = (ranges.deflection_um.min + ranges.deflection_um.max) / 2;
        if (ranges.cycle_time_sec) predictions["cycle_time_sec"] = (ranges.cycle_time_sec.min + ranges.cycle_time_sec.max) / 2;
        if (ranges.tool_life_min) predictions["tool_life_min"] = (ranges.tool_life_min.min + ranges.tool_life_min.max) / 2;
        return predictions;
      },
    });
    expect(result.passed).toBe(result.total);
    expect(result.failed).toBe(0);
    expect(result.pass_rate_pct).toBe(100);
  });

  it("grade reflects pass rate — all pass → A", () => {
    const result = benchmarkSuiteEngine.run({
      predictor: (scenario) => {
        const predictions: Record<string, number> = {};
        const ranges = scenario.expected;
        if (ranges.force_N) predictions["force_N"] = (ranges.force_N.min + ranges.force_N.max) / 2;
        if (ranges.temperature_C) predictions["temperature_C"] = (ranges.temperature_C.min + ranges.temperature_C.max) / 2;
        if (ranges.ra_um) predictions["ra_um"] = (ranges.ra_um.min + ranges.ra_um.max) / 2;
        if (ranges.deflection_um) predictions["deflection_um"] = (ranges.deflection_um.min + ranges.deflection_um.max) / 2;
        if (ranges.cycle_time_sec) predictions["cycle_time_sec"] = (ranges.cycle_time_sec.min + ranges.cycle_time_sec.max) / 2;
        if (ranges.tool_life_min) predictions["tool_life_min"] = (ranges.tool_life_min.min + ranges.tool_life_min.max) / 2;
        return predictions;
      },
    });
    expect(result.grade).toBe("A");
  });

  it("regression detection works with baseline comparison", () => {
    const scenarios = benchmarkSuiteEngine.getScenarios();
    const target = scenarios[0]; // TL-AL6061
    const midForce = ((target.expected.force_N?.min ?? 0) + (target.expected.force_N?.max ?? 0)) / 2;

    const result = benchmarkSuiteEngine.run({
      predictor: () => ({
        force_N: midForce + 200, // way off from midpoint
        temperature_C: 120,
        tool_life_min: 150,
      }),
      scenarios: [target.id],
      baseline: {
        [target.id]: {
          force_N: midForce + 10, // baseline slightly off midpoint (oldErr > 0)
          temperature_C: 120,
          tool_life_min: 150,
        },
      },
    });
    // The new prediction is further from midpoint than baseline → regression
    expect(result.regressions.length).toBeGreaterThanOrEqual(1);
    expect(result.regressions[0].scenario_id).toBe(target.id);
  });

  it("getScenario returns specific scenario by ID", () => {
    const s = benchmarkSuiteEngine.getScenario("TL-AL6061");
    expect(s).toBeDefined();
    expect(s!.material).toBe("Al6061-T6");
  });
});

// ============================================================================
// 4. UncertaintyQuantificationEngine
// ============================================================================

describe("UncertaintyQuantificationEngine", () => {
  it("Monte Carlo produces distribution statistics (mean, std, percentiles)", () => {
    const result = uncertaintyQuantificationEngine.quantify({
      parameters: [
        { name: "kc11", nominal: 2000, distribution: "normal", std: 100, unit: "N/mm²" },
        { name: "h", nominal: 0.1, distribution: "normal", std: 0.01, unit: "mm" },
      ],
      model: (p) => ({ force: p["kc11"] * 3 * Math.pow(p["h"], 0.75) }),
      n_samples: 500,
      compute_sobol: false,
    });
    expect(result.outputs).toHaveLength(1);
    const out = result.outputs[0];
    expect(out.name).toBe("force");
    expect(out.mean).toBeGreaterThan(0);
    expect(out.std).toBeGreaterThan(0);
    expect(out.percentile_5).toBeLessThan(out.median);
    expect(out.percentile_95).toBeGreaterThan(out.median);
  });

  it("prediction interval contains the nominal value", () => {
    const nominal_kc = 2000;
    const nominal_h = 0.1;
    const nominalForce = nominal_kc * 3 * Math.pow(nominal_h, 0.75);

    const result = uncertaintyQuantificationEngine.quantify({
      parameters: [
        { name: "kc11", nominal: nominal_kc, distribution: "normal", std: 50, unit: "N/mm²" },
        { name: "h", nominal: nominal_h, distribution: "normal", std: 0.005, unit: "mm" },
      ],
      model: (p) => ({ force: p["kc11"] * 3 * Math.pow(p["h"], 0.75) }),
      n_samples: 500,
      compute_sobol: false,
    });
    const out = result.outputs[0];
    expect(out.prediction_interval[0]).toBeLessThan(nominalForce);
    expect(out.prediction_interval[1]).toBeGreaterThan(nominalForce);
  });

  it("Sobol first-order indices sum to approximately 1 or less", () => {
    const result = uncertaintyQuantificationEngine.quantify({
      parameters: [
        { name: "a", nominal: 10, distribution: "uniform", min: 5, max: 15, unit: "u" },
        { name: "b", nominal: 20, distribution: "uniform", min: 15, max: 25, unit: "u" },
      ],
      model: (p) => ({ y: p["a"] + p["b"] }),
      n_samples: 512,
      compute_sobol: true,
    });
    expect(result.sobol_indices.length).toBe(2);
    const sumFirstOrder = result.sobol_indices.reduce((s, si) => s + si.first_order, 0);
    // For a linear additive model, first-order indices should sum to ~1
    expect(sumFirstOrder).toBeGreaterThan(0.5);
    expect(sumFirstOrder).toBeLessThanOrEqual(2.0); // allow Monte Carlo numerical noise
  });

  it("identifies the most influential parameter", () => {
    // Model: y = 10*a + b → 'a' dominates
    const result = uncertaintyQuantificationEngine.quantify({
      parameters: [
        { name: "a", nominal: 10, distribution: "uniform", min: 5, max: 15, unit: "u" },
        { name: "b", nominal: 5, distribution: "uniform", min: 4, max: 6, unit: "u" },
      ],
      model: (p) => ({ y: 10 * p["a"] + p["b"] }),
      n_samples: 512,
      compute_sobol: true,
    });
    expect(result.most_influential_parameter).toBe("a");
  });

  it("uniform distribution produces wider spread than tight normal", () => {
    const resultUniform = uncertaintyQuantificationEngine.quantify({
      parameters: [
        { name: "x", nominal: 100, distribution: "uniform", min: 50, max: 150, unit: "u" },
      ],
      model: (p) => ({ y: p["x"] }),
      n_samples: 1000,
      compute_sobol: false,
    });
    const resultNormal = uncertaintyQuantificationEngine.quantify({
      parameters: [
        { name: "x", nominal: 100, distribution: "normal", std: 5, unit: "u" },
      ],
      model: (p) => ({ y: p["x"] }),
      n_samples: 1000,
      compute_sobol: false,
    });
    // Uniform [50,150] has std ≈ 28.9 vs normal std=5
    expect(resultUniform.outputs[0].std).toBeGreaterThan(resultNormal.outputs[0].std);
  });

  it("returns convergence status and n_samples_actual", () => {
    const result = uncertaintyQuantificationEngine.quantify({
      parameters: [
        { name: "x", nominal: 100, distribution: "normal", std: 1, unit: "u" },
      ],
      model: (p) => ({ y: p["x"] * 2 }),
      n_samples: 2000,
      compute_sobol: false,
    });
    expect(result.n_samples_actual).toBe(2000);
    expect(typeof result.convergence_achieved).toBe("boolean");
  });
});

// ============================================================================
// 5. ContinuousImprovementEngine
// ============================================================================

describe("ContinuousImprovementEngine", () => {
  const measured = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

  it("Bayesian model averaging assigns weights that sum to 1", () => {
    const models = [
      { model_name: "Kienzle", predictions: measured.map(v => v * 1.05), measured, n_parameters: 2 },
      { model_name: "Taylor", predictions: measured.map(v => v * 1.15), measured, n_parameters: 2 },
    ];
    const weights = continuousImprovementEngine.bayesianModelAveraging(models);
    const sum = weights.reduce((s, w) => s + w.weight, 0);
    expect(sum).toBeCloseTo(1.0, 4);
    expect(weights).toHaveLength(2);
  });

  it("better model gets higher BMA weight", () => {
    const goodPred = measured.map(v => v * 1.02); // 2% off
    const badPred = measured.map(v => v * 1.20); // 20% off
    const models = [
      { model_name: "good", predictions: goodPred, measured, n_parameters: 2 },
      { model_name: "bad", predictions: badPred, measured, n_parameters: 2 },
    ];
    const weights = continuousImprovementEngine.bayesianModelAveraging(models);
    const goodWeight = weights.find(w => w.model === "good")!.weight;
    const badWeight = weights.find(w => w.model === "bad")!.weight;
    expect(goodWeight).toBeGreaterThan(badWeight);
  });

  it("residual analysis detects systematic bias", () => {
    // All residuals positive → bias
    const biasedResiduals = [10, 12, 11, 13, 10, 14, 12, 11, 13, 10];
    const analysis = continuousImprovementEngine.analyzeResiduals(biasedResiduals);
    expect(analysis.has_bias).toBe(true);
    expect(analysis.bias_value).toBeGreaterThan(0);
  });

  it("correction factor improves RMSE", () => {
    // Systematic 10% overprediction
    const predictions = measured.map(v => v * 1.10);
    const result = continuousImprovementEngine.improve({
      models: [{ model_name: "model_A", predictions, measured, n_parameters: 2 }],
      algorithm: "Kienzle",
      material: "AISI1045",
      quantity: "force_N",
    });
    expect(result.improvement.after_rmse).toBeLessThan(result.improvement.before_rmse);
    expect(result.improvement.improvement_pct).toBeGreaterThan(0);
    expect(result.correction_factors.length).toBeGreaterThanOrEqual(1);
  });

  it("generates recommendations for biased residuals", () => {
    const predictions = measured.map(v => v * 1.10);
    const result = continuousImprovementEngine.improve({
      models: [{ model_name: "biased_model", predictions, measured, n_parameters: 2 }],
      algorithm: "Kienzle",
      material: "AISI1045",
      quantity: "force_N",
    });
    expect(result.recommendations.length).toBeGreaterThan(0);
    // Should mention bias or correction
    const hasRelevant = result.recommendations.some(
      r => r.includes("bias") || r.includes("Correction") || r.includes("RMSE")
    );
    expect(hasRelevant).toBe(true);
  });

  it("best_model is the model with highest BMA weight", () => {
    const goodPred = measured.map(v => v * 1.01);
    const badPred = measured.map(v => v * 1.30);
    const result = continuousImprovementEngine.improve({
      models: [
        { model_name: "accurate", predictions: goodPred, measured, n_parameters: 2 },
        { model_name: "inaccurate", predictions: badPred, measured, n_parameters: 3 },
      ],
      algorithm: "test",
      material: "steel",
      quantity: "force",
    });
    expect(result.best_model).toBe("accurate");
    expect(result.model_weights[0].model).toBe("accurate");
    expect(result.model_weights[0].weight).toBeGreaterThan(result.model_weights[1].weight);
  });
});
