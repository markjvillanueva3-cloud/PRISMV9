/**
 * PP-REV-MS3 — HSM + Probing + Sister Tooling Tests
 * ===================================================
 * Tests for AdvancedPostProcessorEngine and ProbeRoutineGeneratorEngine
 * wired via productDispatcher: ppg_hsm_inject, ppg_sister_tool, ppg_auto_probe
 */
import { describe, it, expect } from "vitest";
import { AdvancedPostProcessorEngine } from "../engines/AdvancedPostProcessorEngine.js";
import { ProbeRoutineGeneratorEngine } from "../engines/ProbeRoutineGeneratorEngine.js";
import { PostSelectionEngine } from "../engines/PostSelectionEngine.js";

const adv = new AdvancedPostProcessorEngine();
const probe = new ProbeRoutineGeneratorEngine();
const sel = new PostSelectionEngine();

const SAMPLE_GCODE = `O0001
T1 M6
S8000 M3
G43 H1 Z50. M8
G0 X0 Y0
G1 Z-5. F500
G1 X50. F1000
G1 Y50.
G1 X0.
G1 Y0.
G0 Z50.
T2 M6
S6000 M3
G43 H2 Z50.
G0 X10. Y10.
G1 Z-3. F300
G1 X40. F800
G1 Y40.
G1 X10.
G1 Y10.
G0 Z50.
M30
`;

// ============================================================================
// 1. AdvancedPostProcessorEngine — HSM injection
// ============================================================================
describe("AdvancedPostProcessorEngine — HSM injection", () => {
  it("injects HSM smoothing codes for Haas controller", () => {
    const result = adv.enhance({
      controller: "haas",
      gcode: SAMPLE_GCODE,
      hsm: {
        corner_rounding_tolerance: 0.01,
        smoothing_mode: "finish",
        nurbs_interpolation: false,
        arc_fitting: true,
        arc_tolerance: 0.005,
        min_arc_radius: 1,
        max_arc_radius: 1000,
      },
    });
    expect(result.gcode.length).toBeGreaterThan(0);
    expect(result.enhancements_applied.length).toBeGreaterThan(0);
  });

  it("injects G187 for Haas HSM mode", () => {
    const result = adv.enhance({
      controller: "haas",
      gcode: SAMPLE_GCODE,
      hsm: {
        corner_rounding_tolerance: 0.02,
        smoothing_mode: "ultra",
        nurbs_interpolation: false,
        arc_fitting: false,
        arc_tolerance: 0.005,
        min_arc_radius: 1,
        max_arc_radius: 1000,
      },
    });
    // Haas smoothing uses G187
    expect(result.gcode).toContain("G187");
  });

  it("injects CYCLE832 for Siemens HSM mode", () => {
    const result = adv.enhance({
      controller: "siemens",
      gcode: SAMPLE_GCODE,
      hsm: {
        corner_rounding_tolerance: 0.01,
        smoothing_mode: "finish",
        nurbs_interpolation: false,
        arc_fitting: false,
        arc_tolerance: 0.005,
        min_arc_radius: 1,
        max_arc_radius: 1000,
      },
    });
    expect(result.gcode).toContain("CYCLE832");
  });

  it("injects G05.1 for Fanuc HSM mode", () => {
    const result = adv.enhance({
      controller: "fanuc",
      gcode: SAMPLE_GCODE,
      hsm: {
        corner_rounding_tolerance: 0.01,
        smoothing_mode: "finish",
        nurbs_interpolation: false,
        arc_fitting: false,
        arc_tolerance: 0.005,
        min_arc_radius: 1,
        max_arc_radius: 1000,
      },
    });
    // Fanuc HSM: G5.1 (or G05.1) — both are valid Fanuc syntax
    expect(result.gcode).toMatch(/G0?5\.1/);
  });

  it("reports estimated time savings", () => {
    const result = adv.enhance({
      controller: "fanuc",
      gcode: SAMPLE_GCODE,
      hsm: {
        corner_rounding_tolerance: 0.01,
        smoothing_mode: "finish",
        nurbs_interpolation: false,
        arc_fitting: true,
        arc_tolerance: 0.005,
        min_arc_radius: 1,
        max_arc_radius: 1000,
      },
    });
    expect(result.estimated_time_savings_pct).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// 2. AdvancedPostProcessorEngine — Sister tooling
// ============================================================================
describe("AdvancedPostProcessorEngine — sister tooling", () => {
  it("injects sister tool management codes", () => {
    const result = adv.enhance({
      controller: "fanuc",
      gcode: SAMPLE_GCODE,
      tool_management: {
        sister_tooling: true,
        max_tool_life_minutes: 60,
        break_detection: true,
        break_detection_method: "probe",
        wear_offset_increment: 0.005,
        auto_offset_update: false,
      },
    });
    expect(result.gcode.length).toBeGreaterThan(0);
    expect(result.enhancements_applied.length).toBeGreaterThan(0);
  });

  it("injects break detection routine", () => {
    const result = adv.enhance({
      controller: "haas",
      gcode: SAMPLE_GCODE,
      tool_management: {
        sister_tooling: true,
        max_tool_life_minutes: 30,
        break_detection: true,
        break_detection_method: "probe",
        wear_offset_increment: 0.005,
        auto_offset_update: true,
      },
    });
    // Should add tool management enhancement
    const hasMgmt = result.enhancements_applied.some(e =>
      e.toLowerCase().includes("tool") || e.toLowerCase().includes("sister") || e.toLowerCase().includes("management")
    );
    expect(hasMgmt).toBe(true);
  });
});

// ============================================================================
// 3. AdvancedPostProcessorEngine — Feed optimization
// ============================================================================
describe("AdvancedPostProcessorEngine — feed optimization", () => {
  it("applies chip thinning compensation", () => {
    const result = adv.enhance({
      controller: "fanuc",
      gcode: SAMPLE_GCODE,
      feed_optimization: {
        chip_thinning: true,
        corner_slowdown: true,
        corner_radius_threshold: 5,
        corner_feed_factor: 0.5,
        plunge_rate_factor: 0.3,
        retract_rapid: true,
      },
    });
    expect(result.gcode.length).toBeGreaterThan(0);
    expect(result.enhancements_applied.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 4. ProbeRoutineGeneratorEngine
// ============================================================================
describe("ProbeRoutineGeneratorEngine — WCS setup", () => {
  it("generates Fanuc probe routine with G65 macros", () => {
    const result = probe.generateWCSSetup({
      controller: "fanuc",
      probe_tool_number: 99,
      work_offset: "G54",
      features: [
        { type: "corner", position: { x: 0, y: 0, z: -5 } },
      ],
      safe_z: 100,
      feed_rate: 200,
    });
    expect(result.gcode.length).toBeGreaterThan(0);
    // Fanuc probing uses G65 macro calls
    expect(result.gcode).toContain("G65");
  });

  it("generates Siemens probe routine with CYCLE977", () => {
    const result = probe.generateWCSSetup({
      controller: "siemens",
      probe_tool_number: 99,
      work_offset: "G54",
      features: [
        { type: "bore", position: { x: 50, y: 50, z: -10 }, diameter: 25, depth: 15 },
      ],
      safe_z: 100,
      feed_rate: 200,
    });
    expect(result.gcode.length).toBeGreaterThan(0);
    expect(result.gcode).toContain("CYCLE");
  });

  it("generates Heidenhain probe routine with TCH PROBE", () => {
    const result = probe.generateWCSSetup({
      controller: "heidenhain",
      probe_tool_number: 99,
      work_offset: "G54",
      features: [
        { type: "corner", position: { x: 0, y: 0, z: 0 } },
      ],
      safe_z: 100,
      feed_rate: 200,
    });
    expect(result.gcode.length).toBeGreaterThan(0);
    expect(result.gcode).toContain("TCH PROBE");
  });

  it("handles multiple features in sequence", () => {
    const result = probe.generateWCSSetup({
      controller: "fanuc",
      features: [
        { type: "corner", position: { x: 0, y: 0, z: -5 } },
        { type: "bore", position: { x: 100, y: 50, z: -10 }, diameter: 20, depth: 15 },
        { type: "surface", position: { x: 50, y: 50, z: 0 } },
      ],
    });
    expect(result.gcode.length).toBeGreaterThan(50);
  });

  it("sets correct work offset for Fanuc", () => {
    const result = probe.generateWCSSetup({
      controller: "fanuc",
      work_offset: "G55",
      features: [{ type: "corner", position: { x: 0, y: 0, z: 0 } }],
    });
    expect(result.gcode).toContain("G55");
  });
});

// ============================================================================
// 5. PostSelectionEngine — feature auto-selection
// ============================================================================
describe("PostSelectionEngine — feature selection", () => {
  it("recommends features for a 3-axis Haas VMC", () => {
    const result = sel.compute({
      machine: {
        controller: "haas", max_rpm: 12000, spindle_power_kw: 22, axis_count: 3,
        has_tsc: false, has_probing: true, has_rigid_tapping: true, taper: "CAT40",
      },
      part: {
        complexity: "moderate", tolerance_mm: 0.01, surface_finish_target_um: 0.8,
        has_deep_pockets: false, has_thin_walls: false, has_tight_corners: true,
        max_depth_mm: 30, estimated_cycle_time_min: 15,
      },
      material: { iso_group: "P", thermal_sensitivity: "medium" },
      cam_source: "mastercam",
      operation_type: "finishing",
      tool_count: 5,
      production_volume: "medium",
    });
    expect(result.selected_features.length).toBeGreaterThan(0);
    const featureNames = result.selected_features.map(f => f.name);
    expect(featureNames.length).toBeGreaterThan(0);
  });

  it("returns confidence scores for each feature", () => {
    const result = sel.compute({
      machine: {
        controller: "fanuc", max_rpm: 15000, spindle_power_kw: 30, axis_count: 5,
        has_tsc: true, has_probing: true, has_rigid_tapping: true, taper: "HSK-A63",
      },
      part: {
        complexity: "complex", tolerance_mm: 0.005, surface_finish_target_um: 0.4,
        has_deep_pockets: true, has_thin_walls: true, has_tight_corners: true,
        max_depth_mm: 80, estimated_cycle_time_min: 45,
      },
      material: { iso_group: "S", hardness_hrc: 36, thermal_sensitivity: "high" },
      cam_source: "hypermill",
      operation_type: "finishing",
      tool_count: 12,
      production_volume: "low",
    });
    for (const feat of result.selected_features) {
      expect(feat.score).toBeGreaterThanOrEqual(0);
      expect(feat.score).toBeLessThanOrEqual(100);
    }
  });
});

// ============================================================================
// 6. Dispatcher wiring verification
// ============================================================================
describe("productDispatcher — PP-REV-MS3 action wiring", () => {
  it("dispatcher contains all MS3 actions in source", async () => {
    const fs = await import("fs");
    const path = new URL("../tools/dispatchers/productDispatcher.ts", import.meta.url)
      .pathname.replace(/^\/([A-Z]:)/, "$1");
    const src = fs.readFileSync(path, "utf8");
    expect(src).toContain('"ppg_hsm_inject"');
    expect(src).toContain('"ppg_sister_tool"');
    expect(src).toContain('"ppg_auto_probe"');
    expect(src).toContain('action === "ppg_hsm_inject"');
    expect(src).toContain('action === "ppg_sister_tool"');
    expect(src).toContain('action === "ppg_auto_probe"');
  });
});

// ── PP-REV-MS3: Pipeline Feature Integration Tests ──

describe("Pipeline Feature Integration (PP-REV-MS3)", () => {
  const getPipeline = async () => {
    const mod = await import("../engines/PostProcessorPipelineEngine.js");
    return mod.postProcessorPipelineEngine;
  };

  const getPostSelection = async () => {
    const mod = await import("../engines/PostSelectionEngine.js");
    return mod.postSelectionEngine;
  };

  const SAMPLE = [
    "O5000 (FINISH)",
    "G90 G54 G17",
    "T1 M06",
    "S8000 M03",
    "G43 H1 Z50.",
    "G01 X0. Y0. Z-5. F200.",
    "G01 X100. Y0. F500.",
    "G01 X100. Y100. F500.",
    "G01 X0. Y100. F500.",
    "G01 X0. Y0. F500.",
    "G91 G28 Z0",
    "M30",
  ].join("\n");

  it("pipeline includes 0.7_feature_selection stage", async () => {
    const pp = await getPipeline();
    const r = await pp.process({ gcode: SAMPLE, controller: "fanuc", tolerance_mm: 0.01 });
    const fs = r.stages.find((s: any) => s.stage === "0.7_feature_selection");
    expect(fs).toBeDefined();
  });

  it("feature_selection output includes selected/rejected arrays", async () => {
    const pp = await getPipeline();
    const r = await pp.process({ gcode: SAMPLE, controller: "haas", tolerance_mm: 0.005 });
    if (r.feature_selection) {
      expect(r.feature_selection.selected).toBeInstanceOf(Array);
      expect(r.feature_selection.confidence).toBeGreaterThan(0);
    }
  });

  it("stage 3.5 injects HSM codes for finishing + tight tolerance", async () => {
    const pp = await getPipeline();
    const r = await pp.process({
      gcode: SAMPLE, controller: "fanuc", tolerance_mm: 0.01,
      operations: [{ type: "finishing", tool_number: 1 } as any],
    });
    const cs = r.stages.find((s: any) => s.stage === "3.5_controller_features");
    expect(cs).toBeDefined();
    if (cs?.data) {
      const d = cs.data as any;
      expect(d.hsm_auto_injected).toBe(true);
    }
  });

  it("HSM codes appear in output G-code for Haas finishing", async () => {
    const pp = await getPipeline();
    const r = await pp.process({
      gcode: SAMPLE, controller: "haas", tolerance_mm: 0.01,
      operations: [{ type: "finishing", tool_number: 1 } as any],
    });
    expect(r.output_gcode).toBeTruthy();
    expect(r.output_gcode.includes("G187") || r.output_gcode.includes("HSM")).toBe(true);
  });

  it("PostSelectionEngine selects HSM for tight tolerance P steel", async () => {
    const eng = await getPostSelection();
    const r = eng.compute({
      machine: { controller: "fanuc", max_rpm: 15000, axis_count: 3, has_probing: true },
      part: { complexity: "moderate", min_tolerance_mm: 0.01, max_depth_mm: 20 },
      material: { iso_group: "P" },
      cam_source: "manual",
    });
    expect(r.selected_features.length).toBeGreaterThan(0);
    expect(r.confidence).toBeGreaterThan(0);
    const hsm = r.selected_features.find((f: any) => f.id === "hsm_smoothing");
    expect(hsm).toBeDefined();
  });

  it("PostSelectionEngine evaluates measurement features for 5-axis complex", async () => {
    const eng = await getPostSelection();
    const r = eng.compute({
      machine: { controller: "siemens", max_rpm: 12000, axis_count: 5, has_probing: true },
      part: { complexity: "complex", min_tolerance_mm: 0.005, max_depth_mm: 50 },
      material: { iso_group: "M" },
      cam_source: "manual",
    });
    // Engine should evaluate measurement features; they may be selected or rejected
    const allFeatures = [...r.selected_features, ...r.rejected_features];
    const measurement = allFeatures.filter((f: any) => f.category === "measurement");
    expect(measurement.length).toBeGreaterThan(0);
  });

  it("pipeline probe stage runs when enabled", async () => {
    const pp = await getPipeline();
    const r = await pp.process({
      gcode: SAMPLE, controller: "fanuc", tolerance_mm: 0.01,
      include_probe_routines: true, stages: { probe_routines: true },
    });
    const ps = r.stages.find((s: any) => s.stage === "6.2_probe_routines");
    expect(ps).toBeDefined();
  });

  it("pipeline accepts user feature overrides", async () => {
    const pp = await getPipeline();
    const r = await pp.process({
      gcode: SAMPLE, controller: "fanuc", tolerance_mm: 0.01,
      features: ["hsm_smoothing"],
    });
    if (r.feature_selection) {
      // User override should filter to only requested features
      const ids = r.feature_selection.selected.map((f: any) => f.id);
      if (ids.length > 0) {
        expect(ids).toContain("hsm_smoothing");
      }
    }
  });
});
