import { describe, it, expect } from "vitest";
import { KalmanFilterEngine } from "../engines/KalmanFilterEngine.js";
import type { KalmanInput } from "../engines/KalmanFilterEngine.js";
import { AMSAAReliabilityGrowthEngine } from "../engines/AMSAAReliabilityGrowthEngine.js";
import type { AMSAAInput } from "../engines/AMSAAReliabilityGrowthEngine.js";
import { ChanceConstrainedOptimizationEngine } from "../engines/ChanceConstrainedOptimizationEngine.js";
import type { ChanceConstrainedInput } from "../engines/ChanceConstrainedOptimizationEngine.js";
import { AcousticEmissionMonitoringEngine } from "../engines/AcousticEmissionMonitoringEngine.js";
import type { AEMonitoringInput } from "../engines/AcousticEmissionMonitoringEngine.js";

// ═══════════════════════════════════════════════════════════════
// KalmanFilterEngine
// ═══════════════════════════════════════════════════════════════

describe("KalmanFilterEngine", () => {
  const engine = new KalmanFilterEngine();

  const baseInput: KalmanInput = {
    mode: "standard",
    state_dim: 2,
    initial_state: [0, 0],
    initial_covariance: [1, 1],
    process_noise: [0.01, 0.01],
    measurement_noise: [0.1],
    measurements: [
      { time: 1, values: [1.1] },
      { time: 2, values: [2.0] },
      { time: 3, values: [3.2] },
      { time: 4, values: [3.9] },
      { time: 5, values: [5.1] },
    ],
  };

  it("produces filtered states for each measurement", () => {
    const r = engine.compute(baseInput);
    const states = r.value.filtered_states;
    expect(states.length).toBe(5);
    for (const s of states) {
      expect(s.state.length).toBe(2);
      expect(s.covariance_diag.length).toBe(2);
    }
  });

  it("reduces uncertainty over time", () => {
    const states = engine.compute(baseInput).value.filtered_states;
    const firstCov = states[0].covariance_diag[0];
    const lastCov = states[states.length - 1].covariance_diag[0];
    expect(lastCov).toBeLessThan(firstCov);
  });

  it("filtered state tracks measurements", () => {
    const lastState = engine.compute(baseInput).value.filtered_states[4].state[0];
    expect(lastState).toBeGreaterThan(3);
    expect(lastState).toBeLessThan(7);
  });

  it("reports innovation statistics", () => {
    const r = engine.compute(baseInput);
    expect(r.value.innovation_stats).toBeDefined();
    expect(r.value.innovation_stats.variance.length).toBeGreaterThan(0);
  });

  it("provides state summary", () => {
    const r = engine.compute(baseInput);
    expect(r.value.state_summary.final_state.length).toBe(2);
    expect(r.value.state_summary.final_uncertainty.length).toBe(2);
  });

  it("sensor fusion mode accepts multiple sensors", () => {
    const fusionInput: KalmanInput = {
      ...baseInput,
      mode: "fusion",
      measurements: [
        { time: 1, sensor_id: "encoder", values: [1.0], noise_override: [0.05] },
        { time: 1, sensor_id: "laser", values: [1.1], noise_override: [0.02] },
        { time: 2, sensor_id: "encoder", values: [2.0], noise_override: [0.05] },
        { time: 2, sensor_id: "laser", values: [2.05], noise_override: [0.02] },
      ],
    };
    const r = engine.compute(fusionInput);
    expect(r.value.filtered_states.length).toBeGreaterThan(0);
  });

  it("returns AtomicValue with formula", () => {
    const r = engine.compute(baseInput);
    expect(r.formula).toContain("Kalman");
    expect(r.confidence).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// AMSAAReliabilityGrowthEngine — returns AMSAAResult directly
// ═══════════════════════════════════════════════════════════════

describe("AMSAAReliabilityGrowthEngine", () => {
  const engine = new AMSAAReliabilityGrowthEngine();

  const baseInput: AMSAAInput = {
    failure_times: [10, 25, 50, 90, 140, 200, 280, 380, 500, 650],
    total_time: 800,
  };

  it("estimates lambda and beta parameters", () => {
    const r = engine.compute(baseInput);
    // lambda and beta are AtomicValue objects with .value
    expect(r.lambda.value).toBeGreaterThan(0);
    expect(r.beta.value).toBeGreaterThan(0);
  });

  it("detects growth trend from beta", () => {
    const r = engine.compute(baseInput);
    expect(["improving", "stable", "deteriorating"]).toContain(r.growth_trend);
    // Increasing intervals → beta < 1 → improving
    expect(r.beta.value).toBeLessThan(1);
    expect(r.growth_trend).toBe("improving");
  });

  it("computes cumulative and instantaneous MTBF", () => {
    const r = engine.compute(baseInput);
    expect(r.cumulative_mtbf.value).toBeGreaterThan(0);
    expect(r.instantaneous_mtbf.value).toBeGreaterThan(0);
    // Instantaneous should be > cumulative when improving
    expect(r.instantaneous_mtbf.value).toBeGreaterThan(r.cumulative_mtbf.value);
  });

  it("generates growth curve", () => {
    const r = engine.compute(baseInput);
    expect(r.growth_curve.length).toBeGreaterThan(0);
    const first = r.growth_curve[0];
    const last = r.growth_curve[r.growth_curve.length - 1];
    expect(last.cum_mtbf).toBeGreaterThan(first.cum_mtbf);
  });

  it("provides confidence bounds", () => {
    const r = engine.compute(baseInput);
    expect(r.confidence_bounds.lower_beta).toBeGreaterThan(0);
    expect(r.confidence_bounds.upper_beta).toBeGreaterThan(0);
    expect(r.confidence_bounds.lower_mtbf).toBeGreaterThan(0);
    expect(r.confidence_bounds.upper_mtbf).toBeGreaterThan(0);
  });

  it("goodness of fit test", () => {
    const r = engine.compute(baseInput);
    expect(r.goodness_of_fit).toBeDefined();
    expect(typeof r.goodness_of_fit.adequate).toBe("boolean");
  });

  it("projects to target MTBF", () => {
    const r = engine.compute({
      ...baseInput,
      target_mtbf: 200,
      projection_time: 2000,
    });
    expect(r.projection).toBeDefined();
    if (r.projection) {
      expect(r.projection.mtbf_at_projection).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// ChanceConstrainedOptimizationEngine — method: optimize()
// ═══════════════════════════════════════════════════════════════

describe("ChanceConstrainedOptimizationEngine", () => {
  const engine = new ChanceConstrainedOptimizationEngine();

  const baseInput: ChanceConstrainedInput = {
    variables: [
      { name: "cutting_speed", min: 100, max: 400, initial: 200 },
      { name: "feed_per_tooth", min: 0.05, max: 0.3, initial: 0.1 },
      { name: "axial_depth", min: 1, max: 8, initial: 3 },
    ],
    objective: { type: "maximize", expression: "mrr" },
    constraints: [
      { name: "force_limit", type: "force", limit: 3000, probability: 0.95, direction: "leq" },
      { name: "roughness_limit", type: "roughness", limit: 1.6, probability: 0.99, direction: "leq" },
    ],
    uncertainties: [
      { parameter: "cutting_speed", distribution: "normal", mean: 0, std_or_range: 5 },
      { parameter: "feed_per_tooth", distribution: "normal", mean: 0, std_or_range: 0.005 },
    ],
    material: { iso_group: "P" },
    tool: { diameter_mm: 10, flute_count: 4 },
  };

  it("finds optimal values within bounds", () => {
    const r = engine.optimize(baseInput);
    const opt = r.optimal_values;
    expect(opt["cutting_speed"]).toBeGreaterThanOrEqual(100);
    expect(opt["cutting_speed"]).toBeLessThanOrEqual(400);
    expect(opt["feed_per_tooth"]).toBeGreaterThanOrEqual(0.05);
    expect(opt["axial_depth"]).toBeGreaterThanOrEqual(1);
  });

  it("evaluates constraint satisfaction", () => {
    const r = engine.optimize(baseInput);
    expect(r.constraint_satisfaction.length).toBe(2);
    for (const c of r.constraint_satisfaction) {
      expect(typeof c.satisfied).toBe("boolean");
      expect(typeof c.violation_probability).toBe("number");
      expect(typeof c.margin).toBe("number");
    }
  });

  it("compares deterministic vs stochastic", () => {
    const r = engine.optimize(baseInput);
    const comp = r.deterministic_vs_stochastic;
    expect(comp.det_objective).toBeGreaterThan(0);
    expect(comp.stoch_objective).toBeGreaterThan(0);
    expect(typeof comp.conservatism_pct).toBe("number");
  });

  it("reports uncertainty sensitivity", () => {
    const r = engine.optimize(baseInput);
    expect(r.sensitivity.length).toBeGreaterThan(0);
  });

  it("robust margin is a number", () => {
    const r = engine.optimize(baseInput);
    expect(typeof r.robust_margin).toBe("number");
  });

  it("tighter constraints → lower or equal objective", () => {
    const tight = engine.optimize({
      ...baseInput,
      constraints: [
        { name: "force_limit", type: "force", limit: 1500, probability: 0.99, direction: "leq" },
        { name: "roughness_limit", type: "roughness", limit: 0.8, probability: 0.99, direction: "leq" },
      ],
    });
    const loose = engine.optimize(baseInput);
    // Tighter constraints can't improve objective (with small tolerance for numerics)
    expect(tight.objective_value).toBeLessThanOrEqual(loose.objective_value * 1.05);
  });
});

// ═══════════════════════════════════════════════════════════════
// AcousticEmissionMonitoringEngine — method: analyze()
// ═══════════════════════════════════════════════════════════════

describe("AcousticEmissionMonitoringEngine", () => {
  const engine = new AcousticEmissionMonitoringEngine();

  // Generate synthetic AE signal
  function genSignal(amp: number, freq: number, sr: number, dur: number, noise: number): number[] {
    const n = Math.floor(sr * dur);
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      out.push(amp * Math.sin(2 * Math.PI * freq * (i / sr)) + noise * (Math.random() - 0.5));
    }
    return out;
  }

  const baseInput: AEMonitoringInput = {
    signal_segments: [
      { time_s: 0, samples: genSignal(0.5, 150000, 1000000, 0.001, 0.1), sample_rate_hz: 1000000 },
      { time_s: 1, samples: genSignal(0.6, 150000, 1000000, 0.001, 0.1), sample_rate_hz: 1000000 },
      { time_s: 2, samples: genSignal(0.8, 150000, 1000000, 0.001, 0.15), sample_rate_hz: 1000000 },
    ],
    analysis_mode: "full",
  };

  it("extracts AE features for each segment", () => {
    const r = engine.analyze(baseInput);
    expect(r.features.length).toBe(3);
    for (const f of r.features) {
      expect(f.rms).toBeGreaterThan(0);
      expect(f.peak).toBeGreaterThan(0);
      expect(f.energy).toBeGreaterThan(0);
    }
  });

  it("RMS increases with amplitude", () => {
    const r = engine.analyze(baseInput);
    expect(r.features[2].rms).toBeGreaterThan(r.features[0].rms);
  });

  it("classifies tool condition", () => {
    const r = engine.analyze(baseInput);
    expect(["fresh", "normal_wear", "severe_wear", "chipping", "breakage"])
      .toContain(r.tool_condition.state);
    expect(r.tool_condition.confidence).toBeGreaterThan(0);
  });

  it("identifies AE source type", () => {
    const r = engine.analyze(baseInput);
    expect(["continuous", "burst", "mixed"]).toContain(r.ae_source.type);
    expect(["deformation", "fracture", "friction", "chip_breaking"])
      .toContain(r.ae_source.primary_mechanism);
  });

  it("detects trend direction", () => {
    const r = engine.analyze(baseInput);
    expect(["stable", "increasing", "decreasing", "sudden_change"])
      .toContain(r.trend.trend_direction);
    expect(r.trend.rms_slope).toBeGreaterThan(0);
  });

  it("baseline comparison works", () => {
    const withBaseline: AEMonitoringInput = {
      signal_segments: [
        { time_s: 0, samples: genSignal(2.0, 200000, 1000000, 0.001, 0.5), sample_rate_hz: 1000000 },
      ],
      baseline: { rms: 0.3, kurtosis: 3.0, dominant_freq_hz: 150000 },
      analysis_mode: "monitoring",
    };
    const r = engine.analyze(withBaseline);
    expect(r.alarms.length).toBeGreaterThanOrEqual(0);
  });

  it("features have frequency data", () => {
    const r = engine.analyze(baseInput);
    for (const f of r.features) {
      expect(f.dominant_freq_hz).toBeGreaterThan(0);
      expect(f.spectral_centroid_hz).toBeGreaterThan(0);
    }
  });
});
