/**
 * Algorithm Calculate Audit — Full Validation + Execution Path
 *
 * Unlike benchmarks.test.ts (which uses benchmark() and skips validation errors),
 * this test uses calculate() which validates AND throws on errors.
 * This catches bugs like the FuzzyController undefined variable issue.
 *
 * L1-P2-MS1: Algorithm Engine & Wiring — Full Coverage Audit
 */

import { describe, it, expect } from "vitest";
import { algorithmEngine } from "../engines/AlgorithmEngine.js";
import { listAlgorithms } from "../algorithms/index.js";

// ── Helper for RCSA FRF data ─────────────────────────────────────────
function makeRCSAFRF(fn: number, k: number, c: number) {
  const freqs = Array.from({ length: 50 }, (_, i) => 100 + i * 100);
  const H11 = freqs.map(f => {
    const w = 2 * Math.PI * f;
    const wn = 2 * Math.PI * fn;
    const m = k / (wn * wn);
    const dr = k - m * w * w;
    const di = c * w;
    const d2 = dr * dr + di * di;
    return { re: dr / d2, im: -di / d2 };
  });
  return { frequencies: freqs, H11 };
}

// ── Typed inputs matching each algorithm's actual interface ──────────

const CALCULATE_INPUTS: Record<string, Record<string, any>> = {
  // Original 7
  "kienzle": { kc1_1: 1800, mc: 0.25, feed_per_tooth: 0.1, axial_depth: 3, radial_depth: 6, tool_diameter: 12, number_of_teeth: 4, cutting_speed: 200 },
  "taylor": { cutting_speed: 200, C: 300, n: 0.3 },
  "johnson-cook": { strain: 0.5, strain_rate: 1000, temperature: 400, A: 553, B: 600, n: 0.234, C: 0.0134, m: 1.0, T_melt: 1460 },
  "surface-finish": { feed: 0.15, nose_radius: 0.8 },
  "stability-lobe": { natural_frequency: 800, damping_ratio: 0.03, stiffness: 2e7, specific_cutting_force: 2000, num_teeth: 4 },
  "chip-thinning": { feed_per_tooth: 0.1, radial_depth: 3, tool_diameter: 12 },
  "thermal-power": { cutting_force: 500, cutting_speed: 200, tool_diameter: 12 },

  // L1-P0-MS1: 11 ported
  "gilbert-mrr": { cutting_speed: 200, feed_per_tooth: 0.1, axial_depth: 2, radial_depth: 6, tool_diameter: 12, number_of_teeth: 4 },
  "tool-deflection": { cutting_force: 500, tool_diameter: 12, overhang_length: 50 },
  "chip-breaking": { feed_per_tooth: 0.15, axial_depth: 2, cutting_speed: 200, tool_diameter: 12, iso_group: "P", has_chipbreaker: true },
  "coolant-flow": { operation: "milling", tool_diameter: 12, cutting_speed: 200, material_class: "steel", system_flow_rate: 20, system_pressure: 40 },
  "tool-wear-prediction": { cutting_speed: 200, cutting_time: 30, taylor_C: 300, taylor_n: 0.3 },
  "spindle-vib-fft": { signal: Array.from({ length: 256 }, (_, i) => Math.sin(2 * Math.PI * 800 * i / 10000) + 0.3 * Math.sin(2 * Math.PI * 1600 * i / 10000)), sample_rate_hz: 10000, spindle_rpm: 12000, flutes: 4 },
  "chip-evacuation": { tool_diameter: 12, hole_depth: 40, material_type: "steel", system_pressure: 40, system_flow: 20 },
  "thermal-fea": { cutting_speed: 200, feed_per_tooth: 0.1, axial_depth: 2 },
  "bayesian-wear": { prior_mean: 0.1, prior_std: 0.05, observations: [0.05, 0.08, 0.12] },
  "ensemble-predictor": { members: [{ algorithm: "taylor", prediction: 45, weight: 1, confidence: 0.8 }, { algorithm: "regression", prediction: 50, weight: 1, confidence: 0.7 }], problem_type: "prediction" },
  "adaptive-controller": { mode: "chipload", target_chipload: 0.1, feed_rate: 1000, spindle_rpm: 5000, flutes: 4 },

  // L1-P1-MS1: 18 general-purpose
  "genetic-optimizer": { objectives: 1, dimensions: 3, lower_bounds: [-5, -5, -5], upper_bounds: [5, 5, 5], population_size: 20, generations: 10, crossover_rate: 0.8, mutation_rate: 0.1, seed: 42 },
  "simulated-annealing": { dimensions: 3, lower_bounds: [-5, -5, -5], upper_bounds: [5, 5, 5], initial_temp: 100, cooling_rate: 0.95, seed: 42 },
  "particle-swarm": { dimensions: 3, lower_bounds: [-5, -5, -5], upper_bounds: [5, 5, 5], particles: 10, max_iterations: 20, inertia: 0.7, cognitive: 1.5, social: 1.5, seed: 42 },
  "monte-carlo": { variables: [{ name: "speed", distribution: "normal", param1: 100, param2: 10 }], samples: 100, seed: 42 },
  "neural-inference": { features: [0.5, 0.3, 0.8], layer_sizes: [3, 2], weights: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6], biases: [0.1, 0.2], activation: "relu" },
  "bayesian-optimizer": { X_observed: [[1], [2]], y_observed: [2, 5], dimensions: 1, lower_bounds: [0], upper_bounds: [5], acquisition: "EI", seed: 42 },
  "fuzzy-controller": {
    inputs: [{ name: "temperature", range: [0, 100], sets: [{ name: "low", type: "triangular", params: [0, 0, 50] }, { name: "high", type: "triangular", params: [50, 100, 100] }] }],
    outputs: [{ name: "fan", range: [0, 100], sets: [{ name: "slow", type: "triangular", params: [0, 0, 50] }, { name: "fast", type: "triangular", params: [50, 100, 100] }] }],
    rules: [{ conditions: [{ variable: "temperature", set: "high" }], output: { variable: "fan", set: "fast" }, weight: 1 }],
    values: { temperature: 75 },
  },
  "digital-twin-estimator": { states: [{ name: "spindle_speed", model_value: 100, sensor_value: 105, model_confidence: 0.7, sensor_noise: 0.1 }, { name: "feed_rate", model_value: 200, model_confidence: 0.5 }] },
  "time-series-predictor": { data: [10, 12, 11, 13, 14, 13, 15, 16, 15, 17], horizon: 3 },
  "anomaly-detector": { data: [10, 11, 12, 10, 11, 50, 12, 11, 10, 11], method: "zscore", threshold: 2.5 },
  "clustering-engine": { data: [[1, 1], [1.5, 1.5], [5, 5], [5.5, 5.5]], k: 2, method: "kmeans", maxIterations: 20 },
  "decision-tree-classifier": { X_train: [[1, 0], [0, 1], [1, 1], [0, 0]], y_train: [1, 1, 1, 0], X_test: [[1, 0], [0, 1]], max_depth: 3, min_samples_split: 1 },
  "regression-engine": { X: [[1], [2], [3], [4], [5]], y: [2.1, 3.9, 6.1, 8.0, 9.9], degree: 1 },
  "interpolation-engine": { x_data: [0, 1, 2, 3, 4], y_data: [0, 1, 4, 9, 16], x_query: [0.5, 1.5, 2.5, 3.5], method: "cubic_spline" },
  "kalman-filter": { n_states: 2, n_measurements: 1, F: [1, 1, 0, 1], H: [1, 0], Q: [0.1, 0, 0, 0.1], R: [1], x0: [0, 1], P0: [1, 0, 0, 1], measurements: [[1.1], [2.3], [3.1]] },
  "pid-controller": { setpoint: 100, process_values: [95, 96, 97, 98, 99], Kp: 2.0, Ki: 0.5, Kd: 0.1, dt: 0.01, output_min: 0, output_max: 100 },
  "fea-solver-2d": { nodes: [{ id: 0, x: 0, y: 0 }, { id: 1, x: 1, y: 0 }, { id: 2, x: 0.5, y: 1 }], elements: [{ id: 0, nodes: [0, 1, 2] }], boundary_conditions: [{ node_id: 0, dof: "xy" }, { node_id: 1, dof: "y" }], loads: [{ node_id: 2, fx: 1000, fy: -5000 }], E: 200e9, nu: 0.3, thickness: 0.01 },
  "fft-analyzer": { signal: Array.from({ length: 64 }, (_, i) => Math.sin(2 * Math.PI * 100 * i / 1000) + 0.5 * Math.sin(2 * Math.PI * 250 * i / 1000)), sample_rate: 1000 },

  // L1-P1-MS2: 14 manufacturing-specific (PASS2)
  "minkowski-sum": { polygon_a: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 0, y: 1 }], polygon_b: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 0.5 }] },
  "swept-volume-collision": { toolpath: [{ x: 0, y: 0, z: 10 }, { x: 50, y: 0, z: 10 }, { x: 50, y: 50, z: 10 }], tool: { diameter: 12, holder_diameter: 40, flute_length: 30, total_length: 60 }, obstacles: [{ min: { x: 20, y: 20, z: 0 }, max: { x: 30, y: 30, z: 15 } }], clearance: 2 },
  "chip-volume-rate": { tool_diameter: 12, depth_of_cut: 3, width_of_cut: 6, feed_rate: 200, cutting_speed: 200, operation: "milling_slot" },
  "jaeger-temp-field": { heat_flux: 50, contact_half_width: 0.002, cutting_speed: 200 },
  "usui-wear-model": { contact_stress: 500, sliding_velocity: 3.33, interface_temperature: 600, cutting_time: 30 },
  "frf-stability-lobe": {
    frf_data: [
      { frequency: 500, compliance: { real: -1e-7, imag: -3e-7 } },
      { frequency: 600, compliance: { real: -2e-7, imag: -4e-7 } },
      { frequency: 700, compliance: { real: -2e-7, imag: -5e-7 } },
      { frequency: 750, compliance: { real: -3e-7, imag: -8e-7 } },
      { frequency: 800, compliance: { real: -5e-7, imag: -1e-6 } },
      { frequency: 850, compliance: { real: -3e-7, imag: -7e-7 } },
      { frequency: 900, compliance: { real: -2e-7, imag: -4e-7 } },
      { frequency: 1000, compliance: { real: -1e-7, imag: -3e-7 } },
      { frequency: 1100, compliance: { real: -1e-7, imag: -2e-7 } },
      { frequency: 1200, compliance: { real: -5e-8, imag: -1e-7 } },
    ],
    n_flutes: 4, Kt: 2000, speed_min: 3000, speed_max: 15000, n_speed_points: 20, n_lobes: 5,
  },
  "rcsa": {
    substructure_a: makeRCSAFRF(800, 1.26e7, 150),
    substructure_b: makeRCSAFRF(2000, 5e7, 50),
    joint_stiffness: 5e8,
    joint_damping: 100,
  },
  "cwe-z-buffer": { tool_diameter: 12, current_position: { x: 20, y: 0, z: 0 }, previous_positions: [{ x: 0, y: 0, z: 0 }], depth_of_cut: 3, width_of_cut: 6 },
  "ant-colony-tsp": { n_tools: 4, change_times: [{ from: 0, to: 1, time: 10 }, { from: 1, to: 2, time: 12 }, { from: 2, to: 3, time: 8 }, { from: 0, to: 3, time: 20 }], default_change_time: 5, n_ants: 4, n_iterations: 20, alpha: 1, beta: 2, rho: 0.1, seed: 42 },
  "dp-multi-pass": { total_stock: 8, workpiece_diameter: 50, cut_length: 100, min_depth: 0.5, max_depth: 3, max_passes: 10, cutting_speed: 200, feed_rate: 0.2, Kc: 2500, max_power: 15, resolution: 0.5 },
  "ilp-assignment": { jobs: [{ id: "J1", processing_times: [10, 8] }, { id: "J2", processing_times: [15, 12] }, { id: "J3", processing_times: [8, 7] }], machines: [{ id: "M1" }, { id: "M2" }], objective: "min_time" },
  "csp-setup-plan": { features: [{ id: "F1", access_directions: ["+Z", "+X"] as any[], machining_time: 5, tolerance_group: "TG1" }, { id: "F2", access_directions: ["+Z"] as any[], machining_time: 3, tolerance_group: "TG1", precedence_before: [] }, { id: "F3", access_directions: ["+X", "+Y"] as any[], machining_time: 4, tolerance_group: "TG2" }] },
  "stft-chatter": { signal: Array.from({ length: 512 }, (_, i) => Math.sin(2 * Math.PI * 800 * i / 10000) + 0.5 * Math.sin(2 * Math.PI * 1234 * i / 10000)), sample_rate: 10000, spindle_speed: 12000, n_flutes: 4 },
  "wavelet-breakage": { signal: Array.from({ length: 256 }, (_, i) => Math.sin(2 * Math.PI * 500 * i / 10000) + (i > 100 && i < 110 ? 5 : 0)), sample_rate: 10000 },
};

// ── Tests ─────────────────────────────────────────────────────────────

describe("Algorithm Calculate Audit (full validate+execute path)", () => {

  it("has calculate inputs for all 50 algorithms", () => {
    const ids = listAlgorithms();
    expect(ids.length).toBe(50);
    for (const id of ids) {
      expect(CALCULATE_INPUTS[id], `Missing calculate input for "${id}"`).toBeDefined();
    }
  });

  describe("Full calculate() path — validate then execute", () => {
    const ids = Object.keys(CALCULATE_INPUTS);

    for (const id of ids) {
      it(`calculate: ${id}`, () => {
        const input = CALCULATE_INPUTS[id];

        // Step 1: Validate must pass
        const validation = algorithmEngine.validate({ algorithm_id: id, params: input });
        expect(validation.validation.valid, `Validation failed for "${id}": ${JSON.stringify(validation.validation.issues)}`).toBe(true);

        // Step 2: Calculate must succeed (this is the path benchmark() skips)
        const result = algorithmEngine.calculate({ algorithm_id: id, params: input });

        expect(result.algorithm_id).toBe(id);
        expect(result.algorithm_name).toBeTruthy();
        expect(result.result).toBeDefined();
        expect(result.execution_time_ms).toBeGreaterThanOrEqual(0);
      });
    }
  });

  describe("Validate rejects invalid inputs", () => {
    it("rejects unknown algorithm", () => {
      const result = algorithmEngine.validate({ algorithm_id: "nonexistent", params: {} });
      expect(result.validation.valid).toBe(false);
    });

    it("rejects missing required params for kienzle", () => {
      const result = algorithmEngine.validate({ algorithm_id: "kienzle", params: {} });
      expect(result.validation.valid).toBe(false);
      expect(result.validation.issues.length).toBeGreaterThan(0);
    });

    it("rejects negative tool diameter", () => {
      const result = algorithmEngine.validate({
        algorithm_id: "chip-thinning",
        params: { tool_diameter: -5, radial_depth: 3, feed_per_tooth: 0.1 },
      });
      expect(result.validation.valid).toBe(false);
    });
  });
});
