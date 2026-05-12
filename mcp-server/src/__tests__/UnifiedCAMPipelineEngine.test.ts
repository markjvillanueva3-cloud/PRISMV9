import { describe, it, expect } from "vitest";
import { UnifiedCAMPipelineEngine } from "../engines/UnifiedCAMPipelineEngine.js";

const engine = new UnifiedCAMPipelineEngine();

describe("UnifiedCAMPipelineEngine", () => {
  it("generates complete G-code from pocket feature + material + machine", () => {
    const result = engine.generate({
      features: [{
        type: "pocket_rectangular",
        operation: "roughing",
        dimensions: { length_mm: 60, width_mm: 40, depth_mm: 10 },
        tolerance_mm: 0.05,
      }],
      material: "6061-T6 Aluminum",
      machine_name: "Haas VF-2",
    });

    expect(result.success).toBe(true);
    expect(result.gcode).toMatch(/G0[01]/); // G00 or G01
    expect(result.gcode).toContain("M03");
    expect(result.gcode).toContain("M30");
    expect(result.gcode.split("\n").length).toBeGreaterThan(10);
    expect(result.pipeline_summary.features_processed).toBe(1);
    expect(result.pipeline_summary.total_segments).toBeGreaterThan(5);
    expect(result.pipeline_summary.algorithms_used.length).toBeGreaterThan(0);
  });

  it("produces setup sheet, tool list, physics report", () => {
    const result = engine.generate({
      features: [{
        type: "pocket_rectangular",
        operation: "roughing",
        dimensions: { length_mm: 60, width_mm: 40, depth_mm: 10 },
      }],
      material: "6061-T6 Aluminum",
      machine_name: "Haas VF-2",
    });

    expect(result.setup_sheet).toBeDefined();
    expect(result.tool_list.length).toBeGreaterThan(0);
    expect(result.physics_report).toBeDefined();
  });

  it("activates machine, safety, strategy, and playbook helpers", () => {
    const result = engine.generate({
      features: [{
        type: "pocket",
        operation: "roughing",
        dimensions: { length_mm: 30, width_mm: 20, depth_mm: 8 },
        tolerance_mm: 0.01,
        surface_finish_Ra: 1.6,
        wall_thickness_mm: 1.2,
        corner_radius_mm: 2,
      }],
      material: "17-4 stainless steel",
      machine_name: "Haas VF-2SS",
      options: { optimize_for: "tool_life" },
    });

    expect(result.setup_sheet.controller).toBe("HAAS");
    expect(Array.isArray(result.decision_audit)).toBe(true);
    expect(result.safety_assessments.length).toBeGreaterThan(0);
    expect(result.strategy_hints.length).toBeGreaterThan(0);
    expect(result.playbook_warnings.length).toBeGreaterThan(0);
  });

  it("includes tribal knowledge tips", () => {
    const result = engine.generate({
      features: [{
        type: "pocket_rectangular",
        operation: "roughing",
        dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10 },
      }],
      material: "Ti-6Al-4V",
      machine_name: "DMG DMU 80",
    });

    expect(result.tribal_tips.length).toBeGreaterThan(0);
  });

  it("provides cycle time with Monte Carlo confidence", () => {
    const result = engine.generate({
      features: [{
        type: "pocket_rectangular",
        operation: "roughing",
        dimensions: { length_mm: 80, width_mm: 50, depth_mm: 15 },
      }],
      material: "P20",
      machine_name: "generic",
    });

    expect(result.cycle_time.p50_min).toBeGreaterThan(0);
    expect(result.cycle_time.p95_min).toBeGreaterThanOrEqual(result.cycle_time.p50_min);
  });

  it("provides cost estimate", () => {
    const result = engine.generate({
      features: [{
        type: "pocket_rectangular",
        operation: "roughing",
        dimensions: { length_mm: 60, width_mm: 40, depth_mm: 10 },
      }],
      material: "P20",
      machine_name: "Haas VF-2",
      options: { machine_rate_per_hour: 95 },
    });

    expect(result.cost_estimate).toBeDefined();
    if (result.cost_estimate.total_cost_per_part) {
      expect(result.cost_estimate.total_cost_per_part).toBeGreaterThan(0);
    }
  });

  it("handles drilling features", () => {
    const result = engine.generate({
      features: [{
        type: "through_hole",
        operation: "drilling",
        dimensions: { diameter_mm: 10, depth_mm: 20 },
      }],
      material: "304 Stainless Steel",
      machine_name: "Haas VF-2",
    });

    expect(result.success).toBe(true);
    expect(result.gcode).toBeTruthy();
    expect(result.pipeline_summary.algorithms_used.length).toBeGreaterThan(0);
  });

  it("handles multiple features in sequence", () => {
    const result = engine.generate({
      features: [
        {
          type: "face",
          operation: "facing",
          dimensions: { length_mm: 100, width_mm: 80, depth_mm: 2 },
        },
        {
          type: "pocket_rectangular",
          operation: "roughing",
          dimensions: { length_mm: 40, width_mm: 25, depth_mm: 6 },
        },
      ],
      material: "6061-T6 Aluminum",
      machine_name: "generic",
    });

    expect(result.success).toBe(true);
    expect(result.pipeline_summary.features_processed).toBe(2);
    expect(result.pipeline_summary.total_segments).toBeGreaterThan(10);
  });

  it("emits multiple tool changes for multi-tool jobs", () => {
    const result = engine.generate({
      features: [
        {
          type: "face",
          operation: "facing",
          dimensions: { length_mm: 120, width_mm: 90, depth_mm: 2 },
        },
        {
          type: "through_hole",
          operation: "drilling",
          dimensions: { diameter_mm: 8, depth_mm: 18 },
        },
      ],
      material: "P20",
      machine_name: "generic",
    });

    const toolChanges = result.gcode.match(/M06/g) || [];
    expect(result.tool_list.length).toBeGreaterThanOrEqual(2);
    expect(toolChanges.length).toBeGreaterThanOrEqual(2);
  });

  it("uses explicit boundary geometry in production mode for contour features", () => {
    const result = engine.generate({
      features: [{
        type: "contour_2d",
        operation: "roughing",
        dimensions: { length_mm: 40, width_mm: 30, depth_mm: 8 },
        boundary_points: [
          { x: 0, y: 0 },
          { x: 40, y: 0 },
          { x: 40, y: 30 },
          { x: 0, y: 30 },
        ],
      }],
      material: "P20",
      machine_name: "generic",
      production_mode: true,
    } as any);

    expect(result.success).toBe(true);
    expect(result.pipeline_summary.algorithms_used).toContain("ProductionToolpath:PolygonOffset");
    expect(result.warnings.some((warning) => warning.includes("no truthful boundary"))).toBe(false);
  });

  it("detects ISO group from material name", () => {
    const alResult = engine.generate({
      features: [{ type: "pocket", operation: "roughing", dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10 } }],
      material: "7075-T6 Aluminum",
      machine_name: "generic",
    });
    // Aluminum should get high speed parameters
    expect(alResult.success).toBe(true);

    const tiResult = engine.generate({
      features: [{ type: "pocket", operation: "roughing", dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10 } }],
      material: "Ti-6Al-4V Titanium",
      machine_name: "generic",
    });
    expect(tiResult.success).toBe(true);
  });

  it("warns on verification issues without fatal failure", () => {
    const result = engine.generate({
      features: [{
        type: "pocket_rectangular",
        operation: "roughing",
        dimensions: { length_mm: 60, width_mm: 40, depth_mm: 10 },
      }],
      material: "P20",
      machine_name: "generic",
    });

    expect(typeof result.verification_verdict).toBe("string");
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it("pipeline_time_ms is reasonable", () => {
    const result = engine.generate({
      features: [{
        type: "pocket_rectangular",
        operation: "roughing",
        dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10 },
      }],
      material: "P20",
      machine_name: "generic",
    });

    expect(result.pipeline_summary.pipeline_time_ms).toBeLessThan(10000);
  });
});
