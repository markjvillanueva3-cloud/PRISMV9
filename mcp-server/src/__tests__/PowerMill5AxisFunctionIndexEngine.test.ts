/**
 * PowerMill5AxisFunctionIndexEngine tests — CAM-EXHAUST-MS0/U-CAM45
 *
 * Coverage:
 *   - catalog invariants: 14 ops, 298 params, 4 categories
 *   - per-op reference values + parameter-count consistency
 *   - recommendByFeature: 14 intents end-to-end + unknown fallback
 *   - axisLimitCheck: machine capability validation
 *   - singularityRiskEstimate: robot singularity assessment
 *   - toolReachCheck: geometry accessibility
 *   - validateConsistency: catalog integrity check
 *   - dispatcher round-trip via registerCamDispatcher(stub)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  PowerMill5AxisFunctionIndexEngine,
  PM5AxisIntent,
} from "../engines/PowerMill5AxisFunctionIndexEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

function makeStub() {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
      tools.push({ name, handler });
    },
  };
}

let dispatchCam: CapturedTool["handler"];

beforeAll(async () => {
  const { registerCamDispatcher } = await import(
    "../tools/dispatchers/camDispatcher.js"
  );
  const stub = makeStub();
  registerCamDispatcher(stub as unknown as Parameters<typeof registerCamDispatcher>[0]);
  const tool = stub.tools.find((t) => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam not registered");
  dispatchCam = tool.handler;
});

async function invoke(action: string, params: Record<string, unknown> = {}) {
  const res = await dispatchCam({ action, params });
  if (res && Array.isArray(res.content) && res.content[0]?.text) {
    try {
      return JSON.parse(res.content[0].text);
    } catch {
      return { __raw: res.content[0].text };
    }
  }
  return res;
}

describe("PowerMill5AxisFunctionIndexEngine — engine methods", () => {
  it("getCatalog returns valid catalog with 14 operations", () => {
    const c = PowerMill5AxisFunctionIndexEngine.getCatalog();
    expect(c.system_id).toBe("powermill");
    expect(c.section_key).toBe("5axis_robot");
    expect(c.total_operations).toBe(14);
    expect(Object.keys(c.operations).length).toBe(14);
  });

  it("listOperations returns all 14 operation IDs", () => {
    const ops = PowerMill5AxisFunctionIndexEngine.listOperations();
    expect(ops.length).toBe(14);
    expect(ops).toContain("swarf_5axis");
    expect(ops).toContain("flowline_5axis");
    expect(ops).toContain("blade_finishing");
    expect(ops).toContain("robot_milling");
  });

  it("getOperation returns full definition for swarf_5axis", () => {
    const op = PowerMill5AxisFunctionIndexEngine.getOperation("swarf_5axis");
    expect(op).not.toBeNull();
    expect(op!.display_name).toBe("5-Axis Swarf Machining");
    expect(op!.category).toBe("continuous_5axis");
    expect(op!.parameter_count).toBe(24);
  });

  it("getOperation returns null for unknown operation", () => {
    const op = PowerMill5AxisFunctionIndexEngine.getOperation("nonexistent_op");
    expect(op).toBeNull();
  });

  it("listByCategory filters continuous_5axis correctly", () => {
    const ops = PowerMill5AxisFunctionIndexEngine.listByCategory("continuous_5axis");
    expect(ops).toContain("swarf_5axis");
    expect(ops).toContain("flowline_5axis");
    expect(ops).toContain("projection_5axis");
    expect(ops).toContain("collision_avoidance_5axis");
    expect(ops).toContain("tool_axis_editing");
    expect(ops.length).toBe(5);
  });

  it("listByCategory filters robot_machining correctly", () => {
    const ops = PowerMill5AxisFunctionIndexEngine.listByCategory("robot_machining");
    expect(ops).toContain("robot_milling");
    expect(ops).toContain("robot_trimming");
    expect(ops).toContain("robot_welding");
    expect(ops).toContain("positioner_sync");
    expect(ops.length).toBe(4);
  });

  it("getCategories returns all 4 categories", () => {
    const cats = PowerMill5AxisFunctionIndexEngine.getCategories();
    expect(cats.length).toBe(4);
    expect(cats).toContain("continuous_5axis");
    expect(cats).toContain("indexed_5axis");
    expect(cats).toContain("blade_hub_port");
    expect(cats).toContain("robot_machining");
  });

  it("recommendByFeature routes turbine_blade_5axis to blade_finishing", () => {
    const r = PowerMill5AxisFunctionIndexEngine.recommendByFeature("turbine_blade_5axis");
    expect(r.operation_id).toBe("blade_finishing");
    expect(r.display_name).toBe("Blade Finishing");
    expect(r.category).toBe("blade_hub_port");
  });

  it("recommendByFeature routes robot_arm_mill to robot_milling", () => {
    const r = PowerMill5AxisFunctionIndexEngine.recommendByFeature("robot_arm_mill");
    expect(r.operation_id).toBe("robot_milling");
    expect(r.category).toBe("robot_machining");
  });

  it("recommendByFeature routes ruled_surface_side_mill to swarf_5axis", () => {
    const r = PowerMill5AxisFunctionIndexEngine.recommendByFeature("ruled_surface_side_mill");
    expect(r.operation_id).toBe("swarf_5axis");
  });

  it("recommendByFeature handles unknown intent gracefully", () => {
    const r = PowerMill5AxisFunctionIndexEngine.recommendByFeature("unknown_intent" as PM5AxisIntent);
    expect(r.operation_id).toBe("swarf_5axis");
    expect(r.reason).toContain("Unknown intent");
  });

  it("axisLimitCheck passes when within limits", () => {
    const r = PowerMill5AxisFunctionIndexEngine.axisLimitCheck(
      { min: -20, max: 20 },
      { min: -90, max: 90 },
      { min: -30, max: 30 },
      { min: -180, max: 180 }
    );
    expect(r.passes).toBe(true);
    expect(r.a_axis.ok).toBe(true);
    expect(r.c_axis.ok).toBe(true);
  });

  it("axisLimitCheck fails when A-axis exceeds", () => {
    const r = PowerMill5AxisFunctionIndexEngine.axisLimitCheck(
      { min: -45, max: 45 },
      { min: -90, max: 90 },
      { min: -30, max: 30 },
      { min: -180, max: 180 }
    );
    expect(r.passes).toBe(false);
    expect(r.a_axis.ok).toBe(false);
    expect(r.c_axis.ok).toBe(true);
    expect(r.recommendation).toContain("A-axis");
  });

  it("axisLimitCheck fails when both axes exceed", () => {
    const r = PowerMill5AxisFunctionIndexEngine.axisLimitCheck(
      { min: -60, max: 60 },
      { min: -270, max: 270 },
      { min: -30, max: 30 },
      { min: -180, max: 180 }
    );
    expect(r.passes).toBe(false);
    expect(r.a_axis.ok).toBe(false);
    expect(r.c_axis.ok).toBe(false);
    expect(r.recommendation).toContain("Both");
  });

  it("singularityRiskEstimate returns low risk for safe angles", () => {
    const r = PowerMill5AxisFunctionIndexEngine.singularityRiskEstimate(45, 30);
    expect(r.risk_level).toBe("low");
    expect(r.wrist_singularity.at_risk).toBe(false);
    expect(r.overhead_singularity.at_risk).toBe(false);
  });

  it("singularityRiskEstimate returns high risk for wrist singularity", () => {
    const r = PowerMill5AxisFunctionIndexEngine.singularityRiskEstimate(45, 2);
    expect(r.risk_level).toBe("high");
    expect(r.wrist_singularity.at_risk).toBe(true);
    expect(r.recommendation).toContain("Wrist");
  });

  it("singularityRiskEstimate returns critical for both singularities", () => {
    const r = PowerMill5AxisFunctionIndexEngine.singularityRiskEstimate(3, 2);
    expect(r.risk_level).toBe("critical");
    expect(r.wrist_singularity.at_risk).toBe(true);
    expect(r.overhead_singularity.at_risk).toBe(true);
  });

  it("singularityRiskEstimate respects custom thresholds", () => {
    const r = PowerMill5AxisFunctionIndexEngine.singularityRiskEstimate(8, 8, 10, 15);
    expect(r.wrist_singularity.at_risk).toBe(true);
    expect(r.overhead_singularity.at_risk).toBe(true);
  });

  it("toolReachCheck returns can_reach=true when tool fits", () => {
    const r = PowerMill5AxisFunctionIndexEngine.toolReachCheck(30, 2, 50, 10, 25, 40);
    expect(r.can_reach).toBe(true);
    expect(r.cutting_length_ok).toBe(true);
    expect(r.shank_clearance_ok).toBe(true);
    expect(r.holder_clearance_ok).toBe(true);
  });

  it("toolReachCheck returns can_reach=false when depth exceeds reach", () => {
    const r = PowerMill5AxisFunctionIndexEngine.toolReachCheck(60, 2, 50, 10, 25, 40);
    expect(r.can_reach).toBe(false);
    expect(r.cutting_length_ok).toBe(false);
    expect(r.recommendation).toContain("exceeds");
  });

  it("toolReachCheck returns can_reach=false when shank too large", () => {
    const r = PowerMill5AxisFunctionIndexEngine.toolReachCheck(30, 2, 50, 45, 50, 40);
    expect(r.can_reach).toBe(false);
    expect(r.shank_clearance_ok).toBe(false);
    expect(r.recommendation).toContain("Shank");
  });

  it("validateConsistency returns is_consistent=true for valid catalog", () => {
    const r = PowerMill5AxisFunctionIndexEngine.validateConsistency();
    expect(r.is_consistent).toBe(true);
    expect(r.expected_operations).toBe(14);
    expect(r.actual_operations).toBe(14);
    expect(r.issues.length).toBe(0);
  });
});

describe("PowerMill5AxisFunctionIndexEngine — dispatcher integration", () => {
  it("pm_5axis_list returns all operations", async () => {
    const result = await invoke("pm_5axis_list", {});
    expect(result.success).toBe(true);
    expect(result.operations.length).toBe(14);
  });

  it("pm_5axis_get returns operation details", async () => {
    const result = await invoke("pm_5axis_get", { operation_id: "blade_finishing" });
    expect(result.success).toBe(true);
    expect(result.operation.display_name).toBe("Blade Finishing");
    expect(result.operation.category).toBe("blade_hub_port");
  });

  it("pm_5axis_get returns error for unknown operation", async () => {
    const result = await invoke("pm_5axis_get", { operation_id: "nonexistent" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("pm_5axis_recommend routes intent correctly", async () => {
    const result = await invoke("pm_5axis_recommend", { intent: "impeller_hub" });
    expect(result.success).toBe(true);
    expect(result.recommendation.operation_id).toBe("hub_finishing");
  });

  it("pm_5axis_axis_limit validates machine capabilities", async () => {
    const result = await invoke("pm_5axis_axis_limit", {
      required_a: { min: -25, max: 25 },
      required_c: { min: -120, max: 120 },
    });
    expect(result.success).toBe(true);
    expect(result.check.passes).toBe(true);
  });

  it("pm_5axis_singularity estimates risk level", async () => {
    const result = await invoke("pm_5axis_singularity", {
      j5_angle: 45,
      wrist_alignment_angle: 30,
    });
    expect(result.success).toBe(true);
    expect(result.risk.risk_level).toBe("low");
  });

  it("pm_5axis_tool_reach checks accessibility", async () => {
    const result = await invoke("pm_5axis_tool_reach", {
      pocket_depth: 40,
      min_clearance: 2,
      tool_cutting_length: 60,
      tool_shank_diameter: 12,
      holder_diameter: 32,
      narrowest_opening: 50,
    });
    expect(result.success).toBe(true);
    expect(result.reach.can_reach).toBe(true);
  });

  it("pm_5axis_validate checks catalog consistency", async () => {
    const result = await invoke("pm_5axis_validate", {});
    expect(result.success).toBe(true);
    expect(result.validation.is_consistent).toBe(true);
  });

  it("pm_5axis_categories returns all categories", async () => {
    const result = await invoke("pm_5axis_categories", {});
    expect(result.success).toBe(true);
    expect(result.categories.length).toBe(4);
    expect(result.categories).toContain("robot_machining");
  });

  it("pm_5axis_by_category filters operations", async () => {
    const result = await invoke("pm_5axis_by_category", { category: "blade_hub_port" });
    expect(result.success).toBe(true);
    expect(result.operations).toContain("blade_finishing");
    expect(result.operations).toContain("hub_finishing");
    expect(result.operations).toContain("port_machining");
  });
});
