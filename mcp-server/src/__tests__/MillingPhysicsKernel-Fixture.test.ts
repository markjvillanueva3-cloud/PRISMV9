/**
 * MillingPhysicsKernel Fixture/Workholding Wiring — MS-WIRE-1/Workholding layer
 */

import { describe, it, expect } from "vitest";
import { millingPhysicsKernelEngine } from "../engines/MillingPhysicsKernelEngine.js";

describe("MillingPhysicsKernel: Fixture wiring (MS-WIRE-1/Workholding)", () => {
  describe("method accessibility", () => {
    it("calculateFixtureClamping is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateFixtureClamping).toBe("function");
    });

    it("calculateFixtureDynamics is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateFixtureDynamics).toBe("function");
    });

    it("calculateFixturePlate is callable", () => {
      expect(typeof millingPhysicsKernelEngine.calculateFixturePlate).toBe("function");
    });

    it("getLatheWorkholding returns engine", () => {
      const e = millingPhysicsKernelEngine.getLatheWorkholding();
      expect(e).toBeDefined();
    });
  });

  describe("wiring registry", () => {
    it("getWiringStats reports workholding=4", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.workholding).toBe(4);
    });

    it("total_engines >= 85", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.total_engines).toBeGreaterThanOrEqual(85);
    });

    it("all 4 fixture engines registered by name", () => {
      const wired = millingPhysicsKernelEngine.getWiredEngines();
      const names = wired.join(" ");
      expect(names).toContain("FixtureClampingEngine");
      expect(names).toContain("FixtureDynamicsEngine");
      expect(names).toContain("FixturePlateEngine");
      expect(names).toContain("LatheWorkholdingEngine");
    });
  });
});
