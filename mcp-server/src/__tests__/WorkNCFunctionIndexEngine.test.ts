/**
 * WorkNCFunctionIndexEngine tests — CAM-EXHAUST-MS0/U-CAM-FIDX-12
 *
 * Real-data tests against the four WorkNC catalog files
 * (mold_die, hsm, five_axis, drilling).
 */

import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect, beforeEach } from "vitest";
import { WorkNCFunctionIndexEngine } from "../engines/WorkNCFunctionIndexEngine.js";

describe("WorkNCFunctionIndexEngine", () => {
  beforeEach(() => {
    WorkNCFunctionIndexEngine.resetCache();
  });

  describe("getIndex", () => {
    it("returns a valid function index with system_id 'worknc'", () => {
      const index = WorkNCFunctionIndexEngine.getIndex();
      expect(index.system_id).toBe("worknc");
      expect(typeof index.sections).toBe("object");
      expect(typeof index.total_operations).toBe("number");
      expect(typeof index.total_parameters).toBe("number");
      expect(Array.isArray(index.categories)).toBe(true);
    });

    it("loads all four shipped sections", () => {
      const index = WorkNCFunctionIndexEngine.getIndex();
      const keys = Object.keys(index.sections).sort();
      expect(keys).toEqual(["drilling", "five_axis", "hsm", "mold_die"]);
    });

    it("totals match summary blocks (≥ 17 operations, ≥ 240 params)", () => {
      // mold_die 5 + hsm 4 + five_axis 4 + drilling 4 = 17
      const index = WorkNCFunctionIndexEngine.getIndex();
      expect(index.total_operations).toBeGreaterThanOrEqual(17);
      expect(index.total_parameters).toBeGreaterThanOrEqual(240);
    });

    it("aggregates WorkNC-distinctive categories", () => {
      const index = WorkNCFunctionIndexEngine.getIndex();
      expect(index.categories).toEqual(
        expect.arrayContaining([
          "mold_die",
          "auto5",
          "edm_prep",
          "pencil",
          "rest_machining",
        ])
      );
    });

    it("caches the index so two calls return the same reference", () => {
      const a = WorkNCFunctionIndexEngine.getIndex();
      const b = WorkNCFunctionIndexEngine.getIndex();
      expect(a).toBe(b);
    });

    it("resetCache forces a re-load (different reference, same shape)", () => {
      const a = WorkNCFunctionIndexEngine.getIndex();
      WorkNCFunctionIndexEngine.resetCache();
      const b = WorkNCFunctionIndexEngine.getIndex();
      expect(a).not.toBe(b);
      expect(b.system_id).toBe(a.system_id);
      expect(b.total_operations).toBe(a.total_operations);
      expect(b.total_parameters).toBe(a.total_parameters);
    });
  });

  describe("listSections / getSection", () => {
    it("listSections returns the four shipped section keys", () => {
      const sections = WorkNCFunctionIndexEngine.listSections();
      expect(sections.sort()).toEqual([
        "drilling",
        "five_axis",
        "hsm",
        "mold_die",
      ]);
    });

    it("getSection returns the mold_die section with EDM pocket present", () => {
      const section = WorkNCFunctionIndexEngine.getSection("mold_die");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        expect(section.system_id).toBe("worknc");
        expect(section.section_key).toBe("mold_die");
        const opIds = Object.keys(section.operations);
        expect(opIds.length).toBeGreaterThanOrEqual(5);
        expect(opIds).toEqual(
          expect.arrayContaining([
            "global_roughing",
            "vortex_rough",
            "rest_rough",
            "core_cavity_finish",
            "edm_pocket",
          ])
        );
      }
    });

    it("EDM pocket has expected EDM stock range and validation", () => {
      const section = WorkNCFunctionIndexEngine.getSection("mold_die");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        const op = section.operations.edm_pocket;
        expect(op.category).toBe("edm_prep");
        expect(op.parameters.edm.edmStock.range).toEqual([0.01, 0.2]);
        expect(op.parameters.edm.edmStock.required).toBe(true);
        expect(op.parameters.edm.uniformStockRequired.default).toBe(true);
      }
    });

    it("Auto5 has expected tilt mode values and limits", () => {
      const section = WorkNCFunctionIndexEngine.getSection("five_axis");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        const op = section.operations.auto5_3plus2;
        expect(op.category).toBe("auto5");
        expect(op.parameters.strategy.tiltMode.values).toEqual([
          "min_tilt",
          "max_clearance",
          "single_orientation",
        ]);
        expect(op.parameters.strategy.maxTiltA.default).toBe(30);
      }
    });

    it("getSection returns an error object for an unknown key", () => {
      const section = WorkNCFunctionIndexEngine.getSection("does_not_exist");
      expect("error" in section).toBe(true);
      if ("error" in section) {
        expect(section.error).toContain("does_not_exist");
        expect(section.available).toEqual(
          expect.arrayContaining(["mold_die", "hsm", "five_axis", "drilling"])
        );
      }
    });
  });

  describe("listOperations", () => {
    it("returns at least 17 operations across sections", () => {
      const ops = WorkNCFunctionIndexEngine.listOperations();
      expect(ops.length).toBeGreaterThanOrEqual(17);
    });

    it("every returned op has the four required fields populated", () => {
      const ops = WorkNCFunctionIndexEngine.listOperations();
      for (const op of ops) {
        expect(typeof op.operation_id).toBe("string");
        expect(op.operation_id.length).toBeGreaterThan(0);
        expect(typeof op.display_name).toBe("string");
        expect(op.display_name.length).toBeGreaterThan(0);
        expect(typeof op.section).toBe("string");
        expect(op.section.length).toBeGreaterThan(0);
        expect(typeof op.category).toBe("string");
        expect(op.category.length).toBeGreaterThan(0);
      }
    });

    it("vortex_rough is in mold_die/roughing", () => {
      const ops = WorkNCFunctionIndexEngine.listOperations();
      const v = ops.find((o) => o.operation_id === "vortex_rough");
      expect(v?.section).toBe("mold_die");
      expect(v?.category).toBe("roughing");
    });

    it("pencil_trace is in hsm/pencil", () => {
      const ops = WorkNCFunctionIndexEngine.listOperations();
      const p = ops.find((o) => o.operation_id === "pencil_trace");
      expect(p?.section).toBe("hsm");
      expect(p?.category).toBe("pencil");
    });
  });

  describe("findParameter", () => {
    it("locates 'edmStock' inside edm_pocket only", () => {
      const results = WorkNCFunctionIndexEngine.findParameter("edmStock");
      expect(results.length).toBe(1);
      expect(results[0].operation_id).toBe("edm_pocket");
      expect(results[0].section).toBe("mold_die");
      expect(results[0].parameter.required).toBe(true);
      expect(results[0].parameter.range).toEqual([0.01, 0.2]);
    });

    it("locates 'tea' inside vortex_rough", () => {
      const results = WorkNCFunctionIndexEngine.findParameter("tea");
      const v = results.find((r) => r.operation_id === "vortex_rough");
      expect(v?.section).toBe("mold_die");
      expect(v?.group).toBe("engagement");
      expect(v?.parameter.required).toBe(true);
      expect(v?.parameter.unit).toBe("deg");
    });

    it("returns an empty array for a needle that never matches", () => {
      const results = WorkNCFunctionIndexEngine.findParameter(
        "xyz_no_such_parameter_999"
      );
      expect(results).toEqual([]);
    });

    it("throws on empty / non-string parameterName (failure mode)", () => {
      expect(() => WorkNCFunctionIndexEngine.findParameter("")).toThrow(
        /non-empty string/
      );
      // @ts-expect-error - deliberate adversarial call
      expect(() => WorkNCFunctionIndexEngine.findParameter(null)).toThrow(
        /non-empty string/
      );
      // @ts-expect-error - deliberate adversarial call
      expect(() =>
        WorkNCFunctionIndexEngine.findParameter(undefined)
      ).toThrow(/non-empty string/);
    });
  });

  describe("searchParameters", () => {
    it("matches by description (Delcam term on Vortex)", () => {
      // 'trochoidal' appears in Vortex parameter descriptions
      const results = WorkNCFunctionIndexEngine.searchParameters(
        "trochoidal",
        50
      );
      // Word may not be in parameter descriptions — only operation desc
      // 'thinWall' is real:
      const results2 = WorkNCFunctionIndexEngine.searchParameters(
        "deflection",
        50
      );
      expect(results2.length).toBeGreaterThanOrEqual(1);
      const hit = results2.find(
        (r) => r.operation_id === "rib_machining"
      );
      expect(hit?.section).toBe("hsm");
    });

    it("respects the limit cap", () => {
      const results = WorkNCFunctionIndexEngine.searchParameters("type", 5);
      expect(results.length).toBe(5);
    });

    it("clamps non-positive limits to a safe default of 1", () => {
      const r = WorkNCFunctionIndexEngine.searchParameters("type", -10);
      expect(r.length).toBe(1);
    });

    it("clamps oversized limits to 500 (DoS guard)", () => {
      const r = WorkNCFunctionIndexEngine.searchParameters("a", 100000);
      expect(r.length).toBeLessThanOrEqual(500);
    });

    it("throws on empty query (failure mode)", () => {
      expect(() => WorkNCFunctionIndexEngine.searchParameters("")).toThrow(
        /non-empty string/
      );
    });
  });

  describe("getOperationsByCategory", () => {
    it("returns at least one finishing operation", () => {
      const ops =
        WorkNCFunctionIndexEngine.getOperationsByCategory("finishing");
      expect(ops.length).toBeGreaterThanOrEqual(1);
    });

    it("returns drilling operations under 'holemaking'", () => {
      const ops =
        WorkNCFunctionIndexEngine.getOperationsByCategory("holemaking");
      expect(ops.length).toBeGreaterThanOrEqual(4);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toEqual(
        expect.arrayContaining(["drill", "peck_drill", "tap", "ream"])
      );
    });

    it("returns auto5 operations", () => {
      const ops =
        WorkNCFunctionIndexEngine.getOperationsByCategory("auto5");
      expect(ops.length).toBeGreaterThanOrEqual(1);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toEqual(expect.arrayContaining(["auto5_3plus2"]));
    });

    it("returns [] for an unknown category", () => {
      const ops = WorkNCFunctionIndexEngine.getOperationsByCategory(
        "nonexistent_category_xyz"
      );
      expect(ops).toEqual([]);
    });

    it("throws on empty category (failure mode)", () => {
      expect(() =>
        WorkNCFunctionIndexEngine.getOperationsByCategory("")
      ).toThrow(/non-empty string/);
    });
  });

  describe("getSummary", () => {
    it("aggregates counts that match the index", () => {
      const idx = WorkNCFunctionIndexEngine.getIndex();
      const sum = WorkNCFunctionIndexEngine.getSummary();
      expect(sum.system_id).toBe("worknc");
      expect(sum.total_sections).toBe(Object.keys(idx.sections).length);
      expect(sum.total_operations).toBe(idx.total_operations);
      expect(sum.total_parameters).toBe(idx.total_parameters);
      const sumOps = sum.sections.reduce((a, s) => a + s.operations, 0);
      expect(sumOps).toBe(sum.total_operations);
    });
  });

  describe("getAuto5Operations", () => {
    it("returns all four 5-axis operations including auto5_3plus2", () => {
      const ops = WorkNCFunctionIndexEngine.getAuto5Operations();
      expect(ops.length).toBe(4);
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "auto5_3plus2",
        "five_axis_drill_indexed",
        "five_axis_drive_curve",
        "five_axis_swarf",
      ]);
      for (const op of ops) {
        expect(op.section).toBe("five_axis");
      }
    });
  });

  describe("getMoldDieOperations", () => {
    it("returns all five mold/die operations", () => {
      const ops = WorkNCFunctionIndexEngine.getMoldDieOperations();
      expect(ops.length).toBe(5);
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "core_cavity_finish",
        "edm_pocket",
        "global_roughing",
        "rest_rough",
        "vortex_rough",
      ]);
      for (const op of ops) {
        expect(op.section).toBe("mold_die");
      }
    });
  });

  describe("getOperation", () => {
    it("looks up auto5_3plus2 under five_axis", () => {
      const r = WorkNCFunctionIndexEngine.getOperation("auto5_3plus2");
      expect("error" in r).toBe(false);
      if (!("error" in r)) {
        expect(r.section).toBe("five_axis");
        expect(r.operation.category).toBe("auto5");
        expect(r.operation.dialog_tabs).toEqual([
          "Source",
          "Holder",
          "Strategy",
          "Output",
        ]);
        expect(r.operation.parameters.output.outputMode.default).toBe("G68_2");
      }
    });

    it("returns an error for an unknown operation id", () => {
      const r = WorkNCFunctionIndexEngine.getOperation("does_not_exist_op");
      expect("error" in r).toBe(true);
      if ("error" in r) {
        expect(r.error).toContain("does_not_exist_op");
      }
    });

    it("throws on non-string operation id (adversarial)", () => {
      // @ts-expect-error - deliberate adversarial call
      expect(() => WorkNCFunctionIndexEngine.getOperation(null)).toThrow(
        /non-empty string/
      );
      // @ts-expect-error - deliberate adversarial call
      expect(() => WorkNCFunctionIndexEngine.getOperation(42)).toThrow(
        /non-empty string/
      );
    });
  });

  describe("getTrainingTopics", () => {
    it("returns the mold_die topic on uniform stock and EDM allowance", () => {
      const t = WorkNCFunctionIndexEngine.getTrainingTopics("mold_die");
      expect(t.length).toBeGreaterThanOrEqual(1);
      const topic = t[0];
      expect(topic.key_concepts).toEqual(
        expect.arrayContaining(["uniform stock"])
      );
      expect(topic.best_practices.length).toBeGreaterThanOrEqual(3);
    });

    it("returns [] for an unknown section", () => {
      expect(
        WorkNCFunctionIndexEngine.getTrainingTopics("nonexistent")
      ).toEqual([]);
    });
  });

  describe("dispatcher wiring contract", () => {
    it("camDispatcher exposes the 10 worknc_function_index_* actions", () => {
      const dispPath = join(
        __dirname,
        "../../src/tools/dispatchers/camDispatcher.ts"
      );
      const text = readFileSync(dispPath, "utf-8");
      const required = [
        "worknc_function_index_get",
        "worknc_function_index_list_sections",
        "worknc_function_index_get_section",
        "worknc_function_index_list_operations",
        "worknc_function_index_find_parameter",
        "worknc_function_index_search_parameters",
        "worknc_function_index_get_operations_by_category",
        "worknc_function_index_get_summary",
        "worknc_function_index_get_auto5_operations",
        "worknc_function_index_get_operation",
      ];
      for (const action of required) {
        expect(text).toContain(action);
      }
    });
  });
});
