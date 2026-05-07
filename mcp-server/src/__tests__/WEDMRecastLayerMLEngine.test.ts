/**
 * WEDMRecastLayerMLEngine Tests
 *
 * WEDM-NEXT-MS0 / U-WN06
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  wedmRecastLayerMLEngine,
  type RecastMLInput,
  type RecastMLTrainingSample,
} from "../engines/WEDMRecastLayerMLEngine.js";

describe("WEDMRecastLayerMLEngine", () => {
  beforeEach(() => {
    wedmRecastLayerMLEngine.reset();
  });

  describe("predict() without training data (physics fallback)", () => {
    it("returns recast depth between 1-50um for typical roughing params", () => {
      const input: RecastMLInput = {
        material: "tool_steel",
        thicknessMm: 25,
        peakCurrentA: 8,
        voltageV: 80,
        pulseOnUs: 4,
        pulseOffUs: 20,
        wireDiameterMm: 0.25,
        wireMaterial: "brass",
      };

      const result = wedmRecastLayerMLEngine.predict(input);

      expect(result.recastDepthUm).toBeGreaterThan(1);
      expect(result.recastDepthUm).toBeLessThan(50);
      expect(result.confidence).toBeCloseTo(0.5, 1);
      expect(result.source).toBe("WEDMRecastLayerMLEngine:physics_fallback");
    });

    it("scales recast depth with discharge energy: 15A produces >2x depth vs 5A", () => {
      const base: RecastMLInput = {
        material: "steel",
        thicknessMm: 25,
        peakCurrentA: 5,
        voltageV: 60,
        pulseOnUs: 3,
        pulseOffUs: 20,
        wireDiameterMm: 0.25,
        wireMaterial: "brass",
      };

      const highEnergy: RecastMLInput = {
        ...base,
        peakCurrentA: 15,
        voltageV: 100,
        pulseOnUs: 8,
      };

      const lowResult = wedmRecastLayerMLEngine.predict(base);
      const highResult = wedmRecastLayerMLEngine.predict(highEnergy);

      expect(highResult.recastDepthUm / lowResult.recastDepthUm).toBeGreaterThan(2);
    });

    it("finish pass produces <15% of rough pass recast depth", () => {
      const rough: RecastMLInput = {
        material: "tool_steel",
        thicknessMm: 25,
        peakCurrentA: 8,
        voltageV: 80,
        pulseOnUs: 4,
        pulseOffUs: 20,
        wireDiameterMm: 0.25,
        wireMaterial: "brass",
        passType: "rough",
      };

      const finish: RecastMLInput = { ...rough, passType: "finish" };

      const roughResult = wedmRecastLayerMLEngine.predict(rough);
      const finishResult = wedmRecastLayerMLEngine.predict(finish);

      expect(finishResult.recastDepthUm / roughResult.recastDepthUm).toBeLessThan(0.15);
    });

    it("returns energy_mJ as top feature with 35% importance in fallback", () => {
      const input: RecastMLInput = {
        material: "inconel",
        thicknessMm: 50,
        peakCurrentA: 10,
        voltageV: 90,
        pulseOnUs: 5,
        pulseOffUs: 25,
        wireDiameterMm: 0.25,
        wireMaterial: "zinc_coated",
      };

      const result = wedmRecastLayerMLEngine.predict(input);

      expect(result.featureImportance.length).toBe(5);
      expect(result.featureImportance[0].feature).toBe("energy_mJ");
      expect(result.featureImportance[0].importance).toBeCloseTo(0.35, 2);
    });

    it("suggests flushing for no-flush high-risk scenario", () => {
      const highRisk: RecastMLInput = {
        material: "titanium",
        thicknessMm: 30,
        peakCurrentA: 20,
        voltageV: 120,
        pulseOnUs: 10,
        pulseOffUs: 15,
        wireDiameterMm: 0.30,
        wireMaterial: "brass",
        flushingMode: "none",
      };

      const result = wedmRecastLayerMLEngine.predict(highRisk);

      expect(result.mitigationSuggestions).toContain("Enable submerged or upper/lower flushing");
      expect(["moderate", "high", "critical"]).toContain(result.riskLevel);
    });
  });

  describe("train()", () => {
    it("builds 50 trees from 8 valid samples", () => {
      const samples: RecastMLTrainingSample[] = [
        { input: makeInput(8, 4), measuredDepthUm: 12 },
        { input: makeInput(10, 5), measuredDepthUm: 18 },
        { input: makeInput(6, 3), measuredDepthUm: 8 },
        { input: makeInput(12, 6), measuredDepthUm: 25 },
        { input: makeInput(5, 2), measuredDepthUm: 5 },
        { input: makeInput(15, 8), measuredDepthUm: 35 },
        { input: makeInput(7, 4), measuredDepthUm: 10 },
        { input: makeInput(9, 5), measuredDepthUm: 15 },
      ];

      const result = wedmRecastLayerMLEngine.train(samples);

      expect(result.treesBuilt).toBe(50);
      expect(result.sampleCount).toBe(8);
      expect(result.featureImportance.length).toBe(17);
    });

    it("returns zero trees and samples for all-NaN input", () => {
      const samples: RecastMLTrainingSample[] = [
        { input: makeInput(8, 4), measuredDepthUm: NaN },
        { input: makeInput(10, 5), measuredDepthUm: NaN },
      ];

      const result = wedmRecastLayerMLEngine.train(samples);

      expect(result.sampleCount).toBe(0);
      expect(result.treesBuilt).toBe(0);
    });

    it("returns zero trees and samples for all-negative depths", () => {
      const samples: RecastMLTrainingSample[] = [
        { input: makeInput(8, 4), measuredDepthUm: -5 },
        { input: makeInput(10, 5), measuredDepthUm: -10 },
      ];

      const result = wedmRecastLayerMLEngine.train(samples);

      expect(result.sampleCount).toBe(0);
      expect(result.treesBuilt).toBe(0);
    });

    it("returns OOB error <50 for 30 synthetic samples", () => {
      const samples = generateSyntheticSamples(30);
      const result = wedmRecastLayerMLEngine.train(samples);

      expect(result.oobError).toBeGreaterThanOrEqual(0);
      expect(result.oobError).toBeLessThan(50);
    });
  });

  describe("predict() with training data", () => {
    beforeEach(() => {
      const samples = generateSyntheticSamples(50);
      wedmRecastLayerMLEngine.train(samples);
    });

    it("switches to ensemble source after training", () => {
      const input = makeInput(8, 4);
      const result = wedmRecastLayerMLEngine.predict(input);

      expect(result.source).toBe("WEDMRecastLayerMLEngine:ensemble");
    });

    it("confidence increases to >0.7 with 50 training samples", () => {
      const input = makeInput(8, 4);
      const result = wedmRecastLayerMLEngine.predict(input);

      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    });

    it("uncertainty is positive and reasonable relative to depth", () => {
      const input = makeInput(8, 4);
      const result = wedmRecastLayerMLEngine.predict(input);

      expect(result.uncertainty).toBeGreaterThan(0);
      // Uncertainty can exceed depth for small predictions with high variance
      // across trees — acceptable as long as coefficient of variation < 200%
      expect(result.uncertainty / result.recastDepthUm).toBeLessThan(2);
    });

    it("maintains monotonicity: 5A < 10A < 15A recast depth", () => {
      const low = wedmRecastLayerMLEngine.predict(makeInput(5, 2));
      const mid = wedmRecastLayerMLEngine.predict(makeInput(10, 5));
      const high = wedmRecastLayerMLEngine.predict(makeInput(15, 8));

      expect(mid.recastDepthUm).toBeGreaterThan(low.recastDepthUm);
      expect(high.recastDepthUm).toBeGreaterThan(mid.recastDepthUm);
    });
  });

  describe("addSample()", () => {
    it("accepts valid sample and returns sampleCount=1", () => {
      const sample: RecastMLTrainingSample = {
        input: makeInput(8, 4),
        measuredDepthUm: 12,
      };

      const result = wedmRecastLayerMLEngine.addSample(sample);

      expect(result.accepted).toBe(true);
      expect(result.sampleCount).toBe(1);
    });

    it("rejects negative depth with accepted=false", () => {
      const sample: RecastMLTrainingSample = {
        input: makeInput(8, 4),
        measuredDepthUm: -10,
      };

      const result = wedmRecastLayerMLEngine.addSample(sample);

      expect(result.accepted).toBe(false);
      expect(result.sampleCount).toBe(0);
    });

    it("rejects NaN depth with accepted=false", () => {
      const sample: RecastMLTrainingSample = {
        input: makeInput(8, 4),
        measuredDepthUm: NaN,
      };

      const result = wedmRecastLayerMLEngine.addSample(sample);

      expect(result.accepted).toBe(false);
    });
  });

  describe("getStats()", () => {
    it("returns 17 features and maxDepth=8 for fresh engine", () => {
      const stats = wedmRecastLayerMLEngine.getStats();

      expect(stats.featureCount).toBe(17);
      expect(stats.maxDepth).toBe(8);
      expect(stats.treeCount).toBe(0);
      expect(stats.sampleCount).toBe(0);
    });

    it("returns treeCount=50 and sampleCount=20 after training", () => {
      wedmRecastLayerMLEngine.train(generateSyntheticSamples(20));
      const stats = wedmRecastLayerMLEngine.getStats();

      expect(stats.treeCount).toBe(50);
      expect(stats.sampleCount).toBe(20);
    });
  });

  describe("reset()", () => {
    it("resets treeCount and sampleCount to zero", () => {
      wedmRecastLayerMLEngine.train(generateSyntheticSamples(20));
      wedmRecastLayerMLEngine.reset();

      const stats = wedmRecastLayerMLEngine.getStats();
      expect(stats.treeCount).toBe(0);
      expect(stats.sampleCount).toBe(0);
    });
  });

  describe("material handling", () => {
    it("resolves D2 to tool_steel with same depth as explicit tool_steel", () => {
      const d2Input: RecastMLInput = { ...makeInput(8, 4), material: "D2" };
      const tsInput: RecastMLInput = { ...makeInput(8, 4), material: "tool_steel" };

      const d2Result = wedmRecastLayerMLEngine.predict(d2Input);
      const tsResult = wedmRecastLayerMLEngine.predict(tsInput);

      expect(d2Result.recastDepthUm).toBeCloseTo(tsResult.recastDepthUm, 1);
    });

    it("resolves 304 to stainless", () => {
      const input: RecastMLInput = { ...makeInput(8, 4), material: "304" };
      const result = wedmRecastLayerMLEngine.predict(input);
      expect(result.recastDepthUm).toBeGreaterThan(0);
      expect(result.recastDepthUm).toBeLessThan(100);
    });

    it("resolves unknown material to tool_steel baseline", () => {
      const knownInput: RecastMLInput = { ...makeInput(8, 4), material: "tool_steel" };
      const unknownInput: RecastMLInput = { ...makeInput(8, 4), material: "unobtanium" };

      const knownResult = wedmRecastLayerMLEngine.predict(knownInput);
      const unknownResult = wedmRecastLayerMLEngine.predict(unknownInput);

      expect(unknownResult.recastDepthUm).toBeCloseTo(knownResult.recastDepthUm, 1);
    });
  });

  describe("pass breakdown", () => {
    it("returns 4-element array with rough,skim1,skim2,skim3 for numPasses=4", () => {
      const input: RecastMLInput = { ...makeInput(8, 4), numPasses: 4 };

      const result = wedmRecastLayerMLEngine.predict(input);

      expect(result.passBreakdown).toHaveLength(4);
      expect(result.passBreakdown![0].pass).toBe("rough");
      expect(result.passBreakdown![1].pass).toBe("skim1");
      expect(result.passBreakdown![2].pass).toBe("skim2");
      expect(result.passBreakdown![3].pass).toBe("skim3");
    });

    it("returns passBreakdown=undefined (no array) for numPasses=1", () => {
      const input: RecastMLInput = { ...makeInput(8, 4), numPasses: 1 };

      const result = wedmRecastLayerMLEngine.predict(input);

      expect(result.passBreakdown).toBe(undefined);
    });
  });

  describe("risk assessment", () => {
    it("returns riskLevel=low for 2A finish pass with submerged flushing", () => {
      const input: RecastMLInput = {
        material: "steel",
        thicknessMm: 10,
        peakCurrentA: 2,
        voltageV: 40,
        pulseOnUs: 1,
        pulseOffUs: 30,
        wireDiameterMm: 0.20,
        wireMaterial: "brass",
        passType: "finish",
        flushingMode: "submerged",
      };

      const result = wedmRecastLayerMLEngine.predict(input);

      expect(result.riskLevel).toBe("low");
    });

    it("returns riskLevel high or critical for 25A rough on inconel with no flushing", () => {
      const input: RecastMLInput = {
        material: "inconel",
        thicknessMm: 100,
        peakCurrentA: 25,
        voltageV: 150,
        pulseOnUs: 12,
        pulseOffUs: 10,
        wireDiameterMm: 0.30,
        wireMaterial: "brass",
        passType: "rough",
        flushingMode: "none",
      };

      const result = wedmRecastLayerMLEngine.predict(input);

      expect(["high", "critical"]).toContain(result.riskLevel);
    });
  });
});

// ============================================================================
// HELPERS
// ============================================================================

function makeInput(peakCurrentA: number, pulseOnUs: number): RecastMLInput {
  return {
    material: "tool_steel",
    thicknessMm: 25,
    peakCurrentA,
    voltageV: 80,
    pulseOnUs,
    pulseOffUs: 20,
    wireDiameterMm: 0.25,
    wireMaterial: "brass",
  };
}

function generateSyntheticSamples(count: number): RecastMLTrainingSample[] {
  const samples: RecastMLTrainingSample[] = [];
  for (let i = 0; i < count; i++) {
    const current = 3 + Math.random() * 15;
    const pulseOn = 1 + Math.random() * 8;
    const voltage = 50 + Math.random() * 80;
    const energyMJ = (voltage * current * pulseOn) / 1000;
    const baseDepth = 2.5 * Math.sqrt(energyMJ) * (1 + pulseOn / (pulseOn + 20));
    const noise = (Math.random() - 0.5) * 3;

    samples.push({
      input: {
        material: ["steel", "tool_steel", "stainless"][i % 3],
        thicknessMm: 10 + Math.random() * 50,
        peakCurrentA: current,
        voltageV: voltage,
        pulseOnUs: pulseOn,
        pulseOffUs: 15 + Math.random() * 20,
        wireDiameterMm: [0.20, 0.25, 0.30][i % 3],
        wireMaterial: "brass",
      },
      measuredDepthUm: Math.max(1, baseDepth + noise),
    });
  }
  return samples;
}
