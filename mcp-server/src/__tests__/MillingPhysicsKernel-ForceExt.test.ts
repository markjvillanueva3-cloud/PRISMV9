/**
 * MillingPhysicsKernel Force Extension Wiring — MS-WIRE-1/U-WIRE-01 extension
 *
 * Tests 6 additional force/physics engines wired through MillingPhysicsKernelEngine.
 */

import { describe, it, expect } from "vitest";
import { millingPhysicsKernelEngine } from "../engines/MillingPhysicsKernelEngine.js";

describe("MillingPhysicsKernel: Force extension wiring (MS-WIRE-1/U-WIRE-01)", () => {
  describe("force extension method accessibility", () => {
    it("analyzeCuttingMechanics is callable", () => {
      expect(typeof millingPhysicsKernelEngine.analyzeCuttingMechanics).toBe("function");
    });

    it("analyzeAdvancedCuttingPhysics is callable", () => {
      expect(typeof millingPhysicsKernelEngine.analyzeAdvancedCuttingPhysics).toBe("function");
    });

    it("getAdvancedCuttingPhysicsExt is callable", () => {
      expect(typeof millingPhysicsKernelEngine.getAdvancedCuttingPhysicsExt).toBe("function");
    });

    it("analyzeFundamentalPhysics is callable", () => {
      expect(typeof millingPhysicsKernelEngine.analyzeFundamentalPhysics).toBe("function");
    });

    it("calculateDrillBreakthroughForce is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateDrillBreakthroughForce).toBe("function");
    });

    it("getCutterContactEngine is callable", () => {
      expect(typeof millingPhysicsKernelEngine.getCutterContactEngine).toBe("function");
    });
  });

  describe("delegation spot checks", () => {
    it("listMaterials returns array from CuttingMechanicsEngine", () => {
      const materials = millingPhysicsKernelEngine.analyzeCuttingMechanics("listMaterials");
      expect(Array.isArray(materials)).toBe(true);
    });

    it("getAdvancedCuttingPhysicsExt returns engine object", () => {
      const engine = millingPhysicsKernelEngine.getAdvancedCuttingPhysicsExt();
      expect(engine).toBeDefined();
    });

    it("getCutterContactEngine returns module with expected exports", () => {
      const engine = millingPhysicsKernelEngine.getCutterContactEngine();
      expect(engine).toBeDefined();
      expect(typeof engine.computeCC).toBe("function");
      expect(typeof engine.computeScallopHeight).toBe("function");
    });
  });

  describe("wiring registry", () => {
    it("getWiredEngines includes all 6 new force engines", () => {
      const wired = millingPhysicsKernelEngine.getWiredEngines();
      const names = wired.join(" ");
      expect(names).toContain("CuttingMechanicsEngine");
      expect(names).toContain("AdvancedCuttingPhysicsEngine");
      expect(names).toContain("AdvancedCuttingPhysicsExtEngine");
      expect(names).toContain("FundamentalPhysicsCompletionEngine");
      expect(names).toContain("DrillBreakthroughForceEngine");
      expect(names).toContain("CutterContactEngine");
    });

    it("getWiringStats reports force count of 11", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.force).toBe(11);
    });

    it("total_engines >= 47", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.total_engines).toBeGreaterThanOrEqual(47);
    });
  });
});
