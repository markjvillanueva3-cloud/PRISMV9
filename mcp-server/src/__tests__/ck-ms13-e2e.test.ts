/**
 * CK-MS13 U01 — End-to-end integration tests
 * Tests the full CAM pipeline via CAMKernelDispatcherBridge dispatcher.
 */

import { describe, it, expect } from "vitest";
import {
  dispatchCAMAction,
  listCAMActions,
} from "../engines/CAMKernelDispatcherBridge.js";

// ─── Minimal shared fixtures ────────────────────────────────────────────────

const SIMPLE_FEATURES = [
  {
    type: "pocket",
    width_mm: 50,
    height_mm: 30,
    depth_mm: 10,
    material: "aluminum",
  },
];

const POLYGON_BOUNDARY = [
  { x: 0, y: 0 },
  { x: 80, y: 0 },
  { x: 80, y: 60 },
  { x: 0, y: 60 },
];

const PRODUCTION_CONFIG = {
  tool_diameter_mm: 12,
  spindle_rpm: 8000,
  feed_mmpm: 1200,
  depth_mm: 10,
  stepover_mm: 6,
  material: "aluminum",
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("CK-MS13 E2E: cam_unified_generate", () => {
  it("generates G-code with G01/G02/G03 motion blocks", async () => {
    const result = await dispatchCAMAction("cam_unified_generate", {
      features: SIMPLE_FEATURES,
      material: "aluminum",
      machine: "generic_3axis",
    });
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    const gcode: string = result.gcode ?? result.combined_gcode ?? "";
    expect(typeof gcode).toBe("string");
    expect(gcode.length).toBeGreaterThan(0);
    // Must contain at least one motion word
    expect(/G0[0123]/i.test(gcode)).toBe(true);
  });

  it("includes tool change (T or M06) in generated G-code", async () => {
    const result = await dispatchCAMAction("cam_unified_generate", {
      features: SIMPLE_FEATURES,
      material: "steel",
      machine: "generic_3axis",
    });
    expect(result).toBeDefined();
    const gcode: string = result.gcode ?? "";
    // Tool change block: T1, T01, or M06/M6
    expect(/T\d+|M0?6/i.test(gcode)).toBe(true);
  });

  it("includes S (spindle speed) and F (feed rate) in G-code", async () => {
    const result = await dispatchCAMAction("cam_unified_generate", {
      features: SIMPLE_FEATURES,
      material: "aluminum",
      machine: "generic_3axis",
    });
    expect(result).toBeDefined();
    const gcode: string = result.gcode ?? "";
    expect(/S\d+/i.test(gcode)).toBe(true);
    expect(/F\d+/i.test(gcode)).toBe(true);
  });
});

describe("CK-MS13 E2E: cam_production_toolpath", () => {
  it("returns real toolpath segments for polygon boundary", async () => {
    const result = await dispatchCAMAction("cam_production_toolpath", {
      boundary: POLYGON_BOUNDARY,
      config: PRODUCTION_CONFIG,
      program_number: 1001,
      controller: "fanuc",
    });
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    // Must have segments or gcode
    const hasSegments =
      Array.isArray(result.segments) ||
      Array.isArray(result.toolpath) ||
      typeof result.gcode === "string";
    expect(hasSegments).toBe(true);
    if (Array.isArray(result.segments)) {
      expect(result.segments.length).toBeGreaterThan(0);
    }
  });

  it("returns a program number in the result", async () => {
    const result = await dispatchCAMAction("cam_production_toolpath", {
      boundary: POLYGON_BOUNDARY,
      config: PRODUCTION_CONFIG,
      program_number: 2002,
      controller: "fanuc",
    });
    expect(result).toBeDefined();
    // Check gcode or program_number field
    const gcodeStr = result.gcode ?? "";
    const hasProgramRef =
      result.program_number !== undefined ||
      gcodeStr.includes("2002") ||
      gcodeStr.includes("O2002");
    expect(hasProgramRef).toBe(true);
  });
});

describe("CK-MS13 E2E: cam_advanced_strategy (flowline)", () => {
  it("returns toolpath points for flowline strategy", async () => {
    const result = await dispatchCAMAction("cam_advanced_strategy", {
      strategy: "flowline",
      start_curve: [
        { x: 0, y: 0, z: 0 },
        { x: 50, y: 0, z: 0 },
      ],
      end_curve: [
        { x: 0, y: 50, z: 0 },
        { x: 50, y: 50, z: 0 },
      ],
      config: {
        tool_diameter_mm: 10,
        tool_flute_count: 4,
        feed_per_tooth_mm: 0.08,
        cutting_speed_mpm: 200,
        rpm: 6000,
        stepover_mm: 5,
        doc_mm: 1,
      },
      num_passes: 5,
    });
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    // AdvancedMillingStrategiesEngine.flowlineFinishing returns StrategyResult
    // with .segments (PathPoint[]), .segment_count, .strategy, etc.
    const hasPoints =
      Array.isArray(result.segments) ||
      Array.isArray(result.points) ||
      Array.isArray(result.passes) ||
      Array.isArray(result.toolpath);
    expect(hasPoints).toBe(true);
  });
});

describe("CK-MS13 E2E: cam_smart_tool", () => {
  it("returns catalog tool(s) for pocket feature selection", async () => {
    // SmartToolSelectorEngine.select() expects operation_type + material_iso_group
    const result = await dispatchCAMAction("cam_smart_tool", {
      operation_type: "pocket",
      material_iso_group: "N",
      material_name: "aluminum",
      feature_depth_mm: 15,
      feature_width_mm: 40,
      tolerance_mm: 0.05,
    });
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    // SmartToolSelectionOutput has: candidates[], best_tool, machine_used, material, operation
    const hasTools =
      (Array.isArray(result.candidates) && result.candidates.length > 0) ||
      result.best_tool !== undefined ||
      result.tool !== undefined;
    expect(hasTools).toBe(true);
  });
});

describe("CK-MS13 E2E: cam_verify", () => {
  it("returns a verification result with status/issues fields", async () => {
    // IntegratedVerificationEngine.verify() expects toolpath_segments[], tool (singular),
    // material_iso_group. machine fields use x_travel_mm / y_travel_mm / z_travel_mm.
    const result = await dispatchCAMAction("cam_verify", {
      toolpath_segments: [
        { x: 0,  y: 0,  z: 5,   feed_mmmin: 15000, rpm: 5000, type: "rapid" },
        { x: 0,  y: 0,  z: -5,  feed_mmmin: 500,   rpm: 5000, type: "plunge", ae_mm: 6, ap_mm: 5 },
        { x: 50, y: 0,  z: -5,  feed_mmmin: 1200,  rpm: 5000, type: "feed",   ae_mm: 6, ap_mm: 5 },
        { x: 50, y: 30, z: -5,  feed_mmmin: 1200,  rpm: 5000, type: "feed",   ae_mm: 6, ap_mm: 5 },
        { x: 0,  y: 30, z: -5,  feed_mmmin: 1200,  rpm: 5000, type: "feed",   ae_mm: 6, ap_mm: 5 },
        { x: 0,  y: 0,  z: 50,  feed_mmmin: 15000, rpm: 5000, type: "retract" },
      ],
      tool: { diameter_mm: 12, flute_length_mm: 30, overall_length_mm: 75, flute_count: 4 },
      material_iso_group: "N",
      machine: { x_travel_mm: 500, y_travel_mm: 400, z_travel_mm: 300, max_rpm: 15000, max_power_kw: 20 },
    });
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    // IntegratedVerificationEngine returns VerificationResult with verdict + issues + summary
    const hasResult =
      result.verdict !== undefined ||
      result.issues !== undefined ||
      result.summary !== undefined ||
      result.status !== undefined;
    expect(hasResult).toBe(true);
  });
});

describe("CK-MS13 E2E: cam_chatter_rpm", () => {
  it("returns a safe RPM in a reasonable range (100–100000)", async () => {
    // ProductionToolpathEngine.selectChatterSafeRPM() requires:
    // tool_diameter_mm, tool_flute_count, tool_overhang_mm, material_iso_group,
    // doc_mm, target_rpm, machine_max_rpm
    const result = await dispatchCAMAction("cam_chatter_rpm", {
      tool_diameter_mm: 12,
      tool_flute_count: 4,
      tool_overhang_mm: 50,
      material_iso_group: "N",
      doc_mm: 10,
      target_rpm: 8000,
      machine_max_rpm: 15000,
    });
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    // Returns { safe_rpm, p_chatter_pct, method }
    const rpm =
      result.safe_rpm ??
      result.recommended_rpm ??
      result.rpm ??
      result.chatter_safe_rpm;
    expect(typeof rpm).toBe("number");
    expect(rpm).toBeGreaterThan(100);
    expect(rpm).toBeLessThan(100000);
  });
});

describe("CK-MS13 E2E: cam_cost_feature", () => {
  it("returns cost breakdown with at least one cost field", async () => {
    const segments = [
      { type: "linear" as const, start: { x: 0, y: 0, z: 0 }, end: { x: 50, y: 0, z: -5 }, feed_mmpm: 1200 },
      { type: "linear" as const, start: { x: 50, y: 0, z: -5 }, end: { x: 50, y: 30, z: -5 }, feed_mmpm: 1200 },
    ];
    const result = await dispatchCAMAction("cam_cost_feature", {
      segments,
      config: {
        tool_diameter_mm: 12,
        spindle_rpm: 8000,
        feed_mmpm: 1200,
        material: "aluminum",
        machine_rate_per_hr: 80,
        tool_cost_per_edge: 4.5,
      },
    });
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    const hasCost =
      result.total_cost !== undefined ||
      result.cost_breakdown !== undefined ||
      result.machine_cost !== undefined ||
      result.tool_cost !== undefined ||
      result.cost_usd !== undefined;
    expect(hasCost).toBe(true);
  });
});

describe("CK-MS13 E2E: cam_multi_process", () => {
  it("routes multi-process features and returns per-process programs", async () => {
    const result = await dispatchCAMAction("cam_multi_process", {
      features: [
        { type: "turning", diameter_mm: 40, length_mm: 80, material: "steel" },
        { type: "milling", width_mm: 20, depth_mm: 5, material: "steel" },
      ],
      material: "steel",
      machine: { capabilities: ["turning", "milling"] },
    });
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    const hasPrograms =
      result.programs !== undefined ||
      result.processes !== undefined ||
      result.results !== undefined ||
      result.gcode !== undefined;
    expect(hasPrograms).toBe(true);
  });
});

describe("CK-MS13 E2E: cam_list_actions", () => {
  it("returns 11 or more named actions", () => {
    const actions = listCAMActions();
    expect(Array.isArray(actions)).toBe(true);
    expect(actions.length).toBeGreaterThanOrEqual(11);
  });

  it("every action entry has action, description, engine fields", () => {
    const actions = listCAMActions();
    for (const entry of actions) {
      expect(typeof entry.action).toBe("string");
      expect(entry.action.length).toBeGreaterThan(0);
      expect(typeof entry.description).toBe("string");
      expect(entry.description.length).toBeGreaterThan(0);
      expect(typeof entry.engine).toBe("string");
      expect(entry.engine.length).toBeGreaterThan(0);
    }
  });

  it("includes all expected action names", () => {
    const actions = listCAMActions();
    const names = actions.map((a) => a.action);
    const expected = [
      "cam_unified_generate",
      "cam_production_toolpath",
      "cam_advanced_strategy",
      "cam_smart_tool",
      "cam_verify",
      "cam_chatter_rpm",
      "cam_cost_feature",
      "cam_multi_process",
    ];
    for (const name of expected) {
      expect(names).toContain(name);
    }
  });
});
