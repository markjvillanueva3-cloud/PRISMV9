/**
 * Tests for reverse-engineered monolith engines:
 * LaserCuttingEngine, WaterjetCuttingEngine, FeedOptimizationEngine
 */
import { describe, it, expect } from "vitest";
import { laserCuttingEngine } from "../engines/LaserCuttingEngine.js";
import { waterjetCuttingEngine } from "../engines/WaterjetCuttingEngine.js";
import { feedOptimizationEngine } from "../engines/FeedOptimizationEngine.js";

// ===========================================================================
// LaserCuttingEngine
// ===========================================================================

describe("LaserCuttingEngine", () => {
  describe("calculateParams", () => {
    it("calculates mild steel with fiber laser", () => {
      const r = laserCuttingEngine.calculateParams({
        material: "mild_steel", thickness: 6, laserType: "fiber", power: 6000,
      });
      expect(r.cuttingSpeed).toBeGreaterThan(500);
      expect(r.cuttingSpeed).toBeLessThan(40000);
      expect(r.kerf).toBeGreaterThan(0);
      expect(r.mrr).toBeGreaterThan(0);
      expect(r.pierceTime).toBeGreaterThan(0);
      expect(r.surfaceRoughness).toBeGreaterThan(0);
      expect(r.edgeQuality).toBe("Excellent");
    });

    it("calculates aluminum with CO2 laser", () => {
      const r = laserCuttingEngine.calculateParams({
        material: "aluminum", thickness: 3, laserType: "co2", power: 4000,
      });
      expect(r.cuttingSpeed).toBeGreaterThan(0);
      expect(r.warnings.length).toBeGreaterThan(0); // Low absorptivity warning
    });

    it("warns on thickness exceeding max", () => {
      const r = laserCuttingEngine.calculateParams({
        material: "copper", thickness: 20, laserType: "fiber", power: 6000,
      });
      expect(r.warnings.some(w => w.includes("exceeds max"))).toBe(true);
      expect(r.edgeQuality).toBe("Poor");
    });

    it("applies pulsed mode reduction", () => {
      const cw = laserCuttingEngine.calculateParams({
        material: "mild_steel", thickness: 6, power: 6000,
      });
      const pulsed = laserCuttingEngine.calculateParams({
        material: "mild_steel", thickness: 6, power: 6000, pulsed: true, dutyCycle: 50,
      });
      expect(pulsed.cuttingSpeed).toBeLessThan(cw.cuttingSpeed);
    });

    it("provides cost breakdown", () => {
      const r = laserCuttingEngine.calculateParams({
        material: "stainless", thickness: 10, cutLength: 2000, pierces: 20,
      });
      expect(r.cost.gas).toBeGreaterThan(0);
      expect(r.cost.power).toBeGreaterThan(0);
      expect(r.cost.total).toBe(r.cost.gas + r.cost.power);
    });

    it("provides time breakdown", () => {
      const r = laserCuttingEngine.calculateParams({
        material: "mild_steel", thickness: 6, cutLength: 1000, pierces: 5,
      });
      expect(r.timeBreakdown.total).toBeGreaterThan(0);
      expect(r.timeBreakdown.cutting).toBeGreaterThan(0);
    });

    it("estimates HAZ", () => {
      const r = laserCuttingEngine.calculateParams({
        material: "mild_steel", thickness: 25, power: 12000,
      });
      expect(r.hazEstimate).toBeGreaterThan(0);
    });

    it("handles disk laser type", () => {
      const r = laserCuttingEngine.calculateParams({
        material: "titanium", thickness: 5, laserType: "disk", power: 8000,
      });
      expect(r.cuttingSpeed).toBeGreaterThan(0);
    });

    it("handles acrylic with CO2", () => {
      const r = laserCuttingEngine.calculateParams({
        material: "acrylic", thickness: 10, laserType: "co2", power: 100,
      });
      expect(r.cuttingSpeed).toBeGreaterThan(0);
    });
  });

  describe("listMaterials", () => {
    it("returns all materials", () => {
      const mats = laserCuttingEngine.listMaterials();
      expect(mats.length).toBeGreaterThanOrEqual(10);
      expect(mats[0]).toHaveProperty("id");
      expect(mats[0]).toHaveProperty("name");
    });
  });

  describe("listMachines", () => {
    it("returns machine database", () => {
      const machines = laserCuttingEngine.listMachines();
      expect(machines.length).toBeGreaterThanOrEqual(8);
      const trumpf = machines.find(m => m.manufacturer === "TRUMPF");
      expect(trumpf).toBeDefined();
    });
  });

  describe("getMachineParams", () => {
    it("calculates for specific machine", () => {
      const r = laserCuttingEngine.getMachineParams(
        "trumpf_5030_12kw", "mild_steel", 10
      );
      expect(r).not.toBeNull();
      expect(r!.cuttingSpeed).toBeGreaterThan(0);
    });

    it("returns null for unknown machine", () => {
      const r = laserCuttingEngine.getMachineParams("nonexistent", "mild_steel", 10);
      expect(r).toBeNull();
    });
  });

  describe("recommendGas", () => {
    it("recommends O2 for speed on mild steel", () => {
      const r = laserCuttingEngine.recommendGas("mild_steel", "speed");
      expect(r.gas).toBe("oxygen");
    });

    it("recommends Ar for quality on titanium", () => {
      const r = laserCuttingEngine.recommendGas("titanium", "quality");
      expect(r.gas).toBe("argon");
    });

    it("recommends air for cost on non-critical", () => {
      const r = laserCuttingEngine.recommendGas("aluminum", "cost");
      expect(r.gas).toBe("air");
    });
  });
});

// ===========================================================================
// WaterjetCuttingEngine
// ===========================================================================

describe("WaterjetCuttingEngine", () => {
  describe("calculateParams", () => {
    it("calculates mild steel at Q3", () => {
      const r = waterjetCuttingEngine.calculateParams({
        material: "mild_steel", thickness: 25, quality: 3,
      });
      expect(r.cuttingSpeed).toBeGreaterThan(5);
      expect(r.kerf).toBeGreaterThan(0);
      expect(r.mrr).toBeGreaterThan(0);
      expect(r.mode).toBe("abrasive");
      expect(r.edgeQuality).toBe("Good");
    });

    it("uses pure water for rubber", () => {
      const r = waterjetCuttingEngine.calculateParams({
        material: "rubber", thickness: 10,
      });
      expect(r.mode).toBe("pure_water");
      expect(r.consumables.abrasive).toBe(0);
    });

    it("can force abrasive on soft material", () => {
      const r = waterjetCuttingEngine.calculateParams({
        material: "rubber", thickness: 10, forceAbrasive: true,
      });
      expect(r.mode).toBe("abrasive");
    });

    it("higher quality = slower speed", () => {
      const q1 = waterjetCuttingEngine.calculateParams({
        material: "mild_steel", thickness: 25, quality: 1,
      });
      const q5 = waterjetCuttingEngine.calculateParams({
        material: "mild_steel", thickness: 25, quality: 5,
      });
      expect(q1.cuttingSpeed).toBeGreaterThan(q5.cuttingSpeed);
    });

    it("taper compensation reduces taper", () => {
      const noComp = waterjetCuttingEngine.calculateParams({
        material: "mild_steel", thickness: 25, quality: 3,
      });
      const withComp = waterjetCuttingEngine.calculateParams({
        material: "mild_steel", thickness: 25, quality: 3,
        taperCompensation: true,
      });
      expect(withComp.taperAngle).toBeLessThan(noComp.taperAngle);
    });

    it("provides consumable tracking", () => {
      const r = waterjetCuttingEngine.calculateParams({
        material: "stainless", thickness: 12, cutLength: 500,
      });
      expect(r.consumables.abrasive).toBeGreaterThan(0);
      expect(r.consumables.water).toBeGreaterThan(0);
      expect(r.consumables.power).toBeGreaterThan(0);
    });

    it("provides cost breakdown", () => {
      const r = waterjetCuttingEngine.calculateParams({
        material: "titanium", thickness: 20, cutLength: 200,
      });
      expect(r.cost.total).toBeGreaterThan(0);
      expect(r.cost.total).toBe(
        r.cost.abrasive + r.cost.water + r.cost.power
      );
    });

    it("warns on extreme thickness", () => {
      const r = waterjetCuttingEngine.calculateParams({
        material: "mild_steel", thickness: 200,
      });
      expect(r.warnings.some(w => w.includes("Extreme thickness"))).toBe(true);
    });

    it("handles tungsten carbide (slow material)", () => {
      const r = waterjetCuttingEngine.calculateParams({
        material: "tungsten_carbide", thickness: 10,
      });
      expect(r.cuttingSpeed).toBeGreaterThan(0);
      expect(r.cuttingSpeed).toBeLessThan(100);
    });
  });

  describe("listMaterials", () => {
    it("returns 18 materials", () => {
      const mats = waterjetCuttingEngine.listMaterials();
      expect(mats.length).toBe(18);
      const rubber = mats.find(m => m.id === "rubber");
      expect(rubber?.pureWater).toBe(true);
    });
  });

  describe("listAbrasives", () => {
    it("returns abrasive types", () => {
      const abs = waterjetCuttingEngine.listAbrasives();
      expect(abs.length).toBeGreaterThanOrEqual(5);
      expect(abs[0]).toHaveProperty("mesh");
    });
  });

  describe("listQualityLevels", () => {
    it("returns Q1-Q5", () => {
      const levels = waterjetCuttingEngine.listQualityLevels();
      expect(levels.length).toBe(5);
      expect(levels[0].level).toBe(1);
      expect(levels[4].level).toBe(5);
    });
  });
});

// ===========================================================================
// FeedOptimizationEngine
// ===========================================================================

describe("FeedOptimizationEngine", () => {
  describe("optimizeFeed", () => {
    it("applies aggressiveness level", () => {
      const conservative = feedOptimizationEngine.optimizeFeed({
        baseFeed: 1000, aggressiveness: 2,
      });
      const aggressive = feedOptimizationEngine.optimizeFeed({
        baseFeed: 1000, aggressiveness: 7,
      });
      expect(conservative.optimizedFeed).toBeLessThan(aggressive.optimizedFeed);
    });

    it("applies chip thinning compensation", () => {
      const r = feedOptimizationEngine.optimizeFeed({
        baseFeed: 1000, aggressiveness: 5,
        toolDiameter: 20, radialEngagement: 2, // 10% ae/D
      });
      expect(r.optimizedFeed).toBeGreaterThan(1000);
      expect(r.appliedFactors.some(f => f.name === "Chip Thinning")).toBe(true);
    });

    it("applies dynamic depth feed", () => {
      const r = feedOptimizationEngine.optimizeFeed({
        baseFeed: 1000, aggressiveness: 5,
        currentDepth: 1, fullDepth: 10, // Near surface
      });
      expect(r.optimizedFeed).toBeGreaterThan(1000);
    });

    it("applies G-force corner limiting", () => {
      const r = feedOptimizationEngine.optimizeFeed({
        baseFeed: 10000, aggressiveness: 5,
        cornerRadius: 2, maxGForce: 1,
      });
      expect(r.optimizedFeed).toBeLessThan(10000);
      expect(r.appliedFactors.some(f => f.name === "G-Force Limit")).toBe(true);
    });

    it("applies arc feed correction", () => {
      const r = feedOptimizationEngine.optimizeFeed({
        baseFeed: 1000, aggressiveness: 5,
        arcRadius: 10, toolDiameter: 10, isInsideArc: true,
      });
      expect(r.appliedFactors.some(f => f.name === "Arc Correction")).toBe(true);
    });

    it("returns base feed at level 5 with no modifiers", () => {
      const r = feedOptimizationEngine.optimizeFeed({
        baseFeed: 1000, aggressiveness: 5,
      });
      expect(r.optimizedFeed).toBe(1000);
      expect(r.multiplier).toBe(1);
    });
  });

  describe("calculateChipThinningFactor", () => {
    it("returns 1.0 at 50% engagement", () => {
      expect(feedOptimizationEngine.calculateChipThinningFactor(10, 20)).toBe(1.0);
    });

    it("returns >1.0 at low engagement", () => {
      const ctf = feedOptimizationEngine.calculateChipThinningFactor(2, 20);
      expect(ctf).toBeGreaterThan(1.0);
      expect(ctf).toBeLessThanOrEqual(2.0);
    });

    it("caps at 2.0x", () => {
      const ctf = feedOptimizationEngine.calculateChipThinningFactor(0.1, 20);
      expect(ctf).toBeLessThanOrEqual(2.0);
    });
  });

  describe("calculateCornerDynamics", () => {
    it("calculates right angle corner", () => {
      const r = feedOptimizationEngine.calculateCornerDynamics({
        feedRate: 5000, cornerAngle: 90,
      });
      expect(r.feedReduction).toBeGreaterThanOrEqual(0);
      expect(r.maxFeedAtCorner).toBeLessThanOrEqual(5000);
      expect(r.decelDistance).toBeGreaterThanOrEqual(0);
      expect(r.recommendation).toBeTruthy();
    });

    it("straight path has minimal reduction", () => {
      const r = feedOptimizationEngine.calculateCornerDynamics({
        feedRate: 5000, cornerAngle: 170,
      });
      expect(r.feedReduction).toBeLessThan(50);
    });

    it("sharp corner has severe reduction", () => {
      const r = feedOptimizationEngine.calculateCornerDynamics({
        feedRate: 10000, cornerAngle: 30,
      });
      expect(r.feedReduction).toBeGreaterThan(30);
      expect(r.recommendation).toContain("fillet");
    });
  });

  describe("calculateArcFeedCorrection", () => {
    it("inside arc increases feed", () => {
      const r = feedOptimizationEngine.calculateArcFeedCorrection(20, 5, true);
      expect(r.correction).toBeGreaterThan(1.0);
    });

    it("outside arc decreases feed", () => {
      const r = feedOptimizationEngine.calculateArcFeedCorrection(20, 5, false);
      expect(r.correction).toBeLessThan(1.0);
    });

    it("large arc needs no correction", () => {
      const r = feedOptimizationEngine.calculateArcFeedCorrection(500, 5, false);
      expect(r.correction).toBe(1);
    });
  });

  describe("calculateBalanceGrade", () => {
    it("selects grade for high-speed machining", () => {
      const r = feedOptimizationEngine.calculateBalanceGrade({
        rpm: 20000, holderMass: 1.5,
      });
      expect(r.requiredGrade).toBe("G2.5");
      expect(r.permissibleUnbalance).toBeGreaterThan(0);
    });

    it("calculates centrifugal force", () => {
      const r = feedOptimizationEngine.calculateBalanceGrade({
        rpm: 15000, holderMass: 1.0, toolDiameter: 20, insertMass: 5,
      });
      expect(r.centrifugalForce).toBeGreaterThan(0);
      expect(r.gForce).toBeGreaterThan(0);
    });

    it("warns on exceeding holder RPM limit", () => {
      const r = feedOptimizationEngine.calculateBalanceGrade({
        rpm: 25000, holderMass: 1.0, holderType: "er_collet",
      });
      expect(r.warnings.some(w => w.includes("exceeds"))).toBe(true);
    });

    it("shrink-fit holder allows higher RPM", () => {
      const shrink = feedOptimizationEngine.calculateBalanceGrade({
        rpm: 30000, holderMass: 1.0, holderType: "shrink_fit",
      });
      const collet = feedOptimizationEngine.calculateBalanceGrade({
        rpm: 30000, holderMass: 1.0, holderType: "er_collet",
      });
      // Shrink-fit should have fewer warnings
      expect(shrink.warnings.length).toBeLessThanOrEqual(collet.warnings.length);
    });

    it("provides max safe RPM", () => {
      const r = feedOptimizationEngine.calculateBalanceGrade({
        rpm: 10000, holderMass: 1.0, toolDiameter: 50,
      });
      expect(r.maxSafeRPM).toBeGreaterThan(0);
    });
  });

  describe("listAggressivenessLevels", () => {
    it("returns 8 levels", () => {
      const levels = feedOptimizationEngine.listAggressivenessLevels();
      expect(levels.length).toBe(8);
      expect(levels[0].feed).toBe(0.5);
      expect(levels[4].feed).toBe(1.0); // Level 5 = baseline
      expect(levels[7].feed).toBe(1.5);
    });
  });
});
