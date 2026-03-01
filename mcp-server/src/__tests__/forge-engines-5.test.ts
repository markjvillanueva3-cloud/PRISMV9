/**
 * forge-engines-5.test.ts — Tests for RoughnessConversion, PeckDrilling, PartOffForce engines
 * Created by /forge-triple
 */
import { describe, it, expect } from "vitest";
import { roughnessConversionEngine } from "../engines/RoughnessConversionEngine.js";
import { peckDrillingOptimizationEngine } from "../engines/PeckDrillingOptimizationEngine.js";
import { partOffForceEngine } from "../engines/PartOffForceEngine.js";

// ============================================================================
// RoughnessConversionEngine
// ============================================================================
describe("RoughnessConversionEngine", () => {
  const engine = roughnessConversionEngine;

  it("converts Ra_um to Rz_um (standard ratio 4:1)", () => {
    const r = engine.convert({ value: 1.6, from_scale: "Ra_um", to_scale: "Rz_um" });
    expect(r.output_value).toBeCloseTo(6.4, 1);
    expect(r.output_scale).toBe("Rz_um");
    expect(r.uncertainty_pct).toBeGreaterThan(0);
  });

  it("converts Ra_um to Rq_um (factor ~1.11)", () => {
    const r = engine.convert({ value: 3.2, from_scale: "Ra_um", to_scale: "Rq_um" });
    expect(r.output_value).toBeCloseTo(3.552, 1);
  });

  it("converts Ra_um to Ra_uin (39.37 factor)", () => {
    const r = engine.convert({ value: 0.8, from_scale: "Ra_um", to_scale: "Ra_uin" });
    expect(r.output_value).toBeCloseTo(31.5, 0);
    expect(r.uncertainty_pct).toBe(0); // exact unit conversion
  });

  it("converts Ra_um to N_grade", () => {
    const r = engine.convert({ value: 1.6, from_scale: "Ra_um", to_scale: "N_grade" });
    expect(r.output_value).toBe(7); // N7 = 1.6µm Ra
    expect(r.n_grade_label).toContain("N7");
  });

  it("converts N_grade to Ra_um", () => {
    const r = engine.convert({ value: 5, from_scale: "N_grade", to_scale: "Ra_um" });
    expect(r.output_value).toBe(0.4); // N5 = 0.4µm Ra
  });

  it("round-trips Ra_um → Rz_um → Ra_um", () => {
    const r1 = engine.convert({ value: 0.8, from_scale: "Ra_um", to_scale: "Rz_um" });
    const r2 = engine.convert({ value: r1.output_value, from_scale: "Rz_um", to_scale: "Ra_um" });
    expect(r2.output_value).toBeCloseTo(0.8, 2);
  });

  it("populates all_equivalents correctly", () => {
    const r = engine.convert({ value: 3.2, from_scale: "Ra_um", to_scale: "Rz_um" });
    expect(r.all_equivalents.Ra_um).toBeCloseTo(3.2, 1);
    expect(r.all_equivalents.Rz_um).toBeCloseTo(12.8, 1);
    expect(r.all_equivalents.N_grade).toBe(8); // N8 = 3.2µm
  });

  it("provides typical_process for N8 (3.2µm)", () => {
    const r = engine.convert({ value: 3.2, from_scale: "Ra_um", to_scale: "N_grade" });
    expect(r.typical_process.toLowerCase()).toContain("turning");
  });

  it("throws on negative value", () => {
    expect(() => engine.convert({ value: -1, from_scale: "Ra_um", to_scale: "Rz_um" })).toThrow();
  });

  it("handles zero value", () => {
    const r = engine.convert({ value: 0, from_scale: "Ra_um", to_scale: "Rz_um" });
    expect(r.output_value).toBe(0);
  });

  it("lists all scales", () => {
    expect(engine.scales()).toHaveLength(6);
    expect(engine.scales()).toContain("Ra_um");
    expect(engine.scales()).toContain("N_grade");
  });
});

// ============================================================================
// PeckDrillingOptimizationEngine
// ============================================================================
describe("PeckDrillingOptimizationEngine", () => {
  const engine = peckDrillingOptimizationEngine;

  const baseInput = {
    drill_diameter_mm: 10,
    hole_depth_mm: 50,
    material: "steel",
    drill_type: "carbide_twist" as const,
    cutting_speed_m_min: 80,
    feed_per_rev_mm: 0.15,
    coolant_through_spindle: true,
  };

  it("calculates L/D ratio correctly", () => {
    const r = engine.calculate(baseInput);
    expect(r.ld_ratio).toBeCloseTo(5.0, 1);
    expect(r.num_pecks).toBeGreaterThan(0);
    expect(r.peck_depth_mm).toBeGreaterThan(0);
  });

  it("shallow hole uses chip_break strategy with TSC", () => {
    const r = engine.calculate({ ...baseInput, hole_depth_mm: 20 }); // L/D = 2
    expect(r.ld_ratio).toBeCloseTo(2.0, 1);
    expect(r.peck_strategy).toBe("chip_break");
  });

  it("deep hole uses full_retract", () => {
    const r = engine.calculate({ ...baseInput, hole_depth_mm: 100 }); // L/D = 10
    expect(r.peck_strategy).toBe("full_retract");
    expect(r.feed_reduction_pct).toBeGreaterThan(0);
  });

  it("gun drill uses continuous strategy", () => {
    const r = engine.calculate({ ...baseInput, drill_type: "gun_drill", hole_depth_mm: 200 });
    expect(r.peck_strategy).toBe("gun_drill_continuous");
    expect(r.num_pecks).toBe(1);
  });

  it("difficult material reduces peck depth", () => {
    const steel = engine.calculate(baseInput);
    const titanium = engine.calculate({ ...baseInput, material: "titanium" });
    expect(titanium.peck_depth_mm).toBeLessThan(steel.peck_depth_mm);
  });

  it("recommends TSC for deep holes without it", () => {
    const r = engine.calculate({ ...baseInput, hole_depth_mm: 80, coolant_through_spindle: false });
    expect(r.recommendations.some(r => r.toLowerCase().includes("coolant"))).toBe(true);
  });

  it("recommends gun drill for very deep holes", () => {
    const r = engine.calculate({ ...baseInput, hole_depth_mm: 250, drill_type: "hss_twist" });
    expect(r.recommendations.some(r => r.toLowerCase().includes("gun drill"))).toBe(true);
  });

  it("throws on zero diameter", () => {
    expect(() => engine.calculate({ ...baseInput, drill_diameter_mm: 0 })).toThrow();
  });

  it("throws on negative depth", () => {
    expect(() => engine.calculate({ ...baseInput, hole_depth_mm: -5 })).toThrow();
  });
});

// ============================================================================
// PartOffForceEngine
// ============================================================================
describe("PartOffForceEngine", () => {
  const engine = partOffForceEngine;

  const baseInput = {
    bar_diameter_mm: 50,
    bore_diameter_mm: 0,
    blade_width_mm: 3,
    feed_per_rev_mm: 0.10,
    cutting_speed_m_min: 100,
    material: "steel",
    material_hardness_HRC: 30,
  };

  it("calculates forces for steel bar cutoff", () => {
    const r = engine.calculate(baseInput);
    expect(r.tangential_force_N).toBeGreaterThan(0);
    expect(r.feed_force_N).toBeGreaterThan(0);
    expect(r.total_force_N).toBeGreaterThan(r.tangential_force_N);
    expect(r.cutting_power_kW).toBeGreaterThan(0);
  });

  it("harder material produces higher forces", () => {
    const soft = engine.calculate({ ...baseInput, material_hardness_HRC: 20 });
    const hard = engine.calculate({ ...baseInput, material_hardness_HRC: 55 });
    expect(hard.tangential_force_N).toBeGreaterThan(soft.tangential_force_N);
  });

  it("stainless has higher forces than aluminum", () => {
    const al = engine.calculate({ ...baseInput, material: "aluminum" });
    const ss = engine.calculate({ ...baseInput, material: "stainless steel" });
    expect(ss.tangential_force_N).toBeGreaterThan(al.tangential_force_N);
  });

  it("tube (bore > 0) has shorter cut time than solid", () => {
    const solid = engine.calculate(baseInput);
    const tube = engine.calculate({ ...baseInput, bore_diameter_mm: 30 });
    expect(tube.estimated_time_s).toBeLessThan(solid.estimated_time_s);
  });

  it("wider blade produces higher force (larger chip area)", () => {
    const narrow = engine.calculate({ ...baseInput, blade_width_mm: 2 });
    const wide = engine.calculate({ ...baseInput, blade_width_mm: 5 });
    expect(wide.tangential_force_N).toBeGreaterThan(narrow.tangential_force_N);
  });

  it("provides min bar remnant", () => {
    const r = engine.calculate(baseInput);
    expect(r.min_bar_remnant_mm).toBeGreaterThan(0);
  });

  it("warns on high feed", () => {
    const r = engine.calculate({ ...baseInput, feed_per_rev_mm: 0.20 });
    expect(r.recommendations.some(r => r.toLowerCase().includes("feed"))).toBe(true);
  });

  it("warns on difficult material", () => {
    const r = engine.calculate({ ...baseInput, material: "inconel 718" });
    expect(r.recommendations.some(r => r.toLowerCase().includes("coolant") || r.toLowerCase().includes("chipbreaker"))).toBe(true);
  });

  it("throws on zero bar diameter", () => {
    expect(() => engine.calculate({ ...baseInput, bar_diameter_mm: 0 })).toThrow();
  });

  it("throws on bore >= OD", () => {
    expect(() => engine.calculate({ ...baseInput, bore_diameter_mm: 60 })).toThrow();
  });

  it("throws on zero feed", () => {
    expect(() => engine.calculate({ ...baseInput, feed_per_rev_mm: 0 })).toThrow();
  });
});
