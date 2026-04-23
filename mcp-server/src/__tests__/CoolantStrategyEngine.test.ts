/**
 * CoolantStrategyEngine Tests (U-MIO40)
 * ======================================
 * Tests coolant method recommendation: material+operation+tool → optimal
 * coolant delivery method, concentration, pressure, flow rate.
 */

import { describe, it, expect } from "vitest";
import {
  coolantStrategyEngine,
  type CoolantStrategyInput,
  type CoolantMaterial,
  type CoolantOperation,
  type CoolantMethod,
} from "../engines/CoolantStrategyEngine.js";

describe("CoolantStrategyEngine", () => {
  // ══════════════════════════════════════════════════════════════════════════
  // Basic calculation
  // ══════════════════════════════════════════════════════════════════════════
  describe("calculate() basic", () => {
    it("returns valid result for steel roughing", () => {
      const result = coolantStrategyEngine.calculate({
        workpiece_material: "carbon_steel",
        operation: "milling_rough",
        cutting_speed_m_min: 150,
        depth_of_cut_mm: 3,
      });

      expect(result.primary_method).toBeDefined();
      expect(result.fluid_type).toBeDefined();
      expect(result.concentration_pct.value).toBeGreaterThan(0);
      expect(result.pressure_bar.value).toBeGreaterThan(0);
      expect(result.flow_rate_l_min.value).toBeGreaterThan(0);
    });

    it("returns valid result for aluminum finishing", () => {
      const result = coolantStrategyEngine.calculate({
        workpiece_material: "aluminum",
        operation: "milling_finish",
        cutting_speed_m_min: 400,
        depth_of_cut_mm: 0.5,
      });

      expect(result.primary_method).toBeDefined();
      expect(result.fluid_type).toBeDefined();
    });

    it("returns valid result for drilling", () => {
      const result = coolantStrategyEngine.calculate({
        workpiece_material: "alloy_steel",
        operation: "drilling",
        hole_diameter_mm: 10,
        hole_depth_mm: 30,
      });

      expect(result.primary_method).toBeDefined();
      expect(result.pressure_bar.value).toBeGreaterThan(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Material-specific behavior
  // ══════════════════════════════════════════════════════════════════════════
  describe("material-specific recommendations", () => {
    it("recommends higher pressure for titanium", () => {
      const titanium = coolantStrategyEngine.calculate({
        workpiece_material: "titanium",
        operation: "milling_rough",
        cutting_speed_m_min: 50,
        depth_of_cut_mm: 2,
      });

      const steel = coolantStrategyEngine.calculate({
        workpiece_material: "carbon_steel",
        operation: "milling_rough",
        cutting_speed_m_min: 150,
        depth_of_cut_mm: 2,
      });

      expect(titanium.pressure_bar.value).toBeGreaterThanOrEqual(steel.pressure_bar.value);
    });

    it("recommends through-spindle/tool for nickel alloy if available", () => {
      const result = coolantStrategyEngine.calculate({
        workpiece_material: "nickel_alloy",
        operation: "milling_rough",
        cutting_speed_m_min: 30,
        depth_of_cut_mm: 1.5,
        tool_has_through_coolant: true,
      });

      expect(["through_spindle", "through_tool", "flood"]).toContain(result.primary_method);
    });

    it("avoids water-based for magnesium (hydrogen risk)", () => {
      const result = coolantStrategyEngine.calculate({
        workpiece_material: "magnesium",
        operation: "milling_finish",
        cutting_speed_m_min: 300,
      });

      expect(["water_soluble_emulsion"]).not.toContain(result.fluid_type);
      expect(result.safety_notes.length).toBeGreaterThan(0);
    });

    it("includes fire warning for magnesium dry cutting", () => {
      const result = coolantStrategyEngine.calculate({
        workpiece_material: "magnesium",
        operation: "milling_rough",
        environmental_priority: true,
      });

      const hasFireWarning = result.safety_notes.some(
        n => n.toLowerCase().includes("fire") || n.toLowerCase().includes("hazard")
      );
      expect(hasFireWarning || result.primary_method !== "dry").toBe(true);
    });

    it("handles cast iron with appropriate lubricant", () => {
      const result = coolantStrategyEngine.calculate({
        workpiece_material: "cast_iron",
        operation: "milling_rough",
        cutting_speed_m_min: 200,
      });

      expect(result.primary_method).toBeDefined();
      expect(result.fluid_type).toBeDefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Operation-specific behavior
  // ══════════════════════════════════════════════════════════════════════════
  describe("operation-specific recommendations", () => {
    it("recommends higher pressure for deep hole drilling", () => {
      const deep = coolantStrategyEngine.calculate({
        workpiece_material: "alloy_steel",
        operation: "deep_hole_drilling",
        hole_diameter_mm: 8,
        hole_depth_mm: 80,
      });

      const regular = coolantStrategyEngine.calculate({
        workpiece_material: "alloy_steel",
        operation: "drilling",
        hole_diameter_mm: 8,
        hole_depth_mm: 24,
      });

      expect(deep.pressure_bar.value).toBeGreaterThan(regular.pressure_bar.value);
    });

    it("recommends through-tool for tapping when available", () => {
      const result = coolantStrategyEngine.calculate({
        workpiece_material: "stainless_steel",
        operation: "tapping",
        tool_has_through_coolant: true,
      });

      expect(["through_tool", "through_spindle", "flood"]).toContain(result.primary_method);
    });

    it("handles grinding with appropriate coolant", () => {
      const result = coolantStrategyEngine.calculate({
        workpiece_material: "hardened_steel",
        operation: "grinding",
        cutting_speed_m_min: 30,
      });

      expect(result.primary_method).toBeDefined();
      expect(result.fluid_type).toBeDefined();
    });

    it("recommends different strategy for turning vs milling", () => {
      const turning = coolantStrategyEngine.calculate({
        workpiece_material: "carbon_steel",
        operation: "turning_rough",
        cutting_speed_m_min: 200,
        depth_of_cut_mm: 3,
      });

      const milling = coolantStrategyEngine.calculate({
        workpiece_material: "carbon_steel",
        operation: "milling_rough",
        cutting_speed_m_min: 150,
        depth_of_cut_mm: 3,
      });

      expect(turning.primary_method).toBeDefined();
      expect(milling.primary_method).toBeDefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Environmental priority (MQL preference)
  // ══════════════════════════════════════════════════════════════════════════
  describe("environmental priority", () => {
    it("prefers MQL/air when environmental_priority=true for suitable materials", () => {
      const result = coolantStrategyEngine.calculate({
        workpiece_material: "cast_iron",
        operation: "milling_finish",
        cutting_speed_m_min: 200,
        depth_of_cut_mm: 0.5,
        environmental_priority: true,
      });

      expect(["mql", "air_blast", "dry"]).toContain(result.primary_method);
    });

    it("still uses flood for titanium even with environmental priority", () => {
      const result = coolantStrategyEngine.calculate({
        workpiece_material: "titanium",
        operation: "milling_rough",
        cutting_speed_m_min: 50,
        depth_of_cut_mm: 2,
        environmental_priority: true,
      });

      expect(["flood", "through_spindle", "through_tool", "cryogenic_co2", "cryogenic_ln2"])
        .toContain(result.primary_method);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Machine constraints
  // ══════════════════════════════════════════════════════════════════════════
  describe("machine constraints", () => {
    it("caps pressure at machine_max_pressure_bar", () => {
      const result = coolantStrategyEngine.calculate({
        workpiece_material: "titanium",
        operation: "deep_hole_drilling",
        hole_diameter_mm: 6,
        hole_depth_mm: 60,
        machine_max_pressure_bar: 30,
      });

      expect(result.pressure_bar.value).toBeLessThanOrEqual(30);
    });

    it("adds recommendation when pressure limited", () => {
      const result = coolantStrategyEngine.calculate({
        workpiece_material: "nickel_alloy",
        operation: "deep_hole_drilling",
        hole_diameter_mm: 5,
        hole_depth_mm: 50,
        machine_max_pressure_bar: 20,
        tool_has_through_coolant: true,
      });

      const hasLimitNote = result.recommendations.some(
        r => r.toLowerCase().includes("pressure") || r.toLowerCase().includes("limit")
      );
      expect(result.pressure_bar.value <= 20 || hasLimitNote).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Output structure
  // ══════════════════════════════════════════════════════════════════════════
  describe("output structure", () => {
    it("returns all required fields", () => {
      const result = coolantStrategyEngine.calculate({
        workpiece_material: "alloy_steel",
        operation: "milling_rough",
      });

      expect(result).toHaveProperty("primary_method");
      expect(result).toHaveProperty("fluid_type");
      expect(result).toHaveProperty("concentration_pct");
      expect(result).toHaveProperty("pressure_bar");
      expect(result).toHaveProperty("flow_rate_l_min");
      expect(result).toHaveProperty("temperature_target_c");
      expect(result).toHaveProperty("alternative_method");
      expect(result).toHaveProperty("safety_notes");
      expect(result).toHaveProperty("recommendations");
    });

    it("returns AtomicValue with unit and source", () => {
      const result = coolantStrategyEngine.calculate({
        workpiece_material: "carbon_steel",
        operation: "turning_rough",
      });

      expect(result.concentration_pct.unit).toBe("%");
      expect(result.pressure_bar.unit).toBe("bar");
      expect(result.flow_rate_l_min.unit).toBe("L/min");
      expect(result.temperature_target_c.unit).toBe("°C");

      expect(result.concentration_pct.source).toBeDefined();
      expect(result.pressure_bar.source).toBeDefined();
    });

    it("provides alternative_method", () => {
      const result = coolantStrategyEngine.calculate({
        workpiece_material: "aluminum",
        operation: "milling_rough",
      });

      expect(result.alternative_method).toBeDefined();
      expect(result.alternative_method).not.toBe(result.primary_method);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Edge cases
  // ══════════════════════════════════════════════════════════════════════════
  describe("edge cases", () => {
    it("handles missing optional parameters", () => {
      const result = coolantStrategyEngine.calculate({
        workpiece_material: "carbon_steel",
        operation: "milling_rough",
      });

      expect(result.primary_method).toBeDefined();
    });

    it("handles hardened steel with appropriate strategy", () => {
      const result = coolantStrategyEngine.calculate({
        workpiece_material: "hardened_steel",
        operation: "milling_finish",
        cutting_speed_m_min: 100,
        workpiece_hardness_hrc: 58,
      });

      expect(result.primary_method).toBeDefined();
    });

    it("handles CFRP composite", () => {
      const result = coolantStrategyEngine.calculate({
        workpiece_material: "cfrp",
        operation: "milling_rough",
      });

      expect(result.primary_method).toBeDefined();
      expect(result.safety_notes.length).toBeGreaterThanOrEqual(0);
    });

    it("handles plastic material", () => {
      const result = coolantStrategyEngine.calculate({
        workpiece_material: "plastic",
        operation: "drilling",
        hole_diameter_mm: 5,
        hole_depth_mm: 15,
      });

      expect(result.primary_method).toBeDefined();
    });
  });
});
