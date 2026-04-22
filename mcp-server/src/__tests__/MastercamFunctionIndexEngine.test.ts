/**
 * Tests for MastercamFunctionIndexEngine
 * @see src/engines/MastercamFunctionIndexEngine.ts
 * @see CAM-EXHAUST-MS0 U-CAM20
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MastercamFunctionIndexEngine } from "../engines/MastercamFunctionIndexEngine.js";

describe("MastercamFunctionIndexEngine", () => {
  beforeEach(() => {
    MastercamFunctionIndexEngine.clearCache();
  });

  describe("getIndex", () => {
    it("should load the function index successfully", () => {
      const index = MastercamFunctionIndexEngine.getIndex();
      expect(index).toBeDefined();
      expect(index.system_id).toBe("mastercam");
      expect(index.module_id).toBe("function_index");
      expect(index.schema_version).toBe("1.0.0");
    });

    it("should cache the index on subsequent calls", () => {
      const index1 = MastercamFunctionIndexEngine.getIndex();
      const index2 = MastercamFunctionIndexEngine.getIndex();
      expect(index1).toBe(index2);
    });

    it("should have modules array with entries", () => {
      const index = MastercamFunctionIndexEngine.getIndex();
      expect(Array.isArray(index.modules)).toBe(true);
      expect(index.modules.length).toBeGreaterThan(0);
    });
  });

  describe("listModules", () => {
    it("should return array of module IDs", () => {
      const modules = MastercamFunctionIndexEngine.listModules();
      expect(Array.isArray(modules)).toBe(true);
      expect(modules.length).toBeGreaterThan(0);
      expect(modules).toContain("2d_toolpaths");
    });

    it("should include all expected Mastercam modules", () => {
      const modules = MastercamFunctionIndexEngine.listModules();
      const expectedModules = [
        "2d_toolpaths",
        "3d_hst_toolpaths",
        "multiaxis_toolpaths",
        "lathe_toolpaths",
        "wire_edm",
        "machine_simulation",
      ];
      for (const mod of expectedModules) {
        expect(modules).toContain(mod);
      }
    });
  });

  describe("getModuleEntry", () => {
    it("should return entry for existing module", () => {
      const entry = MastercamFunctionIndexEngine.getModuleEntry("2d_toolpaths");
      expect(entry).toBeDefined();
      expect(entry?.module_id).toBe("2d_toolpaths");
      expect(entry?.path).toContain("mastercam");
      expect(entry?.covered_units).toContain("U-CAM14");
    });

    it("should return null for non-existent module", () => {
      const entry = MastercamFunctionIndexEngine.getModuleEntry("nonexistent");
      expect(entry).toBeNull();
    });

    it("should include parameter count estimate", () => {
      const entry = MastercamFunctionIndexEngine.getModuleEntry("2d_toolpaths");
      expect(entry?.parameter_count_estimate).toBeGreaterThan(0);
    });
  });

  describe("getModule", () => {
    it("should load 2d_toolpaths module", () => {
      const mod = MastercamFunctionIndexEngine.getModule("2d_toolpaths");
      expect(mod).toBeDefined();
      expect(mod?.system_id).toBe("mastercam");
    });

    it("should cache loaded modules", () => {
      const mod1 = MastercamFunctionIndexEngine.getModule("2d_toolpaths");
      const mod2 = MastercamFunctionIndexEngine.getModule("2d_toolpaths");
      expect(mod1).toBe(mod2);
    });

    it("should return null for non-existent module", () => {
      const mod = MastercamFunctionIndexEngine.getModule("nonexistent");
      expect(mod).toBeNull();
    });

    it("should have toolpaths in loaded module", () => {
      const mod = MastercamFunctionIndexEngine.getModule("2d_toolpaths");
      const toolpaths = mod?.module?.toolpaths ?? mod?.toolpaths ?? [];
      expect(toolpaths.length).toBeGreaterThan(0);
    });
  });

  describe("listAllToolpaths", () => {
    it("should return array of toolpath info objects", () => {
      const toolpaths = MastercamFunctionIndexEngine.listAllToolpaths();
      expect(Array.isArray(toolpaths)).toBe(true);
      expect(toolpaths.length).toBeGreaterThan(0);
    });

    it("should include module_id and toolpath_id in each entry", () => {
      const toolpaths = MastercamFunctionIndexEngine.listAllToolpaths();
      if (toolpaths.length > 0) {
        const first = toolpaths[0];
        expect(first.module_id).toBeDefined();
        expect(first.toolpath_id).toBeDefined();
        expect(first.toolpath_name).toBeDefined();
      }
    });
  });

  describe("getToolpathsByCategory", () => {
    it("should return 2D toolpaths for '2d' category", () => {
      const toolpaths = MastercamFunctionIndexEngine.getToolpathsByCategory("2d");
      expect(Array.isArray(toolpaths)).toBe(true);
    });

    it("should return lathe toolpaths for 'lathe' category", () => {
      const toolpaths = MastercamFunctionIndexEngine.getToolpathsByCategory("lathe");
      expect(Array.isArray(toolpaths)).toBe(true);
    });

    it("should return empty array for unknown category", () => {
      const toolpaths = MastercamFunctionIndexEngine.getToolpathsByCategory("unknown_xyz");
      expect(Array.isArray(toolpaths)).toBe(true);
      expect(toolpaths.length).toBe(0);
    });

    it("should handle case-insensitive category lookup", () => {
      const lower = MastercamFunctionIndexEngine.getToolpathsByCategory("lathe");
      const upper = MastercamFunctionIndexEngine.getToolpathsByCategory("LATHE");
      expect(lower.length).toBe(upper.length);
    });
  });

  describe("getTotalParameterCount", () => {
    it("should return positive parameter count", () => {
      const count = MastercamFunctionIndexEngine.getTotalParameterCount();
      expect(count).toBeGreaterThan(0);
    });

    it("should match coverage summary value", () => {
      const count = MastercamFunctionIndexEngine.getTotalParameterCount();
      const index = MastercamFunctionIndexEngine.getIndex();
      expect(count).toBe(index.coverage_summary.estimated_parameter_total);
    });
  });

  describe("getPhysicsFormulas", () => {
    it("should return array of physics formula IDs", () => {
      const formulas = MastercamFunctionIndexEngine.getPhysicsFormulas();
      expect(Array.isArray(formulas)).toBe(true);
      expect(formulas.length).toBeGreaterThan(0);
    });

    it("should include core cutting formulas", () => {
      const formulas = MastercamFunctionIndexEngine.getPhysicsFormulas();
      expect(formulas).toContain("CUTTING_SPEED");
      expect(formulas).toContain("KIENZLE_FORCE");
      expect(formulas).toContain("TAYLOR_TOOL_LIFE");
    });
  });

  describe("getDispatchersTouched", () => {
    it("should return array of dispatcher names", () => {
      const dispatchers = MastercamFunctionIndexEngine.getDispatchersTouched();
      expect(Array.isArray(dispatchers)).toBe(true);
      expect(dispatchers.length).toBeGreaterThan(0);
    });

    it("should include prism_cam dispatcher", () => {
      const dispatchers = MastercamFunctionIndexEngine.getDispatchersTouched();
      expect(dispatchers).toContain("prism_cam");
    });
  });

  describe("getLinkedEngines", () => {
    it("should return array of engine class names", () => {
      const engines = MastercamFunctionIndexEngine.getLinkedEngines();
      expect(Array.isArray(engines)).toBe(true);
      expect(engines.length).toBeGreaterThan(0);
    });

    it("should include MastercamFunctionIndexEngine itself", () => {
      const engines = MastercamFunctionIndexEngine.getLinkedEngines();
      expect(engines).toContain("MastercamFunctionIndexEngine");
    });
  });

  describe("getModulesForUnit", () => {
    it("should return modules covering U-CAM14", () => {
      const modules = MastercamFunctionIndexEngine.getModulesForUnit("U-CAM14");
      expect(Array.isArray(modules)).toBe(true);
      expect(modules.length).toBeGreaterThan(0);
      expect(modules).toContain("2d_toolpaths");
    });

    it("should return empty array for non-existent unit", () => {
      const modules = MastercamFunctionIndexEngine.getModulesForUnit("U-NONEXISTENT");
      expect(modules).toEqual([]);
    });
  });

  describe("getModuleDependencies", () => {
    it("should return dependencies for 3d_hst_toolpaths", () => {
      const deps = MastercamFunctionIndexEngine.getModuleDependencies("3d_hst_toolpaths");
      expect(Array.isArray(deps)).toBe(true);
      expect(deps).toContain("2d_toolpaths");
    });

    it("should return empty array for module with no deps", () => {
      const deps = MastercamFunctionIndexEngine.getModuleDependencies("2d_toolpaths");
      expect(Array.isArray(deps)).toBe(true);
      expect(deps.length).toBe(0);
    });
  });

  describe("getSummary", () => {
    it("should return valid summary object", () => {
      const summary = MastercamFunctionIndexEngine.getSummary();
      expect(summary.source).toBe("mastercam_function_index");
      expect(summary.value.moduleCount).toBeGreaterThan(0);
      expect(summary.value.totalParams).toBeGreaterThan(0);
      expect(Array.isArray(summary.value.unitsTracked)).toBe(true);
    });

    it("should track U-CAM14 through U-CAM19", () => {
      const summary = MastercamFunctionIndexEngine.getSummary();
      const expectedUnits = ["U-CAM14", "U-CAM15", "U-CAM16", "U-CAM17", "U-CAM18", "U-CAM19"];
      for (const unit of expectedUnits) {
        expect(summary.value.unitsTracked).toContain(unit);
      }
    });
  });

  describe("clearCache", () => {
    it("should clear index cache", () => {
      const index1 = MastercamFunctionIndexEngine.getIndex();
      MastercamFunctionIndexEngine.clearCache();
      const index2 = MastercamFunctionIndexEngine.getIndex();
      expect(index1).not.toBe(index2);
      expect(index1).toEqual(index2);
    });

    it("should clear module cache", () => {
      const mod1 = MastercamFunctionIndexEngine.getModule("2d_toolpaths");
      MastercamFunctionIndexEngine.clearCache();
      const mod2 = MastercamFunctionIndexEngine.getModule("2d_toolpaths");
      expect(mod1).not.toBe(mod2);
    });

    it("should clear load errors array", () => {
      // Calling clearCache resets the errors array even if empty
      MastercamFunctionIndexEngine.clearCache();
      const errors = MastercamFunctionIndexEngine.getLoadErrors();
      expect(Array.isArray(errors)).toBe(true);
      expect(errors.length).toBe(0);
    });
  });
});
