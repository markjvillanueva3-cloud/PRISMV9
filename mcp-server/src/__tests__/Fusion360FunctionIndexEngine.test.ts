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
  });
});
