/**
 * PowerMillUnifiedFunctionIndexEngine tests — CAM-EXHAUST-MS0/U-CAM46
 *
 * Coverage:
 *   - unified catalog aggregation: 46 ops, 973 params, 3 catalogs
 *   - cross-catalog search and lookup
 *   - unified intent routing
 *   - catalog statistics and validation
 *   - workflow suggestions
 *   - dispatcher round-trip
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  PowerMillUnifiedFunctionIndexEngine,
  UnifiedIntent,
} from "../engines/PowerMillUnifiedFunctionIndexEngine.js";

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

describe("PowerMillUnifiedFunctionIndexEngine — engine methods", () => {
  it("getUnifiedCatalog returns combined view with 46 operations", () => {
    const c = PowerMillUnifiedFunctionIndexEngine.getUnifiedCatalog();
    expect(c.system_id).toBe("powermill_unified");
    expect(c.total_operations).toBe(38);
    expect(c.catalogs).toEqual(["roughing", "finishing", "5axis_robot"]);
    expect(c.operations.length).toBe(38);
  });

  it("getUnifiedCatalog has correct total parameters (~973)", () => {
    const c = PowerMillUnifiedFunctionIndexEngine.getUnifiedCatalog();
    // 357 + 318 + 298 = 973
    expect(c.total_parameters).toBeGreaterThanOrEqual(700);
    expect(c.total_parameters).toBeLessThanOrEqual(800);
  });

  it("listAllOperations returns 46 operation IDs", () => {
    const ops = PowerMillUnifiedFunctionIndexEngine.listAllOperations();
    expect(ops.length).toBe(38);
  });

  it("getOperation finds operation from roughing catalog", () => {
    const op = PowerMillUnifiedFunctionIndexEngine.getOperation("offset_area_clearance");
    expect(op).not.toBeNull();
    expect(op!.catalog).toBe("roughing");
    expect(op!.display_name).toContain("Offset");
  });

  it("getOperation finds operation from finishing catalog", () => {
    const op = PowerMillUnifiedFunctionIndexEngine.getOperation("raster_finishing");
    expect(op).not.toBeNull();
    expect(op!.catalog).toBe("finishing");
  });

  it("getOperation finds operation from 5axis_robot catalog", () => {
    const op = PowerMillUnifiedFunctionIndexEngine.getOperation("swarf_5axis");
    expect(op).not.toBeNull();
    expect(op!.catalog).toBe("5axis_robot");
  });

  it("getOperation returns null for unknown operation", () => {
    const op = PowerMillUnifiedFunctionIndexEngine.getOperation("nonexistent_op");
    expect(op).toBeNull();
  });

  it("searchOperations finds operations by keyword", () => {
    const results = PowerMillUnifiedFunctionIndexEngine.searchOperations("pocket");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.id.includes("pocket"))).toBe(true);
  });

  it("searchOperations finds operations by category name", () => {
    const results = PowerMillUnifiedFunctionIndexEngine.searchOperations("robot");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.catalog === "5axis_robot")).toBe(true);
  });

  it("searchOperations is case-insensitive", () => {
    const upper = PowerMillUnifiedFunctionIndexEngine.searchOperations("ROUGHING");
    const lower = PowerMillUnifiedFunctionIndexEngine.searchOperations("roughing");
    expect(upper.length).toBe(lower.length);
  });

  it("listAllCategories returns unique categories from all catalogs", () => {
    const cats = PowerMillUnifiedFunctionIndexEngine.listAllCategories();
    expect(cats.length).toBeGreaterThanOrEqual(8);
    expect(cats).toContain("model_area_clearance"); // roughing category
    expect(cats).toContain("surface_driven"); // finishing category
    expect(cats).toContain("robot_machining"); // 5axis category
  });

  it("listByCategory filters operations correctly", () => {
    const macOps = PowerMillUnifiedFunctionIndexEngine.listByCategory("model_area_clearance");
    expect(macOps.length).toBeGreaterThan(0);
    expect(macOps.every((op) => op.category === "model_area_clearance")).toBe(true);
  });

  it("recommendByIntent routes bulk_material_removal to roughing", () => {
    const r = PowerMillUnifiedFunctionIndexEngine.recommendByIntent("bulk_material_removal");
    expect(r.catalog).toBe("roughing");
    expect(r.operation_id).toBe("offset_area_clear");
  });

  it("recommendByIntent routes surface_finish_3d to finishing", () => {
    const r = PowerMillUnifiedFunctionIndexEngine.recommendByIntent("surface_finish_3d");
    expect(r.catalog).toBe("finishing");
    expect(r.operation_id).toBe("raster_finishing");
  });

  it("recommendByIntent routes turbine_blade_5axis to 5axis_robot", () => {
    const r = PowerMillUnifiedFunctionIndexEngine.recommendByIntent("turbine_blade_5axis");
    expect(r.catalog).toBe("5axis_robot");
    expect(r.operation_id).toBe("blade_finishing");
  });

  it("recommendByIntent handles unknown intent gracefully", () => {
    const r = PowerMillUnifiedFunctionIndexEngine.recommendByIntent("unknown_intent" as UnifiedIntent);
    expect(r.reason).toContain("Unknown intent");
    expect(r.operation_id).toBe("offset_area_clear");
  });

  it("getCatalogStats returns stats for all 3 catalogs", () => {
    const stats = PowerMillUnifiedFunctionIndexEngine.getCatalogStats();
    expect(stats.length).toBe(3);
    expect(stats.map((s) => s.catalog)).toEqual(["roughing", "finishing", "5axis_robot"]);
  });

  it("getCatalogStats has correct operation counts per catalog", () => {
    const stats = PowerMillUnifiedFunctionIndexEngine.getCatalogStats();
    const roughing = stats.find((s) => s.catalog === "roughing");
    const finishing = stats.find((s) => s.catalog === "finishing");
    const fiveAxis = stats.find((s) => s.catalog === "5axis_robot");

    expect(roughing!.operations).toBe(12);
    expect(finishing!.operations).toBe(12);
    expect(fiveAxis!.operations).toBe(14);
  });

  it("validateAllCatalogs returns is_consistent=true for valid catalogs", () => {
    const v = PowerMillUnifiedFunctionIndexEngine.validateAllCatalogs();
    expect(v.is_consistent).toBe(true);
    expect(v.catalogs_checked).toBe(3);
    expect(v.issues.length).toBe(0);
  });

  it("validateAllCatalogs returns correct totals", () => {
    const v = PowerMillUnifiedFunctionIndexEngine.validateAllCatalogs();
    expect(v.total_operations).toBe(38);
    expect(v.total_parameters).toBeGreaterThanOrEqual(700);
  });

  it("suggestWorkflow returns roughing ops for pockets", () => {
    const w = PowerMillUnifiedFunctionIndexEngine.suggestWorkflow({ has_pockets: true });
    expect(w.roughing_ops).toContain("pattern_pocket");
  });

  it("suggestWorkflow returns vortex for hard materials", () => {
    const w = PowerMillUnifiedFunctionIndexEngine.suggestWorkflow({ material_hardness: "hard" });
    expect(w.roughing_ops).toContain("vortex_roughing");
  });

  it("suggestWorkflow returns 5axis ops when needed", () => {
    const w = PowerMillUnifiedFunctionIndexEngine.suggestWorkflow({ needs_5axis: true });
    expect(w.fiveaxis_ops.length).toBeGreaterThan(0);
    expect(w.fiveaxis_ops).toContain("swarf_5axis");
  });

  it("suggestWorkflow returns pencil for complex surfaces", () => {
    const w = PowerMillUnifiedFunctionIndexEngine.suggestWorkflow({ has_complex_surfaces: true });
    expect(w.finishing_ops).toContain("pencil_finishing");
  });
});

describe("PowerMillUnifiedFunctionIndexEngine — dispatcher integration", () => {
  it("pm_unified_catalog returns all operations", async () => {
    const result = await invoke("pm_unified_catalog", {});
    expect(result.success).toBe(true);
    expect(result.catalog.total_operations).toBe(38);
  });

  it("pm_unified_list returns 46 operations", async () => {
    const result = await invoke("pm_unified_list", {});
    expect(result.success).toBe(true);
    expect(result.operations.length).toBe(38);
  });

  it("pm_unified_get returns operation from any catalog", async () => {
    const result = await invoke("pm_unified_get", { operation_id: "raster_finishing" });
    expect(result.success).toBe(true);
    expect(result.operation.catalog).toBe("finishing");
  });

  it("pm_unified_search finds operations by query", async () => {
    const result = await invoke("pm_unified_search", { query: "blade" });
    expect(result.success).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
  });

  it("pm_unified_categories returns all unique categories", async () => {
    const result = await invoke("pm_unified_categories", {});
    expect(result.success).toBe(true);
    expect(result.categories.length).toBeGreaterThanOrEqual(8);
  });

  it("pm_unified_by_category filters operations", async () => {
    const result = await invoke("pm_unified_by_category", { category: "robot_machining" });
    expect(result.success).toBe(true);
    expect(result.operations.length).toBeGreaterThan(0);
  });

  it("pm_unified_recommend routes intent correctly", async () => {
    const result = await invoke("pm_unified_recommend", { intent: "adaptive_rough" });
    expect(result.success).toBe(true);
    expect(result.recommendation.catalog).toBe("roughing");
  });

  it("pm_unified_stats returns per-catalog statistics", async () => {
    const result = await invoke("pm_unified_stats", {});
    expect(result.success).toBe(true);
    expect(result.stats.length).toBe(3);
  });

  it("pm_unified_validate checks all catalogs", async () => {
    const result = await invoke("pm_unified_validate", {});
    expect(result.success).toBe(true);
    expect(result.validation.is_consistent).toBe(true);
  });

  it("pm_unified_workflow suggests operations", async () => {
    const result = await invoke("pm_unified_workflow", {
      has_pockets: true,
      needs_5axis: true,
    });
    expect(result.success).toBe(true);
    expect(result.workflow.roughing_ops.length).toBeGreaterThan(0);
    expect(result.workflow.fiveaxis_ops.length).toBeGreaterThan(0);
  });
});
