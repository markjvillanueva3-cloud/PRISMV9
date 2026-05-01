/**
 * Tests for Phase 0-D-7b wirings:
 *   U-PROC1: HoningProcessEngine + BurnishingPolishingEngine → calcDispatcher
 *   U-PROC2: GrindingWheelDressingOptimizationEngine → grindingDispatcher
 *   U-PROC3: ScrapRootCauseEngine + ToolSubstitutionRiskEngine → diagnosisDispatcher
 */

import { describe, it, expect } from "vitest";
import { honingProcessEngine } from "../engines/HoningProcessEngine.js";
import { burnishingPolishingEngine } from "../engines/BurnishingPolishingEngine.js";
import { grindingWheelDressingOptimizationEngine } from "../engines/GrindingWheelDressingOptimizationEngine.js";
import { scrapRootCauseEngine } from "../engines/ScrapRootCauseEngine.js";
import { toolSubstitutionRiskEngine } from "../engines/ToolSubstitutionRiskEngine.js";

// ── U-PROC1: HoningProcessEngine ────────────────────────────────

describe("HoningProcessEngine.designHoningProcess", () => {
  it("designs a honing process with all output fields", () => {
    const result = honingProcessEngine.designHoningProcess({
      bore_diameter_mm: 50,
      bore_length_mm: 80,
      material: "cast_iron",
      initial_Ra_um: 1.6,
      target_Ra_um: 0.4,
    });
    expect(result).toHaveProperty("stone_spec");
    expect(result).toHaveProperty("expansion_pressure_bar");
    expect(result).toHaveProperty("rotation_rpm");
    expect(result).toHaveProperty("reciprocation_rate_spm");
    expect(result).toHaveProperty("stroke_length_mm");
    expect(result).toHaveProperty("expected_Ra");
    expect(result).toHaveProperty("crosshatch_angle");
    expect(result.rotation_rpm).toBeGreaterThan(0);
    expect(result.expected_Ra).toBeLessThanOrEqual(0.4);
  });

  it("harder material gets higher expansion pressure", () => {
    const iron = honingProcessEngine.designHoningProcess({
      bore_diameter_mm: 50, bore_length_mm: 60,
      material: "cast_iron", initial_Ra_um: 1.6, target_Ra_um: 0.4,
    });
    const titanium = honingProcessEngine.designHoningProcess({
      bore_diameter_mm: 50, bore_length_mm: 60,
      material: "titanium", initial_Ra_um: 1.6, target_Ra_um: 0.4,
    });
    expect(titanium.expansion_pressure_bar).toBeGreaterThanOrEqual(iron.expansion_pressure_bar);
  });
});

describe("HoningProcessEngine.selectStone", () => {
  it("selects appropriate stone type", () => {
    const result = honingProcessEngine.selectStone({
      bore_material: "hardened_steel",
      stock_removal_mm: 0.02,
      finish_required_Ra: 0.1,
    });
    expect(result).toHaveProperty("stone_type");
    expect(result).toHaveProperty("grit_size");
    expect(result).toHaveProperty("reasoning");
    expect(result.grit_size).toBeGreaterThan(0);
  });
});

describe("HoningProcessEngine.plateauHoning", () => {
  it("returns two-stage plateau honing parameters", () => {
    const result = honingProcessEngine.plateauHoning({
      bore_diameter_mm: 80,
      material: "cast_iron",
      Rk_target_um: 0.8,
      Rpk_target_um: 0.3,
      Rvk_target_um: 1.5,
    });
    expect(result).toHaveProperty("stage_1");
    expect(result).toHaveProperty("stage_2");
    expect(result).toHaveProperty("expected_profile");
    expect(result.stage_1).toHaveProperty("stone");
    expect(result.stage_1).toHaveProperty("params");
    expect(result.expected_profile).toHaveProperty("Rk");
    expect(result.expected_profile).toHaveProperty("Rpk");
    expect(result.expected_profile).toHaveProperty("Rvk");
  });
});

// ── U-PROC1: BurnishingPolishingEngine ───────────────────────────

describe("BurnishingPolishingEngine.predictBurnishing", () => {
  it("predicts burnishing outcome with Hertz contact", () => {
    const result = burnishingPolishingEngine.predictBurnishing({
      process: "ball",
      material: "carbon_steel",
      initial_Ra_um: 0.8,
      burnishing_force_N: 200,
      feed_mm_per_rev: 0.1,
      speed_mpm: 50,
    });
    expect(result).toHaveProperty("final_Ra_um");
    expect(result).toHaveProperty("hardness_increase_HRC");
    expect(result).toHaveProperty("residual_stress_MPa");
    expect(result).toHaveProperty("depth_of_effect_mm");
    expect(result.final_Ra_um).toBeLessThan(0.8);
    expect(result.residual_stress_MPa).toBeLessThan(0); // compressive
  });

  it("diamond tip process achieves finer finish", () => {
    const ball = burnishingPolishingEngine.predictBurnishing({
      process: "ball", material: "carbon_steel",
      initial_Ra_um: 0.8, burnishing_force_N: 200,
      feed_mm_per_rev: 0.1, speed_mpm: 50,
    });
    const diamond = burnishingPolishingEngine.predictBurnishing({
      process: "diamond_tip", material: "carbon_steel",
      initial_Ra_um: 0.8, burnishing_force_N: 200,
      feed_mm_per_rev: 0.1, speed_mpm: 50,
    });
    expect(diamond.final_Ra_um).toBeLessThanOrEqual(ball.final_Ra_um);
  });
});

describe("BurnishingPolishingEngine.predictLapping", () => {
  it("predicts lapping with Preston's equation", () => {
    const result = burnishingPolishingEngine.predictLapping({
      material: "carbon_steel",
      pressure_kPa: 30,
      velocity_mpm: 20,
      abrasive_size_um: 9,
      target_flatness_um: 0.5,
    });
    expect(result).toHaveProperty("removal_rate_um_per_min");
    expect(result).toHaveProperty("time_to_target_min");
    expect(result).toHaveProperty("expected_flatness_um");
    expect(result).toHaveProperty("surface_Ra_um");
    expect(result.removal_rate_um_per_min).toBeGreaterThan(0);
    expect(result.time_to_target_min).toBeGreaterThan(0);
  });
});

describe("BurnishingPolishingEngine.predictPolishing", () => {
  it("returns multi-step grit progression", () => {
    const result = burnishingPolishingEngine.predictPolishing({
      material: "stainless_steel",
      area_cm2: 50,
      initial_Ra_um: 1.6,
      target_Ra_um: 0.05,
      method: "mechanical",
    });
    expect(result).toHaveProperty("estimated_time_min");
    expect(result).toHaveProperty("cost_estimate");
    expect(result).toHaveProperty("achievable_Ra_um");
    expect(result).toHaveProperty("steps");
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.achievable_Ra_um).toBeLessThanOrEqual(0.05);
    expect(result.cost_estimate).toBeGreaterThan(0);
  });
});

// ── U-PROC2: GrindingWheelDressingOptimizationEngine ─────────────

describe("GrindingWheelDressingOptimizationEngine.predictWheelLife", () => {
  it("predicts wheel life with G-ratio", () => {
    const result = grindingWheelDressingOptimizationEngine.predictWheelLife({
      wheel_spec: "WA60K5V",
      workpiece_material: "carbon_steel",
      depth_of_cut_mm: 0.02,
      table_speed_mpm: 15,
      wheel_speed_mps: 30,
      wheel_diameter_mm: 200,
      wheel_width_mm: 20,
    });
    expect(result).toHaveProperty("g_ratio");
    expect(result).toHaveProperty("wheel_wear_rate_mm3_per_mm3");
    expect(result).toHaveProperty("estimated_life_parts");
    expect(result).toHaveProperty("estimated_life_min");
    expect(result.g_ratio).toBeGreaterThan(0);
    expect(result.estimated_life_parts).toBeGreaterThan(0);
  });
});

describe("GrindingWheelDressingOptimizationEngine.optimizeDressingInterval", () => {
  it("optimizes dressing interval for cost/quality", () => {
    const result = grindingWheelDressingOptimizationEngine.optimizeDressingInterval({
      wheel_spec: "WA60K5V",
      workpiece_material: "alloy_steel",
      depth_of_cut_mm: 0.03,
      table_speed_mpm: 12,
      wheel_speed_mps: 30,
      wheel_diameter_mm: 200,
      wheel_width_mm: 20,
      target_Ra_um: 0.4,
      current_wheel_wear_mm: 0.5,
    });
    expect(result).toHaveProperty("optimal_interval_parts");
    expect(result).toHaveProperty("dressing_depth_mm");
    expect(result).toHaveProperty("wheel_loss_per_dress_mm");
    expect(result).toHaveProperty("total_wheel_cost_per_part");
    expect(result.optimal_interval_parts).toBeGreaterThan(0);
  });
});

describe("GrindingWheelDressingOptimizationEngine.selectDressingTool", () => {
  it("selects dressing tool for vitrified wheel", () => {
    const result = grindingWheelDressingOptimizationEngine.selectDressingTool({
      wheel_type: "vitrified",
      application: "finishing",
    });
    expect(result).toHaveProperty("recommended_tool");
    expect(result).toHaveProperty("traverse_rate_mm_per_rev");
    expect(result).toHaveProperty("overlap_ratio");
    expect(result).toHaveProperty("reasoning");
    expect(result.traverse_rate_mm_per_rev).toBeGreaterThan(0);
  });

  it("recommends different tools for different bond types", () => {
    const vitrified = grindingWheelDressingOptimizationEngine.selectDressingTool({
      wheel_type: "vitrified", application: "roughing",
    });
    const cbn = grindingWheelDressingOptimizationEngine.selectDressingTool({
      wheel_type: "CBN", application: "roughing",
    });
    // CBN wheels need different dressing approach than vitrified
    expect(cbn.recommended_tool).not.toBe(vitrified.recommended_tool);
  });
});

describe("GrindingWheelDressingOptimizationEngine.creepFeedSetup", () => {
  it("returns creep-feed parameters with burn risk", () => {
    const result = grindingWheelDressingOptimizationEngine.creepFeedSetup({
      material: "inconel",
      slot_depth_mm: 5,
      slot_width_mm: 3,
      wheel_diameter_mm: 300,
    });
    expect(result).toHaveProperty("table_speed_mm_min");
    expect(result).toHaveProperty("wheel_speed_mps");
    expect(result).toHaveProperty("coolant_flow_lpm");
    expect(result).toHaveProperty("expected_specific_energy");
    expect(result).toHaveProperty("burn_risk");
    expect(["low", "medium", "high"]).toContain(result.burn_risk);
    expect(result.coolant_flow_lpm).toBeGreaterThan(0);
  });
});

// ── U-PROC3: ScrapRootCauseEngine ────────────────────────────────

describe("ScrapRootCauseEngine.analyzeScrapEvent", () => {
  it("analyzes oversized defect with thermal data", () => {
    const result = scrapRootCauseEngine.analyzeScrapEvent({
      defect_type: "oversized",
      measurements: [
        { feature: "bore_1", nominal: 25.0, actual: 25.035, tolerance: 0.02 },
      ],
      process_data: {
        spindle_load_pct: 60,
        temperature_delta_C: 8,
        tool_age_min: 30,
      },
    });
    expect(result).toHaveProperty("probable_causes");
    expect(result).toHaveProperty("physics_analysis");
    expect(result).toHaveProperty("pattern_type");
    expect(result).toHaveProperty("recommended_checks");
    expect(result.probable_causes.length).toBeGreaterThan(0);
    expect(result.probable_causes[0]).toHaveProperty("probability");
    expect(result.probable_causes[0]).toHaveProperty("corrective_action");
  });

  it("returns valid pattern type for dimensional drift", () => {
    const result = scrapRootCauseEngine.analyzeScrapEvent({
      defect_type: "dimensional_drift",
      measurements: [
        { feature: "dim_1", nominal: 10.0, actual: 10.01, tolerance: 0.02 },
        { feature: "dim_2", nominal: 10.0, actual: 10.02, tolerance: 0.02 },
        { feature: "dim_3", nominal: 10.0, actual: 10.03, tolerance: 0.02 },
      ],
      process_data: { tool_age_min: 50 },
    });
    expect(["random", "systematic", "progressive", "intermittent"]).toContain(result.pattern_type);
    expect(result.physics_analysis.tool_wear_mm).toBeGreaterThan(0);
  });
});

describe("ScrapRootCauseEngine.analyzeTrend", () => {
  it("analyzes trend across multiple scrap events", () => {
    const result = scrapRootCauseEngine.analyzeTrend({
      events: [
        {
          defect_type: "oversized",
          measurements: [{ feature: "bore", nominal: 25, actual: 25.04, tolerance: 0.02 }],
          process_data: { temperature_delta_C: 10 },
        },
        {
          defect_type: "oversized",
          measurements: [{ feature: "bore", nominal: 25, actual: 25.05, tolerance: 0.02 }],
          process_data: { temperature_delta_C: 12 },
        },
        {
          defect_type: "surface_finish",
          measurements: [{ feature: "wall", nominal: 0.8, actual: 1.6, tolerance: 0.4 }],
          process_data: { vibration_rms: 5.0 },
        },
      ],
    });
    expect(result).toHaveProperty("trend");
    expect(result).toHaveProperty("common_causes");
    expect(result).toHaveProperty("systemic_issues");
    expect(result).toHaveProperty("estimated_cost_impact_per_month");
    expect(["improving", "stable", "degrading"]).toContain(result.trend);
  });
});

// ── U-PROC3: ToolSubstitutionRiskEngine ──────────────────────────

describe("ToolSubstitutionRiskEngine.assessSubstitution", () => {
  it("assesses risk when substituting a smaller tool", () => {
    const result = toolSubstitutionRiskEngine.assessSubstitution({
      original: {
        diameter_mm: 12, flutes: 4, type: "end_mill",
        coating: "TiAlN", helix_angle_deg: 30,
      },
      substitute: {
        diameter_mm: 10, flutes: 3, type: "end_mill",
        coating: "TiN", helix_angle_deg: 35,
      },
      operation: {
        material: "alloy_steel", depth_mm: 5, width_mm: 6,
        feed_per_tooth_mm: 0.08, spindle_rpm: 3000,
      },
      tolerance_mm: 0.02,
    });
    expect(result).toHaveProperty("overall_risk");
    expect(result).toHaveProperty("risk_factors");
    expect(result).toHaveProperty("parameter_adjustments");
    expect(result).toHaveProperty("warnings");
    expect(result).toHaveProperty("approval_recommended");
    expect(["low", "medium", "high", "critical"]).toContain(result.overall_risk);
    expect(result.risk_factors).toHaveProperty("deflection_delta_mm");
    expect(result.risk_factors).toHaveProperty("chip_load_change_pct");
  });

  it("same-size same-coating swap is low risk", () => {
    const result = toolSubstitutionRiskEngine.assessSubstitution({
      original: {
        diameter_mm: 12, flutes: 4, type: "end_mill",
        coating: "TiAlN", helix_angle_deg: 30,
      },
      substitute: {
        diameter_mm: 12, flutes: 4, type: "end_mill",
        coating: "TiAlN", helix_angle_deg: 30,
      },
      operation: {
        material: "carbon_steel", depth_mm: 3, width_mm: 6,
        feed_per_tooth_mm: 0.06, spindle_rpm: 2500,
      },
      tolerance_mm: 0.05,
    });
    expect(result.overall_risk).toBe("low");
    expect(result.risk_factors.deflection_delta_mm).toBeCloseTo(0, 3);
  });

  it("provides adjusted parameters for substitute tool", () => {
    const result = toolSubstitutionRiskEngine.assessSubstitution({
      original: {
        diameter_mm: 16, flutes: 4, type: "end_mill",
        coating: "TiAlN", helix_angle_deg: 30,
      },
      substitute: {
        diameter_mm: 10, flutes: 3, type: "end_mill",
        coating: "TiN", helix_angle_deg: 45,
      },
      operation: {
        material: "stainless_steel", depth_mm: 8, width_mm: 10,
        feed_per_tooth_mm: 0.1, spindle_rpm: 2000,
      },
      tolerance_mm: 0.01,
    });
    expect(result.parameter_adjustments).toHaveProperty("new_rpm");
    expect(result.parameter_adjustments).toHaveProperty("new_feed");
    expect(result.parameter_adjustments.new_rpm).toBeGreaterThan(0);
    expect(result.parameter_adjustments.new_feed).toBeGreaterThan(0);
  });
});

// ── U-PROC3: ToolWearCompensationEngine ───────────────────────

import { toolWearCompensationEngine } from "../engines/ToolWearCompensationEngine.js";

const SAMPLE_GCODE = [
  "T1 M6", "S3000 M3", "G1 X10 Y0 F500", "G1 X50 Y0", "G1 X50 Y30",
  "G1 X10 Y30", "G1 X10 Y0", "T2 M6", "S2000 M3", "G1 X0 Y0 F300",
  "G1 X80 Y0", "G1 X80 Y40", "M30",
].join("\n");

const BASE_INPUT = {
  gcode: SAMPLE_GCODE,
  material: "carbon_steel",
  tools: [
    { tool_number: 1, diameter_mm: 12, flutes: 4 },
    { tool_number: 2, diameter_mm: 10, flutes: 3 },
  ],
};

describe("ToolWearCompensationEngine.compensate", () => {
  it("returns compensated G-code with zones and stats", () => {
    const result = toolWearCompensationEngine.compensate(BASE_INPUT);
    expect(result).toHaveProperty("gcode");
    expect(result).toHaveProperty("tool_sections");
    expect(result).toHaveProperty("stats");
    expect(result).toHaveProperty("warnings");
    expect(result.tool_sections.length).toBeGreaterThan(0);
    expect(result.stats.total_cutting_distance_mm).toBeGreaterThan(0);
    expect(result.stats.tools_compensated).toBeGreaterThan(0);
  });

  it("zones have progressive wear ratios", () => {
    const result = toolWearCompensationEngine.compensate(BASE_INPUT);
    const section = result.tool_sections[0];
    expect(section.zones.length).toBeGreaterThan(0);
    for (let i = 1; i < section.zones.length; i++) {
      expect(section.zones[i].wear_ratio).toBeGreaterThanOrEqual(section.zones[i - 1].wear_ratio);
    }
  });

  it("zones include radial_offset_um field", () => {
    const result = toolWearCompensationEngine.compensate(BASE_INPUT);
    const zone = result.tool_sections[0].zones[0];
    expect(zone).toHaveProperty("radial_offset_um");
    expect(zone.radial_offset_um).toBeGreaterThanOrEqual(0);
    // At default κr=90°, radial offset ≈ VB (not overflow)
    expect(zone.radial_offset_um).toBeLessThan(500); // max 500µm = 0.5mm
  });

  it("clamps S/F to safe minimums (no negative or zero values)", () => {
    const result = toolWearCompensationEngine.compensate({
      ...BASE_INPUT,
      max_feed_reduction_pct: 50, // aggressive reduction
      max_speed_reduction_pct: 50,
    });
    // Verify the output G-code has no negative or zero S/F
    const lines = result.gcode.split("\n");
    for (const line of lines) {
      const sMatch = line.match(/S(\d+)/i);
      if (sMatch) expect(parseInt(sMatch[1])).toBeGreaterThanOrEqual(50);
      const fMatch = line.match(/F(\d+\.?\d*)/i);
      if (fMatch) expect(parseFloat(fMatch[1])).toBeGreaterThanOrEqual(1);
    }
  });

  it("higher wear material gets larger force increase per zone", () => {
    const steel = toolWearCompensationEngine.compensate({ ...BASE_INPUT, material: "aluminum" });
    const superalloy = toolWearCompensationEngine.compensate({ ...BASE_INPUT, material: "inconel" });
    const steelMaxForce = Math.max(...steel.tool_sections[0].zones.map(z => z.force_increase_pct));
    const superMaxForce = Math.max(...superalloy.tool_sections[0].zones.map(z => z.force_increase_pct));
    expect(superMaxForce).toBeGreaterThan(steelMaxForce);
  });
});

describe("ToolWearCompensationEngine.analyze", () => {
  it("returns analysis without modifying G-code", () => {
    const result = toolWearCompensationEngine.analyze(BASE_INPUT);
    expect(result).toHaveProperty("tool_sections");
    expect(result).toHaveProperty("total_cutting_distance_mm");
    expect(result).toHaveProperty("max_wear_ratio");
    expect(result).toHaveProperty("recommendations");
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.total_cutting_distance_mm).toBeGreaterThan(0);
  });
});
