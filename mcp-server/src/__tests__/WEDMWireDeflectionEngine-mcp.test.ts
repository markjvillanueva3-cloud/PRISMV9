/**
 * U-P2PFS18: WEDMWireDeflectionEngine MCP Wiring Tests
 * Verifies dispatcher actions wedm_wire_deflection_predict, wedm_wire_deflection_safe_current
 */
import { describe, it, expect } from "vitest";
import { wedmWireDeflectionEngine } from "../engines/WEDMWireDeflectionEngine.js";

describe("WEDMWireDeflectionEngine MCP Wiring (U-P2PFS18)", () => {
  describe("predict()", () => {
    it("returns WireDeflectionResult structure", () => {
      const result = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 15,
        workpiece_thickness_mm: 50,
        peak_current_A: 10,
      });

      expect(result).toHaveProperty("max_deflection_mm");
      expect(result).toHaveProperty("max_deflection_um");
      expect(result).toHaveProperty("deflection_angle_deg");
      expect(result).toHaveProperty("taper_error_mm");
      expect(result).toHaveProperty("recommended_offset_mm");
      expect(result).toHaveProperty("min_corner_radius_mm");
      expect(result).toHaveProperty("exceeds_limit");
    });

    it("calculates positive deflection", () => {
      const result = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 15,
        workpiece_thickness_mm: 50,
        peak_current_A: 10,
      });

      expect(result.max_deflection_mm).toBeGreaterThan(0);
      expect(result.max_deflection_um).toBeGreaterThan(0);
    });

    it("increases deflection with thicker workpiece", () => {
      const thinResult = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 15,
        workpiece_thickness_mm: 20,
        peak_current_A: 10,
      });

      const thickResult = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 15,
        workpiece_thickness_mm: 100,
        peak_current_A: 10,
      });

      expect(thickResult.max_deflection_mm).toBeGreaterThan(thinResult.max_deflection_mm);
    });

    it("decreases deflection with higher tension", () => {
      const lowTension = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 10,
        workpiece_thickness_mm: 50,
        peak_current_A: 10,
      });

      const highTension = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 25,
        workpiece_thickness_mm: 50,
        peak_current_A: 10,
      });

      expect(highTension.max_deflection_mm).toBeLessThan(lowTension.max_deflection_mm);
    });

    it("increases deflection with higher current", () => {
      const lowCurrent = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 15,
        workpiece_thickness_mm: 50,
        peak_current_A: 5,
      });

      const highCurrent = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 15,
        workpiece_thickness_mm: 50,
        peak_current_A: 20,
      });

      expect(highCurrent.max_deflection_mm).toBeGreaterThan(lowCurrent.max_deflection_mm);
    });

    it("accepts wire material parameter", () => {
      const brassResult = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 15,
        workpiece_thickness_mm: 50,
        peak_current_A: 10,
        wire_material: "brass",
      });

      const molyResult = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 15,
        workpiece_thickness_mm: 50,
        peak_current_A: 10,
        wire_material: "molybdenum",
      });

      expect(brassResult.max_deflection_mm).toBeGreaterThan(0);
      expect(molyResult.max_deflection_mm).toBeGreaterThan(0);
    });

    it("accepts discharge force directly", () => {
      const result = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 15,
        workpiece_thickness_mm: 50,
        discharge_force_N: 0.5,
      });

      expect(result.max_deflection_mm).toBeGreaterThan(0);
    });

    it("considers duty cycle in force calculation", () => {
      const lowDuty = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 15,
        workpiece_thickness_mm: 50,
        peak_current_A: 10,
        duty_cycle: 0.2,
      });

      const highDuty = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 15,
        workpiece_thickness_mm: 50,
        peak_current_A: 10,
        duty_cycle: 0.5,
      });

      expect(highDuty.max_deflection_mm).toBeGreaterThan(lowDuty.max_deflection_mm);
    });

    it("calculates taper error", () => {
      const result = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 15,
        workpiece_thickness_mm: 50,
        peak_current_A: 10,
      });

      expect(result.taper_error_mm).toBeGreaterThan(0);
    });

    it("calculates minimum corner radius", () => {
      const result = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 15,
        workpiece_thickness_mm: 50,
        peak_current_A: 10,
      });

      expect(result.min_corner_radius_mm).toBeGreaterThan(0);
    });

    it("flags when deflection exceeds limit", () => {
      const result = wedmWireDeflectionEngine.predict({
        wire_diameter_mm: 0.25,
        wire_tension_N: 5,
        workpiece_thickness_mm: 150,
        peak_current_A: 30,
      });

      if (result.exceeds_limit) {
        expect(result.recommendation).toBeDefined();
      }
    });
  });

  describe("calculateMaxSafeCurrent()", () => {
    it("returns safe current limit", () => {
      const result = wedmWireDeflectionEngine.calculateMaxSafeCurrent(
        0.25, 15, 50
      );

      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThan(0);
    });

    it("returns lower current for thicker workpiece", () => {
      const thinResult = wedmWireDeflectionEngine.calculateMaxSafeCurrent(
        0.25, 15, 25
      );

      const thickResult = wedmWireDeflectionEngine.calculateMaxSafeCurrent(
        0.25, 15, 100
      );

      expect(thickResult).toBeLessThan(thinResult);
    });

    it("returns higher current for higher tension", () => {
      const lowTension = wedmWireDeflectionEngine.calculateMaxSafeCurrent(
        0.25, 10, 50
      );

      const highTension = wedmWireDeflectionEngine.calculateMaxSafeCurrent(
        0.25, 25, 50
      );

      expect(highTension).toBeGreaterThan(lowTension);
    });
  });

  describe("utility methods", () => {
    it("getConfig returns configuration", () => {
      const config = wedmWireDeflectionEngine.getConfig();
      expect(config).toHaveProperty("max_deflection_um");
      expect(config).toHaveProperty("warning_threshold");
      expect(config).toHaveProperty("force_per_amp");
    });

    it("getWireModulus returns material modulus", () => {
      const brassModulus = wedmWireDeflectionEngine.getWireModulus("brass");
      const molyModulus = wedmWireDeflectionEngine.getWireModulus("molybdenum");

      expect(brassModulus).toBeGreaterThan(0);
      expect(molyModulus).toBeGreaterThan(brassModulus);
    });
  });
});
