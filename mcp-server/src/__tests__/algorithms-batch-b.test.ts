import { describe, it, expect } from "vitest";

import { DigitalTwinEstimator } from "../algorithms/DigitalTwinEstimator.js";
import { DPMultiPass } from "../algorithms/DPMultiPass.js";
import { EnsemblePredictorModel } from "../algorithms/EnsemblePredictorModel.js";
import { FEASolver2D } from "../algorithms/FEASolver2D.js";
import { FFTAnalyzer } from "../algorithms/FFTAnalyzer.js";
import { FRFStabilityLobe } from "../algorithms/FRFStabilityLobe.js";
import { GeneticOptimizer } from "../algorithms/GeneticOptimizer.js";
import { ILPAssignment } from "../algorithms/ILPAssignment.js";
import { JaegerTempField } from "../algorithms/JaegerTempField.js";
import { MinkowskiSum } from "../algorithms/MinkowskiSum.js";
import { NeuralInference } from "../algorithms/NeuralInference.js";
import { ParticleSwarm } from "../algorithms/ParticleSwarm.js";

// ── DigitalTwinEstimator ─────────────────────────────────────────────

describe("DigitalTwinEstimator", () => {
  const algo = new DigitalTwinEstimator();

  it("returns valid metadata", () => {
    const meta = algo.getMetadata();
    expect(meta.id).toBe("digital-twin-estimator");
    expect(meta.domain).toBe("control");
  });

  it("validates empty states array", () => {
    const res = algo.validate({ states: [] });
    expect(res.valid).toBe(false);
  });

  it("validates missing model_value", () => {
    const res = algo.validate({ states: [{ name: "temp", model_value: undefined as unknown as number }] });
    expect(res.valid).toBe(false);
  });

  it("validates correct input", () => {
    const res = algo.validate({
      states: [{ name: "spindle_temp", model_value: 45 }],
    });
    expect(res.valid).toBe(true);
  });

  it("computes model-only estimate when no sensor data", () => {
    const result = algo.calculate({
      states: [{ name: "spindle_temp", model_value: 45, unit: "C" }],
    });
    expect(result.estimates).toHaveLength(1);
    expect(result.estimates[0].source).toBe("model");
    expect(result.estimates[0].fused_value).toBe(45);
    expect(result.estimates[0].sensor_value).toBeNull();
    expect(result.overall_health).toBe(1.0);
    expect(result.anomalies).toHaveLength(0);
  });

  it("fuses model and sensor data via complementary filter", () => {
    const result = algo.calculate({
      states: [
        { name: "temp", model_value: 50, sensor_value: 48, model_confidence: 0.6, sensor_noise: 0.2 },
      ],
    });
    const est = result.estimates[0];
    expect(est.source).toBe("fused");
    expect(est.fused_value).toBeGreaterThan(47);
    expect(est.fused_value).toBeLessThan(51);
    expect(est.confidence).toBeGreaterThan(0);
    expect(est.deviation_pct).toBeGreaterThan(0);
  });

  it("detects anomaly when deviation exceeds threshold", () => {
    const result = algo.calculate({
      states: [
        { name: "force", model_value: 100, sensor_value: 200 },
      ],
      health_threshold_pct: 10,
    });
    expect(result.anomalies.length).toBeGreaterThan(0);
    expect(result.overall_health).toBeLessThan(1);
  });

  it("applies temporal smoothing with previous estimates", () => {
    const result = algo.calculate({
      states: [{ name: "temp", model_value: 60 }],
      previous_estimates: { temp: 40 },
      smoothing: 0.5,
    });
    // fused = 0.5 * 40 + 0.5 * 60 = 50
    expect(result.estimates[0].fused_value).toBeCloseTo(50, 5);
  });

  it("handles multiple states", () => {
    const result = algo.calculate({
      states: [
        { name: "temp", model_value: 50, sensor_value: 52 },
        { name: "force", model_value: 800, sensor_value: 790 },
        { name: "vibration", model_value: 0.3 },
      ],
    });
    expect(result.estimates).toHaveLength(3);
    expect(result.model_sensor_agreement).toBeGreaterThan(0);
  });
});

// ── DPMultiPass ──────────────────────────────────────────────────────

describe("DPMultiPass", () => {
  const algo = new DPMultiPass();

  it("returns valid metadata", () => {
    const meta = algo.getMetadata();
    expect(meta.id).toBe("dp-multi-pass");
  });

  it("validates missing total_stock", () => {
    const res = algo.validate({ total_stock: 0, workpiece_diameter: 50, cut_length: 100 });
    expect(res.valid).toBe(false);
  });

  it("validates stock exceeding half diameter", () => {
    const res = algo.validate({ total_stock: 30, workpiece_diameter: 50, cut_length: 100 });
    expect(res.valid).toBe(false);
  });

  it("validates min_depth >= max_depth", () => {
    const res = algo.validate({
      total_stock: 3, workpiece_diameter: 50, cut_length: 100,
      min_depth: 5, max_depth: 3,
    });
    expect(res.valid).toBe(false);
  });

  it("validates correct input", () => {
    const res = algo.validate({ total_stock: 4, workpiece_diameter: 50, cut_length: 100 });
    expect(res.valid).toBe(true);
  });

  it("computes optimal multi-pass allocation for turning", () => {
    const result = algo.calculate({
      total_stock: 4,
      workpiece_diameter: 60,
      cut_length: 100,
      cutting_speed: 200,
      feed_rate: 0.3,
      max_power: 15,
    });
    expect(result.n_passes).toBeGreaterThanOrEqual(1);
    expect(result.passes.length).toBe(result.n_passes);
    expect(result.total_time).toBeGreaterThan(0);
    expect(result.feasible).toBe(true);
    // Sum of depths should equal total stock
    const totalDepth = result.passes.reduce((s, p) => s + p.depth_of_cut, 0);
    expect(totalDepth).toBeCloseTo(4, 0);
  });

  it("produces savings_pct field", () => {
    const result = algo.calculate({
      total_stock: 6,
      workpiece_diameter: 80,
      cut_length: 150,
    });
    expect(typeof result.savings_pct).toBe("number");
    expect(result.total_time_with_changes).toBeGreaterThanOrEqual(result.total_time);
  });

  it("handles small stock requiring single pass", () => {
    const result = algo.calculate({
      total_stock: 1,
      workpiece_diameter: 50,
      cut_length: 80,
      min_depth: 0.5,
      max_depth: 5,
    });
    expect(result.n_passes).toBeGreaterThanOrEqual(1);
    expect(result.feasible).toBe(true);
  });
});

// ── EnsemblePredictorModel ───────────────────────────────────────────

describe("EnsemblePredictorModel", () => {
  const algo = new EnsemblePredictorModel();

  it("returns valid metadata", () => {
    const meta = algo.getMetadata();
    expect(meta.id).toBe("ensemble-predictor");
  });

  it("validates empty members", () => {
    const res = algo.validate({ members: [], problem_type: "prediction" });
    expect(res.valid).toBe(false);
  });

  it("validates invalid problem_type", () => {
    const res = algo.validate({
      members: [{ algorithm: "a", prediction: 1 }],
      problem_type: "invalid" as unknown as string,
    });
    expect(res.valid).toBe(false);
  });

  it("warns for single member ensemble", () => {
    const res = algo.validate({
      members: [{ algorithm: "a", prediction: 1 }],
      problem_type: "prediction",
    });
    expect(res.valid).toBe(true);
    expect(res.issues.some(i => i.severity === "warning")).toBe(true);
  });

  it("combines predictions via weighted average", () => {
    const result = algo.calculate({
      members: [
        { algorithm: "taylor", prediction: 45, weight: 2, confidence: 0.8 },
        { algorithm: "neural", prediction: 50, weight: 1, confidence: 0.6 },
      ],
      problem_type: "tool_life",
    });
    // Weighted avg: (45*2 + 50*1) / 3 = 140/3 ≈ 46.67
    expect(result.prediction).toBeCloseTo(140 / 3, 1);
    expect(result.method).toBe("weighted_average");
    expect(result.num_contributors).toBe(2);
    expect(result.agreement).toBeGreaterThan(0);
    expect(result.spread).not.toBeNull();
  });

  it("combines classifications via voting", () => {
    const result = algo.calculate({
      members: [
        { algorithm: "fft", prediction: "chatter", weight: 2 },
        { algorithm: "accel", prediction: "stable", weight: 1 },
        { algorithm: "mic", prediction: "chatter", weight: 1 },
      ],
      problem_type: "chatter",
    });
    expect(result.prediction).toBe("chatter");
    expect(result.method).toBe("voting");
    expect(result.agreement).toBeCloseTo(3 / 4, 5); // 3 out of 4 total weight
  });

  it("selects best objective for optimization", () => {
    const result = algo.calculate({
      members: [
        { algorithm: "ga", prediction: 120, objective: 8.5, feasible: true },
        { algorithm: "pso", prediction: 115, objective: 7.2, feasible: true },
        { algorithm: "sa", prediction: 125, objective: 9.0, feasible: false },
      ],
      problem_type: "optimization",
    });
    expect(result.prediction).toBe(115); // lowest objective among feasible
    expect(result.method).toBe("best_objective");
  });

  it("handles all infeasible solutions", () => {
    const result = algo.calculate({
      members: [
        { algorithm: "ga", prediction: 10, objective: 5, feasible: false },
        { algorithm: "pso", prediction: 20, objective: 3, feasible: false },
      ],
      problem_type: "scheduling",
    });
    expect(result.warnings.some(w => w.includes("NO_FEASIBLE"))).toBe(true);
    expect(result.prediction).toBe(20); // best objective even if infeasible
  });

  it("detects low consensus", () => {
    const result = algo.calculate({
      members: [
        { algorithm: "a", prediction: "stable", weight: 1 },
        { algorithm: "b", prediction: "chatter", weight: 1 },
        { algorithm: "c", prediction: "rattle", weight: 1 },
      ],
      problem_type: "classification",
      consensus_threshold: 0.5,
    });
    expect(result.consensus_reached).toBe(false);
  });
});

// ── FEASolver2D ──────────────────────────────────────────────────────

describe("FEASolver2D", () => {
  const algo = new FEASolver2D();

  // A simple right triangle mesh: 3 nodes, 1 element
  const simpleInput = {
    nodes: [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 10, y: 0 },
      { id: 3, x: 0, y: 10 },
    ],
    elements: [{ id: 1, nodes: [1, 2, 3] as [number, number, number] }],
    boundary_conditions: [
      { node_id: 1, dof: "xy" as const },
      { node_id: 2, dof: "y" as const },
    ],
    loads: [{ node_id: 3, fx: 0, fy: -1000 }],
    E: 200000,
    nu: 0.3,
    thickness: 1,
  };

  it("returns valid metadata", () => {
    const meta = algo.getMetadata();
    expect(meta.id).toBe("fea-solver-2d");
    expect(meta.safety_class).toBe("critical");
  });

  it("validates missing nodes", () => {
    const res = algo.validate({ ...simpleInput, nodes: [] });
    expect(res.valid).toBe(false);
  });

  it("validates missing loads", () => {
    const res = algo.validate({ ...simpleInput, loads: [] });
    expect(res.valid).toBe(false);
  });

  it("validates correct input", () => {
    const res = algo.validate(simpleInput);
    expect(res.valid).toBe(true);
  });

  it("solves single triangle under load", () => {
    const result = algo.calculate(simpleInput);
    expect(result.displacements).toHaveLength(3);
    expect(result.element_results).toHaveLength(1);
    expect(result.max_displacement).toBeGreaterThan(0);
    expect(result.max_von_mises).toBeGreaterThan(0);
    expect(result.n_dofs).toBe(6);
    // Node 1 is fixed in xy, so its displacements should be ~0
    const node1 = result.displacements.find(d => d.node_id === 1)!;
    expect(Math.abs(node1.dx)).toBeLessThan(1e-6);
    expect(Math.abs(node1.dy)).toBeLessThan(1e-6);
  });

  it("computes von Mises stress correctly", () => {
    const result = algo.calculate(simpleInput);
    const elem = result.element_results[0];
    // Von Mises should be consistent with stress components
    const vmCheck = Math.sqrt(
      elem.stress_xx ** 2 - elem.stress_xx * elem.stress_yy +
      elem.stress_yy ** 2 + 3 * elem.stress_xy ** 2
    );
    expect(elem.von_mises).toBeCloseTo(vmCheck, 5);
  });

  it("reports reaction forces at constrained nodes", () => {
    const result = algo.calculate(simpleInput);
    expect(result.reaction_forces.length).toBeGreaterThan(0);
  });

  it("handles plane_strain analysis type", () => {
    const result = algo.calculate({ ...simpleInput, analysis_type: "plane_strain" });
    expect(result.calculation_method).toContain("plane_strain");
    expect(result.max_displacement).toBeGreaterThan(0);
  });
});

// ── FFTAnalyzer ──────────────────────────────────────────────────────

describe("FFTAnalyzer", () => {
  const algo = new FFTAnalyzer();

  it("returns valid metadata", () => {
    const meta = algo.getMetadata();
    expect(meta.id).toBe("fft-analyzer");
  });

  it("validates too few samples", () => {
    const res = algo.validate({ signal: [1, 2], sample_rate: 1000 });
    expect(res.valid).toBe(false);
  });

  it("validates missing sample_rate", () => {
    const res = algo.validate({ signal: [1, 2, 3, 4], sample_rate: 0 });
    expect(res.valid).toBe(false);
  });

  it("detects single-frequency sinusoid", () => {
    const fs = 1000; // 1 kHz sampling
    const f0 = 100;  // 100 Hz signal
    const N = 256;
    const signal = Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * f0 * i / fs));

    const result = algo.calculate({ signal, sample_rate: fs, window: "rectangular" });

    expect(result.nyquist_frequency).toBe(500);
    expect(result.n_fft).toBe(256);
    expect(result.frequency_resolution).toBeCloseTo(fs / 256, 5);
    // Dominant peak should be near 100 Hz
    expect(result.dominant_peaks.length).toBeGreaterThan(0);
    const mainPeak = result.dominant_peaks[0];
    expect(Math.abs(mainPeak.frequency - f0)).toBeLessThan(10);
    expect(mainPeak.magnitude).toBeGreaterThan(0);
  });

  it("computes PSD when requested", () => {
    const signal = Array.from({ length: 64 }, (_, i) => Math.cos(2 * Math.PI * 50 * i / 512));
    const result = algo.calculate({ signal, sample_rate: 512, compute_psd: true });
    expect(result.psd.length).toBeGreaterThan(0);
  });

  it("respects frequency range filter", () => {
    const fs = 1000;
    const N = 128;
    const signal = Array.from({ length: N }, (_, i) =>
      Math.sin(2 * Math.PI * 50 * i / fs) + Math.sin(2 * Math.PI * 300 * i / fs));

    const result = algo.calculate({
      signal, sample_rate: fs,
      min_frequency: 200, max_frequency: 400,
      window: "rectangular",
    });
    // Peaks should only be in the 200-400 Hz range
    for (const peak of result.dominant_peaks) {
      expect(peak.frequency).toBeGreaterThanOrEqual(200);
      expect(peak.frequency).toBeLessThanOrEqual(400);
    }
  });

  it("zero-pads to next power of 2", () => {
    const signal = Array.from({ length: 100 }, () => 1);
    const result = algo.calculate({ signal, sample_rate: 1000 });
    expect(result.n_fft).toBe(128); // next power of 2 after 100
  });

  it("supports different window functions", () => {
    const signal = Array.from({ length: 64 }, (_, i) => Math.sin(2 * Math.PI * 10 * i / 64));
    for (const win of ["hann", "hamming", "blackman", "flattop"] as const) {
      const result = algo.calculate({ signal, sample_rate: 64, window: win });
      expect(result.calculation_method).toContain(win);
    }
  });

  it("reports dc_component and total_power", () => {
    const signal = Array.from({ length: 32 }, () => 5); // DC only
    const result = algo.calculate({ signal, sample_rate: 100, window: "rectangular" });
    expect(result.dc_component).toBeGreaterThan(0);
    expect(result.total_power).toBeGreaterThan(0);
  });
});

// ── FRFStabilityLobe ─────────────────────────────────────────────────

describe("FRFStabilityLobe", () => {
  const algo = new FRFStabilityLobe();

  // Synthetic SDOF FRF: single mode at 1000 Hz
  function generateFRF(fn: number, k: number, zeta: number, nPts: number): Array<{ frequency: number; compliance: { real: number; imag: number } }> {
    const frf = [];
    for (let i = 0; i < nPts; i++) {
      const f = 100 + (i / (nPts - 1)) * 3900; // 100-4000 Hz
      const omega = 2 * Math.PI * f;
      const omega_n = 2 * Math.PI * fn;
      const r = omega / omega_n;
      const denom_r = (1 - r * r) ** 2 + (2 * zeta * r) ** 2;
      const real = (1 - r * r) / (k * denom_r);
      const imag = -(2 * zeta * r) / (k * denom_r);
      frf.push({ frequency: f, compliance: { real, imag } });
    }
    return frf;
  }

  const frfData = generateFRF(1000, 1e7, 0.03, 50);

  it("returns valid metadata", () => {
    const meta = algo.getMetadata();
    expect(meta.id).toBe("frf-stability-lobe");
    expect(meta.safety_class).toBe("critical");
  });

  it("validates too few FRF points", () => {
    const res = algo.validate({ frf_data: frfData.slice(0, 5), n_flutes: 4 });
    expect(res.valid).toBe(false);
  });

  it("validates missing flutes", () => {
    const res = algo.validate({ frf_data: frfData, n_flutes: 0 });
    expect(res.valid).toBe(false);
  });

  it("validates correct input", () => {
    const res = algo.validate({ frf_data: frfData, n_flutes: 4 });
    expect(res.valid).toBe(true);
  });

  it("computes stability boundary", () => {
    const result = algo.calculate({
      frf_data: frfData,
      n_flutes: 4,
      Kt: 2000,
      speed_min: 2000,
      speed_max: 15000,
      n_speed_points: 50,
      n_lobes: 5,
    });
    expect(result.stability_boundary.length).toBeGreaterThan(0);
    expect(result.min_stable_depth).toBeGreaterThan(0);
    expect(result.speed_at_min_depth).toBeGreaterThanOrEqual(2000);
    expect(result.critical_frequency).toBeGreaterThan(0);
    expect(result.n_modes).toBeGreaterThanOrEqual(1);
  });

  it("boundary points have valid lobe numbers", () => {
    const result = algo.calculate({
      frf_data: frfData,
      n_flutes: 2,
      n_lobes: 3,
      n_speed_points: 30,
    });
    for (const pt of result.stability_boundary) {
      expect(pt.lobe_number).toBeGreaterThanOrEqual(0);
      expect(pt.lobe_number).toBeLessThan(3);
      expect(pt.depth_limit_mm).toBeGreaterThan(0);
    }
  });
});

// ── GeneticOptimizer ─────────────────────────────────────────────────

describe("GeneticOptimizer", () => {
  const algo = new GeneticOptimizer();

  it("returns valid metadata", () => {
    const meta = algo.getMetadata();
    expect(meta.id).toBe("genetic-optimizer");
  });

  it("validates missing bounds", () => {
    const res = algo.validate({
      objectives: 1, dimensions: 2,
      lower_bounds: [], upper_bounds: [10, 20],
    });
    expect(res.valid).toBe(false);
  });

  it("validates bounds length mismatch", () => {
    const res = algo.validate({
      objectives: 1, dimensions: 3,
      lower_bounds: [0, 0], upper_bounds: [10, 10],
    });
    expect(res.valid).toBe(false);
  });

  it("validates lower >= upper", () => {
    const res = algo.validate({
      objectives: 1, dimensions: 2,
      lower_bounds: [5, 0], upper_bounds: [3, 10],
    });
    expect(res.valid).toBe(false);
  });

  it("optimizes a simple sphere function with seed", () => {
    const result = algo.calculate({
      objectives: 1,
      dimensions: 2,
      lower_bounds: [-5, -5],
      upper_bounds: [5, 5],
      population_size: 30,
      generations: 50,
      seed: 42,
    });
    expect(result.best_solution).toHaveLength(2);
    expect(result.best_objectives).toHaveLength(1);
    // Default fitness is distance from midpoint (0,0), should converge near 0
    expect(result.best_objectives[0]).toBeGreaterThanOrEqual(0);
    expect(result.generations_run).toBe(50);
    expect(result.convergence_history).toHaveLength(50);
    expect(result.population_size).toBe(30);
  });

  it("produces deterministic results with same seed", () => {
    const input = {
      objectives: 1, dimensions: 2,
      lower_bounds: [0, 0], upper_bounds: [10, 10],
      population_size: 20, generations: 30, seed: 123,
    };
    const r1 = algo.calculate(input);
    const r2 = algo.calculate(input);
    expect(r1.best_solution).toEqual(r2.best_solution);
    expect(r1.best_objectives).toEqual(r2.best_objectives);
  });

  it("returns Pareto front for multi-objective", () => {
    const result = algo.calculate({
      objectives: 2,
      dimensions: 2,
      lower_bounds: [0, 0],
      upper_bounds: [10, 10],
      population_size: 30,
      generations: 30,
      seed: 99,
    });
    expect(result.pareto_front.length).toBeGreaterThan(0);
    for (const sol of result.pareto_front) {
      expect(sol.rank).toBe(1);
      expect(sol.parameters).toHaveLength(2);
      expect(sol.objectives).toHaveLength(2);
    }
  });

  it("uses custom fitness function", () => {
    const result = algo.calculate({
      objectives: 1,
      dimensions: 1,
      lower_bounds: [0],
      upper_bounds: [10],
      population_size: 20,
      generations: 50,
      seed: 7,
      fitness_fn: (p: number[]) => [(p[0] - 3) ** 2],
    });
    // Should converge toward x=3
    expect(Math.abs(result.best_solution[0] - 3)).toBeLessThan(2);
  });
});

// ── ILPAssignment ────────────────────────────────────────────────────

describe("ILPAssignment", () => {
  const algo = new ILPAssignment();

  it("returns valid metadata", () => {
    const meta = algo.getMetadata();
    expect(meta.id).toBe("ilp-assignment");
  });

  it("validates empty jobs", () => {
    const res = algo.validate({ jobs: [], machines: [{ id: "M1" }] } as Record<string, unknown>);
    expect(res.valid).toBe(false);
  });

  it("validates processing_times length mismatch", () => {
    const res = algo.validate({
      jobs: [{ id: "J1", processing_times: [10] }],
      machines: [{ id: "M1" }, { id: "M2" }],
    });
    expect(res.valid).toBe(false);
  });

  it("solves 2 jobs x 2 machines (1:1 Hungarian)", () => {
    const result = algo.calculate({
      jobs: [
        { id: "J1", processing_times: [10, 20] },
        { id: "J2", processing_times: [15, 5] },
      ],
      machines: [{ id: "M1" }, { id: "M2" }],
      objective: "min_time",
    });
    expect(result.assignments).toHaveLength(2);
    // Optimal: J1→M1 (10), J2→M2 (5) = 15 total
    expect(result.total_time).toBe(15);
    expect(result.optimal).toBe(true);
    expect(result.makespan).toBeGreaterThan(0);
  });

  it("handles more jobs than machines (greedy path)", () => {
    const result = algo.calculate({
      jobs: [
        { id: "J1", processing_times: [10, 20] },
        { id: "J2", processing_times: [15, 5] },
        { id: "J3", processing_times: [8, 12] },
      ],
      machines: [{ id: "M1" }, { id: "M2" }],
    });
    expect(result.assignments).toHaveLength(3);
    expect(result.machine_loads).toHaveLength(2);
  });

  it("detects tardy jobs", () => {
    const result = algo.calculate({
      jobs: [
        { id: "J1", processing_times: [100], due_date: 50 },
      ],
      machines: [{ id: "M1" }],
    });
    expect(result.n_tardy).toBe(1);
    expect(result.assignments[0].tardy).toBe(true);
  });

  it("computes load_balance_cv", () => {
    const result = algo.calculate({
      jobs: [
        { id: "J1", processing_times: [10, 50] },
        { id: "J2", processing_times: [50, 10] },
      ],
      machines: [{ id: "M1" }, { id: "M2" }],
      objective: "balance_load",
    });
    expect(typeof result.load_balance_cv).toBe("number");
  });

  it("handles infeasible assignments (-1 processing time)", () => {
    const result = algo.calculate({
      jobs: [
        { id: "J1", processing_times: [-1, 10] },
        { id: "J2", processing_times: [5, -1] },
      ],
      machines: [{ id: "M1" }, { id: "M2" }],
    });
    expect(result.assignments).toHaveLength(2);
    // J1 can only go to M2, J2 can only go to M1
    const j1 = result.assignments.find(a => a.job_id === "J1")!;
    const j2 = result.assignments.find(a => a.job_id === "J2")!;
    expect(j1.machine_id).toBe("M2");
    expect(j2.machine_id).toBe("M1");
  });
});

// ── JaegerTempField ──────────────────────────────────────────────────

describe("JaegerTempField", () => {
  const algo = new JaegerTempField();

  it("returns valid metadata", () => {
    const meta = algo.getMetadata();
    expect(meta.id).toBe("jaeger-temp-field");
    expect(meta.safety_class).toBe("critical");
  });

  it("validates missing heat_flux", () => {
    const res = algo.validate({
      heat_flux: 0, contact_half_width: 1, cutting_speed: 100,
    });
    expect(res.valid).toBe(false);
  });

  it("validates correct input", () => {
    const res = algo.validate({
      heat_flux: 10, contact_half_width: 1, cutting_speed: 100,
    });
    expect(res.valid).toBe(true);
  });

  it("warns for very high heat flux", () => {
    const res = algo.validate({
      heat_flux: 600, contact_half_width: 1, cutting_speed: 100,
    });
    expect(res.issues.some(i => i.severity === "warning")).toBe(true);
  });

  it("computes temperature field for steel grinding", () => {
    const result = algo.calculate({
      heat_flux: 20,
      contact_half_width: 2,
      cutting_speed: 30, // m/min
      thermal_conductivity: 50,
      thermal_diffusivity: 14,
      ambient_temp: 20,
      partition_ratio: 0.5,
      grid_resolution: 10,
    });
    expect(result.max_surface_temp).toBeGreaterThan(20);
    expect(result.peclet_number).toBeGreaterThan(0);
    expect(result.depth_profile.length).toBeGreaterThan(0);
    expect(result.temperature_field.length).toBeGreaterThan(0);
    expect(result.half_temp_depth).toBeGreaterThanOrEqual(0);
    // Temperature should decrease with depth
    const depthTemps = result.depth_profile.map(d => d.temperature);
    expect(depthTemps[0]).toBeGreaterThanOrEqual(depthTemps[depthTemps.length - 1]);
  });

  it("detects burn risk at high heat flux", () => {
    const result = algo.calculate({
      heat_flux: 200,
      contact_half_width: 3,
      cutting_speed: 20,
      thermal_conductivity: 50,
      thermal_diffusivity: 14,
      partition_ratio: 0.8,
    });
    expect(result.burn_risk).toBe(true);
    expect(result.warnings.some(w => w.includes("BURN"))).toBe(true);
  });

  it("no burn risk at low heat flux", () => {
    const result = algo.calculate({
      heat_flux: 2,
      contact_half_width: 0.5,
      cutting_speed: 200,
      partition_ratio: 0.3,
    });
    expect(result.burn_risk).toBe(false);
  });

  it("reports leading and trailing edge temperatures", () => {
    const result = algo.calculate({
      heat_flux: 15,
      contact_half_width: 2,
      cutting_speed: 50,
    });
    expect(result.trailing_edge_temp).toBeGreaterThan(0);
    expect(result.leading_edge_temp).toBeGreaterThan(0);
  });
});

// ── MinkowskiSum ─────────────────────────────────────────────────────

describe("MinkowskiSum", () => {
  const algo = new MinkowskiSum();

  const square: Array<{ x: number; y: number }> = [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
  ];
  const triangle: Array<{ x: number; y: number }> = [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 },
  ];

  it("returns valid metadata", () => {
    const meta = algo.getMetadata();
    expect(meta.id).toBe("minkowski-sum");
    expect(meta.safety_class).toBe("critical");
  });

  it("validates too few vertices", () => {
    const res = algo.validate({ polygon_a: [{ x: 0, y: 0 }], polygon_b: square });
    expect(res.valid).toBe(false);
  });

  it("validates non-convex polygon", () => {
    const nonConvex = [
      { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 0.5 }, { x: 2, y: 2 }, { x: 0, y: 2 },
    ];
    const res = algo.validate({ polygon_a: nonConvex, polygon_b: square });
    expect(res.valid).toBe(false);
  });

  it("validates correct input", () => {
    const res = algo.validate({ polygon_a: square, polygon_b: triangle });
    expect(res.valid).toBe(true);
  });

  it("computes Minkowski sum of square + triangle", () => {
    const result = algo.calculate({ polygon_a: square, polygon_b: triangle });
    expect(result.sum_polygon.length).toBeGreaterThanOrEqual(3);
    expect(result.sum_area).toBeGreaterThan(0);
    // Sum area >= area A + area B for convex sets
    expect(result.sum_area).toBeGreaterThanOrEqual(result.area_a + result.area_b - 0.01);
    expect(result.sum_perimeter).toBeGreaterThan(0);
    expect(result.n_vertices).toBeGreaterThanOrEqual(3);
  });

  it("computes Minkowski sum of two unit squares", () => {
    const result = algo.calculate({ polygon_a: square, polygon_b: square });
    // Sum of two unit squares: a 2x2 square => area = 4
    expect(result.sum_area).toBeCloseTo(4, 1);
    expect(result.area_a).toBeCloseTo(1, 5);
    expect(result.area_b).toBeCloseTo(1, 5);
  });

  it("computes centroid", () => {
    const result = algo.calculate({ polygon_a: square, polygon_b: triangle });
    expect(typeof result.centroid.x).toBe("number");
    expect(typeof result.centroid.y).toBe("number");
  });

  it("computes Minkowski difference when requested", () => {
    const bigSquare = [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 },
    ];
    const smallSquare = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
    ];
    const result = algo.calculate({
      polygon_a: bigSquare,
      polygon_b: smallSquare,
      compute_difference: true,
    });
    expect(result.difference_polygon.length).toBeGreaterThanOrEqual(3);
    expect(result.accessible).toBe(true);
  });
});

// ── NeuralInference ──────────────────────────────────────────────────

describe("NeuralInference", () => {
  const algo = new NeuralInference();

  it("returns valid metadata", () => {
    const meta = algo.getMetadata();
    expect(meta.id).toBe("neural-inference");
  });

  it("validates feature count mismatch", () => {
    const res = algo.validate({
      features: [1, 2],
      layer_sizes: [3, 2, 1],
      weights: new Array(3 * 2 + 2 * 1).fill(0.1),
      biases: new Array(2 + 1).fill(0),
    });
    expect(res.valid).toBe(false);
  });

  it("validates wrong weight count", () => {
    const res = algo.validate({
      features: [1, 2],
      layer_sizes: [2, 3, 1],
      weights: [0.1], // wrong
      biases: new Array(3 + 1).fill(0),
    });
    expect(res.valid).toBe(false);
  });

  it("validates correct input", () => {
    // 2 input, 3 hidden, 1 output => weights: 2*3 + 3*1 = 9, biases: 3 + 1 = 4
    const res = algo.validate({
      features: [1, 2],
      layer_sizes: [2, 3, 1],
      weights: new Array(9).fill(0.1),
      biases: new Array(4).fill(0),
    });
    expect(res.valid).toBe(true);
  });

  it("performs forward pass with ReLU activation", () => {
    // Simple 2→2→1 network
    // Layer 1: 2→2 weights = 4, biases = 2
    // Layer 2: 2→1 weights = 2, biases = 1
    const result = algo.calculate({
      features: [1.0, 0.5],
      layer_sizes: [2, 2, 1],
      weights: [0.5, 0.3, -0.2, 0.8, 1.0, -0.5],
      biases: [0.1, -0.1, 0.0],
      activation: "relu",
      output_activation: "linear",
    });
    expect(result.predictions).toHaveLength(1);
    expect(result.layer_outputs).toHaveLength(3); // input + 2 layers
    expect(result.layer_outputs[0]).toEqual([1.0, 0.5]);
    expect(typeof result.predictions[0]).toBe("number");
  });

  it("sigmoid activation produces values in (0,1)", () => {
    const result = algo.calculate({
      features: [1],
      layer_sizes: [1, 1],
      weights: [2],
      biases: [0],
      activation: "sigmoid",
      output_activation: "sigmoid",
    });
    expect(result.predictions[0]).toBeGreaterThan(0);
    expect(result.predictions[0]).toBeLessThan(1);
  });

  it("tanh activation produces values in (-1,1)", () => {
    const result = algo.calculate({
      features: [1],
      layer_sizes: [1, 2],
      weights: [10, -10],
      biases: [0, 0],
      activation: "tanh",
      output_activation: "tanh",
    });
    for (const v of result.predictions) {
      expect(v).toBeGreaterThan(-1);
      expect(v).toBeLessThan(1);
    }
  });

  it("handles zero weights (pass-through with bias)", () => {
    const result = algo.calculate({
      features: [5],
      layer_sizes: [1, 1],
      weights: [0],
      biases: [3],
      activation: "linear",
      output_activation: "linear",
    });
    expect(result.predictions[0]).toBeCloseTo(3, 5);
  });

  it("handles deeper network (4 layers)", () => {
    // 2→3→3→1: weights = 2*3 + 3*3 + 3*1 = 18, biases = 3+3+1 = 7
    const result = algo.calculate({
      features: [0.5, -0.5],
      layer_sizes: [2, 3, 3, 1],
      weights: new Array(18).fill(0.1),
      biases: new Array(7).fill(0.05),
      activation: "relu",
      output_activation: "linear",
    });
    expect(result.predictions).toHaveLength(1);
    expect(result.layer_outputs).toHaveLength(4);
  });

  it("returns confidence value in [0,1]", () => {
    const result = algo.calculate({
      features: [1, 2],
      layer_sizes: [2, 2, 1],
      weights: new Array(6).fill(0.2),
      biases: new Array(3).fill(0),
    });
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

// ── ParticleSwarm ────────────────────────────────────────────────────

describe("ParticleSwarm", () => {
  const algo = new ParticleSwarm();

  it("returns valid metadata", () => {
    const meta = algo.getMetadata();
    expect(meta.id).toBe("particle-swarm");
  });

  it("validates missing dimensions", () => {
    const res = algo.validate({
      dimensions: 0,
      lower_bounds: [0], upper_bounds: [10],
    });
    expect(res.valid).toBe(false);
  });

  it("validates bounds length mismatch", () => {
    const res = algo.validate({
      dimensions: 2,
      lower_bounds: [0], upper_bounds: [10, 20],
    });
    expect(res.valid).toBe(false);
  });

  it("validates too few particles", () => {
    const res = algo.validate({
      dimensions: 1,
      lower_bounds: [0], upper_bounds: [10],
      particles: 1,
    });
    expect(res.valid).toBe(false);
  });

  it("optimizes sphere function toward midpoint", () => {
    const result = algo.calculate({
      dimensions: 2,
      lower_bounds: [-5, -5],
      upper_bounds: [5, 5],
      particles: 20,
      max_iterations: 100,
      seed: 42,
    });
    expect(result.best_position).toHaveLength(2);
    // Default fitness is distance from midpoint (0,0)
    expect(result.best_fitness).toBeGreaterThanOrEqual(0);
    expect(result.best_fitness).toBeLessThan(5); // should converge reasonably
    expect(result.iterations_run).toBe(100);
    expect(result.convergence_history).toHaveLength(101); // initial + 100 iterations
  });

  it("produces deterministic results with same seed", () => {
    const input = {
      dimensions: 2,
      lower_bounds: [0, 0],
      upper_bounds: [10, 10],
      particles: 15,
      max_iterations: 50,
      seed: 77,
    };
    const r1 = algo.calculate(input);
    const r2 = algo.calculate(input);
    expect(r1.best_position).toEqual(r2.best_position);
    expect(r1.best_fitness).toBe(r2.best_fitness);
  });

  it("convergence history is monotonically non-increasing", () => {
    const result = algo.calculate({
      dimensions: 1,
      lower_bounds: [0],
      upper_bounds: [10],
      particles: 10,
      max_iterations: 30,
      seed: 5,
    });
    for (let i = 1; i < result.convergence_history.length; i++) {
      expect(result.convergence_history[i]).toBeLessThanOrEqual(result.convergence_history[i - 1]);
    }
  });

  it("reports swarm_diversity", () => {
    const result = algo.calculate({
      dimensions: 2,
      lower_bounds: [-10, -10],
      upper_bounds: [10, 10],
      particles: 20,
      max_iterations: 5,
      seed: 1,
    });
    expect(result.swarm_diversity).toBeGreaterThanOrEqual(0);
  });

  it("best_position stays within bounds", () => {
    const result = algo.calculate({
      dimensions: 3,
      lower_bounds: [1, 2, 3],
      upper_bounds: [4, 5, 6],
      particles: 15,
      max_iterations: 50,
      seed: 99,
    });
    for (let d = 0; d < 3; d++) {
      expect(result.best_position[d]).toBeGreaterThanOrEqual(1);
      expect(result.best_position[d]).toBeLessThanOrEqual(6);
    }
  });
});
