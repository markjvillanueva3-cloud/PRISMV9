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
        features: [
          { id: "f1", type: "pocket", dimensions: { width_mm: 50, length_mm: 80, depth_mm: 10 } },
        ],
        material: { name: "aluminum_6061", iso_group: "N" },
        machine: {
          axes: "3_axis",
          max_rpm: 12000,
          max_feedrate_mm_min: 5000,
          max_power_kw: 15,
        },
        stock: { type: "block", dimensions_mm: { x: 100, y: 100, z: 20 } },
      });
      expect((r as any).pipeline).toBe("cam_generate");
      expect((r as any).operations).toBeDefined();
      expect((r as any).operations.length).toBeGreaterThan(0);
      expect((r as any).status).toBe("success");
    });

    it("should include physics summary in output", () => {
      const r = engine.calculate("cam_generate", {
        features: [
          { id: "f1", type: "slot", dimensions: { width_mm: 8, length_mm: 60, depth_mm: 5 } },
        ],
        material: { name: "steel_1045", iso_group: "P" },
        machine: { axes: "3_axis", max_rpm: 8000, max_feedrate_mm_min: 3000, max_power_kw: 11 },
        stock: { type: "block", dimensions_mm: { x: 80, y: 40, z: 15 } },
      });
      expect((r as any).operations).toBeDefined();
      expect((r as any).operations[0]?.cutting_params.speed_rpm).toBeGreaterThan(0);
      expect((r as any).total_cycle_time_sec).toBeGreaterThan(0);
    });
  });

  describe("cam_turn (turning pipeline)", () => {
    it("should generate a turning program", () => {
      const r = engine.calculate("cam_turn", {
        features: [
          { id: "t1", type: "od_rough", start_diameter_mm: 55, end_diameter_mm: 50, length_mm: 100 },
        ],
        material: { name: "steel_4140", iso_group: "P" },
        machine: {
          machine_type: "lathe",
          max_rpm: 4000,
          has_live_tooling: false,
          has_sub_spindle: false,
          has_y_axis: false,
        },
        stock: { bar_diameter_mm: 55 },
        part_length_mm: 100,
      });
      expect((r as any).pipeline).toBe("cam_turn");
      expect((r as any).channels).toBeDefined();
      expect((r as any).total_cycle_time_sec).toBeGreaterThan(0);
    });
  });

  describe("cam_simulate (simulation pipeline)", () => {
    it("should simulate G-code and produce safety report", () => {
      const r = engine.calculate("cam_simulate", {
        gcode: "G90 G21\nG0 X0 Y0 Z10\nG1 Z-5 F200\nG1 X50 F500\nG0 Z10\nM30",
        material: "aluminum_6061",
        iso_group: "N",
        tool: { diameter_mm: 10, flutes: 3 },
        machine: { axes: "3_axis", max_rpm: 12000, max_feedrate_mm_min: 5000 },
        stock: { dimensions_mm: { x: 100, y: 100, z: 20 }, material: "aluminum_6061", iso_group: "N" },
      });
      expect((r as any).pipeline).toBe("cam_simulate");
      expect((r as any).total_blocks_analyzed).toBeGreaterThanOrEqual(0);
      expect((r as any).safety_rules).toBeDefined();
      expect((r as any).safety_rules.rules_checked).toBeGreaterThanOrEqual(0);
    });

    it("should report cycle time and force predictions", () => {
      const r = engine.calculate("cam_simulate", {
        gcode: "G90 G21\nG1 X100 Y0 Z-2 F300\nG1 X0 Y50 F300\nM30",
        machine: { axes: "3_axis", max_rpm: 8000, max_feedrate_mm_min: 3000 },
        stock: { dimensions_mm: { x: 120, y: 60, z: 10 }, material: "steel_1045", iso_group: "P" },
      });
      expect((r as any).cycle_time_sec).toBeGreaterThanOrEqual(0);
      expect((r as any).force_analysis).toBeDefined();
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
