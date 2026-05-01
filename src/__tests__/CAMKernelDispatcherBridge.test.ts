import { describe, it, expect } from "vitest";
import {
  dispatchCAMAction, listCAMActions,
} from "../engines/CAMKernelDispatcherBridge.js";

describe("CAMKernelDispatcherBridge", () => {
  it("lists all 11 CAM actions", () => {
    const actions = listCAMActions();
    expect(actions.length).toBeGreaterThanOrEqual(11);
    expect(actions.map(a => a.action)).toContain("cam_unified_generate");
    expect(actions.map(a => a.action)).toContain("cam_mill_turn");
  });

  it("dispatches cam_unified_generate", async () => {
    const result = await dispatchCAMAction("cam_unified_generate", {
      features: [{
        type: "pocket_rectangular", operation: "roughing",
        dimensions: { length_mm: 50, width_mm: 30, depth_mm: 10 },
      }],
      material: "P20", machine_name: "generic",
    });
    expect(result.success).toBe(true);
    expect(result.gcode).toBeTruthy();
  });

  it("dispatches cam_smart_tool", async () => {
    const result = await dispatchCAMAction("cam_smart_tool", {
      operation_type: "pocket",
      material_iso_group: "P",
      feature_diameter_mm: 30,
    });
    expect(result.best_tool).toBeDefined();
    expect(result.best_tool.score).toBeGreaterThan(0);
  });

  it("dispatches cam_chatter_rpm", async () => {
    const result = await dispatchCAMAction("cam_chatter_rpm", {
      tool_diameter_mm: 10, tool_flute_count: 3,
      tool_overhang_mm: 40, material_iso_group: "P",
      doc_mm: 5, target_rpm: 8000, machine_max_rpm: 15000,
    });
    expect(result.safe_rpm).toBeGreaterThan(0);
    expect(result.p_chatter_pct).toBeGreaterThanOrEqual(0);
  });

  it("dispatches cam_multi_process", async () => {
    const result = await dispatchCAMAction("cam_multi_process", {
      features: [{
        id: "t1", type: "od_roughing",
        turning: { od_mm: 40, length_mm: 50 },
      }],
      material: { iso_group: "P" },
    });
    expect(result.processes.length).toBe(1);
    expect(result.processes[0].process).toBe("turning");
  });

  it("dispatches cam_verify", async () => {
    const result = await dispatchCAMAction("cam_verify", {
      toolpath_segments: [
        { x: 0, y: 0, z: 5, feed_mmmin: 10000, rpm: 8000, type: "rapid" },
        { x: 10, y: 10, z: -5, feed_mmmin: 2400, rpm: 8000, type: "feed", ae_mm: 3, ap_mm: 5 },
      ],
      tool: { diameter_mm: 10, flute_length_mm: 30, overall_length_mm: 60, flute_count: 3 },
      material_iso_group: "P",
    });
    expect(result.verdict).toBeDefined();
    expect(result.physics.max_force_N).toBeGreaterThanOrEqual(0);
  });

  it("returns error for unknown action", async () => {
    const result = await dispatchCAMAction("cam_nonexistent" as any, {});
    expect(result.error).toContain("Unknown");
  });
});
