/**
 * AutoSpeedFeedCalculatorEngine Tests
 * ====================================
 * Tests for auto speed/feed calculation for Okuma macros.
 *
 * @module __tests__/engines/autoSpeedFeedCalculatorEngine.test.ts
 */

import { describe, it, expect, vi } from "vitest";
import {
  AutoSpeedFeedCalculatorEngine,
  autoSpeedFeedCalculatorEngine,
  type AutoSFInput,
  type AutoSFOperation,
} from "../../engines/AutoSpeedFeedCalculatorEngine.js";

// Mock the captureSFC middleware to avoid side effects
vi.mock("../../middleware/sfcOutcomeWire.js", () => ({
  captureSFC: vi.fn(),
}));

describe("AutoSpeedFeedCalculatorEngine", () => {
  const engine = new AutoSpeedFeedCalculatorEngine();

  describe("calcRPM()", () => {
    it("calculates imperial RPM using SFM * 3.8197 / diameter", () => {
      // RPM = 200 * 3.8197 / 1.0 = 764
      const rpm = engine.calcRPM(200, 1.0, "imperial");
      expect(rpm).toBe(764);
    });

    it("calculates metric RPM using 1000 * Vc / (pi * D)", () => {
      // RPM = 1000 * 100 / (pi * 25) = 1273.24
      const rpm = engine.calcRPM(100, 25, "metric");
      expect(rpm).toBeCloseTo(1273.24, 0);
    });

    it("returns 0 for zero diameter", () => {
      const rpm = engine.calcRPM(200, 0, "imperial");
      expect(rpm).toBe(0);
    });

    it("returns 0 for zero SFM", () => {
      const rpm = engine.calcRPM(0, 1.0, "imperial");
      expect(rpm).toBe(0);
    });

    it("returns 0 for negative diameter", () => {
      const rpm = engine.calcRPM(200, -1.0, "imperial");
      expect(rpm).toBe(0);
    });

    it("calculates higher RPM for smaller diameters", () => {
      const rpm1 = engine.calcRPM(200, 1.0, "imperial");
      const rpm2 = engine.calcRPM(200, 0.5, "imperial");
      expect(rpm2).toBe(rpm1 * 2);
    });
  });

  describe("applyG50Clamp()", () => {
    it("clamps RPM to operation default G50 value", () => {
      // od_rough default G50 is 2500
      const result = engine.applyG50Clamp(3000, "od_rough");
      expect(result.clamped_rpm).toBe(2500);
      expect(result.g50_value).toBe(2500);
      expect(result.was_clamped).toBe(true);
    });

    it("does not clamp when RPM is below G50", () => {
      const result = engine.applyG50Clamp(2000, "od_rough");
      expect(result.clamped_rpm).toBe(2000);
      expect(result.was_clamped).toBe(false);
    });

    it("respects maxRpmOverride when provided", () => {
      const result = engine.applyG50Clamp(3000, "od_rough", 1500);
      expect(result.clamped_rpm).toBe(1500);
      expect(result.g50_value).toBe(1500);
      expect(result.was_clamped).toBe(true);
    });

    it("respects machineMax when lower than G50", () => {
      const result = engine.applyG50Clamp(3000, "od_rough", undefined, 2000);
      expect(result.clamped_rpm).toBe(2000);
      expect(result.was_clamped).toBe(true);
    });

    it("uses default 6000 when machineMax not provided", () => {
      // For an operation with high default G50 like chamfer (2500)
      // The effective max should be min(2500, 6000) = 2500
      const result = engine.applyG50Clamp(5000, "chamfer");
      expect(result.g50_value).toBe(2500);
    });

    it("returns correct G50 defaults for different operations", () => {
      expect(engine.applyG50Clamp(9999, "cutoff").g50_value).toBe(1500);
      expect(engine.applyG50Clamp(9999, "od_finish").g50_value).toBe(3000);
      expect(engine.applyG50Clamp(9999, "bore_rough").g50_value).toBe(1800);
    });
  });

  describe("scaleBoringBarFeed()", () => {
    it("returns 100% feed for L/D <= 3", () => {
      const result = engine.scaleBoringBarFeed(0.010, 1.0, 2.5);
      expect(result.scaled_feed).toBe(0.010);
      expect(result.scale_factor).toBe(1.0);
      expect(result.reason).toContain("L/D=2.5");
    });

    it("returns 75% feed for L/D between 3 and 4", () => {
      const result = engine.scaleBoringBarFeed(0.010, 1.0, 3.5);
      expect(result.scaled_feed).toBeCloseTo(0.0075, 4);
      expect(result.scale_factor).toBe(0.75);
      expect(result.reason).toContain("75% feed");
    });

    it("returns 50% feed for L/D between 4 and 5", () => {
      const result = engine.scaleBoringBarFeed(0.010, 1.0, 4.5);
      expect(result.scaled_feed).toBeCloseTo(0.005, 4);
      expect(result.scale_factor).toBe(0.50);
      expect(result.reason).toContain("50% feed");
    });

    it("returns 25% feed for L/D between 5 and 6", () => {
      const result = engine.scaleBoringBarFeed(0.010, 1.0, 5.5);
      expect(result.scaled_feed).toBeCloseTo(0.0025, 4);
      expect(result.scale_factor).toBe(0.25);
      expect(result.reason).toContain("25% feed");
    });

    it("returns 15% feed with CAUTION for L/D > 6", () => {
      const result = engine.scaleBoringBarFeed(0.010, 1.0, 7.0);
      expect(result.scaled_feed).toBeCloseTo(0.0015, 4);
      expect(result.scale_factor).toBe(0.15);
      expect(result.reason).toContain("CAUTION");
    });

    it("returns original feed for invalid bar diameter", () => {
      const result = engine.scaleBoringBarFeed(0.010, 0, 5.0);
      expect(result.scaled_feed).toBe(0.010);
      expect(result.scale_factor).toBe(1.0);
      expect(result.reason).toContain("invalid");
    });
  });

  describe("calcPeckSchedule()", () => {
    it("returns empty array for zero drill diameter", () => {
      const schedule = engine.calcPeckSchedule(0, 1.0, "imperial");
      expect(schedule).toEqual([]);
    });

    it("returns empty array for zero depth", () => {
      const schedule = engine.calcPeckSchedule(0.5, 0, "imperial");
      expect(schedule).toEqual([]);
    });

    it("calculates imperial peck schedule with 1xD first peck for steel", () => {
      // 0.5" drill, 1.0" deep, steel (P)
      const schedule = engine.calcPeckSchedule(0.5, 1.0, "imperial", "P");
      // First peck: 0.5" (1xD), subsequent: 0.25" (0.5xD)
      expect(schedule[0]).toBe(0.5);
      expect(schedule[1]).toBe(0.25);
      expect(schedule[2]).toBe(0.25);
      expect(schedule.length).toBe(3);
    });

    it("calculates larger pecks for aluminum (N material)", () => {
      // 0.5" drill, 1.0" deep, aluminum (N)
      const schedule = engine.calcPeckSchedule(0.5, 1.0, "imperial", "N");
      // First peck: 0.75" (1.5xD), subsequent: 0.5" (1xD)
      expect(schedule[0]).toBe(0.75);
      expect(schedule[1]).toBe(0.25); // remaining 0.25"
      expect(schedule.length).toBe(2);
    });

    it("respects minimum peck depth of 0.020 inches", () => {
      // Very small drill
      const schedule = engine.calcPeckSchedule(0.010, 0.050, "imperial", "P");
      // First peck should be minimum 0.020
      expect(schedule[0]).toBeGreaterThanOrEqual(0.020);
    });

    it("calculates metric peck schedule with minimum 0.5mm", () => {
      const schedule = engine.calcPeckSchedule(10, 30, "metric", "P");
      // First peck: 10mm (1xD), subsequent: 5mm (0.5xD)
      expect(schedule[0]).toBe(10);
      expect(schedule[1]).toBe(5);
      expect(schedule[2]).toBe(5);
      expect(schedule[3]).toBe(5);
      expect(schedule[4]).toBe(5);
      expect(schedule.length).toBe(5);
    });
  });

  describe("calculate() — full workflow", () => {
    it("calculates RPM and applies G50 clamping for OD turning", () => {
      const input: AutoSFInput = {
        unit_system: "imperial",
        operations: [{
          station: 1,
          operation: "od_rough",
          sfm: 500,
          feed: 0.012,
          cutting_diameter: 2.0,
        }],
      };
      const result = engine.calculate(input);
      // RPM = 500 * 3.8197 / 2.0 = 955
      expect(result.operations[0].calculated_rpm).toBe(955);
      expect(result.operations[0].was_clamped).toBe(false);
      expect(result.stats.total_operations).toBe(1);
    });

    it("clamps high RPM from small diameter operations", () => {
      const input: AutoSFInput = {
        unit_system: "imperial",
        operations: [{
          station: 1,
          operation: "od_finish",
          sfm: 600,
          feed: 0.005,
          cutting_diameter: 0.25,
        }],
      };
      const result = engine.calculate(input);
      // RPM = 600 * 3.8197 / 0.25 = 9167 → clamped to 3000 (od_finish G50)
      expect(result.operations[0].calculated_rpm).toBe(9167);
      expect(result.operations[0].clamped_rpm).toBe(3000);
      expect(result.operations[0].was_clamped).toBe(true);
      expect(result.stats.operations_clamped).toBe(1);
    });

    it("scales feed for boring bar rigidity when bar dimensions provided", () => {
      const input: AutoSFInput = {
        unit_system: "imperial",
        operations: [{
          station: 5,
          operation: "bore_rough",
          sfm: 300,
          feed: 0.008,
          cutting_diameter: 1.5,
          bar_diameter: 0.75,
          bar_stickout: 4.0, // L/D = 5.33 → 25% feed
        }],
      };
      const result = engine.calculate(input);
      expect(result.operations[0].feed_scaled).toBe(true);
      expect(result.operations[0].adjusted_feed).toBeCloseTo(0.002, 3);
      expect(result.stats.operations_feed_scaled).toBe(1);
    });

    it("calculates predicted Ra when nose radius provided", () => {
      const input: AutoSFInput = {
        unit_system: "imperial",
        operations: [{
          station: 1,
          operation: "od_finish",
          sfm: 500,
          feed: 0.006,
          cutting_diameter: 2.0,
          nose_radius: 0.032,
        }],
      };
      const result = engine.calculate(input);
      expect(result.operations[0].predicted_ra_um).toBeGreaterThan(0);
      expect(result.stats.worst_ra_um).toBeGreaterThan(0);
    });

    it("generates Okuma variable lines", () => {
      const input: AutoSFInput = {
        unit_system: "imperial",
        operations: [{
          station: 1,
          operation: "od_rough",
          sfm: 400,
          feed: 0.010,
          cutting_diameter: 1.5,
        }],
      };
      const result = engine.calculate(input);
      expect(result.operations[0].okuma_lines.length).toBeGreaterThan(0);
      expect(result.all_okuma_lines.length).toBeGreaterThan(0);
    });

    it("handles multiple operations and accumulates stats", () => {
      const input: AutoSFInput = {
        unit_system: "metric",
        machine_max_rpm: 4000,
        operations: [
          { station: 1, operation: "od_rough", sfm: 150, feed: 0.25, cutting_diameter: 50 },
          { station: 2, operation: "od_finish", sfm: 200, feed: 0.1, cutting_diameter: 50 },
          { station: 3, operation: "face", sfm: 180, feed: 0.2, cutting_diameter: 60 },
        ],
      };
      const result = engine.calculate(input);
      expect(result.stats.total_operations).toBe(3);
      expect(result.operations.length).toBe(3);
    });
  });

  describe("singleton export", () => {
    it("exports a pre-instantiated engine singleton", () => {
      expect(autoSpeedFeedCalculatorEngine).toBeInstanceOf(AutoSpeedFeedCalculatorEngine);
    });

    it("singleton calcRPM works correctly", () => {
      const rpm = autoSpeedFeedCalculatorEngine.calcRPM(200, 1.0, "imperial");
      expect(rpm).toBe(764);
    });
  });

  describe("failure modes", () => {
    it("handles empty operations array gracefully", () => {
      const input: AutoSFInput = {
        unit_system: "imperial",
        operations: [],
      };
      const result = engine.calculate(input);
      expect(result.stats.total_operations).toBe(0);
      expect(result.operations).toEqual([]);
    });

    it("handles negative cutting diameter by returning 0 RPM", () => {
      const input: AutoSFInput = {
        unit_system: "imperial",
        operations: [{
          station: 1,
          operation: "od_rough",
          sfm: 200,
          feed: 0.010,
          cutting_diameter: -1.0,
        }],
      };
      const result = engine.calculate(input);
      expect(result.operations[0].calculated_rpm).toBe(0);
    });

    it("handles very large L/D ratio for boring bars", () => {
      const result = engine.scaleBoringBarFeed(0.010, 0.5, 10);
      // L/D = 20, extreme case
      expect(result.scale_factor).toBe(0.15);
      expect(result.reason).toContain("CAUTION");
    });
  });
});
