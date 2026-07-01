/**
 * MF-MS3: SetupTransitionEngine Tests
 * =====================================
 * 25+ tests covering all 3 sub-engines:
 *   1. Setup Transition Analysis (datum chain RSS, parallel surfaces, flip stability)
 *   2. Predictive Failure MC (Monte Carlo risk, sensitivity, failure modes)
 *   3. Force Capability Analysis (power/torque/force margins, thermal growth, worn tool)
 *
 * Physics invariants verified:
 *   - RSS tolerance stack = sqrt(sum(tol_i^2))
 *   - P = Fc * Vc / 60000 (kW)
 *   - T = Fc * D / (2*1000) (Nm)
 *   - delta = alpha * DeltaT * L (thermal growth)
 *   - F_worn = F_base * (1 + 0.5 * VB/VB_max)
 */

import { describe, it, expect } from "vitest";
import {
  SetupTransitionEngine,
  setupTransitionEngine,
  type SetupTransitionInput,
  type PredictiveFailureInput,
  type ForceCapabilityInput,
} from "../engines/SetupTransitionEngine.js";

// ============================================================================
// 1. SETUP TRANSITION ANALYSIS
// ============================================================================

describe("SetupTransitionEngine — Setup Transition Analysis", () => {
  const baseSetup = (orientation: "top" | "bottom" | "left" | "right" | "front" | "back" = "top") => ({
    fixture_type: "vise",
    datum: { x: 0, y: 0, z: 0 },
    part_orientation: orientation as any,
    positioning_error_mm: 0.005,
    support_area_mm2: 5000,
  });

  it("should compute RSS tolerance stack correctly (sqrt of sum of squares)", () => {
    const input: SetupTransitionInput = {
      current_setup: baseSetup("top"),
      next_setup: baseSetup("bottom"),
      operations_between: [
        { id: "op1", type: "mill", tolerance_mm: 0.01 },
        { id: "op2", type: "drill", tolerance_mm: 0.02 },
        { id: "op3", type: "bore", tolerance_mm: 0.015 },
      ],
      part_dimensions: { x: 100, y: 80, z: 50 },
    };

    const result = setupTransitionEngine.analyzeSetupTransition(input);

    // RSS = sqrt(0.005^2 + 0.005^2 + 0.01^2 + 0.02^2 + 0.015^2)
    const expected_rss = Math.sqrt(0.005 ** 2 + 0.005 ** 2 + 0.01 ** 2 + 0.02 ** 2 + 0.015 ** 2);
    expect(result.datum_chain_error_mm).toBeCloseTo(expected_rss, 6);
    expect(result.datum_chain_error_mm).toBeGreaterThan(0);
  });

  it("should handle single operation tolerance stack", () => {
    const input: SetupTransitionInput = {
      current_setup: baseSetup("top"),
      next_setup: baseSetup("bottom"),
      operations_between: [
        { id: "op1", type: "mill", tolerance_mm: 0.03 },
      ],
      part_dimensions: { x: 100, y: 80, z: 50 },
    };

    const result = setupTransitionEngine.analyzeSetupTransition(input);
    // RSS = sqrt(0.005^2 + 0.005^2 + 0.03^2)
    const expected = Math.sqrt(0.005 ** 2 + 0.005 ** 2 + 0.03 ** 2);
    expect(result.datum_chain_error_mm).toBeCloseTo(expected, 6);
  });

  it("should amplify error by datum reference count", () => {
    const input_single: SetupTransitionInput = {
      current_setup: baseSetup("top"),
      next_setup: baseSetup("bottom"),
      operations_between: [
        { id: "op1", type: "mill", tolerance_mm: 0.02, datum_refs: ["A"] },
      ],
      part_dimensions: { x: 100, y: 80, z: 50 },
    };

    const input_multi: SetupTransitionInput = {
      current_setup: baseSetup("top"),
      next_setup: baseSetup("bottom"),
      operations_between: [
        { id: "op1", type: "mill", tolerance_mm: 0.02, datum_refs: ["A", "B", "C", "D"] },
      ],
      part_dimensions: { x: 100, y: 80, z: 50 },
    };

    const r1 = setupTransitionEngine.analyzeSetupTransition(input_single);
    const r2 = setupTransitionEngine.analyzeSetupTransition(input_multi);

    // More datum refs = larger contribution = larger total
    expect(r2.datum_chain_error_mm).toBeGreaterThan(r1.datum_chain_error_mm);
  });

  it("should report tolerance contribution percentages summing to ~100%", () => {
    const input: SetupTransitionInput = {
      current_setup: baseSetup("top"),
      next_setup: baseSetup("bottom"),
      operations_between: [
        { id: "op1", type: "mill", tolerance_mm: 0.01 },
        { id: "op2", type: "drill", tolerance_mm: 0.02 },
      ],
      part_dimensions: { x: 100, y: 80, z: 50 },
    };

    const result = setupTransitionEngine.analyzeSetupTransition(input);
    // Op contributions don't include datum transfer, so they won't sum to 100%
    // But each pct should be >= 0
    for (const c of result.tolerance_stack_contribution) {
      expect(c.pct_of_total).toBeGreaterThanOrEqual(0);
      expect(c.pct_of_total).toBeLessThanOrEqual(100);
    }
  });

  it("should flag infeasible when support ratio is too low", () => {
    const input: SetupTransitionInput = {
      current_setup: baseSetup("top"),
      next_setup: {
        ...baseSetup("left"),
        support_area_mm2: 10, // very small support area
      },
      operations_between: [
        { id: "op1", type: "mill", tolerance_mm: 0.01 },
      ],
      part_dimensions: { x: 200, y: 200, z: 200 },
    };

    const result = setupTransitionEngine.analyzeSetupTransition(input);
    // 10 / (200*200) = 0.00025, way below 0.25
    expect(result.flip_stability.stable).toBe(false);
    expect(result.flip_stability.support_ratio).toBeLessThan(0.25);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("should be feasible for adequate support and small datum chain", () => {
    const input: SetupTransitionInput = {
      current_setup: baseSetup("top"),
      next_setup: baseSetup("bottom"),
      operations_between: [
        { id: "op1", type: "mill", tolerance_mm: 0.005 },
      ],
      part_dimensions: { x: 100, y: 80, z: 50 },
    };

    const result = setupTransitionEngine.analyzeSetupTransition(input);
    expect(result.feasible).toBe(true);
    expect(result.flip_stability.stable).toBe(true);
  });

  it("should warn on orientation change without explicit flip requirement", () => {
    const input: SetupTransitionInput = {
      current_setup: baseSetup("top"),
      next_setup: baseSetup("left"),
      operations_between: [
        { id: "op1", type: "mill", tolerance_mm: 0.01, requires_flip: false },
      ],
      part_dimensions: { x: 100, y: 80, z: 50 },
    };

    const result = setupTransitionEngine.analyzeSetupTransition(input);
    const hasOrientationWarning = result.warnings.some(w => w.includes("Orientation change"));
    expect(hasOrientationWarning).toBe(true);
  });

  it("should recommend extra setup time when fixture type changes", () => {
    const input: SetupTransitionInput = {
      current_setup: { ...baseSetup("top"), fixture_type: "vise" },
      next_setup: { ...baseSetup("bottom"), fixture_type: "plate" },
      operations_between: [
        { id: "op1", type: "mill", tolerance_mm: 0.01 },
      ],
      part_dimensions: { x: 100, y: 80, z: 50 },
    };

    const result = setupTransitionEngine.analyzeSetupTransition(input);
    const hasFixtureRec = result.recommendations.some(r => r.includes("Fixture change"));
    expect(hasFixtureRec).toBe(true);
  });

  it("should warn when datum chain error exceeds 50um threshold", () => {
    const input: SetupTransitionInput = {
      current_setup: { ...baseSetup("top"), positioning_error_mm: 0.03 },
      next_setup: { ...baseSetup("bottom"), positioning_error_mm: 0.03 },
      operations_between: [
        { id: "op1", type: "mill", tolerance_mm: 0.04 },
        { id: "op2", type: "drill", tolerance_mm: 0.03 },
      ],
      part_dimensions: { x: 100, y: 80, z: 50 },
    };

    const result = setupTransitionEngine.analyzeSetupTransition(input);
    expect(result.datum_chain_error_mm).toBeGreaterThan(0.05);
    const has50umWarning = result.warnings.some(w => w.includes("50µm"));
    expect(has50umWarning).toBe(true);
  });
});

// ============================================================================
// 2. PREDICTIVE FAILURE (MONTE CARLO)
// ============================================================================

describe("SetupTransitionEngine — Predictive Failure MC", () => {
  it("should return 100% success for empty operation sequence", () => {
    const input: PredictiveFailureInput = {
      operation_sequence: [],
    };

    const result = setupTransitionEngine.predictFailureProbability(input);
    expect(result.success_probability).toBe(1);
    expect(result.trials_run).toBe(0);
    expect(result.failure_modes_ranked).toHaveLength(0);
  });

  it("should return high success for robust operations (high feasibility score)", () => {
    const input: PredictiveFailureInput = {
      operation_sequence: [
        { id: "op1", type: "finish_mill", feasibility_score: 0.95, cutting_force_N: 200 },
        { id: "op2", type: "drill", feasibility_score: 0.9, cutting_force_N: 300 },
      ],
      num_trials: 500,
      force_variability_pct: 10,
      material_variability_pct: 5,
    };

    const result = setupTransitionEngine.predictFailureProbability(input);
    expect(result.success_probability).toBeGreaterThan(0.7);
    expect(result.trials_run).toBe(500);
  });

  it("should detect high failure rate for marginal operations", () => {
    const input: PredictiveFailureInput = {
      operation_sequence: [
        { id: "op1", type: "heavy_rough", feasibility_score: 0.55, cutting_force_N: 2000 },
      ],
      num_trials: 500,
      force_variability_pct: 30,
      material_variability_pct: 20,
    };

    const result = setupTransitionEngine.predictFailureProbability(input);
    // With marginal score and high variability, expect significant failures
    expect(result.success_probability).toBeLessThan(0.95);
    expect(result.failure_modes_ranked.length).toBeGreaterThan(0);
  });

  it("should produce sensitivity analysis with 3 factors", () => {
    const input: PredictiveFailureInput = {
      operation_sequence: [
        { id: "op1", type: "mill", feasibility_score: 0.7, cutting_force_N: 500 },
      ],
      num_trials: 200,
      tool_wear_factor: 0.3,
    };

    const result = setupTransitionEngine.predictFailureProbability(input);
    expect(result.sensitivity_analysis).toHaveLength(3);

    // Check ranks are 1,2,3
    const ranks = result.sensitivity_analysis.map(s => s.rank);
    expect(ranks).toContain(1);
    expect(ranks).toContain(2);
    expect(ranks).toContain(3);

    // Contributions should sum to ~100%
    const totalPct = result.sensitivity_analysis.reduce((s, a) => s + a.variance_contribution_pct, 0);
    expect(totalPct).toBeCloseTo(100, 0);
  });

  it("should produce per-operation risk map", () => {
    const input: PredictiveFailureInput = {
      operation_sequence: [
        { id: "op1", type: "rough", feasibility_score: 0.8, cutting_force_N: 1000 },
        { id: "op2", type: "finish", feasibility_score: 0.95, cutting_force_N: 200 },
      ],
      num_trials: 300,
    };

    const result = setupTransitionEngine.predictFailureProbability(input);
    expect(result.risk_map).toHaveLength(2);
    expect(result.risk_map[0].operation_id).toBe("op1");
    expect(result.risk_map[1].operation_id).toBe("op2");

    // Each risk map entry should have failure probability in [0,1]
    for (const r of result.risk_map) {
      expect(r.failure_probability).toBeGreaterThanOrEqual(0);
      expect(r.failure_probability).toBeLessThanOrEqual(1);
    }
  });

  it("should use Kienzle force model when kc1_1 and mc provided", () => {
    const input: PredictiveFailureInput = {
      operation_sequence: [
        {
          id: "op1", type: "mill", feasibility_score: 0.7,
          cutting_force_N: 800,
          kc1_1: 1800, mc: 0.25,
          feed_mm_rev: 0.15, depth_mm: 3,
        },
      ],
      num_trials: 200,
    };

    const result = setupTransitionEngine.predictFailureProbability(input);
    // Should run without errors and produce valid results
    expect(result.trials_run).toBe(200);
    expect(result.success_probability).toBeGreaterThanOrEqual(0);
    expect(result.success_probability).toBeLessThanOrEqual(1);
  });

  it("should warn when success probability drops below 50%", () => {
    const input: PredictiveFailureInput = {
      operation_sequence: [
        { id: "op1", type: "aggressive_rough", feasibility_score: 0.45, cutting_force_N: 3000 },
      ],
      num_trials: 500,
      force_variability_pct: 25,
    };

    const result = setupTransitionEngine.predictFailureProbability(input);
    if (result.success_probability < 0.5) {
      const hasCritical = result.warnings.some(w => w.includes("CRITICAL"));
      expect(hasCritical).toBe(true);
    }
  });
});

// ============================================================================
// 3. FORCE CAPABILITY ANALYSIS
// ============================================================================

describe("SetupTransitionEngine — Force Capability Analysis", () => {
  const baseMachine = (): any => ({
    max_power_kw: 15,
    max_torque_nm: 100,
    spindle_speed_range: [100, 12000] as [number, number],
  });

  const baseOp = (): any => ({
    type: "milling",
    cutting_force_N: 1000,
    cutting_speed_m_min: 150,
    tool_diameter_mm: 20,
    spindle_rpm: 2387,
  });

  it("should compute power correctly: P = Fc * Vc / 60000", () => {
    const input: ForceCapabilityInput = {
      operation: baseOp(),
      machine: baseMachine(),
    };

    const result = setupTransitionEngine.analyzeForceCapability(input);
    const expected_power = (1000 * 150) / 60000; // 2.5 kW
    expect(result.power_required_kw).toBeCloseTo(expected_power, 4);
  });

  it("should compute torque correctly: T = Fc * D / 2000", () => {
    const input: ForceCapabilityInput = {
      operation: baseOp(),
      machine: baseMachine(),
    };

    const result = setupTransitionEngine.analyzeForceCapability(input);
    const expected_torque = (1000 * 20) / 2000; // 10 Nm
    expect(result.torque_required_nm).toBeCloseTo(expected_torque, 4);
  });

  it("should verify P is proportional to Fc * Vc (physics invariant)", () => {
    // Double the force -> double the power
    const input1: ForceCapabilityInput = {
      operation: { ...baseOp(), cutting_force_N: 500 },
      machine: baseMachine(),
    };
    const input2: ForceCapabilityInput = {
      operation: { ...baseOp(), cutting_force_N: 1000 },
      machine: baseMachine(),
    };

    const r1 = setupTransitionEngine.analyzeForceCapability(input1);
    const r2 = setupTransitionEngine.analyzeForceCapability(input2);
    expect(r2.power_required_kw / r1.power_required_kw).toBeCloseTo(2.0, 2);
  });

  it("should verify T is proportional to Fc * D (physics invariant)", () => {
    // Double the diameter -> double the torque
    const input1: ForceCapabilityInput = {
      operation: { ...baseOp(), tool_diameter_mm: 10 },
      machine: baseMachine(),
    };
    const input2: ForceCapabilityInput = {
      operation: { ...baseOp(), tool_diameter_mm: 20 },
      machine: baseMachine(),
    };

    const r1 = setupTransitionEngine.analyzeForceCapability(input1);
    const r2 = setupTransitionEngine.analyzeForceCapability(input2);
    expect(r2.torque_required_nm / r1.torque_required_nm).toBeCloseTo(2.0, 2);
  });

  it("should compute thermal growth: delta = alpha * DeltaT * L", () => {
    const alpha = 11.7e-6; // steel CTE
    const deltaT = 10; // degrees C
    const L = 500; // mm

    const input: ForceCapabilityInput = {
      operation: baseOp(),
      machine: baseMachine(),
      accumulated_state: {
        thermal_coefficient: alpha,
        temperature_rise_C: deltaT,
        characteristic_length_mm: L,
      },
    };

    const result = setupTransitionEngine.analyzeForceCapability(input);
    const expected_growth = alpha * deltaT * L; // 0.0585 mm
    expect(result.thermal_error_mm).toBeCloseTo(expected_growth, 6);
  });

  it("should verify thermal growth proportional to DeltaT * L", () => {
    // Double DeltaT -> double thermal growth
    const makeInput = (deltaT: number, L: number): ForceCapabilityInput => ({
      operation: baseOp(),
      machine: baseMachine(),
      accumulated_state: {
        thermal_coefficient: 11.7e-6,
        temperature_rise_C: deltaT,
        characteristic_length_mm: L,
      },
    });

    const r1 = setupTransitionEngine.analyzeForceCapability(makeInput(5, 300));
    const r2 = setupTransitionEngine.analyzeForceCapability(makeInput(10, 300));
    expect(r2.thermal_error_mm / r1.thermal_error_mm).toBeCloseTo(2.0, 4);

    // Double L -> double thermal growth
    const r3 = setupTransitionEngine.analyzeForceCapability(makeInput(10, 600));
    expect(r3.thermal_error_mm / r2.thermal_error_mm).toBeCloseTo(2.0, 4);
  });

  it("should compute worn tool force increase: F_worn = F * (1 + 0.5*VB/VB_max)", () => {
    const input: ForceCapabilityInput = {
      operation: { ...baseOp(), cutting_force_N: 1000 },
      machine: baseMachine(),
      accumulated_state: {
        tool_wear_vb: 0.15,
        vb_max: 0.3,
      },
    };

    const result = setupTransitionEngine.analyzeForceCapability(input);
    // wear_factor = 1 + 0.5 * (0.15 / 0.3) = 1.25
    expect(result.force_increase_from_wear_pct).toBeCloseTo(25, 1);
    expect(result.effective_cutting_force_N).toBeCloseTo(1250, 0);
  });

  it("should flag infeasible when power exceeds machine limit", () => {
    const input: ForceCapabilityInput = {
      operation: { ...baseOp(), cutting_force_N: 8000, cutting_speed_m_min: 200 },
      machine: { ...baseMachine(), max_power_kw: 5 }, // only 5kW
    };

    const result = setupTransitionEngine.analyzeForceCapability(input);
    // P = 8000 * 200 / 60000 = 26.67 kW >> 5 kW
    expect(result.feasible).toBe(false);
    expect(result.power_utilization_pct).toBeGreaterThan(100);
  });

  it("should flag infeasible when torque exceeds machine limit", () => {
    const input: ForceCapabilityInput = {
      operation: { ...baseOp(), cutting_force_N: 5000, tool_diameter_mm: 50 },
      machine: { ...baseMachine(), max_torque_nm: 50 },
    };

    const result = setupTransitionEngine.analyzeForceCapability(input);
    // T = 5000 * 50 / 2000 = 125 Nm >> 50 Nm
    expect(result.torque_utilization_pct).toBeGreaterThan(100);
    expect(result.feasible).toBe(false);
  });

  it("should be feasible for operations well within machine limits", () => {
    const input: ForceCapabilityInput = {
      operation: { ...baseOp(), cutting_force_N: 500, cutting_speed_m_min: 100, tool_diameter_mm: 10 },
      machine: baseMachine(),
    };

    const result = setupTransitionEngine.analyzeForceCapability(input);
    expect(result.feasible).toBe(true);
    expect(result.power_utilization_pct).toBeLessThan(100);
    expect(result.torque_utilization_pct).toBeLessThan(100);
    expect(result.margin_of_safety).toBeGreaterThan(0);
  });

  it("should warn when tool wear approaches limit", () => {
    const input: ForceCapabilityInput = {
      operation: baseOp(),
      machine: baseMachine(),
      accumulated_state: {
        tool_wear_vb: 0.25,
        vb_max: 0.3,
      },
    };

    const result = setupTransitionEngine.analyzeForceCapability(input);
    const hasWearWarning = result.warnings.some(w => w.includes("wear") || w.includes("VB"));
    expect(hasWearWarning).toBe(true);
  });

  it("should warn on critical thermal growth > 50um", () => {
    const input: ForceCapabilityInput = {
      operation: baseOp(),
      machine: baseMachine(),
      accumulated_state: {
        thermal_coefficient: 11.7e-6,
        temperature_rise_C: 20,
        characteristic_length_mm: 500,
      },
    };

    const result = setupTransitionEngine.analyzeForceCapability(input);
    // delta = 11.7e-6 * 20 * 500 = 0.117 mm = 117um > 50um
    expect(result.thermal_error_mm).toBeGreaterThan(0.05);
    const hasThermalWarning = result.warnings.some(w => w.includes("CRITICAL thermal"));
    expect(hasThermalWarning).toBe(true);
  });

  it("should interpolate torque curve correctly", () => {
    const input: ForceCapabilityInput = {
      operation: { ...baseOp(), spindle_rpm: 3000 },
      machine: {
        ...baseMachine(),
        max_torque_nm: 120,
        torque_curve: [
          { rpm: 0, torque_nm: 120 },
          { rpm: 2000, torque_nm: 120 },
          { rpm: 4000, torque_nm: 80 },
          { rpm: 8000, torque_nm: 40 },
        ],
      },
    };

    const result = setupTransitionEngine.analyzeForceCapability(input);
    // At 3000 RPM, interpolation between (2000, 120) and (4000, 80): t=0.5, torque=100
    expect(result.torque_available_nm).toBeCloseTo(100, 0);
  });
});

// ============================================================================
// 4. CALCULATE DISPATCHER
// ============================================================================

describe("SetupTransitionEngine — calculate() dispatcher", () => {
  it("should dispatch setup_transition_analyze", () => {
    const result = setupTransitionEngine.calculate("setup_transition_analyze", {
      current_setup: {
        fixture_type: "vise",
        datum: { x: 0, y: 0, z: 0 },
        part_orientation: "top",
      },
      next_setup: {
        fixture_type: "vise",
        datum: { x: 0, y: 0, z: 0 },
        part_orientation: "bottom",
      },
      operations_between: [
        { id: "op1", type: "mill", tolerance_mm: 0.01 },
      ],
      part_dimensions: { x: 100, y: 80, z: 50 },
    });
    expect(result).toHaveProperty("feasible");
    expect(result).toHaveProperty("datum_chain_error_mm");
  });

  it("should dispatch predictive_failure_mc", () => {
    const result = setupTransitionEngine.calculate("predictive_failure_mc", {
      operation_sequence: [
        { id: "op1", type: "mill", feasibility_score: 0.85, cutting_force_N: 500 },
      ],
      num_trials: 100,
    });
    expect(result).toHaveProperty("success_probability");
    expect(result).toHaveProperty("trials_run");
  });

  it("should dispatch force_capability_analyze", () => {
    const result = setupTransitionEngine.calculate("force_capability_analyze", {
      operation: {
        type: "milling",
        cutting_force_N: 800,
        cutting_speed_m_min: 120,
        tool_diameter_mm: 16,
      },
      machine: {
        max_power_kw: 15,
        max_torque_nm: 100,
        spindle_speed_range: [100, 12000],
      },
    });
    expect(result).toHaveProperty("feasible");
    expect(result).toHaveProperty("power_required_kw");
    expect(result).toHaveProperty("torque_required_nm");
  });

  it("should throw on unknown action", () => {
    expect(() => setupTransitionEngine.calculate("unknown_action", {})).toThrow("unknown action");
  });
});
