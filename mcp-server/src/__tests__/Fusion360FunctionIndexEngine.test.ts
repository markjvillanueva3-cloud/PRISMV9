/**
 * Tests for Fusion360FunctionIndexEngine
 * @see src/engines/Fusion360FunctionIndexEngine.ts
 * @see CAM-EXHAUST-MS0 U-CAM25
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Fusion360FunctionIndexEngine } from "../engines/Fusion360FunctionIndexEngine.js";

describe("Fusion360FunctionIndexEngine", () => {
  beforeEach(() => {
    Fusion360FunctionIndexEngine.clearCache();
  });

  describe("getIndex", () => {
    it("should load the function index successfully", () => {
      const index = Fusion360FunctionIndexEngine.getIndex();
      expect(index).toBeDefined();
      expect(index.system_id).toBe("fusion360");
      expect(index.module_id).toBe("function_index");
      expect(index.schema_version).toBe("1.0.0");
    });

    it("should cache the index on subsequent calls", () => {
      const index1 = Fusion360FunctionIndexEngine.getIndex();
      const index2 = Fusion360FunctionIndexEngine.getIndex();
      expect(index1).toBe(index2);
    });

    it("should have modules array with entries", () => {
      const index = Fusion360FunctionIndexEngine.getIndex();
      expect(Array.isArray(index.modules)).toBe(true);
      expect(index.modules.length).toBeGreaterThan(0);
    });

    it("should have valid indexed_at timestamp", () => {
      const index = Fusion360FunctionIndexEngine.getIndex();
      expect(index.indexed_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });
  });

  describe("listModules", () => {
    it("should return array of module IDs", () => {
      const modules = Fusion360FunctionIndexEngine.listModules();
      expect(Array.isArray(modules)).toBe(true);
      expect(modules.length).toBeGreaterThan(0);
      expect(modules).toContain("2d_operations");
    });

    it("should include all expected Fusion 360 modules", () => {
      const modules = Fusion360FunctionIndexEngine.listModules();
      const expectedModules = [
        "2d_operations",
        "3d_operations",
        "multiaxis_operations",
        "turning_operations",
      ];
      for (const mod of expectedModules) {
        expect(modules).toContain(mod);
      }
    });

    it("should include complete_catalog module", () => {
      const modules = Fusion360FunctionIndexEngine.listModules();
      expect(modules).toContain("complete_catalog");
    });
  });

  describe("getModuleEntry", () => {
    it("should return entry for existing module", () => {
      const entry = Fusion360FunctionIndexEngine.getModuleEntry("2d_operations");
      expect(entry).toBeDefined();
      expect(entry?.module_id).toBe("2d_operations");
      expect(entry?.path).toContain("fusion360");
      expect(entry?.covered_units).toContain("U-CAM21");
    });

    it("should return null for non-existent module", () => {
      const entry = Fusion360FunctionIndexEngine.getModuleEntry("nonexistent");
      expect(entry).toBeNull();
    });

    it("should include parameter count estimate", () => {
      const entry = Fusion360FunctionIndexEngine.getModuleEntry("2d_operations");
      expect(entry?.parameter_count_estimate).toBeGreaterThan(0);
    });

    it("should include dependencies array", () => {
      const entry = Fusion360FunctionIndexEngine.getModuleEntry("3d_operations");
      expect(Array.isArray(entry?.dependencies)).toBe(true);
      expect(entry?.dependencies).toContain("2d_operations");
    });
  });

  describe("getModule", () => {
    it("should load 2d_operations module", () => {
      const mod = Fusion360FunctionIndexEngine.getModule("2d_operations");
      expect(mod).not.toBeNull();
      expect(mod?.schemaVersion).toBe("1.0.0");
    });

    it("should cache loaded modules", () => {
      const mod1 = Fusion360FunctionIndexEngine.getModule("2d_operations");
      const mod2 = Fusion360FunctionIndexEngine.getModule("2d_operations");
      expect(mod1).toBe(mod2);
    });

    it("should return null for non-existent module", () => {
      const mod = Fusion360FunctionIndexEngine.getModule("nonexistent");
      expect(mod).toBeNull();
    });

    it("should load 3d_operations module", () => {
      const mod = Fusion360FunctionIndexEngine.getModule("3d_operations");
      expect(mod).toBeDefined();
      expect(mod?.section_key ?? mod?.system_id).toBeDefined();
    });

    it("should load multiaxis_operations module", () => {
      const mod = Fusion360FunctionIndexEngine.getModule("multiaxis_operations");
      expect(mod).toBeDefined();
    });

    it("should load turning_operations module", () => {
      const mod = Fusion360FunctionIndexEngine.getModule("turning_operations");
      expect(mod).toBeDefined();
    });
  });

  describe("listAllToolpaths", () => {
    it("should return array of toolpath info objects", () => {
      const toolpaths = Fusion360FunctionIndexEngine.listAllToolpaths();
      expect(Array.isArray(toolpaths)).toBe(true);
      expect(toolpaths.length).toBeGreaterThan(0);
    });

    it("should include module_id and toolpath_id in each entry", () => {
      const toolpaths = Fusion360FunctionIndexEngine.listAllToolpaths();
      expect(toolpaths.length).toBeGreaterThan(0);
      const first = toolpaths[0];
      expect(first.module_id).toBeDefined();
      expect(first.toolpath_id).toBeDefined();
      expect(first.toolpath_name).toBeDefined();
    });

    it("should include operation_type when available", () => {
      const toolpaths = Fusion360FunctionIndexEngine.listAllToolpaths();
      const withOpType = toolpaths.filter((tp) => tp.operation_type);
      expect(withOpType.length).toBeGreaterThan(0);
    });

    it("should include HSM-capable flag", () => {
      const toolpaths = Fusion360FunctionIndexEngine.listAllToolpaths();
      const hsmToolpaths = toolpaths.filter((tp) => tp.hsm_capable === true);
      expect(hsmToolpaths.length).toBeGreaterThan(0);
    });
  });

  describe("getToolpathsByCategory", () => {
    it("should return 2D toolpaths for '2d' category", () => {
      const toolpaths = Fusion360FunctionIndexEngine.getToolpathsByCategory("2d");
      expect(Array.isArray(toolpaths)).toBe(true);
    });

    it("should return turning toolpaths for 'turning' category", () => {
      const toolpaths = Fusion360FunctionIndexEngine.getToolpathsByCategory("turning");
      expect(Array.isArray(toolpaths)).toBe(true);
    });

    it("should return multiaxis toolpaths for 'multiaxis' category", () => {
      const toolpaths = Fusion360FunctionIndexEngine.getToolpathsByCategory("multiaxis");
      expect(Array.isArray(toolpaths)).toBe(true);
    });

    it("should return empty array for unknown category", () => {
      const toolpaths = Fusion360FunctionIndexEngine.getToolpathsByCategory("unknown_xyz");
      expect(Array.isArray(toolpaths)).toBe(true);
      expect(toolpaths.length).toBe(0);
    });

    it("should handle case-insensitive category lookup", () => {
      const lower = Fusion360FunctionIndexEngine.getToolpathsByCategory("turning");
      const upper = Fusion360FunctionIndexEngine.getToolpathsByCategory("TURNING");
      expect(lower.length).toBe(upper.length);
    });
  });

  describe("findParameter", () => {
    it("should find spindle_speed parameter", () => {
      const result = Fusion360FunctionIndexEngine.findParameter("spindle_speed");
      expect(result).toBeDefined();
      expect(result?.parameter.name).toBe("spindle_speed");
    });

    it("should return null for non-existent parameter", () => {
      const result = Fusion360FunctionIndexEngine.findParameter("nonexistent_param_xyz");
      expect(result).toBeNull();
    });

    it("should be case-insensitive", () => {
      const lower = Fusion360FunctionIndexEngine.findParameter("spindle_speed");
      const upper = Fusion360FunctionIndexEngine.findParameter("SPINDLE_SPEED");
      expect(lower?.parameter.name).toBe(upper?.parameter.name);
    });
  });

  describe("searchParameters", () => {
    it("should find parameters matching 'feed'", () => {
      const results = Fusion360FunctionIndexEngine.searchParameters("feed");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].parameter.name.toLowerCase()).toContain("feed");
    });

    it("should respect limit parameter", () => {
      const results = Fusion360FunctionIndexEngine.searchParameters("speed", 5);
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it("should return empty array for no matches", () => {
      const results = Fusion360FunctionIndexEngine.searchParameters("zzz_nonexistent_xyz");
      expect(results.length).toBe(0);
    });

    it("should search in descriptions too", () => {
      const results = Fusion360FunctionIndexEngine.searchParameters("cutting");
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("getTotalParameterCount", () => {
    it("should return positive parameter count", () => {
      const count = Fusion360FunctionIndexEngine.getTotalParameterCount();
      expect(count).toBeGreaterThan(0);
    });

    it("should match coverage summary value", () => {
      const count = Fusion360FunctionIndexEngine.getTotalParameterCount();
      const index = Fusion360FunctionIndexEngine.getIndex();
      expect(count).toBe(index.coverage_summary.estimated_parameter_total);
    });

    it("should be at least 2000 parameters", () => {
      const count = Fusion360FunctionIndexEngine.getTotalParameterCount();
      expect(count).toBeGreaterThanOrEqual(2000);
    });
  });

  describe("getPhysicsFormulas", () => {
    it("should return array of physics formula IDs", () => {
      const formulas = Fusion360FunctionIndexEngine.getPhysicsFormulas();
      expect(Array.isArray(formulas)).toBe(true);
      expect(formulas.length).toBeGreaterThan(0);
    });

    it("should include core cutting formulas", () => {
      const formulas = Fusion360FunctionIndexEngine.getPhysicsFormulas();
      expect(formulas).toContain("CUTTING_SPEED");
      expect(formulas).toContain("KIENZLE_FORCE");
      expect(formulas).toContain("TAYLOR_TOOL_LIFE");
    });

    it("should include adaptive engagement formula", () => {
      const formulas = Fusion360FunctionIndexEngine.getPhysicsFormulas();
      expect(formulas).toContain("ADAPTIVE_ENGAGEMENT");
    });
  });

  describe("getDispatchersTouched", () => {
    it("should return array of dispatcher names", () => {
      const dispatchers = Fusion360FunctionIndexEngine.getDispatchersTouched();
      expect(Array.isArray(dispatchers)).toBe(true);
      expect(dispatchers.length).toBeGreaterThan(0);
    });

    it("should include prism_cam dispatcher", () => {
      const dispatchers = Fusion360FunctionIndexEngine.getDispatchersTouched();
      expect(dispatchers).toContain("prism_cam");
    });

    it("should include prism_5axis dispatcher", () => {
      const dispatchers = Fusion360FunctionIndexEngine.getDispatchersTouched();
      expect(dispatchers).toContain("prism_5axis");
    });
  });

  describe("getLinkedEngines", () => {
    it("should return array of engine class names", () => {
      const engines = Fusion360FunctionIndexEngine.getLinkedEngines();
      expect(Array.isArray(engines)).toBe(true);
      expect(engines.length).toBeGreaterThan(0);
    });

    it("should include Fusion360FunctionIndexEngine itself", () => {
      const engines = Fusion360FunctionIndexEngine.getLinkedEngines();
      expect(engines).toContain("Fusion360FunctionIndexEngine");
    });

    it("should include existing plugin adapter", () => {
      const engines = Fusion360FunctionIndexEngine.getLinkedEngines();
      expect(engines).toContain("Fusion360PluginAdapterEngine");
    });
  });

  describe("getModulesForUnit", () => {
    it("should return modules covering U-CAM21", () => {
      const modules = Fusion360FunctionIndexEngine.getModulesForUnit("U-CAM21");
      expect(Array.isArray(modules)).toBe(true);
      expect(modules.length).toBeGreaterThan(0);
      expect(modules).toContain("2d_operations");
    });

    it("should return modules covering U-CAM23", () => {
      const modules = Fusion360FunctionIndexEngine.getModulesForUnit("U-CAM23");
      expect(modules).toContain("multiaxis_operations");
    });

    it("should return empty array for non-existent unit", () => {
      const modules = Fusion360FunctionIndexEngine.getModulesForUnit("U-NONEXISTENT");
      expect(modules).toEqual([]);
    });
  });

  describe("getModuleDependencies", () => {
    it("should return dependencies for 3d_operations", () => {
      const deps = Fusion360FunctionIndexEngine.getModuleDependencies("3d_operations");
      expect(Array.isArray(deps)).toBe(true);
      expect(deps).toContain("2d_operations");
    });

    it("should return empty array for module with no deps", () => {
      const deps = Fusion360FunctionIndexEngine.getModuleDependencies("turning_operations");
      expect(Array.isArray(deps)).toBe(true);
      expect(deps.length).toBe(0);
    });
  });

  describe("getHSMToolpaths", () => {
    it("should return HSM-capable toolpaths only", () => {
      const toolpaths = Fusion360FunctionIndexEngine.getHSMToolpaths();
      expect(Array.isArray(toolpaths)).toBe(true);
      for (const tp of toolpaths) {
        expect(tp.hsm_capable).toBe(true);
      }
    });
  });

  describe("getManufacturingExtensionToolpaths", () => {
    it("should return manufacturing extension toolpaths only", () => {
      const toolpaths = Fusion360FunctionIndexEngine.getManufacturingExtensionToolpaths();
      expect(Array.isArray(toolpaths)).toBe(true);
      for (const tp of toolpaths) {
        expect(tp.manufacturing_extension).toBe(true);
      }
    });
  });

  describe("getPlatformIntegration", () => {
    it("should return platform integration info", () => {
      const platform = Fusion360FunctionIndexEngine.getPlatformIntegration();
      expect(platform).toBeDefined();
      expect(platform?.cloud_enabled).toBe(true);
      expect(platform?.manufacturing_extension).toBe(true);
    });
  });

  describe("getAPISurface", () => {
    it("should return API surface info", () => {
      const api = Fusion360FunctionIndexEngine.getAPISurface();
      expect(api).toBeDefined();
      expect(api?.python_api_items).toBeGreaterThan(0);
    });
  });

  describe("getSummary", () => {
    it("should return valid summary object", () => {
      const summary = Fusion360FunctionIndexEngine.getSummary();
      expect(summary.source).toBe("fusion360_function_index");
      expect(summary.value.moduleCount).toBeGreaterThan(0);
      expect(summary.value.totalParams).toBeGreaterThan(0);
      expect(Array.isArray(summary.value.unitsTracked)).toBe(true);
    });

    it("should track U-CAM21 through U-CAM24", () => {
      const summary = Fusion360FunctionIndexEngine.getSummary();
      const expectedUnits = ["U-CAM21", "U-CAM22", "U-CAM23", "U-CAM24"];
      for (const unit of expectedUnits) {
        expect(summary.value.unitsTracked).toContain(unit);
      }
    });

    it("should include HSM and manufacturing extension counts", () => {
      const summary = Fusion360FunctionIndexEngine.getSummary();
      expect(typeof summary.value.hsmToolpaths).toBe("number");
      expect(typeof summary.value.manufacturingExtToolpaths).toBe("number");
    });
  });

  describe("clearCache", () => {
    it("should clear index cache", () => {
      const index1 = Fusion360FunctionIndexEngine.getIndex();
      Fusion360FunctionIndexEngine.clearCache();
      const index2 = Fusion360FunctionIndexEngine.getIndex();
      expect(index1).not.toBe(index2);
      expect(index1).toEqual(index2);
    });

    it("should clear module cache", () => {
      const mod1 = Fusion360FunctionIndexEngine.getModule("2d_operations");
      Fusion360FunctionIndexEngine.clearCache();
      const mod2 = Fusion360FunctionIndexEngine.getModule("2d_operations");
      expect(mod1).not.toBe(mod2);
    });

    it("should clear load errors array", () => {
      Fusion360FunctionIndexEngine.clearCache();
      const errors = Fusion360FunctionIndexEngine.getLoadErrors();
      expect(Array.isArray(errors)).toBe(true);
      expect(errors.length).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("should handle empty query string in searchParameters", () => {
      const results = Fusion360FunctionIndexEngine.searchParameters("");
      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle special characters in searchParameters", () => {
      const results = Fusion360FunctionIndexEngine.searchParameters("$%^&*");
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it("should handle zero limit in searchParameters", () => {
      const results = Fusion360FunctionIndexEngine.searchParameters("feed", 0);
      expect(results.length).toBe(0);
    });

    it("should handle negative limit in searchParameters", () => {
      const results = Fusion360FunctionIndexEngine.searchParameters("feed", -5);
      expect(results.length).toBe(0);
    });
  });

  describe("Dispatcher wiring", () => {
    it("camDispatcher ACTIONS includes fusion360_function_index_get", async () => {
      const mod: any = await import("../tools/dispatchers/camDispatcher.js");
      const actions: string[] = mod.ACTIONS;
      expect(actions).toContain("fusion360_function_index_get");
    });

    it("camDispatcher ACTIONS includes fusion360_function_index_list_modules", async () => {
      const mod: any = await import("../tools/dispatchers/camDispatcher.js");
      const actions: string[] = mod.ACTIONS;
      expect(actions).toContain("fusion360_function_index_list_modules");
    });

    it("camDispatcher ACTIONS includes fusion360_function_index_get_module", async () => {
      const mod: any = await import("../tools/dispatchers/camDispatcher.js");
      const actions: string[] = mod.ACTIONS;
      expect(actions).toContain("fusion360_function_index_get_module");
    });

    it("camDispatcher ACTIONS includes fusion360_function_index_search_parameters", async () => {
      const mod: any = await import("../tools/dispatchers/camDispatcher.js");
      const actions: string[] = mod.ACTIONS;
      expect(actions).toContain("fusion360_function_index_search_parameters");
    });

    it("camDispatcher ACTIONS includes fusion360_function_index_get_summary", async () => {
      const mod: any = await import("../tools/dispatchers/camDispatcher.js");
      const actions: string[] = mod.ACTIONS;
      expect(actions).toContain("fusion360_function_index_get_summary");
    });

    it("camDispatcher ACTIONS includes fusion360_function_index_get_hsm_toolpaths", async () => {
      const mod: any = await import("../tools/dispatchers/camDispatcher.js");
      const actions: string[] = mod.ACTIONS;
      expect(actions).toContain("fusion360_function_index_get_hsm_toolpaths");
    });

    it("camDispatcher ACTIONS includes fusion360_function_index_get_mfg_ext_toolpaths", async () => {
      const mod: any = await import("../tools/dispatchers/camDispatcher.js");
      const actions: string[] = mod.ACTIONS;
      expect(actions).toContain("fusion360_function_index_get_mfg_ext_toolpaths");
    });

    it("camDispatcher ACTIONS includes all 10 fusion360_function_index actions", async () => {
      const mod: any = await import("../tools/dispatchers/camDispatcher.js");
      const actions: string[] = mod.ACTIONS;
      const expectedActions = [
        "fusion360_function_index_get",
        "fusion360_function_index_list_modules",
        "fusion360_function_index_get_module",
        "fusion360_function_index_list_toolpaths",
        "fusion360_function_index_find_parameter",
        "fusion360_function_index_search_parameters",
        "fusion360_function_index_get_toolpaths_by_category",
        "fusion360_function_index_get_summary",
        "fusion360_function_index_get_hsm_toolpaths",
        "fusion360_function_index_get_mfg_ext_toolpaths",
      ];
      for (const action of expectedActions) {
        expect(actions).toContain(action);
      }
    });

    it("camDispatcher ACTIONS includes fusion360_function_index_get_probing_operations (MS1-01)", async () => {
      const mod: any = await import("../tools/dispatchers/camDispatcher.js");
      const actions: string[] = mod.ACTIONS;
      expect(actions).toContain("fusion360_function_index_get_probing_operations");
    });
  });

  // CAM-EXHAUST-MS1-01 — Fusion 360 Probing module
  describe("getProbingOperations (CAM-EXHAUST-MS1-01)", () => {
    it("returns 16 probing toolpaths across 4 categories", () => {
      const ops = Fusion360FunctionIndexEngine.getProbingOperations();
      expect(ops).toHaveLength(16);
      const categories = new Set(ops.map((o) => o.category));
      expect(categories.has("Probe_WCS")).toBe(true);
      expect(categories.has("Probe_Geometry")).toBe(true);
      expect(categories.has("Probe_Tool")).toBe(true);
      expect(categories.has("Inspect")).toBe(true);
    });

    it("includes all 8 WCS-setup probing operations", () => {
      const ops = Fusion360FunctionIndexEngine.getProbingOperations();
      const wcsOps = ops.filter((o) => o.category === "Probe_WCS").map((o) => o.toolpath_id).sort();
      expect(wcsOps).toEqual([
        "PROBE_WCS_2_AXIS_CORNER",
        "PROBE_WCS_3_AXIS_CORNER",
        "PROBE_WCS_BORE",
        "PROBE_WCS_BOSS",
        "PROBE_WCS_PLANE_ANGLE",
        "PROBE_WCS_POCKET",
        "PROBE_WCS_SINGLE_SURFACE",
        "PROBE_WCS_WEB",
      ]);
    });

    it("includes the 3 in-process inspection operations", () => {
      const ops = Fusion360FunctionIndexEngine.getProbingOperations();
      const inspectIds = ops.filter((o) => o.category === "Inspect").map((o) => o.toolpath_id).sort();
      expect(inspectIds).toEqual([
        "INSPECT_FEATURE_VERIFY",
        "INSPECT_SPC_LOG",
        "INSPECT_TOLERANCE_GATE",
      ]);
    });

    it("each probing operation has parameter_count > 0 and a description", () => {
      const ops = Fusion360FunctionIndexEngine.getProbingOperations();
      for (const op of ops) {
        expect(op.parameter_count).toBeGreaterThan(0);
        expect(op.description.length).toBeGreaterThan(20);
      }
    });

    it("dispatcher round-trip: get_probing_operations returns 16 ops", async () => {
      const mod: any = await import("../tools/dispatchers/camDispatcher.js");
      type Handler = (input: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
      let captured: Handler | null = null;
      const fakeServer = {
        tool: (_n: string, _d: string, _s: unknown, h: Handler) => {
          captured = h;
        },
      };
      mod.registerCamDispatcher(fakeServer);
      if (!captured) throw new Error("camDispatcher did not register handler");
      const handler = captured as Handler;
      const raw = (await handler({
        action: "fusion360_function_index_get_probing_operations",
        params: {},
      })) as { content?: Array<{ text: string }> } | Record<string, unknown>;
      const r = raw as { content?: Array<{ text: string }> };
      const result = r.content?.[0]?.text
        ? (JSON.parse(r.content[0].text) as {
            success: boolean;
            operations: Array<{ toolpath_id: string }>;
          })
        : (raw as { success: boolean; operations: Array<{ toolpath_id: string }> });
      expect(result.success).toBe(true);
      expect(result.operations).toHaveLength(16);
      const ids = result.operations.map((o) => o.toolpath_id);
      expect(ids).toContain("PROBE_WCS_SINGLE_SURFACE");
      expect(ids).toContain("PROBE_TOOL_BREAKAGE");
      expect(ids).toContain("INSPECT_TOLERANCE_GATE");
    });

    it("probing module is registered in fusion360 function-index", () => {
      const idx = Fusion360FunctionIndexEngine.getIndex();
      const moduleIds = idx.modules.map((m) => m.module_id);
      expect(moduleIds).toContain("probing");
      const probingEntry = idx.modules.find((m) => m.module_id === "probing");
      expect(probingEntry?.parameter_count_estimate).toBe(256);
    });
  });

  // CAM-EXHAUST-MS1-02 — Fusion 360 Additive module
  describe("getAdditiveOperations (CAM-EXHAUST-MS1-02)", () => {
    it("returns exactly 12 additive toolpaths", () => {
      const ops = Fusion360FunctionIndexEngine.getAdditiveOperations();
      expect(ops.length).toBe(12);
    });

    it("DED category contains exactly 4 ops with sorted ids matching catalog", () => {
      const ops = Fusion360FunctionIndexEngine.getAdditiveOperations();
      const dedIds = ops.filter((o) => o.category === "DED").map((o) => o.toolpath_id).sort();
      expect(dedIds).toEqual([
        "DED_MULTI_AXIS_LATTICE",
        "DED_REPAIR",
        "DED_THIN_WALL",
        "DED_WIDE_AREA",
      ]);
    });

    it("PBF category contains exactly 3 SLM ops with sorted ids", () => {
      const ops = Fusion360FunctionIndexEngine.getAdditiveOperations();
      const pbfIds = ops.filter((o) => o.category === "PBF").map((o) => o.toolpath_id).sort();
      expect(pbfIds).toEqual([
        "PBF_LATTICE_INFILL",
        "PBF_SLM_PART",
        "PBF_SLM_SUPPORT",
      ]);
    });

    it("FDM category contains exactly 3 ops with sorted ids", () => {
      const ops = Fusion360FunctionIndexEngine.getAdditiveOperations();
      const fdmIds = ops.filter((o) => o.category === "FDM").map((o) => o.toolpath_id).sort();
      expect(fdmIds).toEqual([
        "FDM_INFILL_PATTERN",
        "FDM_PART",
        "FDM_SUPPORT",
      ]);
    });

    it("Hybrid category contains exactly 2 additive+subtractive ops with sorted ids", () => {
      const ops = Fusion360FunctionIndexEngine.getAdditiveOperations();
      const hybridIds = ops.filter((o) => o.category === "Hybrid").map((o) => o.toolpath_id).sort();
      expect(hybridIds).toEqual([
        "HYBRID_CYCLE_DED_THEN_MILL",
        "HYBRID_NEAR_NET_FINISH",
      ]);
    });

    it("DED_THIN_WALL has exactly 22 parameters and DED category", () => {
      const ops = Fusion360FunctionIndexEngine.getAdditiveOperations();
      const op = ops.find((o) => o.toolpath_id === "DED_THIN_WALL");
      expect(op?.parameter_count).toBe(22);
      expect(op?.category).toBe("DED");
    });

    it("PBF_SLM_PART has exactly 22 parameters and PBF category", () => {
      const ops = Fusion360FunctionIndexEngine.getAdditiveOperations();
      const op = ops.find((o) => o.toolpath_id === "PBF_SLM_PART");
      expect(op?.parameter_count).toBe(22);
      expect(op?.category).toBe("PBF");
    });

    it("FDM_INFILL_PATTERN has exactly 14 parameters (smallest in catalog)", () => {
      const ops = Fusion360FunctionIndexEngine.getAdditiveOperations();
      const op = ops.find((o) => o.toolpath_id === "FDM_INFILL_PATTERN");
      expect(op?.parameter_count).toBe(14);
    });

    it("HYBRID_CYCLE_DED_THEN_MILL has exactly 22 parameters and Hybrid category", () => {
      const ops = Fusion360FunctionIndexEngine.getAdditiveOperations();
      const op = ops.find((o) => o.toolpath_id === "HYBRID_CYCLE_DED_THEN_MILL");
      expect(op?.parameter_count).toBe(22);
      expect(op?.category).toBe("Hybrid");
    });

    it("DED_REPAIR description references the word 'repair'", () => {
      const ops = Fusion360FunctionIndexEngine.getAdditiveOperations();
      const op = ops.find((o) => o.toolpath_id === "DED_REPAIR");
      expect(op?.description.toLowerCase().includes("repair")).toBe(true);
    });

    it("dispatcher round-trip: get_additive_operations returns 12 ops with DED_REPAIR @ 22 params", async () => {
      const mod = (await import("../tools/dispatchers/camDispatcher.js")) as unknown as {
        registerCamDispatcher: (server: { tool: unknown }) => void;
      };
      type Handler = (input: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
      let captured: Handler | null = null;
      const fakeServer = {
        tool: (_n: string, _d: string, _s: unknown, h: Handler) => {
          captured = h;
        },
      };
      mod.registerCamDispatcher(fakeServer as unknown as { tool: unknown });
      if (!captured) throw new Error("camDispatcher did not register handler");
      const handler = captured as Handler;
      const raw = (await handler({
        action: "fusion360_function_index_get_additive_operations",
        params: {},
      })) as { content?: Array<{ text: string }> } | Record<string, unknown>;
      const r = raw as { content?: Array<{ text: string }> };
      const result = r.content?.[0]?.text
        ? (JSON.parse(r.content[0].text) as {
            success: boolean;
            operations: Array<{ toolpath_id: string; category: string; parameter_count: number }>;
          })
        : (raw as {
            success: boolean;
            operations: Array<{ toolpath_id: string; category: string; parameter_count: number }>;
          });
      expect(result.success).toBe(true);
      expect(result.operations.length).toBe(12);
      const dedRepair = result.operations.find((o) => o.toolpath_id === "DED_REPAIR");
      expect(dedRepair?.category).toBe("DED");
      expect(dedRepair?.parameter_count).toBe(22);
    });

    it("additive module is registered in fusion360 function-index with 264 estimated params", () => {
      const idx = Fusion360FunctionIndexEngine.getIndex();
      const additiveEntry = idx.modules.find((m) => m.module_id === "additive");
      expect(additiveEntry?.parameter_count_estimate).toBe(264);
    });

    it("camDispatcher ACTIONS includes fusion360_function_index_get_additive_operations", async () => {
      const mod = (await import("../tools/dispatchers/camDispatcher.js")) as unknown as {
        ACTIONS: string[];
      };
      expect(mod.ACTIONS).toContain("fusion360_function_index_get_additive_operations");
    });
  });

  // CAM-EXHAUST-MS1-03 — Fusion 360 Cutting module
  describe("getCuttingOperations (CAM-EXHAUST-MS1-03)", () => {
    it("returns exactly 9 cutting toolpaths", () => {
      const ops = Fusion360FunctionIndexEngine.getCuttingOperations();
      expect(ops.length).toBe(9);
    });

    it("Laser category contains 3 ops with sorted ids", () => {
      const ops = Fusion360FunctionIndexEngine.getCuttingOperations();
      const laserIds = ops.filter((o) => o.category === "Laser").map((o) => o.toolpath_id).sort();
      expect(laserIds).toEqual([
        "LASER_CUTTING",
        "LASER_DRILLING",
        "LASER_ETCHING",
      ]);
    });

    it("Waterjet category contains 3 ops with sorted ids", () => {
      const ops = Fusion360FunctionIndexEngine.getCuttingOperations();
      const wjIds = ops.filter((o) => o.category === "Waterjet").map((o) => o.toolpath_id).sort();
      expect(wjIds).toEqual([
        "WATERJET_CUTTING",
        "WATERJET_PURE_WATER",
        "WATERJET_TAPERED_5AXIS",
      ]);
    });

    it("Plasma category contains 3 ops with sorted ids", () => {
      const ops = Fusion360FunctionIndexEngine.getCuttingOperations();
      const plasmaIds = ops.filter((o) => o.category === "Plasma").map((o) => o.toolpath_id).sort();
      expect(plasmaIds).toEqual([
        "PLASMA_BEVEL",
        "PLASMA_CUTTING",
        "PLASMA_MARK",
      ]);
    });

    it("LASER_CUTTING has exactly 24 parameters", () => {
      const ops = Fusion360FunctionIndexEngine.getCuttingOperations();
      const op = ops.find((o) => o.toolpath_id === "LASER_CUTTING");
      expect(op?.parameter_count).toBe(24);
    });

    it("WATERJET_CUTTING has exactly 22 parameters", () => {
      const ops = Fusion360FunctionIndexEngine.getCuttingOperations();
      const op = ops.find((o) => o.toolpath_id === "WATERJET_CUTTING");
      expect(op?.parameter_count).toBe(22);
    });

    it("PLASMA_MARK has exactly 12 parameters (lightest cutting op)", () => {
      const ops = Fusion360FunctionIndexEngine.getCuttingOperations();
      const op = ops.find((o) => o.toolpath_id === "PLASMA_MARK");
      expect(op?.parameter_count).toBe(12);
    });

    it("WATERJET_TAPERED_5AXIS description references 5-axis", () => {
      const ops = Fusion360FunctionIndexEngine.getCuttingOperations();
      const op = ops.find((o) => o.toolpath_id === "WATERJET_TAPERED_5AXIS");
      expect(op?.description.includes("5-axis")).toBe(true);
    });

    it("dispatcher round-trip: get_cutting_operations returns 9 ops with PLASMA_BEVEL @ 22 params", async () => {
      const mod = (await import("../tools/dispatchers/camDispatcher.js")) as unknown as {
        registerCamDispatcher: (server: { tool: unknown }) => void;
      };
      type Handler = (input: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
      let captured: Handler | null = null;
      const fakeServer = {
        tool: (_n: string, _d: string, _s: unknown, h: Handler) => {
          captured = h;
        },
      };
      mod.registerCamDispatcher(fakeServer as unknown as { tool: unknown });
      if (!captured) throw new Error("camDispatcher did not register handler");
      const handler = captured as Handler;
      const raw = (await handler({
        action: "fusion360_function_index_get_cutting_operations",
        params: {},
      })) as { content?: Array<{ text: string }> } | Record<string, unknown>;
      const r = raw as { content?: Array<{ text: string }> };
      const result = r.content?.[0]?.text
        ? (JSON.parse(r.content[0].text) as {
            success: boolean;
            operations: Array<{ toolpath_id: string; category: string; parameter_count: number }>;
          })
        : (raw as {
            success: boolean;
            operations: Array<{ toolpath_id: string; category: string; parameter_count: number }>;
          });
      expect(result.success).toBe(true);
      expect(result.operations.length).toBe(9);
      const plasmaBevel = result.operations.find((o) => o.toolpath_id === "PLASMA_BEVEL");
      expect(plasmaBevel?.category).toBe("Plasma");
      expect(plasmaBevel?.parameter_count).toBe(22);
    });

    it("cutting module is registered in fusion360 function-index with 196 estimated params", () => {
      const idx = Fusion360FunctionIndexEngine.getIndex();
      const cuttingEntry = idx.modules.find((m) => m.module_id === "cutting");
      expect(cuttingEntry?.parameter_count_estimate).toBe(196);
    });

    it("camDispatcher ACTIONS includes fusion360_function_index_get_cutting_operations", async () => {
      const mod = (await import("../tools/dispatchers/camDispatcher.js")) as unknown as {
        ACTIONS: string[];
      };
      expect(mod.ACTIONS).toContain("fusion360_function_index_get_cutting_operations");
    });
  });

  // CAM-EXHAUST-MS1-04 — Fusion 360 Inspection module
  describe("getInspectionOperations (CAM-EXHAUST-MS1-04)", () => {
    it("returns exactly 11 inspection toolpaths", () => {
      const ops = Fusion360FunctionIndexEngine.getInspectionOperations();
      expect(ops.length).toBe(11);
    });

    it("Planning category contains 2 ops with sorted ids", () => {
      const ops = Fusion360FunctionIndexEngine.getInspectionOperations();
      const planningIds = ops.filter((o) => o.category === "Planning").map((o) => o.toolpath_id).sort();
      expect(planningIds).toEqual([
        "CMM_PLAN_GENERATE",
        "CMM_SAMPLING_STRATEGY",
      ]);
    });

    it("Analysis category contains 4 ops with sorted ids", () => {
      const ops = Fusion360FunctionIndexEngine.getInspectionOperations();
      const analysisIds = ops.filter((o) => o.category === "Analysis").map((o) => o.toolpath_id).sort();
      expect(analysisIds).toEqual([
        "COMPARE_TO_CAD",
        "SURFACE_FORM_ANALYZE",
        "TOLERANCE_STACK_ANALYZE",
        "TOLERANCE_STACK_MONTE_CARLO",
      ]);
    });

    it("Validation category contains 3 ops with sorted ids", () => {
      const ops = Fusion360FunctionIndexEngine.getInspectionOperations();
      const validationIds = ops.filter((o) => o.category === "Validation").map((o) => o.toolpath_id).sort();
      expect(validationIds).toEqual([
        "GDT_VALIDATE",
        "GDT_ZONE_CHECK",
        "PROBE_COMPENSATION_CALIBRATE",
      ]);
    });

    it("Reporting category contains 2 ops with sorted ids", () => {
      const ops = Fusion360FunctionIndexEngine.getInspectionOperations();
      const reportingIds = ops.filter((o) => o.category === "Reporting").map((o) => o.toolpath_id).sort();
      expect(reportingIds).toEqual([
        "CERTIFICATE_OF_CONFORMANCE",
        "GENERATE_INSPECTION_REPORT",
      ]);
    });

    it("CMM_PLAN_GENERATE has exactly 22 parameters and Planning category", () => {
      const ops = Fusion360FunctionIndexEngine.getInspectionOperations();
      const op = ops.find((o) => o.toolpath_id === "CMM_PLAN_GENERATE");
      expect(op?.parameter_count).toBe(22);
      expect(op?.category).toBe("Planning");
    });

    it("TOLERANCE_STACK_MONTE_CARLO has exactly 18 parameters and Analysis category", () => {
      const ops = Fusion360FunctionIndexEngine.getInspectionOperations();
      const op = ops.find((o) => o.toolpath_id === "TOLERANCE_STACK_MONTE_CARLO");
      expect(op?.parameter_count).toBe(18);
      expect(op?.category).toBe("Analysis");
    });

    it("PROBE_COMPENSATION_CALIBRATE has exactly 14 parameters (smallest validation op)", () => {
      const ops = Fusion360FunctionIndexEngine.getInspectionOperations();
      const op = ops.find((o) => o.toolpath_id === "PROBE_COMPENSATION_CALIBRATE");
      expect(op?.parameter_count).toBe(14);
      expect(op?.category).toBe("Validation");
    });

    it("CERTIFICATE_OF_CONFORMANCE description references conformance / traceability", () => {
      const ops = Fusion360FunctionIndexEngine.getInspectionOperations();
      const op = ops.find((o) => o.toolpath_id === "CERTIFICATE_OF_CONFORMANCE");
      const text = op?.description.toLowerCase() ?? "";
      expect(text.includes("conformance") || text.includes("traceability")).toBe(true);
    });

    it("each inspection operation has parameter_count > 0 and a non-trivial description", () => {
      const ops = Fusion360FunctionIndexEngine.getInspectionOperations();
      for (const op of ops) {
        expect(op.parameter_count).toBeGreaterThan(0);
        expect(op.description.length).toBeGreaterThan(20);
      }
    });

    it("dispatcher round-trip: get_inspection_operations returns 11 ops with COMPARE_TO_CAD @ 18 params", async () => {
      const mod = (await import("../tools/dispatchers/camDispatcher.js")) as unknown as {
        registerCamDispatcher: (server: { tool: unknown }) => void;
      };
      type Handler = (input: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
      let captured: Handler | null = null;
      const fakeServer = {
        tool: (_n: string, _d: string, _s: unknown, h: Handler) => {
          captured = h;
        },
      };
      mod.registerCamDispatcher(fakeServer as unknown as { tool: unknown });
      if (!captured) throw new Error("camDispatcher did not register handler");
      const handler = captured as Handler;
      const raw = (await handler({
        action: "fusion360_function_index_get_inspection_operations",
        params: {},
      })) as { content?: Array<{ text: string }> } | Record<string, unknown>;
      const r = raw as { content?: Array<{ text: string }> };
      const result = r.content?.[0]?.text
        ? (JSON.parse(r.content[0].text) as {
            success: boolean;
            operations: Array<{ toolpath_id: string; category: string; parameter_count: number }>;
          })
        : (raw as {
            success: boolean;
            operations: Array<{ toolpath_id: string; category: string; parameter_count: number }>;
          });
      expect(result.success).toBe(true);
      expect(result.operations.length).toBe(11);
      const compareToCad = result.operations.find((o) => o.toolpath_id === "COMPARE_TO_CAD");
      expect(compareToCad?.category).toBe("Analysis");
      expect(compareToCad?.parameter_count).toBe(18);
    });

    it("inspection module is registered in fusion360 function-index with 186 estimated params", () => {
      const idx = Fusion360FunctionIndexEngine.getIndex();
      const inspectionEntry = idx.modules.find((m) => m.module_id === "inspection");
      expect(inspectionEntry?.parameter_count_estimate).toBe(186);
      expect(inspectionEntry?.dependencies).toContain("probing");
    });

    it("camDispatcher ACTIONS includes fusion360_function_index_get_inspection_operations", async () => {
      const mod = (await import("../tools/dispatchers/camDispatcher.js")) as unknown as {
        ACTIONS: string[];
      };
      expect(mod.ACTIONS).toContain("fusion360_function_index_get_inspection_operations");
    });
  });

  describe("getMillTurnOperations (CAM-EXHAUST-MS1-05)", () => {
    it("returns exactly 12 mill-turn toolpaths", () => {
      const ops = Fusion360FunctionIndexEngine.getMillTurnOperations();
      expect(ops.length).toBe(12);
    });

    it("Synchronization category contains 4 ops with sorted ids", () => {
      const ops = Fusion360FunctionIndexEngine.getMillTurnOperations();
      const syncIds = ops.filter((o) => o.category === "Synchronization").map((o) => o.toolpath_id).sort();
      expect(syncIds).toEqual([
        "BAR_FEED_ADVANCE",
        "MILL_TURN_SYNC",
        "TURNING_PART_CATCHER",
        "TURNING_TRANSFER",
      ]);
    });

    it("Auxiliary category contains 2 ops with sorted ids", () => {
      const ops = Fusion360FunctionIndexEngine.getMillTurnOperations();
      const auxIds = ops.filter((o) => o.category === "Auxiliary").map((o) => o.toolpath_id).sort();
      expect(auxIds).toEqual([
        "STEADY_REST_ACTUATE",
        "TAILSTOCK_ACTUATE",
      ]);
    });

    it("C_Axis category contains 2 ops with sorted ids", () => {
      const ops = Fusion360FunctionIndexEngine.getMillTurnOperations();
      const cAxisIds = ops.filter((o) => o.category === "C_Axis").map((o) => o.toolpath_id).sort();
      expect(cAxisIds).toEqual([
        "C_AXIS_INDEX_MILL",
        "C_AXIS_INTERPOLATED_MILL",
      ]);
    });

    it("Multi_Axis category contains 4 ops with sorted ids", () => {
      const ops = Fusion360FunctionIndexEngine.getMillTurnOperations();
      const multiIds = ops.filter((o) => o.category === "Multi_Axis").map((o) => o.toolpath_id).sort();
      expect(multiIds).toEqual([
        "CROSS_DRILLING_LIVE",
        "POLYGON_TURNING",
        "THREAD_WHIRLING",
        "Y_AXIS_TURN_OFFCENTER",
      ]);
    });

    it("THREAD_WHIRLING has exactly 22 parameters and Multi_Axis category", () => {
      const ops = Fusion360FunctionIndexEngine.getMillTurnOperations();
      const op = ops.find((o) => o.toolpath_id === "THREAD_WHIRLING");
      expect(op?.parameter_count).toBe(22);
      expect(op?.category).toBe("Multi_Axis");
    });

    it("TURNING_TRANSFER has exactly 22 parameters and Synchronization category", () => {
      const ops = Fusion360FunctionIndexEngine.getMillTurnOperations();
      const op = ops.find((o) => o.toolpath_id === "TURNING_TRANSFER");
      expect(op?.parameter_count).toBe(22);
      expect(op?.category).toBe("Synchronization");
    });

    it("TAILSTOCK_ACTUATE has exactly 12 parameters (smallest auxiliary op)", () => {
      const ops = Fusion360FunctionIndexEngine.getMillTurnOperations();
      const op = ops.find((o) => o.toolpath_id === "TAILSTOCK_ACTUATE");
      expect(op?.parameter_count).toBe(12);
      expect(op?.category).toBe("Auxiliary");
    });

    it("THREAD_WHIRLING description references whirl/multi-tooth/orbit kinematics", () => {
      const ops = Fusion360FunctionIndexEngine.getMillTurnOperations();
      const op = ops.find((o) => o.toolpath_id === "THREAD_WHIRLING");
      const text = op?.description.toLowerCase() ?? "";
      expect(text.includes("whirl") || text.includes("orbit") || text.includes("multi-tooth")).toBe(true);
    });

    it("parameter counts sum to 200 across all 12 mill-turn ops", () => {
      const ops = Fusion360FunctionIndexEngine.getMillTurnOperations();
      const total = ops.reduce((sum, o) => sum + o.parameter_count, 0);
      expect(total).toBe(200);
    });

    it("each mill-turn operation has parameter_count > 0 and a non-trivial description", () => {
      const ops = Fusion360FunctionIndexEngine.getMillTurnOperations();
      for (const op of ops) {
        expect(op.parameter_count).toBeGreaterThan(0);
        expect(op.description.length).toBeGreaterThan(20);
      }
    });

    it("dispatcher round-trip: get_mill_turn_operations returns 12 ops with THREAD_WHIRLING @ 22 params", async () => {
      const mod = (await import("../tools/dispatchers/camDispatcher.js")) as unknown as {
        registerCamDispatcher: (server: { tool: unknown }) => void;
      };
      type Handler = (input: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
      let captured: Handler | null = null;
      const fakeServer = {
        tool: (_n: string, _d: string, _s: unknown, h: Handler) => {
          captured = h;
        },
      };
      mod.registerCamDispatcher(fakeServer as unknown as { tool: unknown });
      if (!captured) throw new Error("camDispatcher did not register handler");
      const handler = captured as Handler;
      const raw = (await handler({
        action: "fusion360_function_index_get_mill_turn_operations",
        params: {},
      })) as { content?: Array<{ text: string }> } | Record<string, unknown>;
      const r = raw as { content?: Array<{ text: string }> };
      const result = r.content?.[0]?.text
        ? (JSON.parse(r.content[0].text) as {
            success: boolean;
            operations: Array<{ toolpath_id: string; category: string; parameter_count: number }>;
          })
        : (raw as {
            success: boolean;
            operations: Array<{ toolpath_id: string; category: string; parameter_count: number }>;
          });
      expect(result.success).toBe(true);
      expect(result.operations.length).toBe(12);
      const threadWhirl = result.operations.find((o) => o.toolpath_id === "THREAD_WHIRLING");
      expect(threadWhirl?.category).toBe("Multi_Axis");
      expect(threadWhirl?.parameter_count).toBe(22);
    });

    it("mill_turn module is registered in fusion360 function-index with 200 estimated params", () => {
      const idx = Fusion360FunctionIndexEngine.getIndex();
      const millTurnEntry = idx.modules.find((m) => m.module_id === "mill_turn");
      expect(millTurnEntry?.parameter_count_estimate).toBe(200);
      expect(millTurnEntry?.dependencies).toContain("turning_operations");
      expect(millTurnEntry?.dependencies).toContain("multiaxis_operations");
    });

    it("camDispatcher ACTIONS includes fusion360_function_index_get_mill_turn_operations", async () => {
      const mod = (await import("../tools/dispatchers/camDispatcher.js")) as unknown as {
        ACTIONS: string[];
      };
      expect(mod.ACTIONS).toContain("fusion360_function_index_get_mill_turn_operations");
    });
  });

  describe("getSetupOperations (CAM-EXHAUST-MS1-06)", () => {
    it("returns exactly 12 setup toolpaths", () => {
      const ops = Fusion360FunctionIndexEngine.getSetupOperations();
      expect(ops.length).toBe(12);
    });

    it("Workpiece category contains 5 ops with sorted ids (model + previous_setup + body + box + cylinder)", () => {
      const ops = Fusion360FunctionIndexEngine.getSetupOperations();
      const ids = ops.filter((o) => o.category === "Workpiece").map((o) => o.toolpath_id).sort();
      expect(ids).toEqual([
        "STOCK_FROM_BODY",
        "STOCK_FROM_BOX",
        "STOCK_FROM_CYLINDER",
        "STOCK_FROM_MODEL",
        "STOCK_FROM_PREVIOUS_SETUP",
      ]);
    });

    it("Fixture category contains 2 ops with sorted ids", () => {
      const ops = Fusion360FunctionIndexEngine.getSetupOperations();
      const ids = ops.filter((o) => o.category === "Fixture").map((o) => o.toolpath_id).sort();
      expect(ids).toEqual(["FIXTURE_CHUCK", "FIXTURE_VISE"]);
    });

    it("Coordinates category contains 2 ops (single WCS + extended schedule)", () => {
      const ops = Fusion360FunctionIndexEngine.getSetupOperations();
      const ids = ops.filter((o) => o.category === "Coordinates").map((o) => o.toolpath_id).sort();
      expect(ids).toEqual(["WCS_DEFINE", "WCS_OFFSET_SCHEDULE"]);
    });

    it("Kinematics, Multi_Setup, and Documentation each contain exactly 1 op", () => {
      const ops = Fusion360FunctionIndexEngine.getSetupOperations();
      expect(ops.filter((o) => o.category === "Kinematics").map((o) => o.toolpath_id)).toEqual(["KINEMATICS_BIND"]);
      expect(ops.filter((o) => o.category === "Multi_Setup").map((o) => o.toolpath_id)).toEqual(["SETUP_GROUP"]);
      expect(ops.filter((o) => o.category === "Documentation").map((o) => o.toolpath_id)).toEqual(["SETUP_DOCUMENT"]);
    });

    it("STOCK_FROM_MODEL has 14 parameters and Workpiece category (canonical default)", () => {
      const ops = Fusion360FunctionIndexEngine.getSetupOperations();
      const op = ops.find((o) => o.toolpath_id === "STOCK_FROM_MODEL");
      expect(op?.parameter_count).toBe(14);
      expect(op?.category).toBe("Workpiece");
    });

    it("STOCK_FROM_PREVIOUS_SETUP has 14 parameters and Workpiece category (Op1->Op2 chain)", () => {
      const ops = Fusion360FunctionIndexEngine.getSetupOperations();
      const op = ops.find((o) => o.toolpath_id === "STOCK_FROM_PREVIOUS_SETUP");
      expect(op?.parameter_count).toBe(14);
      expect(op?.category).toBe("Workpiece");
    });

    it("FIXTURE_VISE has 18 parameters (largest fixture op — Kurt-class jaw modeling)", () => {
      const ops = Fusion360FunctionIndexEngine.getSetupOperations();
      const op = ops.find((o) => o.toolpath_id === "FIXTURE_VISE");
      expect(op?.parameter_count).toBe(18);
      expect(op?.category).toBe("Fixture");
    });

    it("KINEMATICS_BIND has 18 parameters and Kinematics category", () => {
      const ops = Fusion360FunctionIndexEngine.getSetupOperations();
      const op = ops.find((o) => o.toolpath_id === "KINEMATICS_BIND");
      expect(op?.parameter_count).toBe(18);
      expect(op?.category).toBe("Kinematics");
    });

    it("STOCK_FROM_PREVIOUS_SETUP description references Op chain / preceding / inherited stock", () => {
      const ops = Fusion360FunctionIndexEngine.getSetupOperations();
      const op = ops.find((o) => o.toolpath_id === "STOCK_FROM_PREVIOUS_SETUP");
      const text = op?.description.toLowerCase() ?? "";
      expect(text.includes("preceding") || text.includes("op2") || text.includes("inherit") || text.includes("chain")).toBe(true);
    });

    it("parameter counts sum to 193 across all 12 setup ops", () => {
      const ops = Fusion360FunctionIndexEngine.getSetupOperations();
      const total = ops.reduce((sum, o) => sum + o.parameter_count, 0);
      expect(total).toBe(193);
    });

    it("each setup operation has parameter_count > 0 and a non-trivial description", () => {
      const ops = Fusion360FunctionIndexEngine.getSetupOperations();
      for (const op of ops) {
        expect(op.parameter_count).toBeGreaterThan(0);
        expect(op.description.length).toBeGreaterThan(20);
      }
    });

    it("dispatcher round-trip: get_setup_operations returns 12 ops with STOCK_FROM_MODEL @ 14 params", async () => {
      const mod = (await import("../tools/dispatchers/camDispatcher.js")) as unknown as {
        registerCamDispatcher: (server: { tool: unknown }) => void;
      };
      type Handler = (input: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
      let captured: Handler | null = null;
      const fakeServer = {
        tool: (_n: string, _d: string, _s: unknown, h: Handler) => {
          captured = h;
        },
      };
      mod.registerCamDispatcher(fakeServer as unknown as { tool: unknown });
      if (!captured) throw new Error("camDispatcher did not register handler");
      const handler = captured as Handler;
      const raw = (await handler({
        action: "fusion360_function_index_get_setup_operations",
        params: {},
      })) as { content?: Array<{ text: string }> } | Record<string, unknown>;
      const r = raw as { content?: Array<{ text: string }> };
      const result = r.content?.[0]?.text
        ? (JSON.parse(r.content[0].text) as {
            success: boolean;
            operations: Array<{ toolpath_id: string; category: string; parameter_count: number }>;
          })
        : (raw as {
            success: boolean;
            operations: Array<{ toolpath_id: string; category: string; parameter_count: number }>;
          });
      expect(result.success).toBe(true);
      expect(result.operations.length).toBe(12);
      const stockFromModel = result.operations.find((o) => o.toolpath_id === "STOCK_FROM_MODEL");
      expect(stockFromModel?.category).toBe("Workpiece");
      expect(stockFromModel?.parameter_count).toBe(14);
    });

    it("setup module is registered in fusion360 function-index with 193 estimated params and no dependencies", () => {
      const idx = Fusion360FunctionIndexEngine.getIndex();
      const setupEntry = idx.modules.find((m) => m.module_id === "setup");
      expect(setupEntry?.parameter_count_estimate).toBe(193);
      expect(setupEntry?.dependencies).toEqual([]);
    });

    it("camDispatcher ACTIONS includes fusion360_function_index_get_setup_operations", async () => {
      const mod = (await import("../tools/dispatchers/camDispatcher.js")) as unknown as {
        ACTIONS: string[];
      };
      expect(mod.ACTIONS).toContain("fusion360_function_index_get_setup_operations");
    });
  });

  describe("getMilling2DDeepOperations (CAM-EXHAUST-MS1-07)", () => {
    it("returns exactly 15 milling-2d-deep toolpaths", () => {
      const ops = Fusion360FunctionIndexEngine.getMilling2DDeepOperations();
      expect(ops.length).toBe(15);
    });

    it("Roughing category contains 5 ops with sorted ids (Adaptive/Pocket/Face/Slot/Circular DEEP)", () => {
      const ops = Fusion360FunctionIndexEngine.getMilling2DDeepOperations();
      const ids = ops.filter((o) => o.category === "Roughing").map((o) => o.toolpath_id).sort();
      expect(ids).toEqual([
        "ADAPTIVE_2D_DEEP",
        "CIRCULAR_DEEP",
        "FACE_DEEP",
        "POCKET_2D_DEEP",
        "SLOT_DEEP",
      ]);
    });

    it("Finishing category contains 4 ops (Contour/Chamfer/Trace/Engrave DEEP)", () => {
      const ops = Fusion360FunctionIndexEngine.getMilling2DDeepOperations();
      const ids = ops.filter((o) => o.category === "Finishing").map((o) => o.toolpath_id).sort();
      expect(ids).toEqual([
        "CHAMFER_2D_DEEP",
        "CONTOUR_2D_DEEP",
        "ENGRAVE_DEEP",
        "TRACE_DEEP",
      ]);
    });

    it("Drilling category contains 6 ops (Bore/Thread DEEP + 4 net-new drill-family)", () => {
      const ops = Fusion360FunctionIndexEngine.getMilling2DDeepOperations();
      const ids = ops.filter((o) => o.category === "Drilling").map((o) => o.toolpath_id).sort();
      expect(ids).toEqual([
        "BORE_DEEP",
        "COUNTERBORE_2D",
        "DRILL_2D",
        "REAM_2D",
        "TAP_2D",
        "THREAD_DEEP",
      ]);
    });

    it("DRILL_2D is the largest op (57 params — covers all 12 Fanuc canned-cycle codes)", () => {
      const ops = Fusion360FunctionIndexEngine.getMilling2DDeepOperations();
      const op = ops.find((o) => o.toolpath_id === "DRILL_2D");
      expect(op?.parameter_count).toBe(57);
      expect(op?.category).toBe("Drilling");
    });

    it("ADAPTIVE_2D_DEEP has 44 parameters and Roughing category", () => {
      const ops = Fusion360FunctionIndexEngine.getMilling2DDeepOperations();
      const op = ops.find((o) => o.toolpath_id === "ADAPTIVE_2D_DEEP");
      expect(op?.parameter_count).toBe(44);
      expect(op?.category).toBe("Roughing");
    });

    it("4 net-new drill-family ops (DRILL/TAP/REAM/COUNTERBORE) all have exact expected param counts and Drilling category", () => {
      const ops = Fusion360FunctionIndexEngine.getMilling2DDeepOperations();
      const expected: Record<string, number> = {
        DRILL_2D: 57,
        TAP_2D: 44,
        REAM_2D: 39,
        COUNTERBORE_2D: 39,
      };
      for (const [id, expectedCount] of Object.entries(expected)) {
        const op = ops.find((o) => o.toolpath_id === id);
        expect(op?.parameter_count).toBe(expectedCount);
        expect(op?.category).toBe("Drilling");
      }
    });

    it("All 11 _DEEP extensions present (one per existing 2d-operations.json op)", () => {
      const ops = Fusion360FunctionIndexEngine.getMilling2DDeepOperations();
      const deepIds = ops.filter((o) => o.toolpath_id.endsWith("_DEEP")).map((o) => o.toolpath_id).sort();
      expect(deepIds).toEqual([
        "ADAPTIVE_2D_DEEP",
        "BORE_DEEP",
        "CHAMFER_2D_DEEP",
        "CIRCULAR_DEEP",
        "CONTOUR_2D_DEEP",
        "ENGRAVE_DEEP",
        "FACE_DEEP",
        "POCKET_2D_DEEP",
        "SLOT_DEEP",
        "THREAD_DEEP",
        "TRACE_DEEP",
      ]);
    });

    it("DRILL_2D description references all 12 canned-cycle codes (drill/tap/ream/bore/counterbore family)", () => {
      const ops = Fusion360FunctionIndexEngine.getMilling2DDeepOperations();
      const op = ops.find((o) => o.toolpath_id === "DRILL_2D");
      const text = op?.description.toLowerCase() ?? "";
      expect(text).toContain("12");
      expect(text.includes("canned") || text.includes("cycle")).toBe(true);
    });

    it("parameter counts sum to 486 across all 15 ops", () => {
      const ops = Fusion360FunctionIndexEngine.getMilling2DDeepOperations();
      const total = ops.reduce((sum, o) => sum + o.parameter_count, 0);
      expect(total).toBe(486);
    });

    it("each op has parameter_count > 0 and a non-trivial description", () => {
      const ops = Fusion360FunctionIndexEngine.getMilling2DDeepOperations();
      for (const op of ops) {
        expect(op.parameter_count).toBeGreaterThan(0);
        expect(op.description.length).toBeGreaterThan(20);
      }
    });

    it("dispatcher round-trip: get_milling_2d_deep_operations returns 15 ops with DRILL_2D @ 57 params", async () => {
      const mod = (await import("../tools/dispatchers/camDispatcher.js")) as unknown as {
        registerCamDispatcher: (server: { tool: unknown }) => void;
      };
      type Handler = (input: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
      let captured: Handler | null = null;
      const fakeServer = {
        tool: (_n: string, _d: string, _s: unknown, h: Handler) => {
          captured = h;
        },
      };
      mod.registerCamDispatcher(fakeServer as unknown as { tool: unknown });
      if (!captured) throw new Error("camDispatcher did not register handler");
      const handler = captured as Handler;
      const raw = (await handler({
        action: "fusion360_function_index_get_milling_2d_deep_operations",
        params: {},
      })) as { content?: Array<{ text: string }> } | Record<string, unknown>;
      const r = raw as { content?: Array<{ text: string }> };
      const result = r.content?.[0]?.text
        ? (JSON.parse(r.content[0].text) as {
            success: boolean;
            operations: Array<{ toolpath_id: string; category: string; parameter_count: number }>;
          })
        : (raw as {
            success: boolean;
            operations: Array<{ toolpath_id: string; category: string; parameter_count: number }>;
          });
      expect(result.success).toBe(true);
      expect(result.operations.length).toBe(15);
      const drill = result.operations.find((o) => o.toolpath_id === "DRILL_2D");
      expect(drill?.category).toBe("Drilling");
      expect(drill?.parameter_count).toBe(57);
    });

    it("milling_2d_deep module is registered in fusion360 function-index with 486 estimated params and depends on 2d_operations", () => {
      const idx = Fusion360FunctionIndexEngine.getIndex();
      const entry = idx.modules.find((m) => m.module_id === "milling_2d_deep");
      expect(entry?.parameter_count_estimate).toBe(486);
      expect(entry?.dependencies).toEqual(["2d_operations"]);
    });

    it("camDispatcher ACTIONS includes fusion360_function_index_get_milling_2d_deep_operations", async () => {
      const mod = (await import("../tools/dispatchers/camDispatcher.js")) as unknown as {
        ACTIONS: string[];
      };
      expect(mod.ACTIONS).toContain("fusion360_function_index_get_milling_2d_deep_operations");
    });
  });
});
