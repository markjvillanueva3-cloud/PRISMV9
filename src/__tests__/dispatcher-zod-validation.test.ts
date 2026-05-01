/**
 * Dispatcher Zod Validation Tests
 * Tests schema validation for safety-critical dispatchers:
 * turning, grinding, EDM, processControl
 */
import { describe, it, expect } from "vitest";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";
import { GRINDING_ACTION_SCHEMAS } from "../schemas/grindingActionSchemas.js";
import { EDM_ACTION_SCHEMAS } from "../schemas/edmActionSchemas.js";
import { PROCESS_CONTROL_ACTION_SCHEMAS } from "../schemas/processControlActionSchemas.js";

// Helper: validate params against a schema map
function validate(schemas: Record<string, any>, action: string, params: any) {
  const schema = schemas[action];
  if (!schema) return { valid: true };
  const result = schema.safeParse(params);
  return { valid: result.success, error: result.success ? undefined : result.error };
}

// ============================================================================
// TURNING — SAFETY CRITICAL (chuck/tailstock/part-off)
// ============================================================================
describe("Turning Zod Schemas", () => {
  it("chuck_force: valid params pass", () => {
    const r = validate(TURNING_ACTION_SCHEMAS, "chuck_force", {
      workpiece_mass_kg: 5,
      workpiece_od_mm: 80,
      workpiece_length_mm: 200,
      gripping_diameter_mm: 75,
      gripping_length_mm: 30,
      spindle_rpm: 2000,
      max_spindle_rpm: 4000,
      cutting_force_tangential_N: 1500,
      cutting_force_radial_N: 500,
      cutting_force_axial_N: 300,
    });
    expect(r.valid).toBe(true);
  });

  it("chuck_force: rejects negative mass", () => {
    const r = validate(TURNING_ACTION_SCHEMAS, "chuck_force", {
      workpiece_mass_kg: -1,
      workpiece_od_mm: 80,
      workpiece_length_mm: 200,
      gripping_diameter_mm: 75,
      gripping_length_mm: 30,
      spindle_rpm: 2000,
      max_spindle_rpm: 4000,
      cutting_force_tangential_N: 1500,
      cutting_force_radial_N: 500,
      cutting_force_axial_N: 300,
    });
    expect(r.valid).toBe(false);
  });

  it("part_off_force: rejects blade_width outside range", () => {
    const r = validate(TURNING_ACTION_SCHEMAS, "part_off_force", {
      bar_diameter_mm: 50,
      blade_width_mm: 0.1, // too small (min 0.5)
      feed_per_rev_mm: 0.1,
      cutting_speed_m_min: 120,
    });
    expect(r.valid).toBe(false);
  });

  it("part_off_force: valid params pass", () => {
    const r = validate(TURNING_ACTION_SCHEMAS, "part_off_force", {
      bar_diameter_mm: 50,
      blade_width_mm: 3,
      feed_per_rev_mm: 0.1,
      cutting_speed_m_min: 120,
    });
    expect(r.valid).toBe(true);
  });

  it("thread_single_point: validates thread_form enum", () => {
    const r = validate(TURNING_ACTION_SCHEMAS, "thread_single_point", {
      pitch_mm: 1.5,
      major_diameter_mm: 10,
      total_depth_mm: 0.92,
      spindle_rpm: 800,
      thread_length_mm: 20,
      material_tensile_MPa: 500,
      thread_form: "INVALID", // not in enum
    });
    expect(r.valid).toBe(false);
  });

  it("all 7 actions have schemas", () => {
    const actions = ["chuck_force", "tailstock", "steady_rest", "live_tool", "bar_pull", "thread_single_point", "part_off_force"];
    for (const a of actions) {
      expect(TURNING_ACTION_SCHEMAS[a]).toBeDefined();
    }
  });
});

// ============================================================================
// GRINDING — burn/white-layer risk
// ============================================================================
describe("Grinding Zod Schemas", () => {
  it("grinding_force: rejects DOC > 5mm (safety)", () => {
    const r = validate(GRINDING_ACTION_SCHEMAS, "grinding_force", {
      wheel_diameter_mm: 200,
      wheel_speed_m_s: 30,
      work_speed_m_min: 15,
      depth_of_cut_mm: 6, // > 5mm safety limit
      width_of_cut_mm: 20,
    });
    expect(r.valid).toBe(false);
  });

  it("grinding_force: valid params pass", () => {
    const r = validate(GRINDING_ACTION_SCHEMAS, "grinding_force", {
      wheel_diameter_mm: 200,
      wheel_speed_m_s: 30,
      work_speed_m_min: 15,
      depth_of_cut_mm: 0.02,
      width_of_cut_mm: 20,
    });
    expect(r.valid).toBe(true);
  });

  it("all 6 actions have schemas", () => {
    const actions = ["wheel_select", "dress_params", "burn_threshold", "surface_integrity", "grinding_force", "surface_finish_predict"];
    for (const a of actions) {
      expect(GRINDING_ACTION_SCHEMAS[a]).toBeDefined();
    }
  });
});

// ============================================================================
// EDM — electrode/wire safety
// ============================================================================
describe("EDM Zod Schemas", () => {
  it("electrode_design: valid params pass", () => {
    const r = validate(EDM_ACTION_SCHEMAS, "electrode_design", {
      cavity_depth_mm: 25,
      cavity_width_mm: 50,
      cavity_length_mm: 80,
      workpiece_material: "H13",
      workpiece_hardness_HRC: 52,
      surface_finish_target_Ra_um: 0.4,
      tolerance_mm: 0.01,
      num_cavities: 1,
    });
    expect(r.valid).toBe(true);
  });

  it("wire_settings: validates wire_type enum", () => {
    const r = validate(EDM_ACTION_SCHEMAS, "wire_settings", {
      wire_type: "INVALID",
      workpiece_material: "D2",
      workpiece_thickness_mm: 50,
      workpiece_hardness_HRC: 60,
      target_surface_finish_Ra_um: 0.2,
      target_accuracy_mm: 0.005,
    });
    expect(r.valid).toBe(false);
  });

  it("all 4 actions have schemas", () => {
    const actions = ["electrode_design", "wire_settings", "surface_integrity", "micro_edm"];
    for (const a of actions) {
      expect(EDM_ACTION_SCHEMAS[a]).toBeDefined();
    }
  });
});

// ============================================================================
// PROCESS CONTROL — CTC/SPC/DOE
// ============================================================================
describe("Process Control Zod Schemas", () => {
  it("spc_ewma: valid params pass", () => {
    const r = validate(PROCESS_CONTROL_ACTION_SCHEMAS, "spc_ewma", {
      data: [10.1, 10.2, 9.9, 10.0, 10.3, 9.8],
      lambda: 0.2,
    });
    expect(r.valid).toBe(true);
  });

  it("spc_ewma: rejects lambda > 1", () => {
    const r = validate(PROCESS_CONTROL_ACTION_SCHEMAS, "spc_ewma", {
      data: [10.1, 10.2, 9.9],
      lambda: 1.5,
    });
    expect(r.valid).toBe(false);
  });

  it("spc_cusum: rejects data with < 3 points", () => {
    const r = validate(PROCESS_CONTROL_ACTION_SCHEMAS, "spc_cusum", {
      data: [10.1, 10.2],
    });
    expect(r.valid).toBe(false);
  });

  it("ctc_analyze: rejects negative process gain", () => {
    const r = validate(PROCESS_CONTROL_ACTION_SCHEMAS, "ctc_analyze", {
      process_gain_Kp: -0.5,
      controller_gain_Kc: 0.4,
    });
    expect(r.valid).toBe(false);
  });

  it("all 6 actions have schemas", () => {
    const actions = ["ctc_analyze", "ctc_optimal_gain", "ctc_autocorrelation", "spc_ewma", "spc_cusum", "doe_analyze"];
    for (const a of actions) {
      expect(PROCESS_CONTROL_ACTION_SCHEMAS[a]).toBeDefined();
    }
  });
});
