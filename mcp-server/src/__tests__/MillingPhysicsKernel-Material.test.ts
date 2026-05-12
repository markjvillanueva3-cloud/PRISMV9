/**
 * MillingPhysicsKernel Material Wiring — MS-WIRE-1/Material layer
 *
 * Tests 5 material engines wired through MillingPhysicsKernelEngine.
 */

import { describe, it, expect } from "vitest";
import { millingPhysicsKernelEngine } from "../engines/MillingPhysicsKernelEngine.js";

describe("MillingPhysicsKernel: Material wiring (MS-WIRE-1/Material)", () => {
  describe("material method accessibility", () => {
    it("calculateJohnsonCookFlowStress is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateJohnsonCookFlowStress).toBe("function");
    });

    it("getJohnsonCookParams is callable", () => {
      expect(typeof millingPhysicsKernelEngine.getJohnsonCookParams).toBe("function");
    });

    it("applyConstitutiveModel is callable", () => {
      expect(typeof millingPhysicsKernelEngine.applyConstitutiveModel).toBe("function");
    });

    it("interpolateMaterial is callable", () => {
      expect(typeof millingPhysicsKernelEngine.interpolateMaterial).toBe("function");
    });

    it("findMaterialEquivalent is callable", () => {
      expect(typeof millingPhysicsKernelEngine.findMaterialEquivalent).toBe("function");
    });

    it("analyzeMaterialBatchVariability is callable", () => {
      expect(typeof millingPhysicsKernelEngine.analyzeMaterialBatchVariability).toBe("function");
    });
  });

  describe("delegation spot checks", () => {
    it("interpolateMaterial list returns array", () => {
      const mats = millingPhysicsKernelEngine.interpolateMaterial("list");
      expect(Array.isArray(mats)).toBe(true);
    });

    it("Voce hardening model returns result", () => {
      const result = millingPhysicsKernelEngine.applyConstitutiveModel("voceHardening", {
        strain: 0.1,
        sigma_0_MPa: 300,
        sigma_s_MPa: 600,
        epsilon_c: 0.1,
      });
      expect(result).toBeDefined();
    });

    it("Zerilli-Armstrong returns stress result", () => {
      const result = millingPhysicsKernelEngine.applyConstitutiveModel("zerilliArmstrong", {
        strain: 0.1,
        strain_rate: 1000,
        temperature_C: 25,
        crystal_structure: "FCC",
        constants: { C0: 50, C1: 100, C2: 890, C3: 0.0025, C4: 0.0001, C5: 300, n: 0.5 },
      });
      expect(result).toBeDefined();
    });
  });

  describe("wiring registry", () => {
    it("getWiredEngines includes all 5 material engines", () => {
      const wired = millingPhysicsKernelEngine.getWiredEngines();
      const names = wired.join(" ");
      expect(names).toContain("JohnsonCookEngine");
      expect(names).toContain("ConstitutiveModelEngine");
      expect(names).toContain("MaterialInterpolationEngine");
      expect(names).toContain("MaterialEquivalenceEngine");
      expect(names).toContain("MaterialBatchVariabilityEngine");
    });

    it("getWiringStats reports material=5", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.material).toBe(5);
    });

    it("total_engines >= 64", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.total_engines).toBeGreaterThanOrEqual(64);
    });
  });
});
