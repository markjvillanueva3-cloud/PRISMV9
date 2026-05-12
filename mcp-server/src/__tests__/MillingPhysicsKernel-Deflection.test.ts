/**
 * MillingPhysicsKernel Deflection Wiring — MS-WIRE-1/U-WIRE-04
 *
 * Tests 7 deflection engines wired through MillingPhysicsKernelEngine facade.
 */

import { describe, it, expect } from "vitest";
import { millingPhysicsKernelEngine } from "../engines/MillingPhysicsKernelEngine.js";

describe("MillingPhysicsKernel: Deflection wiring (MS-WIRE-1/U-WIRE-04)", () => {
  describe("deflection method accessibility", () => {
    it("calculatePartDeflection is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculatePartDeflection).toBe("function");
    });

    it("calculateBoringBarDeflection is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateBoringBarDeflection).toBe("function");
    });

    it("calculateStochasticDeflection is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateStochasticDeflection).toBe("function");
    });

    it("calculateTimoshenkoDeflection is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateTimoshenkoDeflection).toBe("function");
    });

    it("calculateAssemblyDeflection is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateAssemblyDeflection).toBe("function");
    });

    it("calculateWorkpieceCompensation is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateWorkpieceCompensation).toBe("function");
    });

    it("predictSurfaceLocationError is callable", () => {
      expect(typeof millingPhysicsKernelEngine.predictSurfaceLocationError).toBe("function");
    });
  });

  describe("wiring registry", () => {
    it("getWiredEngines includes all 7 deflection engines", () => {
      const wired = millingPhysicsKernelEngine.getWiredEngines();
      const names = wired.join(" ");
      expect(names).toContain("PartDeflectionEngine");
      expect(names).toContain("BoringBarDeflectionEngine");
      expect(names).toContain("StochasticDeflectionEngine");
      expect(names).toContain("TimoshenkoDeflectionEngine");
      expect(names).toContain("ToolAssemblyDeflectionEngine");
      expect(names).toContain("WorkpieceDeflectionCompensationEngine");
      expect(names).toContain("SurfaceLocationErrorEngine");
    });

    it("getWiringStats reports deflection count of 8", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.deflection).toBe(8); // ToolDeflectionPrediction + 7 new
    });

    it("total_engines >= 41", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.total_engines).toBeGreaterThanOrEqual(41);
    });
  });
});
