/**
 * MillingPhysicsKernel Thermal + Surface Wiring — MS-WIRE-1/U-WIRE-02 + U-WIRE-06
 *
 * Tests 12 additional thermal/surface engines wired through MillingPhysicsKernelEngine.
 */

import { describe, it, expect } from "vitest";
import { millingPhysicsKernelEngine } from "../engines/MillingPhysicsKernelEngine.js";

describe("MillingPhysicsKernel: Thermal+Surface wiring (MS-WIRE-1/U-WIRE-02+06)", () => {
  describe("thermal method accessibility", () => {
    it("analyzeCuttingThermal is callable", () => {
      expect(typeof millingPhysicsKernelEngine.analyzeCuttingThermal).toBe("function");
    });

    it("analyzeThermalModel is callable", () => {
      expect(typeof millingPhysicsKernelEngine.analyzeThermalModel).toBe("function");
    });

    it("analyzeThermalExpansion is callable", () => {
      expect(typeof millingPhysicsKernelEngine.analyzeThermalExpansion).toBe("function");
    });

    it("analyzeLAMThermal is callable", () => {
      expect(typeof millingPhysicsKernelEngine.analyzeLAMThermal).toBe("function");
    });

    it("analyzeThermalField is callable", () => {
      expect(typeof millingPhysicsKernelEngine.analyzeThermalField).toBe("function");
    });

    it("computeThermalCompensation is callable", () => {
      expect(typeof millingPhysicsKernelEngine.computeThermalCompensation).toBe("function");
    });

    it("predictThermal is callable", () => {
      expect(typeof millingPhysicsKernelEngine.predictThermal).toBe("function");
    });
  });

  describe("surface method accessibility", () => {
    it("predictSurfaceFinish2 is callable", () => {
      expect(typeof millingPhysicsKernelEngine.predictSurfaceFinish2).toBe("function");
    });

    it("calculateSurfaceRoughness2 is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateSurfaceRoughness2).toBe("function");
    });

    it("calculateStochasticSurfaceFinish is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateStochasticSurfaceFinish).toBe("function");
    });

    it("predictSurfaceIntegrity is callable", () => {
      expect(typeof millingPhysicsKernelEngine.predictSurfaceIntegrity).toBe("function");
    });

    it("getRoughnessConverter returns converter engine", () => {
      const converter = millingPhysicsKernelEngine.getRoughnessConverter();
      expect(converter).toBeDefined();
    });
  });

  describe("delegation spot checks", () => {
    it("thermal expansion getCTE returns numeric coefficient for steel", () => {
      const cte = millingPhysicsKernelEngine.analyzeThermalExpansion("getCTE", "steel");
      expect(typeof cte).toBe("number");
      expect(cte).toBeGreaterThan(0);
    });

    it("linear thermal expansion computes length change", () => {
      const result = millingPhysicsKernelEngine.analyzeThermalExpansion("linear", {
        originalLength: 100,
        temperatureChange: 20,
        material: "steel",
      });
      expect(result).toBeDefined();
    });

    it("thermal field grid initializes", () => {
      const grid = millingPhysicsKernelEngine.analyzeThermalField("initialize", {
        width_mm: 50,
        height_mm: 50,
        resolution: 16,
      });
      expect(grid).toBeDefined();
    });
  });

  describe("wiring registry", () => {
    it("getWiredEngines includes all 7 thermal + 5 surface engines", () => {
      const wired = millingPhysicsKernelEngine.getWiredEngines();
      const names = wired.join(" ");
      // Thermal
      expect(names).toContain("CuttingThermalEngine");
      expect(names).toContain("ThermalModelingEngine");
      expect(names).toContain("ThermalExpansionEngine");
      expect(names).toContain("LAMThermalSofteningEngine");
      expect(names).toContain("ThermalFieldToolpathEngine");
      expect(names).toContain("ThermalCompensationModelEngine");
      expect(names).toContain("ThermalSimEngine");
      // Surface
      expect(names).toContain("SurfaceFinishEngine");
      expect(names).toContain("SurfaceRoughnessEngine");
      expect(names).toContain("StochasticSurfaceFinishEngine");
      expect(names).toContain("SurfaceIntegrityPredictorEngine");
      expect(names).toContain("RoughnessConversionEngine");
    });

    it("getWiringStats reports thermal >= 11 and surface >= 7", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.thermal).toBeGreaterThanOrEqual(11);
      expect(stats.surface).toBeGreaterThanOrEqual(7);
    });

    it("total_engines >= 59", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.total_engines).toBeGreaterThanOrEqual(59);
    });
  });
});
