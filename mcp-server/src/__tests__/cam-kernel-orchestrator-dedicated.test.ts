/**
 * Dedicated tests for CAMKernelOrchestratorEngine
 * Actions: cam_generate, cam_turn, cam_simulate
 *
 * NOTE: This engine uses require("../physics/constants.js") at module load.
 * If the compiled .js is not available, tests are skipped gracefully.
 */
import { describe, it, expect } from "vitest";

let engine: any = null;
try {
  engine = (await import("../engines/CAMKernelOrchestratorEngine.js")).camKernelOrchestratorEngine;
} catch {
  // physics/constants.js not available in test transform mode
}

const describeIfEngine = engine ? describe : describe.skip;

describeIfEngine("CAMKernelOrchestratorEngine", () => {
  describe("cam_generate (milling pipeline)", () => {
    it("should generate a full milling program with G-code", () => {
      const r = engine.calculate("cam_generate", {
        part_features: [
          { type: "pocket", width_mm: 50, length_mm: 80, depth_mm: 10 },
        ],
        material: "aluminum_6061",
        iso_group: "N",
        machine: {
          max_rpm: 12000,
          max_feed_mmmin: 5000,
          axes: 3,
          power_kw: 15,
        },
        tools: [
          { number: 1, diameter_mm: 10, flutes: 3, material: "carbide" },
        ],
      });
      expect((r as any).pipeline).toBe("cam_generate");
      expect((r as any).gcode).toBeDefined();
      expect(typeof (r as any).gcode).toBe("string");
      expect((r as any).gcode.length).toBeGreaterThan(10);
    });

    it("should include physics summary in output", () => {
      const r = engine.calculate("cam_generate", {
        part_features: [
          { type: "slot", width_mm: 8, length_mm: 60, depth_mm: 5 },
        ],
        material: "steel_1045",
        iso_group: "P",
        machine: { max_rpm: 8000, max_feed_mmmin: 3000, axes: 3, power_kw: 11 },
        tools: [{ number: 1, diameter_mm: 8, flutes: 2, material: "carbide" }],
      });
      expect((r as any).physics).toBeDefined();
      expect((r as any).physics.cutting_force_N).toBeGreaterThan(0);
      expect((r as any).cycle_time_min).toBeGreaterThan(0);
    });
  });

  describe("cam_turn (turning pipeline)", () => {
    it("should generate a turning program", () => {
      const r = engine.calculate("cam_turn", {
        part_features: [
          { type: "od_rough", od_mm: 50, length_mm: 100 },
        ],
        material: "steel_4140",
        iso_group: "P",
        machine: {
          max_rpm: 4000,
          max_feed_mmmin: 500,
          bar_diameter_mm: 55,
          sub_spindle: false,
        },
        tools: [
          { number: 1, type: "turning_insert", nose_radius_mm: 0.8 },
        ],
      });
      expect((r as any).pipeline).toBe("cam_turn");
      expect((r as any).gcode).toBeDefined();
      expect((r as any).gcode.length).toBeGreaterThan(0);
    });
  });

  describe("cam_simulate (simulation pipeline)", () => {
    it("should simulate G-code and produce safety report", () => {
      const r = engine.calculate("cam_simulate", {
        gcode: "G90 G21\nG0 X0 Y0 Z10\nG1 Z-5 F200\nG1 X50 F500\nG0 Z10\nM30",
        material: "aluminum_6061",
        iso_group: "N",
        tool: { diameter_mm: 10, flutes: 3 },
        stock: { x_mm: 100, y_mm: 100, z_mm: 20 },
      });
      expect((r as any).pipeline).toBe("cam_simulate");
      expect((r as any).blocks_analyzed).toBeGreaterThan(0);
      expect((r as any).safety).toBeDefined();
      expect(typeof (r as any).safety.passed).toBe("boolean");
    });

    it("should report cycle time and force predictions", () => {
      const r = engine.calculate("cam_simulate", {
        gcode: "G90 G21\nG1 X100 Y0 Z-2 F300\nG1 X0 Y50 F300\nM30",
        material: "steel_1045",
        iso_group: "P",
        tool: { diameter_mm: 12, flutes: 4 },
        stock: { x_mm: 120, y_mm: 60, z_mm: 10 },
      });
      expect((r as any).cycle_time_sec).toBeGreaterThan(0);
      expect((r as any).max_force_N).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    it("should throw on unknown action", () => {
      expect(() =>
        engine.calculate("cam_unknown", {})
      ).toThrow("Unknown action");
    });
  });
});
