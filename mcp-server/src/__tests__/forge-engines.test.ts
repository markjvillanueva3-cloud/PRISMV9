import { describe, it, expect } from "vitest";
import { toolWearProgressionEngine } from "../engines/ToolWearProgressionEngine.js";
import { grindingForceEngine } from "../engines/GrindingForceEngine.js";
import { drillBreakthroughForceEngine } from "../engines/DrillBreakthroughForceEngine.js";

// ────────────────────────────────────────────────────────────────────
// ToolWearProgressionEngine
// ────────────────────────────────────────────────────────────────────

describe("ToolWearProgressionEngine", () => {
  it("returns AtomicValue format for all outputs", () => {
    const r = toolWearProgressionEngine.calculate({
      cutting_speed_m_min: 200,
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 2,
      tool_grade: "CARBIDE",
      workpiece_hardness_hrc: 30,
    });
    // All AtomicValue fields present
    expect(r.current_vb_mm).toHaveProperty("value");
    expect(r.current_vb_mm).toHaveProperty("unit", "mm");
    expect(r.current_vb_mm).toHaveProperty("uncertainty");
    expect(r.current_vb_mm).toHaveProperty("source");
    expect(r.wear_rate_um_per_min).toHaveProperty("unit", "µm/min");
    expect(r.remaining_life_min).toHaveProperty("unit", "min");
    expect(r.taylor_life_min).toHaveProperty("unit", "min");
  });

  it("fresh tool starts in initial wear stage", () => {
    const r = toolWearProgressionEngine.calculate({
      cutting_speed_m_min: 150,
      feed_mm_rev: 0.15,
      depth_of_cut_mm: 1.5,
      tool_grade: "CARBIDE",
      workpiece_hardness_hrc: 25,
      current_vb_mm: 0,
    });
    expect(r.wear_stage).toBe("initial");
    expect(r.wear_ratio).toBe(0);
    expect(r.is_safe).toBe(true);
  });

  it("detects critical wear stage when VB exceeds limit", () => {
    const r = toolWearProgressionEngine.calculate({
      cutting_speed_m_min: 200,
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 2,
      tool_grade: "CARBIDE",
      workpiece_hardness_hrc: 30,
      current_vb_mm: 0.35,
      vb_limit_mm: 0.3,
    });
    expect(r.wear_stage).toBe("critical");
    expect(r.is_safe).toBe(false);
    expect(r.recommendations[0]).toContain("SAFETY");
  });

  it("steady state phase at mid-life wear", () => {
    const r = toolWearProgressionEngine.calculate({
      cutting_speed_m_min: 150,
      feed_mm_rev: 0.15,
      depth_of_cut_mm: 1.5,
      tool_grade: "CARBIDE",
      workpiece_hardness_hrc: 30,
      current_vb_mm: 0.12,
      vb_limit_mm: 0.3,
    });
    expect(r.wear_stage).toBe("steady");
    expect(r.wear_ratio).toBeCloseTo(0.4, 1);
    expect(r.is_safe).toBe(true);
  });

  it("accelerated phase near end of life", () => {
    const r = toolWearProgressionEngine.calculate({
      cutting_speed_m_min: 200,
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 2,
      tool_grade: "CARBIDE",
      workpiece_hardness_hrc: 40,
      current_vb_mm: 0.25,
      vb_limit_mm: 0.3,
    });
    expect(r.wear_stage).toBe("accelerated");
    expect(r.recommendations.some(r => r.includes("WARNING"))).toBe(true);
  });

  it("harder workpiece increases wear rate", () => {
    const base = {
      cutting_speed_m_min: 150,
      feed_mm_rev: 0.15,
      depth_of_cut_mm: 1.5,
      tool_grade: "CARBIDE" as const,
      current_vb_mm: 0.1,
    };
    const soft = toolWearProgressionEngine.calculate({ ...base, workpiece_hardness_hrc: 20 });
    const hard = toolWearProgressionEngine.calculate({ ...base, workpiece_hardness_hrc: 50 });
    expect(hard.wear_rate_um_per_min.value).toBeGreaterThan(soft.wear_rate_um_per_min.value);
  });

  it("CBN tool has longer life than HSS at same conditions", () => {
    const base = {
      cutting_speed_m_min: 100,
      feed_mm_rev: 0.15,
      depth_of_cut_mm: 1,
      workpiece_hardness_hrc: 30,
    };
    const hss = toolWearProgressionEngine.calculate({ ...base, tool_grade: "HSS" });
    const cbn = toolWearProgressionEngine.calculate({ ...base, tool_grade: "CBN" });
    expect(cbn.remaining_life_min.value).toBeGreaterThan(hss.remaining_life_min.value);
  });

  it("Taylor life decreases with higher cutting speed", () => {
    const base = {
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 2,
      tool_grade: "CARBIDE" as const,
      workpiece_hardness_hrc: 30,
    };
    const slow = toolWearProgressionEngine.calculate({ ...base, cutting_speed_m_min: 100 });
    const fast = toolWearProgressionEngine.calculate({ ...base, cutting_speed_m_min: 300 });
    expect(fast.taylor_life_min.value).toBeLessThan(slow.taylor_life_min.value);
  });

  it("predictAt projects future wear state", () => {
    const r = toolWearProgressionEngine.predictAt({
      cutting_speed_m_min: 200,
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 2,
      tool_grade: "CARBIDE",
      workpiece_hardness_hrc: 30,
      current_vb_mm: 0,
    }, 30);
    expect(r.current_vb_mm.value).toBeGreaterThan(0);
    expect(r.wear_ratio).toBeGreaterThan(0);
  });

  it("handles zero cutting speed gracefully", () => {
    const r = toolWearProgressionEngine.calculate({
      cutting_speed_m_min: 0,
      feed_mm_rev: 0.2,
      depth_of_cut_mm: 2,
      tool_grade: "CARBIDE",
      workpiece_hardness_hrc: 30,
    });
    expect(r.taylor_life_min.value).toBe(99999);  // Infinity capped
    expect(r.is_safe).toBe(true);
  });

  it("warns about HSS at high temperature", () => {
    const r = toolWearProgressionEngine.calculate({
      cutting_speed_m_min: 300,
      feed_mm_rev: 0.3,
      depth_of_cut_mm: 3,
      tool_grade: "HSS",
      workpiece_hardness_hrc: 40,
      cutting_temperature_C: 900,
    });
    expect(r.recommendations.some(r => r.includes("SAFETY") && r.includes("HSS"))).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────
// GrindingForceEngine
// ────────────────────────────────────────────────────────────────────

describe("GrindingForceEngine", () => {
  it("returns AtomicValue format for all outputs", () => {
    const r = grindingForceEngine.calculate({
      wheel_diameter_mm: 200,
      wheel_speed_m_s: 30,
      work_speed_m_min: 15,
      depth_of_cut_mm: 0.02,
      width_of_cut_mm: 20,
      grinding_mode: "surface",
    });
    expect(r.tangential_force_N).toHaveProperty("value");
    expect(r.tangential_force_N).toHaveProperty("unit", "N");
    expect(r.tangential_force_N).toHaveProperty("uncertainty");
    expect(r.tangential_force_N).toHaveProperty("source", "malkin_specific_energy");
    expect(r.grinding_power_kW).toHaveProperty("unit", "kW");
    expect(r.surface_temperature_C).toHaveProperty("unit", "°C");
  });

  it("computes positive forces and power for valid inputs", () => {
    const r = grindingForceEngine.calculate({
      wheel_diameter_mm: 200,
      wheel_speed_m_s: 30,
      work_speed_m_min: 15,
      depth_of_cut_mm: 0.03,
      width_of_cut_mm: 25,
      grinding_mode: "surface",
      workpiece_hardness_hrc: 45,
    });
    expect(r.tangential_force_N.value).toBeGreaterThan(0);
    expect(r.normal_force_N.value).toBeGreaterThan(r.tangential_force_N.value);
    expect(r.grinding_power_kW.value).toBeGreaterThan(0);
    expect(r.mrr_mm3_per_s.value).toBeGreaterThan(0);
    expect(r.contact_arc_length_mm.value).toBeGreaterThan(0);
  });

  it("normal force exceeds tangential (Fn/Ft ratio > 1)", () => {
    const r = grindingForceEngine.calculate({
      wheel_diameter_mm: 200,
      wheel_speed_m_s: 30,
      work_speed_m_min: 10,
      depth_of_cut_mm: 0.02,
      width_of_cut_mm: 20,
      grinding_mode: "surface",
    });
    expect(r.normal_force_N.value / r.tangential_force_N.value).toBeGreaterThan(1.5);
  });

  it("deeper cut increases forces and MRR", () => {
    const base = {
      wheel_diameter_mm: 200,
      wheel_speed_m_s: 30,
      work_speed_m_min: 15,
      width_of_cut_mm: 20,
      grinding_mode: "surface" as const,
      workpiece_hardness_hrc: 40,
    };
    const shallow = grindingForceEngine.calculate({ ...base, depth_of_cut_mm: 0.01 });
    const deep = grindingForceEngine.calculate({ ...base, depth_of_cut_mm: 0.05 });
    expect(deep.tangential_force_N.value).toBeGreaterThan(shallow.tangential_force_N.value);
    expect(deep.mrr_mm3_per_s.value).toBeGreaterThan(shallow.mrr_mm3_per_s.value);
  });

  it("burn risk increases with aggressive parameters", () => {
    const safe = grindingForceEngine.calculate({
      wheel_diameter_mm: 200,
      wheel_speed_m_s: 30,
      work_speed_m_min: 15,
      depth_of_cut_mm: 0.01,
      width_of_cut_mm: 20,
      grinding_mode: "surface",
      coolant_type: "flood",
    });
    const aggressive = grindingForceEngine.calculate({
      wheel_diameter_mm: 200,
      wheel_speed_m_s: 30,
      work_speed_m_min: 15,
      depth_of_cut_mm: 0.10,
      width_of_cut_mm: 20,
      grinding_mode: "surface",
      coolant_type: "dry",
    });
    expect(aggressive.burn_risk).toBeGreaterThan(safe.burn_risk);
  });

  it("creep-feed mode has higher force ratio", () => {
    const base = {
      wheel_diameter_mm: 200,
      wheel_speed_m_s: 30,
      work_speed_m_min: 5,
      depth_of_cut_mm: 0.5,
      width_of_cut_mm: 20,
      workpiece_hardness_hrc: 40,
    };
    const surface = grindingForceEngine.calculate({ ...base, grinding_mode: "surface" });
    const creep = grindingForceEngine.calculate({ ...base, grinding_mode: "creep_feed" });
    const surfaceRatio = surface.normal_force_N.value / surface.tangential_force_N.value;
    const creepRatio = creep.normal_force_N.value / creep.tangential_force_N.value;
    expect(creepRatio).toBeGreaterThan(surfaceRatio);
  });

  it("cylindrical external uses equivalent diameter", () => {
    const r = grindingForceEngine.calculate({
      wheel_diameter_mm: 300,
      wheel_speed_m_s: 30,
      work_speed_m_min: 20,
      depth_of_cut_mm: 0.02,
      width_of_cut_mm: 15,
      grinding_mode: "cylindrical_external",
      workpiece_diameter_mm: 50,
    });
    // Equivalent diameter should be smaller than wheel diameter
    // This affects contact arc length
    expect(r.contact_arc_length_mm.value).toBeGreaterThan(0);
    expect(r.is_safe).toBeDefined();
  });

  it("warns about high wheel speed", () => {
    const r = grindingForceEngine.calculate({
      wheel_diameter_mm: 200,
      wheel_speed_m_s: 50,
      work_speed_m_min: 15,
      depth_of_cut_mm: 0.02,
      width_of_cut_mm: 20,
      grinding_mode: "surface",
    });
    expect(r.recommendations.some(r => r.includes("Wheel speed"))).toBe(true);
  });

  it("handles zero depth gracefully", () => {
    const r = grindingForceEngine.calculate({
      wheel_diameter_mm: 200,
      wheel_speed_m_s: 30,
      work_speed_m_min: 15,
      depth_of_cut_mm: 0,
      width_of_cut_mm: 20,
      grinding_mode: "surface",
    });
    expect(r.tangential_force_N.value).toBe(0);
    expect(r.grinding_power_kW.value).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────────
// DrillBreakthroughForceEngine
// ────────────────────────────────────────────────────────────────────

describe("DrillBreakthroughForceEngine", () => {
  it("returns AtomicValue format for all outputs", () => {
    const r = drillBreakthroughForceEngine.calculate({
      drill_diameter_mm: 10,
      point_angle_deg: 118,
      feed_mm_rev: 0.15,
      spindle_rpm: 1000,
      workpiece_thickness_mm: 20,
      is_through_hole: true,
    });
    expect(r.steady_state_thrust_N).toHaveProperty("value");
    expect(r.steady_state_thrust_N).toHaveProperty("unit", "N");
    expect(r.steady_state_thrust_N).toHaveProperty("source", "kienzle_drilling");
    expect(r.peak_breakthrough_thrust_N).toHaveProperty("unit", "N");
    expect(r.recommended_exit_feed_mm_rev).toHaveProperty("unit", "mm/rev");
  });

  it("breakthrough force exceeds steady state for through holes", () => {
    const r = drillBreakthroughForceEngine.calculate({
      drill_diameter_mm: 12,
      point_angle_deg: 118,
      feed_mm_rev: 0.2,
      spindle_rpm: 800,
      workpiece_thickness_mm: 25,
      is_through_hole: true,
      exit_support: "none",
    });
    expect(r.peak_breakthrough_thrust_N.value).toBeGreaterThan(
      r.steady_state_thrust_N.value
    );
  });

  it("backed exit support reduces breakthrough spike", () => {
    const base = {
      drill_diameter_mm: 10,
      point_angle_deg: 118,
      feed_mm_rev: 0.15,
      spindle_rpm: 1000,
      workpiece_thickness_mm: 20,
      is_through_hole: true,
    };
    const unsupported = drillBreakthroughForceEngine.calculate({ ...base, exit_support: "none" });
    const backed = drillBreakthroughForceEngine.calculate({ ...base, exit_support: "backed" });
    expect(backed.peak_breakthrough_thrust_N.value).toBeLessThan(
      unsupported.peak_breakthrough_thrust_N.value
    );
  });

  it("blind hole has no breakthrough spike", () => {
    const r = drillBreakthroughForceEngine.calculate({
      drill_diameter_mm: 8,
      point_angle_deg: 140,
      feed_mm_rev: 0.12,
      spindle_rpm: 1200,
      workpiece_thickness_mm: 15,
      is_through_hole: false,
    });
    expect(r.peak_breakthrough_thrust_N.value).toBe(
      r.steady_state_thrust_N.value
    );
    expect(r.exit_burr_risk).toBe("low");
  });

  it("larger drill produces more thrust", () => {
    const base = {
      point_angle_deg: 118,
      feed_mm_rev: 0.15,
      spindle_rpm: 1000,
      workpiece_thickness_mm: 20,
      is_through_hole: true,
      workpiece_hardness_hrc: 30,
    };
    const small = drillBreakthroughForceEngine.calculate({ ...base, drill_diameter_mm: 5 });
    const large = drillBreakthroughForceEngine.calculate({ ...base, drill_diameter_mm: 20 });
    expect(large.steady_state_thrust_N.value).toBeGreaterThan(
      small.steady_state_thrust_N.value
    );
  });

  it("harder material increases thrust force", () => {
    const base = {
      drill_diameter_mm: 10,
      point_angle_deg: 118,
      feed_mm_rev: 0.15,
      spindle_rpm: 1000,
      workpiece_thickness_mm: 20,
      is_through_hole: true,
    };
    const soft = drillBreakthroughForceEngine.calculate({ ...base, workpiece_hardness_hrc: 15 });
    const hard = drillBreakthroughForceEngine.calculate({ ...base, workpiece_hardness_hrc: 55 });
    expect(hard.steady_state_thrust_N.value).toBeGreaterThan(
      soft.steady_state_thrust_N.value
    );
  });

  it("chisel edge contributes 30-70% of thrust", () => {
    const r = drillBreakthroughForceEngine.calculate({
      drill_diameter_mm: 10,
      point_angle_deg: 118,
      feed_mm_rev: 0.15,
      spindle_rpm: 1000,
      workpiece_thickness_mm: 20,
      is_through_hole: true,
    });
    expect(r.chisel_edge_contribution_pct).toBeGreaterThanOrEqual(30);
    expect(r.chisel_edge_contribution_pct).toBeLessThanOrEqual(70);
  });

  it("recommends reduced exit feed", () => {
    const r = drillBreakthroughForceEngine.calculate({
      drill_diameter_mm: 10,
      point_angle_deg: 118,
      feed_mm_rev: 0.20,
      spindle_rpm: 1000,
      workpiece_thickness_mm: 15,
      is_through_hole: true,
      exit_support: "none",
    });
    expect(r.recommended_exit_feed_mm_rev.value).toBeLessThan(0.20);
  });

  it("detects high burr risk for soft material with high feed", () => {
    const r = drillBreakthroughForceEngine.calculate({
      drill_diameter_mm: 10,
      point_angle_deg: 118,
      feed_mm_rev: 0.25,
      spindle_rpm: 800,
      workpiece_thickness_mm: 10,
      is_through_hole: true,
      exit_support: "none",
      workpiece_hardness_hrc: 12,
    });
    expect(r.exit_burr_risk).toBe("high");
  });

  it("warns when in breakthrough zone with no support", () => {
    const r = drillBreakthroughForceEngine.calculate({
      drill_diameter_mm: 10,
      point_angle_deg: 118,
      feed_mm_rev: 0.15,
      spindle_rpm: 1000,
      workpiece_thickness_mm: 20,
      remaining_thickness_mm: 1.0,
      is_through_hole: true,
      exit_support: "none",
    });
    expect(r.recommendations.some(r => r.includes("SAFETY"))).toBe(true);
  });

  it("handles zero diameter gracefully", () => {
    const r = drillBreakthroughForceEngine.calculate({
      drill_diameter_mm: 0,
      point_angle_deg: 118,
      feed_mm_rev: 0.15,
      spindle_rpm: 1000,
      workpiece_thickness_mm: 20,
      is_through_hole: true,
    });
    expect(r.steady_state_thrust_N.value).toBe(0);
    expect(r.is_safe).toBeDefined();
  });
});
