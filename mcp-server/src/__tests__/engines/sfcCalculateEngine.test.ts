/**
 * SFCCalculateEngine Tests — Surface Finish Calculation
 * ======================================================
 * @module __tests__/engines/sfcCalculateEngine.test.ts
 */

import { describe, it, expect, vi } from "vitest";
import { SFCCalculateEngine, type SFCInput } from "../../engines/SFCCalculateEngine.js";

// Mock the captureSFC middleware to avoid side effects
vi.mock("../../middleware/sfcOutcomeWire.js", () => ({
  captureSFC: vi.fn(),
}));

describe("SFCCalculateEngine", () => {
  const baseInput: SFCInput = {
    operation: "turning",
    feedRate: 0.2,
    toolNoseRadius: 0.8,
    cuttingSpeed: 200,
    depthOfCut: 2,
    material: "steel",
    toolCondition: "good",
    coolant: "flood",
    vibrationLevel: 0,
  };

  describe("calculate() — turning operation", () => {
    it("calculates theoretical Ra for turning using f²/32r formula", () => {
      const result = SFCCalculateEngine.calculate(baseInput);
      // Ra = f² / (32 * r) * 1000 = 0.2² / (32 * 0.8) * 1000 = 1.5625 µm
      expect(result.theoreticalRa).toBeCloseTo(1.563, 2);
      expect(result.predictedRa).toBeCloseTo(1.563, 2); // steel=1.0, good=1.0, flood=1.0, vib=1.0
    });

    it("returns Rz as approximately 4.5x Ra", () => {
      const result = SFCCalculateEngine.calculate(baseInput);
      expect(result.theoreticalRz).toBeCloseTo(result.theoreticalRa * 4.5, 1);
      expect(result.predictedRz).toBeCloseTo(result.predictedRa * 4.5, 1);
    });

    it("returns Rt as approximately 6x Ra", () => {
      const result = SFCCalculateEngine.calculate(baseInput);
      expect(result.theoreticalRt).toBeCloseTo(result.theoreticalRa * 6, 1);
      expect(result.predictedRt).toBeCloseTo(result.predictedRa * 6, 1);
    });
  });

  describe("calculate() — milling operation", () => {
    it("calculates theoretical Ra for milling based on feed per tooth", () => {
      const millingInput: SFCInput = {
        ...baseInput,
        operation: "milling",
        toolDiameter: 12,
        fluteCount: 4,
        feedRate: 0.4, // total feed, fz = 0.1
      };
      const result = SFCCalculateEngine.calculate(millingInput);
      // fz = 0.4/4 = 0.1, Ra = fz² / (32 * r) * 1000 where r = D/2 = 6
      // Ra = 0.01 / (32 * 6) * 1000 = 0.052 µm
      expect(result.theoreticalRa).toBeCloseTo(0.052, 2);
      expect(result.qualityGrade).toBe("N3");
    });

    it("uses default diameter=12 and fluteCount=4 when not provided", () => {
      const input: SFCInput = {
        ...baseInput,
        operation: "milling",
      };
      const result = SFCCalculateEngine.calculate(input);
      // fz = 0.2/4 = 0.05, Ra = 0.0025 / 192 * 1000 = 0.013
      expect(result.theoreticalRa).toBeCloseTo(0.013, 2);
    });
  });

  describe("calculate() — grinding operation", () => {
    it("calculates grinding Ra based on depth of cut", () => {
      const grindingInput: SFCInput = {
        ...baseInput,
        operation: "grinding",
        depthOfCut: 0.01,
      };
      const result = SFCCalculateEngine.calculate(grindingInput);
      // Grinding Ra = 0.2 + depthOfCut * 0.1 = 0.201
      expect(result.theoreticalRa).toBeCloseTo(0.201, 2);
    });

    it("achieves fine surface finish grades for shallow grinding", () => {
      const result = SFCCalculateEngine.calculate({
        ...baseInput,
        operation: "grinding",
        depthOfCut: 0.005,
      });
      // Ra = 0.2 + 0.005 * 0.1 = 0.2005 → N4 (maxRa=0.2) or N5
      expect(result.qualityGrade).toBe("N5");
    });
  });

  describe("calculate() — boring operation", () => {
    it("calculates boring using same formula as turning", () => {
      const boringInput: SFCInput = {
        ...baseInput,
        operation: "boring",
      };
      const turningResult = SFCCalculateEngine.calculate(baseInput);
      const boringResult = SFCCalculateEngine.calculate(boringInput);
      expect(boringResult.theoreticalRa).toEqual(turningResult.theoreticalRa);
    });
  });

  describe("calculate() — drilling operation", () => {
    it("calculates drilling Ra proportional to feed rate", () => {
      const drillingInput: SFCInput = {
        ...baseInput,
        operation: "drilling",
        feedRate: 0.15,
      };
      const result = SFCCalculateEngine.calculate(drillingInput);
      // Ra = feedRate * 5 = 0.75
      expect(result.theoreticalRa).toBeCloseTo(0.75, 2);
    });
  });

  describe("adjustment factors", () => {
    it("applies tool wear factor: new=0.9, worn=1.3", () => {
      const newTool = SFCCalculateEngine.calculate({ ...baseInput, toolCondition: "new" });
      const wornTool = SFCCalculateEngine.calculate({ ...baseInput, toolCondition: "worn" });
      expect(newTool.adjustmentFactors.toolWear).toBe(0.9);
      expect(wornTool.adjustmentFactors.toolWear).toBe(1.3);
      expect(wornTool.predictedRa / newTool.predictedRa).toBeCloseTo(1.3 / 0.9, 1);
    });

    it("applies material factor: aluminum=0.85, titanium=1.25", () => {
      const aluminum = SFCCalculateEngine.calculate({ ...baseInput, material: "aluminum" });
      const titanium = SFCCalculateEngine.calculate({ ...baseInput, material: "titanium" });
      expect(aluminum.adjustmentFactors.material).toBe(0.85);
      expect(titanium.adjustmentFactors.material).toBe(1.25);
    });

    it("applies coolant factor: flood=1.0, none=1.3", () => {
      const flood = SFCCalculateEngine.calculate({ ...baseInput, coolant: "flood" });
      const none = SFCCalculateEngine.calculate({ ...baseInput, coolant: "none" });
      expect(flood.adjustmentFactors.coolant).toBe(1.0);
      expect(none.adjustmentFactors.coolant).toBe(1.3);
    });

    it("applies vibration factor: level 0=1.0, level 5=1.5", () => {
      const noVibration = SFCCalculateEngine.calculate({ ...baseInput, vibrationLevel: 0 });
      const highVibration = SFCCalculateEngine.calculate({ ...baseInput, vibrationLevel: 5 });
      expect(noVibration.adjustmentFactors.vibration).toBe(1.0);
      expect(highVibration.adjustmentFactors.vibration).toBe(1.5);
    });
  });

  describe("quality grade determination", () => {
    it("returns N7 for Ra=1.563 µm (within 0.8-1.6 range)", () => {
      const result = SFCCalculateEngine.calculate(baseInput);
      expect(result.qualityGrade).toBe("N7");
    });

    it("returns N4 for grinding with Ra around 0.2 µm", () => {
      const result = SFCCalculateEngine.calculate({
        ...baseInput,
        operation: "grinding",
        depthOfCut: 0.001,
        toolCondition: "new",
        material: "aluminum",
      });
      // Ra = 0.2001 * 0.9 * 0.85 = 0.153 → N4 (maxRa=0.2)
      expect(result.qualityGrade).toBe("N4");
    });
  });

  describe("recommendations", () => {
    it("recommends reducing feed when predicted Ra > 3.2", () => {
      const result = SFCCalculateEngine.calculate({
        ...baseInput,
        feedRate: 0.5,
        toolCondition: "worn",
      });
      expect(result.recommendations.some(r => r.includes("feed rate"))).toBe(true);
    });

    it("recommends tool change for worn/critical tools", () => {
      const result = SFCCalculateEngine.calculate({
        ...baseInput,
        toolCondition: "critical",
      });
      expect(result.recommendations.some(r => r.includes("Tool change"))).toBe(true);
    });

    it("warns about high vibration level > 3", () => {
      const result = SFCCalculateEngine.calculate({
        ...baseInput,
        vibrationLevel: 5,
      });
      expect(result.recommendations.some(r => r.includes("vibration"))).toBe(true);
    });

    it("recommends coolant when missing for non-cast-iron", () => {
      const result = SFCCalculateEngine.calculate({
        ...baseInput,
        coolant: "none",
      });
      expect(result.recommendations.some(r => r.includes("coolant"))).toBe(true);
    });
  });

  describe("confidence calculation", () => {
    it("returns base confidence 0.7 for minimal input", () => {
      const minimal = SFCCalculateEngine.calculate({
        operation: "turning",
        feedRate: 0.2,
        cuttingSpeed: 200,
        depthOfCut: 2,
        material: "steel",
      });
      expect(minimal.confidence).toBe(0.7);
    });

    it("increases confidence by 0.1 when toolNoseRadius provided", () => {
      const withRadius = SFCCalculateEngine.calculate({
        operation: "turning",
        feedRate: 0.2,
        cuttingSpeed: 200,
        depthOfCut: 2,
        material: "steel",
        toolNoseRadius: 0.8,
      });
      expect(withRadius.confidence).toBe(0.8);
    });

    it("caps confidence at 1.0", () => {
      const result = SFCCalculateEngine.calculate({
        ...baseInput,
        vibrationLevel: 3,
        toolCondition: "worn",
      });
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe("calculateFeedForTarget()", () => {
    it("calculates feed for target Ra=1.6 in turning with r=0.8", () => {
      const targetRa = 1.6; // µm
      const feed = SFCCalculateEngine.calculateFeedForTarget(targetRa, "turning", 0.8);
      // Verify: Ra = f² / (32 * r) * 1000 → f = sqrt(Ra * 32 * r / 1000)
      // f = sqrt(1.6 * 32 * 0.8 / 1000) = sqrt(0.04096) = 0.2024
      expect(feed).toBeCloseTo(0.202, 2);
    });

    it("calculates feed for target Ra in milling", () => {
      const targetRa = 3.2;
      const feed = SFCCalculateEngine.calculateFeedForTarget(targetRa, "milling", undefined, 12);
      // f = sqrt(Ra * 32 * (D/2) / 1000) = sqrt(3.2 * 32 * 6 / 1000) = sqrt(0.6144) = 0.784
      expect(feed).toBeCloseTo(0.784, 2);
    });

    it("calculates depth for target Ra in grinding", () => {
      const targetRa = 0.4;
      const depth = SFCCalculateEngine.calculateFeedForTarget(targetRa, "grinding");
      // depth = (Ra - 0.2) / 0.1 = 2
      expect(depth).toBeCloseTo(2, 2);
    });

    it("calculates feed for target Ra in drilling", () => {
      const targetRa = 2.5;
      const feed = SFCCalculateEngine.calculateFeedForTarget(targetRa, "drilling");
      // feed = Ra / 5 = 0.5
      expect(feed).toBeCloseTo(0.5, 2);
    });
  });

  describe("getSelfAwareness()", () => {
    it("returns engine name and version", () => {
      const awareness = SFCCalculateEngine.getSelfAwareness();
      expect(awareness.name).toBe("SFCCalculateEngine");
      expect(awareness.version).toBe("1.0.0");
    });

    it("lists calculate and calculateFeedForTarget capabilities", () => {
      const awareness = SFCCalculateEngine.getSelfAwareness();
      expect(awareness.capabilities).toContain("calculate");
      expect(awareness.capabilities).toContain("calculateFeedForTarget");
    });

    it("lists all five supported operations", () => {
      const awareness = SFCCalculateEngine.getSelfAwareness();
      expect(awareness.operations).toEqual(["turning", "milling", "grinding", "boring", "drilling"]);
    });
  });

  describe("input validation — failure modes", () => {
    it("throws on negative feed rate", () => {
      expect(() =>
        SFCCalculateEngine.calculate({ ...baseInput, feedRate: -1 })
      ).toThrow();
    });

    it("throws on feed rate exceeding max (10)", () => {
      expect(() =>
        SFCCalculateEngine.calculate({ ...baseInput, feedRate: 15 })
      ).toThrow();
    });

    it("throws on invalid operation type", () => {
      expect(() =>
        SFCCalculateEngine.calculate({ ...baseInput, operation: "laser" as any })
      ).toThrow();
    });

    it("throws on invalid material type", () => {
      expect(() =>
        SFCCalculateEngine.calculate({ ...baseInput, material: "wood" as any })
      ).toThrow();
    });
  });
});
