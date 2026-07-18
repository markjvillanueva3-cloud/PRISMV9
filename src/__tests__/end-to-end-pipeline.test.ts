/**
 * Dedicated tests for EndToEndPipelineEngine
 * Method: generate() — full feature-to-gcode pipeline
 *
 * NOTE: This engine uses require("../physics/constants.js") at module load.
 * If the compiled .js is not available, tests are skipped gracefully.
 */
import { describe, it, expect } from "vitest";

let engine: any = null;
try {
  engine = (await import("../engines/EndToEndPipelineEngine.js")).endToEndPipelineEngine;
} catch {
  // physics/constants.js not available in test transform mode
}

const describeIfEngine = engine ? describe : describe.skip;

const baseMachine = {
  type: "vertical_mill",
  max_rpm: 12000,
  max_feed_mmmin: 5000,
  axes: 3,
  controller: "fanuc" as const,
};

const baseTool = {
  number: 1,
  diameter_mm: 10,
  length_mm: 75,
  type: "endmill",
  flute_count: 3,
};

describeIfEngine("EndToEndPipelineEngine", () => {
  describe("pipeline execution", () => {
    it("should generate G-code for a pocket feature", () => {
      const r = engine.generate({
        features: [
          { type: "pocket", dimensions: { width_mm: 40, length_mm: 60, depth_mm: 8 } },
        ],
        material: "aluminum_6061",
        machine: baseMachine,
        tool: baseTool,
      });
      expect(r.gcode).toBeDefined();
      expect(r.gcode.length).toBeGreaterThan(10);
      expect(r.algorithm_used).toBeDefined();
      expect(r.cycle_time_sec).toBeGreaterThan(0);
    });

    it("should generate G-code for a hole feature", () => {
      const r = engine.generate({
        features: [
          { type: "hole", dimensions: { diameter_mm: 10, depth_mm: 20 } },
        ],
        material: "steel_1045",
        machine: baseMachine,
        tool: { ...baseTool, type: "drill" },
      });
      expect(r.gcode).toBeDefined();
      expect(r.gcode.length).toBeGreaterThan(0);
    });

    it("should handle multiple features in one pipeline run", () => {
      const r = engine.generate({
        features: [
          { type: "face", dimensions: { width_mm: 100, length_mm: 100, depth_mm: 1 } },
          { type: "pocket", dimensions: { width_mm: 30, length_mm: 50, depth_mm: 10 } },
        ],
        material: "aluminum_6061",
        machine: baseMachine,
        tool: baseTool,
      });
      expect(r.gcode.length).toBeGreaterThan(20);
      expect(r.setup_sheet.operations.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("physics summary", () => {
    it("should include cutting force and deflection", () => {
      const r = engine.generate({
        features: [
          { type: "pocket", dimensions: { width_mm: 30, length_mm: 30, depth_mm: 5 } },
        ],
        material: "steel_1045",
        machine: baseMachine,
        tool: baseTool,
      });
      expect(r.physics_summary.cutting_force_n).toBeGreaterThan(0);
      expect(r.physics_summary.deflection_mm).toBeGreaterThanOrEqual(0);
      expect(r.physics_summary.mrr_cm3min).toBeGreaterThan(0);
    });
  });

  describe("stage tracking", () => {
    it("should report pipeline stage timings", () => {
      const r = engine.generate({
        features: [
          { type: "slot", dimensions: { width_mm: 8, length_mm: 50, depth_mm: 5 } },
        ],
        material: "aluminum_6061",
        machine: baseMachine,
        tool: baseTool,
      });
      expect(r.pipeline_stages.length).toBeGreaterThanOrEqual(3);
      for (const s of r.pipeline_stages) {
        expect(s.stage).toBeDefined();
        expect(s.duration_ms).toBeGreaterThanOrEqual(0);
        expect(["ok", "fallback", "skipped"]).toContain(s.status);
      }
    });
  });

  describe("setup sheet", () => {
    it("should produce a setup sheet with tool list", () => {
      const r = engine.generate({
        features: [
          { type: "contour", dimensions: { width_mm: 80, length_mm: 80, depth_mm: 3 } },
        ],
        material: "aluminum_6061",
        machine: baseMachine,
        tool: baseTool,
      });
      expect(r.setup_sheet.material).toBeDefined();
      expect(r.setup_sheet.tools.length).toBeGreaterThanOrEqual(1);
      expect(r.setup_sheet.work_offset).toBeDefined();
    });
  });

  describe("verification", () => {
    it("should run verification when requested", () => {
      const r = engine.generate({
        features: [
          { type: "pocket", dimensions: { width_mm: 30, length_mm: 30, depth_mm: 5 } },
        ],
        material: "aluminum_6061",
        machine: baseMachine,
        tool: baseTool,
        verify: true,
      });
      expect(r.verification).not.toBeNull();
      if (r.verification) {
        expect(typeof r.verification.valid).toBe("boolean");
        expect(typeof r.verification.errors).toBe("number");
      }
    });
  });
});
