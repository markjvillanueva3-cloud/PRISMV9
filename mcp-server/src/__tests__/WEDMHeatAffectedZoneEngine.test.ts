/**
 * WEDMHeatAffectedZoneEngine Tests
 *
 * WEDM-NEXT-MS0 / U-WN07
 */

import { describe, it, expect } from "vitest";
import {
  wedmHeatAffectedZoneEngine,
  type HAZInput,
} from "../engines/WEDMHeatAffectedZoneEngine.js";

describe("WEDMHeatAffectedZoneEngine", () => {
  describe("predict()", () => {
    it("returns HAZ depth between 5-100µm for typical roughing params", () => {
      const input: HAZInput = {
        material: "tool_steel",
        thicknessMm: 25,
        peakCurrentA: 8,
        voltageV: 80,
        pulseOnUs: 4,
        pulseOffUs: 20,
        wireDiameterMm: 0.25,
        wireMaterial: "brass",
      };

      const result = wedmHeatAffectedZoneEngine.predict(input);

      expect(result.hazDepthUm).toBeGreaterThan(5);
      expect(result.hazDepthUm).toBeLessThan(100);
      expect(result.source).toBe("WEDMHeatAffectedZoneEngine:thermal_diffusion");
    });

    it("returns totalAffectedDepth = recastDepth + hazDepth", () => {
      const input: HAZInput = {
        material: "steel",
        thicknessMm: 20,
        peakCurrentA: 10,
        voltageV: 90,
        pulseOnUs: 5,
        pulseOffUs: 25,
        wireDiameterMm: 0.25,
        wireMaterial: "brass",
      };

      const result = wedmHeatAffectedZoneEngine.predict(input);

      expect(result.totalAffectedDepthUm).toBeCloseTo(
        result.recastDepthUm + result.hazDepthUm,
        1
      );
    });

    it("higher current produces deeper HAZ", () => {
      const base: HAZInput = {
        material: "tool_steel",
        thicknessMm: 25,
        peakCurrentA: 5,
        voltageV: 60,
        pulseOnUs: 3,
        pulseOffUs: 20,
        wireDiameterMm: 0.25,
        wireMaterial: "brass",
      };

      const highCurrent: HAZInput = { ...base, peakCurrentA: 15, voltageV: 100 };

      const lowResult = wedmHeatAffectedZoneEngine.predict(base);
      const highResult = wedmHeatAffectedZoneEngine.predict(highCurrent);

      expect(highResult.hazDepthUm).toBeGreaterThan(lowResult.hazDepthUm);
    });

    it("finish pass produces shallower HAZ than rough pass", () => {
      const rough: HAZInput = {
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

      const finish: HAZInput = {
        ...rough,
        peakCurrentA: 2,
        voltageV: 40,
        pulseOnUs: 1,
        passType: "finish",
      };

      const roughResult = wedmHeatAffectedZoneEngine.predict(rough);
      const finishResult = wedmHeatAffectedZoneEngine.predict(finish);

      expect(finishResult.hazDepthUm).toBeLessThan(roughResult.hazDepthUm);
    });

    it("returns temperature profile with decreasing temps from surface", () => {
      const input: HAZInput = {
        material: "steel",
        thicknessMm: 20,
        peakCurrentA: 8,
        voltageV: 80,
        pulseOnUs: 4,
        pulseOffUs: 20,
        wireDiameterMm: 0.25,
        wireMaterial: "brass",
      };

      const result = wedmHeatAffectedZoneEngine.predict(input);

      expect(result.temperatureProfile.length).toBeGreaterThan(5);
      // Temperature should decrease monotonically
      for (let i = 1; i < result.temperatureProfile.length; i++) {
        expect(result.temperatureProfile[i].peakTempC).toBeLessThanOrEqual(
          result.temperatureProfile[i - 1].peakTempC
        );
      }
    });

    it("returns at least 2 microstructure zones", () => {
      const input: HAZInput = {
        material: "tool_steel",
        thicknessMm: 25,
        peakCurrentA: 10,
        voltageV: 90,
        pulseOnUs: 5,
        pulseOffUs: 20,
        wireDiameterMm: 0.25,
        wireMaterial: "brass",
      };

      const result = wedmHeatAffectedZoneEngine.predict(input);

      expect(result.microstructure.length).toBeGreaterThanOrEqual(2);
      // Should always have base material zone
      const hasBase = result.microstructure.some(z => z.zone === "base");
      expect(hasBase).toBe(true);
    });

    it("predicts martensite phase for high cooling rate in tool steel", () => {
      const input: HAZInput = {
        material: "D2",
        thicknessMm: 25,
        peakCurrentA: 12,
        voltageV: 100,
        pulseOnUs: 6,
        pulseOffUs: 15,
        wireDiameterMm: 0.25,
        wireMaterial: "brass",
      };

      const result = wedmHeatAffectedZoneEngine.predict(input);

      // Tool steel with fast cooling should produce martensite
      const hasMartensite = result.microstructure.some(z =>
        z.phase.toLowerCase().includes("martensite")
      );
      expect(hasMartensite).toBe(true);
    });

    it("returns positive cooling rate", () => {
      const input: HAZInput = {
        material: "steel",
        thicknessMm: 20,
        peakCurrentA: 8,
        voltageV: 80,
        pulseOnUs: 4,
        pulseOffUs: 20,
        wireDiameterMm: 0.25,
        wireMaterial: "brass",
      };

      const result = wedmHeatAffectedZoneEngine.predict(input);

      expect(result.coolingRateCperS).toBeGreaterThan(0);
    });

    it("returns confidence between 0.3 and 0.95", () => {
      const input: HAZInput = {
        material: "tool_steel",
        thicknessMm: 25,
        peakCurrentA: 8,
        voltageV: 80,
        pulseOnUs: 4,
        pulseOffUs: 20,
        wireDiameterMm: 0.25,
        wireMaterial: "brass",
        flushingMode: "submerged",
        passType: "rough",
      };

      const result = wedmHeatAffectedZoneEngine.predict(input);

      expect(result.confidence).toBeGreaterThanOrEqual(0.3);
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    });
  });

  describe("material handling", () => {
    it("resolves D2 alias to tool_steel", () => {
      const d2: HAZInput = makeInput("D2");
      const ts: HAZInput = makeInput("tool_steel");

      const d2Result = wedmHeatAffectedZoneEngine.predict(d2);
      const tsResult = wedmHeatAffectedZoneEngine.predict(ts);

      // Should produce similar results
      expect(d2Result.hazDepthUm).toBeCloseTo(tsResult.hazDepthUm, 0);
    });

    it("resolves 304 alias to stainless", () => {
      const input: HAZInput = makeInput("304");
      const result = wedmHeatAffectedZoneEngine.predict(input);

      expect(result.hazDepthUm).toBeGreaterThan(0);
      expect(result.hazDepthUm).toBeLessThan(200);
    });

    it("falls back to tool_steel for unknown material", () => {
      const unknown: HAZInput = makeInput("unobtanium");
      const ts: HAZInput = makeInput("tool_steel");

      const unknownResult = wedmHeatAffectedZoneEngine.predict(unknown);
      const tsResult = wedmHeatAffectedZoneEngine.predict(ts);

      expect(unknownResult.hazDepthUm).toBeCloseTo(tsResult.hazDepthUm, 0);
    });

    it("aluminum has higher thermal diffusivity → shallower HAZ per energy", () => {
      const al: HAZInput = makeInput("aluminum");
      const steel: HAZInput = makeInput("steel");

      const alResult = wedmHeatAffectedZoneEngine.predict(al);
      const steelResult = wedmHeatAffectedZoneEngine.predict(steel);

      // Aluminum conducts heat away faster
      expect(alResult.coolingRateCperS).toBeGreaterThan(steelResult.coolingRateCperS);
    });
  });

  describe("risk assessment", () => {
    it("returns low risk for finish pass with low current", () => {
      const input: HAZInput = {
        material: "steel",
        thicknessMm: 20,
        peakCurrentA: 2,
        voltageV: 40,
        pulseOnUs: 1,
        pulseOffUs: 30,
        wireDiameterMm: 0.20,
        wireMaterial: "brass",
        passType: "finish",
        flushingMode: "submerged",
      };

      const result = wedmHeatAffectedZoneEngine.predict(input);

      expect(result.thermalDamageRisk).toBe("low");
    });

    it("returns high or critical risk for aggressive roughing on inconel", () => {
      const input: HAZInput = {
        material: "inconel",
        thicknessMm: 50,
        peakCurrentA: 20,
        voltageV: 120,
        pulseOnUs: 10,
        pulseOffUs: 10,
        wireDiameterMm: 0.30,
        wireMaterial: "brass",
        passType: "rough",
        flushingMode: "none",
      };

      const result = wedmHeatAffectedZoneEngine.predict(input);

      expect(["high", "critical"]).toContain(result.thermalDamageRisk);
    });

    it("fatigue life reduction is between 0 and 1", () => {
      const input: HAZInput = makeInput("tool_steel");
      const result = wedmHeatAffectedZoneEngine.predict(input);

      expect(result.fatigueLifeReduction).toBeGreaterThanOrEqual(0);
      expect(result.fatigueLifeReduction).toBeLessThanOrEqual(1);
    });
  });

  describe("recommendStockAllowance()", () => {
    it("returns positive minimum and recommended allowance", () => {
      const input: HAZInput = makeInput("tool_steel");

      const result = wedmHeatAffectedZoneEngine.recommendStockAllowance(input);

      expect(result.minimumAllowanceMm).toBeGreaterThan(0);
      expect(result.recommendedAllowanceMm).toBeGreaterThanOrEqual(result.minimumAllowanceMm);
      expect(result.safetyFactor).toBeGreaterThanOrEqual(1);
    });

    it("higher risk produces larger safety factor", () => {
      const lowRisk: HAZInput = {
        material: "steel",
        thicknessMm: 20,
        peakCurrentA: 3,
        voltageV: 50,
        pulseOnUs: 2,
        pulseOffUs: 30,
        wireDiameterMm: 0.20,
        wireMaterial: "brass",
        passType: "finish",
      };

      const highRisk: HAZInput = {
        ...lowRisk,
        peakCurrentA: 15,
        voltageV: 100,
        pulseOnUs: 8,
        passType: "rough",
      };

      const lowResult = wedmHeatAffectedZoneEngine.recommendStockAllowance(lowRisk);
      const highResult = wedmHeatAffectedZoneEngine.recommendStockAllowance(highRisk);

      expect(highResult.safetyFactor).toBeGreaterThanOrEqual(lowResult.safetyFactor);
    });

    it("includes rationale with HAZ depth", () => {
      const input: HAZInput = makeInput("tool_steel");
      const result = wedmHeatAffectedZoneEngine.recommendStockAllowance(input);

      expect(result.rationale).toContain("HAZ depth");
      expect(result.rationale.length).toBeGreaterThan(20);
    });
  });

  describe("compareParameters()", () => {
    it("returns predictions array matching input length", () => {
      const inputs: HAZInput[] = [
        makeInput("tool_steel"),
        { ...makeInput("tool_steel"), peakCurrentA: 5 },
        { ...makeInput("tool_steel"), peakCurrentA: 15 },
      ];

      const result = wedmHeatAffectedZoneEngine.compareParameters(inputs);

      expect(result.predictions.length).toBe(3);
      expect(result.bestIndex).toBeGreaterThanOrEqual(0);
      expect(result.bestIndex).toBeLessThan(3);
    });

    it("comparison includes HAZ depth, cooling rate, and fatigue", () => {
      const inputs: HAZInput[] = [
        makeInput("tool_steel"),
        { ...makeInput("tool_steel"), peakCurrentA: 12 },
      ];

      const result = wedmHeatAffectedZoneEngine.compareParameters(inputs);

      const paramNames = result.comparison.map(c => c.parameter);
      expect(paramNames).toContain("HAZ Depth (µm)");
      expect(paramNames).toContain("Cooling Rate (°C/s)");
      expect(paramNames).toContain("Fatigue Reduction");
    });

    it("best index favors lower HAZ depth", () => {
      const inputs: HAZInput[] = [
        { ...makeInput("tool_steel"), peakCurrentA: 15, pulseOnUs: 8 }, // high energy
        { ...makeInput("tool_steel"), peakCurrentA: 3, pulseOnUs: 2 },  // low energy
      ];

      const result = wedmHeatAffectedZoneEngine.compareParameters(inputs);

      // Lower energy should be selected as best (index 1)
      expect(result.predictions[1].hazDepthUm).toBeLessThan(result.predictions[0].hazDepthUm);
      expect(result.bestIndex).toBe(1);
    });
  });

  describe("mitigation suggestions", () => {
    it("suggests flushing when flushingMode is none", () => {
      const input: HAZInput = {
        ...makeInput("tool_steel"),
        flushingMode: "none",
        peakCurrentA: 12,
      };

      const result = wedmHeatAffectedZoneEngine.predict(input);

      const hasFlushing = result.mitigationSuggestions.some(s =>
        s.toLowerCase().includes("flush")
      );
      expect(hasFlushing).toBe(true);
    });

    it("suggests heat treatment for high risk", () => {
      const input: HAZInput = {
        material: "tool_steel",
        thicknessMm: 50,
        peakCurrentA: 20,
        voltageV: 120,
        pulseOnUs: 10,
        pulseOffUs: 10,
        wireDiameterMm: 0.30,
        wireMaterial: "brass",
        passType: "rough",
      };

      const result = wedmHeatAffectedZoneEngine.predict(input);

      if (result.thermalDamageRisk === "high" || result.thermalDamageRisk === "critical") {
        const hasHeatTreat = result.mitigationSuggestions.some(s =>
          s.toLowerCase().includes("heat treatment") || s.toLowerCase().includes("stress relief")
        );
        expect(hasHeatTreat).toBe(true);
      }
    });
  });
});

// ============================================================================
// HELPERS
// ============================================================================

function makeInput(material: string): HAZInput {
  return {
    material,
    thicknessMm: 25,
    peakCurrentA: 8,
    voltageV: 80,
    pulseOnUs: 4,
    pulseOffUs: 20,
    wireDiameterMm: 0.25,
    wireMaterial: "brass",
  };
}
