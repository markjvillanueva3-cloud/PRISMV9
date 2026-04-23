/**
 * U-P2PFS16: WEDMPulseLimitEngine MCP Wiring Tests
 * Verifies dispatcher actions wedm_pulse_limit_validate, wedm_pulse_limit_safe_pulse
 */
import { describe, it, expect } from "vitest";
import { wedmPulseLimitEngine } from "../engines/WEDMPulseLimitEngine.js";

describe("WEDMPulseLimitEngine MCP Wiring (U-P2PFS16)", () => {
  describe("validate()", () => {
    it("returns PulseLimitResult structure", () => {
      const result = wedmPulseLimitEngine.validate({
        ton_us: 20,
        toff_us: 30,
        peak_current_A: 15,
        wire_diameter_mm: 0.25,
      });

      expect(result).toHaveProperty("safe");
      expect(result).toHaveProperty("duty_cycle");
      expect(result).toHaveProperty("max_duty_cycle");
      expect(result).toHaveProperty("frequency_Hz");
      expect(result).toHaveProperty("avg_power_factor");
      expect(result).toHaveProperty("energy_per_pulse_mJ");
      expect(result).toHaveProperty("validations");
      expect(result).toHaveProperty("warnings");
    });

    it("validates safe pulse parameters", () => {
      const result = wedmPulseLimitEngine.validate({
        ton_us: 10,
        toff_us: 30,
        peak_current_A: 10,
        wire_diameter_mm: 0.25,
      });

      expect(result.safe).toBe(true);
      expect(result.duty_cycle).toBeLessThan(result.max_duty_cycle);
    });

    it("calculates duty cycle correctly", () => {
      const result = wedmPulseLimitEngine.validate({
        ton_us: 20,
        toff_us: 30,
        peak_current_A: 10,
        wire_diameter_mm: 0.25,
      });

      const expectedDutyCycle = 20 / (20 + 30);
      expect(result.duty_cycle).toBeCloseTo(expectedDutyCycle, 4);
    });

    it("detects unsafe high duty cycle", () => {
      const result = wedmPulseLimitEngine.validate({
        ton_us: 50,
        toff_us: 10,
        peak_current_A: 20,
        wire_diameter_mm: 0.25,
      });

      expect(result.safe).toBe(false);
      expect(result.block_reason).toBeDefined();
    });

    it("uses wire material thermal limits", () => {
      const brassResult = wedmPulseLimitEngine.validate({
        ton_us: 30,
        toff_us: 30,
        peak_current_A: 15,
        wire_diameter_mm: 0.25,
        wire_material: "brass",
      });

      const molyResult = wedmPulseLimitEngine.validate({
        ton_us: 30,
        toff_us: 30,
        peak_current_A: 15,
        wire_diameter_mm: 0.25,
        wire_material: "molybdenum",
      });

      expect(brassResult.validations).toBeDefined();
      expect(molyResult.validations).toBeDefined();
    });

    it("respects operation type limits", () => {
      const roughResult = wedmPulseLimitEngine.validate({
        ton_us: 40,
        toff_us: 60,
        peak_current_A: 15,
        wire_diameter_mm: 0.25,
        operation_type: "roughing",
      });

      const finishResult = wedmPulseLimitEngine.validate({
        ton_us: 40,
        toff_us: 60,
        peak_current_A: 15,
        wire_diameter_mm: 0.25,
        operation_type: "finishing",
      });

      expect(roughResult.validations.length).toBeGreaterThan(0);
      expect(finishResult.validations.length).toBeGreaterThan(0);
    });

    it("considers workpiece thickness for flushing", () => {
      const thinResult = wedmPulseLimitEngine.validate({
        ton_us: 20,
        toff_us: 20,
        peak_current_A: 10,
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 10,
      });

      const thickResult = wedmPulseLimitEngine.validate({
        ton_us: 20,
        toff_us: 20,
        peak_current_A: 10,
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 100,
      });

      expect(thinResult.validations).toBeDefined();
      expect(thickResult.validations).toBeDefined();
    });

    it("calculates frequency correctly", () => {
      const result = wedmPulseLimitEngine.validate({
        ton_us: 10,
        toff_us: 40,
        peak_current_A: 10,
        wire_diameter_mm: 0.25,
      });

      const expectedFreq = 1_000_000 / (10 + 40);
      expect(result.frequency_Hz).toBeCloseTo(expectedFreq, 0);
    });

    it("returns validations array", () => {
      const result = wedmPulseLimitEngine.validate({
        ton_us: 20,
        toff_us: 30,
        peak_current_A: 10,
        wire_diameter_mm: 0.25,
      });

      expect(Array.isArray(result.validations)).toBe(true);
      result.validations.forEach(v => {
        expect(v).toHaveProperty("parameter");
        expect(v).toHaveProperty("value");
        expect(v).toHaveProperty("limit");
        expect(v).toHaveProperty("status");
        expect(v).toHaveProperty("message");
      });
    });
  });

  describe("calculateSafePulse()", () => {
    it("returns safe pulse parameters", () => {
      const result = wedmPulseLimitEngine.calculateSafePulse(
        "medium",
        0.25,
        "roughing"
      );

      expect(result).toHaveProperty("ton_us");
      expect(result).toHaveProperty("toff_us");
      expect(result).toHaveProperty("peak_current_A");
      expect(result.ton_us).toBeGreaterThan(0);
      expect(result.toff_us).toBeGreaterThan(0);
      expect(result.peak_current_A).toBeGreaterThan(0);
    });

    it("varies output by target MRR", () => {
      const highResult = wedmPulseLimitEngine.calculateSafePulse("high", 0.25, "roughing");
      const lowResult = wedmPulseLimitEngine.calculateSafePulse("low", 0.25, "roughing");

      expect(highResult.ton_us).toBeGreaterThan(lowResult.ton_us);
      expect(highResult.peak_current_A).toBeGreaterThan(lowResult.peak_current_A);
    });

    it("adapts to operation type", () => {
      const roughResult = wedmPulseLimitEngine.calculateSafePulse("medium", 0.25, "roughing");
      const finishResult = wedmPulseLimitEngine.calculateSafePulse("medium", 0.25, "finishing");

      expect(roughResult.ton_us).toBeGreaterThan(finishResult.ton_us);
    });

    it("scales with wire diameter", () => {
      const thinWire = wedmPulseLimitEngine.calculateSafePulse("medium", 0.15, "roughing");
      const thickWire = wedmPulseLimitEngine.calculateSafePulse("medium", 0.30, "roughing");

      expect(thickWire.peak_current_A).toBeGreaterThan(thinWire.peak_current_A);
    });
  });

  describe("utility methods", () => {
    it("calculateDutyCycle returns correct value", () => {
      const duty = wedmPulseLimitEngine.calculateDutyCycle(20, 30);
      expect(duty).toBeCloseTo(0.4, 4);
    });

    it("calculateFrequency returns correct value", () => {
      const freq = wedmPulseLimitEngine.calculateFrequency(10, 40);
      expect(freq).toBeCloseTo(20000, 0);
    });

    it("getMaxTon returns operation-specific limits", () => {
      const roughMax = wedmPulseLimitEngine.getMaxTon("roughing");
      const finishMax = wedmPulseLimitEngine.getMaxTon("finishing");
      expect(roughMax).toBeGreaterThan(finishMax);
    });

    it("getConfig returns configuration", () => {
      const config = wedmPulseLimitEngine.getConfig();
      expect(config).toHaveProperty("max_ton_roughing_us");
      expect(config).toHaveProperty("max_ton_finishing_us");
      expect(config).toHaveProperty("min_toff_us");
      expect(config).toHaveProperty("max_duty_cycle");
    });
  });
});
