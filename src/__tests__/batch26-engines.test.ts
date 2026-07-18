/**
 * Batch 26 Engines -- Unit Tests
 * ThermalExpansionEngine + MultiaxisToolpathEngine
 * @milestone AUDIT-FT-B26
 */
import { describe, it, expect } from "vitest";
import { thermalExpansionEngine } from "../engines/ThermalExpansionEngine.js";
import { multiaxisToolpathEngine } from "../engines/MultiaxisToolpathEngine.js";

// ============================================================================
// ThermalExpansionEngine
// ============================================================================

describe("ThermalExpansionEngine", () => {
  describe("linearExpansion", () => {
    it("calculates steel expansion correctly", () => {
      const r = thermalExpansionEngine.linearExpansion(500, 10, "steel");
      expect(r.CTE_per_C).toBeCloseTo(11.7e-6);
      expect(r.expansion_mm).toBeCloseTo(500 * 11.7e-6 * 10);
      expect(r.expansion_um).toBeCloseTo(r.expansion_mm * 1000);
    });

    it("aluminum expands more than steel", () => {
      const rSteel = thermalExpansionEngine.linearExpansion(100, 5, "steel");
      const rAl = thermalExpansionEngine.linearExpansion(100, 5, "aluminum");
      expect(rAl.expansion_mm).toBeGreaterThan(rSteel.expansion_mm);
    });

    it("invar has very low CTE", () => {
      const r = thermalExpansionEngine.linearExpansion(1000, 20, "invar");
      expect(r.CTE_per_C).toBeLessThan(2e-6);
    });

    it("accepts custom CTE", () => {
      const r = thermalExpansionEngine.linearExpansion(200, 10, undefined, 15e-6);
      expect(r.CTE_per_C).toBe(15e-6);
      expect(r.expansion_mm).toBeCloseTo(200 * 15e-6 * 10);
    });
  });

  describe("machineToolThermalError", () => {
    it("calculates volumetric error", () => {
      const r = thermalExpansionEngine.machineToolThermalError(
        { X_axis_length: 500, Y_axis_length: 400, Z_axis_length: 300 },
        { X_gradient: 2, Y_gradient: 1, Z_gradient: 1.5, spindle_delta: 5 },
      );
      expect(r.totalVolumetricError_um).toBeGreaterThan(0);
      expect(r.spindleGrowth_um).toBeGreaterThan(0);
      expect(r.linearErrors_um.X).toBeGreaterThan(0);
    });

    it("provides recommendations for high errors", () => {
      const r = thermalExpansionEngine.machineToolThermalError(
        { X_axis_length: 1000 },
        { X_gradient: 5, spindle_delta: 10 },
      );
      expect(r.recommendations.length).toBeGreaterThan(1);
    });

    it("acceptable errors give positive message", () => {
      const r = thermalExpansionEngine.machineToolThermalError(
        { X_axis_length: 100, Y_axis_length: 100, Z_axis_length: 100 },
        { X_gradient: 0.1, Y_gradient: 0.1, Z_gradient: 0.1, spindle_delta: 0.5 },
      );
      expect(r.recommendations).toContain("Thermal errors within acceptable limits");
    });
  });

  describe("thermalCompensation", () => {
    it("calculates simple average compensation", () => {
      const r = thermalExpansionEngine.thermalCompensation(
        [{ sensor_id: "S1", temp: 25 }, { sensor_id: "S2", temp: 27 }],
        [{ sensor_id: "S1", temp: 20 }, { sensor_id: "S2", temp: 20 }],
      );
      expect(r.method).toBe("simple_average");
      expect(r.compensation_X_um).toBeGreaterThan(0);
      expect(r.temperatureDeltas.length).toBe(2);
    });

    it("applies compensation matrix", () => {
      const r = thermalExpansionEngine.thermalCompensation(
        [{ sensor_id: "S1", temp: 25 }],
        [{ sensor_id: "S1", temp: 20 }],
        [{ X: 2, Y: 1.5, Z: 3 }],
      );
      expect(r.method).toBe("matrix_compensation");
      expect(r.compensation_X_um).toBeCloseTo(10);
      expect(r.compensation_Y_um).toBeCloseTo(7.5);
      expect(r.compensation_Z_um).toBeCloseTo(15);
    });
  });

  describe("getCTE", () => {
    it("returns known material CTE", () => {
      expect(thermalExpansionEngine.getCTE("aluminum")).toBeCloseTo(23.1e-6);
    });

    it("returns default for unknown material", () => {
      expect(thermalExpansionEngine.getCTE("unobtainium")).toBe(12e-6);
    });
  });
});

// ============================================================================
// MultiaxisToolpathEngine
// ============================================================================

describe("MultiaxisToolpathEngine", () => {
  describe("normalize", () => {
    it("normalizes to unit length", () => {
      const n = multiaxisToolpathEngine.normalize({ x: 3, y: 4, z: 0 });
      const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
      expect(len).toBeCloseTo(1);
    });

    it("handles zero vector", () => {
      const n = multiaxisToolpathEngine.normalize({ x: 0, y: 0, z: 0 });
      expect(n.z).toBe(1);
    });
  });

  describe("cross", () => {
    it("X cross Y = Z", () => {
      const r = multiaxisToolpathEngine.cross({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
      expect(r.z).toBeCloseTo(1);
    });
  });

  describe("rotateAroundAxis", () => {
    it("rotates 90 degrees around Z", () => {
      const r = multiaxisToolpathEngine.rotateAroundAxis(
        { x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, Math.PI / 2,
      );
      expect(r.x).toBeCloseTo(0);
      expect(r.y).toBeCloseTo(1);
    });

    it("zero angle preserves vector", () => {
      const r = multiaxisToolpathEngine.rotateAroundAxis(
        { x: 1, y: 2, z: 3 }, { x: 0, y: 0, z: 1 }, 0,
      );
      expect(r.x).toBeCloseTo(1);
      expect(r.y).toBeCloseTo(2);
    });
  });

  describe("toolAxisFromNormal", () => {
    it("returns normal when no angles", () => {
      const axis = multiaxisToolpathEngine.toolAxisFromNormal(
        { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 0 },
      );
      expect(axis.z).toBeCloseTo(1);
    });

    it("applies lead angle", () => {
      const axis = multiaxisToolpathEngine.toolAxisFromNormal(
        { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 0 },
        { leadAngle: 0.1 },
      );
      expect(axis.z).toBeLessThan(1);
    });
  });

  describe("slerp", () => {
    it("t=0 returns first axis", () => {
      const r = multiaxisToolpathEngine.slerp({ x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 0 }, 0);
      expect(r.z).toBeCloseTo(1);
    });

    it("t=1 returns second axis", () => {
      const r = multiaxisToolpathEngine.slerp({ x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 0 }, 1);
      expect(r.x).toBeCloseTo(1);
    });

    it("t=0.5 gives midpoint axis", () => {
      const r = multiaxisToolpathEngine.slerp({ x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 0 }, 0.5);
      const len = Math.sqrt(r.x * r.x + r.y * r.y + r.z * r.z);
      expect(len).toBeCloseTo(1);
      expect(r.x).toBeGreaterThan(0);
      expect(r.z).toBeGreaterThan(0);
    });
  });

  describe("smoothToolAxis", () => {
    it("smooths axis variations", () => {
      const tp = [
        { position: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 }, axis: { x: 0, y: 0, z: 1 } },
        { position: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 }, axis: { x: 0.1, y: 0, z: 0.9 } },
        { position: { x: 2, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 }, axis: { x: 0, y: 0, z: 1 } },
        { position: { x: 3, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 }, axis: { x: -0.1, y: 0, z: 0.9 } },
        { position: { x: 4, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 }, axis: { x: 0, y: 0, z: 1 } },
      ];
      const smoothed = multiaxisToolpathEngine.smoothToolAxis(tp, 3);
      expect(smoothed.length).toBe(5);
      // Smoothed middle point should be closer to z=1
      expect(Math.abs(smoothed[2].axis!.x)).toBeLessThanOrEqual(Math.abs(tp[2].axis!.x) + 0.1);
    });

    it("returns short paths unchanged", () => {
      const tp = [{ position: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 } }];
      expect(multiaxisToolpathEngine.smoothToolAxis(tp)).toEqual(tp);
    });
  });

  describe("detectGouge", () => {
    it("no gouge for aligned axes", () => {
      const tp = [
        { position: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 }, axis: { x: 0, y: 0, z: 1 } },
        { position: { x: 1, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 }, axis: { x: 0, y: 0, z: 1 } },
      ];
      const r = multiaxisToolpathEngine.detectGouge(tp, 5);
      expect(r.gougeDetected).toBe(false);
    });

    it("detects gouge for extreme tilt", () => {
      const tp = [
        { position: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 }, axis: { x: 1, y: 0, z: 0 } },
      ];
      const r = multiaxisToolpathEngine.detectGouge(tp, 5, Math.PI / 4);
      expect(r.gougeDetected).toBe(true);
      expect(r.gougePoints).toContain(0);
    });
  });
});
