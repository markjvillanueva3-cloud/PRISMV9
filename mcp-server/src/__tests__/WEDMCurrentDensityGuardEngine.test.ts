/**
 * WEDMCurrentDensityGuardEngine Tests
 * Wire break prevention via current density validation
 *
 * Physics: J = I / (π × (d/2)²) must be ≤ max_current_density_A_mm2
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  wedmCurrentDensityGuardEngine,
  WEDMCurrentDensityGuardEngine,
} from "../engines/WEDMCurrentDensityGuardEngine.js";

describe("WEDMCurrentDensityGuardEngine", () => {
  describe("calculateWireArea", () => {
    it("calculates area for 0.25mm wire correctly", () => {
      // A = π × (0.25/2)² = π × 0.125² = π × 0.015625 ≈ 0.0491 mm²
      const area = wedmCurrentDensityGuardEngine.calculateWireArea(0.25);
      expect(area).toBeCloseTo(0.0491, 3);
    });

    it("calculates area for 0.20mm wire correctly", () => {
      // A = π × 0.1² = π × 0.01 ≈ 0.0314 mm²
      const area = wedmCurrentDensityGuardEngine.calculateWireArea(0.2);
      expect(area).toBeCloseTo(0.0314, 3);
    });

    it("calculates area for 0.30mm wire correctly", () => {
      // A = π × 0.15² = π × 0.0225 ≈ 0.0707 mm²
      const area = wedmCurrentDensityGuardEngine.calculateWireArea(0.3);
      expect(area).toBeCloseTo(0.0707, 3);
    });

    it("throws on zero diameter", () => {
      expect(() => wedmCurrentDensityGuardEngine.calculateWireArea(0)).toThrow(
        "Invalid wire diameter"
      );
    });

    it("throws on negative diameter", () => {
      expect(() => wedmCurrentDensityGuardEngine.calculateWireArea(-0.25)).toThrow(
        "Invalid wire diameter"
      );
    });
  });

  describe("calculateCurrentDensity", () => {
    it("calculates current density for 10A through 0.25mm wire", () => {
      // J = 10 / 0.0491 ≈ 203.7 A/mm²
      const J = wedmCurrentDensityGuardEngine.calculateCurrentDensity(10, 0.25);
      expect(J).toBeCloseTo(203.7, 0);
    });

    it("calculates current density for 15A through 0.30mm wire", () => {
      // J = 15 / 0.0707 ≈ 212.2 A/mm²
      const J = wedmCurrentDensityGuardEngine.calculateCurrentDensity(15, 0.3);
      expect(J).toBeCloseTo(212.2, 0);
    });

    it("returns zero for zero current", () => {
      const J = wedmCurrentDensityGuardEngine.calculateCurrentDensity(0, 0.25);
      expect(J).toBe(0);
    });

    it("throws on negative current", () => {
      expect(() =>
        wedmCurrentDensityGuardEngine.calculateCurrentDensity(-5, 0.25)
      ).toThrow("Invalid current");
    });
  });

  describe("validate", () => {
    it("returns safe for typical brass wire at moderate current", () => {
      const result = wedmCurrentDensityGuardEngine.validate({
        current_A: 10,
        wire_diameter_mm: 0.25,
        wire_material: "brass",
      });
      expect(result.safe).toBe(true);
      expect(result.current_density_A_mm2).toBeCloseTo(203.7, 0);
      expect(result.utilization_pct).toBeLessThan(100);
    });

    it("returns unsafe for excessive current density", () => {
      // 20A through 0.15mm wire = 20 / (π × 0.075²) = 20 / 0.0177 ≈ 1131 A/mm²
      // Exceeds 250 A/mm² limit for brass
      const result = wedmCurrentDensityGuardEngine.validate({
        current_A: 20,
        wire_diameter_mm: 0.15,
        wire_material: "brass",
      });
      expect(result.safe).toBe(false);
      expect(result.block_reason).toContain("exceeds safe limit");
    });

    it("applies safety margin (85% default)", () => {
      const result = wedmCurrentDensityGuardEngine.validate({
        current_A: 10,
        wire_diameter_mm: 0.25,
      });
      expect(result.safety_margin).toBe(0.85);
      expect(result.effective_limit_A_mm2).toBeLessThan(result.max_allowed_A_mm2);
    });

    it("respects custom safety margin", () => {
      const result = wedmCurrentDensityGuardEngine.validate({
        current_A: 10,
        wire_diameter_mm: 0.25,
        safety_margin: 0.7,
      });
      expect(result.safety_margin).toBe(0.7);
      expect(result.effective_limit_A_mm2).toBeCloseTo(
        result.max_allowed_A_mm2 * 0.7,
        1
      );
    });

    it("includes warning when approaching limit", () => {
      // Find a current that puts us between 70% and 85% of limit
      // For 250 A/mm² max, 70% = 175, 85% = 212.5
      // Need J around 180-200 A/mm²
      // For 0.25mm wire (area ≈ 0.0491), I = J × A
      // I = 185 × 0.0491 ≈ 9.1A
      const result = wedmCurrentDensityGuardEngine.validate({
        current_A: 9,
        wire_diameter_mm: 0.25,
        wire_material: "brass",
      });
      expect(result.safe).toBe(true);
      // If utilization >= 70%, should have warning
      if (result.utilization_pct >= 70) {
        expect(result.warning).toContain("Consider reducing current");
      }
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

    it("uses molybdenum limits for moly wire", () => {
      const result = wedmCurrentDensityGuardEngine.validate({
        current_A: 5,
        wire_diameter_mm: 0.1,
        wire_material: "molybdenum",
      });
      // Moly has higher max current density (350 A/mm²)
      // Source may be from wire spec catalog or material fallback
      expect(result.max_allowed_A_mm2).toBeGreaterThanOrEqual(300);
    });

    it("uses tungsten limits for tungsten wire", () => {
      const result = wedmCurrentDensityGuardEngine.validate({
        current_A: 5,
        wire_diameter_mm: 0.1,
        wire_material: "tungsten",
      });
      // Tungsten has highest max current density (400 A/mm²)
      expect(result.max_allowed_A_mm2).toBeGreaterThanOrEqual(350);
    });
  });

  describe("getSafeCurrentLimit", () => {
    it("calculates max safe current for 0.25mm brass wire", () => {
      const maxI = wedmCurrentDensityGuardEngine.getSafeCurrentLimit({
        wire_diameter_mm: 0.25,
        wire_material: "brass",
      });
      // Area ≈ 0.0491 mm², max J = 250 × 0.85 = 212.5 A/mm²
      // Max I = 212.5 × 0.0491 ≈ 10.4A
      expect(maxI).toBeCloseTo(10.4, 0);
    });

    it("returns higher limit for larger wire", () => {
      const small = wedmCurrentDensityGuardEngine.getSafeCurrentLimit({
        wire_diameter_mm: 0.2,
      });
      const large = wedmCurrentDensityGuardEngine.getSafeCurrentLimit({
        wire_diameter_mm: 0.3,
      });
      expect(large).toBeGreaterThan(small);
    });
  });

  describe("validateBatch", () => {
    it("validates multiple configurations at once", () => {
      const results = wedmCurrentDensityGuardEngine.validateBatch([
        { current_A: 10, wire_diameter_mm: 0.25 },
        { current_A: 15, wire_diameter_mm: 0.3 },
        { current_A: 25, wire_diameter_mm: 0.15 }, // This should fail
      ]);
      expect(results).toHaveLength(3);
      expect(results[0].safe).toBe(true);
      expect(results[1].safe).toBe(true);
      expect(results[2].safe).toBe(false);
    });
  });

  describe("wouldExceedLimit", () => {
    it("detects when proposed increase would exceed limit", () => {
      const check = wedmCurrentDensityGuardEngine.wouldExceedLimit(
        10, // current
        25, // proposed (too high for 0.15mm)
        0.15, // thin wire
        "brass"
      );
      expect(check.current_result.safe).toBe(false); // Even 10A is unsafe for 0.15mm
      expect(check.proposed_result.safe).toBe(false);
      expect(check.would_exceed).toBe(true);
    });

    it("allows safe increases", () => {
      const check = wedmCurrentDensityGuardEngine.wouldExceedLimit(
        5,
        8,
        0.25,
        "brass"
      );
      expect(check.current_result.safe).toBe(true);
      expect(check.proposed_result.safe).toBe(true);
      expect(check.would_exceed).toBe(false);
    });
  });

  describe("configuration", () => {
    it("can update configuration", () => {
      const engine = new WEDMCurrentDensityGuardEngine();
      engine.configure({ warning_threshold: 0.6 });
      const config = engine.getConfig();
      expect(config.warning_threshold).toBe(0.6);
    });

    it("preserves other config values when updating", () => {
      const engine = new WEDMCurrentDensityGuardEngine();
      const original = engine.getConfig();
      engine.configure({ warning_threshold: 0.5 });
      const updated = engine.getConfig();
      expect(updated.default_safety_margin).toBe(original.default_safety_margin);
      expect(updated.warning_threshold).toBe(0.5);
    });
  });
});
