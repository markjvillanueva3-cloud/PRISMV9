/**
 * CATIAMachiningFunctionIndexEngine.test.ts — CAM-EXHAUST-MS0/U-CAM-FIDX-23
 *
 * Real-data tests against the unified machining.json (Dassault CATIA V5).
 * Engine pivots ops by category into 6 virtual sections.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CATIAMachiningFunctionIndexEngine } from "../engines/CATIAMachiningFunctionIndexEngine";

describe("CATIAMachiningFunctionIndexEngine", () => {
  beforeEach(() => {
    CATIAMachiningFunctionIndexEngine.resetCache();
  });

  describe("loadIndex / getIndex", () => {
    it("loads all six virtual sections (one per category)", () => {
      const idx = CATIAMachiningFunctionIndexEngine.getIndex();
      expect(idx.system_id).toBe("catia");
      const keys = Object.keys(idx.sections).sort();
      expect(keys).toEqual([
        "advanced_machining",
        "delmia_integration",
        "drilling",
        "lathe_machining",
        "prismatic_machining",
        "surface_machining",
      ]);
    });

    it("aggregates exactly 16 total operations from the unified file", () => {
      const idx = CATIAMachiningFunctionIndexEngine.getIndex();
      expect(idx.total_operations).toBe(16);
    });

    it("aggregates total parameters above 200", () => {
      const idx = CATIAMachiningFunctionIndexEngine.getIndex();
      expect(idx.total_parameters).toBeGreaterThan(200);
      expect(idx.total_parameters).toBeLessThan(500);
    });

    it("collects 6 distinct categories", () => {
      const idx = CATIAMachiningFunctionIndexEngine.getIndex();
      expect(idx.categories.length).toBe(6);
      expect(idx.categories).toContain("prismatic_machining");
      expect(idx.categories).toContain("delmia_integration");
    });

    it("caches loaded index — second call returns identical object", () => {
      const a = CATIAMachiningFunctionIndexEngine.getIndex();
      const b = CATIAMachiningFunctionIndexEngine.getIndex();
      expect(a).toBe(b);
    });

    it("resetCache forces a fresh load with stable totals", () => {
      const a = CATIAMachiningFunctionIndexEngine.getIndex();
      CATIAMachiningFunctionIndexEngine.resetCache();
      const b = CATIAMachiningFunctionIndexEngine.getIndex();
      expect(a).not.toBe(b);
      expect(b.total_operations).toBe(16);
    });
  });

  describe("listSections", () => {
    it("returns the six expected category keys", () => {
      const sections = CATIAMachiningFunctionIndexEngine.listSections().sort();
      expect(sections).toEqual([
        "advanced_machining",
        "delmia_integration",
        "drilling",
        "lathe_machining",
        "prismatic_machining",
        "surface_machining",
      ]);
    });
  });

  describe("getSection", () => {
    it("returns prismatic_machining with 3 ops including facing", () => {
      const section = CATIAMachiningFunctionIndexEngine.getSection("prismatic_machining");
      if ("operations" in section) {
        expect(Object.keys(section.operations)).toHaveLength(3);
        expect(section.operations.facing.parameters.strategy.machining_mode.default).toBe("zigzag");
        expect(section.operations.facing.parameters.strategy.stepover_mm.default).toBe(10);
      }
    });

    it("returns drilling section with drilling + tapping ops", () => {
      const section = CATIAMachiningFunctionIndexEngine.getSection("drilling");
      if ("operations" in section) {
        const ids = Object.keys(section.operations).sort();
        expect(ids).toEqual(["drilling", "tapping"]);
        expect(section.operations.drilling.parameters.cycle.cycle_type.default).toBe("drilling");
        expect(section.operations.drilling.parameters.cycle.peck_depth_mm.default).toBe(5);
      }
    });

    it("returns lathe_machining with 3 ops including lathe_roughing", () => {
      const section = CATIAMachiningFunctionIndexEngine.getSection("lathe_machining");
      if ("operations" in section) {
        expect(Object.keys(section.operations)).toHaveLength(3);
        expect(section.operations.lathe_roughing.parameters.strategy.roughing_mode.default).toBe("longitudinal");
        expect(section.operations.lathe_roughing.parameters.geometry.machining_area.default).toBe("od");
      }
    });

    it("returns delmia_integration with nc_simulation + post_processor", () => {
      const section = CATIAMachiningFunctionIndexEngine.getSection("delmia_integration");
      if ("operations" in section) {
        const ids = Object.keys(section.operations).sort();
        expect(ids).toEqual(["nc_simulation", "post_processor"]);
        expect(section.operations.nc_simulation.parameters.machine.controller_type.default).toBe("fanuc");
      }
    });

    it("returns advanced_machining with multi_axis_sweeping + swarf_cutting", () => {
      const section = CATIAMachiningFunctionIndexEngine.getSection("advanced_machining");
      if ("operations" in section) {
        expect(Object.keys(section.operations)).toHaveLength(2);
        expect(section.operations.swarf_cutting.dialog_tabs).toContain("tool_axis");
      }
    });

    it("returns error object for unknown section with available list", () => {
      const result = CATIAMachiningFunctionIndexEngine.getSection("nonexistent");
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toBe("Section 'nonexistent' not found");
        expect(result.available).toContain("prismatic_machining");
      }
    });
  });

  describe("listOperations", () => {
    it("returns 16 operations across all sections", () => {
      const ops = CATIAMachiningFunctionIndexEngine.listOperations();
      expect(ops).toHaveLength(16);
    });

    it("includes representative ops from every section", () => {
      const ops = CATIAMachiningFunctionIndexEngine.listOperations();
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toContain("facing");
      expect(ids).toContain("zlevel");
      expect(ids).toContain("drilling");
      expect(ids).toContain("lathe_roughing");
      expect(ids).toContain("swarf_cutting");
      expect(ids).toContain("nc_simulation");
    });

    it("section field equals category for every op (single-file pivot)", () => {
      const ops = CATIAMachiningFunctionIndexEngine.listOperations();
      const mismatches = ops.filter((o) => o.section !== o.category);
      expect(mismatches).toHaveLength(0);
    });
  });

  describe("findParameter", () => {
    it("finds 'depth_of_cut_mm' across multiple ops", () => {
      const hits = CATIAMachiningFunctionIndexEngine.findParameter("depth_of_cut_mm");
      expect(hits.length).toBeGreaterThanOrEqual(2);
      const facing = hits.find((h) => h.operation_id === "facing");
      expect(facing?.parameter.default).toBe(2);
    });

    it("finds 'cycle_type' in drilling op with default 'drilling'", () => {
      const hits = CATIAMachiningFunctionIndexEngine.findParameter("cycle_type");
      expect(hits.length).toBeGreaterThanOrEqual(1);
      const drilling = hits.find((h) => h.operation_id === "drilling");
      expect(drilling?.parameter.default).toBe("drilling");
    });

    it("finds 'controller_type' only in nc_simulation, default fanuc", () => {
      const hits = CATIAMachiningFunctionIndexEngine.findParameter("controller_type");
      expect(hits).toHaveLength(1);
      expect(hits[0].operation_id).toBe("nc_simulation");
      expect(hits[0].section).toBe("delmia_integration");
      expect(hits[0].parameter.default).toBe("fanuc");
    });

    it("returns empty array for nonexistent parameter", () => {
      const hits = CATIAMachiningFunctionIndexEngine.findParameter("xyzzy_nope");
      expect(hits).toEqual([]);
    });

    it("throws on empty parameter name", () => {
      expect(() => CATIAMachiningFunctionIndexEngine.findParameter("")).toThrow(
        "findParameter: parameterName must be a non-empty string"
      );
    });

    it("throws on null parameter name", () => {
      expect(() => CATIAMachiningFunctionIndexEngine.findParameter(null as unknown as string)).toThrow();
    });
  });

  describe("searchParameters", () => {
    it("searches 'tool' and finds matches in multiple sections", () => {
      const results = CATIAMachiningFunctionIndexEngine.searchParameters("tool");
      expect(results.length).toBeGreaterThan(3);
      const sectionsHit = new Set(results.map((r) => r.section));
      expect(sectionsHit.size).toBeGreaterThan(1);
    });

    it("clamps limit to 1", () => {
      const results = CATIAMachiningFunctionIndexEngine.searchParameters("feed", 1);
      expect(results).toHaveLength(1);
    });

    it("clamps oversized limit to 500", () => {
      const results = CATIAMachiningFunctionIndexEngine.searchParameters("feed", 99999);
      expect(results.length).toBeLessThanOrEqual(500);
    });

    it("matches description text — finds 'planar' from facing description", () => {
      const results = CATIAMachiningFunctionIndexEngine.searchParameters("planar");
      const facing = results.find((r) => r.operation_id === "facing");
      expect(facing?.section).toBe("prismatic_machining");
    });

    it("throws on empty query", () => {
      expect(() => CATIAMachiningFunctionIndexEngine.searchParameters("")).toThrow(
        "searchParameters: query must be a non-empty string"
      );
    });
  });

  describe("getOperationsByCategory", () => {
    it("matches prismatic_machining with 3 ops", () => {
      const ops = CATIAMachiningFunctionIndexEngine.getOperationsByCategory("prismatic_machining");
      expect(ops).toHaveLength(3);
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual(["facing", "pocketing", "profile_contouring"]);
    });

    it("matches case-insensitive 'LATHE' substring with 3 ops", () => {
      const ops = CATIAMachiningFunctionIndexEngine.getOperationsByCategory("LATHE");
      expect(ops).toHaveLength(3);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toContain("lathe_roughing");
      expect(ids).toContain("lathe_finishing");
    });

    it("returns empty array for unknown category", () => {
      const ops = CATIAMachiningFunctionIndexEngine.getOperationsByCategory("not_real_category_xyz");
      expect(ops).toEqual([]);
    });

    it("throws on empty category", () => {
      expect(() => CATIAMachiningFunctionIndexEngine.getOperationsByCategory("")).toThrow(
        "getOperationsByCategory: category must be a non-empty string"
      );
    });
  });

  describe("getSummary", () => {
    it("reports system_id=catia, 6 sections, 16 ops", () => {
      const s = CATIAMachiningFunctionIndexEngine.getSummary();
      expect(s.system_id).toBe("catia");
      expect(s.total_sections).toBe(6);
      expect(s.total_operations).toBe(16);
    });

    it("section operation counts sum to 16", () => {
      const s = CATIAMachiningFunctionIndexEngine.getSummary();
      const total = s.sections.reduce((acc, sec) => acc + sec.operations, 0);
      expect(total).toBe(16);
    });

    it("advanced_machining reports 2 ops (multi_axis_sweeping + swarf_cutting)", () => {
      const s = CATIAMachiningFunctionIndexEngine.getSummary();
      const adv = s.sections.find((x) => x.key === "advanced_machining");
      expect(adv?.operations).toBe(2);
    });
  });

  describe("getSurfaceMachiningOperations (flagship surface)", () => {
    it("returns the 4 surface_machining ops", () => {
      const ops = CATIAMachiningFunctionIndexEngine.getSurfaceMachiningOperations();
      expect(ops).toHaveLength(4);
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "pencil_tracing",
        "spiral_milling",
        "sweeping",
        "zlevel",
      ]);
    });

    it("all returned ops report section='surface_machining'", () => {
      const ops = CATIAMachiningFunctionIndexEngine.getSurfaceMachiningOperations();
      const sections = new Set(ops.map((o) => o.section));
      expect(sections.size).toBe(1);
      expect(sections.has("surface_machining")).toBe(true);
    });
  });

  describe("getLatheMachiningOperations (engine-only surface)", () => {
    it("returns the 3 lathe_machining ops", () => {
      const ops = CATIAMachiningFunctionIndexEngine.getLatheMachiningOperations();
      expect(ops).toHaveLength(3);
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "grooving",
        "lathe_finishing",
        "lathe_roughing",
      ]);
    });

    it("all from lathe_machining section", () => {
      const ops = CATIAMachiningFunctionIndexEngine.getLatheMachiningOperations();
      for (const op of ops) {
        expect(op.section).toBe("lathe_machining");
      }
    });
  });

  describe("getOperation", () => {
    it("finds facing in prismatic_machining section", () => {
      const result = CATIAMachiningFunctionIndexEngine.getOperation("facing");
      if ("operation" in result) {
        expect(result.section).toBe("prismatic_machining");
        expect(result.operation.dialog_tabs).toContain("strategy");
      } else {
        expect.fail("expected found op");
      }
    });

    it("finds nc_simulation in delmia_integration section", () => {
      const result = CATIAMachiningFunctionIndexEngine.getOperation("nc_simulation");
      if ("operation" in result) {
        expect(result.section).toBe("delmia_integration");
        expect(result.operation.parameters.simulation.collision_detection.default).toBe(true);
      } else {
        expect.fail("expected found op");
      }
    });

    it("returns error object for unknown operation id", () => {
      const result = CATIAMachiningFunctionIndexEngine.getOperation("not_real_op");
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toBe("Operation 'not_real_op' not found");
      }
    });

    it("throws on empty operation id", () => {
      expect(() => CATIAMachiningFunctionIndexEngine.getOperation("")).toThrow(
        "getOperation: operationId must be a non-empty string"
      );
    });
  });

  describe("getTrainingTopics", () => {
    it("returns empty array for prismatic_machining (CATIA file has no embedded topics)", () => {
      const topics = CATIAMachiningFunctionIndexEngine.getTrainingTopics("prismatic_machining");
      expect(topics).toEqual([]);
    });

    it("returns empty array for unknown section", () => {
      const topics = CATIAMachiningFunctionIndexEngine.getTrainingTopics("nonexistent");
      expect(topics).toEqual([]);
    });
  });

  describe("CATIA-specific structural checks", () => {
    it("facing strategy defaults to zigzag with 10mm stepover and 2mm DOC", () => {
      const result = CATIAMachiningFunctionIndexEngine.getOperation("facing");
      if ("operation" in result) {
        expect(result.operation.parameters.strategy.machining_mode.default).toBe("zigzag");
        expect(result.operation.parameters.strategy.stepover_mm.default).toBe(10);
        expect(result.operation.parameters.strategy.depth_of_cut_mm.default).toBe(2);
      }
    });

    it("drilling default is blind_depth bottom + 5mm peck", () => {
      const result = CATIAMachiningFunctionIndexEngine.getOperation("drilling");
      if ("operation" in result) {
        expect(result.operation.parameters.geometry.bottom_type.default).toBe("blind_depth");
        expect(result.operation.parameters.cycle.peck_depth_mm.default).toBe(5);
        expect(result.operation.parameters.cycle.cycle_type.default).toBe("drilling");
      }
    });

    it("lathe_roughing defaults to longitudinal mode on OD", () => {
      const result = CATIAMachiningFunctionIndexEngine.getOperation("lathe_roughing");
      if ("operation" in result) {
        expect(result.operation.parameters.strategy.roughing_mode.default).toBe("longitudinal");
        expect(result.operation.parameters.geometry.machining_area.default).toBe("od");
        expect(result.operation.parameters.strategy.depth_of_cut_mm.default).toBe(2);
      }
    });

    it("nc_simulation defaults to Fanuc + collision detection enabled", () => {
      const result = CATIAMachiningFunctionIndexEngine.getOperation("nc_simulation");
      if ("operation" in result) {
        expect(result.operation.parameters.machine.controller_type.default).toBe("fanuc");
        expect(result.operation.parameters.simulation.collision_detection.default).toBe(true);
        expect(result.operation.parameters.simulation.stock_update.default).toBe(true);
      }
    });

    it("post_processor defaults to fanuc family + ISO format", () => {
      const result = CATIAMachiningFunctionIndexEngine.getOperation("post_processor");
      if ("operation" in result) {
        expect(result.operation.parameters.controller.controller_family.default).toBe("fanuc");
        expect(result.operation.parameters.controller.nc_format.default).toBe("iso");
        expect(result.operation.parameters.format.modal_codes.default).toBe(true);
      }
    });

    it("swarf_cutting has tool_axis tab and category=advanced_machining", () => {
      const result = CATIAMachiningFunctionIndexEngine.getOperation("swarf_cutting");
      if ("operation" in result) {
        expect(result.operation.dialog_tabs).toContain("tool_axis");
        expect(result.operation.category).toBe("advanced_machining");
        expect(result.section).toBe("advanced_machining");
      }
    });
  });
});
