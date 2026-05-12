import { describe, it, expect } from "vitest";
import {
  ScalableCAMOrchestratorEngine,
  ComplexPartFeature,
} from "../engines/ScalableCAMOrchestratorEngine.js";

const engine = new ScalableCAMOrchestratorEngine();

function generateAerospaceFeatures(count: number): ComplexPartFeature[] {
  const features: ComplexPartFeature[] = [];
  const types = [
    "pocket_rectangular", "through_hole", "slot", "boss",
    "contour", "face", "counterbore", "fillet",
  ];
  const ops: Array<"roughing" | "finishing" | "drilling" | "facing"> = [
    "roughing", "finishing", "drilling", "facing",
  ];
  const dirs = [
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
  ];

  for (let i = 0; i < count; i++) {
    features.push({
      id: `feat-${i}`,
      type: types[i % types.length],
      operation: ops[i % ops.length],
      position: {
        x: (i % 15) * 20,
        y: Math.floor(i / 15) * 20,
        z: 0,
      },
      access_direction: dirs[i % dirs.length],
      dimensions: {
        length_mm: 15 + (i % 5) * 5,
        width_mm: 12 + (i % 3) * 4,
        depth_mm: 5 + (i % 4) * 3,
        diameter_mm: i % 3 === 2 ? 8 + (i % 5) * 2 : undefined,
      },
      tolerance_mm: 0.05,
      surface_finish_Ra: i % 4 === 1 ? 0.8 : undefined,
      wall_thickness_mm: i % 5 === 0 ? 3 : undefined,
    });
  }
  return features;
}

const stock = { length_mm: 300, width_mm: 250, height_mm: 50 };

describe("ScalableCAMOrchestratorEngine", () => {
  it("processes 10 features into setups with G-code", () => {
    const result = engine.process({
      features: generateAerospaceFeatures(10),
      material: "P20 Mold Steel",
      machine_name: "DMG DMU 50",
      stock_dims: stock,
    });

    expect(result.success).toBe(true);
    expect(result.total_setups).toBeGreaterThan(0);
    expect(result.combined_gcode).toContain("G01");
    expect(result.combined_gcode).toContain("M03");
    expect(result.pipeline_summary.total_features).toBe(10);
    expect(result.pipeline_summary.total_segments).toBeGreaterThan(10);
    expect(result.pipeline_summary.algorithms_used.length).toBeGreaterThan(0);
  });

  it("handles 50 features with multiple setups", () => {
    const result = engine.process({
      features: generateAerospaceFeatures(50),
      material: "Ti-6Al-4V",
      machine_name: "Hermle C42",
      stock_dims: stock,
    });

    expect(result.success).toBe(true);
    expect(result.total_setups).toBeGreaterThan(1);
    expect(result.pipeline_summary.total_operations).toBe(50);
    expect(result.setups.length).toBeGreaterThan(1);

    for (const setup of result.setups) {
      expect(setup.gcode.length).toBeGreaterThan(50);
      expect(setup.tools_used.length).toBeGreaterThan(0);
      expect(setup.feature_count).toBeGreaterThan(0);
    }
  });

  it("handles 200+ features in under 10 seconds", () => {
    const t0 = Date.now();
    const result = engine.process({
      features: generateAerospaceFeatures(200),
      material: "7075-T6 Aluminum",
      machine_name: "Haas VF-4",
      stock_dims: { length_mm: 500, width_mm: 400, height_mm: 60 },
    });
    const elapsed = Date.now() - t0;

    expect(result.success).toBe(true);
    expect(result.pipeline_summary.total_features).toBe(200);
    expect(result.pipeline_summary.total_operations).toBe(200);
    expect(elapsed).toBeLessThan(10000);
    expect(result.total_gcode_lines).toBeGreaterThan(100);
    expect(result.pipeline_summary.total_tools).toBeGreaterThan(0);
  });

  it("tracks stock removal through chain", () => {
    const result = engine.process({
      features: generateAerospaceFeatures(20),
      material: "P20",
      machine_name: "generic",
      stock_dims: stock,
    });

    expect(result.stock_chain.initial_volume_mm3).toBe(
      300 * 250 * 50
    );
    expect(result.stock_chain.removed_pct).toBeGreaterThanOrEqual(0);
    expect(result.stock_chain.final_volume_mm3).toBeLessThanOrEqual(
      result.stock_chain.initial_volume_mm3
    );
  });

  it("provides per-setup physics report", () => {
    const result = engine.process({
      features: generateAerospaceFeatures(15),
      material: "304 Stainless",
      machine_name: "DMG DMU 50",
      stock_dims: stock,
    });

    expect(result.physics_report.per_setup.length).toBe(result.total_setups);
    for (const ps of result.physics_report.per_setup) {
      expect(ps.max_force_N).toBeGreaterThanOrEqual(0);
      expect(ps.max_power_kW).toBeGreaterThanOrEqual(0);
    }
  });

  it("provides cycle time with setup changes", () => {
    const result = engine.process({
      features: generateAerospaceFeatures(30),
      material: "P20",
      machine_name: "generic",
      stock_dims: stock,
    });

    expect(result.cycle_time.per_setup_min.length).toBe(result.total_setups);
    expect(result.cycle_time.total_min).toBeGreaterThan(0);
    if (result.total_setups > 1) {
      expect(result.cycle_time.setup_change_min).toBeGreaterThan(0);
      expect(result.cycle_time.grand_total_min).toBeGreaterThan(
        result.cycle_time.total_min
      );
    }
  });

  it("selects tools from catalog for each feature", () => {
    const result = engine.process({
      features: generateAerospaceFeatures(10),
      material: "P20",
      machine_name: "Haas VF-2",
      stock_dims: stock,
    });

    expect(result.tool_list.length).toBeGreaterThan(0);
    for (const tool of result.tool_list) {
      expect(tool.diameter_mm).toBeGreaterThan(0);
      expect(tool.type).toBeTruthy();
    }
  });

  it("includes tribal knowledge tips", () => {
    const result = engine.process({
      features: generateAerospaceFeatures(5),
      material: "Inconel 718",
      machine_name: "generic",
      stock_dims: stock,
    });

    expect(result.tribal_tips.length).toBeGreaterThan(0);
  });

  it("deduplicates warnings", () => {
    const result = engine.process({
      features: generateAerospaceFeatures(50),
      material: "P20",
      machine_name: "generic",
      stock_dims: stock,
    });

    // No duplicate warnings
    const unique = new Set(result.warnings);
    expect(result.warnings.length).toBe(unique.size);
  });

  it("generates separate G-code per setup", () => {
    const result = engine.process({
      features: generateAerospaceFeatures(20),
      material: "P20",
      machine_name: "generic",
      stock_dims: stock,
    });

    for (const setup of result.setups) {
      expect(setup.gcode).toContain("O");
      expect(setup.gcode).toContain("M30");
      expect(setup.gcode_lines).toBeGreaterThan(5);
    }
  });
});
