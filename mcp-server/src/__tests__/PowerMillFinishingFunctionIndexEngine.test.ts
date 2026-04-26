/**
 * PowerMillFinishingFunctionIndexEngine tests — CAM-EXHAUST-MS0/U-CAM44
 *
 * Coverage:
 *   - catalog invariants: 12 ops, 221 params, 4 categories
 *   - per-op reference values + parameter-count consistency
 *   - recommendByFeature: 11 intents end-to-end + unknown fallback
 *   - scallopHeightCalc: geometric formula + edge cases
 *   - steepShallowThresholdCheck: zone classification + custom threshold
 *   - pencilCoverageEstimate: effectiveness calculation + edge cases
 *   - validateConsistency: catalog integrity check
 *   - dispatcher round-trip via registerCamDispatcher(stub)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  PowerMillFinishingFunctionIndexEngine,
  PMFinishingIntent,
} from "../engines/PowerMillFinishingFunctionIndexEngine.js";

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

describe("PowerMillFinishingFunctionIndexEngine — engine methods", () => {
  it("getCatalog returns valid catalog with 12 operations", () => {
    const c = PowerMillFinishingFunctionIndexEngine.getCatalog();
    expect(c.system_id).toBe("powermill");
    expect(c.section_key).toBe("finishing");
    expect(c.total_operations).toBe(12);
    expect(Object.keys(c.operations).length).toBe(12);
  });

  it("listOperations returns all 12 operation IDs", () => {
    const ops = PowerMillFinishingFunctionIndexEngine.listOperations();
    expect(ops.length).toBe(12);
    expect(ops).toContain("raster_finishing");
    expect(ops).toContain("constant_z_finishing");
    expect(ops).toContain("pencil_finishing");
    expect(ops).toContain("swarf_finishing");
  });

  it("getOperation returns full definition for raster_finishing", () => {
    const op = PowerMillFinishingFunctionIndexEngine.getOperation("raster_finishing");
    expect(op).not.toBeNull();
    expect(op.display_name).toBe("Raster Finishing");
    expect(op.category).toBe("surface_driven");
    expect(op.parameter_count).toBe(22);
  });

  it("getOperation returns null for unknown operation", () => {
    const op = PowerMillFinishingFunctionIndexEngine.getOperation("nonexistent_op");
    expect(op).toBeNull();
  });

  it("listByCategory filters correctly", () => {
    const surfaceDriven = PowerMillFinishingFunctionIndexEngine.listByCategory("surface_driven");
    expect(surfaceDriven).toContain("raster_finishing");
    expect(surfaceDriven).toContain("offset_3d_finishing");
    expect(surfaceDriven).toContain("steep_shallow_finishing");
    expect(surfaceDriven).toContain("surface_finishing");
    expect(surfaceDriven.length).toBe(4);

    const cornerFocused = PowerMillFinishingFunctionIndexEngine.listByCategory("corner_focused");
    expect(cornerFocused).toContain("pencil_finishing");
    expect(cornerFocused).toContain("corner_finishing");
    expect(cornerFocused).toContain("along_corner_finishing");
    expect(cornerFocused.length).toBe(3);
  });

  it("getCategories returns all 4 categories", () => {
    const cats = PowerMillFinishingFunctionIndexEngine.getCategories();
    expect(cats.length).toBe(4);
    expect(cats).toContain("surface_driven");
    expect(cats).toContain("boundary_driven");
    expect(cats).toContain("corner_focused");
    expect(cats).toContain("specialized");
  });

  it("recommendByFeature routes steep_walls_waterline to constant_z_finishing", () => {
    const r = PowerMillFinishingFunctionIndexEngine.recommendByFeature("steep_walls_waterline");
    expect(r.operation_id).toBe("constant_z_finishing");
    expect(r.display_name).toBe("Constant Z Finishing");
    expect(r.alternatives).toContain("steep_shallow_finishing");
  });

  it("recommendByFeature routes turbine_blade_flowline to flowline_finishing", () => {
    const r = PowerMillFinishingFunctionIndexEngine.recommendByFeature("turbine_blade_flowline");
    expect(r.operation_id).toBe("flowline_finishing");
  });

  it("recommendByFeature routes internal_corners_pencil to pencil_finishing", () => {
    const r = PowerMillFinishingFunctionIndexEngine.recommendByFeature("internal_corners_pencil");
    expect(r.operation_id).toBe("pencil_finishing");
  });

  it("recommendByFeature handles unknown intent gracefully", () => {
    const r = PowerMillFinishingFunctionIndexEngine.recommendByFeature("unknown_intent" as PMFinishingIntent);
    expect(r.operation_id).toBe("raster_finishing");
    expect(r.reason).toContain("Unknown intent");
  });

  it("scallopHeightCalc computes correct scallop for stepover=0.3mm, ball=10mm", () => {
    const r = PowerMillFinishingFunctionIndexEngine.scallopHeightCalc(0.3, 10);
    expect(r.stepover_mm).toBe(0.3);
    expect(r.ball_diameter_mm).toBe(10);
    expect(r.scallop_height_mm).toBeCloseTo(0.00225, 3);
    expect(r.formula).toContain("√");
    expect(r.surface_finish_ra_estimate_um).toBeGreaterThan(0);
  });

  it("scallopHeightCalc handles stepover exceeding ball radius", () => {
    const r = PowerMillFinishingFunctionIndexEngine.scallopHeightCalc(12, 10);
    expect(r.scallop_height_mm).toBe(5);
    expect(r.formula).toContain("exceeds");
  });

  it("scallopHeightCalc handles invalid input", () => {
    const r = PowerMillFinishingFunctionIndexEngine.scallopHeightCalc(0, 10);
    expect(r.scallop_height_mm).toBe(0);
    expect(r.formula).toContain("invalid");
  });

  it("steepShallowThresholdCheck classifies 60° as steep", () => {
    const r = PowerMillFinishingFunctionIndexEngine.steepShallowThresholdCheck(60);
    expect(r.zone).toBe("steep");
    expect(r.recommended_strategy).toBe("constant_z_finishing");
  });

  it("steepShallowThresholdCheck classifies 30° as shallow", () => {
    const r = PowerMillFinishingFunctionIndexEngine.steepShallowThresholdCheck(30);
    expect(r.zone).toBe("shallow");
    expect(r.recommended_strategy).toBe("raster_finishing");
  });

  it("steepShallowThresholdCheck classifies 45° as transition", () => {
    const r = PowerMillFinishingFunctionIndexEngine.steepShallowThresholdCheck(45);
    expect(r.zone).toBe("transition");
    expect(r.recommended_strategy).toBe("steep_shallow_finishing");
  });

  it("steepShallowThresholdCheck respects custom threshold", () => {
    const r = PowerMillFinishingFunctionIndexEngine.steepShallowThresholdCheck(40, 30);
    expect(r.zone).toBe("steep");
    expect(r.threshold_used_deg).toBe(30);
  });

  it("pencilCoverageEstimate returns effective=true when pencil fits corner", () => {
    const r = PowerMillFinishingFunctionIndexEngine.pencilCoverageEstimate(10, 3, 5);
    expect(r.effective).toBe(true);
    expect(r.coverage_pct).toBeGreaterThan(0);
    expect(r.recommendation).toContain("coverage");
  });

  it("pencilCoverageEstimate returns effective=false when pencil too large", () => {
    const r = PowerMillFinishingFunctionIndexEngine.pencilCoverageEstimate(10, 6, 5);
    expect(r.effective).toBe(false);
    expect(r.coverage_pct).toBe(0);
    expect(r.recommendation).toContain("too large");
  });

  it("pencilCoverageEstimate handles invalid input", () => {
    const r = PowerMillFinishingFunctionIndexEngine.pencilCoverageEstimate(0, 3, 5);
    expect(r.effective).toBe(false);
    expect(r.recommendation).toContain("Invalid");
  });

  it("validateConsistency returns is_consistent=true for valid catalog", () => {
    const r = PowerMillFinishingFunctionIndexEngine.validateConsistency();
    expect(r.is_consistent).toBe(true);
    expect(r.expected_operations).toBe(12);
    expect(r.actual_operations).toBe(12);
    expect(r.issues.length).toBe(0);
  });
});

describe("PowerMillFinishingFunctionIndexEngine — dispatcher integration", () => {
  it("pm_finishing_list returns all operations", async () => {
    const result = await invoke("pm_finishing_list", {});
    expect(result.success).toBe(true);
    expect(result.operations.length).toBe(12);
  });

  it("pm_finishing_get returns operation details", async () => {
    const result = await invoke("pm_finishing_get", { operation_id: "pencil_finishing" });
    expect(result.success).toBe(true);
    expect(result.operation.display_name).toBe("Pencil Finishing");
    expect(result.operation.category).toBe("corner_focused");
  });

  it("pm_finishing_get returns error for unknown operation", async () => {
    const result = await invoke("pm_finishing_get", { operation_id: "nonexistent" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("pm_finishing_recommend routes intent correctly", async () => {
    const result = await invoke("pm_finishing_recommend", { intent: "ruled_wall_swarf" });
    expect(result.success).toBe(true);
    expect(result.recommendation.operation_id).toBe("swarf_finishing");
  });

  it("pm_finishing_scallop computes scallop height", async () => {
    const result = await invoke("pm_finishing_scallop", { stepover_mm: 0.5, ball_diameter_mm: 12 });
    expect(result.success).toBe(true);
    expect(result.scallop.scallop_height_mm).toBeGreaterThan(0);
    expect(result.scallop.surface_finish_ra_estimate_um).toBeGreaterThan(0);
  });

  it("pm_finishing_steep_shallow classifies angle", async () => {
    const result = await invoke("pm_finishing_steep_shallow", { angle_deg: 70 });
    expect(result.success).toBe(true);
    expect(result.zone.zone).toBe("steep");
  });

  it("pm_finishing_steep_shallow accepts custom threshold", async () => {
    const result = await invoke("pm_finishing_steep_shallow", { angle_deg: 35, threshold_deg: 30 });
    expect(result.success).toBe(true);
    expect(result.zone.zone).toBe("steep");
  });

  it("pm_finishing_pencil_coverage estimates effectiveness", async () => {
    const result = await invoke("pm_finishing_pencil_coverage", {
      reference_tool_dia_mm: 12,
      pencil_tool_dia_mm: 4,
      corner_radius_mm: 6,
    });
    expect(result.success).toBe(true);
    expect(result.coverage.effective).toBe(true);
    expect(result.coverage.coverage_pct).toBeGreaterThan(0);
  });

  it("pm_finishing_validate checks catalog consistency", async () => {
    const result = await invoke("pm_finishing_validate", {});
    expect(result.success).toBe(true);
    expect(result.validation.is_consistent).toBe(true);
  });

  it("pm_finishing_categories returns all categories", async () => {
    const result = await invoke("pm_finishing_categories", {});
    expect(result.success).toBe(true);
    expect(result.categories.length).toBe(4);
    expect(result.categories).toContain("corner_focused");
  });

  it("pm_finishing_by_category filters operations", async () => {
    const result = await invoke("pm_finishing_by_category", { category: "specialized" });
    expect(result.success).toBe(true);
    expect(result.operations).toContain("flowline_finishing");
    expect(result.operations).toContain("swarf_finishing");
    expect(result.operations).toContain("pattern_finishing");
  });

  it("pm_finishing_scallop validation error for missing stepover_mm", async () => {
    const result = await invoke("pm_finishing_scallop", { ball_diameter_mm: 10 });
    expect(result.success).toBe(false);
    expect(result.error).toContain("stepover_mm");
  });
});
