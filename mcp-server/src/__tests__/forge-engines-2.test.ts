import { describe, it, expect } from "vitest";
import { ThermalGrowthCompensationEngine } from "../engines/ThermalGrowthCompensationEngine.js";
import { BoreFinishingEngine } from "../engines/BoreFinishingEngine.js";
import { FinishingPassOptimizationEngine } from "../engines/FinishingPassOptimizationEngine.js";

// ─── ThermalGrowthCompensationEngine ─────────────────────────────

describe("ThermalGrowthCompensationEngine", () => {
  const engine = new ThermalGrowthCompensationEngine();

  it("returns AtomicValue format for all outputs", () => {
    const r = engine.calculate({ spindle_speed_rpm: 10000, cutting_time_min: 30, tool_overhang_mm: 50 });
    for (const key of [
      "spindle_growth_um", "tool_holder_growth_um", "tool_growth_um",
      "workpiece_growth_um", "total_z_error_um", "compensation_needed_mm",
      "time_to_stability_min", "spindle_temp_rise_C",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("produces positive spindle growth at high RPM", () => {
    const r = engine.calculate({ spindle_speed_rpm: 15000, cutting_time_min: 60, tool_overhang_mm: 60 });
    expect(r.spindle_growth_um.value).toBeGreaterThan(0);
    expect(r.spindle_temp_rise_C.value).toBeGreaterThan(0);
  });

  it("higher RPM produces more thermal growth", () => {
    const low = engine.calculate({ spindle_speed_rpm: 5000, cutting_time_min: 60, tool_overhang_mm: 50 });
    const high = engine.calculate({ spindle_speed_rpm: 20000, cutting_time_min: 60, tool_overhang_mm: 50 });
    expect(high.spindle_growth_um.value).toBeGreaterThan(low.spindle_growth_um.value);
  });

  it("longer cutting time increases growth toward steady state", () => {
    const short = engine.calculate({ spindle_speed_rpm: 10000, cutting_time_min: 5, tool_overhang_mm: 50 });
    const long = engine.calculate({ spindle_speed_rpm: 10000, cutting_time_min: 120, tool_overhang_mm: 50 });
    expect(long.spindle_growth_um.value).toBeGreaterThan(short.spindle_growth_um.value);
  });

  it("aluminum workpiece has higher growth than steel", () => {
    const steel = engine.calculate({ spindle_speed_rpm: 10000, cutting_time_min: 30, tool_overhang_mm: 50, workpiece_material: "steel" });
    const alu = engine.calculate({ spindle_speed_rpm: 10000, cutting_time_min: 30, tool_overhang_mm: 50, workpiece_material: "aluminum" });
    expect(alu.workpiece_growth_um.value).toBeGreaterThan(steel.workpiece_growth_um.value);
  });

  it("dry cutting produces more tool thermal growth", () => {
    const wet = engine.calculate({ spindle_speed_rpm: 10000, cutting_time_min: 30, tool_overhang_mm: 50, coolant_active: true, cutting_power_kW: 5 });
    const dry = engine.calculate({ spindle_speed_rpm: 10000, cutting_time_min: 30, tool_overhang_mm: 50, coolant_active: false, cutting_power_kW: 5 });
    expect(dry.tool_growth_um.value).toBeGreaterThan(wet.tool_growth_um.value);
  });

  it("hydrostatic bearings produce less spindle heat than angular contact", () => {
    const ac = engine.calculate({ spindle_speed_rpm: 15000, cutting_time_min: 60, tool_overhang_mm: 50, spindle_bearing_type: "angular_contact" });
    const hs = engine.calculate({ spindle_speed_rpm: 15000, cutting_time_min: 60, tool_overhang_mm: 50, spindle_bearing_type: "hydrostatic" });
    expect(hs.spindle_temp_rise_C.value).toBeLessThan(ac.spindle_temp_rise_C.value);
  });

  it("compensation_needed_mm matches total_z_error_um / 1000", () => {
    const r = engine.calculate({ spindle_speed_rpm: 10000, cutting_time_min: 30, tool_overhang_mm: 50 });
    expect(r.compensation_needed_mm.value).toBeCloseTo(r.total_z_error_um.value / 1000, 3);
  });

  it("zero RPM produces zero spindle growth", () => {
    const r = engine.calculate({ spindle_speed_rpm: 0, cutting_time_min: 60, tool_overhang_mm: 50 });
    expect(r.spindle_growth_um.value).toBe(0);
    expect(r.spindle_temp_rise_C.value).toBe(0);
  });

  it("time_to_stability is 3× time constant", () => {
    const r = engine.calculate({ spindle_speed_rpm: 10000, cutting_time_min: 30, tool_overhang_mm: 50 });
    expect(r.time_to_stability_min.value).toBe(135); // angular_contact τ=45, 3×45=135
  });
});

// ─── BoreFinishingEngine ─────────────────────────────────────────

describe("BoreFinishingEngine", () => {
  const engine = new BoreFinishingEngine();

  it("returns AtomicValue format for all outputs", () => {
    const r = engine.calculate({ bore_diameter_mm: 50, bore_length_mm: 100, target_Ra_um: 0.4 });
    for (const key of [
      "estimated_passes", "material_removal_rate_um_per_pass",
      "bore_diameter_growth_um", "predicted_Ra_um", "cycle_time_min",
      "crosshatch_angle_deg", "stone_life_passes",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("produces positive passes and MRR", () => {
    const r = engine.calculate({ bore_diameter_mm: 50, bore_length_mm: 100, target_Ra_um: 0.4 });
    expect(r.estimated_passes.value).toBeGreaterThan(0);
    expect(r.material_removal_rate_um_per_pass.value).toBeGreaterThan(0);
  });

  it("finer target Ra requires more passes", () => {
    const coarse = engine.calculate({ bore_diameter_mm: 50, bore_length_mm: 100, target_Ra_um: 1.6 });
    const fine = engine.calculate({ bore_diameter_mm: 50, bore_length_mm: 100, target_Ra_um: 0.1 });
    expect(fine.estimated_passes.value).toBeGreaterThanOrEqual(coarse.estimated_passes.value);
  });

  it("higher pressure increases MRR", () => {
    const low = engine.calculate({ bore_diameter_mm: 50, bore_length_mm: 100, target_Ra_um: 0.4, honing_pressure_bar: 5 });
    const high = engine.calculate({ bore_diameter_mm: 50, bore_length_mm: 100, target_Ra_um: 0.4, honing_pressure_bar: 20 });
    expect(high.material_removal_rate_um_per_pass.value).toBeGreaterThan(low.material_removal_rate_um_per_pass.value);
  });

  it("harder material reduces MRR", () => {
    const soft = engine.calculate({ bore_diameter_mm: 50, bore_length_mm: 100, target_Ra_um: 0.4, workpiece_hardness_hrc: 20 });
    const hard = engine.calculate({ bore_diameter_mm: 50, bore_length_mm: 100, target_Ra_um: 0.4, workpiece_hardness_hrc: 55 });
    expect(hard.material_removal_rate_um_per_pass.value).toBeLessThan(soft.material_removal_rate_um_per_pass.value);
  });

  it("crosshatch angle is between 0-90 degrees", () => {
    const r = engine.calculate({ bore_diameter_mm: 50, bore_length_mm: 100, target_Ra_um: 0.4 });
    expect(r.crosshatch_angle_deg.value).toBeGreaterThan(0);
    expect(r.crosshatch_angle_deg.value).toBeLessThan(90);
  });

  it("auto-selects fine grit for fine Ra target", () => {
    const r = engine.calculate({ bore_diameter_mm: 50, bore_length_mm: 100, target_Ra_um: 0.2 });
    // Fine or superfinish grit should be auto-selected — predicted Ra should approach target
    expect(r.predicted_Ra_um.value).toBeLessThan(1.0);
  });

  it("stone life decreases with harder material", () => {
    const soft = engine.calculate({ bore_diameter_mm: 50, bore_length_mm: 100, target_Ra_um: 0.4, workpiece_hardness_hrc: 20 });
    const hard = engine.calculate({ bore_diameter_mm: 50, bore_length_mm: 100, target_Ra_um: 0.4, workpiece_hardness_hrc: 55 });
    expect(hard.stone_life_passes.value).toBeLessThan(soft.stone_life_passes.value);
  });

  it("warns on high L/D ratio", () => {
    const r = engine.calculate({ bore_diameter_mm: 10, bore_length_mm: 100, target_Ra_um: 0.4 });
    expect(r.recommendations.some(rec => rec.includes("L/D"))).toBe(true);
  });

  it("bore_diameter_growth is positive", () => {
    const r = engine.calculate({ bore_diameter_mm: 50, bore_length_mm: 100, target_Ra_um: 0.4 });
    expect(r.bore_diameter_growth_um.value).toBeGreaterThan(0);
  });
});

// ─── FinishingPassOptimizationEngine ─────────────────────────────

describe("FinishingPassOptimizationEngine", () => {
  const engine = new FinishingPassOptimizationEngine();

  it("returns AtomicValue format for all outputs", () => {
    const r = engine.calculate({
      tool_diameter_mm: 12, tool_overhang_mm: 60, tool_nose_radius_mm: 0.8,
      feed_mm_rev: 0.2, depth_of_cut_mm: 2, target_Ra_um: 0.8,
    });
    for (const key of [
      "roughing_deflection_um", "spring_pass_depth_mm", "finishing_feed_mm_rev",
      "number_of_passes", "predicted_Ra_um", "total_finishing_time_factor",
      "dimension_error_after_um",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("produces positive deflection for non-zero force", () => {
    const r = engine.calculate({
      tool_diameter_mm: 10, tool_overhang_mm: 60, tool_nose_radius_mm: 0.4,
      feed_mm_rev: 0.2, depth_of_cut_mm: 2, target_Ra_um: 0.8,
    });
    expect(r.roughing_deflection_um.value).toBeGreaterThan(0);
    expect(r.spring_pass_depth_mm.value).toBeGreaterThan(0);
  });

  it("longer overhang increases deflection", () => {
    const short = engine.calculate({
      tool_diameter_mm: 10, tool_overhang_mm: 30, tool_nose_radius_mm: 0.8,
      feed_mm_rev: 0.2, depth_of_cut_mm: 2, target_Ra_um: 0.8,
    });
    const long = engine.calculate({
      tool_diameter_mm: 10, tool_overhang_mm: 80, tool_nose_radius_mm: 0.8,
      feed_mm_rev: 0.2, depth_of_cut_mm: 2, target_Ra_um: 0.8,
    });
    expect(long.roughing_deflection_um.value).toBeGreaterThan(short.roughing_deflection_um.value);
  });

  it("larger tool diameter reduces deflection", () => {
    const small = engine.calculate({
      tool_diameter_mm: 6, tool_overhang_mm: 50, tool_nose_radius_mm: 0.4,
      feed_mm_rev: 0.2, depth_of_cut_mm: 2, target_Ra_um: 0.8,
    });
    const large = engine.calculate({
      tool_diameter_mm: 20, tool_overhang_mm: 50, tool_nose_radius_mm: 0.4,
      feed_mm_rev: 0.2, depth_of_cut_mm: 2, target_Ra_um: 0.8,
    });
    expect(large.roughing_deflection_um.value).toBeLessThan(small.roughing_deflection_um.value);
  });

  it("finishing feed is smaller than roughing feed", () => {
    const r = engine.calculate({
      tool_diameter_mm: 12, tool_overhang_mm: 50, tool_nose_radius_mm: 0.8,
      feed_mm_rev: 0.25, depth_of_cut_mm: 3, target_Ra_um: 0.8,
    });
    expect(r.finishing_feed_mm_rev.value).toBeLessThan(0.25);
  });

  it("larger nose radius allows higher finishing feed for same Ra", () => {
    const small_r = engine.calculate({
      tool_diameter_mm: 12, tool_overhang_mm: 50, tool_nose_radius_mm: 0.4,
      feed_mm_rev: 0.2, depth_of_cut_mm: 2, target_Ra_um: 0.8,
    });
    const large_r = engine.calculate({
      tool_diameter_mm: 12, tool_overhang_mm: 50, tool_nose_radius_mm: 1.6,
      feed_mm_rev: 0.2, depth_of_cut_mm: 2, target_Ra_um: 0.8,
    });
    expect(large_r.finishing_feed_mm_rev.value).toBeGreaterThan(small_r.finishing_feed_mm_rev.value);
  });

  it("HSS tool has more deflection than carbide (lower modulus)", () => {
    const hss = engine.calculate({
      tool_diameter_mm: 10, tool_overhang_mm: 60, tool_nose_radius_mm: 0.8,
      feed_mm_rev: 0.2, depth_of_cut_mm: 2, target_Ra_um: 0.8, tool_material: "hss",
    });
    const carb = engine.calculate({
      tool_diameter_mm: 10, tool_overhang_mm: 60, tool_nose_radius_mm: 0.8,
      feed_mm_rev: 0.2, depth_of_cut_mm: 2, target_Ra_um: 0.8, tool_material: "carbide",
    });
    expect(hss.roughing_deflection_um.value).toBeGreaterThan(carb.roughing_deflection_um.value);
  });

  it("warns on excessive deflection", () => {
    const r = engine.calculate({
      tool_diameter_mm: 6, tool_overhang_mm: 100, tool_nose_radius_mm: 0.4,
      feed_mm_rev: 0.3, depth_of_cut_mm: 4, target_Ra_um: 0.8,
    });
    expect(r.recommendations.some(rec => rec.includes("deflection") || rec.includes("Deflection"))).toBe(true);
  });

  it("warns on boring bar with high L/D", () => {
    const r = engine.calculate({
      tool_diameter_mm: 10, tool_overhang_mm: 60, tool_nose_radius_mm: 0.4,
      feed_mm_rev: 0.15, depth_of_cut_mm: 1, target_Ra_um: 0.8, tool_type: "boring_bar",
    });
    expect(r.recommendations.some(rec => rec.includes("Boring bar") || rec.includes("L/D"))).toBe(true);
  });

  it("at least 1 finishing pass always recommended", () => {
    const r = engine.calculate({
      tool_diameter_mm: 30, tool_overhang_mm: 20, tool_nose_radius_mm: 1.6,
      feed_mm_rev: 0.1, depth_of_cut_mm: 0.5, target_Ra_um: 3.2,
    });
    expect(r.number_of_passes.value).toBeGreaterThanOrEqual(1);
  });

  it("dimension error after finishing is less than roughing deflection", () => {
    const r = engine.calculate({
      tool_diameter_mm: 12, tool_overhang_mm: 50, tool_nose_radius_mm: 0.8,
      feed_mm_rev: 0.2, depth_of_cut_mm: 2, target_Ra_um: 0.8,
    });
    expect(r.dimension_error_after_um.value).toBeLessThan(r.roughing_deflection_um.value);
  });
});
