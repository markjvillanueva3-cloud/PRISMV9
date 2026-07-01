import { describe, it, expect } from "vitest";
import { PipelineArchitectureEngine } from "../engines/PipelineArchitectureEngine.js";

describe("PipelineArchitectureEngine", () => {
  describe("Learning Feedback", () => {
    it("records and submits actuals", () => {
      const eng = new PipelineArchitectureEngine();
      const rec = eng.recordPipelinePredictions({ force_N: 500, ra_um: 1.0 });
      expect(rec.id).toContain("pred-");
      const result = eng.submitActuals(rec.id, { force_N: 550, ra_um: 1.1 });
      expect(result.prediction_id).toBe(rec.id);
    });

    it("calibration report aggregates", () => {
      const eng = new PipelineArchitectureEngine();
      for (let i = 0; i < 5; i++) {
        const rec = eng.recordPipelinePredictions({ force_N: 500 });
        eng.submitActuals(rec.id, { force_N: 550 });
      }
      const report = eng.getCalibrationReport();
      expect(report.total_pairs).toBe(5);
    });
  });

  describe("Output Variants", () => {
    it("generates formats", () => {
      const eng = new PipelineArchitectureEngine();
      const result = eng.generateOutputVariants(
        { gcode: "G0 X0", tools: [], material: { name: "Steel" }, cycle_time_s: 60, stages: [] },
        ["gcode", "setup_sheet"],
      );
      expect(Object.keys(result).length).toBe(2);
    });
  });

  describe("Multi-Process Router", () => {
    it("routes milling features", () => {
      const eng = new PipelineArchitectureEngine();
      const result = eng.routeFeatures([
        { id: "f1", type: "pocket", dimensions: {} },
      ]);
      expect(result.routes.some(r => r.process === "milling")).toBe(true);
    });

    it("routes grinding for tight Ra", () => {
      const eng = new PipelineArchitectureEngine();
      const result = eng.routeFeatures([
        { id: "f1", type: "surface", dimensions: {}, ra_target_um: 0.2 },
      ]);
      expect(result.routes.some(r => r.process === "grinding")).toBe(true);
    });

    it("routes turning for od_profile", () => {
      const eng = new PipelineArchitectureEngine();
      const result = eng.routeFeatures([
        { id: "f1", type: "od_profile", dimensions: {} },
      ]);
      expect(result.routes.some(r => r.process === "turning")).toBe(true);
    });
  });

  describe("Parallel Operations", () => {
    it("achieves speedup over serial", () => {
      const eng = new PipelineArchitectureEngine();
      const result = eng.optimizeParallelOps(
        [
          { id: "op1", time_s: 60, feature_id: "f1" },
          { id: "op2", time_s: 45, feature_id: "f2" },
          { id: "op3", time_s: 30, feature_id: "f3" },
        ],
        2,
      );
      expect(result.schedule.length).toBeGreaterThan(0);
      expect(result.speedup_vs_serial).toBeGreaterThanOrEqual(1);
    });
  });

  describe("IPW Voxel Grid", () => {
    it("starts at 100% volume", () => {
      const eng = new PipelineArchitectureEngine();
      const grid = eng.initializeVoxelGrid({ x: 100, y: 100, z: 50 }, 8);
      const vol = eng.getVolumeRemaining(grid);
      expect(vol.volume_pct).toBeCloseTo(100, 0);
    });

    it("cylinder subtraction removes material", () => {
      const eng = new PipelineArchitectureEngine();
      const grid = eng.initializeVoxelGrid({ x: 100, y: 100, z: 50 }, 16);
      eng.subtractCylinder(grid, { x: 50, y: 50, z: 50 }, { x: 50, y: 50, z: 0 }, 20);
      const vol = eng.getVolumeRemaining(grid);
      expect(vol.volume_pct).toBeLessThan(100);
    });
  });

  describe("Tolerance-Driven Parameters", () => {
    it("selects parameters for target Cpk", () => {
      const eng = new PipelineArchitectureEngine();
      const result = eng.selectParametersForTolerance(1.33, 0.05, {
        machine_positioning_um: 3, tool_diameter_mm: 10, tool_overhang_mm: 50,
      });
      expect(result.recommended_feed_mmpm).toBeGreaterThan(0);
      expect(result.cpk_predicted).toBeGreaterThanOrEqual(1.0);
    });

    it("looser tolerance allows higher feed", () => {
      const eng = new PipelineArchitectureEngine();
      const tight = eng.selectParametersForTolerance(1.33, 0.02, {
        machine_positioning_um: 3, tool_diameter_mm: 10, tool_overhang_mm: 50,
      });
      const loose = eng.selectParametersForTolerance(1.33, 0.1, {
        machine_positioning_um: 3, tool_diameter_mm: 10, tool_overhang_mm: 50,
      });
      expect(loose.recommended_feed_mmpm).toBeGreaterThanOrEqual(tight.recommended_feed_mmpm);
    });
  });
});
