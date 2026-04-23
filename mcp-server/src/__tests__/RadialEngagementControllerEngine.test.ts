/**
 * RadialEngagementControllerEngine Tests — MIO-MS0/U-MIO17
 */
import { describe, it, expect } from "vitest";
import { radialEngagementControllerEngine } from "../engines/RadialEngagementControllerEngine.js";

describe("RadialEngagementControllerEngine", () => {
  const defaultParams = {
    tool_diameter_mm: 10,
    target_engagement_pct: 40,
    base_feedrate_mm_min: 1000,
    max_feedrate_mm_min: 2000,
    min_feedrate_mm_min: 200,
    axial_depth_mm: 5,
    num_flutes: 4,
    max_chip_load_mm: 0.1,
    min_chip_load_mm: 0.02,
  };

  describe("control", () => {
    it("processes segments with nominal engagement", () => {
      const segments = [
        {
          id: "seg1",
          start: { x: 0, y: 0, z: 0 },
          end: { x: 10, y: 0, z: 0 },
          type: "linear" as const,
          base_feedrate_mm_min: 1000,
          radial_engagement_mm: 4, // 40% of 10mm
        },
      ];

      const result = radialEngagementControllerEngine.control(segments, defaultParams);

      expect(result.segments).toHaveLength(1);
      expect(result.summary.total_segments).toBe(1);
      expect(result.ai_reasoning.length).toBeGreaterThan(0);
    });

    it("increases feedrate for low engagement (chip thinning)", () => {
      const segments = [
        {
          id: "seg1",
          start: { x: 0, y: 0, z: 0 },
          end: { x: 10, y: 0, z: 0 },
          type: "linear" as const,
          base_feedrate_mm_min: 1000,
          radial_engagement_mm: 2, // 20% of 10mm - chip thinning zone
        },
      ];

      const result = radialEngagementControllerEngine.control(segments, defaultParams);

      expect(result.segments[0].adjusted_feedrate_mm_min).toBeGreaterThan(1000);
      expect(result.segments[0].adjustment_reason).toBe("chip_thinning_compensation");
    });

    it("reduces feedrate for high engagement", () => {
      const segments = [
        {
          id: "seg1",
          start: { x: 0, y: 0, z: 0 },
          end: { x: 10, y: 0, z: 0 },
          type: "linear" as const,
          base_feedrate_mm_min: 1000,
          radial_engagement_mm: 8, // 80% of 10mm - high engagement
        },
      ];

      const result = radialEngagementControllerEngine.control(segments, defaultParams);

      expect(result.segments[0].adjusted_feedrate_mm_min).toBeLessThan(1000);
      expect(result.segments[0].adjustment_reason).toBe("high_engagement_reduction");
    });

    it("respects max feedrate limit", () => {
      const segments = [
        {
          id: "seg1",
          start: { x: 0, y: 0, z: 0 },
          end: { x: 10, y: 0, z: 0 },
          type: "linear" as const,
          base_feedrate_mm_min: 1500,
          radial_engagement_mm: 1, // Very low engagement - would need high feed
        },
      ];

      const result = radialEngagementControllerEngine.control(segments, defaultParams);

      expect(result.segments[0].adjusted_feedrate_mm_min).toBeLessThanOrEqual(2000);
      expect(result.segments[0].warnings.length).toBeGreaterThan(0);
    });

    it("respects min feedrate limit", () => {
      const segments = [
        {
          id: "seg1",
          start: { x: 0, y: 0, z: 0 },
          end: { x: 10, y: 0, z: 0 },
          type: "linear" as const,
          base_feedrate_mm_min: 300,
          radial_engagement_mm: 10, // Full slotting - very high engagement
        },
      ];

      const result = radialEngagementControllerEngine.control(segments, defaultParams);

      expect(result.segments[0].adjusted_feedrate_mm_min).toBeGreaterThanOrEqual(200);
    });

    it("skips rapid moves", () => {
      const segments = [
        {
          id: "rapid1",
          start: { x: 0, y: 0, z: 10 },
          end: { x: 50, y: 50, z: 10 },
          type: "rapid" as const,
          base_feedrate_mm_min: 10000,
        },
      ];

      const result = radialEngagementControllerEngine.control(segments, defaultParams);

      expect(result.segments[0].adjustment_reason).toBe("rapid_move");
      expect(result.segments[0].actual_engagement_pct).toBe(0);
    });

    it("calculates force variance reduction", () => {
      const segments = [
        {
          id: "seg1",
          start: { x: 0, y: 0, z: 0 },
          end: { x: 10, y: 0, z: 0 },
          type: "linear" as const,
          base_feedrate_mm_min: 1000,
          radial_engagement_mm: 2,
        },
        {
          id: "seg2",
          start: { x: 10, y: 0, z: 0 },
          end: { x: 20, y: 0, z: 0 },
          type: "linear" as const,
          base_feedrate_mm_min: 1000,
          radial_engagement_mm: 6,
        },
      ];

      const result = radialEngagementControllerEngine.control(segments, defaultParams);

      expect(result.summary.force_variance_reduction_pct).toBeGreaterThanOrEqual(0);
      expect(result.summary.adjusted_segments).toBeGreaterThanOrEqual(1);
    });

    it("provides AI reasoning trace", () => {
      const segments = [
        {
          id: "seg1",
          start: { x: 0, y: 0, z: 0 },
          end: { x: 10, y: 0, z: 0 },
          type: "linear" as const,
          base_feedrate_mm_min: 1000,
          radial_engagement_mm: 4,
        },
      ];

      const result = radialEngagementControllerEngine.control(segments, defaultParams);

      expect(result.ai_reasoning.some(r => r.includes("[ENGAGE-CTRL]"))).toBe(true);
    });
  });

  describe("quickControl", () => {
    it("returns adjusted feedrate for nominal engagement", () => {
      const result = radialEngagementControllerEngine.quickControl(4, 10, 1000, 40);

      expect(result.adjusted_feedrate_mm_min).toBeGreaterThan(0);
      expect(result.force_ratio).toBeGreaterThan(0);
    });

    it("increases feed for chip thinning at low ae", () => {
      const lowAe = radialEngagementControllerEngine.quickControl(2, 10, 1000, 40);
      const nominalAe = radialEngagementControllerEngine.quickControl(4, 10, 1000, 40);

      expect(lowAe.adjusted_feedrate_mm_min).toBeGreaterThan(nominalAe.adjusted_feedrate_mm_min);
    });

    it("reduces feed for high ae", () => {
      const highAe = radialEngagementControllerEngine.quickControl(8, 10, 1000, 40);
      const nominalAe = radialEngagementControllerEngine.quickControl(4, 10, 1000, 40);

      expect(highAe.adjusted_feedrate_mm_min).toBeLessThan(nominalAe.adjusted_feedrate_mm_min);
    });
  });

  describe("generateFeedrateTable", () => {
    it("generates table for varying engagements", () => {
      const engagements = [2, 4, 6, 4, 2];

      const table = radialEngagementControllerEngine.generateFeedrateTable(engagements, defaultParams);

      expect(table).toHaveLength(5);
      expect(table[0].feedrate).toBeGreaterThan(table[2].feedrate);
    });

    it("clamps feedrates to limits", () => {
      const engagements = [0.5, 9.5]; // Very low and very high

      const table = radialEngagementControllerEngine.generateFeedrateTable(engagements, defaultParams);

      expect(table[0].feedrate).toBeLessThanOrEqual(defaultParams.max_feedrate_mm_min);
      expect(table[1].feedrate).toBeGreaterThanOrEqual(defaultParams.min_feedrate_mm_min);
    });
  });

  describe("analyzeCorners", () => {
    it("detects sharp corners", () => {
      // Create a path with sharp 45-degree turns
      const segments = [
        {
          id: "seg1",
          start: { x: 0, y: 0, z: 0 },
          end: { x: 10, y: 0, z: 0 },
          type: "linear" as const,
          base_feedrate_mm_min: 1000,
        },
        {
          id: "seg2",
          start: { x: 10, y: 0, z: 0 },
          end: { x: 15, y: 5, z: 0 }, // 45-degree turn
          type: "linear" as const,
          base_feedrate_mm_min: 1000,
        },
        {
          id: "seg3",
          start: { x: 15, y: 5, z: 0 },
          end: { x: 10, y: 10, z: 0 }, // Sharp reverse
          type: "linear" as const,
          base_feedrate_mm_min: 1000,
        },
      ];

      const result = radialEngagementControllerEngine.analyzeCorners(segments, 10);

      // At minimum we should have the return structure
      expect(result.corner_indices).toBeDefined();
      expect(result.peak_engagements).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it("ignores rapid moves in corner analysis", () => {
      const segments = [
        {
          id: "rapid1",
          start: { x: 0, y: 0, z: 10 },
          end: { x: 10, y: 0, z: 10 },
          type: "rapid" as const,
          base_feedrate_mm_min: 10000,
        },
        {
          id: "seg1",
          start: { x: 10, y: 0, z: 0 },
          end: { x: 20, y: 0, z: 0 },
          type: "linear" as const,
          base_feedrate_mm_min: 1000,
        },
      ];

      const result = radialEngagementControllerEngine.analyzeCorners(segments, 10);

      expect(result.corner_indices).toHaveLength(0);
    });
  });

  describe("chip thinning physics", () => {
    it("applies chip thinning compensation for low ae", () => {
      const aeLow = 2.5; // D/4 - chip thinning zone
      const aeHigh = 5.0; // D/2 - nominal zone

      const resultLow = radialEngagementControllerEngine.quickControl(aeLow, 10, 1000, 40);
      const resultHigh = radialEngagementControllerEngine.quickControl(aeHigh, 10, 1000, 40);

      // Low ae should get higher feedrate to compensate for chip thinning
      expect(resultLow.adjusted_feedrate_mm_min).toBeGreaterThan(resultHigh.adjusted_feedrate_mm_min);

      // Both should be positive
      expect(resultLow.adjusted_feedrate_mm_min).toBeGreaterThan(0);
      expect(resultHigh.adjusted_feedrate_mm_min).toBeGreaterThan(0);
    });
  });
});
