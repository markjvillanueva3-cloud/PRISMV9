/**
 * HSMDwellAtCornerEngine Tests — MILL-AGI-P2/MILL-MS7-04
 *
 * Tests HSM dwell-at-corner physics calculations.
 */

import { describe, it, expect } from "vitest";
import {
  HSMDwellAtCornerEngine,
  type CornerGeometry,
  type MachineServo,
  type HSMParameters,
} from "../engines/HSMDwellAtCornerEngine.js";

describe("HSMDwellAtCornerEngine", () => {
  const defaultServo: MachineServo = {
    max_acceleration_mm_s2: 5000,
    max_jerk_mm_s3: 100000,
    servo_bandwidth_hz: 50,
    look_ahead_blocks: 100,
  };

  const defaultParams: HSMParameters = {
    programmed_feed_mm_min: 5000,
    tolerance_mm: 0.01,
  };

  describe("analyzeDwell", () => {
    it("should calculate dwell for 90-degree corner", () => {
      const corner: CornerGeometry = {
        angle_deg: 90,
        approach_vector: { x: 1, y: 0 },
        exit_vector: { x: 0, y: 1 },
      };

      const result = HSMDwellAtCornerEngine.analyzeDwell(corner, defaultServo, defaultParams);

      expect(result.recommended_dwell_ms).toBeGreaterThan(0);
      expect(result.actual_corner_radius_mm).toBeGreaterThan(0);
      expect(result.settling_time_ms).toBeGreaterThan(0);
      expect(result.physics_trace.formulas_used.length).toBeGreaterThan(0);
    });

    it("should calculate minimal dwell for gentle angle", () => {
      const corner: CornerGeometry = {
        angle_deg: 170, // Nearly straight
        approach_vector: { x: 1, y: 0 },
        exit_vector: { x: 0.98, y: 0.17 },
      };

      const result = HSMDwellAtCornerEngine.analyzeDwell(corner, defaultServo, defaultParams);

      // Gentle angle still requires some settling time but less than sharp
      expect(result.recommended_dwell_ms).toBeLessThan(30);
    });

    it("should calculate larger dwell for sharp corner", () => {
      const gentleCorner: CornerGeometry = {
        angle_deg: 150,
        approach_vector: { x: 1, y: 0 },
        exit_vector: { x: 0.866, y: 0.5 },
      };
      const sharpCorner: CornerGeometry = {
        angle_deg: 45,
        approach_vector: { x: 1, y: 0 },
        exit_vector: { x: 0.707, y: 0.707 },
      };

      const gentleResult = HSMDwellAtCornerEngine.analyzeDwell(gentleCorner, defaultServo, defaultParams);
      const sharpResult = HSMDwellAtCornerEngine.analyzeDwell(sharpCorner, defaultServo, defaultParams);

      expect(sharpResult.recommended_dwell_ms).toBeGreaterThan(gentleResult.recommended_dwell_ms);
    });

    it("should reduce dwell with HSM mode G05P1", () => {
      const corner: CornerGeometry = {
        angle_deg: 90,
        approach_vector: { x: 1, y: 0 },
        exit_vector: { x: 0, y: 1 },
      };

      const noHsm = HSMDwellAtCornerEngine.analyzeDwell(corner, defaultServo, { ...defaultParams, hsm_mode: "off" });
      const withHsm = HSMDwellAtCornerEngine.analyzeDwell(corner, defaultServo, { ...defaultParams, hsm_mode: "g05p1" });

      expect(withHsm.recommended_dwell_ms).toBeLessThan(noHsm.recommended_dwell_ms);
    });

    it("should include physics trace with formulas", () => {
      const corner: CornerGeometry = {
        angle_deg: 90,
        approach_vector: { x: 1, y: 0 },
        exit_vector: { x: 0, y: 1 },
      };

      const result = HSMDwellAtCornerEngine.analyzeDwell(corner, defaultServo, defaultParams);

      expect(result.physics_trace.formulas_used.length).toBeGreaterThan(0);
      expect(result.physics_trace.formulas_used.some(f => f.includes("v_change"))).toBe(true);
      expect(result.physics_trace.formulas_used.some(f => f.includes("settle"))).toBe(true);
      expect(result.physics_trace.confidence).toBeGreaterThan(0.5);
    });

    it("should calculate thermal accumulation factor", () => {
      const corner: CornerGeometry = {
        angle_deg: 60,
        approach_vector: { x: 1, y: 0 },
        exit_vector: { x: 0.5, y: 0.866 },
      };

      const result = HSMDwellAtCornerEngine.analyzeDwell(corner, defaultServo, defaultParams);

      expect(result.thermal_accumulation_factor).toBeGreaterThanOrEqual(1);
    });

    it("should apply corner feed override", () => {
      const corner: CornerGeometry = {
        angle_deg: 90,
        approach_vector: { x: 1, y: 0 },
        exit_vector: { x: 0, y: 1 },
      };

      const fullFeed = HSMDwellAtCornerEngine.analyzeDwell(corner, defaultServo, defaultParams);
      const reducedFeed = HSMDwellAtCornerEngine.analyzeDwell(corner, defaultServo, {
        ...defaultParams,
        corner_feed_override_pct: 50,
      });

      expect(reducedFeed.effective_feed_at_corner_mm_min).toBeLessThan(fullFeed.effective_feed_at_corner_mm_min);
    });

    it("should generate recommendations for high dwell times", () => {
      const corner: CornerGeometry = {
        angle_deg: 30, // Very sharp
        approach_vector: { x: 1, y: 0 },
        exit_vector: { x: 0.866, y: 0.5 },
      };

      const params: HSMParameters = {
        programmed_feed_mm_min: 10000, // High feed
        tolerance_mm: 0.005, // Tight tolerance
      };

      const result = HSMDwellAtCornerEngine.analyzeDwell(corner, defaultServo, params);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("optimizeCorner", () => {
    it("should provide optimal corner parameters", () => {
      const corner: CornerGeometry = {
        angle_deg: 90,
        approach_vector: { x: 1, y: 0 },
        exit_vector: { x: 0, y: 1 },
      };

      const result = HSMDwellAtCornerEngine.optimizeCorner(corner, defaultServo, defaultParams);

      expect(result.optimal_corner_radius_mm).toBeGreaterThan(0);
      expect(result.optimal_feed_at_corner_mm_min).toBeGreaterThan(0);
      expect(result.quality_score).toBeGreaterThan(0);
      expect(result.quality_score).toBeLessThanOrEqual(1);
    });

    it("should provide tradeoff analysis", () => {
      const corner: CornerGeometry = {
        angle_deg: 90,
        approach_vector: { x: 1, y: 0 },
        exit_vector: { x: 0, y: 1 },
      };

      const result = HSMDwellAtCornerEngine.optimizeCorner(corner, defaultServo, defaultParams);

      expect(result.tradeoff_analysis.faster).toBeDefined();
      expect(result.tradeoff_analysis.better).toBeDefined();
      expect(result.tradeoff_analysis.faster.feed).toBeGreaterThan(defaultParams.programmed_feed_mm_min);
      expect(result.tradeoff_analysis.better.feed).toBeLessThan(defaultParams.programmed_feed_mm_min);
    });
  });

  describe("calculateCornerFeed", () => {
    it("should reduce feed for sharp corners", () => {
      const sharpAngle = Math.PI / 4; // 45 degrees
      const gentleAngle = (5 * Math.PI) / 6; // 150 degrees

      const sharpFeed = HSMDwellAtCornerEngine.calculateCornerFeed(sharpAngle, 5000, 5000);
      const gentleFeed = HSMDwellAtCornerEngine.calculateCornerFeed(gentleAngle, 5000, 5000);

      expect(sharpFeed).toBeLessThan(gentleFeed);
    });

    it("should maintain feed for nearly straight paths", () => {
      const straightAngle = (175 * Math.PI) / 180; // 175 degrees

      const feed = HSMDwellAtCornerEngine.calculateCornerFeed(straightAngle, 5000, 5000);

      expect(feed).toBe(5000);
    });
  });

  describe("estimateSurfaceFinishImpact", () => {
    it("should increase with longer dwell", () => {
      const shortDwell = HSMDwellAtCornerEngine.estimateSurfaceFinishImpact(5, 5000, 10);
      const longDwell = HSMDwellAtCornerEngine.estimateSurfaceFinishImpact(50, 5000, 10);

      expect(longDwell).toBeGreaterThan(shortDwell);
    });

    it("should return 1.0 for zero dwell", () => {
      const impact = HSMDwellAtCornerEngine.estimateSurfaceFinishImpact(0, 5000, 10);

      expect(impact).toBeCloseTo(1.0, 2);
    });
  });
});
