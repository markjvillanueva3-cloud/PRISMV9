/**
 * U-P2PFS15: WEDMCurrentDensityGuardEngine MCP Wiring Tests
 * Verifies dispatcher actions wedm_current_density_validate, wedm_current_density_safe_limit, wedm_current_density_batch
 */
import { describe, it, expect } from "vitest";
import { wedmCurrentDensityGuardEngine } from "../engines/WEDMCurrentDensityGuardEngine.js";

describe("WEDMCurrentDensityGuardEngine MCP Wiring (U-P2PFS15)", () => {
  describe("validate()", () => {
    it("returns CurrentDensityResult structure", () => {
      const result = wedmCurrentDensityGuardEngine.validate({
        current_A: 10,
        wire_diameter_mm: 0.25,
      });

      expect(result).toHaveProperty("safe");
      expect(result).toHaveProperty("current_density_A_mm2");
      expect(result).toHaveProperty("max_allowed_A_mm2");
      expect(result).toHaveProperty("effective_limit_A_mm2");
      expect(result).toHaveProperty("utilization_pct");
      expect(result).toHaveProperty("safety_margin");
      expect(result).toHaveProperty("wire_area_mm2");
      expect(result).toHaveProperty("source");
    });

    it("validates safe current density", () => {
      const result = wedmCurrentDensityGuardEngine.validate({
        current_A: 5,
        wire_diameter_mm: 0.25,
      });

      expect(result.safe).toBe(true);
      expect(result.current_density_A_mm2).toBeGreaterThan(0);
      expect(result.utilization_pct).toBeLessThan(100);
    });

    it("detects unsafe current density", () => {
      const result = wedmCurrentDensityGuardEngine.validate({
        current_A: 100,
        wire_diameter_mm: 0.10,
      });

      expect(result.safe).toBe(false);
      expect(result.block_reason).toBeDefined();
      expect(result.block_reason).toContain("exceeds");
    });

    it("applies safety margin", () => {
      const result = wedmCurrentDensityGuardEngine.validate({
        current_A: 10,
        wire_diameter_mm: 0.25,
        safety_margin: 0.85,
      });

      expect(result.safety_margin).toBe(0.85);
      expect(result.effective_limit_A_mm2).toBeLessThan(result.max_allowed_A_mm2);
    });

    it("uses wire material for lookup", () => {
      const result = wedmCurrentDensityGuardEngine.validate({
        current_A: 10,
        wire_diameter_mm: 0.25,
        wire_material: "brass",
      });

      expect(result.safe).toBeDefined();
      expect(result.source).toBeDefined();
    });

    it("handles invalid current gracefully", () => {
      const result = wedmCurrentDensityGuardEngine.validate({
        current_A: -5,
        wire_diameter_mm: 0.25,
      });

      expect(result.safe).toBe(false);
      expect(result.block_reason).toContain("Invalid current");
    });

    it("handles invalid diameter gracefully", () => {
      const result = wedmCurrentDensityGuardEngine.validate({
        current_A: 10,
        wire_diameter_mm: 0,
      });

      expect(result.safe).toBe(false);
      expect(result.block_reason).toContain("Invalid wire diameter");
    });

    it("calculates wire area correctly", () => {
      const result = wedmCurrentDensityGuardEngine.validate({
        current_A: 10,
        wire_diameter_mm: 0.25,
      });

      const expectedArea = Math.PI * Math.pow(0.125, 2);
      expect(result.wire_area_mm2).toBeCloseTo(expectedArea, 4);
    });

    it("warns when approaching limit", () => {
      const result = wedmCurrentDensityGuardEngine.validate({
        current_A: 12,
        wire_diameter_mm: 0.25,
        safety_margin: 0.95,
      });

      if (result.utilization_pct >= 70 && result.safe) {
        expect(result.warning).toBeDefined();
      }
    });
  });

  describe("getSafeCurrentLimit()", () => {
    it("returns safe current limit", () => {
      const limit = wedmCurrentDensityGuardEngine.getSafeCurrentLimit({
        wire_diameter_mm: 0.25,
      });

      expect(typeof limit).toBe("number");
      expect(limit).toBeGreaterThan(0);
    });

    it("respects wire material", () => {
      const brassLimit = wedmCurrentDensityGuardEngine.getSafeCurrentLimit({
        wire_diameter_mm: 0.25,
        wire_material: "brass",
      });

      const molyLimit = wedmCurrentDensityGuardEngine.getSafeCurrentLimit({
        wire_diameter_mm: 0.25,
        wire_material: "molybdenum",
      });

      expect(brassLimit).toBeGreaterThan(0);
      expect(molyLimit).toBeGreaterThan(0);
    });

    it("applies safety margin", () => {
      const limit85 = wedmCurrentDensityGuardEngine.getSafeCurrentLimit({
        wire_diameter_mm: 0.25,
        safety_margin: 0.85,
      });

      const limit100 = wedmCurrentDensityGuardEngine.getSafeCurrentLimit({
        wire_diameter_mm: 0.25,
        safety_margin: 1.0,
      });

      expect(limit85).toBeLessThan(limit100);
    });
  });

  describe("validateBatch()", () => {
    it("returns array of results", () => {
      const results = wedmCurrentDensityGuardEngine.validateBatch([
        { current_A: 5, wire_diameter_mm: 0.25 },
        { current_A: 10, wire_diameter_mm: 0.25 },
        { current_A: 15, wire_diameter_mm: 0.25 },
      ]);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(3);
      results.forEach(r => {
        expect(r).toHaveProperty("safe");
        expect(r).toHaveProperty("current_density_A_mm2");
      });
    });

    it("handles mixed safe/unsafe results", () => {
      const results = wedmCurrentDensityGuardEngine.validateBatch([
        { current_A: 5, wire_diameter_mm: 0.25 },
        { current_A: 100, wire_diameter_mm: 0.10 },
      ]);

      const safeCount = results.filter(r => r.safe).length;
      const unsafeCount = results.filter(r => !r.safe).length;
      expect(safeCount + unsafeCount).toBe(2);
    });
  });

  describe("utility methods", () => {
    it("calculateWireArea returns correct area", () => {
      const area = wedmCurrentDensityGuardEngine.calculateWireArea(0.25);
      expect(area).toBeCloseTo(Math.PI * 0.125 * 0.125, 6);
    });

    it("calculateCurrentDensity returns correct density", () => {
      const density = wedmCurrentDensityGuardEngine.calculateCurrentDensity(10, 0.25);
      const area = Math.PI * 0.125 * 0.125;
      expect(density).toBeCloseTo(10 / area, 2);
    });

    it("getConfig returns configuration", () => {
      const config = wedmCurrentDensityGuardEngine.getConfig();
      expect(config).toHaveProperty("default_safety_margin");
      expect(config).toHaveProperty("warning_threshold");
      expect(config).toHaveProperty("use_wire_specs");
    });
  });
});
