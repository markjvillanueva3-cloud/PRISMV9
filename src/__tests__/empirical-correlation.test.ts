/**
 * Tests for EmpiricalCorrelationEngine
 * Covers: Hardness conversions, material properties, cutting correlations, economics
 */
import { describe, it, expect } from "vitest";
import { empiricalCorrelationEngine } from "../engines/EmpiricalCorrelationEngine.js";

describe("EmpiricalCorrelationEngine", () => {

  describe("hardnessConversions", () => {
    it("HRC 30 converts to HB in reasonable range", () => {
      const result = empiricalCorrelationEngine.hardnessConversions({
        value: 30, from_scale: "HRC",
      });
      expect(result.HB).toBeGreaterThan(250);
      expect(result.HB).toBeLessThan(350);
    });

    it("HB 200 gives positive UTS for steel", () => {
      const result = empiricalCorrelationEngine.hardnessConversions({
        value: 200, from_scale: "HB",
      });
      expect(result.tensile_strength_mpa).toBeGreaterThan(400);
      expect(result.tensile_strength_mpa).toBeLessThan(1200);
    });

    it("converts between all scales without NaN", () => {
      const result = empiricalCorrelationEngine.hardnessConversions({
        value: 250, from_scale: "HV",
      });
      expect(result.HRC).not.toBeNaN();
      expect(result.HB).not.toBeNaN();
      expect(result.HV).toBeGreaterThan(100);
      expect(result.HV).toBeLessThan(500);
    });
  });

  describe("mechanicalFromHardness", () => {
    it("carbon steel: fatigue limit ≈ 0.5 × UTS below 1400 MPa", () => {
      const result = empiricalCorrelationEngine.mechanicalFromHardness({
        hardness_HB: 200, material_class: "carbon_steel",
      });
      expect(result.uts_mpa).toBeGreaterThan(500);
      expect(result.fatigue_limit_mpa).toBeGreaterThan(0);
      expect(result.fatigue_limit_mpa).toBeLessThanOrEqual(result.uts_mpa * 0.55);
    });

    it("aluminum has different UTS/HB relationship than steel", () => {
      const steel = empiricalCorrelationEngine.mechanicalFromHardness({
        hardness_HB: 150, material_class: "carbon_steel",
      });
      const aluminum = empiricalCorrelationEngine.mechanicalFromHardness({
        hardness_HB: 150, material_class: "aluminum",
      });
      expect(steel.uts_mpa).not.toBe(aluminum.uts_mpa);
    });
  });

  describe("thermalPropertiesEstimate", () => {
    it("steel thermal conductivity decreases with alloying", () => {
      const plain = empiricalCorrelationEngine.thermalPropertiesEstimate({
        material_class: "carbon_steel", alloy_content_pct: 0,
      });
      const alloy = empiricalCorrelationEngine.thermalPropertiesEstimate({
        material_class: "alloy_steel", alloy_content_pct: 10,
      });
      expect(plain.thermal_conductivity_w_mk).toBeGreaterThan(alloy.thermal_conductivity_w_mk);
    });
  });

  describe("cuttingSpeedFromHardness", () => {
    it("speed decreases with hardness (monotonic)", () => {
      const soft = empiricalCorrelationEngine.cuttingSpeedFromHardness({
        hardness_HB: 150, tool_material: "carbide", operation: "turning",
      });
      const hard = empiricalCorrelationEngine.cuttingSpeedFromHardness({
        hardness_HB: 350, tool_material: "carbide", operation: "turning",
      });
      expect(soft.recommended_speed_mpm).toBeGreaterThan(hard.recommended_speed_mpm);
    });

    it("HSS speed < carbide speed for same material", () => {
      const hss = empiricalCorrelationEngine.cuttingSpeedFromHardness({
        hardness_HB: 200, tool_material: "HSS", operation: "turning",
      });
      const carbide = empiricalCorrelationEngine.cuttingSpeedFromHardness({
        hardness_HB: 200, tool_material: "carbide", operation: "turning",
      });
      expect(hss.recommended_speed_mpm).toBeLessThan(carbide.recommended_speed_mpm);
    });
  });

  describe("feedFromSurfaceFinish", () => {
    it("calculated feed produces target Ra within tolerance", () => {
      const result = empiricalCorrelationEngine.feedFromSurfaceFinish({
        target_ra_um: 1.6, nose_radius_mm: 0.8,
      });
      expect(result.recommended_feed_mm_rev).toBeGreaterThan(0.01);
      expect(result.recommended_feed_mm_rev).toBeLessThan(0.5);
      expect(result.achievable_ra_um).toBeCloseTo(1.6, 0);
    });
  });

  describe("depthOfCutLimits", () => {
    it("depth limited by weakest constraint", () => {
      const result = empiricalCorrelationEngine.depthOfCutLimits({
        tool_diameter_mm: 12, overhang_mm: 60,
        tool_material: "carbide", machine_power_kw: 15,
        spindle_rpm: 3000, material_kc_mpa: 2000, material_type: "steel",
      });
      expect(result.recommended_depth_mm).toBeGreaterThan(0);
      expect(result.recommended_depth_mm).toBeLessThanOrEqual(
        Math.min(result.max_depth_deflection_mm, result.max_depth_power_mm, result.max_depth_stability_mm)
      );
      expect(result.limiting_factor).toBeTruthy();
    });

    it("larger diameter allows deeper cut", () => {
      const small = empiricalCorrelationEngine.depthOfCutLimits({
        tool_diameter_mm: 6, overhang_mm: 30, tool_material: "carbide",
        machine_power_kw: 15, spindle_rpm: 5000, material_kc_mpa: 2000, material_type: "steel",
      });
      const large = empiricalCorrelationEngine.depthOfCutLimits({
        tool_diameter_mm: 20, overhang_mm: 40, tool_material: "carbide",
        machine_power_kw: 15, spindle_rpm: 2000, material_kc_mpa: 2000, material_type: "steel",
      });
      expect(large.max_depth_deflection_mm).toBeGreaterThan(small.max_depth_deflection_mm);
    });
  });

  describe("toolLifeMultipliers", () => {
    it("flood coolant > dry for tool life", () => {
      const result = empiricalCorrelationEngine.toolLifeMultipliers({
        base_tool_life_min: 60, coolant_type: "flood", coating: "none",
      });
      const dry = empiricalCorrelationEngine.toolLifeMultipliers({
        base_tool_life_min: 60, coolant_type: "dry", coating: "none",
      });
      expect(result.adjusted_tool_life_min).toBeGreaterThan(dry.adjusted_tool_life_min);
    });

    it("coated > uncoated for tool life", () => {
      const coated = empiricalCorrelationEngine.toolLifeMultipliers({
        base_tool_life_min: 60, coolant_type: "flood", coating: "TiAlN",
      });
      const uncoated = empiricalCorrelationEngine.toolLifeMultipliers({
        base_tool_life_min: 60, coolant_type: "flood", coating: "none",
      });
      expect(coated.adjusted_tool_life_min).toBeGreaterThan(uncoated.adjusted_tool_life_min);
    });
  });

  describe("chipBreakabilityIndex", () => {
    it("chip breaker improves breakability", () => {
      const without = empiricalCorrelationEngine.chipBreakabilityIndex({
        feed_mm_rev: 0.15, depth_mm: 2, nose_radius_mm: 0.8,
        material_type: "steel",
      });
      const with_breaker = empiricalCorrelationEngine.chipBreakabilityIndex({
        feed_mm_rev: 0.15, depth_mm: 2, nose_radius_mm: 0.8,
        material_type: "steel", chip_breaker: true,
      });
      expect(with_breaker.breakability_index).toBeGreaterThanOrEqual(without.breakability_index);
    });
  });

  describe("costPerPartCorrelation", () => {
    it("cost per part is positive", () => {
      const result = empiricalCorrelationEngine.costPerPartCorrelation({
        cutting_time_min: 5, tool_life_min: 60, tool_cost: 25,
        machine_rate_per_hour: 80, tool_change_time_min: 2, batch_size: 100,
      });
      expect(result.cost_per_part).toBeGreaterThan(0);
      expect(result.tool_cost_per_part).toBeGreaterThan(0);
      expect(result.machine_cost_per_part).toBeGreaterThan(0);
    });

    it("higher batch size reduces cost per part", () => {
      const small_batch = empiricalCorrelationEngine.costPerPartCorrelation({
        cutting_time_min: 5, tool_life_min: 60, tool_cost: 25,
        machine_rate_per_hour: 80, tool_change_time_min: 2, batch_size: 10,
      });
      const large_batch = empiricalCorrelationEngine.costPerPartCorrelation({
        cutting_time_min: 5, tool_life_min: 60, tool_cost: 25,
        machine_rate_per_hour: 80, tool_change_time_min: 2, batch_size: 1000,
      });
      expect(large_batch.cost_per_part).toBeLessThanOrEqual(small_batch.cost_per_part);
    });
  });

  describe("productivityCorrelations", () => {
    it("rough gives higher MRR range than finish", () => {
      const rough = empiricalCorrelationEngine.productivityCorrelations({
        material_type: "steel", operation: "milling",
        machine_power_kw: 20, quality_target: "rough",
      });
      const finish = empiricalCorrelationEngine.productivityCorrelations({
        material_type: "steel", operation: "milling",
        machine_power_kw: 20, quality_target: "finish",
      });
      expect(rough.mrr_range_cm3_min[1]).toBeGreaterThan(finish.mrr_range_cm3_min[1]);
    });
  });

  describe("surfaceIntegrityCorrelations", () => {
    it("returns residual stress type", () => {
      const result = empiricalCorrelationEngine.surfaceIntegrityCorrelations({
        cutting_speed_mpm: 200, feed_mm_rev: 0.15, depth_mm: 1,
        material_hardness_HB: 250, tool_nose_radius_mm: 0.8,
      });
      expect(["tensile", "compressive"]).toContain(result.residual_stress_type);
      expect(result.surface_quality_index).toBeGreaterThan(0);
      expect(result.surface_quality_index).toBeLessThanOrEqual(100);
    });
  });
});
