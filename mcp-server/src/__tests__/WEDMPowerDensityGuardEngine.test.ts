/**
 * WEDMPowerDensityGuardEngine Tests
 * Power density safety validation
 */

import { describe, it, expect } from "vitest";
import {
  wedmPowerDensityGuardEngine,
  WEDMPowerDensityGuardEngine,
} from "../engines/WEDMPowerDensityGuardEngine.js";

describe("WEDMPowerDensityGuardEngine", () => {
  describe("calculateKerfWidth", () => {
    it("calculates kerf width correctly", () => {
      // kerf = wire_dia + 2×overcut = 0.25 + 2×0.03 = 0.31mm
      const kerf = wedmPowerDensityGuardEngine.calculateKerfWidth(0.25, 0.03);
      expect(kerf).toBeCloseTo(0.31, 3);
    });
  });

  describe("calculateCutFrontArea", () => {
    it("calculates cut front area correctly", () => {
      // A = kerf × thickness = 0.31 × 50 = 15.5 mm²
      const area = wedmPowerDensityGuardEngine.calculateCutFrontArea(0.31, 50);
      expect(area).toBeCloseTo(15.5, 1);
    });
  });

  describe("calculateAveragePower", () => {
    it("calculates average power correctly", () => {
      // P_avg = Ip × Vg × D = 10A × 70V × 0.3 = 210W
      const power = wedmPowerDensityGuardEngine.calculateAveragePower(10, 70, 0.3);
      expect(power).toBeCloseTo(210, 0);
    });
  });

  describe("calculatePowerDensity", () => {
    it("calculates power density correctly", () => {
      // P/A = 210W / 15.5mm² = 13.5 W/mm²
      const density = wedmPowerDensityGuardEngine.calculatePowerDensity(210, 15.5);
      expect(density).toBeCloseTo(13.5, 0);
    });

    it("throws on zero area", () => {
      expect(() => wedmPowerDensityGuardEngine.calculatePowerDensity(100, 0)).toThrow();
    });
  });

  describe("validate", () => {
    it("passes for safe power density", () => {
      const result = wedmPowerDensityGuardEngine.validate({
        peak_current_A: 10,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 50,
      });
      expect(result.safe).toBe(true);
      expect(result.power_density_W_mm2).toBeLessThan(result.max_power_density_W_mm2);
    });

    it("fails for excessive power density", () => {
      const result = wedmPowerDensityGuardEngine.validate({
        peak_current_A: 30,
        duty_cycle: 0.45,
        wire_diameter_mm: 0.15,
        workpiece_thickness_mm: 10, // Thin part = small area
      });
      expect(result.safe).toBe(false);
      expect(result.block_reason).toContain("exceeds limit");
    });

    it("applies material-specific limits", () => {
      const steel = wedmPowerDensityGuardEngine.validate({
        peak_current_A: 15,
        duty_cycle: 0.35,
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 30,
        workpiece_material: "steel",
      });

      const carbide = wedmPowerDensityGuardEngine.validate({
        peak_current_A: 15,
        duty_cycle: 0.35,
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 30,
        workpiece_material: "tungsten_carbide",
      });

      // Carbide has lower max power density (0.5× multiplier)
      expect(carbide.max_power_density_W_mm2).toBeLessThan(steel.max_power_density_W_mm2);
    });

    it("warns when approaching limit", () => {
      const result = wedmPowerDensityGuardEngine.validate({
        peak_current_A: 15,
        duty_cycle: 0.4,
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 20,
      });
      // Should be safe but close to limit
      if (result.safe && result.utilization_pct >= 75) {
        expect(result.warning).toBeDefined();
      }
    });

    it("handles invalid inputs gracefully", () => {
      const result1 = wedmPowerDensityGuardEngine.validate({
        peak_current_A: -5,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 50,
      });
      expect(result1.safe).toBe(false);
      expect(result1.block_reason).toContain("peak current");

      const result2 = wedmPowerDensityGuardEngine.validate({
        peak_current_A: 10,
        duty_cycle: 1.5, // Invalid duty cycle
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 50,
      });
      expect(result2.safe).toBe(false);
      expect(result2.block_reason).toContain("duty cycle");
    });

    it("estimates MRR", () => {
      const result = wedmPowerDensityGuardEngine.validate({
        peak_current_A: 10,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 50,
      });
      expect(result.estimated_mrr_mm3_min).toBeGreaterThan(0);
    });
  });

  describe("calculateMaxSafeCurrent", () => {
    it("calculates max safe current", () => {
      const maxCurrent = wedmPowerDensityGuardEngine.calculateMaxSafeCurrent(
        0.25, // wire diameter
        50,   // thickness
        0.3,  // duty cycle
        "roughing"
      );
      expect(maxCurrent).toBeGreaterThan(0);
    });

    it("returns lower limit for finishing", () => {
      const roughing = wedmPowerDensityGuardEngine.calculateMaxSafeCurrent(
        0.25, 50, 0.3, "roughing"
      );
      const finishing = wedmPowerDensityGuardEngine.calculateMaxSafeCurrent(
        0.25, 50, 0.3, "finishing"
      );
      expect(finishing).toBeLessThan(roughing);
    });
  });

  describe("configuration", () => {
    it("can update configuration", () => {
      const engine = new WEDMPowerDensityGuardEngine();
      engine.configure({ max_power_density_roughing: 60 });
      expect(engine.getConfig().max_power_density_roughing).toBe(60);
    });
  });
});
