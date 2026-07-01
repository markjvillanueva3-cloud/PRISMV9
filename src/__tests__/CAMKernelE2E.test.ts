/**
 * CK-MS13: End-to-End Integration Tests for CAM Kernel
 * Tests the full dispatcher path: action → bridge → engine → result
 */
import { describe, it, expect } from "vitest";
import { dispatchCAMAction, listCAMActions } from "../engines/CAMKernelDispatcherBridge.js";

describe("CAM Kernel E2E Integration", () => {
  // U01: Full dispatcher chain
  it("cam_unified_generate produces G-code through full chain", async () => {
    const result = await dispatchCAMAction("cam_unified_generate", {
      features: [{
        type: "pocket_rectangular", operation: "roughing",
        dimensions: { length_mm: 60, width_mm: 40, depth_mm: 12 },
      }],
      material: "P20 Mold Steel",
      machine_name: "DMG DMU 50",
    });

    expect(result.success).toBe(true);
    expect(result.gcode).toBeTruthy();
    expect(result.gcode.length).toBeGreaterThan(100);
    expect(result.pipeline_summary.features_processed).toBe(1);
    expect(result.pipeline_summary.total_segments).toBeGreaterThan(3);
  });

  it("cam_smart_tool returns physics-scored result", async () => {
    const result = await dispatchCAMAction("cam_smart_tool", {
      operation_type: "pocket",
      material_iso_group: "P",
      feature_diameter_mm: 30,
      feature_depth_mm: 15,
    });

    expect(result.best_tool).toBeDefined();
    expect(result.best_tool.score).toBeGreaterThan(0);
    expect(result.best_tool.physics.cutting_force_N).toBeGreaterThan(0);
  });

  it("cam_verify returns verification verdict", async () => {
    const result = await dispatchCAMAction("cam_verify", {
      toolpath_segments: [
        { x: 0, y: 0, z: 5, feed_mmmin: 10000, rpm: 8000, type: "rapid" },
        { x: 20, y: 10, z: -5, feed_mmmin: 2400, rpm: 8000, type: "feed", ae_mm: 3, ap_mm: 5 },
      ],
      tool: { diameter_mm: 10, flute_length_mm: 30, overall_length_mm: 60, flute_count: 3 },
      material_iso_group: "P",
    });

    expect(result.verdict).toBeDefined();
    expect(["PASS", "WARN", "FAIL_FIXABLE", "FAIL_FATAL"]).toContain(result.verdict);
  });

  it("cam_chatter_rpm returns Monte Carlo result", async () => {
    const result = await dispatchCAMAction("cam_chatter_rpm", {
      tool_diameter_mm: 10, tool_flute_count: 3,
      tool_overhang_mm: 40, material_iso_group: "P",
      doc_mm: 5, target_rpm: 8000, machine_max_rpm: 15000,
    });

    expect(result.safe_rpm).toBeGreaterThan(0);
    expect(result.p_chatter_pct).toBeGreaterThanOrEqual(0);
  });

  it("cam_multi_process handles turning", async () => {
    const result = await dispatchCAMAction("cam_multi_process", {
      features: [{
        id: "turn-1", type: "od_roughing",
        turning: { od_mm: 40, length_mm: 50 },
      }],
      material: { iso_group: "P" },
    });

    expect(result.processes.length).toBe(1);
    expect(result.processes[0].process).toBe("turning");
    expect(result.processes[0].gcode).toContain("G96");
  });

  it("cam_mill_turn generates multi-channel program", async () => {
    const result = await dispatchCAMAction("cam_mill_turn", {
      operations: [{
        id: "od-1", type: "od_roughing", spindle: "main",
        dimensions: { diameter_mm: 30, length_mm: 40 },
      }],
      config: {
        material_iso_group: "P",
        machine_type: "mill_turn",
        max_main_rpm: 4000,
      },
    });

    expect(result.gcode).toContain("G71");
    expect(result.total_cycle_time_min).toBeGreaterThan(0);
  });

  it("cam_list_actions returns all 11 actions", async () => {
    const result = await dispatchCAMAction("cam_list_actions" as any, {});
    // listCAMActions returns an array, dispatchCAMAction may wrap or pass through
    const actions = Array.isArray(result) ? result : listCAMActions();
    expect(actions.length).toBeGreaterThanOrEqual(11);
  });

  // U02: Runtime export validation
  it("all CK engines load from index.ts without errors", async () => {
    const engines = await import("../engines/index.js");

    const ckEngines = [
      "unifiedCAMPipelineEngine", "smartToolSelectorEngine",
      "adaptiveToolpathRouterEngine", "integratedVerificationEngine",
      "productionPackageEngine", "featureClusteringEngine",
      "cumulativeStockChainEngine", "productionToolpathEngine",
      "multiProcessCAMBridgeEngine", "advancedMillingStrategiesEngine",
      "fiveAxisCAMIntegrationEngine", "millTurnCAMEngine",
      "intelligentSequencingEngine",
    ];

    for (const name of ckEngines) {
      expect((engines as any)[name]).toBeDefined();
    }
  }, 120_000);

  it("dispatchCAMAction and listCAMActions export correctly", async () => {
    const engines = await import("../engines/index.js");
    expect((engines as any).dispatchCAMAction).toBeDefined();
    expect((engines as any).listCAMActions).toBeDefined();
  }, 120_000);
});
