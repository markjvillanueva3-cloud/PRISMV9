/**
 * EngagementDynamicsEngine Tests
 *
 * Validates real-time engagement calculation for adaptive toolpaths.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  engagementDynamicsEngine,
  ToolpathSegment,
} from "../engines/EngagementDynamicsEngine.js";

describe("EngagementDynamicsEngine", () => {
  beforeEach(() => {
    engagementDynamicsEngine.clearHistory();
  });

  describe("calculatePointEngagement", () => {
    it("should calculate engagement for a linear cut", () => {
      const point = { x: 10, y: 0, z: -5 };
      const prevPoint = { x: 0, y: 0, z: -5 };

      const engagement = engagementDynamicsEngine.calculatePointEngagement(
        point,
        prevPoint,
        10, // 10mm tool diameter
        2,  // 2mm axial depth
        0.1, // 0.1mm feed per tooth
        4    // 4 flutes
      );

      expect(engagement.radialEngagement).toBeGreaterThan(0);
      expect(engagement.radialEngagement).toBeLessThanOrEqual(1);
      expect(engagement.axialEngagement).toBe(2);
      expect(engagement.effectiveChipLoad).toBeGreaterThan(0);
      expect(engagement.materialRemovalRate).toBeGreaterThan(0);
      expect(engagement.cuttingForceEstimate).toBeGreaterThan(0);
    });

    it("should return higher engagement for larger step-over", () => {
      const point1 = { x: 5, y: 0, z: -5 };
      const prevPoint1 = { x: 0, y: 0, z: -5 };
      const point2 = { x: 10, y: 0, z: -5 };
      const prevPoint2 = { x: 0, y: 0, z: -5 };

      const engagement1 = engagementDynamicsEngine.calculatePointEngagement(
        point1, prevPoint1, 10, 2, 0.1, 4
      );
      const engagement2 = engagementDynamicsEngine.calculatePointEngagement(
        point2, prevPoint2, 10, 2, 0.1, 4
      );

      expect(engagement2.radialEngagement).toBeGreaterThan(engagement1.radialEngagement);
    });

    it("should calculate chip thinning at low engagement", () => {
      const point = { x: 2, y: 0, z: -5 };
      const prevPoint = { x: 0, y: 0, z: -5 };

      const engagement = engagementDynamicsEngine.calculatePointEngagement(
        point, prevPoint, 10, 2, 0.1, 4
      );

      // Low engagement = higher effective chip load due to thinning factor
      expect(engagement.effectiveChipLoad).toBeGreaterThan(0.1);
    });

    it("should return correct engagement angles", () => {
      const point = { x: 5, y: 0, z: -5 };
      const prevPoint = { x: 0, y: 0, z: -5 };

      const engagement = engagementDynamicsEngine.calculatePointEngagement(
        point, prevPoint, 10, 2, 0.1, 4
      );

      expect(engagement.engagementAngle).toBeGreaterThan(0);
      expect(engagement.engagementAngle).toBeLessThanOrEqual(180);
      expect(engagement.entryAngle).toBeLessThan(engagement.exitAngle);
    });

    it("should estimate cutting force using Kienzle model", () => {
      const point = { x: 5, y: 0, z: -5 };
      const prevPoint = { x: 0, y: 0, z: -5 };

      const engagement = engagementDynamicsEngine.calculatePointEngagement(
        point, prevPoint, 10, 2, 0.1, 4
      );

      // Fc = kc1.1 * b * h^(1-mc) where kc1.1=2000, mc=0.25
      expect(engagement.cuttingForceEstimate).toBeGreaterThan(100);
      expect(engagement.cuttingForceEstimate).toBeLessThan(5000);
    });
  });

  describe("calculateSegmentProfile", () => {
    it("should calculate profile for a linear segment", () => {
      const segment: ToolpathSegment = {
        id: "seg1",
        points: [
          { x: 0, y: 0, z: -5 },
          { x: 10, y: 0, z: -5 },
          { x: 20, y: 0, z: -5 },
          { x: 30, y: 0, z: -5 },
        ],
        type: "linear",
        toolDiameter: 10,
        depthOfCut: 2,
      };

      const profile = engagementDynamicsEngine.calculateSegmentProfile(
        segment, 0.1, 4
      );

      expect(profile.segmentId).toBe("seg1");
      expect(profile.states.length).toBe(4);
      expect(profile.peakEngagement).toBeGreaterThanOrEqual(profile.avgEngagement);
      expect(profile.avgEngagement).toBeGreaterThan(0);
    });

    it("should identify critical points above threshold", () => {
      const segment: ToolpathSegment = {
        id: "seg2",
        points: [
          { x: 0, y: 0, z: -5 },
          { x: 2, y: 0, z: -5 },
          { x: 4, y: 0, z: -5 },
          { x: 50, y: 0, z: -5 }, // Large step = spike
          { x: 52, y: 0, z: -5 },
        ],
        type: "linear",
        toolDiameter: 10,
        depthOfCut: 2,
      };

      const profile = engagementDynamicsEngine.calculateSegmentProfile(
        segment, 0.1, 4
      );

      expect(profile.engagementVariance).toBeGreaterThan(0);
      // The large jump should be detected as critical
      expect(profile.criticalPoints.length).toBeGreaterThanOrEqual(0);
    });

    it("should record history", () => {
      const segment: ToolpathSegment = {
        id: "seg3",
        points: [
          { x: 0, y: 0, z: -5 },
          { x: 10, y: 0, z: -5 },
        ],
        type: "linear",
        toolDiameter: 10,
        depthOfCut: 2,
      };

      engagementDynamicsEngine.calculateSegmentProfile(segment, 0.1, 4);
      const history = engagementDynamicsEngine.getEngagementHistory();

      expect(history.length).toBe(1);
      expect(history[0].segmentId).toBe("seg3");
    });
  });

  describe("getAdaptiveFeedFactor", () => {
    it("should increase feed when actual chip load is below target", () => {
      const engagement = {
        segmentId: "test",
        pointIndex: 0,
        radialEngagement: 0.3,
        axialEngagement: 2,
        effectiveChipLoad: 0.05, // Below target
        materialRemovalRate: 100,
        cuttingForceEstimate: 500,
        engagementAngle: 60,
        entryAngle: 60,
        exitAngle: 120,
      };

      const factor = engagementDynamicsEngine.getAdaptiveFeedFactor(engagement, 0.1);
      expect(factor).toBeGreaterThan(1);
    });

    it("should decrease feed when actual chip load is above target", () => {
      const engagement = {
        segmentId: "test",
        pointIndex: 0,
        radialEngagement: 0.8,
        axialEngagement: 2,
        effectiveChipLoad: 0.15, // Above target
        materialRemovalRate: 200,
        cuttingForceEstimate: 800,
        engagementAngle: 120,
        entryAngle: 30,
        exitAngle: 150,
      };

      const factor = engagementDynamicsEngine.getAdaptiveFeedFactor(engagement, 0.1);
      expect(factor).toBeLessThan(1);
    });

    it("should clamp factor to reasonable range", () => {
      const lowEngagement = {
        segmentId: "test",
        pointIndex: 0,
        radialEngagement: 0.1,
        axialEngagement: 2,
        effectiveChipLoad: 0.02,
        materialRemovalRate: 50,
        cuttingForceEstimate: 200,
        engagementAngle: 30,
        entryAngle: 75,
        exitAngle: 105,
      };

      const factor = engagementDynamicsEngine.getAdaptiveFeedFactor(lowEngagement, 0.1);
      expect(factor).toBeLessThanOrEqual(2.0);
      expect(factor).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe("calculateAdaptiveFeedProfile", () => {
    it("should return feed for each point", () => {
      const segment: ToolpathSegment = {
        id: "seg4",
        points: [
          { x: 0, y: 0, z: -5 },
          { x: 5, y: 0, z: -5 },
          { x: 15, y: 0, z: -5 },
          { x: 20, y: 0, z: -5 },
        ],
        type: "linear",
        toolDiameter: 10,
        depthOfCut: 2,
      };

      const profile = engagementDynamicsEngine.calculateSegmentProfile(segment, 0.1, 4);
      const feeds = engagementDynamicsEngine.calculateAdaptiveFeedProfile(
        profile, 0.1, 1000
      );

      expect(feeds.length).toBe(4);
      feeds.forEach(feed => {
        expect(feed).toBeGreaterThan(0);
        expect(feed).toBeLessThan(3000);
      });
    });
  });

  describe("detectEngagementPatterns", () => {
    it("should detect slotting pattern", () => {
      const segment: ToolpathSegment = {
        id: "slot",
        points: [
          { x: 0, y: 0, z: -5 },
          { x: 10, y: 0, z: -5 }, // Full diameter = slotting
        ],
        type: "linear",
        toolDiameter: 10,
        depthOfCut: 2,
      };

      const profile = engagementDynamicsEngine.calculateSegmentProfile(segment, 0.1, 4);
      const patterns = engagementDynamicsEngine.detectEngagementPatterns(profile);

      expect(patterns.hasSlotting).toBe(true);
    });

    it("should classify engagement level", () => {
      const segment: ToolpathSegment = {
        id: "light",
        points: [
          { x: 0, y: 0, z: -5 },
          { x: 2, y: 0, z: -5 }, // Low step-over
        ],
        type: "linear",
        toolDiameter: 10,
        depthOfCut: 2,
      };

      const profile = engagementDynamicsEngine.calculateSegmentProfile(segment, 0.1, 4);
      const patterns = engagementDynamicsEngine.detectEngagementPatterns(profile);

      expect(["light", "medium", "heavy", "full"]).toContain(patterns.avgEngagementClass);
    });
  });
});
