/**
 * MillingPhysicsKernel Extended Wiring — MS-WIRE-1 batch 3
 *
 * Tests 12 additional engines: 5 thermal + 4 stability + 3 surface.
 */

import { describe, it, expect } from "vitest";
import { millingPhysicsKernelEngine } from "../engines/MillingPhysicsKernelEngine.js";

describe("MillingPhysicsKernel: Extended wiring (MS-WIRE-1 batch 3)", () => {
  describe("extended thermal methods", () => {
    it("calculateThermalFatigue is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateThermalFatigue).toBe("function");
    });

    it("calculateThermalGrowthCompensation is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateThermalGrowthCompensation).toBe("function");
    });

    it("calculateThermalExpansionJoint is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateThermalExpansionJoint).toBe("function");
    });

    it("calculateThermalSpray is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateThermalSpray).toBe("function");
    });

    it("calculateInverseThermal is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateInverseThermal).toBe("function");
    });
  });

  describe("extended stability methods", () => {
    it("calculateVAM is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateVAM).toBe("function");
    });

    it("calculateVibrationDampening is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateVibrationDampening).toBe("function");
    });

    it("calculateVibrationIsolation is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateVibrationIsolation).toBe("function");
    });

    it("calculateVibrationIsolator is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateVibrationIsolator).toBe("function");
    });
  });

  describe("extended surface methods", () => {
    it("calculateContactMechanicsSurface is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateContactMechanicsSurface).toBe("function");
    });

    it("getSurfaceFinishDatabase returns database engine", () => {
      const db = millingPhysicsKernelEngine.getSurfaceFinishDatabase();
      expect(db).toBeDefined();
    });

    it("calculateSurfaceTreatment is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateSurfaceTreatment).toBe("function");
    });
  });

  describe("wiring registry updates", () => {
    it("thermal count is 16", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.thermal).toBe(16);
    });

    it("stability count is 14", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.stability).toBe(14);
    });

    it("surface count >= 10", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.surface).toBeGreaterThanOrEqual(10);
    });

    it("total_engines >= 76", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.total_engines).toBeGreaterThanOrEqual(76);
    });

    it("all 12 new engines registered by name", () => {
      const wired = millingPhysicsKernelEngine.getWiredEngines();
      const names = wired.join(" ");
      // Thermal
      expect(names).toContain("ThermalFatigueEngine");
      expect(names).toContain("ThermalGrowthCompensationEngine");
      expect(names).toContain("ThermalExpansionJointEngine");
      expect(names).toContain("ThermalSprayEngine");
      expect(names).toContain("InverseThermalCompensationEngine");
      // Stability
      expect(names).toContain("VibrationAssistedMachiningEngine");
      expect(names).toContain("VibrationDampeningEngine");
      expect(names).toContain("VibrationIsolationEngine");
      expect(names).toContain("VibrationIsolatorEngine");
      // Surface
      expect(names).toContain("ContactMechanicsSurfaceEngine");
      expect(names).toContain("SurfaceFinishDatabaseEngine");
      expect(names).toContain("SurfaceTreatmentEngine");
    });
  });
});
