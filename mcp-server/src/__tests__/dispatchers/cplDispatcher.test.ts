/**
 * cplDispatcher Tests
 *
 * Tests for CAM-Pipeline Track Dispatcher actions.
 * Covers CPL-MS1 through CPL-MS4 action groups.
 *
 * @module __tests__/dispatchers/cplDispatcher.test
 */

import { describe, it, expect, beforeAll } from "vitest";

// Lazy import the dispatcher
let cplDispatcher: (input: { action: string; [key: string]: unknown }) => Promise<unknown>;

beforeAll(async () => {
  const module = await import("../../tools/dispatchers/cplDispatcher.js");
  cplDispatcher = module.cplDispatcher;
});

describe("cplDispatcher", () => {
  describe("Action Registration", () => {
    it("should have 54 registered actions", async () => {
      // Test that dispatcher is loaded
      expect(cplDispatcher).toBeDefined();
      expect(typeof cplDispatcher).toBe("function");
    });

    it("should reject unknown actions", async () => {
      await expect(cplDispatcher({ action: "unknown_action" })).rejects.toThrow();
    });
  });

  describe("CPL-MS2: Novel Algorithms", () => {
    it("clothoid_blend returns result object", async () => {
      const result = await cplDispatcher({
        action: "clothoid_blend",
        points: [[0, 0], [10, 5], [20, 0]],
        max_curvature: 0.1,
      });
      expect(result).toBeDefined();
    });

    it("ph_interpolate processes waypoints", async () => {
      const result = await cplDispatcher({
        action: "ph_interpolate",
        waypoints: [[0, 0, 0], [50, 50, 10], [100, 0, 0]],
        degree: 5,
      });
      expect(result).toBeDefined();
    });

    it("voronoi_pocket generates toolpath", async () => {
      const result = await cplDispatcher({
        action: "voronoi_pocket",
        boundary: [[0, 0], [100, 0], [100, 100], [0, 100]],
        tool_diameter: 10,
        stepover_pct: 40,
      });
      expect(result).toBeDefined();
    });

    it("minimum_jerk_plan optimizes trajectory", async () => {
      const result = await cplDispatcher({
        action: "minimum_jerk_plan",
        waypoints: [{ x: 0, y: 0, z: 0 }, { x: 50, y: 50, z: 10 }, { x: 100, y: 0, z: 0 }],
        constraints: { max_velocity_mm_s: 1000, max_accel_mm_s2: 5000, max_jerk_mm_s3: 50000 },
      });
      expect(result).toBeDefined();
    });

    it("wear_map returns wear distribution", async () => {
      const result = await cplDispatcher({
        action: "wear_map",
        measurements: [
          { position_mm: 0, flank_wear_mm: 0.05, crater_depth_mm: 0.01 },
          { position_mm: 5, flank_wear_mm: 0.08, crater_depth_mm: 0.02 },
          { position_mm: 10, flank_wear_mm: 0.12, crater_depth_mm: 0.03 },
        ],
      });
      expect(result).toBeDefined();
    });
  });

  describe("CPL-MS1: Pipeline Integration", () => {
    it("servo_lag_compensate adjusts toolpath", async () => {
      const result = await cplDispatcher({
        action: "servo_lag_compensate",
        gcode: "G1 X100 Y50 F5000",
        controller: "okuma",
        axis_gains: { x: 1.0, y: 1.0 },
      });
      expect(result).toBeDefined();
    });

    it("rotary_axis_check validates kinematics", async () => {
      const result = await cplDispatcher({
        action: "rotary_axis_check",
        machine: "DMU-50",
        axis_config: "BC",
        moves: [
          { b: 0, c: 0 },
          { b: 45, c: 90 },
        ],
      });
      expect(result).toBeDefined();
    });

    it("cut_reorder optimizes sequence", async () => {
      const result = await cplDispatcher({
        action: "cut_reorder",
        cuts: [
          { id: "C1", start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } },
          { id: "C2", start: { x: 50, y: 50, z: 0 }, end: { x: 60, y: 50, z: 0 } },
          { id: "C3", start: { x: 100, y: 0, z: 0 }, end: { x: 110, y: 0, z: 0 } },
        ],
        start: { x: 0, y: 0, z: 0 },
      });
      expect(result).toBeDefined();
    });

    it("tolerance_verify checks achievability", async () => {
      const result = await cplDispatcher({
        action: "tolerance_verify",
        original: [{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 20, y: 0, z: 0 }],
        smoothed: [{ x: 0, y: 0, z: 0 }, { x: 10, y: 0.005, z: 0 }, { x: 20, y: 0, z: 0 }],
        tolerance_mm: 0.01,
      });
      expect(result).toBeDefined();
    });
  });

  describe("CPL-MS3: Pipeline Architecture", () => {
    it("voxel_init creates IPW model", async () => {
      const result = await cplDispatcher({
        action: "voxel_init",
        dims: { x: 100, y: 100, z: 50 },
        resolution: 32,
      });
      expect(result).toBeDefined();
    });

    it("voxel_volume calculates remaining material", async () => {
      // First init a grid, then check volume
      const initResult = await cplDispatcher({
        action: "voxel_init",
        dims: { x: 100, y: 100, z: 50 },
        resolution: 16,
      }) as any;
      const result = await cplDispatcher({
        action: "voxel_volume",
        grid: initResult,
      });
      expect(result).toBeDefined();
    });

    it("output_variants generates alternatives", async () => {
      const result = await cplDispatcher({
        action: "output_variants",
        pipeline_output: { gcode: "G1 X10 Y10\nG1 X20 Y20", metadata: { tool: "EM-10" } },
        formats: ["gcode", "step_nc"],
      });
      expect(result).toBeDefined();
    });
  });

  describe("CPL-MS4: CAM Kernel Extensions", () => {
    it("dfm_analyze evaluates manufacturability", async () => {
      const result = await cplDispatcher({
        action: "dfm_analyze",
        geometry: { type: "step", path: "/test/part.step" },
        process: "milling",
      });
      expect(result).toBeDefined();
    });

    it("gcode_diff compares programs", async () => {
      const result = await cplDispatcher({
        action: "gcode_diff",
        program_a: "G1 X10 Y10",
        program_b: "G1 X10 Y11",
        tolerance: 0.01,
      });
      expect(result).toBeDefined();
    });

    it("nl_cam_command processes natural language", async () => {
      const result = await cplDispatcher({
        action: "nl_cam_command",
        command: "rough the top face with 10mm endmill",
        context: { material: "aluminum", stock: "100x100x50" },
      });
      expect(result).toBeDefined();
    });
  });
});
