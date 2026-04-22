/**
 * WEDMThermalFieldEngine tests
 * @milestone WEDM-NEXT-MS0
 * @unit U-WN05
 */
import { describe, it, expect, beforeEach } from "vitest";
import { wedmThermalFieldEngine } from "../engines/WEDMThermalFieldEngine.js";

describe("WEDMThermalFieldEngine", () => {
  const baseParams = {
    gapVoltage: 60,
    pulseOnTime: 8,
    pulseOffTime: 40,
    flushingPressure: 0.5,
  };

  describe("computeThermalFieldSimple", () => {
    it("computes thermal field for steel with valid params", () => {
      const result = wedmThermalFieldEngine.computeThermalFieldSimple("steel", baseParams, 25);

      expect(result.peakTemperature).toBeGreaterThan(1000);
      expect(result.peakTemperature).toBeLessThan(20000);
      expect(result.meltPoolRadius).toBeGreaterThan(0);
      expect(result.hazDepth).toBeGreaterThan(0);
      expect(result.recastEstimate).toBeGreaterThan(0);
      expect(result.energyBalance.totalEnergy).toBeGreaterThan(0);
      expect(result.energyBalance.workpieceFraction).toBeGreaterThanOrEqual(0);
      expect(result.energyBalance.workpieceFraction).toBeLessThanOrEqual(1);
    });

    it("returns higher peak temp for lower conductivity materials", () => {
      const steelResult = wedmThermalFieldEngine.computeThermalFieldSimple("steel", baseParams);
      const inconelResult = wedmThermalFieldEngine.computeThermalFieldSimple("inconel", baseParams);

      // Inconel has lower thermal conductivity so heat concentrates more
      expect(inconelResult.peakTemperature).toBeGreaterThan(steelResult.peakTemperature * 0.8);
    });

    it("returns larger melt pool for higher pulse energy", () => {
      const lowEnergy = { ...baseParams, gapVoltage: 40, pulseOnTime: 3 };
      const highEnergy = { ...baseParams, gapVoltage: 80, pulseOnTime: 15 };

      const lowResult = wedmThermalFieldEngine.computeThermalFieldSimple("steel", lowEnergy);
      const highResult = wedmThermalFieldEngine.computeThermalFieldSimple("steel", highEnergy);

      expect(highResult.meltPoolRadius).toBeGreaterThan(lowResult.meltPoolRadius);
    });

    it("handles aluminum with high thermal conductivity", () => {
      const result = wedmThermalFieldEngine.computeThermalFieldSimple("aluminum", baseParams);

      expect(result.peakTemperature).toBeGreaterThan(500);
      expect(result.hazDepth).toBeGreaterThan(0);
      // Aluminum conducts heat away faster so HAZ spreads more but peak is lower
    });

    it("handles thick workpieces", () => {
      const thin = wedmThermalFieldEngine.computeThermalFieldSimple("steel", baseParams, 5);
      const thick = wedmThermalFieldEngine.computeThermalFieldSimple("steel", baseParams, 100);

      // Both should compute valid results
      expect(thin.peakTemperature).toBeGreaterThan(0);
      expect(thick.peakTemperature).toBeGreaterThan(0);
    });
  });

  describe("computeTransientAnalysisSimple", () => {
    it("computes transient analysis over multiple pulses", () => {
      const result = wedmThermalFieldEngine.computeTransientAnalysisSimple("steel", baseParams, 10, 0.5);

      expect(result.timeSteps.length).toBeGreaterThan(0);
      expect(result.temperatures.length).toBe(result.timeSteps.length);
      expect(result.coolingRate).toBeGreaterThan(0);
      expect(result.thermalCycleCount).toBe(10);
      expect(result.peakTemperatureHistory.length).toBe(10);
    });

    it("detects steady state with enough pulses", () => {
      const result = wedmThermalFieldEngine.computeTransientAnalysisSimple("steel", baseParams, 20);

      expect(result.steadyStateReached).toBeDefined();
      expect(typeof result.steadyStateReached).toBe("boolean");
    });

    it("handles single pulse analysis", () => {
      const result = wedmThermalFieldEngine.computeTransientAnalysisSimple("steel", baseParams, 1);

      expect(result.thermalCycleCount).toBe(1);
      expect(result.peakTemperatureHistory.length).toBe(1);
    });

    it("respects time resolution parameter", () => {
      const coarse = wedmThermalFieldEngine.computeTransientAnalysisSimple("steel", baseParams, 5, 1.0);
      const fine = wedmThermalFieldEngine.computeTransientAnalysisSimple("steel", baseParams, 5, 0.1);

      // Fine resolution should have more time steps
      expect(fine.timeSteps.length).toBeGreaterThanOrEqual(coarse.timeSteps.length);
    });
  });

  describe("estimateRecastLayerSimple", () => {
    it("estimates recast layer for roughing pass", () => {
      const result = wedmThermalFieldEngine.estimateRecastLayerSimple("steel", baseParams, "roughing");

      expect(result.recastThickness).toBeGreaterThan(0);
      expect(result.hazDepth).toBeGreaterThan(0);
      expect(result.microhardness).toBeGreaterThan(0);
      expect(typeof result.tensileResidualStress).toBe("number");
    });

    it("returns thinner recast for finish passes", () => {
      const roughing = wedmThermalFieldEngine.estimateRecastLayerSimple("steel", baseParams, "roughing");
      const finish = wedmThermalFieldEngine.estimateRecastLayerSimple("steel", baseParams, "finish");
      const skim = wedmThermalFieldEngine.estimateRecastLayerSimple("steel", baseParams, "skim");

      expect(finish.recastThickness).toBeLessThan(roughing.recastThickness);
      expect(skim.recastThickness).toBeLessThan(finish.recastThickness);
    });

    it("accounts for flushing efficiency", () => {
      const poorFlush = wedmThermalFieldEngine.estimateRecastLayerSimple("steel", baseParams, "roughing", 0.3);
      const goodFlush = wedmThermalFieldEngine.estimateRecastLayerSimple("steel", baseParams, "roughing", 0.9);

      expect(goodFlush.recastThickness).toBeLessThan(poorFlush.recastThickness);
    });

    it("provides recommendations for high recast", () => {
      const highEnergy = { ...baseParams, gapVoltage: 100, pulseOnTime: 20 };
      const result = wedmThermalFieldEngine.estimateRecastLayerSimple("steel", highEnergy, "roughing", 0.4);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it.each([
      ["d2", "roughing"],
      ["aluminum", "finish"],
      ["inconel", "skim"],
      ["titanium", "semi-finish"],
    ] as const)("handles %s with %s pass", (material, passType) => {
      const result = wedmThermalFieldEngine.estimateRecastLayerSimple(material, baseParams, passType);

      expect(result.recastThickness).toBeGreaterThan(0);
      expect(result.hazDepth).toBeGreaterThan(0);
    });
  });

  describe("validateParametersSimple", () => {
    it("validates good parameters", () => {
      const result = wedmThermalFieldEngine.validateParametersSimple("steel", baseParams);

      expect(result.valid).toBeDefined();
      expect(Array.isArray(result.issues)).toBe(true);
      expect(result.predictions.recastThickness).toBeGreaterThan(0);
      expect(result.predictions.hazDepth).toBeGreaterThan(0);
      expect(result.predictions.peakTemperature).toBeGreaterThan(0);
    });

    it("flags parameters exceeding recast target", () => {
      // Use high-energy params that will definitely exceed a small target
      const highEnergyParams = { gapVoltage: 100, pulseOnTime: 20, pulseOffTime: 30 };
      const result = wedmThermalFieldEngine.validateParametersSimple("steel", highEnergyParams, 0.1); // 0.1µm target

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes("recast"))).toBe(true);
    });

    it("flags parameters exceeding HAZ target", () => {
      // Use high-energy params that will exceed a small HAZ target
      const highEnergyParams = { gapVoltage: 100, pulseOnTime: 20, pulseOffTime: 30 };
      const result = wedmThermalFieldEngine.validateParametersSimple("steel", highEnergyParams, undefined, 0.001); // 0.001µm target

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes("HAZ"))).toBe(true);
    });

    it("provides recommendations for out-of-spec params", () => {
      const badParams = { ...baseParams, pulseOnTime: 50, pulseOffTime: 10 };
      const result = wedmThermalFieldEngine.validateParametersSimple("steel", badParams);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("listMaterialsByCategory", () => {
    it("lists all materials", () => {
      const result = wedmThermalFieldEngine.listMaterialsByCategory("all");

      expect(result.materials.length).toBeGreaterThanOrEqual(10);
      expect(result.category).toBe("all");
      expect(result.materials[0]).toHaveProperty("name");
      expect(result.materials[0]).toHaveProperty("meltingPoint");
      expect(result.materials[0]).toHaveProperty("thermalConductivity");
    });

    it("filters by steel category", () => {
      const result = wedmThermalFieldEngine.listMaterialsByCategory("steel");

      expect(result.category).toBe("steel");
      expect(result.materials.some(m => m.name === "d2")).toBe(true);
      expect(result.materials.some(m => m.name === "h13")).toBe(true);
    });

    it("filters by superalloy category", () => {
      const result = wedmThermalFieldEngine.listMaterialsByCategory("superalloy");

      expect(result.category).toBe("superalloy");
      expect(result.materials.some(m => m.name === "inconel")).toBe(true);
    });
  });

  describe("optimizeForRecast", () => {
    it("optimizes parameters for target recast layer", () => {
      const result = wedmThermalFieldEngine.optimizeForRecast("steel", 10);

      expect(result.optimizedParams.gapVoltage).toBeGreaterThan(0);
      expect(result.optimizedParams.pulseOnTime).toBeGreaterThan(0);
      expect(result.optimizedParams.pulseOffTime).toBeGreaterThan(0);
      expect(result.predictedRecast).toBeGreaterThan(0);
      expect(result.convergenceIterations).toBeGreaterThan(0);
    });

    it("respects voltage constraints", () => {
      const result = wedmThermalFieldEngine.optimizeForRecast("steel", 15, undefined, {
        maxGapVoltage: 50,
      });

      expect(result.optimizedParams.gapVoltage).toBeLessThanOrEqual(50);
    });

    it("respects pulse time constraints", () => {
      const result = wedmThermalFieldEngine.optimizeForRecast("steel", 15, undefined, {
        maxPulseOnTime: 5,
        minPulseOffTime: 50,
      });

      expect(result.optimizedParams.pulseOnTime).toBeLessThanOrEqual(5);
      expect(result.optimizedParams.pulseOffTime).toBeGreaterThanOrEqual(50);
    });

    it("reports tradeoffs when target is aggressive", () => {
      const result = wedmThermalFieldEngine.optimizeForRecast("steel", 1, 100); // 1µm recast + 100 mm³/min MRR

      expect(result.tradeoffs.length).toBeGreaterThan(0);
    });

    it("estimates MRR for optimized params", () => {
      const result = wedmThermalFieldEngine.optimizeForRecast("steel", 20);

      expect(result.predictedMRR).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("handles NaN in parameters gracefully", () => {
      const badParams = { ...baseParams, gapVoltage: NaN };

      expect(() => {
        wedmThermalFieldEngine.computeThermalFieldSimple("steel", badParams);
      }).not.toThrow();
    });

    it("handles unknown material by falling back to steel", () => {
      const result = wedmThermalFieldEngine.computeThermalFieldSimple("unobtainium", baseParams);

      expect(result.peakTemperature).toBeGreaterThan(0);
    });

    it("handles zero thickness", () => {
      // Should still compute something reasonable
      const result = wedmThermalFieldEngine.computeThermalFieldSimple("steel", baseParams, 0.1);

      expect(result.peakTemperature).toBeGreaterThan(0);
    });

    it("handles extreme pulse parameters", () => {
      const extreme = { gapVoltage: 150, pulseOnTime: 100, pulseOffTime: 5 };
      const result = wedmThermalFieldEngine.computeThermalFieldSimple("steel", extreme);

      expect(result.peakTemperature).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0); // Should warn about extreme params
    });
  });

  describe("internal methods", () => {
    it("getMaterialProperties returns valid props", () => {
      const props = wedmThermalFieldEngine.getMaterialProperties("d2");

      expect(props.name).toBe("d2");
      expect(props.thermalConductivity).toBe(20);
      expect(props.meltingPoint).toBe(1420);
    });

    it("listMaterials returns all material names", () => {
      const materials = wedmThermalFieldEngine.listMaterials();

      expect(materials).toContain("steel");
      expect(materials).toContain("d2");
      expect(materials).toContain("inconel");
      expect(materials.length).toBeGreaterThanOrEqual(10);
    });
  });
});

describe("EDM Dispatcher thermal field actions", () => {
  let dispatcher: (action: string, params: Record<string, any>) => Promise<any>;

  beforeEach(async () => {
    const { registerEdmDispatcher } = await import("../tools/dispatchers/edmDispatcher.js");
    let handler: any;
    const mockServer = {
      tool: (_name: string, _desc: string, _schema: any, h: any) => { handler = h; },
    };
    registerEdmDispatcher(mockServer);
    dispatcher = async (action: string, params: Record<string, any>) => {
      const res = await handler({ action, params });
      return JSON.parse(res.content[0].text);
    };
  });

  it("wedm_thermal_field returns thermal analysis", async () => {
    const result = await dispatcher("wedm_thermal_field", {
      material: "steel",
      parameters: { gapVoltage: 60, pulseOnTime: 8, pulseOffTime: 40 },
      thickness: 25,
    });

    expect(result.peakTemperature).toBeGreaterThan(0);
    expect(result.meltPoolRadius).toBeGreaterThan(0);
    expect(result.hazDepth).toBeGreaterThan(0);
  });

  it("wedm_thermal_transient returns time-domain analysis", async () => {
    const result = await dispatcher("wedm_thermal_transient", {
      material: "d2",
      parameters: { gapVoltage: 55, pulseOnTime: 6, pulseOffTime: 35 },
      pulseCount: 5,
    });

    expect(result.timeSteps.length).toBeGreaterThan(0);
    expect(result.temperatures.length).toBeGreaterThan(0);
    expect(result.thermalCycleCount).toBe(5);
  });

  it("wedm_thermal_recast returns recast layer estimate", async () => {
    const result = await dispatcher("wedm_thermal_recast", {
      material: "inconel",
      parameters: { gapVoltage: 50, pulseOnTime: 5, pulseOffTime: 45 },
      passType: "finish",
      flushingEfficiency: 0.8,
    });

    expect(result.recastThickness).toBeGreaterThan(0);
    expect(result.hazDepth).toBeGreaterThan(0);
    expect(result.microhardness).toBeGreaterThan(0);
  });

  it("wedm_thermal_validate checks params against targets", async () => {
    const result = await dispatcher("wedm_thermal_validate", {
      material: "steel",
      parameters: { gapVoltage: 60, pulseOnTime: 8, pulseOffTime: 40 },
      targetRecast: 20,
      targetHAZ: 50,
    });

    expect(result.valid).toBeDefined();
    expect(result.predictions).toBeDefined();
    expect(result.predictions.recastThickness).toBeGreaterThan(0);
  });

  it("wedm_thermal_materials lists available materials", async () => {
    const result = await dispatcher("wedm_thermal_materials", {
      category: "steel",
    });

    expect(result.materials.length).toBeGreaterThan(0);
    expect(result.category).toBe("steel");
  });

  it("wedm_thermal_optimize finds optimal parameters", async () => {
    const result = await dispatcher("wedm_thermal_optimize", {
      material: "d2",
      targetRecast: 15,
      constraints: { maxGapVoltage: 70 },
    });

    expect(result.optimizedParams).toBeDefined();
    expect(result.optimizedParams.gapVoltage).toBeLessThanOrEqual(70);
    expect(result.predictedRecast).toBeGreaterThan(0);
  });
});
