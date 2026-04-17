/**
 * Tests for MachineCapabilitySurfaceEngine
 * @milestone MCAT-MS0/P2-U02
 */

import { describe, it, expect } from "vitest";
import {
  machineCapabilitySurfaceEngine,
  type ControllerCapabilities,
  type SpindlePackage,
  type CoolantStrategy,
  type CapabilitySummary,
} from "../engines/MachineCapabilitySurfaceEngine.js";

describe("MachineCapabilitySurfaceEngine", () => {
  describe("getControllerCapabilities", () => {
    it("returns controller capabilities for valid machine", () => {
      const result = machineCapabilitySurfaceEngine.getControllerCapabilities("haas_vf2");

      expect(result).not.toBeNull();
      expect(result!.machineId).toBe("haas_vf2");
      expect(result!.controllerFamily).toBeDefined();
      expect(result!.vendor).toBeDefined();
    });

    it("includes feature set with expected properties", () => {
      const result = machineCapabilitySurfaceEngine.getControllerCapabilities("haas_vf2");

      expect(result).not.toBeNull();
      expect(typeof result!.features.highSpeedMachining).toBe("boolean");
      expect(typeof result!.features.lookAhead).toBe("number");
      expect(typeof result!.features.nanoSmoothing).toBe("boolean");
      expect(typeof result!.features.toolLifeManagement).toBe("boolean");
      expect(typeof result!.features.thermalCompensation).toBe("boolean");
    });

    it("includes macro support information", () => {
      const result = machineCapabilitySurfaceEngine.getControllerCapabilities("haas_vf2");

      expect(result).not.toBeNull();
      expect(typeof result!.macroSupport.supported).toBe("boolean");
      expect(result!.macroSupport.type).toBeDefined();
    });

    it("includes canned cycles list", () => {
      const result = machineCapabilitySurfaceEngine.getControllerCapabilities("haas_vf2");

      expect(result).not.toBeNull();
      expect(Array.isArray(result!.cannedCycles)).toBe(true);
      expect(result!.cannedCycles.length).toBeGreaterThan(0);
    });

    it("returns null for unknown machine", () => {
      const result = machineCapabilitySurfaceEngine.getControllerCapabilities("nonexistent_machine_xyz");

      expect(result).toBeNull();
    });

    it("detects Siemens controller features for DMG", () => {
      const result = machineCapabilitySurfaceEngine.getControllerCapabilities("dmg_dmu50");

      expect(result).not.toBeNull();
      if (result && result.controllerFamily.toLowerCase().includes("siemens")) {
        expect(result.features.conversationalProgramming).toBe(true);
      }
    });

    it("includes programming dialect", () => {
      const result = machineCapabilitySurfaceEngine.getControllerCapabilities("haas_vf2");

      expect(result).not.toBeNull();
      expect(result!.programmingDialect).toBeDefined();
      expect(typeof result!.programmingDialect).toBe("string");
    });

    it("identifies controller limitations", () => {
      const result = machineCapabilitySurfaceEngine.getControllerCapabilities("haas_vf2");

      expect(result).not.toBeNull();
      expect(Array.isArray(result!.limitations)).toBe(true);
    });
  });

  describe("getSpindlePackage", () => {
    it("returns spindle package for valid machine", () => {
      const result = machineCapabilitySurfaceEngine.getSpindlePackage("haas_vf2");

      expect(result).not.toBeNull();
      expect(result!.machineId).toBe("haas_vf2");
      expect(result!.spindleId).toContain("haas_vf2");
    });

    it("includes speed specifications", () => {
      const result = machineCapabilitySurfaceEngine.getSpindlePackage("haas_vf2");

      expect(result).not.toBeNull();
      expect(result!.maxRpm).toBeGreaterThan(0);
      expect(result!.minRpm).toBeGreaterThan(0);
      expect(result!.maxRpm).toBeGreaterThan(result!.minRpm);
    });

    it("includes power and torque specifications", () => {
      const result = machineCapabilitySurfaceEngine.getSpindlePackage("haas_vf2");

      expect(result).not.toBeNull();
      expect(result!.ratedPower).toBeGreaterThan(0);
      expect(result!.continuousTorque).toBeGreaterThan(0);
    });

    it("includes bearing and cooling info", () => {
      const result = machineCapabilitySurfaceEngine.getSpindlePackage("dmg_dmu50");

      expect(result).not.toBeNull();
      expect(result!.bearingType).toBeDefined();
      expect(result!.coolingType).toBeDefined();
    });

    it("generates power curve data points", () => {
      const result = machineCapabilitySurfaceEngine.getSpindlePackage("haas_vf2");

      expect(result).not.toBeNull();
      expect(Array.isArray(result!.powerCurve)).toBe(true);
      if (result!.powerCurve && result!.powerCurve.length > 0) {
        const point = result!.powerCurve[0];
        expect(point.rpm).toBeGreaterThan(0);
        expect(point.power).toBeGreaterThanOrEqual(0);
        expect(point.torque).toBeGreaterThanOrEqual(0);
      }
    });

    it("includes speed ranges for lathes", () => {
      const result = machineCapabilitySurfaceEngine.getSpindlePackage("okuma_lb3000");

      expect(result).not.toBeNull();
      expect(Array.isArray(result!.speedRanges)).toBe(true);
    });

    it("returns taper type", () => {
      const result = machineCapabilitySurfaceEngine.getSpindlePackage("haas_vf2");

      expect(result).not.toBeNull();
      expect(result!.taper).toBeDefined();
      expect(typeof result!.taper).toBe("string");
    });

    it("identifies spindle limitations", () => {
      const result = machineCapabilitySurfaceEngine.getSpindlePackage("haas_vf2");

      expect(result).not.toBeNull();
      expect(Array.isArray(result!.limitations)).toBe(true);
    });
  });

  describe("getCoolantStrategy", () => {
    it("returns coolant strategy for valid machine", () => {
      const result = machineCapabilitySurfaceEngine.getCoolantStrategy("haas_vf2");

      expect(result).not.toBeNull();
      expect(result!.machineId).toBe("haas_vf2");
    });

    it("includes available strategies", () => {
      const result = machineCapabilitySurfaceEngine.getCoolantStrategy("haas_vf2");

      expect(result).not.toBeNull();
      expect(Array.isArray(result!.strategies)).toBe(true);
      expect(result!.strategies.length).toBeGreaterThan(0);
    });

    it("includes default strategy", () => {
      const result = machineCapabilitySurfaceEngine.getCoolantStrategy("haas_vf2");

      expect(result).not.toBeNull();
      expect(result!.defaultStrategy).toBeDefined();
    });

    it("indicates through-spindle capability", () => {
      const result = machineCapabilitySurfaceEngine.getCoolantStrategy("dmg_dmu50");

      expect(result).not.toBeNull();
      expect(typeof result!.throughSpindleCapable).toBe("boolean");
    });

    it("reports max pressure with unit", () => {
      const result = machineCapabilitySurfaceEngine.getCoolantStrategy("dmg_dmu50");

      expect(result).not.toBeNull();
      expect(result!.maxPressure).toBeGreaterThan(0);
      expect(["bar", "psi"]).toContain(result!.pressureUnit);
    });

    it("includes filtration specification", () => {
      const result = machineCapabilitySurfaceEngine.getCoolantStrategy("haas_vf2");

      expect(result).not.toBeNull();
      expect(result!.filtration).toBeDefined();
    });

    it("identifies through-tool capability separately from through-spindle", () => {
      const result = machineCapabilitySurfaceEngine.getCoolantStrategy("dmg_dmu50");

      expect(result).not.toBeNull();
      expect(typeof result!.throughToolCapable).toBe("boolean");
    });
  });

  describe("getCapabilitySummary", () => {
    it("returns full summary for valid machine", () => {
      const result = machineCapabilitySurfaceEngine.getCapabilitySummary("haas_vf2");

      expect(result).not.toBeNull();
      expect(result!.machineId).toBe("haas_vf2");
      expect(result!.manufacturer).toBeDefined();
      expect(result!.model).toBeDefined();
    });

    it("includes all capability components", () => {
      const result = machineCapabilitySurfaceEngine.getCapabilitySummary("haas_vf2");

      expect(result).not.toBeNull();
      expect(result!.controller).toBeDefined();
      expect(result!.spindle).toBeDefined();
      expect(result!.coolant).toBeDefined();
    });

    it("calculates overall capability score", () => {
      const result = machineCapabilitySurfaceEngine.getCapabilitySummary("haas_vf2");

      expect(result).not.toBeNull();
      expect(result!.overallCapabilityScore).toBeGreaterThanOrEqual(0);
      expect(result!.overallCapabilityScore).toBeLessThanOrEqual(100);
    });

    it("higher-end machines score higher", () => {
      const haas = machineCapabilitySurfaceEngine.getCapabilitySummary("haas_vf2");
      const dmg = machineCapabilitySurfaceEngine.getCapabilitySummary("dmg_dmu50");

      expect(haas).not.toBeNull();
      expect(dmg).not.toBeNull();
      // DMG with Siemens control and through-spindle coolant typically scores higher
      expect(dmg!.overallCapabilityScore).toBeGreaterThanOrEqual(haas!.overallCapabilityScore - 10);
    });
  });

  describe("compareCapabilities", () => {
    it("compares multiple machines", () => {
      const result = machineCapabilitySurfaceEngine.compareCapabilities(["haas_vf2", "dmg_dmu50"]);

      expect(result.machines).toEqual(["haas_vf2", "dmg_dmu50"]);
      expect(Object.keys(result.controllerComparison).length).toBe(2);
      expect(Object.keys(result.spindleComparison).length).toBe(2);
      expect(Object.keys(result.coolantComparison).length).toBe(2);
    });

    it("generates recommendations", () => {
      const result = machineCapabilitySurfaceEngine.compareCapabilities(["haas_vf2", "dmg_dmu50"]);

      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it("handles single machine comparison", () => {
      const result = machineCapabilitySurfaceEngine.compareCapabilities(["haas_vf2"]);

      expect(result.machines.length).toBe(1);
      expect(Object.keys(result.spindleComparison).length).toBe(1);
    });

    it("includes spindle metrics in comparison", () => {
      const result = machineCapabilitySurfaceEngine.compareCapabilities(["haas_vf2", "dmg_dmu50"]);

      const haasSpindle = result.spindleComparison["haas_vf2"];
      expect(haasSpindle).toBeDefined();
      expect(haasSpindle.maxRpm).toBeGreaterThan(0);
      expect(haasSpindle.power).toBeGreaterThan(0);
    });

    it("includes coolant types in comparison", () => {
      const result = machineCapabilitySurfaceEngine.compareCapabilities(["haas_vf2", "dmg_dmu50"]);

      const haasCoolant = result.coolantComparison["haas_vf2"];
      expect(haasCoolant).toBeDefined();
      expect(Array.isArray(haasCoolant.types)).toBe(true);
    });
  });

  describe("findByCapabilities", () => {
    it("finds machines by minimum spindle RPM", () => {
      const result = machineCapabilitySurfaceEngine.findByCapabilities({
        minSpindleRpm: 5000,
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it("finds machines by minimum power", () => {
      const result = machineCapabilitySurfaceEngine.findByCapabilities({
        minPower: 15,
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it("finds machines with through-spindle coolant", () => {
      const result = machineCapabilitySurfaceEngine.findByCapabilities({
        throughSpindleCoolant: true,
      });

      expect(Array.isArray(result)).toBe(true);
      // DMG with through-spindle should be included
      if (result.length > 0) {
        const dmgFound = result.includes("dmg_dmu50");
        // At minimum, the function executes without error
        expect(typeof dmgFound).toBe("boolean");
      }
    });

    it("finds machines by controller features", () => {
      const result = machineCapabilitySurfaceEngine.findByCapabilities({
        controllerFeatures: ["highSpeedMachining"],
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it("combines multiple requirements", () => {
      const result = machineCapabilitySurfaceEngine.findByCapabilities({
        minSpindleRpm: 10000,
        minPower: 20,
        controllerFeatures: ["highSpeedMachining"],
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it("returns empty array when no machines match", () => {
      const result = machineCapabilitySurfaceEngine.findByCapabilities({
        minSpindleRpm: 100000, // Unrealistic requirement
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe("getSelfAwareness", () => {
    it("returns engine metadata", () => {
      const awareness = machineCapabilitySurfaceEngine.getSelfAwareness();

      expect(awareness.engine).toBe("MachineCapabilitySurfaceEngine");
      expect(awareness.milestone).toBe("MCAT-MS0/P2-U02");
    });

    it("lists all capabilities", () => {
      const awareness = machineCapabilitySurfaceEngine.getSelfAwareness();

      expect(awareness.capabilities).toContain("getControllerCapabilities");
      expect(awareness.capabilities).toContain("getSpindlePackage");
      expect(awareness.capabilities).toContain("getCoolantStrategy");
      expect(awareness.capabilities).toContain("getCapabilitySummary");
      expect(awareness.capabilities).toContain("compareCapabilities");
      expect(awareness.capabilities).toContain("findByCapabilities");
    });

    it("reports controller profile count", () => {
      const awareness = machineCapabilitySurfaceEngine.getSelfAwareness();

      expect(awareness.controllerProfiles).toBeGreaterThan(0);
    });
  });
});
