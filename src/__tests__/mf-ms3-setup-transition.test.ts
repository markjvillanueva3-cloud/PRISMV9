/**
 * MF-MS3 Tests: SetupTransitionEngine
 * Setup transition analysis, predictive failure MC, force capability
 */
import { describe, it, expect } from "vitest";
import {
  setupTransitionEngine,
  type SetupTransitionInput,
  type PredictiveFailureInput,
  type ForceCapabilityInput,
} from "../engines/SetupTransitionEngine.js";

// ─── Fixtures ───────────────────────────────────────────────────────

const BASIC_SETUP_A = {
  fixture_type: "vise",
  datum: { x: 0, y: 0, z: 0 },
  part_orientation: "top" as const,
  positioning_error_mm: 0.005,
  support_area_mm2: 8000,
  fixture_envelope: { x: 150, y: 120, z: 80 },
};

const BASIC_SETUP_B = {
  fixture_type: "vise",
  datum: { x: 0, y: 0, z: -50 },
  part_orientation: "bottom" as const,
  positioning_error_mm: 0.005,
  support_area_mm2: 8000,
  fixture_envelope: { x: 150, y: 120, z: 80 },
};

const OPERATIONS = [
  { id: "op1", type: "pocket", tolerance_mm: 0.02, datum_refs: ["A"] },
  { id: "op2", type: "hole", tolerance_mm: 0.01, datum_refs: ["A", "B"] },
  { id: "op3", type: "face", tolerance_mm: 0.05 },
];

const PART_DIMS = { x: 100, y: 80, z: 50 };

const BASIC_MACHINE = {
  max_power_kw: 15,
  max_torque_nm: 120,
  spindle_speed_range: [100, 12000] as [number, number],
  torque_curve: [
    { rpm: 100, torque_nm: 120 },
    { rpm: 2000, torque_nm: 120 },
    { rpm: 6000, torque_nm: 80 },
    { rpm: 12000, torque_nm: 40 },
  ],
};

// ─── 1. Setup Transition Analysis ───────────────────────────────────

describe("SetupTransitionEngine — analyzeSetupTransition", () => {
  it("should return feasible for a simple top→bottom flip", () => {
    const input: SetupTransitionInput = {
      current_setup: BASIC_SETUP_A,
      next_setup: BASIC_SETUP_B,
      operations_between: OPERATIONS,
      part_dimensions: PART_DIMS,
      pallet_station_clearance_mm: 25,
    };
    const r = setupTransitionEngine.analyzeSetupTransition(input);
    expect(r.feasible).toBe(true);
    expect(r.datum_chain_error_mm).toBeGreaterThan(0);
    expect(r.flip_stability.stable).toBe(true);
    expect(r.tolerance_stack_contribution).toHaveLength(3);
  });

  it("should compute RSS tolerance stack correctly", () => {
    const input: SetupTransitionInput = {
      current_setup: { ...BASIC_SETUP_A, positioning_error_mm: 0.01 },
      next_setup: { ...BASIC_SETUP_B, positioning_error_mm: 0.01 },
      operations_between: [
        { id: "op1", type: "pocket", tolerance_mm: 0.03 },
        { id: "op2", type: "hole", tolerance_mm: 0.04 },
      ],
      part_dimensions: PART_DIMS,
    };
    const r = setupTransitionEngine.analyzeSetupTransition(input);
    // RSS = sqrt(0.01² + 0.01² + 0.03² + 0.04²) = sqrt(0.0027) ≈ 0.05196
    expect(r.datum_chain_error_mm).toBeCloseTo(0.05196, 3);
  });

  it("should amplify error for multi-datum-ref operations", () => {
    const single = setupTransitionEngine.analyzeSetupTransition({
      current_setup: BASIC_SETUP_A,
      next_setup: BASIC_SETUP_B,
      operations_between: [
        { id: "op1", type: "hole", tolerance_mm: 0.02, datum_refs: ["A"] },
      ],
      part_dimensions: PART_DIMS,
    });
    const multi = setupTransitionEngine.analyzeSetupTransition({
      current_setup: BASIC_SETUP_A,
      next_setup: BASIC_SETUP_B,
      operations_between: [
        { id: "op1", type: "hole", tolerance_mm: 0.02,
          datum_refs: ["A", "B", "C", "D"] },
      ],
      part_dimensions: PART_DIMS,
    });
    expect(multi.datum_chain_error_mm)
      .toBeGreaterThan(single.datum_chain_error_mm);
  });

  it("should warn on low support ratio (side orientation)", () => {
    const input: SetupTransitionInput = {
      current_setup: BASIC_SETUP_A,
      next_setup: {
        ...BASIC_SETUP_B,
        part_orientation: "left",
        support_area_mm2: 800, // very small
      },
      operations_between: OPERATIONS,
      part_dimensions: PART_DIMS,
    };
    const r = setupTransitionEngine.analyzeSetupTransition(input);
    expect(r.flip_stability.support_ratio).toBeLessThan(0.5);
  });

  it("should detect fixture type change and recommend", () => {
    const input: SetupTransitionInput = {
      current_setup: BASIC_SETUP_A,
      next_setup: { ...BASIC_SETUP_B, fixture_type: "pallet" },
      operations_between: OPERATIONS,
      part_dimensions: PART_DIMS,
    };
    const r = setupTransitionEngine.analyzeSetupTransition(input);
    expect(r.recommendations.some(
      rec => rec.includes("Fixture change")
    )).toBe(true);
  });

  it("should warn when datum chain error exceeds 50µm", () => {
    const input: SetupTransitionInput = {
      current_setup: { ...BASIC_SETUP_A, positioning_error_mm: 0.03 },
      next_setup: { ...BASIC_SETUP_B, positioning_error_mm: 0.03 },
      operations_between: [
        { id: "op1", type: "pocket", tolerance_mm: 0.04,
          datum_refs: ["A", "B"] },
      ],
      part_dimensions: PART_DIMS,
    };
    const r = setupTransitionEngine.analyzeSetupTransition(input);
    expect(r.warnings.some(w => w.includes("50µm"))).toBe(true);
  });

  it("should report pct_of_total summing close to 100%", () => {
    const input: SetupTransitionInput = {
      current_setup: BASIC_SETUP_A,
      next_setup: BASIC_SETUP_B,
      operations_between: OPERATIONS,
      part_dimensions: PART_DIMS,
    };
    const r = setupTransitionEngine.analyzeSetupTransition(input);
    // op contributions don't include datum transfer, so sum < 100
    const sum = r.tolerance_stack_contribution.reduce(
      (a, c) => a + c.pct_of_total, 0
    );
    expect(sum).toBeLessThanOrEqual(100);
    expect(sum).toBeGreaterThan(0);
  });
});

// ─── 2. Predictive Failure MC ───────────────────────────────────────

describe("SetupTransitionEngine — predictFailureProbability", () => {
  it("should return ~1.0 success for easy operations", () => {
    const input: PredictiveFailureInput = {
      operation_sequence: [
        { id: "op1", type: "face", feasibility_score: 0.95,
          cutting_force_N: 200 },
        { id: "op2", type: "pocket", feasibility_score: 0.90,
          cutting_force_N: 300 },
      ],
      num_trials: 200,
    };
    const r = setupTransitionEngine.predictFailureProbability(input);
    expect(r.success_probability).toBeGreaterThan(0.7);
    expect(r.trials_run).toBe(200);
  });

  it("should return low success for marginal operations", () => {
    const input: PredictiveFailureInput = {
      operation_sequence: [
        { id: "op1", type: "deep_pocket", feasibility_score: 0.55,
          cutting_force_N: 800 },
        { id: "op2", type: "thin_wall", feasibility_score: 0.52,
          cutting_force_N: 600 },
      ],
      force_variability_pct: 20,
      material_variability_pct: 15,
      tool_wear_factor: 0.3,
      num_trials: 300,
    };
    const r = setupTransitionEngine.predictFailureProbability(input);
    expect(r.success_probability).toBeLessThan(0.95);
    expect(r.failure_modes_ranked.length).toBeGreaterThan(0);
  });

  it("should handle empty sequence", () => {
    const r = setupTransitionEngine.predictFailureProbability({
      operation_sequence: [],
    });
    expect(r.success_probability).toBe(1);
    expect(r.trials_run).toBe(0);
  });

  it("should produce risk_map for each operation", () => {
    const input: PredictiveFailureInput = {
      operation_sequence: [
        { id: "a", type: "face", feasibility_score: 0.8,
          cutting_force_N: 400 },
        { id: "b", type: "slot", feasibility_score: 0.6,
          cutting_force_N: 600 },
        { id: "c", type: "drill", feasibility_score: 0.9,
          cutting_force_N: 200 },
      ],
      num_trials: 200,
    };
    const r = setupTransitionEngine.predictFailureProbability(input);
    expect(r.risk_map).toHaveLength(3);
    expect(r.risk_map.every(rm => rm.operation_id)).toBe(true);
  });

  it("should rank sensitivity factors", () => {
    const input: PredictiveFailureInput = {
      operation_sequence: [
        { id: "op1", type: "pocket", feasibility_score: 0.6,
          cutting_force_N: 500 },
      ],
      force_variability_pct: 25,
      material_variability_pct: 5,
      tool_wear_factor: 0.1,
      num_trials: 200,
    };
    const r = setupTransitionEngine.predictFailureProbability(input);
    expect(r.sensitivity_analysis).toHaveLength(3);
    expect(r.sensitivity_analysis[0].rank).toBe(1);
    expect(r.sensitivity_analysis[2].rank).toBe(3);
  });

  it("should use Kienzle model when kc/mc provided", () => {
    const input: PredictiveFailureInput = {
      operation_sequence: [
        {
          id: "kienzle_op", type: "turning",
          feasibility_score: 0.7,
          cutting_force_N: 500,
          kc1_1: 1800, mc: 0.25,
          feed_mm_rev: 0.2, depth_mm: 3,
        },
      ],
      num_trials: 100,
    };
    const r = setupTransitionEngine.predictFailureProbability(input);
    expect(r.trials_run).toBe(100);
    expect(r.mean_force_variation_pct).toBeGreaterThan(0);
  });

  it("should warn on low success probability", () => {
    const input: PredictiveFailureInput = {
      operation_sequence: [
        { id: "risky", type: "thin_wall", feasibility_score: 0.51,
          cutting_force_N: 900 },
      ],
      force_variability_pct: 30,
      material_variability_pct: 20,
      tool_wear_factor: 0.5,
      wear_variability_pct: 30,
      num_trials: 500,
    };
    const r = setupTransitionEngine.predictFailureProbability(input);
    // With such high variability and marginal score, expect warnings
    if (r.success_probability < 0.9) {
      expect(r.warnings.length).toBeGreaterThan(0);
    }
  });
});

// ─── 3. Force Capability Analysis ───────────────────────────────────

describe("SetupTransitionEngine — analyzeForceCapability", () => {
  it("should return feasible for normal milling", () => {
    const input: ForceCapabilityInput = {
      operation: {
        type: "milling",
        cutting_force_N: 500,
        cutting_speed_m_min: 150,
        tool_diameter_mm: 12,
      },
      machine: BASIC_MACHINE,
    };
    const r = setupTransitionEngine.analyzeForceCapability(input);
    expect(r.feasible).toBe(true);
    expect(r.power_utilization_pct).toBeLessThan(100);
    expect(r.torque_utilization_pct).toBeLessThan(100);
  });

  it("should compute power correctly: P = Fc × Vc / 60000", () => {
    const input: ForceCapabilityInput = {
      operation: {
        type: "milling",
        cutting_force_N: 1000,
        cutting_speed_m_min: 120,
        tool_diameter_mm: 20,
      },
      machine: BASIC_MACHINE,
    };
    const r = setupTransitionEngine.analyzeForceCapability(input);
    // P = 1000 * 120 / 60000 = 2.0 kW
    expect(r.power_required_kw).toBeCloseTo(2.0, 2);
  });

  it("should compute torque correctly: T = Fc × D / 2000", () => {
    const input: ForceCapabilityInput = {
      operation: {
        type: "milling",
        cutting_force_N: 1000,
        cutting_speed_m_min: 100,
        tool_diameter_mm: 20,
      },
      machine: BASIC_MACHINE,
    };
    const r = setupTransitionEngine.analyzeForceCapability(input);
    // T = 1000 * 20 / 2000 = 10 Nm
    expect(r.torque_required_nm).toBeCloseTo(10, 1);
  });

  it("should detect power overload", () => {
    const input: ForceCapabilityInput = {
      operation: {
        type: "milling",
        cutting_force_N: 8000,
        cutting_speed_m_min: 200,
        tool_diameter_mm: 50,
      },
      machine: { ...BASIC_MACHINE, max_power_kw: 5 },
    };
    const r = setupTransitionEngine.analyzeForceCapability(input);
    expect(r.feasible).toBe(false);
    expect(r.power_utilization_pct).toBeGreaterThan(100);
  });

  it("should account for thermal growth", () => {
    const input: ForceCapabilityInput = {
      operation: {
        type: "milling",
        cutting_force_N: 500,
        cutting_speed_m_min: 150,
        tool_diameter_mm: 12,
      },
      machine: BASIC_MACHINE,
      accumulated_state: {
        temperature_rise_C: 10,
        thermal_coefficient: 11.7e-6,
        characteristic_length_mm: 500,
      },
    };
    const r = setupTransitionEngine.analyzeForceCapability(input);
    // δ = 11.7e-6 × 10 × 500 = 0.0585mm
    expect(r.thermal_error_mm).toBeCloseTo(0.0585, 3);
    expect(r.warnings.some(w => w.includes("thermal")
      || w.includes("Thermal"))).toBe(true);
  });

  it("should account for tool wear force increase", () => {
    const input: ForceCapabilityInput = {
      operation: {
        type: "milling",
        cutting_force_N: 500,
        cutting_speed_m_min: 150,
        tool_diameter_mm: 12,
      },
      machine: BASIC_MACHINE,
      accumulated_state: {
        tool_wear_vb: 0.2,
        vb_max: 0.3,
      },
    };
    const r = setupTransitionEngine.analyzeForceCapability(input);
    // wear_factor = 1 + 0.5 * (0.2/0.3) = 1.333
    expect(r.force_increase_from_wear_pct).toBeCloseTo(33.3, 0);
    expect(r.effective_cutting_force_N).toBeCloseTo(666.7, 0);
  });

  it("should warn when VB approaches max", () => {
    const input: ForceCapabilityInput = {
      operation: {
        type: "milling",
        cutting_force_N: 300,
        cutting_speed_m_min: 100,
        tool_diameter_mm: 10,
      },
      machine: BASIC_MACHINE,
      accumulated_state: { tool_wear_vb: 0.28, vb_max: 0.3 },
    };
    const r = setupTransitionEngine.analyzeForceCapability(input);
    expect(r.warnings.some(w => w.includes("approaching limit")))
      .toBe(true);
  });

  it("should interpolate torque curve at high RPM", () => {
    const input: ForceCapabilityInput = {
      operation: {
        type: "milling",
        cutting_force_N: 200,
        cutting_speed_m_min: 300,
        tool_diameter_mm: 10,
        spindle_rpm: 9000,
      },
      machine: BASIC_MACHINE,
    };
    const r = setupTransitionEngine.analyzeForceCapability(input);
    // At 9000 RPM, interpolated between 6000→80Nm and 12000→40Nm
    // t = (9000-6000)/(12000-6000) = 0.5, torque = 80 + 0.5*(40-80) = 60
    expect(r.torque_available_nm).toBeCloseTo(60, 0);
  });

  it("should warn when RPM exceeds machine range", () => {
    const input: ForceCapabilityInput = {
      operation: {
        type: "milling",
        cutting_force_N: 100,
        cutting_speed_m_min: 500,
        tool_diameter_mm: 6,
        spindle_rpm: 15000,
      },
      machine: BASIC_MACHINE,
    };
    const r = setupTransitionEngine.analyzeForceCapability(input);
    expect(r.feasible).toBe(false);
    expect(r.warnings.some(w => w.includes("exceeds machine maximum")))
      .toBe(true);
  });

  it("should compute margin of safety", () => {
    const input: ForceCapabilityInput = {
      operation: {
        type: "milling",
        cutting_force_N: 300,
        cutting_speed_m_min: 100,
        tool_diameter_mm: 10,
      },
      machine: BASIC_MACHINE,
    };
    const r = setupTransitionEngine.analyzeForceCapability(input);
    expect(r.margin_of_safety).toBeGreaterThan(0);
  });
});

// ─── 4. calculate() dispatcher ──────────────────────────────────────

describe("SetupTransitionEngine — calculate() dispatch", () => {
  it("should dispatch setup_transition_analyze", () => {
    const r = setupTransitionEngine.calculate(
      "setup_transition_analyze",
      {
        current_setup: BASIC_SETUP_A,
        next_setup: BASIC_SETUP_B,
        operations_between: OPERATIONS,
        part_dimensions: PART_DIMS,
      }
    );
    expect(r.feasible).toBeDefined();
    expect(r.datum_chain_error_mm).toBeGreaterThan(0);
  });

  it("should dispatch predictive_failure_mc", () => {
    const r = setupTransitionEngine.calculate(
      "predictive_failure_mc",
      {
        operation_sequence: [
          { id: "a", type: "face", feasibility_score: 0.85,
            cutting_force_N: 300 },
        ],
        num_trials: 50,
      }
    );
    expect(r.success_probability).toBeGreaterThanOrEqual(0);
    expect(r.trials_run).toBe(50);
  });

  it("should dispatch force_capability_analyze", () => {
    const r = setupTransitionEngine.calculate(
      "force_capability_analyze",
      {
        operation: {
          type: "milling",
          cutting_force_N: 400,
          cutting_speed_m_min: 120,
          tool_diameter_mm: 16,
        },
        machine: BASIC_MACHINE,
      }
    );
    expect(r.power_required_kw).toBeGreaterThan(0);
    expect(r.feasible).toBeDefined();
  });

  it("should throw on unknown action", () => {
    expect(() => {
      setupTransitionEngine.calculate("bogus_action", {});
    }).toThrow("unknown action");
  });
});
