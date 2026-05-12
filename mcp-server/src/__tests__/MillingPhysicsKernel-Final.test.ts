/**
 * MillingPhysicsKernel Final Batch — Surface geometry + Spindle monitoring
 * MS-WIRE-1 final: reach 94 engines (~97% of target)
 */

import { describe, it, expect } from "vitest";
import { millingPhysicsKernelEngine } from "../engines/MillingPhysicsKernelEngine.js";

describe("MillingPhysicsKernel: Final batch wiring (MS-WIRE-1 completion)", () => {
  describe("surface geometry methods", () => {
    it("getOffsetSurface returns engine", () => {
      expect(millingPhysicsKernelEngine.getOffsetSurface()).toBeDefined();
    });

    it("getParametricSurface returns engine", () => {
      expect(millingPhysicsKernelEngine.getParametricSurface()).toBeDefined();
    });

    it("getSurfaceReconstruction returns engine", () => {
      expect(millingPhysicsKernelEngine.getSurfaceReconstruction()).toBeDefined();
    });

    it("getSurfaceIntersection returns engine", () => {
      expect(millingPhysicsKernelEngine.getSurfaceIntersection()).toBeDefined();
    });
  });

  describe("spindle monitoring methods", () => {
    it("getSpindleLoadMonitor returns engine", () => {
      expect(millingPhysicsKernelEngine.getSpindleLoadMonitor()).toBeDefined();
    });

    it("getSpindleSpeedVariation returns engine", () => {
      expect(millingPhysicsKernelEngine.getSpindleSpeedVariation()).toBeDefined();
    });

    it("getSpindleHarmonicsQuality returns engine", () => {
      expect(millingPhysicsKernelEngine.getSpindleHarmonicsQuality()).toBeDefined();
    });

    it("getSpindleProtection returns engine", () => {
      expect(millingPhysicsKernelEngine.getSpindleProtection()).toBeDefined();
    });

    it("getAdaptiveSpindleControl returns engine", () => {
      expect(millingPhysicsKernelEngine.getAdaptiveSpindleControl()).toBeDefined();
    });
  });

  describe("final wiring stats", () => {
    it("surface count is 14", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.surface).toBe(14);
    });

    it("spindle_power count is 10", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.spindle_power).toBe(10);
    });

    it("total_engines is 94", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.total_engines).toBe(94);
    });

    it("total_functions is 104", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.total_functions).toBe(104);
    });
  });

  describe("final completeness audit", () => {
    it("all 9 new engines registered by name", () => {
      const wired = millingPhysicsKernelEngine.getWiredEngines();
      const names = wired.join(" ");
      // Surface
      expect(names).toContain("OffsetSurfaceEngine");
      expect(names).toContain("ParametricSurfaceEngine");
      expect(names).toContain("SurfaceReconstructionEngine");
      expect(names).toContain("SurfaceIntersectionEngine");
      // Spindle monitoring
      expect(names).toContain("SpindleLoadMonitorEngine");
      expect(names).toContain("SpindleSpeedVariationEngine");
      expect(names).toContain("SpindleHarmonicsQualityEngine");
      expect(names).toContain("SpindleProtectionEngine");
      expect(names).toContain("AdaptiveSpindleControlEngine");
    });

    it("kernel wiring covers all 9 layers", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.force).toBeGreaterThan(0);
      expect(stats.thermal).toBeGreaterThan(0);
      expect(stats.deflection).toBeGreaterThan(0);
      expect(stats.stability).toBeGreaterThan(0);
      expect(stats.surface).toBeGreaterThan(0);
      expect(stats.wear_life).toBeGreaterThan(0);
      expect(stats.material).toBeGreaterThan(0);
      expect(stats.spindle_power).toBeGreaterThan(0);
      expect(stats.workholding).toBeGreaterThan(0);
    });
  });
});
