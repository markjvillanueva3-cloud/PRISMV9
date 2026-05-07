/**
 * WEDMPulseLimitEngine Tests
 * Pulse parameter safety validation
 */

import { describe, it, expect } from "vitest";
import {
  wedmPulseLimitEngine,
  WEDMPulseLimitEngine,
} from "../engines/WEDMPulseLimitEngine.js";

describe("WEDMPulseLimitEngine", () => {
  describe("calculateDutyCycle", () => {
    it("calculates duty cycle correctly", () => {
      // D = ton / (ton + toff) = 10 / (10 + 20) = 0.333
      expect(wedmPulseLimitEngine.calculateDutyCycle(10, 20)).toBeCloseTo(0.333, 2);
    });

    it("returns 0.5 for equal on/off times", () => {
      expect(wedmPulseLimitEngine.calculateDutyCycle(15, 15)).toBe(0.5);
    });

    it("throws on non-positive values", () => {
      expect(() => wedmPulseLimitEngine.calculateDutyCycle(0, 10)).toThrow();
      expect(() => wedmPulseLimitEngine.calculateDutyCycle(10, 0)).toThrow();
      expect(() => wedmPulseLimitEngine.calculateDutyCycle(-5, 10)).toThrow();
    });
  });

  describe("calculateFrequency", () => {
    it("calculates frequency correctly", () => {
      // f = 1 / (ton + toff) in seconds
      // ton=10us, toff=20us → period = 30us = 30e-6s → f = 33333 Hz
      const freq = wedmPulseLimitEngine.calculateFrequency(10, 20);
      expect(freq).toBeCloseTo(33333, -2);
    });

    it("returns higher frequency for shorter pulses", () => {
      const short = wedmPulseLimitEngine.calculateFrequency(5, 10);
      const long = wedmPulseLimitEngine.calculateFrequency(20, 40);
      expect(short).toBeGreaterThan(long);
    });
  });

  describe("calculatePulseEnergy", () => {
    it("calculates energy per pulse correctly", () => {
      // E = Ip × Vg × ton = 10A × 70V × 10μs = 10 × 70 × 10e-6 = 7mJ
      const energy = wedmPulseLimitEngine.calculatePulseEnergy(10, 10, 70);
      expect(energy).toBeCloseTo(7, 1);
    });

    it("scales linearly with current", () => {
      const e1 = wedmPulseLimitEngine.calculatePulseEnergy(10, 10, 70);
      const e2 = wedmPulseLimitEngine.calculatePulseEnergy(20, 10, 70);
      expect(e2).toBeCloseTo(e1 * 2, 1);
    });
  });

  describe("validate", () => {
    it("passes for safe pulse parameters", () => {
      const result = wedmPulseLimitEngine.validate({
        ton_us: 20,
        toff_us: 40,
        peak_current_A: 10,
        wire_diameter_mm: 0.25,
      });
      expect(result.safe).toBe(true);
      expect(result.duty_cycle).toBeCloseTo(0.333, 2);
    });

    it("fails for excessive ton in finishing", () => {
      const result = wedmPulseLimitEngine.validate({
        ton_us: 20, // Max for finishing is 10
        toff_us: 40,
        peak_current_A: 10,
        wire_diameter_mm: 0.25,
        operation_type: "finishing",
      });
      expect(result.safe).toBe(false);
      expect(result.block_reason).toContain("ton exceeds");
    });

    it("fails for insufficient toff", () => {
      const result = wedmPulseLimitEngine.validate({
        ton_us: 10,
        toff_us: 5, // Below minimum of 8
        peak_current_A: 10,
        wire_diameter_mm: 0.25,
      });
      expect(result.safe).toBe(false);
      expect(result.block_reason).toContain("toff");
    });

    it("fails for excessive duty cycle", () => {
      const result = wedmPulseLimitEngine.validate({
        ton_us: 30,
        toff_us: 30, // D = 0.5, above max 0.45
        peak_current_A: 10,
        wire_diameter_mm: 0.25,
      });
      expect(result.safe).toBe(false);
      expect(result.block_reason).toContain("Duty cycle");
    });

    it("warns when duty cycle approaches limit", () => {
      const result = wedmPulseLimitEngine.validate({
        ton_us: 25,
        toff_us: 40, // D ≈ 0.38, above warning threshold
        peak_current_A: 10,
        wire_diameter_mm: 0.25,
      });
      expect(result.safe).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("validates thick workpiece flushing requirements", () => {
      const result = wedmPulseLimitEngine.validate({
        ton_us: 20,
        toff_us: 25, // Ratio = 1.25, below 2.0 for thick parts
        peak_current_A: 10,
        wire_diameter_mm: 0.25,
        workpiece_thickness_mm: 100,
      });
      // Check that we have validation for toff/ton ratio
      const hasFlushingValidation = result.validations.some(
        v => v.parameter === "toff_ton_ratio"
      );
      expect(hasFlushingValidation).toBe(true);
    });

    it("handles invalid input gracefully", () => {
      const result1 = wedmPulseLimitEngine.validate({
        ton_us: -5,
        toff_us: 20,
        peak_current_A: 10,
        wire_diameter_mm: 0.25,
      });
      expect(result1.safe).toBe(false);
      expect(result1.block_reason).toContain("Invalid ton");

      const result2 = wedmPulseLimitEngine.validate({
        ton_us: 10,
        toff_us: -5,
        peak_current_A: 10,
        wire_diameter_mm: 0.25,
      });
      expect(result2.safe).toBe(false);
      expect(result2.block_reason).toContain("Invalid toff");
    });
  });

  describe("calculateSafePulse", () => {
    it("returns conservative parameters for high MRR", () => {
      const params = wedmPulseLimitEngine.calculateSafePulse("high", 0.25, "roughing");
      expect(params.ton_us).toBeGreaterThan(0);
      expect(params.toff_us).toBeGreaterThan(0);
      expect(params.peak_current_A).toBeGreaterThan(0);
    });

    it("returns lower parameters for medium MRR", () => {
      const high = wedmPulseLimitEngine.calculateSafePulse("high", 0.25, "roughing");
      const medium = wedmPulseLimitEngine.calculateSafePulse("medium", 0.25, "roughing");
      expect(medium.ton_us).toBeLessThan(high.ton_us);
    });
  });

  describe("configuration", () => {
    it("can update configuration", () => {
      const engine = new WEDMPulseLimitEngine();
      engine.configure({ max_duty_cycle: 0.5 });
      expect(engine.getConfig().max_duty_cycle).toBe(0.5);
    });
  });
});
