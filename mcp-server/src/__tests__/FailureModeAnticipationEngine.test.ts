/**
 * FailureModeAnticipationEngine Tests
 *
 * Validates predictive failure analysis for machining operations.
 */

import { describe, it, expect } from "vitest";
import {
  failureModeAnticipationEngine,
  FailureMode,
} from "../engines/FailureModeAnticipationEngine.js";

describe("FailureModeAnticipationEngine", () => {
  describe("getFailureModes", () => {
    it("should return all failure modes", () => {
      const modes = failureModeAnticipationEngine.getFailureModes();
      expect(modes.length).toBeGreaterThan(10);
    });

    it("should cover all categories", () => {
      const modes = failureModeAnticipationEngine.getFailureModes();
      const categories = new Set(modes.map(m => m.category));

      expect(categories.has("tool")).toBe(true);
      expect(categories.has("part")).toBe(true);
      expect(categories.has("machine")).toBe(true);
      expect(categories.has("process")).toBe(true);
      expect(categories.has("fixture")).toBe(true);
    });

    it("should have complete failure mode definitions", () => {
      const modes = failureModeAnticipationEngine.getFailureModes();

      for (const mode of modes) {
        expect(mode.id).toBeTruthy();
        expect(mode.name).toBeTruthy();
        expect(mode.description).toBeTruthy();
        expect(mode.rootCauses.length).toBeGreaterThan(0);
        expect(mode.preventionStrategies.length).toBeGreaterThan(0);
        expect(mode.recoveryActions.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getFailureMode", () => {
    it("should return specific failure mode by ID", () => {
      const mode = failureModeAnticipationEngine.getFailureMode("tool_breakage");
      expect(mode).toBeDefined();
      expect(mode!.name).toBe("Catastrophic Tool Breakage");
      expect(mode!.severity).toBe("critical");
    });

    it("should return undefined for unknown ID", () => {
      const mode = failureModeAnticipationEngine.getFailureMode("unknown_mode");
      expect(mode).toBeUndefined();
    });
  });

  describe("analyzeFailureRisk", () => {
    it("should return low risk for nominal conditions", () => {
      const risk = failureModeAnticipationEngine.analyzeFailureRisk({
        toolWearPercent: 20,
        toolOverhangRatio: 3,
        toolGradeMatch: 0.9,
        cuttingForce: 500,
        spindleLoad: 50,
        vibrationLevel: 0.5,
        temperature: 35,
        clampingForce: 5000,
        cuttingForceRequired: 1000,
        fixtureRigidity: 0.9,
        machineHours: 3000,
        spindleCondition: 90,
        lastMaintenance: 50,
        materialHardness: 35,
        materialAbrasivity: 0.3,
        engagementPercent: 0.5,
        depthOfCut: 2,
        programVerified: true,
      });

      expect(risk.overallRisk).toBeLessThan(0.5);
      // Low risk should have few or no predictions with high probability
      const highRiskPredictions = risk.predictions.filter(p => p.probability > 0.5);
      expect(highRiskPredictions.length).toBeLessThan(3);
    });

    it("should detect high tool breakage risk with worn tool and high load", () => {
      const risk = failureModeAnticipationEngine.analyzeFailureRisk({
        toolWearPercent: 85,
        toolOverhangRatio: 6,
        toolGradeMatch: 0.5,
        cuttingForce: 1500,
        spindleLoad: 95,
        vibrationLevel: 3.5,
        temperature: 60,
        clampingForce: 5000,
        cuttingForceRequired: 1000,
        fixtureRigidity: 0.8,
        machineHours: 8000,
        spindleCondition: 70,
        lastMaintenance: 200,
        materialHardness: 50,
        materialAbrasivity: 0.6,
        engagementPercent: 0.7,
        depthOfCut: 5,
        programVerified: true,
      });

      expect(risk.overallRisk).toBeGreaterThan(0.5);
      const breakageRisk = risk.predictions.find(p => p.mode.id === "tool_breakage");
      expect(breakageRisk).toBeDefined();
      expect(breakageRisk!.probability).toBeGreaterThan(0.3);
      expect(breakageRisk!.currentStatus).not.toBe("nominal");
    });

    it("should detect chatter risk with high vibration", () => {
      const risk = failureModeAnticipationEngine.analyzeFailureRisk({
        toolWearPercent: 20,
        toolOverhangRatio: 5,
        toolGradeMatch: 0.9,
        cuttingForce: 600,
        spindleLoad: 60,
        vibrationLevel: 2.5, // High vibration
        temperature: 40,
        clampingForce: 5000,
        cuttingForceRequired: 800,
        fixtureRigidity: 0.85,
        machineHours: 4000,
        spindleCondition: 85,
        lastMaintenance: 100,
        materialHardness: 35,
        materialAbrasivity: 0.3,
        engagementPercent: 0.6,
        depthOfCut: 4,
        programVerified: true,
      });

      const chatterRisk = risk.predictions.find(p => p.mode.id === "chatter_instability");
      expect(chatterRisk).toBeDefined();
      expect(chatterRisk!.probability).toBeGreaterThan(0.3);
    });

    it("should detect part slip risk with marginal clamping", () => {
      const risk = failureModeAnticipationEngine.analyzeFailureRisk({
        toolWearPercent: 20,
        toolOverhangRatio: 3,
        toolGradeMatch: 0.9,
        cuttingForce: 500,
        spindleLoad: 50,
        vibrationLevel: 0.5,
        temperature: 35,
        clampingForce: 2000, // Low clamping
        cuttingForceRequired: 1500, // High required force
        fixtureRigidity: 0.7,
        machineHours: 3000,
        spindleCondition: 90,
        lastMaintenance: 50,
        materialHardness: 35,
        materialAbrasivity: 0.3,
        engagementPercent: 0.5,
        depthOfCut: 2,
        programVerified: true,
      });

      const slipRisk = risk.predictions.find(p => p.mode.id === "part_slip");
      expect(slipRisk).toBeDefined();
      expect(slipRisk!.probability).toBeGreaterThan(0.3);
    });

    it("should detect spindle bearing damage risk with worn spindle", () => {
      const risk = failureModeAnticipationEngine.analyzeFailureRisk({
        toolWearPercent: 20,
        toolOverhangRatio: 3,
        toolGradeMatch: 0.9,
        cuttingForce: 500,
        spindleLoad: 50,
        vibrationLevel: 0.5,
        temperature: 35,
        clampingForce: 5000,
        cuttingForceRequired: 800,
        fixtureRigidity: 0.9,
        machineHours: 15000, // High hours
        spindleCondition: 50, // Poor condition
        lastMaintenance: 500,
        materialHardness: 35,
        materialAbrasivity: 0.3,
        engagementPercent: 0.5,
        depthOfCut: 2,
        programVerified: true,
      });

      const bearingRisk = risk.predictions.find(p => p.mode.id === "spindle_bearing_damage");
      expect(bearingRisk).toBeDefined();
      expect(bearingRisk!.probability).toBeGreaterThan(0.1);
    });

    it("should provide immediate actions for high-risk conditions", () => {
      const risk = failureModeAnticipationEngine.analyzeFailureRisk({
        toolWearPercent: 90,
        toolOverhangRatio: 6,
        toolGradeMatch: 0.4,
        cuttingForce: 2000,
        spindleLoad: 98,
        vibrationLevel: 4.0,
        temperature: 70,
        clampingForce: 1500,
        cuttingForceRequired: 2000,
        fixtureRigidity: 0.5,
        machineHours: 10000,
        spindleCondition: 60,
        lastMaintenance: 300,
        materialHardness: 55,
        materialAbrasivity: 0.8,
        engagementPercent: 0.9,
        depthOfCut: 8,
        programVerified: false,
      });

      expect(risk.immediateActions.length).toBeGreaterThan(0);
      // High risk conditions should have elevated overall risk
      expect(risk.overallRisk).toBeGreaterThan(0.3);
    });

    it("should calculate safe operating window", () => {
      const risk = failureModeAnticipationEngine.analyzeFailureRisk({
        toolWearPercent: 50,
        toolOverhangRatio: 4,
        toolGradeMatch: 0.7,
        cuttingForce: 800,
        spindleLoad: 70,
        vibrationLevel: 1.5,
        temperature: 45,
        clampingForce: 4000,
        cuttingForceRequired: 1200,
        fixtureRigidity: 0.8,
        machineHours: 5000,
        spindleCondition: 75,
        lastMaintenance: 150,
        materialHardness: 40,
        materialAbrasivity: 0.5,
        engagementPercent: 0.6,
        depthOfCut: 3,
        programVerified: true,
      });

      expect(risk.safeOperatingWindow.maxCuttingSpeed).toBeLessThanOrEqual(100);
      expect(risk.safeOperatingWindow.maxFeedRate).toBeLessThanOrEqual(100);
      expect(risk.safeOperatingWindow.maxDepthOfCut).toBeLessThanOrEqual(100);
      expect(risk.safeOperatingWindow.maxSpindleLoad).toBeLessThanOrEqual(100);
    });

    it("should provide monitoring priorities", () => {
      const risk = failureModeAnticipationEngine.analyzeFailureRisk({
        toolWearPercent: 40,
        toolOverhangRatio: 4,
        toolGradeMatch: 0.8,
        cuttingForce: 700,
        spindleLoad: 65,
        vibrationLevel: 1.2,
        temperature: 42,
        clampingForce: 4500,
        cuttingForceRequired: 1000,
        fixtureRigidity: 0.85,
        machineHours: 4000,
        spindleCondition: 80,
        lastMaintenance: 120,
        materialHardness: 38,
        materialAbrasivity: 0.4,
        engagementPercent: 0.55,
        depthOfCut: 2.5,
        programVerified: true,
      });

      expect(risk.monitoringPriorities.length).toBeGreaterThan(0);
    });
  });

  describe("getCascadeChain", () => {
    it("should return cascade chain for tool breakage", () => {
      const chain = failureModeAnticipationEngine.getCascadeChain("tool_breakage");

      expect(chain).toContain("tool_breakage");
      expect(chain).toContain("part_scrap");
      // Machine damage should also be in chain
    });

    it("should handle non-existent failure", () => {
      const chain = failureModeAnticipationEngine.getCascadeChain("unknown");
      expect(chain).toContain("unknown");
    });

    it("should not have circular references", () => {
      const chain = failureModeAnticipationEngine.getCascadeChain("part_slip");
      const uniqueChain = new Set(chain);
      expect(uniqueChain.size).toBe(chain.length);
    });
  });

  describe("failure mode definitions", () => {
    it("should have catastrophic severity for part ejection", () => {
      const mode = failureModeAnticipationEngine.getFailureMode("part_ejection");
      expect(mode).toBeDefined();
      expect(mode!.severity).toBe("catastrophic");
    });

    it("should have correct cascade risks for chatter", () => {
      const mode = failureModeAnticipationEngine.getFailureMode("chatter_instability");
      expect(mode).toBeDefined();
      expect(mode!.cascadeRisk).toContain("tool_chipping");
      expect(mode!.cascadeRisk).toContain("surface_defects");
    });

    it("should have time to failure for gradual failures", () => {
      const mode = failureModeAnticipationEngine.getFailureMode("rapid_flank_wear");
      expect(mode).toBeDefined();
      expect(mode!.typicalTimeToFailure).toBeGreaterThan(1);
    });

    it("should have near-zero time to failure for sudden failures", () => {
      const mode = failureModeAnticipationEngine.getFailureMode("machine_crash");
      expect(mode).toBeDefined();
      expect(mode!.typicalTimeToFailure).toBeLessThan(1);
    });
  });
});
