/**
 * L2-P4-MS1/P0-U05: Surface Finish & Sustainability Tests
 * =========================================================
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SFCCalculateEngine } from "../engines/SFCCalculateEngine.js";
import { SFCCompareEngine } from "../engines/SFCCompareEngine.js";
import { SFCOptimizeEngine } from "../engines/SFCOptimizeEngine.js";
import { SustainOptimizeEngine } from "../engines/SustainOptimizeEngine.js";
import { SustainEnergyEngine } from "../engines/SustainEnergyEngine.js";
import { SustainCarbonEngine } from "../engines/SustainCarbonEngine.js";

// ─── SFCCalculateEngine Tests ─────────────────────────────────────────────────

describe("SFCCalculateEngine", () => {
  describe("calculate", () => {
    it("calculates theoretical Ra for turning operation", () => {
      const result = SFCCalculateEngine.calculate({
        operation: "turning",
        feedRate: 0.2,
        toolNoseRadius: 0.8,
        cuttingSpeed: 150,
        depthOfCut: 2,
        material: "steel",
      });

      // Ra = f² / (32 * r) * 1000 = 0.2² / (32 * 0.8) * 1000 = 1.5625
      expect(result.theoreticalRa).toBeCloseTo(1.5625, 2);
      expect(result.predictedRa).toBeGreaterThan(0);
      expect(result.qualityGrade).toBeDefined();
    });

    it("calculates Ra for milling operation", () => {
      const result = SFCCalculateEngine.calculate({
        operation: "milling",
        feedRate: 0.1,
        toolDiameter: 12,
        fluteCount: 4,
        cuttingSpeed: 200,
        depthOfCut: 1,
        material: "aluminum",
      });

      expect(result.theoreticalRa).toBeGreaterThan(0);
      // Predicted Ra depends on all factors combined (material, tool, coolant)
      expect(result.predictedRa).toBeGreaterThan(0);
    });

    it("applies tool wear factor correctly", () => {
      const newTool = SFCCalculateEngine.calculate({
        operation: "turning",
        feedRate: 0.15,
        toolNoseRadius: 0.8,
        cuttingSpeed: 150,
        depthOfCut: 1.5,
        material: "steel",
        toolCondition: "new",
      });

      const wornTool = SFCCalculateEngine.calculate({
        operation: "turning",
        feedRate: 0.15,
        toolNoseRadius: 0.8,
        cuttingSpeed: 150,
        depthOfCut: 1.5,
        material: "steel",
        toolCondition: "worn",
      });

      expect(wornTool.predictedRa).toBeGreaterThan(newTool.predictedRa);
    });

    it("applies coolant factor correctly", () => {
      const withCoolant = SFCCalculateEngine.calculate({
        operation: "turning",
        feedRate: 0.15,
        cuttingSpeed: 150,
        depthOfCut: 1.5,
        material: "steel",
        coolant: "flood",
      });

      const noCoolant = SFCCalculateEngine.calculate({
        operation: "turning",
        feedRate: 0.15,
        cuttingSpeed: 150,
        depthOfCut: 1.5,
        material: "steel",
        coolant: "none",
      });

      expect(noCoolant.predictedRa).toBeGreaterThan(withCoolant.predictedRa);
    });

    it("generates recommendations for poor conditions", () => {
      const result = SFCCalculateEngine.calculate({
        operation: "turning",
        feedRate: 0.5,
        cuttingSpeed: 150,
        depthOfCut: 2,
        material: "steel",
        toolCondition: "critical",
        coolant: "none",
        vibrationLevel: 5,
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("calculates quality grade correctly", () => {
      const fine = SFCCalculateEngine.calculate({
        operation: "grinding",
        feedRate: 0.01,
        cuttingSpeed: 30,
        depthOfCut: 0.01,
        material: "steel",
      });

      const rough = SFCCalculateEngine.calculate({
        operation: "drilling",
        feedRate: 0.3,
        cuttingSpeed: 50,
        depthOfCut: 5,
        material: "steel",
      });

      const gradeOrder = ["N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8", "N9", "N10", "N11", "N12"];
      expect(gradeOrder.indexOf(fine.qualityGrade)).toBeLessThan(gradeOrder.indexOf(rough.qualityGrade));
    });
  });

  describe("calculateFeedForTarget", () => {
    it("calculates required feed for target Ra", () => {
      const feed = SFCCalculateEngine.calculateFeedForTarget(1.6, "turning", 0.8);
      expect(feed).toBeGreaterThan(0);
      expect(feed).toBeLessThan(1);
    });
  });
});

// ─── SFCCompareEngine Tests ──────────────────────────────────────────────────

describe("SFCCompareEngine", () => {
  describe("compare", () => {
    it("identifies in-spec measurements", () => {
      const result = SFCCompareEngine.compare({
        measurements: [
          { ra: 1.5 }, { ra: 1.6 }, { ra: 1.4 }, { ra: 1.55 }, { ra: 1.45 }
        ],
        specification: { targetRa: 1.6, toleranceRa: 0.4 },
      });

      expect(result.inSpec).toBe(true);
      expect(result.outOfSpecCount).toBe(0);
    });

    it("identifies out-of-spec measurements", () => {
      const result = SFCCompareEngine.compare({
        measurements: [
          { ra: 2.0 }, { ra: 2.5 }, { ra: 1.8 }, { ra: 2.2 }, { ra: 3.0 }
        ],
        specification: { targetRa: 1.6, toleranceRa: 0.2, maxRa: 1.8 },
      });

      expect(result.inSpec).toBe(false);
      expect(result.outOfSpecCount).toBeGreaterThan(0);
    });

    it("calculates statistical measures", () => {
      const result = SFCCompareEngine.compare({
        measurements: [
          { ra: 1.5 }, { ra: 1.6 }, { ra: 1.4 }, { ra: 1.55 }, { ra: 1.45 }
        ],
        specification: { targetRa: 1.5, toleranceRa: 0.3 },
      });

      expect(result.avgRa).toBeCloseTo(1.5, 1);
      expect(result.stdDevRa).toBeGreaterThan(0);
      expect(result.rangeRa).toBe(0.2);
    });

    it("calculates process capability (Cpk)", () => {
      const result = SFCCompareEngine.compare({
        measurements: [
          { ra: 1.50 }, { ra: 1.51 }, { ra: 1.49 }, { ra: 1.52 }, { ra: 1.48 },
          { ra: 1.50 }, { ra: 1.51 }, { ra: 1.49 }, { ra: 1.52 }, { ra: 1.48 }
        ],
        specification: { targetRa: 1.5, toleranceRa: 0.2 },
      });

      expect(result.cpk).toBeDefined();
      expect(result.cpk!).toBeGreaterThan(0);
    });

    it("detects degrading trend", () => {
      const result = SFCCompareEngine.compare({
        measurements: [
          { ra: 1.2 }, { ra: 1.3 }, { ra: 1.4 }, { ra: 1.5 }, { ra: 1.6 },
          { ra: 1.7 }, { ra: 1.8 }, { ra: 1.9 }, { ra: 2.0 }, { ra: 2.1 }
        ],
        specification: { targetRa: 1.6, toleranceRa: 0.8 },
      });

      expect(result.trend).toBe("degrading");
    });

    it("provides appropriate assessment", () => {
      const excellent = SFCCompareEngine.compare({
        measurements: Array(20).fill(null).map(() => ({ ra: 1.5 + (Math.random() - 0.5) * 0.02 })),
        specification: { targetRa: 1.5, toleranceRa: 0.3 },
      });

      expect(["excellent", "good"]).toContain(excellent.assessment);
    });
  });

  describe("meetsSpec", () => {
    it("returns true for in-spec values", () => {
      expect(SFCCompareEngine.meetsSpec(1.5, { targetRa: 1.6, toleranceRa: 0.2 })).toBe(true);
    });

    it("returns false for out-of-spec values", () => {
      expect(SFCCompareEngine.meetsSpec(2.0, { targetRa: 1.6, toleranceRa: 0.2 })).toBe(false);
    });
  });
});

// ─── SFCOptimizeEngine Tests ─────────────────────────────────────────────────

describe("SFCOptimizeEngine", () => {
  describe("optimize", () => {
    it("optimizes for target surface finish", () => {
      const result = SFCOptimizeEngine.optimize({
        targetRa: 1.6,
        toleranceRa: 0.2,
        operation: "turning",
        material: "steel",
        toolNoseRadius: 0.8,
        currentFeedRate: 0.25,
        currentSpeed: 180,
      });

      expect(result.predictedRa).toBeLessThanOrEqual(2.0); // Should be near target
      expect(result.optimizedFeedRate).toBeGreaterThan(0);
      expect(result.optimizedSpeed).toBeGreaterThan(0);
    });

    it("provides productivity index", () => {
      const result = SFCOptimizeEngine.optimize({
        targetRa: 3.2,
        toleranceRa: 0.5,
        operation: "milling",
        material: "aluminum",
        prioritize: "productivity",
      });

      expect(result.productivityIndex).toBeGreaterThan(0);
      expect(result.productivityIndex).toBeLessThanOrEqual(2);
    });

    it("generates alternatives", () => {
      const result = SFCOptimizeEngine.optimize({
        targetRa: 1.6,
        toleranceRa: 0.2,
        operation: "turning",
        material: "steel",
      });

      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(result.alternatives[0]).toHaveProperty("feedRate");
      expect(result.alternatives[0]).toHaveProperty("predictedRa");
    });

    it("applies material-specific speed factors", () => {
      const aluminum = SFCOptimizeEngine.optimize({
        targetRa: 1.6,
        toleranceRa: 0.2,
        operation: "turning",
        material: "aluminum",
      });

      const titanium = SFCOptimizeEngine.optimize({
        targetRa: 1.6,
        toleranceRa: 0.2,
        operation: "turning",
        material: "titanium",
      });

      expect(aluminum.optimizedSpeed).toBeGreaterThan(titanium.optimizedSpeed);
    });
  });
});

// ─── SustainOptimizeEngine Tests ─────────────────────────────────────────────

describe("SustainOptimizeEngine", () => {
  describe("optimize", () => {
    it("calculates current environmental impact", () => {
      const result = SustainOptimizeEngine.optimize({
        currentPower: 15,
        cuttingTime: 30,
        idleTime: 10,
        spindleSpeed: 6000,
        feedRate: 1200,
        coolantFlow: 20,
        coolantType: "synthetic",
        material: "steel",
        toolMaterial: "carbide",
      });

      expect(result.currentImpact.energyKwh).toBeGreaterThan(0);
      expect(result.currentImpact.carbonKgCO2).toBeGreaterThan(0);
    });

    it("provides optimized parameters", () => {
      const result = SustainOptimizeEngine.optimize({
        currentPower: 15,
        cuttingTime: 30,
        spindleSpeed: 6000,
        feedRate: 1200,
        coolantFlow: 25,
        coolantType: "mineral",
        material: "steel",
        toolMaterial: "carbide",
      });

      expect(result.optimizedParams.spindleSpeed).toBeLessThan(6000);
      expect(result.optimizedParams.coolantFlow).toBeLessThan(25);
    });

    it("calculates savings percentages", () => {
      const result = SustainOptimizeEngine.optimize({
        currentPower: 20,
        cuttingTime: 60,
        idleTime: 20,
        spindleSpeed: 8000,
        feedRate: 1500,
        coolantFlow: 30,
        coolantType: "mineral",
        material: "aluminum",
        toolMaterial: "carbide",
      });

      expect(result.savings.energyPercent).toBeGreaterThan(0);
    });

    it("generates sustainability recommendations", () => {
      const result = SustainOptimizeEngine.optimize({
        currentPower: 15,
        cuttingTime: 30,
        idleTime: 30, // High idle time
        spindleSpeed: 6000,
        feedRate: 1200,
        coolantFlow: 25,
        coolantType: "mineral", // Non-optimal coolant
        material: "steel",
        toolMaterial: "carbide",
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });
});

// ─── SustainEnergyEngine Tests ───────────────────────────────────────────────

describe("SustainEnergyEngine", () => {
  beforeEach(() => {
    SustainEnergyEngine.reset();
  });

  describe("analyze", () => {
    it("calculates total energy consumption", () => {
      const result = SustainEnergyEngine.analyze({
        records: [
          { machineId: "M1", operationType: "roughing", powerKw: 15, durationMinutes: 30, timestamp: "2026-01-01T08:00:00Z" },
          { machineId: "M1", operationType: "finishing", powerKw: 8, durationMinutes: 20, timestamp: "2026-01-01T08:30:00Z" },
          { machineId: "M2", operationType: "drilling", powerKw: 5, durationMinutes: 15, timestamp: "2026-01-01T09:00:00Z" },
        ],
        periodHours: 8,
      });

      // Total = (15*30 + 8*20 + 5*15) / 60 = (450 + 160 + 75) / 60 = 11.42 kWh
      expect(result.totalEnergyKwh).toBeCloseTo(11.42, 1);
    });

    it("breaks down energy by operation type", () => {
      const result = SustainEnergyEngine.analyze({
        records: [
          { machineId: "M1", operationType: "roughing", powerKw: 15, durationMinutes: 30, timestamp: "2026-01-01T08:00:00Z" },
          { machineId: "M1", operationType: "idle", powerKw: 2, durationMinutes: 60, timestamp: "2026-01-01T09:00:00Z" },
        ],
        periodHours: 4,
      });

      expect(result.byOperation["roughing"]).toBeDefined();
      expect(result.byOperation["idle"]).toBeDefined();
      expect(result.byOperation["roughing"].energyKwh).toBeGreaterThan(result.byOperation["idle"].energyKwh);
    });

    it("breaks down energy by machine", () => {
      const result = SustainEnergyEngine.analyze({
        records: [
          { machineId: "M1", operationType: "roughing", powerKw: 15, durationMinutes: 30, timestamp: "2026-01-01T08:00:00Z" },
          { machineId: "M2", operationType: "roughing", powerKw: 10, durationMinutes: 30, timestamp: "2026-01-01T08:00:00Z" },
        ],
        periodHours: 4,
      });

      expect(result.byMachine["M1"]).toBeDefined();
      expect(result.byMachine["M2"]).toBeDefined();
    });

    it("calculates efficiency metrics", () => {
      const result = SustainEnergyEngine.analyze({
        records: [
          { machineId: "M1", operationType: "roughing", powerKw: 15, durationMinutes: 30, timestamp: "2026-01-01T08:00:00Z" },
          { machineId: "M1", operationType: "idle", powerKw: 2, durationMinutes: 30, timestamp: "2026-01-01T08:30:00Z" },
        ],
        periodHours: 4,
      });

      expect(result.efficiency.cuttingVsTotal).toBeGreaterThan(0);
      expect(result.efficiency.idlePercent).toBeGreaterThan(0);
    });

    it("estimates monthly cost", () => {
      const result = SustainEnergyEngine.analyze({
        records: [
          { machineId: "M1", operationType: "roughing", powerKw: 10, durationMinutes: 60, timestamp: "2026-01-01T08:00:00Z" },
        ],
        periodHours: 1,
      });

      expect(result.benchmarks.estimatedMonthlyCost).toBeGreaterThan(0);
    });
  });
});

// ─── SustainCarbonEngine Tests ───────────────────────────────────────────────

describe("SustainCarbonEngine", () => {
  describe("calculate", () => {
    it("calculates total carbon footprint", () => {
      const result = SustainCarbonEngine.calculate({
        energyKwh: 10,
        coolantLiters: 5,
        coolantType: "synthetic",
        materialKg: 2,
        materialType: "steel",
        chipKg: 0.5,
        chipRecycled: true,
        toolChanges: 1,
        toolMaterial: "carbide",
      });

      expect(result.totalCarbonKgCO2e).toBeGreaterThan(0);
    });

    it("provides carbon breakdown", () => {
      const result = SustainCarbonEngine.calculate({
        energyKwh: 10,
        coolantLiters: 5,
        materialKg: 2,
        materialType: "steel",
      });

      expect(result.breakdown.electricity).toBeGreaterThan(0);
      expect(result.breakdown.material).toBeGreaterThan(0);
      expect(result.breakdownPercent.electricity).toBeGreaterThan(0);
    });

    it("credits recycled chips", () => {
      const withRecycling = SustainCarbonEngine.calculate({
        energyKwh: 5,
        materialKg: 2,
        materialType: "aluminum",
        chipKg: 1,
        chipRecycled: true,
      });

      const noRecycling = SustainCarbonEngine.calculate({
        energyKwh: 5,
        materialKg: 2,
        materialType: "aluminum",
        chipKg: 1,
        chipRecycled: false,
      });

      expect(withRecycling.totalCarbonKgCO2e).toBeLessThan(noRecycling.totalCarbonKgCO2e);
    });

    it("applies grid region carbon intensity", () => {
      const renewable = SustainCarbonEngine.calculate({
        energyKwh: 100,
        materialKg: 1,
        materialType: "steel",
        gridRegion: "renewable",
      });

      const coalHeavy = SustainCarbonEngine.calculate({
        energyKwh: 100,
        materialKg: 1,
        materialType: "steel",
        gridRegion: "coal_heavy",
      });

      expect(renewable.breakdown.electricity).toBeLessThan(coalHeavy.breakdown.electricity);
    });

    it("calculates carbon offset requirements", () => {
      const result = SustainCarbonEngine.calculate({
        energyKwh: 50,
        materialKg: 5,
        materialType: "titanium", // High embodied carbon
        chipKg: 2,
      });

      expect(result.offsetRequired.treesPerYear).toBeGreaterThan(0);
      expect(result.offsetRequired.carbonCredits).toBeGreaterThan(0);
    });

    it("assigns carbon rating", () => {
      const lowCarbon = SustainCarbonEngine.calculate({
        energyKwh: 1,
        materialKg: 1,
        materialType: "steel",
        chipKg: 0.1,
        chipRecycled: true,
        gridRegion: "renewable",
      });

      const highCarbon = SustainCarbonEngine.calculate({
        energyKwh: 100,
        materialKg: 5,
        materialType: "titanium",
        chipKg: 4,
        chipRecycled: false,
        gridRegion: "coal_heavy",
        coolantLiters: 50,
        coolantType: "mineral",
      });

      const ratingOrder = ["A", "B", "C", "D", "F"];
      expect(ratingOrder.indexOf(lowCarbon.rating)).toBeLessThan(ratingOrder.indexOf(highCarbon.rating));
    });

    it("generates recommendations for high-impact areas", () => {
      const result = SustainCarbonEngine.calculate({
        energyKwh: 50,
        materialKg: 3,
        materialType: "titanium",
        chipKg: 2,
        chipRecycled: false,
        coolantLiters: 20,
        coolantType: "mineral",
        gridRegion: "coal_heavy",
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("getGridIntensity", () => {
    it("returns grid intensity values", () => {
      expect(SustainCarbonEngine.getGridIntensity("renewable")).toBeLessThan(
        SustainCarbonEngine.getGridIntensity("coal_heavy")
      );
    });
  });

  describe("getMaterialCarbon", () => {
    it("returns material carbon values", () => {
      expect(SustainCarbonEngine.getMaterialCarbon("titanium")).toBeGreaterThan(
        SustainCarbonEngine.getMaterialCarbon("steel")
      );
    });
  });
});

// ─── Self-Awareness Tests ────────────────────────────────────────────────────

describe("Self-Awareness", () => {
  it("all engines provide self-awareness", () => {
    const engines = [
      SFCCalculateEngine,
      SFCCompareEngine,
      SFCOptimizeEngine,
      SustainOptimizeEngine,
      SustainEnergyEngine,
      SustainCarbonEngine,
    ];

    for (const engine of engines) {
      const awareness = engine.getSelfAwareness();
      expect(awareness.name).toBeTruthy();
      expect(awareness.version).toBe("1.0.0");
      expect(awareness.milestone).toBe("L2-P4-MS1/P0-U05");
      expect(awareness.capabilities.length).toBeGreaterThan(0);
    }
  });
});
