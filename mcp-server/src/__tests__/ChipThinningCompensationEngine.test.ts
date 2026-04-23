/**
 * ChipThinningCompensationEngine Tests — MIO-MS0/U-MIO09
 */
import { describe, it, expect } from "vitest";
import { chipThinningCompensationEngine } from "../engines/ChipThinningCompensationEngine.js";

describe("ChipThinningCompensationEngine", () => {
  describe("calculate", () => {
    it("returns no compensation for full slot (ae >= D/2)", () => {
      const result = chipThinningCompensationEngine.calculate({
        feed_per_tooth_mm: 0.1,
        radial_engagement_mm: 6.0,
        tool_diameter_mm: 12.0,
      });

      expect(result.compensation_applied).toBe(false);
      expect(result.compensation_factor).toBe(1.0);
      expect(result.compensated_feed_per_tooth_mm).toBe(0.1);
      expect(result.engagement_ratio).toBe(0.5);
    });

    it("calculates correct compensation for 25% engagement", () => {
      const result = chipThinningCompensationEngine.calculate({
        feed_per_tooth_mm: 0.1,
        radial_engagement_mm: 3.0,
        tool_diameter_mm: 12.0,
      });

      expect(result.compensation_applied).toBe(true);
      expect(result.engagement_ratio).toBe(0.25);
      expect(result.compensation_factor).toBeCloseTo(2.0, 2);
      expect(result.compensated_feed_per_tooth_mm).toBeCloseTo(0.2, 3);
    });

    it("calculates correct compensation for 10% engagement", () => {
      const result = chipThinningCompensationEngine.calculate({
        feed_per_tooth_mm: 0.1,
        radial_engagement_mm: 1.2,
        tool_diameter_mm: 12.0,
      });

      expect(result.compensation_applied).toBe(true);
      expect(result.engagement_ratio).toBeCloseTo(0.1, 5);
      const expectedFactor = Math.sqrt(12 / 1.2);
      expect(result.compensation_factor).toBeCloseTo(Math.min(expectedFactor, 2.0), 2);
    });

    it("caps compensation at max_compensation_factor", () => {
      const result = chipThinningCompensationEngine.calculate({
        feed_per_tooth_mm: 0.1,
        radial_engagement_mm: 0.6,
        tool_diameter_mm: 12.0,
        max_compensation_factor: 1.5,
      });

      expect(result.compensation_factor).toBeLessThanOrEqual(1.5);
    });

    it("calculates effective chip thickness correctly", () => {
      const result = chipThinningCompensationEngine.calculate({
        feed_per_tooth_mm: 0.1,
        radial_engagement_mm: 3.0,
        tool_diameter_mm: 12.0,
      });

      const expectedHex = 0.1 * Math.sqrt(0.25);
      expect(result.effective_chip_thickness_mm).toBeCloseTo(expectedHex, 4);
    });

    it("provides reasoning trace", () => {
      const result = chipThinningCompensationEngine.calculate({
        feed_per_tooth_mm: 0.1,
        radial_engagement_mm: 3.0,
        tool_diameter_mm: 12.0,
      });

      expect(result.ai_reasoning.length).toBeGreaterThan(0);
      expect(result.ai_reasoning.some(r => r.includes("[CHIP-THIN]"))).toBe(true);
    });
  });

  describe("calculateForSegments", () => {
    it("processes multiple segments correctly", () => {
      const segments = [
        { id: "seg1", position_mm: 0, feed_per_tooth_mm: 0.1, radial_engagement_mm: 3.0 },
        { id: "seg2", position_mm: 10, feed_per_tooth_mm: 0.1, radial_engagement_mm: 6.0 },
        { id: "seg3", position_mm: 20, feed_per_tooth_mm: 0.1, radial_engagement_mm: 2.0 },
      ];

      const result = chipThinningCompensationEngine.calculateForSegments(segments, 12.0);

      expect(result.total_segments).toBe(3);
      expect(result.segments_compensated).toBe(2);
      expect(result.segments[0].compensation_applied).toBe(true);
      expect(result.segments[1].compensation_applied).toBe(false);
      expect(result.segments[2].compensation_applied).toBe(true);
    });

    it("calculates average and max compensation", () => {
      const segments = [
        { id: "seg1", position_mm: 0, feed_per_tooth_mm: 0.1, radial_engagement_mm: 3.0 },
        { id: "seg2", position_mm: 10, feed_per_tooth_mm: 0.1, radial_engagement_mm: 6.0 },
      ];

      const result = chipThinningCompensationEngine.calculateForSegments(segments, 12.0);

      expect(result.max_compensation).toBeGreaterThan(1.0);
      expect(result.average_compensation).toBeGreaterThan(1.0);
      expect(result.average_compensation).toBeLessThanOrEqual(result.max_compensation);
    });
  });

  describe("quickCompensate", () => {
    it("returns factor 1.0 for full engagement", () => {
      const result = chipThinningCompensationEngine.quickCompensate(0.1, 6.0, 12.0);

      expect(result.applies).toBe(false);
      expect(result.factor).toBe(1.0);
      expect(result.compensated_fz).toBe(0.1);
    });

    it("returns correct factor for partial engagement", () => {
      const result = chipThinningCompensationEngine.quickCompensate(0.1, 3.0, 12.0);

      expect(result.applies).toBe(true);
      expect(result.factor).toBeCloseTo(2.0, 2);
      expect(result.compensated_fz).toBeCloseTo(0.2, 3);
    });
  });

  describe("generateFeedrateModulation", () => {
    it("generates correct F code", () => {
      const result = chipThinningCompensationEngine.generateFeedrateModulation(1000, 1.5);

      expect(result.feedrate_mm_min).toBe(1500);
      expect(result.f_code).toBe("F1500");
    });

    it("rounds feedrate to integer", () => {
      const result = chipThinningCompensationEngine.generateFeedrateModulation(1000, 1.414);

      expect(result.feedrate_mm_min).toBe(1414);
      expect(result.f_code).toBe("F1414");
    });
  });

  describe("physics validation", () => {
    it("chip thinning formula: hex = fz × sqrt(ae/D)", () => {
      const fz = 0.15;
      const ae = 4.0;
      const D = 16.0;
      const expectedHex = fz * Math.sqrt(ae / D);

      const result = chipThinningCompensationEngine.calculate({
        feed_per_tooth_mm: fz,
        radial_engagement_mm: ae,
        tool_diameter_mm: D,
      });

      expect(result.effective_chip_thickness_mm).toBeCloseTo(expectedHex, 5);
    });

    it("compensation formula: factor = sqrt(D/ae)", () => {
      const ae = 4.0;
      const D = 16.0;
      const expectedFactor = Math.sqrt(D / ae);

      const result = chipThinningCompensationEngine.calculate({
        feed_per_tooth_mm: 0.1,
        radial_engagement_mm: ae,
        tool_diameter_mm: D,
      });

      expect(result.compensation_factor).toBeCloseTo(expectedFactor, 3);
    });

    it("compensated fz restores effective chip thickness", () => {
      const fz = 0.1;
      const ae = 3.0;
      const D = 12.0;

      const result = chipThinningCompensationEngine.calculate({
        feed_per_tooth_mm: fz,
        radial_engagement_mm: ae,
        tool_diameter_mm: D,
      });

      const originalHex = fz * Math.sqrt(ae / D);
      const compensatedHex = result.compensated_feed_per_tooth_mm * Math.sqrt(ae / D);

      expect(compensatedHex).toBeCloseTo(fz, 4);
    });
  });
});
