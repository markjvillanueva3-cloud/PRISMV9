/**
 * AdaptiveFeedModulationEngine Tests
 *
 * Validates iMachining-style dynamic feed control.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  adaptiveFeedModulationEngine,
} from "../engines/AdaptiveFeedModulationEngine.js";
import { EngagementState, EngagementProfile } from "../engines/EngagementDynamicsEngine.js";

describe("AdaptiveFeedModulationEngine", () => {
  beforeEach(() => {
    adaptiveFeedModulationEngine.resetToolState("test_tool");
  });

  describe("updateToolState", () => {
    it("should store tool state", () => {
      adaptiveFeedModulationEngine.updateToolState({
        toolId: "tool1",
        currentWearPercent: 25,
        cuttingTimeMinutes: 30,
        materialRemoved: 5000,
      });

      const state = adaptiveFeedModulationEngine.getCumulativeToolState("tool1");
      expect(state).toBeDefined();
      expect(state!.currentWearPercent).toBe(25);
      expect(state!.cuttingTimeMinutes).toBe(30);
    });
  });

  describe("modulateFeed", () => {
    it("should reduce feed for high engagement slotting", () => {
      const engagement: EngagementState = {
        segmentId: "test",
        pointIndex: 0,
        radialEngagement: 0.95, // Nearly full slotting
        axialEngagement: 5,
        effectiveChipLoad: 0.15,
        materialRemovalRate: 500,
        cuttingForceEstimate: 1200,
        engagementAngle: 160, // Near 180 = slotting
        entryAngle: 10,
        exitAngle: 170,
      };

      const result = adaptiveFeedModulationEngine.modulateFeed(
        engagement,
        1000, // base feedrate
        "test_tool"
      );

      expect(result.modulationFactor).toBeLessThan(1);
      expect(result.modulatedFeedrate).toBeLessThan(1000);
      expect(result.constraints.some(c => c.includes("slotting"))).toBe(true);
    });

    it("should increase feed for low engagement peripheral cut", () => {
      const engagement: EngagementState = {
        segmentId: "test",
        pointIndex: 0,
        radialEngagement: 0.2,
        axialEngagement: 2,
        effectiveChipLoad: 0.05, // Low chip load
        materialRemovalRate: 100,
        cuttingForceEstimate: 300,
        engagementAngle: 40,
        entryAngle: 70,
        exitAngle: 110,
      };

      const result = adaptiveFeedModulationEngine.modulateFeed(
        engagement,
        1000,
        "test_tool",
        { targetChipLoad: 0.1 }
      );

      expect(result.modulationFactor).toBeGreaterThan(1);
      expect(result.reason).toContain("feed increase");
    });

    it("should apply wear compensation", () => {
      adaptiveFeedModulationEngine.updateToolState({
        toolId: "worn_tool",
        currentWearPercent: 80,
        cuttingTimeMinutes: 60,
        materialRemoved: 20000,
      });

      const engagement: EngagementState = {
        segmentId: "test",
        pointIndex: 0,
        radialEngagement: 0.5,
        axialEngagement: 2,
        effectiveChipLoad: 0.1,
        materialRemovalRate: 200,
        cuttingForceEstimate: 600,
        engagementAngle: 90,
        entryAngle: 45,
        exitAngle: 135,
      };

      const result = adaptiveFeedModulationEngine.modulateFeed(
        engagement,
        1000,
        "worn_tool",
        { wearCompensation: true }
      );

      expect(result.constraints.some(c => c.includes("wear"))).toBe(true);
      expect(result.modulationFactor).toBeLessThan(1);
    });

    it("should apply thermal compensation", () => {
      adaptiveFeedModulationEngine.updateToolState({
        toolId: "hot_tool",
        currentWearPercent: 20,
        cuttingTimeMinutes: 30,
        materialRemoved: 10000,
        lastCutTemperature: 600, // Hot tool
      });

      const engagement: EngagementState = {
        segmentId: "test",
        pointIndex: 0,
        radialEngagement: 0.5,
        axialEngagement: 2,
        effectiveChipLoad: 0.1,
        materialRemovalRate: 200,
        cuttingForceEstimate: 600,
        engagementAngle: 90,
        entryAngle: 45,
        exitAngle: 135,
      };

      const result = adaptiveFeedModulationEngine.modulateFeed(
        engagement,
        1000,
        "hot_tool",
        { thermalCompensation: true }
      );

      expect(result.constraints.some(c => c.includes("thermal"))).toBe(true);
    });

    it("should respect min/max feed factors", () => {
      const extremeLowEngagement: EngagementState = {
        segmentId: "test",
        pointIndex: 0,
        radialEngagement: 0.05,
        axialEngagement: 0.5,
        effectiveChipLoad: 0.01,
        materialRemovalRate: 10,
        cuttingForceEstimate: 50,
        engagementAngle: 15,
        entryAngle: 82,
        exitAngle: 97,
      };

      const result = adaptiveFeedModulationEngine.modulateFeed(
        extremeLowEngagement,
        1000,
        "test_tool",
        { targetChipLoad: 0.1, maxFeedFactor: 2.0, minFeedFactor: 0.3 }
      );

      expect(result.modulationFactor).toBeLessThanOrEqual(2.0);
      expect(result.modulationFactor).toBeGreaterThanOrEqual(0.3);
    });
  });

  describe("calculateSegmentFeedPlan", () => {
    it("should calculate feed plan with lookahead smoothing", () => {
      const profile: EngagementProfile = {
        segmentId: "plan_test",
        states: [
          { segmentId: "plan_test", pointIndex: 0, radialEngagement: 0.3, axialEngagement: 2, effectiveChipLoad: 0.08, materialRemovalRate: 100, cuttingForceEstimate: 400, engagementAngle: 60, entryAngle: 60, exitAngle: 120 },
          { segmentId: "plan_test", pointIndex: 1, radialEngagement: 0.4, axialEngagement: 2, effectiveChipLoad: 0.09, materialRemovalRate: 120, cuttingForceEstimate: 450, engagementAngle: 80, entryAngle: 50, exitAngle: 130 },
          { segmentId: "plan_test", pointIndex: 2, radialEngagement: 0.8, axialEngagement: 2, effectiveChipLoad: 0.12, materialRemovalRate: 200, cuttingForceEstimate: 700, engagementAngle: 120, entryAngle: 30, exitAngle: 150 },
          { segmentId: "plan_test", pointIndex: 3, radialEngagement: 0.5, axialEngagement: 2, effectiveChipLoad: 0.1, materialRemovalRate: 150, cuttingForceEstimate: 550, engagementAngle: 90, entryAngle: 45, exitAngle: 135 },
        ],
        peakEngagement: 0.8,
        avgEngagement: 0.5,
        engagementVariance: 0.04,
        criticalPoints: [2],
      };

      const plan = adaptiveFeedModulationEngine.calculateSegmentFeedPlan(
        profile,
        1000,
        "test_tool",
        { lookaheadPoints: 3, smoothingFactor: 0.7 }
      );

      expect(plan.segmentId).toBe("plan_test");
      expect(plan.modulatedFeeds.length).toBe(4);
      expect(plan.avgModulation).toBeGreaterThan(0);
      expect(plan.peakModulation).toBeGreaterThanOrEqual(plan.avgModulation);
      expect(plan.minModulation).toBeLessThanOrEqual(plan.avgModulation);
    });

    it("should apply pre-emptive reduction before engagement spike", () => {
      const profile: EngagementProfile = {
        segmentId: "spike_test",
        states: [
          { segmentId: "spike_test", pointIndex: 0, radialEngagement: 0.2, axialEngagement: 2, effectiveChipLoad: 0.06, materialRemovalRate: 80, cuttingForceEstimate: 300, engagementAngle: 40, entryAngle: 70, exitAngle: 110 },
          { segmentId: "spike_test", pointIndex: 1, radialEngagement: 0.2, axialEngagement: 2, effectiveChipLoad: 0.06, materialRemovalRate: 80, cuttingForceEstimate: 300, engagementAngle: 40, entryAngle: 70, exitAngle: 110 },
          { segmentId: "spike_test", pointIndex: 2, radialEngagement: 0.95, axialEngagement: 2, effectiveChipLoad: 0.14, materialRemovalRate: 250, cuttingForceEstimate: 900, engagementAngle: 160, entryAngle: 10, exitAngle: 170 },
        ],
        peakEngagement: 0.95,
        avgEngagement: 0.45,
        engagementVariance: 0.15,
        criticalPoints: [2],
      };

      const plan = adaptiveFeedModulationEngine.calculateSegmentFeedPlan(
        profile,
        1000,
        "test_tool",
        { lookaheadPoints: 3, smoothingFactor: 0.7 }
      );

      // Point 1 should be reduced in anticipation of point 2 spike
      const feed0 = plan.modulatedFeeds[0].modulatedFeedrate;
      const feed1 = plan.modulatedFeeds[1].modulatedFeedrate;

      // With lookahead, feed1 should be pre-emptively reduced
      expect(feed1).toBeLessThanOrEqual(feed0);
    });

    it("should estimate time reduction", () => {
      const profile: EngagementProfile = {
        segmentId: "time_test",
        states: [
          { segmentId: "time_test", pointIndex: 0, radialEngagement: 0.3, axialEngagement: 2, effectiveChipLoad: 0.08, materialRemovalRate: 100, cuttingForceEstimate: 400, engagementAngle: 60, entryAngle: 60, exitAngle: 120 },
          { segmentId: "time_test", pointIndex: 1, radialEngagement: 0.3, axialEngagement: 2, effectiveChipLoad: 0.08, materialRemovalRate: 100, cuttingForceEstimate: 400, engagementAngle: 60, entryAngle: 60, exitAngle: 120 },
        ],
        peakEngagement: 0.3,
        avgEngagement: 0.3,
        engagementVariance: 0,
        criticalPoints: [],
      };

      const plan = adaptiveFeedModulationEngine.calculateSegmentFeedPlan(
        profile,
        1000,
        "test_tool"
      );

      expect(plan.estimatedTimeReduction).toBeGreaterThanOrEqual(0);
    });
  });

  describe("generateModulatedGCode", () => {
    it("should generate feed commands", () => {
      const plan = {
        segmentId: "gcode_test",
        baseFeedrate: 1000,
        modulatedFeeds: [
          { originalFeedrate: 1000, modulatedFeedrate: 800, modulationFactor: 0.8, reason: "test", constraints: [] },
          { originalFeedrate: 1000, modulatedFeedrate: 800, modulationFactor: 0.8, reason: "test", constraints: [] },
          { originalFeedrate: 1000, modulatedFeedrate: 1200, modulationFactor: 1.2, reason: "test", constraints: [] },
        ],
        avgModulation: 0.93,
        peakModulation: 1.2,
        minModulation: 0.8,
        estimatedTimeReduction: 5,
      };

      const gcode = adaptiveFeedModulationEngine.generateModulatedGCode(plan);

      expect(gcode.length).toBeGreaterThan(0);
      expect(gcode.some(line => line.includes("F800"))).toBe(true);
      expect(gcode.some(line => line.includes("F1200"))).toBe(true);
    });

    it("should not repeat same feed value", () => {
      const plan = {
        segmentId: "repeat_test",
        baseFeedrate: 1000,
        modulatedFeeds: [
          { originalFeedrate: 1000, modulatedFeedrate: 800, modulationFactor: 0.8, reason: "test", constraints: [] },
          { originalFeedrate: 1000, modulatedFeedrate: 800, modulationFactor: 0.8, reason: "test", constraints: [] },
          { originalFeedrate: 1000, modulatedFeedrate: 800, modulationFactor: 0.8, reason: "test", constraints: [] },
        ],
        avgModulation: 0.8,
        peakModulation: 0.8,
        minModulation: 0.8,
        estimatedTimeReduction: 0,
      };

      const gcode = adaptiveFeedModulationEngine.generateModulatedGCode(plan);

      // Should only have one F800 command
      const f800Count = gcode.filter(line => line === "F800").length;
      expect(f800Count).toBe(1);
    });
  });

  describe("accumulateCutting", () => {
    it("should accumulate tool wear and cutting time", () => {
      adaptiveFeedModulationEngine.resetToolState("accum_tool");

      const profile: EngagementProfile = {
        segmentId: "accum_test",
        states: Array(10).fill(null).map((_, i) => ({
          segmentId: "accum_test",
          pointIndex: i,
          radialEngagement: 0.5,
          axialEngagement: 2,
          effectiveChipLoad: 0.1,
          materialRemovalRate: 150,
          cuttingForceEstimate: 500,
          engagementAngle: 90,
          entryAngle: 45,
          exitAngle: 135,
        })),
        peakEngagement: 0.5,
        avgEngagement: 0.5,
        engagementVariance: 0,
        criticalPoints: [],
      };

      const plan = adaptiveFeedModulationEngine.calculateSegmentFeedPlan(
        profile, 1000, "accum_tool"
      );

      adaptiveFeedModulationEngine.accumulateCutting("accum_tool", profile, plan);

      const state = adaptiveFeedModulationEngine.getCumulativeToolState("accum_tool");
      expect(state).toBeDefined();
      expect(state!.cuttingTimeMinutes).toBeGreaterThan(0);
      expect(state!.currentWearPercent).toBeGreaterThan(0);
    });
  });
});
