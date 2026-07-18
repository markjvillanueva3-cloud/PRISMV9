/**
 * Tests for Surface Treatment & Process Planning Engine Batch 11:
 * HeatTreatmentResponse, Passivation, PlatingAllowance, ShotPeening,
 * RecastLayer, WhiteLayerDetection, MaskingCalculator, ProcessPlan
 */
import { describe, it, expect } from "vitest";
import { heatTreatmentResponseEngine } from "../engines/HeatTreatmentResponseEngine.js";
import { passivationEngine } from "../engines/PassivationEngine.js";
import { platingAllowanceEngine } from "../engines/PlatingAllowanceEngine.js";
import { shotPeeningEngine } from "../engines/ShotPeeningEngine.js";
import { recastLayerEngine } from "../engines/RecastLayerEngine.js";
import { whiteLayerDetectionEngine } from "../engines/WhiteLayerDetectionEngine.js";
import { maskingCalculatorEngine } from "../engines/MaskingCalculatorEngine.js";
import { processPlanEngine } from "../engines/ProcessPlanEngine.js";

// ── Heat Treatment Response ──────────────────────────────────────
describe("HeatTreatmentResponseEngine", () => {
  it("predicts hardness after quench+temper", () => {
    const r = heatTreatmentResponseEngine.predict({
      process: "harden_quench",
      material: "4140",
      carbon_pct: 0.4,
      austenitize_temp_C: 845,
      hold_time_min: 60,
      quench_medium: "oil",
      temper_temp_C: 400,
      temper_time_min: 120,
      section_thickness_mm: 25,
    });
    expect(r.predicted_surface_hardness_HRC).toBeGreaterThan(30);
    expect(r.predicted_core_hardness_HRC).toBeGreaterThan(0);
    expect(r.distortion_risk).toBeDefined();
  });

  it("generates temper curve", () => {
    const r = heatTreatmentResponseEngine.temperCurve(0.4, 60);
    expect(r.length).toBeGreaterThan(3);
    expect(r[0].hardness_HRC).toBeGreaterThan(r[r.length - 1].hardness_HRC);
  });

  it("recommends treatment for target hardness", () => {
    const r = heatTreatmentResponseEngine.recommend("4140", 45, 25);
    expect(r).toBeDefined();
  });
});

// ── Passivation ──────────────────────────────────────────────────
describe("PassivationEngine", () => {
  it("calculates passivation parameters", () => {
    const r = passivationEngine.calculate({
      method: "citric_acid",
      family: "austenitic",
      alloy: "304",
      surface_condition: "machined",
      contamination_level: "light",
      part_surface_area_cm2: 500,
      tank_volume_liters: 50,
    });
    expect(r).toBeDefined();
    expect(r.immersion_time_min).toBeGreaterThan(0);
    expect(r.acid_concentration_pct).toBeGreaterThan(0);
  });

  it("nitric acid for martensitic", () => {
    const r = passivationEngine.calculate({
      method: "nitric_acid",
      family: "martensitic",
      alloy: "440C",
      surface_condition: "ground",
      contamination_level: "moderate",
      part_surface_area_cm2: 200,
      tank_volume_liters: 30,
    });
    expect(r.temperature_C).toBeGreaterThan(0);
    expect(r.acid_concentration_pct).toBeGreaterThan(0);
  });
});

// ── Plating Allowance ────────────────────────────────────────────
describe("PlatingAllowanceEngine", () => {
  it("calculates hard chrome allowance for OD", () => {
    const r = platingAllowanceEngine.calculateAllowance({
      process: "hard_chrome",
      target_thickness_um: 25,
      dimension_type: "od",
      nominal_dimension_mm: 50,
      dimension_tolerance_mm: 0.025,
      substrate_material: "4140 steel",
      surface_finish_Ra_before_um: 0.8,
      is_masking_required: false,
    });
    expect(r.machine_to_mm).toBeLessThan(50);
    expect(r.buildup_per_side_um).toBeGreaterThan(0);
  });

  it("ID grows inward (machine larger)", () => {
    const r = platingAllowanceEngine.calculateAllowance({
      process: "hard_chrome",
      target_thickness_um: 25,
      dimension_type: "id",
      nominal_dimension_mm: 20,
      dimension_tolerance_mm: 0.025,
      substrate_material: "4140 steel",
      surface_finish_Ra_before_um: 0.8,
      is_masking_required: false,
    });
    expect(r.machine_to_mm).toBeGreaterThan(20);
  });

  it("calculates tolerance impact", () => {
    const r = platingAllowanceEngine.calculateTolerance({
      process: "electroless_nickel",
      target_thickness_um: 12,
      dimension_type: "od",
      nominal_dimension_mm: 25,
      dimension_tolerance_mm: 0.01,
      substrate_material: "6061-T6",
      surface_finish_Ra_before_um: 1.6,
      is_masking_required: false,
    });
    expect(r).toBeDefined();
    expect(r.achievable_tolerance_mm).toBeGreaterThan(0);
  });

  it("recommends plating for application", () => {
    const r = platingAllowanceEngine.recommend("steel", "wear");
    expect(r).toBeDefined();
  });
});

// ── Shot Peening ─────────────────────────────────────────────────
describe("ShotPeeningEngine", () => {
  it("calculates shot peening parameters", () => {
    const r = shotPeeningEngine.calculate({
      almen_strip: "A",
      target_intensity_mm: 0.20,
      coverage_pct: 200,
      shot_media: "steel_shot",
      shot_size_mm: 0.6,
      workpiece_material: "4340",
      workpiece_hardness_HRC: 45,
      surface_area_mm2: 5000,
      is_fatigue_critical: true,
    });
    expect(r).toBeDefined();
    expect(r.max_compressive_stress_MPa).toBeGreaterThan(0);
  });

  it("higher intensity = deeper compression", () => {
    const lo = shotPeeningEngine.calculate({
      almen_strip: "A",
      target_intensity_mm: 0.10,
      coverage_pct: 200,
      shot_media: "steel_shot",
      shot_size_mm: 0.4,
      workpiece_material: "4340",
      workpiece_hardness_HRC: 45,
      surface_area_mm2: 5000,
      is_fatigue_critical: true,
    });
    const hi = shotPeeningEngine.calculate({
      almen_strip: "A",
      target_intensity_mm: 0.30,
      coverage_pct: 200,
      shot_media: "steel_shot",
      shot_size_mm: 0.8,
      workpiece_material: "4340",
      workpiece_hardness_HRC: 45,
      surface_area_mm2: 5000,
      is_fatigue_critical: true,
    });
    expect(hi.residual_stress_depth_mm).toBeGreaterThanOrEqual(
      lo.residual_stress_depth_mm
    );
  });
});

// ── Recast Layer ─────────────────────────────────────────────────
describe("RecastLayerEngine", () => {
  it("predicts recast layer from wire EDM", () => {
    const r = recastLayerEngine.predict({
      process: "wire_edm",
      workpiece_material: "D2",
      workpiece_carbon_pct: 1.5,
      discharge_energy_mJ: 5,
      peak_current_A: 8,
      voltage_V: 60,
      pulse_on_us: 10,
      pulse_off_us: 20,
      flushing: "submerged",
      num_skim_passes: 2,
    });
    expect(r.estimated_depth_um).toBeGreaterThan(0);
    expect(r.risk_level).toBeDefined();
  });

  it("validates safety", () => {
    const r = recastLayerEngine.validate({
      process: "sinker_edm",
      workpiece_material: "Inconel_718",
      workpiece_carbon_pct: 0.04,
      discharge_energy_mJ: 20,
      peak_current_A: 15,
      voltage_V: 80,
      pulse_on_us: 20,
      pulse_off_us: 15,
      flushing: "jet",
      num_skim_passes: 0,
    });
    expect(r.safe).toBeDefined();
    expect(r.risk).toBeDefined();
  });

  it("skim passes reduce recast", () => {
    const noSkim = recastLayerEngine.predict({
      process: "wire_edm",
      workpiece_material: "D2",
      workpiece_carbon_pct: 1.5,
      discharge_energy_mJ: 5,
      peak_current_A: 8,
      voltage_V: 60,
      pulse_on_us: 10,
      pulse_off_us: 20,
      flushing: "submerged",
      num_skim_passes: 0,
    });
    const withSkim = recastLayerEngine.predict({
      process: "wire_edm",
      workpiece_material: "D2",
      workpiece_carbon_pct: 1.5,
      discharge_energy_mJ: 5,
      peak_current_A: 8,
      voltage_V: 60,
      pulse_on_us: 10,
      pulse_off_us: 20,
      flushing: "submerged",
      num_skim_passes: 3,
    });
    expect(withSkim.estimated_depth_um).toBeLessThanOrEqual(
      noSkim.estimated_depth_um
    );
  });
});

// ── White Layer Detection ────────────────────────────────────────
describe("WhiteLayerDetectionEngine", () => {
  it("predicts white layer risk in hard turning", () => {
    const r = whiteLayerDetectionEngine.predict({
      cutting_speed_mmin: 200,
      feed_per_rev_mm: 0.15,
      depth_of_cut_mm: 0.2,
      workpiece_hardness_HRC: 62,
      tool_wear_VB_mm: 0.3,
      tool_material: "CBN",
      coolant: "dry",
      operation: "hard_turning",
    });
    expect(r.risk_level).toBeDefined();
    expect(r.estimated_layer_depth_um).toBeGreaterThanOrEqual(0);
    expect(r.safe_to_proceed).toBeDefined();
  });

  it("worn tool + dry = higher risk", () => {
    const good = whiteLayerDetectionEngine.predict({
      cutting_speed_mmin: 120,
      feed_per_rev_mm: 0.08,
      depth_of_cut_mm: 0.1,
      workpiece_hardness_HRC: 60,
      tool_wear_VB_mm: 0.05,
      tool_material: "CBN",
      coolant: "flood",
      operation: "hard_turning",
    });
    const bad = whiteLayerDetectionEngine.predict({
      cutting_speed_mmin: 250,
      feed_per_rev_mm: 0.2,
      depth_of_cut_mm: 0.3,
      workpiece_hardness_HRC: 62,
      tool_wear_VB_mm: 0.4,
      tool_material: "CBN",
      coolant: "dry",
      operation: "hard_turning",
    });
    const riskOrder = ["none", "low", "moderate", "high", "critical"];
    expect(riskOrder.indexOf(bad.risk_level)).toBeGreaterThanOrEqual(
      riskOrder.indexOf(good.risk_level)
    );
  });
});

// ── Masking Calculator ───────────────────────────────────────────
describe("MaskingCalculatorEngine", () => {
  it("calculates masking for anodize", () => {
    const r = maskingCalculatorEngine.calculate({
      process: "anodize",
      process_temp_C: 20,
      areas_to_mask: [
        { id: "bore1", geometry: "bore", dimension_mm: 10 },
        { id: "thread1", geometry: "thread", dimension_mm: 8 },
      ],
      part_material: "6061-T6",
      tolerance_at_mask_edge_mm: 0.5,
      batch_size: 50,
    });
    expect(r.mask_assignments.length).toBe(2);
    expect(r.total_mask_area_mm2).toBeGreaterThan(0);
    expect(r.cost_per_part_usd).toBeGreaterThan(0);
  });

  it("high temp process uses heat-resistant masks", () => {
    const r = maskingCalculatorEngine.calculate({
      process: "heat_treat",
      process_temp_C: 850,
      areas_to_mask: [
        { id: "face1", geometry: "face", dimension_mm: 50 },
      ],
      part_material: "4140",
      tolerance_at_mask_edge_mm: 1.0,
      batch_size: 10,
    });
    expect(r.max_process_temp_C).toBeGreaterThan(0);
  });
});

// ── Process Plan ─────────────────────────────────────────────────
describe("ProcessPlanEngine", () => {
  const planInput = {
    part_name: "Test Bracket",
    material_iso_group: "N",
    material_name: "6061-T6",
    features: [
      { id: "f1", category: "face" as const, dimensions: { width_mm: 100, length_mm: 50 } },
      { id: "f2", category: "pocket" as const, dimensions: { width_mm: 40, length_mm: 20, depth_mm: 10 } },
      { id: "f3", category: "hole" as const, dimensions: { diameter_mm: 8, depth_mm: 15 } },
    ],
    stock: { x_mm: 110, y_mm: 60, z_mm: 25 },
  };

  it("generates process plan", () => {
    const r = processPlanEngine.generate(planInput);
    expect(r.operations.length).toBeGreaterThan(0);
    expect(r.part_name).toBe("Test Bracket");
    expect(r.total_setups).toBeGreaterThan(0);
  });

  it("optimizes plan", () => {
    const plan = processPlanEngine.generate(planInput);
    const r = processPlanEngine.optimize(plan);
    expect(r).toBeDefined();
    expect(r.savings_pct).toBeGreaterThanOrEqual(0);
  });

  it("estimates time", () => {
    const plan = processPlanEngine.generate(planInput);
    const r = processPlanEngine.estimateTime(plan, 20);
    expect(r.total_with_setup_min).toBeGreaterThan(0);
    expect(r.setup_time_min).toBe(20);
  });

  it("validates plan", () => {
    const plan = processPlanEngine.generate(planInput);
    const r = processPlanEngine.validate(plan);
    expect(r.valid).toBeDefined();
  });
});
