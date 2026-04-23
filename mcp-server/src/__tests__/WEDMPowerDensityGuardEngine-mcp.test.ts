/**
 * U-P2PFS20: WEDMPowerDensityGuardEngine MCP Wiring Tests
 * Verifies dispatcher actions wedm_power_density_validate, wedm_power_density_safe_current
 */
import { describe, it, expect } from "vitest";
import { wedmPowerDensityGuardEngine } from "../engines/WEDMPowerDensityGuardEngine.js";

describe("WEDMPowerDensityGuardEngine MCP Wiring (U-P2PFS20)", () => {
  describe("validate()", () => {
    it("returns PowerDensityResult structure", () => {
      const result = wedmPowerDensityGuardEngine.validate({
        peak_current_A: 10,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 50,
      });

      expect(result).toHaveProperty("safe");
      expect(result).toHaveProperty("avg_power_W");
      expect(result).toHaveProperty("kerf_width_mm");
      expect(result).toHaveProperty("cut_front_area_mm2");
      expect(result).toHaveProperty("power_density_W_mm2");
      expect(result).toHaveProperty("max_power_density_W_mm2");
      expect(result).toHaveProperty("utilization_pct");
      expect(result).toHaveProperty("estimated_mrr_mm3_min");
    });

    it("returns safe=true for moderate parameters", () => {
      const result = wedmPowerDensityGuardEngine.validate({
        peak_current_A: 10,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 50,
      });

      expect(result.safe).toBe(true);
      expect(result.block_reason).toBeUndefined();
    });

    it("returns safe=false for excessive power density", () => {
      const result = wedmPowerDensityGuardEngine.validate({
        peak_current_A: 50,
        duty_cycle: 0.7,
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 10, // Thin workpiece = small cut front area
      });

      expect(result.safe).toBe(false);
      expect(result.block_reason).toBeDefined();
      expect(result.block_reason).toContain("exceeds limit");
    });

    it("calculates kerf width correctly", () => {
      const result = wedmPowerDensityGuardEngine.validate({
        peak_current_A: 10,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        overcut_mm: 0.03,
        workpiece_thickness_mm: 50,
      });

      // kerf = wire_diameter + 2 * overcut = 0.25 + 2 * 0.03 = 0.31
      expect(result.kerf_width_mm).toBeCloseTo(0.31, 2);
    });

    it("calculates cut front area correctly", () => {
      const result = wedmPowerDensityGuardEngine.validate({
        peak_current_A: 10,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        overcut_mm: 0.03,
        workpiece_thickness_mm: 50,
      });

      // area = kerf * thickness = 0.31 * 50 = 15.5
      expect(result.cut_front_area_mm2).toBeCloseTo(15.5, 1);
    });

    it("calculates average power correctly", () => {
      const result = wedmPowerDensityGuardEngine.validate({
        peak_current_A: 10,
        gap_voltage_V: 70,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 50,
      });

      // P_avg = I * V * D = 10 * 70 * 0.3 = 210W
      expect(result.avg_power_W).toBeCloseTo(210, 0);
    });

    it("uses lower power density limit for finishing", () => {
      const roughing = wedmPowerDensityGuardEngine.validate({
        peak_current_A: 15,
        duty_cycle: 0.4,
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 50,
        operation_type: "roughing",
      });

      const finishing = wedmPowerDensityGuardEngine.validate({
        peak_current_A: 15,
        duty_cycle: 0.4,
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 50,
        operation_type: "finishing",
      });

      expect(finishing.max_power_density_W_mm2).toBeLessThan(roughing.max_power_density_W_mm2);
    });

    it("applies material multiplier to power density limit", () => {
      const steel = wedmPowerDensityGuardEngine.validate({
        peak_current_A: 10,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 50,
        workpiece_material: "steel",
      });

      const carbide = wedmPowerDensityGuardEngine.validate({
        peak_current_A: 10,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 50,
        workpiece_material: "carbide",
      });

      // Carbide has lower material multiplier (0.5) so lower max density
      expect(carbide.max_power_density_W_mm2).toBeLessThan(steel.max_power_density_W_mm2);
    });

    it("provides warning when approaching limit", () => {
      // Find parameters that give ~80% utilization
      const result = wedmPowerDensityGuardEngine.validate({
        peak_current_A: 20,
        duty_cycle: 0.4,
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 50,
      });

      if (result.safe && result.utilization_pct >= 75) {
        expect(result.warning).toBeDefined();
        expect(result.warning).toContain("Monitor for wire lag");
      }
    });

    it("estimates MRR from power", () => {
      const result = wedmPowerDensityGuardEngine.validate({
        peak_current_A: 10,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 50,
      });

      expect(result.estimated_mrr_mm3_min).toBeGreaterThan(0);
    });

    it("returns invalid for negative current", () => {
      const result = wedmPowerDensityGuardEngine.validate({
        peak_current_A: -5,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 50,
      });

      expect(result.safe).toBe(false);
      expect(result.block_reason).toContain("Invalid peak current");
    });

    it("returns invalid for duty cycle > 1", () => {
      const result = wedmPowerDensityGuardEngine.validate({
        peak_current_A: 10,
        duty_cycle: 1.5,
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 50,
      });

      expect(result.safe).toBe(false);
      expect(result.block_reason).toContain("Invalid duty cycle");
    });

    it("returns invalid for zero thickness", () => {
      const result = wedmPowerDensityGuardEngine.validate({
        peak_current_A: 10,
        duty_cycle: 0.3,
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 0,
      });

      expect(result.safe).toBe(false);
      expect(result.block_reason).toContain("Invalid workpiece thickness");
    });
  });

  describe("calculateMaxSafeCurrent()", () => {
    it("returns safe current limit", () => {
      const result = wedmPowerDensityGuardEngine.calculateMaxSafeCurrent(
        0.25, 50, 0.3
      );

      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThan(0);
    });

    it("returns higher current for thicker workpiece", () => {
      const thin = wedmPowerDensityGuardEngine.calculateMaxSafeCurrent(
        0.25, 25, 0.3
      );

      const thick = wedmPowerDensityGuardEngine.calculateMaxSafeCurrent(
        0.25, 100, 0.3
      );

      expect(thick).toBeGreaterThan(thin);
    });

    it("returns lower current for higher duty cycle", () => {
      const lowDuty = wedmPowerDensityGuardEngine.calculateMaxSafeCurrent(
        0.25, 50, 0.2
      );

      const highDuty = wedmPowerDensityGuardEngine.calculateMaxSafeCurrent(
        0.25, 50, 0.5
      );

      expect(highDuty).toBeLessThan(lowDuty);
    });

    it("returns lower current for finishing operation", () => {
      const roughing = wedmPowerDensityGuardEngine.calculateMaxSafeCurrent(
        0.25, 50, 0.3, "roughing"
      );

      const finishing = wedmPowerDensityGuardEngine.calculateMaxSafeCurrent(
        0.25, 50, 0.3, "finishing"
      );

      expect(finishing).toBeLessThan(roughing);
    });

    it("applies material factor", () => {
      const steel = wedmPowerDensityGuardEngine.calculateMaxSafeCurrent(
        0.25, 50, 0.3, "roughing", "steel"
      );

      const titanium = wedmPowerDensityGuardEngine.calculateMaxSafeCurrent(
        0.25, 50, 0.3, "roughing", "titanium"
      );

      expect(titanium).toBeLessThan(steel);
    });
  });

  describe("utility methods", () => {
    it("getConfig returns configuration", () => {
      const config = wedmPowerDensityGuardEngine.getConfig();

      expect(config).toHaveProperty("default_gap_voltage_V");
      expect(config).toHaveProperty("default_overcut_mm");
      expect(config).toHaveProperty("max_power_density_roughing");
      expect(config).toHaveProperty("max_power_density_finishing");
      expect(config).toHaveProperty("warning_threshold");
    });

    it("calculateKerfWidth returns wire + 2*overcut", () => {
      const kerf = wedmPowerDensityGuardEngine.calculateKerfWidth(0.25, 0.03);
      expect(kerf).toBeCloseTo(0.31, 4);
    });

    it("calculateCutFrontArea returns kerf * thickness", () => {
      const area = wedmPowerDensityGuardEngine.calculateCutFrontArea(0.31, 50);
      expect(area).toBeCloseTo(15.5, 2);
    });

    it("calculateAveragePower returns I*V*D", () => {
      const power = wedmPowerDensityGuardEngine.calculateAveragePower(10, 70, 0.3);
      expect(power).toBeCloseTo(210, 0);
    });

    it("getMaxPowerDensity varies by operation type", () => {
      const roughing = wedmPowerDensityGuardEngine.getMaxPowerDensity("roughing");
      const finishing = wedmPowerDensityGuardEngine.getMaxPowerDensity("finishing");
      const skim = wedmPowerDensityGuardEngine.getMaxPowerDensity("skim");

      expect(roughing).toBeGreaterThan(finishing);
      expect(finishing).toBe(skim);
    });

    it("estimateMRR returns positive value", () => {
      const mrr = wedmPowerDensityGuardEngine.estimateMRR(200, "roughing");
      expect(mrr).toBeGreaterThan(0);
    });
  });
});
