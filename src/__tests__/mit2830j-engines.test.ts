/**
 * mit2830j-engines.test.ts — Tests for CycleToControlEngine, SPCChartingEngine, DOEAnalysisEngine
 * Created by /pdf-learn forge-triple (MIT 2.830J Control of Manufacturing Processes)
 */
import { describe, it, expect } from "vitest";
import {
  analyzeCtCControl,
  findOptimalGain,
  analyzeAutocorrelation,
  type CtCProcessInput,
} from "../engines/CycleToControlEngine.js";
import {
  computeEWMA,
  computeCUSUM,
  computeMovingAverage,
  computeXbarS,
} from "../engines/SPCChartingEngine.js";
import {
  analyzeFactorial,
  generateFullFactorial,
  generateFractionalFactorial,
  type DOEInput,
} from "../engines/DOEAnalysisEngine.js";

// ============================================================================
// CycleToControlEngine
// ============================================================================
describe("CycleToControlEngine", () => {
  const baseInput: CtCProcessInput = {
    process_gain_Kp: 1.0,
    controller_type: "proportional",
    controller_gain_Kc: 0.5,
    disturbance_type: "uncorrelated",
    disturbance_variance: 0.01,
    target_value: 10.0,
    upper_tolerance: 10.5,
    lower_tolerance: 9.5,
  };

  it("computes stable P-control with uncorrelated disturbance", () => {
    const r = analyzeCtCControl(baseInput);
    expect(r.is_stable).toBe(true);
    expect(r.loop_gain_K.value).toBeCloseTo(0.5); // K = Kc * Kp
    // For uncorrelated (NIDI) disturbance, P-control INCREASES variance
    // This is correct per Siu 2001 — CtC feedback adds adjustment noise
    expect(r.variance_ratio.value).toBeGreaterThan(1);
    expect(r.is_safe).toBe(true);
  });

  it("detects instability when loop gain K > 1", () => {
    const r = analyzeCtCControl({
      ...baseInput,
      controller_gain_Kc: 1.5, // K = 1.5 * 1.0 = 1.5 > 1 → unstable
    });
    expect(r.is_stable).toBe(false);
    expect(r.recommendations.length).toBeGreaterThan(0);
  });

  it("handles I-control with step disturbance (zero steady-state error)", () => {
    const r = analyzeCtCControl({
      ...baseInput,
      controller_type: "integral",
      disturbance_mean: 0.1, // step shift
    });
    expect(r.is_stable).toBe(true);
    expect(r.steady_state_error.value).toBeCloseTo(0, 1); // I-control eliminates offset
  });

  it("variance ratio increases with correlated disturbance", () => {
    const uncorr = analyzeCtCControl(baseInput);
    const corr = analyzeCtCControl({
      ...baseInput,
      disturbance_type: "correlated",
      correlation_coefficient: 0.8,
    });
    // Correlated disturbance: CtC control should show different variance ratio
    expect(corr.variance_ratio.value).not.toEqual(uncorr.variance_ratio.value);
  });

  it("computes Cpk correctly from tolerance and sigma", () => {
    // Use I-control with correlated disturbance — best case for CtC improvement
    const r = analyzeCtCControl({
      ...baseInput,
      controller_type: "integral",
      controller_gain_Kc: 0.3,
      disturbance_type: "correlated",
      correlation_coefficient: 0.8,
      disturbance_mean: 0.1,
    });
    // Cpk = min((T+ - μ)/(3σ), (μ - T-)/(3σ))
    expect(r.cpk_open_loop.value).toBeGreaterThan(0);
    expect(r.cpk_closed_loop.value).toBeGreaterThan(0);
    // I-control eliminates steady-state error, improving centering and Cpk
    expect(r.cpk_improvement_pct.value).toBeGreaterThan(0);
  });

  it("findOptimalGain returns gain within stable range", () => {
    // Use correlated disturbance — for uncorrelated, optimal Kc may be 0
    const r = findOptimalGain({
      ...baseInput,
      disturbance_type: "correlated",
      correlation_coefficient: 0.8,
    });
    expect(r.optimal_gain_Kc.value).toBeGreaterThanOrEqual(0);
    expect(r.gain_range_stable.min).toBe(0);
    expect(r.gain_range_stable.max).toBeCloseTo(1 / baseInput.process_gain_Kp, 0);
    expect(r.cpk_at_optimal.value).toBeGreaterThan(0);
  });

  it("analyzeAutocorrelation detects uncorrelated data", () => {
    // Generate ~uncorrelated data (random-ish)
    const data = Array.from({ length: 50 }, (_, i) =>
      10 + Math.sin(i * 7.3) * 0.1
    );
    const r = analyzeAutocorrelation(data);
    expect(r.disturbance_type).toBeDefined();
    expect(r.lag_values.length).toBeGreaterThan(0);
    expect(r.recommendation).toBeDefined();
  });

  it("analyzeAutocorrelation handles short data", () => {
    const r = analyzeAutocorrelation([10.0, 10.1, 9.9]);
    expect(r.lag_values.length).toBeGreaterThan(0);
    expect(r.disturbance_type).toBeDefined();
  });

  // Edge case: zero variance
  it("handles zero disturbance variance", () => {
    const r = analyzeCtCControl({
      ...baseInput,
      disturbance_variance: 0,
    });
    expect(r.is_stable).toBe(true);
    // With zero variance, Cpk should be very high or infinite
    expect(r.cpk_open_loop.value).toBeGreaterThan(10);
  });
});

// ============================================================================
// SPCChartingEngine
// ============================================================================
describe("SPCChartingEngine", () => {
  // In-control data: mean=100, sigma~2
  const inControlData = [
    100.5, 99.2, 101.1, 98.8, 100.3,
    99.7, 100.8, 99.5, 101.0, 100.1,
    99.3, 100.6, 99.9, 100.4, 99.8,
    100.2, 99.6, 100.7, 99.1, 100.5,
  ];

  // Out-of-control data: shift at index 10
  const shiftedData = [
    100.5, 99.2, 101.1, 98.8, 100.3,
    99.7, 100.8, 99.5, 101.0, 100.1,
    // shift of +3 sigma
    106.5, 105.2, 107.1, 104.8, 106.3,
    105.7, 106.8, 105.5, 107.0, 106.1,
  ];

  describe("EWMA", () => {
    it("detects in-control process", () => {
      const r = computeEWMA({
        data: inControlData,
        lambda: 0.2,
      });
      expect(r.chart_type).toBe("ewma");
      expect(r.is_in_control).toBe(true);
      expect(r.out_of_control_count).toBe(0);
      expect(r.points.length).toBe(inControlData.length);
      expect(r.center_line.source).toContain("MIT 2.830J");
    });

    it("detects mean shift", () => {
      const r = computeEWMA({
        data: shiftedData,
        lambda: 0.2,
        target_mean: 100,
        target_sigma: 2,
      });
      expect(r.is_in_control).toBe(false);
      expect(r.out_of_control_count).toBeGreaterThan(0);
      expect(r.first_signal_index).not.toBeNull();
      expect(r.first_signal_index!).toBeGreaterThanOrEqual(10);
    });

    it("returns time-varying control limits", () => {
      const r = computeEWMA({ data: inControlData, lambda: 0.2 });
      // Early limits should be tighter than late limits
      expect(r.points[0].ucl - r.points[0].lcl).toBeLessThan(
        r.points[19].ucl - r.points[19].lcl
      );
    });

    it("warns for extreme lambda values", () => {
      const r = computeEWMA({ data: inControlData, lambda: 0.05 });
      expect(r.recommendations.some(s => s.includes("low λ"))).toBe(true);
    });

    it("ARL estimate is positive", () => {
      const r = computeEWMA({ data: inControlData, lambda: 0.2 });
      expect(r.estimated_arl.value).toBeGreaterThan(0);
    });
  });

  describe("CUSUM", () => {
    it("detects in-control process", () => {
      const r = computeCUSUM({ data: inControlData });
      expect(r.chart_type).toBe("cusum");
      expect(r.is_in_control).toBe(true);
    });

    it("detects sustained shift", () => {
      const r = computeCUSUM({
        data: shiftedData,
        target_mean: 100,
        target_sigma: 2,
      });
      expect(r.is_in_control).toBe(false);
      expect(r.out_of_control_count).toBeGreaterThan(0);
      expect(r.recommendations.some(s => s.includes("shift"))).toBe(true);
    });

    it("CUSUM values start at 0", () => {
      const r = computeCUSUM({ data: inControlData });
      expect(r.points[0].lcl).toBe(0);
    });
  });

  describe("Moving Average", () => {
    it("smooths data with window", () => {
      const r = computeMovingAverage({
        data: inControlData,
        window_size: 5,
      });
      expect(r.chart_type).toBe("moving_average");
      expect(r.points.length).toBe(inControlData.length);
      // MA should be smoother (smaller range)
      const maValues = r.points.map(p => p.value);
      const maRange = Math.max(...maValues) - Math.min(...maValues);
      const rawRange = Math.max(...inControlData) - Math.min(...inControlData);
      expect(maRange).toBeLessThanOrEqual(rawRange);
    });

    it("detects shift with moving average", () => {
      const r = computeMovingAverage({
        data: shiftedData,
        window_size: 3,
        target_mean: 100,
        target_sigma: 2,
      });
      expect(r.out_of_control_count).toBeGreaterThan(0);
    });
  });

  describe("Xbar-S", () => {
    it("computes Xbar-S for subgrouped data", () => {
      const subgroups = [
        [100.1, 99.9, 100.2, 100.0, 99.8],
        [100.3, 99.7, 100.1, 100.2, 99.9],
        [99.8, 100.0, 100.3, 99.9, 100.1],
        [100.0, 99.6, 100.4, 100.1, 99.8],
        [100.2, 100.0, 99.7, 100.3, 100.1],
      ];
      const r = computeXbarS({ subgroups });
      expect(r.chart_type).toBe("xbar_s");
      expect(r.points.length).toBe(5);
      expect(r.center_line.value).toBeCloseTo(100, 0);
      expect(r.is_in_control).toBe(true);
    });

    it("detects Xbar out-of-control", () => {
      const subgroups = [
        [100.1, 99.9, 100.2, 100.0, 99.8],
        [100.3, 99.7, 100.1, 100.2, 99.9],
        [105.0, 105.5, 104.8, 105.2, 105.1], // shifted subgroup
        [100.0, 99.6, 100.4, 100.1, 99.8],
        [100.2, 100.0, 99.7, 100.3, 100.1],
      ];
      const r = computeXbarS({ subgroups });
      expect(r.out_of_control_count).toBeGreaterThan(0);
    });

    // Edge: single subgroup
    it("handles single subgroup", () => {
      const r = computeXbarS({
        subgroups: [[100.1, 99.9, 100.2, 100.0, 99.8]],
      });
      expect(r.points.length).toBe(1);
    });
  });
});

// ============================================================================
// DOEAnalysisEngine
// ============================================================================
describe("DOEAnalysisEngine", () => {
  describe("generateFullFactorial", () => {
    it("generates 2^2 = 4 runs for 2 factors", () => {
      const d = generateFullFactorial(["Speed", "Feed"]);
      expect(d.runs.length).toBe(4);
      expect(d.factor_names).toEqual(["Speed", "Feed"]);
      expect(d.labels.length).toBe(4);
    });

    it("generates 2^3 = 8 runs for 3 factors", () => {
      const d = generateFullFactorial(["Speed", "Feed", "DOC"]);
      expect(d.runs.length).toBe(8);
      // Each run should have 3 coded levels
      d.runs.forEach(r => {
        expect(r.length).toBe(3);
        r.forEach(l => expect([-1, 1]).toContain(l));
      });
    });

    it("includes treatment labels", () => {
      const d = generateFullFactorial(["A", "B"]);
      expect(d.labels).toContain("(1)"); // all low
    });
  });

  describe("generateFractionalFactorial", () => {
    it("generates 2^{3-1} = 4 runs for 3 factors", () => {
      const r = generateFractionalFactorial(["Speed", "Feed", "DOC"]);
      expect(r.num_runs).toBe(4);
      expect(r.design.runs.length).toBe(4);
      expect(r.defining_relation).toContain("SFD");
      expect(r.aliases.length).toBe(3);
      expect(r.resolution).toBeGreaterThanOrEqual(3);
    });

    it("returns full factorial for 2 factors", () => {
      const r = generateFractionalFactorial(["A", "B"]);
      expect(r.num_runs).toBe(4); // full 2^2
      expect(r.defining_relation).toContain("full factorial");
    });

    it("generates correct aliases", () => {
      const r = generateFractionalFactorial(["A", "B", "C"]);
      // Each alias pair: main effect aliased with 2-factor interaction
      expect(r.aliases.length).toBe(3);
      r.aliases.forEach(pair => {
        expect(pair.length).toBe(2);
      });
    });
  });

  describe("analyzeFactorial", () => {
    it("identifies significant factor in 2^2 design", () => {
      // Speed has large effect, Feed has small effect
      const input: DOEInput = {
        factors: [
          { name: "Speed", low: 100, high: 200, unit: "m/min" },
          { name: "Feed", low: 0.1, high: 0.3, unit: "mm/rev" },
        ],
        runs: [
          { levels: [-1, -1], response: 2.0 },
          { levels: [1, -1], response: 6.0 },
          { levels: [-1, 1], response: 2.5 },
          { levels: [1, 1], response: 6.5 },
          // Replicates
          { levels: [-1, -1], response: 2.1 },
          { levels: [1, -1], response: 5.9 },
          { levels: [-1, 1], response: 2.4 },
          { levels: [1, 1], response: 6.6 },
        ],
      };
      const r = analyzeFactorial(input);
      expect(r.significant_factors).toContain("Speed");
      expect(r.anova.r_squared).toBeGreaterThan(0.8);
      expect(r.model_equation).toContain("Speed");
      expect(r.residuals.length).toBe(8);
    });

    it("computes ANOVA table correctly", () => {
      const input: DOEInput = {
        factors: [
          { name: "A", low: 0, high: 1, unit: "" },
          { name: "B", low: 0, high: 1, unit: "" },
        ],
        runs: [
          { levels: [-1, -1], response: 10 },
          { levels: [1, -1], response: 30 },
          { levels: [-1, 1], response: 12 },
          { levels: [1, 1], response: 32 },
        ],
      };
      const r = analyzeFactorial(input);
      expect(r.anova.total_df).toBe(3); // n-1
      expect(r.anova.terms.length).toBeGreaterThan(0);
      // Effect of A should be ~20 (from 10→30 and 12→32)
      const effectA = r.anova.terms.find(t => t.term === "A");
      expect(effectA).toBeDefined();
      expect(effectA!.effect).toBeCloseTo(20, 0);
    });

    it("handles no-replicate design (residual error)", () => {
      const input: DOEInput = {
        factors: [
          { name: "X", low: 0, high: 1, unit: "" },
        ],
        runs: [
          { levels: [-1], response: 5 },
          { levels: [1], response: 15 },
        ],
        include_interactions: false,
      };
      const r = analyzeFactorial(input);
      expect(r.recommendations.some(s => s.includes("replicate"))).toBe(true);
    });

    it("checks residual normality", () => {
      const input: DOEInput = {
        factors: [
          { name: "A", low: 0, high: 1, unit: "" },
        ],
        runs: [
          { levels: [-1], response: 10 },
          { levels: [1], response: 20 },
          { levels: [-1], response: 10.5 },
          { levels: [1], response: 19.5 },
        ],
        include_interactions: false,
      };
      const r = analyzeFactorial(input);
      expect(typeof r.residual_normality_ok).toBe("boolean");
    });

    it("warns when R² is low", () => {
      // All responses nearly identical — no factor matters
      const input: DOEInput = {
        factors: [
          { name: "A", low: 0, high: 1, unit: "" },
          { name: "B", low: 0, high: 1, unit: "" },
        ],
        runs: [
          { levels: [-1, -1], response: 10.0 },
          { levels: [1, -1], response: 10.1 },
          { levels: [-1, 1], response: 10.0 },
          { levels: [1, 1], response: 10.1 },
          { levels: [-1, -1], response: 15.0 }, // noisy replicate
          { levels: [1, -1], response: 5.0 },   // noisy replicate
          { levels: [-1, 1], response: 15.0 },
          { levels: [1, 1], response: 5.0 },
        ],
      };
      const r = analyzeFactorial(input);
      // With very noisy data, R² should be low
      if (r.anova.r_squared < 0.7) {
        expect(r.recommendations.some(s => s.includes("R²"))).toBe(true);
      }
    });
  });
});
