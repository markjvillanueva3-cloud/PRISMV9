/**
 * Tests for Unwired Engine Batch: 8 engines wired to calcDispatcher
 * GearHobbing, CryogenicTreatment, HardnessConversion, BendAllowance,
 * AnodizeAllowance, ClampingSim, DampingOptimization, CostEstimation
 */
import { describe, it, expect } from "vitest";
import { gearHobbingEngine } from "../engines/GearHobbingEngine.js";
import { cryogenicTreatmentEngine } from "../engines/CryogenicTreatmentEngine.js";
import { hardnessConversionEngine } from "../engines/HardnessConversionEngine.js";
import { bendAllowanceEngine } from "../engines/BendAllowanceEngine.js";
import { anodizeAllowanceEngine } from "../engines/AnodizeAllowanceEngine.js";
import { clampingSimEngine } from "../engines/ClampingSimEngine.js";
import { dampingOptimizationEngine } from "../engines/DampingOptimizationEngine.js";
import { costEstimationEngine } from "../engines/CostEstimationEngine.js";

// ── Gear Hobbing ──────────────────────────────────────────────────
describe("GearHobbingEngine", () => {
  const input = {
    num_teeth: 40,
    module_mm: 2,
    pressure_angle_deg: 20,
    helix_angle_deg: 0,
    face_width_mm: 20,
    hob_diameter_mm: 80,
    hob_num_starts: 1,
    hob_num_gashes: 12,
    hobbing_method: "climb" as const,
    axial_feed_mm_per_rev: 2,
    hob_rpm: 200,
    num_cuts: 1,
  };

  it("calculates hobbing parameters", () => {
    const r = gearHobbingEngine.calculate(input);
    expect(r.workpiece_rpm).toBeGreaterThan(0);
    expect(r.cutting_speed_m_per_min).toBeGreaterThan(0);
    expect(r.cycle_time_sec).toBeGreaterThan(0);
    expect(r.scallop_height_um).toBeGreaterThan(0);
  });

  it("workpiece rpm = hob_rpm / (num_teeth * hob_num_starts)", () => {
    const r = gearHobbingEngine.calculate(input);
    expect(r.workpiece_rpm).toBeCloseTo(200 / 40, 1);
  });

  it("generates shift plan", () => {
    const r = gearHobbingEngine.shiftPlan(input, 100);
    expect(r.total_shift_range_mm).toBeGreaterThan(0);
    expect(r.parts_per_shift_position).toBeGreaterThan(0);
  });

  it("handles helical gears", () => {
    const helical = { ...input, helix_angle_deg: 20 };
    const r = gearHobbingEngine.calculate(helical);
    expect(r.workpiece_rpm).toBeGreaterThan(0);
    expect(r.recommendations.length).toBeGreaterThan(0);
  });

  it("handles multi-cut strategy", () => {
    const multiCut = { ...input, num_cuts: 2, stock_allowance_mm: 0.3 };
    const r = gearHobbingEngine.calculate(multiCut);
    expect(r.cycle_time_sec).toBeGreaterThan(0);
  });
});

// ── Cryogenic Treatment ──────────────────────────────────────────
describe("CryogenicTreatmentEngine", () => {
  const input = {
    material_type: "HSS" as const,
    carbon_pct: 0.85,
    retained_austenite_pct: 15,
    prior_hardness_HRC: 62,
    cryo_level: "deep" as const,
    soak_time_hr: 24,
  };

  it("predicts hardness and wear improvement", () => {
    const r = cryogenicTreatmentEngine.predict(input);
    expect(r.predicted_hardness_HRC).toBeGreaterThanOrEqual(input.prior_hardness_HRC);
    expect(r.wear_improvement_pct).toBeGreaterThan(0);
    expect(r.retained_austenite_after_pct).toBeLessThan(input.retained_austenite_pct);
  });

  it("recommends treatment for material", () => {
    const r = cryogenicTreatmentEngine.recommend("HSS", 15);
    expect(r).toBeDefined();
  });

  it("calculates ROI", () => {
    const r = cryogenicTreatmentEngine.calculateROI(input, 50, 100);
    expect(r.tool_life_multiplier).toBeGreaterThan(1);
    expect(r.annual_savings_usd).toBeDefined();
  });

  it("shallow cryo gives less improvement than deep", () => {
    const shallow = cryogenicTreatmentEngine.predict({ ...input, cryo_level: "shallow" });
    const deep = cryogenicTreatmentEngine.predict(input);
    expect(deep.wear_improvement_pct).toBeGreaterThan(shallow.wear_improvement_pct);
  });
});

// ── Hardness Conversion ──────────────────────────────────────────
describe("HardnessConversionEngine", () => {
  it("converts HRC to HV", () => {
    const r = hardnessConversionEngine.convert({ value: 45, from_scale: "HRC", to_scale: "HV" });
    expect(r.converted_value).toBeGreaterThan(400);
    expect(r.converted_value).toBeLessThan(500);
  });

  it("converts HRC to HBW", () => {
    const r = hardnessConversionEngine.convert({ value: 40, from_scale: "HRC", to_scale: "HBW" });
    expect(r.converted_value).toBeGreaterThan(350);
    expect(r.converted_value).toBeLessThan(400);
  });

  it("provides tensile strength correlation", () => {
    const r = hardnessConversionEngine.convert({ value: 30, from_scale: "HRC", to_scale: "HV" });
    expect(r.tensile_strength_MPa).toBeGreaterThan(900);
  });

  it("batch converts multiple values", () => {
    const r = hardnessConversionEngine.batchConvert([30, 40, 50], "HRC", "HV");
    expect(r).toHaveLength(3);
    expect(r[0].converted_value).toBeLessThan(r[1].converted_value);
  });

  it("handles same-scale identity", () => {
    const r = hardnessConversionEngine.convert({ value: 45, from_scale: "HRC", to_scale: "HRC" });
    expect(r.converted_value).toBeCloseTo(45, 0);
  });
});

// ── Bend Allowance ───────────────────────────────────────────────
describe("BendAllowanceEngine", () => {
  const input = {
    material: "aluminum_6061",
    thickness_mm: 2,
    bend_angle_deg: 90,
    inside_radius_mm: 3,
    bend_method: "air_bend" as const,
  };

  it("calculates bend allowance", () => {
    const r = bendAllowanceEngine.calculate(input);
    expect(r.bend_allowance_mm).toBeGreaterThan(0);
    expect(r.bend_deduction_mm).toBeGreaterThan(0);
    expect(r.k_factor_used).toBeGreaterThan(0.2);
    expect(r.k_factor_used).toBeLessThan(0.6);
  });

  it("calculates tonnage", () => {
    const r = bendAllowanceEngine.calculate(input);
    expect(r.tonnage_per_meter_kN).toBeGreaterThan(0);
  });

  it("provides springback compensation", () => {
    const r = bendAllowanceEngine.calculate(input);
    expect(r.springback_angle_deg).toBeGreaterThan(0);
    expect(r.compensated_bend_angle_deg).toBeGreaterThan(0);
  });

  it("respects provided k_factor", () => {
    const r = bendAllowanceEngine.calculate({ ...input, k_factor: 0.44 });
    expect(r.k_factor_used).toBeCloseTo(0.44, 2);
  });

  it("reports min bend radius", () => {
    const r = bendAllowanceEngine.calculate(input);
    expect(r.min_bend_radius_mm).toBeGreaterThan(0);
  });
});

// ── Anodize Allowance ────────────────────────────────────────────
describe("AnodizeAllowanceEngine", () => {
  const input = {
    anodize_type: "type_III_hard" as const,
    target_thickness_um: 50,
    alloy: "6061-T6",
    dimension_type: "od" as const,
    nominal_dimension_mm: 25.4,
    tolerance_mm: 0.025,
    is_dyed: false,
    seal_type: "hot_water" as const,
  };

  it("calculates dimensional changes for hard anodize", () => {
    const r = anodizeAllowanceEngine.calculate(input);
    expect(r.buildup_per_side_um).toBeGreaterThan(0);
    expect(r.penetration_per_side_um).toBeGreaterThan(0);
    expect(r.machine_to_mm).toBeLessThan(input.nominal_dimension_mm); // OD must be smaller pre-anodize
  });

  it("ID grows inward (machine larger)", () => {
    const idInput = { ...input, dimension_type: "id" as const };
    const r = anodizeAllowanceEngine.calculate(idInput);
    expect(r.machine_to_mm).toBeGreaterThan(input.nominal_dimension_mm);
  });

  it("type II has less buildup than type III", () => {
    const typeII = anodizeAllowanceEngine.calculate({ ...input, anodize_type: "type_II_sulfuric" as const, target_thickness_um: 25 });
    const typeIII = anodizeAllowanceEngine.calculate(input);
    expect(typeIII.buildup_per_side_um).toBeGreaterThan(typeII.buildup_per_side_um);
  });

  it("provides hardness estimate", () => {
    const r = anodizeAllowanceEngine.calculate(input);
    expect(r.hardness_HV).toBeGreaterThan(200);
  });
});

// ── Clamping Simulation ──────────────────────────────────────────
describe("ClampingSimEngine", () => {
  const clampInput = {
    clamp_points: [
      {
        id: "jaw1",
        type: "vise_jaw" as const,
        position: { x: 0, y: 0, z: 0 },
        force_direction: { fx: 1, fy: 0, fz: 0 },
        max_force_N: 10000,
        contact_area_mm2: 500,
        friction_coefficient: 0.3,
      },
      {
        id: "jaw2",
        type: "vise_jaw" as const,
        position: { x: 100, y: 0, z: 0 },
        force_direction: { fx: -1, fy: 0, fz: 0 },
        max_force_N: 10000,
        contact_area_mm2: 500,
        friction_coefficient: 0.3,
      },
    ],
    cutting_forces: {
      fx_N: 500, fy_N: 300, fz_N: 200,
      torque_Nm: 10, max_resultant_N: 600,
    },
    part_mass_kg: 2.0,
    part_material: "aluminum_6061",
    part_dimensions: { width_mm: 100, height_mm: 50, depth_mm: 30 },
  };

  it("simulates clamping and returns safety factor", () => {
    const r = clampingSimEngine.simulate(clampInput);
    expect(r).toBeDefined();
  });

  it("validates clamping setup", () => {
    const r = clampingSimEngine.validate(clampInput);
    expect(r).toBeDefined();
  });

  it("optimizes clamping forces", () => {
    const r = clampingSimEngine.optimize(clampInput);
    expect(r).toBeDefined();
  });
});

// ── Damping Optimization ─────────────────────────────────────────
describe("DampingOptimizationEngine", () => {
  const input = {
    target_freq_Hz: 1000,
    structure_mass_kg: 5,
    structure_stiffness_N_per_m: 2e8,
    structure_damping_ratio: 0.02,
  };

  it("optimizes damping strategy", () => {
    const r = dampingOptimizationEngine.optimize(input);
    expect(r).toBeDefined();
    expect(r.best_strategy).toBeDefined();
    expect(r.results.length).toBeGreaterThan(0);
  });

  it("evaluates specific strategies when requested", () => {
    const r = dampingOptimizationEngine.optimize({
      ...input,
      strategies: ["tuned_mass_damper", "variable_speed"],
    });
    expect(r.results.length).toBeLessThanOrEqual(2);
  });

  it("TMD improves damping", () => {
    const r = dampingOptimizationEngine.optimize({
      ...input,
      strategies: ["tuned_mass_damper"],
    });
    const tmd = r.results.find(x => x.strategy === "tuned_mass_damper");
    expect(tmd).toBeDefined();
    expect(tmd!.damping_improvement_ratio).toBeGreaterThan(1);
  });
});

// ── Cost Estimation ──────────────────────────────────────────────
describe("CostEstimationEngine", () => {
  const input = {
    material_name: "aluminum_6061",
    material_iso_group: "N",
    stock_volume_cm3: 500,
    part_volume_cm3: 200,
    machine_rate_per_hour: 120,
    cycle_time_min: 45,
    setup_time_min: 30,
    num_tools: 5,
    batch_size: 50,
  };

  it("estimates cost breakdown", () => {
    const r = costEstimationEngine.estimate(input);
    expect(r.total_per_part).toBeGreaterThan(0);
    expect(r.total_batch).toBeGreaterThan(r.total_per_part);
    expect(r.material_cost).toBeGreaterThan(0);
    expect(r.machine_cost).toBeGreaterThan(0);
  });

  it("setup cost amortized over batch", () => {
    const small = costEstimationEngine.estimate({ ...input, batch_size: 1 });
    const large = costEstimationEngine.estimate({ ...input, batch_size: 100 });
    expect(small.total_per_part).toBeGreaterThan(large.total_per_part);
  });

  it("identifies cost drivers", () => {
    const r = costEstimationEngine.estimate(input);
    expect(r.cost_drivers.length).toBeGreaterThan(0);
    const totalPct = r.cost_drivers.reduce((s, d) => s + d.pct_of_total, 0);
    expect(totalPct).toBeCloseTo(100, -1);
  });

  it("compares materials", () => {
    const r = costEstimationEngine.compareMaterials(
      [{ name: "aluminum_6061", iso_group: "N" }, { name: "steel_4140", iso_group: "P" }],
      input,
    );
    expect(r.materials.length).toBe(2);
    expect(r.cheapest).toBeDefined();
  });
});
