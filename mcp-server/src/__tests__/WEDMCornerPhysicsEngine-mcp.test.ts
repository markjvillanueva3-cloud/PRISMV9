/**
 * U-P2PFS22: WEDMCornerPhysicsEngine MCP Wiring Tests
 * Verifies dispatcher actions wedm_corner_analyze, wedm_corner_analyze_multi, wedm_corner_min_radius
 */
import { describe, it, expect } from "vitest";
import { wedmCornerPhysicsEngine } from "../engines/WEDMCornerPhysicsEngine.js";

describe("WEDMCornerPhysicsEngine MCP Wiring (U-P2PFS22)", () => {
  describe("analyzeCorner()", () => {
    it("returns CornerRecommendation structure", () => {
      const result = wedmCornerPhysicsEngine.analyzeCorner({
        corner_type: "inside",
        corner_angle_deg: 90,
      });

      expect(result).toHaveProperty("feed_rate_factor");
      expect(result).toHaveProperty("recommended_feed_mm_min");
      expect(result).toHaveProperty("spark_energy_factor");
      expect(result).toHaveProperty("min_corner_radius_mm");
      expect(result).toHaveProperty("wire_deflection_mm");
      expect(result).toHaveProperty("expected_error_mm");
      expect(result).toHaveProperty("warnings");
      expect(result).toHaveProperty("strategies");
    });

    it("reduces feed for sharp inside corners", () => {
      const sharpCorner = wedmCornerPhysicsEngine.analyzeCorner({
        corner_type: "inside",
        corner_angle_deg: 30,
      });

      const rightCorner = wedmCornerPhysicsEngine.analyzeCorner({
        corner_type: "inside",
        corner_angle_deg: 90,
      });

      expect(sharpCorner.feed_rate_factor).toBeLessThan(rightCorner.feed_rate_factor);
    });

    it("maintains or increases feed for outside corners", () => {
      const outsideCorner = wedmCornerPhysicsEngine.analyzeCorner({
        corner_type: "outside",
        corner_angle_deg: 90,
      });

      expect(outsideCorner.feed_rate_factor).toBeGreaterThanOrEqual(1.0);
    });

    it("provides dwell time for sharp inside corners", () => {
      const result = wedmCornerPhysicsEngine.analyzeCorner({
        corner_type: "inside",
        corner_angle_deg: 25,
      });

      expect(result.dwell_time_ms).toBeDefined();
      expect(result.dwell_time_ms).toBeGreaterThan(0);
    });

    it("calculates wire deflection", () => {
      const result = wedmCornerPhysicsEngine.analyzeCorner({
        corner_type: "inside",
        corner_angle_deg: 45,
        wire_tension_N: 15,
        thickness_mm: 50,
      });

      expect(result.wire_deflection_mm).toBeGreaterThanOrEqual(0);
    });

    it("warns when requested radius below minimum", () => {
      const result = wedmCornerPhysicsEngine.analyzeCorner({
        corner_type: "inside",
        corner_angle_deg: 90,
        corner_radius_mm: 0.05, // Very small
        wire_diameter_mm: 0.25,
      });

      expect(result.warnings.some(w => w.includes("below minimum"))).toBe(true);
    });

    it("provides strategies for corner handling", () => {
      const result = wedmCornerPhysicsEngine.analyzeCorner({
        corner_type: "inside",
        corner_angle_deg: 30,
      });

      expect(result.strategies.length).toBeGreaterThan(0);
    });

    it("warns for thick material with sharp corners", () => {
      const result = wedmCornerPhysicsEngine.analyzeCorner({
        corner_type: "inside",
        corner_angle_deg: 30,
        thickness_mm: 120,
      });

      expect(result.warnings.some(w => w.includes("Thick material"))).toBe(true);
    });

    it("adjusts energy factor for inside corners", () => {
      const inside = wedmCornerPhysicsEngine.analyzeCorner({
        corner_type: "inside",
        corner_angle_deg: 45,
      });

      expect(inside.spark_energy_factor).toBeLessThan(1.0);
    });
  });

  describe("analyzeMultipleCorners()", () => {
    it("returns MultiCornerResult structure", () => {
      const result = wedmCornerPhysicsEngine.analyzeMultipleCorners({
        corners: [
          { id: "c1", corner_type: "inside", corner_angle_deg: 90 },
          { id: "c2", corner_type: "outside", corner_angle_deg: 90 },
        ],
      });

      expect(result).toHaveProperty("corner_recommendations");
      expect(result).toHaveProperty("critical_corners");
      expect(result).toHaveProperty("total_dwell_time_ms");
      expect(result).toHaveProperty("average_feed_reduction_percent");
      expect(result).toHaveProperty("overall_strategy");
    });

    it("analyzes each corner individually", () => {
      const result = wedmCornerPhysicsEngine.analyzeMultipleCorners({
        corners: [
          { id: "c1", corner_type: "inside", corner_angle_deg: 45 },
          { id: "c2", corner_type: "inside", corner_angle_deg: 90 },
          { id: "c3", corner_type: "outside", corner_angle_deg: 90 },
        ],
      });

      expect(result.corner_recommendations).toHaveLength(3);
      expect(result.corner_recommendations[0].corner_id).toBe("c1");
    });

    it("identifies critical corners", () => {
      const result = wedmCornerPhysicsEngine.analyzeMultipleCorners({
        corners: [
          { id: "critical1", corner_type: "inside", corner_angle_deg: 25 },
          { id: "normal1", corner_type: "outside", corner_angle_deg: 90 },
        ],
      });

      expect(result.critical_corners).toContain("critical1");
    });

    it("sums total dwell time", () => {
      const result = wedmCornerPhysicsEngine.analyzeMultipleCorners({
        corners: [
          { id: "c1", corner_type: "inside", corner_angle_deg: 30 },
          { id: "c2", corner_type: "inside", corner_angle_deg: 40 },
        ],
      });

      expect(result.total_dwell_time_ms).toBeGreaterThan(0);
    });

    it("calculates average feed reduction", () => {
      const result = wedmCornerPhysicsEngine.analyzeMultipleCorners({
        corners: [
          { id: "c1", corner_type: "inside", corner_angle_deg: 45 },
          { id: "c2", corner_type: "inside", corner_angle_deg: 90 },
        ],
      });

      expect(result.average_feed_reduction_percent).toBeGreaterThan(0);
    });

    it("provides overall strategy", () => {
      const result = wedmCornerPhysicsEngine.analyzeMultipleCorners({
        corners: [
          { id: "c1", corner_type: "inside", corner_angle_deg: 90 },
        ],
      });

      expect(result.overall_strategy).toBeDefined();
      expect(typeof result.overall_strategy).toBe("string");
    });
  });

  describe("calculateMinCornerRadius()", () => {
    it("returns minimum radius for wire geometry", () => {
      const result = wedmCornerPhysicsEngine.calculateMinCornerRadius(0.25, 0.025);

      expect(result).toBeGreaterThan(0);
      // min = wire_radius + spark_gap = 0.125 + 0.025 = 0.15
      expect(result).toBeCloseTo(0.15, 3);
    });

    it("increases with larger wire diameter", () => {
      const small = wedmCornerPhysicsEngine.calculateMinCornerRadius(0.20, 0.025);
      const large = wedmCornerPhysicsEngine.calculateMinCornerRadius(0.30, 0.025);

      expect(large).toBeGreaterThan(small);
    });

    it("increases with larger spark gap", () => {
      const smallGap = wedmCornerPhysicsEngine.calculateMinCornerRadius(0.25, 0.02);
      const largeGap = wedmCornerPhysicsEngine.calculateMinCornerRadius(0.25, 0.04);

      expect(largeGap).toBeGreaterThan(smallGap);
    });
  });

  describe("utility methods", () => {
    it("getConfig returns configuration", () => {
      const config = wedmCornerPhysicsEngine.getConfig();

      expect(config).toHaveProperty("default_wire_diameter_mm");
      expect(config).toHaveProperty("default_spark_gap_mm");
      expect(config).toHaveProperty("default_wire_tension_N");
      expect(config).toHaveProperty("default_feed_rate_mm_min");
      expect(config).toHaveProperty("sharp_corner_threshold_deg");
    });

    it("calculateWireDeflection returns positive value", () => {
      const deflection = wedmCornerPhysicsEngine.calculateWireDeflection(15, 50, 45);
      expect(deflection).toBeGreaterThanOrEqual(0);
    });

    it("calculateWireLag returns positive value", () => {
      const lag = wedmCornerPhysicsEngine.calculateWireLag(2.5, 50, 45);
      expect(lag).toBeGreaterThanOrEqual(0);
    });
  });
});
