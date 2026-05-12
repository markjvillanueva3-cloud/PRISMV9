/**
 * MillingPhysicsKernel Spindle/Power Wiring — MS-WIRE-1/Power layer
 */

import { describe, it, expect } from "vitest";
import { millingPhysicsKernelEngine } from "../engines/MillingPhysicsKernelEngine.js";

describe("MillingPhysicsKernel: Spindle/Power wiring (MS-WIRE-1/Power)", () => {
  describe("method accessibility", () => {
    it("getSpindlePowerCheck returns engine", () => {
      const e = millingPhysicsKernelEngine.getSpindlePowerCheck();
      expect(e).toBeDefined();
    });

    it("calculateSpindleTorqueCurve is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateSpindleTorqueCurve).toBe("function");
    });

    it("calculateSpindleBearingLoad is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateSpindleBearingLoad).toBe("function");
    });

    it("calculateSpindleRunout is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateSpindleRunout).toBe("function");
    });

    it("getForceCapability returns engine", () => {
      const e = millingPhysicsKernelEngine.getForceCapability();
      expect(e).toBeDefined();
    });
  });

  describe("wiring registry", () => {
    it("getWiringStats reports spindle_power >= 5", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.spindle_power).toBeGreaterThanOrEqual(5);
    });

    it("total_engines >= 81", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.total_engines).toBeGreaterThanOrEqual(81);
    });

    it("all 5 spindle/power engines registered by name", () => {
      const wired = millingPhysicsKernelEngine.getWiredEngines();
      const names = wired.join(" ");
      expect(names).toContain("SpindlePowerCheckEngine");
      expect(names).toContain("SpindleTorqueCurveEngine");
      expect(names).toContain("SpindleBearingLoadEngine");
      expect(names).toContain("SpindleRunoutEngine");
      expect(names).toContain("ForceCapabilityEngine");
    });
  });
});
