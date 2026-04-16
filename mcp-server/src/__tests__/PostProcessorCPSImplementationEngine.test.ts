/**
 * PostProcessorCPSImplementationEngine Tests
 * ===========================================
 */

import { describe, it, expect } from "vitest";
import {
  postProcessorCPSImplementationEngine,
  PRISM_ENHANCED_CPS_FILES,
  PRISM_ROUGHING_FEATURES,
  CONTROLLER_IMPLEMENTATIONS,
  OKUMA_CYCLE_TIME_MCODES
} from "../engines/PostProcessorCPSImplementationEngine.js";

describe("PostProcessorCPSImplementationEngine", () => {
  describe("Statistics", () => {
    it("should return engine statistics", () => {
      const stats = postProcessorCPSImplementationEngine.getStatistics();

      expect(stats.version).toBe("1.0.0");
      expect(stats.cpsFiles).toBe(3);
      expect(stats.roughingFeatures).toBe(7);
      expect(stats.controllerImplementations).toBeGreaterThan(2);
      expect(stats.totalGCodes).toBeGreaterThan(10);
    });
  });

  describe("PRISM-Enhanced CPS Files", () => {
    it("should have Hurco VM30i PRISM", () => {
      const hurco = postProcessorCPSImplementationEngine.getCPSFile("hurco-vm30i-prism");
      expect(hurco).toBeDefined();
      expect(hurco?.machine).toBe("Hurco VM30i");
    });

    it("should have Hurco drill fix variant", () => {
      const drillfix = postProcessorCPSImplementationEngine.getCPSFile("hurco-vm30i-prism-drillfix");
      expect(drillfix).toBeDefined();
      expect(drillfix?.enhancements.some(e => e.includes("Drilling"))).toBe(true);
    });

    it("should have Okuma Multus", () => {
      const okuma = postProcessorCPSImplementationEngine.getCPSFile("okuma-multus-b250iiw");
      expect(okuma).toBeDefined();
      expect(okuma?.controller).toBe("OSP-P300SA");
    });

    it("should find CPS files by manufacturer", () => {
      const hurcoFiles = postProcessorCPSImplementationEngine.findCPSForMachine("Hurco");
      expect(hurcoFiles.length).toBeGreaterThan(0);

      const okumaFiles = postProcessorCPSImplementationEngine.findCPSForMachine("Okuma");
      expect(okumaFiles.length).toBeGreaterThan(0);
    });

    it("should have version bug fix history for Okuma", () => {
      const okuma = postProcessorCPSImplementationEngine.getCPSFile("okuma-multus-b250iiw");
      expect(okuma?.bugFixes).toBeDefined();
      expect(okuma?.bugFixes?.length).toBeGreaterThan(0);
      expect(okuma?.bugFixes?.some(f => f.description.includes("4308-01"))).toBe(true);
    });

    it("should have enhancements list for all files", () => {
      for (const file of PRISM_ENHANCED_CPS_FILES) {
        expect(file.enhancements.length).toBeGreaterThan(0);
        expect(file.machine).toBeDefined();
        expect(file.controller).toBeDefined();
      }
    });
  });

  describe("PRISM Roughing Features", () => {
    it("should have all 7 features", () => {
      expect(PRISM_ROUGHING_FEATURES.length).toBe(7);
    });

    it("should have dynamic depth feed", () => {
      const f = postProcessorCPSImplementationEngine.getRoughingFeature("dynamic-depth-feed");
      expect(f).toBeDefined();
      expect(f?.benefitPct).toBeGreaterThan(0);
    });

    it("should have chip thinning compensation", () => {
      const f = postProcessorCPSImplementationEngine.getRoughingFeature("chip-thinning-compensation");
      expect(f).toBeDefined();
      expect(f?.physicsBasis).toContain("Sarin");
    });

    it("should have corner deceleration", () => {
      const f = postProcessorCPSImplementationEngine.getRoughingFeature("corner-decel");
      expect(f?.physicsBasis).toContain("Centripetal");
    });

    it("should have 8-level aggressiveness", () => {
      const f = postProcessorCPSImplementationEngine.getRoughingFeature("aggressiveness-8-level");
      expect(f?.benefitPct).toBeGreaterThanOrEqual(30);
    });

    it("should have stickout deflection", () => {
      const f = postProcessorCPSImplementationEngine.getRoughingFeature("stickout-deflection");
      expect(f?.physicsBasis).toContain("FL");
    });

    it("should filter features by category", () => {
      const feedControl = postProcessorCPSImplementationEngine.getRoughingFeaturesByCategory("feed-control");
      expect(feedControl.length).toBeGreaterThan(2);

      const motion = postProcessorCPSImplementationEngine.getRoughingFeaturesByCategory("motion-control");
      expect(motion.length).toBeGreaterThan(0);

      const accuracy = postProcessorCPSImplementationEngine.getRoughingFeaturesByCategory("accuracy");
      expect(accuracy.length).toBeGreaterThan(0);
    });

    it("should calculate combined benefit with diminishing returns", () => {
      const result = postProcessorCPSImplementationEngine.calculateCombinedBenefit([
        "dynamic-depth-feed",
        "chip-thinning-compensation",
        "corner-decel"
      ]);

      expect(result.features.length).toBe(3);
      expect(result.combinedBenefitPct).toBeGreaterThan(0);
      expect(result.individualBenefits.length).toBe(3);

      // Each subsequent feature contributes less than the first (diminishing)
      // Check that without diminishing returns, combined would be higher
      const withoutDiminishing = result.individualBenefits.reduce(
        (prod, b) => prod * (1 + b / 100), 1
      ) - 1;
      const withoutDiminishingPct = withoutDiminishing * 100;
      expect(result.combinedBenefitPct).toBeLessThan(withoutDiminishingPct);
    });
  });

  describe("Controller Implementations", () => {
    it("should have Hurco WinMAX", () => {
      const hurco = postProcessorCPSImplementationEngine.getControllerImplementation("hurco-winmax");
      expect(hurco).toBeDefined();
      expect(hurco?.gcodes.length).toBeGreaterThan(3);
    });

    it("should have Okuma OSP-P300SA", () => {
      const okuma = postProcessorCPSImplementationEngine.getControllerImplementation("okuma-osp-p300sa");
      expect(okuma).toBeDefined();
      expect(okuma?.gcodes.some(g => g.code === "G131")).toBe(true);
      expect(okuma?.gcodes.some(g => g.code === "G132")).toBe(true);
    });

    it("should have Okuma OSP-P300L (lathe)", () => {
      const lathe = postProcessorCPSImplementationEngine.getControllerImplementation("okuma-osp-p300l");
      expect(lathe).toBeDefined();
      expect(lathe?.gcodes.some(g => g.code === "G85")).toBe(true);
      expect(lathe?.gcodes.some(g => g.code === "G76")).toBe(true);
    });

    it("should find controller by manufacturer", () => {
      const hurco = postProcessorCPSImplementationEngine.findController("Hurco");
      expect(hurco).toBeDefined();

      const okuma = postProcessorCPSImplementationEngine.findController("Okuma");
      expect(okuma).toBeDefined();
    });

    it("should get G-code details", () => {
      const g131 = postProcessorCPSImplementationEngine.getGCodeDetails("okuma-osp-p300sa", "G131");
      expect(g131?.name).toContain("Super NURBS");

      const g05 = postProcessorCPSImplementationEngine.getGCodeDetails("hurco-winmax", "G05.3");
      expect(g05?.name).toContain("Smoothing");
    });

    it("should have best practices for each controller", () => {
      for (const impl of CONTROLLER_IMPLEMENTATIONS) {
        expect(impl.bestPractices.length).toBeGreaterThan(2);
      }
    });

    it("should get issue solutions", () => {
      const chatterIssues = postProcessorCPSImplementationEngine.getIssueSolutions("hurco-winmax", "chatter");
      expect(chatterIssues.length).toBeGreaterThan(0);

      const alarmIssues = postProcessorCPSImplementationEngine.getIssueSolutions("okuma-osp-p300sa", "alarm");
      expect(alarmIssues.length).toBeGreaterThan(0);
    });
  });

  describe("Okuma Cycle Time M-Codes", () => {
    it("should have all cycle time M-codes", () => {
      expect(OKUMA_CYCLE_TIME_MCODES.length).toBeGreaterThan(5);
    });

    it("should include M63 (ignore spindle answer)", () => {
      const m63 = OKUMA_CYCLE_TIME_MCODES.find(m => m.code === "M63");
      expect(m63).toBeDefined();
      expect(m63?.timeSaving_sec).toBeGreaterThan(0);
    });

    it("should include M141 (skip C-axis clamp)", () => {
      const m141 = OKUMA_CYCLE_TIME_MCODES.find(m => m.code === "M141");
      expect(m141).toBeDefined();
      expect(m141?.warnings).toBeDefined();
    });

    it("should filter by risk level", () => {
      const low = postProcessorCPSImplementationEngine.getOkumaMCodesByRisk("low");
      const medium = postProcessorCPSImplementationEngine.getOkumaMCodesByRisk("medium");

      expect(low.length).toBeGreaterThan(0);
      expect(medium.length).toBeGreaterThan(0);
    });

    it("should calculate time savings", () => {
      const result = postProcessorCPSImplementationEngine.calculateOkumaTimeSavings(["M63", "M61", "M64"]);

      expect(result.applied.length).toBe(3);
      expect(result.total_sec).toBeGreaterThan(0);
    });

    it("should collect warnings for risky M-codes", () => {
      const result = postProcessorCPSImplementationEngine.calculateOkumaTimeSavings(["M65", "M141"]);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("Feature Recommendations", () => {
    it("should recommend features for roughing", () => {
      const recs = postProcessorCPSImplementationEngine.recommendFeatures({
        operationType: "roughing",
        material: "steel",
        machineType: "VMC",
        priorityCycleTime: true,
        priorityToolLife: false,
        priorityFinish: false
      });

      expect(recs.length).toBeGreaterThan(0);
    });

    it("should recommend accuracy features for finishing", () => {
      const recs = postProcessorCPSImplementationEngine.recommendFeatures({
        operationType: "finishing",
        material: "tool steel",
        machineType: "VMC",
        priorityCycleTime: false,
        priorityToolLife: false,
        priorityFinish: true
      });

      expect(recs.length).toBeGreaterThan(0);
    });

    it("should prioritize tool life when requested", () => {
      const recs = postProcessorCPSImplementationEngine.recommendFeatures({
        operationType: "roughing",
        material: "titanium",
        machineType: "VMC",
        priorityCycleTime: false,
        priorityToolLife: true,
        priorityFinish: false
      });

      expect(recs.every(r => r.category !== "cycle-time")).toBe(true);
    });
  });

  describe("Production Lessons", () => {
    it("should collect production lessons from version history", () => {
      const lessons = postProcessorCPSImplementationEngine.getProductionLessons();
      expect(lessons.length).toBeGreaterThan(0);
    });

    it("should include Okuma bug fix lessons", () => {
      const lessons = postProcessorCPSImplementationEngine.getProductionLessons();
      expect(lessons.some(l => l.lesson.includes("4308-01"))).toBe(true);
    });
  });

  describe("AI Context", () => {
    it("should generate AI context", () => {
      const context = postProcessorCPSImplementationEngine.getContextForAI();

      expect(context).toContain("CPS IMPLEMENTATION ENGINE");
      expect(context).toContain("PRISM ROUGHING TECHNOLOGY");
      expect(context).toContain("CONTROLLER IMPLEMENTATIONS");
      expect(context).toContain("API METHODS");
    });
  });

  describe("Edge Cases", () => {
    it("should handle unknown CPS file", () => {
      expect(postProcessorCPSImplementationEngine.getCPSFile("unknown")).toBeUndefined();
    });

    it("should handle unknown controller", () => {
      expect(postProcessorCPSImplementationEngine.findController("fake-brand-xyz")).toBeUndefined();
    });

    it("should handle unknown G-code", () => {
      expect(postProcessorCPSImplementationEngine.getGCodeDetails("hurco-winmax", "G999")).toBeUndefined();
    });

    it("should handle empty M-code list", () => {
      const result = postProcessorCPSImplementationEngine.calculateOkumaTimeSavings([]);
      expect(result.total_sec).toBe(0);
      expect(result.applied).toEqual([]);
    });
  });
});
