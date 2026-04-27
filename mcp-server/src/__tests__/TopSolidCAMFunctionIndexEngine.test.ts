/**
 * TopSolidCAMFunctionIndexEngine tests — CAM-EXHAUST-MS0/U-CAM-FIDX-13
 *
 * Real-data tests against the four TopSolid'Cam catalog files
 * (milling, turning, mill_turn, pmi).
 */

import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect, beforeEach } from "vitest";
import { TopSolidCAMFunctionIndexEngine } from "../engines/TopSolidCAMFunctionIndexEngine.js";

describe("TopSolidCAMFunctionIndexEngine", () => {
  beforeEach(() => {
    TopSolidCAMFunctionIndexEngine.resetCache();
  });

  describe("getIndex", () => {
    it("returns a valid function index with system_id 'topsolid'", () => {
      const index = TopSolidCAMFunctionIndexEngine.getIndex();
      expect(index.system_id).toBe("topsolid");
      expect(typeof index.sections).toBe("object");
      expect(typeof index.total_operations).toBe("number");
      expect(typeof index.total_parameters).toBe("number");
      expect(Array.isArray(index.categories)).toBe(true);
    });

    it("loads all four shipped sections", () => {
      const index = TopSolidCAMFunctionIndexEngine.getIndex();
      const keys = Object.keys(index.sections).sort();
      expect(keys).toEqual(["mill_turn", "milling", "pmi", "turning"]);
    });

    it("totals match summary blocks (≥ 18 operations, ≥ 250 params)", () => {
      // milling 5 + turning 5 + mill_turn 4 + pmi 4 = 18
      const index = TopSolidCAMFunctionIndexEngine.getIndex();
      expect(index.total_operations).toBeGreaterThanOrEqual(18);
      expect(index.total_parameters).toBeGreaterThanOrEqual(250);
    });

    it("aggregates TopSolid-distinctive categories", () => {
      const index = TopSolidCAMFunctionIndexEngine.getIndex();
      expect(index.categories).toEqual(
        expect.arrayContaining([
          "associative",
          "pmi",
          "in_process_probe",
          "automated_planning",
        ])
      );
    });

    it("caches the index so two calls return the same reference", () => {
      const a = TopSolidCAMFunctionIndexEngine.getIndex();
      const b = TopSolidCAMFunctionIndexEngine.getIndex();
      expect(a).toBe(b);
    });

    it("resetCache forces a re-load (different reference, same shape)", () => {
      const a = TopSolidCAMFunctionIndexEngine.getIndex();
      TopSolidCAMFunctionIndexEngine.resetCache();
      const b = TopSolidCAMFunctionIndexEngine.getIndex();
      expect(a).not.toBe(b);
      expect(b.system_id).toBe(a.system_id);
      expect(b.total_operations).toBe(a.total_operations);
      expect(b.total_parameters).toBe(a.total_parameters);
    });
  });

  describe("listSections / getSection", () => {
    it("listSections returns the four shipped section keys", () => {
      const sections = TopSolidCAMFunctionIndexEngine.listSections();
      expect(sections.sort()).toEqual([
        "mill_turn",
        "milling",
        "pmi",
        "turning",
      ]);
    });

    it("getSection returns the milling section with associative_feature_mill present", () => {
      const section = TopSolidCAMFunctionIndexEngine.getSection("milling");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        expect(section.system_id).toBe("topsolid");
        expect(section.section_key).toBe("milling");
        const opIds = Object.keys(section.operations);
        expect(opIds.length).toBeGreaterThanOrEqual(5);
        expect(opIds).toEqual(
          expect.arrayContaining([
            "trochoidal_rough",
            "pocket",
            "contour",
            "surface_finish",
            "associative_feature_mill",
          ])
        );
      }
    });

    it("Auto Process Planner has expected machine families", () => {
      const section = TopSolidCAMFunctionIndexEngine.getSection("pmi");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        const op = section.operations.auto_process_plan;
        expect(op.category).toBe("automated_planning");
        expect(op.parameters.constraints.machineFamily.values).toEqual([
          "3axis",
          "3plus2",
          "5axis",
          "millturn",
          "lathe",
          "swiss",
        ]);
        expect(op.parameters.constraints.machineFamily.required).toBe(true);
      }
    });

    it("PMI Extract has QIF as a supported export format", () => {
      const section = TopSolidCAMFunctionIndexEngine.getSection("pmi");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        const op = section.operations.pmi_extract;
        expect(op.category).toBe("pmi");
        expect(op.parameters.output.exportFormat.values).toEqual(
          expect.arrayContaining(["qif", "step_242"])
        );
        expect(op.parameters.output.exportFormat.default).toBe("qif");
      }
    });

    it("getSection returns an error object for an unknown key", () => {
      const section = TopSolidCAMFunctionIndexEngine.getSection("does_not_exist");
      expect("error" in section).toBe(true);
      if ("error" in section) {
        expect(section.error).toContain("does_not_exist");
        expect(section.available).toEqual(
          expect.arrayContaining(["milling", "turning", "mill_turn", "pmi"])
        );
      }
    });
  });

  describe("listOperations", () => {
    it("returns at least 18 operations across sections", () => {
      const ops = TopSolidCAMFunctionIndexEngine.listOperations();
      expect(ops.length).toBeGreaterThanOrEqual(18);
    });

    it("every returned op has the four required fields populated", () => {
      const ops = TopSolidCAMFunctionIndexEngine.listOperations();
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

    it("associative_feature_mill is in milling/associative", () => {
      const ops = TopSolidCAMFunctionIndexEngine.listOperations();
      const a = ops.find((o) => o.operation_id === "associative_feature_mill");
      expect(a?.section).toBe("milling");
      expect(a?.category).toBe("associative");
    });

    it("auto_process_plan is in pmi/automated_planning", () => {
      const ops = TopSolidCAMFunctionIndexEngine.listOperations();
      const a = ops.find((o) => o.operation_id === "auto_process_plan");
      expect(a?.section).toBe("pmi");
      expect(a?.category).toBe("automated_planning");
    });
  });

  describe("findParameter", () => {
    it("locates 'tea' inside trochoidal_rough", () => {
      const results = TopSolidCAMFunctionIndexEngine.findParameter("tea");
      const t = results.find((r) => r.operation_id === "trochoidal_rough");
      expect(t?.section).toBe("milling");
      expect(t?.parameter.required).toBe(true);
      expect(t?.parameter.unit).toBe("deg");
    });

    it("locates 'pmiSource' across multiple PMI ops", () => {
      const results = TopSolidCAMFunctionIndexEngine.findParameter("pmiSource");
      expect(results.length).toBeGreaterThanOrEqual(2);
      const ops = new Set(results.map((r) => r.operation_id));
      expect(ops.has("inspection_planner")).toBe(true);
      expect(ops.has("auto_process_plan")).toBe(true);
    });

    it("locates 'associativityMode' inside associative_feature_mill only", () => {
      const results =
        TopSolidCAMFunctionIndexEngine.findParameter("associativityMode");
      expect(results.length).toBe(1);
      expect(results[0].operation_id).toBe("associative_feature_mill");
      expect(results[0].parameter.values).toEqual([
        "bidirectional",
        "cad_to_cam_only",
        "frozen",
      ]);
    });

    it("returns an empty array for a needle that never matches", () => {
      const results = TopSolidCAMFunctionIndexEngine.findParameter(
        "xyz_no_such_parameter_999"
      );
      expect(results).toEqual([]);
    });

    it("throws on empty / non-string parameterName (failure mode)", () => {
      expect(() => TopSolidCAMFunctionIndexEngine.findParameter("")).toThrow(
        /non-empty string/
      );
      // @ts-expect-error - deliberate adversarial call
      expect(() => TopSolidCAMFunctionIndexEngine.findParameter(null)).toThrow(
        /non-empty string/
      );
      // @ts-expect-error - deliberate adversarial call
      expect(() =>
        TopSolidCAMFunctionIndexEngine.findParameter(undefined)
      ).toThrow(/non-empty string/);
    });
  });

  describe("searchParameters", () => {
    it("matches by description (ANSI standard for inspection)", () => {
      // 'ANSI' is in pmi_extract output exportFormat description
      const results = TopSolidCAMFunctionIndexEngine.searchParameters(
        "ANSI",
        50
      );
      expect(results.length).toBeGreaterThanOrEqual(1);
      const hit = results.find((r) => r.operation_id === "pmi_extract");
      expect(hit?.section).toBe("pmi");
    });

    it("respects the limit cap", () => {
      const results = TopSolidCAMFunctionIndexEngine.searchParameters("type", 5);
      expect(results.length).toBe(5);
    });

    it("clamps non-positive limits to a safe default of 1", () => {
      const r = TopSolidCAMFunctionIndexEngine.searchParameters("type", -10);
      expect(r.length).toBe(1);
    });

    it("clamps oversized limits to 500 (DoS guard)", () => {
      const r = TopSolidCAMFunctionIndexEngine.searchParameters("a", 100000);
      expect(r.length).toBeLessThanOrEqual(500);
    });

    it("throws on empty query (failure mode)", () => {
      expect(() => TopSolidCAMFunctionIndexEngine.searchParameters("")).toThrow(
        /non-empty string/
      );
    });
  });

  describe("getOperationsByCategory", () => {
    it("returns all PMI operations under 'pmi' category match", () => {
      const ops = TopSolidCAMFunctionIndexEngine.getOperationsByCategory("pmi");
      expect(ops.length).toBeGreaterThanOrEqual(1);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toEqual(expect.arrayContaining(["pmi_extract"]));
    });

    it("returns finishing operations across milling and turning", () => {
      const ops =
        TopSolidCAMFunctionIndexEngine.getOperationsByCategory("finishing");
      expect(ops.length).toBeGreaterThanOrEqual(3);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toEqual(
        expect.arrayContaining(["contour", "surface_finish", "finish_turn"])
      );
    });

    it("returns [] for an unknown category", () => {
      const ops = TopSolidCAMFunctionIndexEngine.getOperationsByCategory(
        "nonexistent_category_xyz"
      );
      expect(ops).toEqual([]);
    });

    it("throws on empty category (failure mode)", () => {
      expect(() =>
        TopSolidCAMFunctionIndexEngine.getOperationsByCategory("")
      ).toThrow(/non-empty string/);
    });
  });

  describe("getSummary", () => {
    it("aggregates counts that match the index", () => {
      const idx = TopSolidCAMFunctionIndexEngine.getIndex();
      const sum = TopSolidCAMFunctionIndexEngine.getSummary();
      expect(sum.system_id).toBe("topsolid");
      expect(sum.total_sections).toBe(Object.keys(idx.sections).length);
      expect(sum.total_operations).toBe(idx.total_operations);
      expect(sum.total_parameters).toBe(idx.total_parameters);
      const sumOps = sum.sections.reduce((a, s) => a + s.operations, 0);
      expect(sumOps).toBe(sum.total_operations);
    });
  });

  describe("getPMIOperations", () => {
    it("returns all four PMI operations", () => {
      const ops = TopSolidCAMFunctionIndexEngine.getPMIOperations();
      expect(ops.length).toBe(4);
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "auto_process_plan",
        "in_process_probe",
        "inspection_planner",
        "pmi_extract",
      ]);
      for (const op of ops) {
        expect(op.section).toBe("pmi");
      }
    });
  });

  describe("getAssociativeOperations", () => {
    it("returns associative_feature_mill and auto_process_plan", () => {
      const ops = TopSolidCAMFunctionIndexEngine.getAssociativeOperations();
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toEqual(
        expect.arrayContaining([
          "associative_feature_mill",
          "auto_process_plan",
        ])
      );
    });
  });

  describe("getOperation", () => {
    it("looks up auto_process_plan under pmi", () => {
      const r = TopSolidCAMFunctionIndexEngine.getOperation("auto_process_plan");
      expect("error" in r).toBe(false);
      if (!("error" in r)) {
        expect(r.section).toBe("pmi");
        expect(r.operation.category).toBe("automated_planning");
        expect(r.operation.dialog_tabs).toEqual([
          "Source",
          "Constraints",
          "Output",
        ]);
        expect(r.operation.parameters.output.explainPlan.default).toBe(true);
      }
    });

    it("returns an error for an unknown operation id", () => {
      const r = TopSolidCAMFunctionIndexEngine.getOperation("does_not_exist_op");
      expect("error" in r).toBe(true);
      if ("error" in r) {
        expect(r.error).toContain("does_not_exist_op");
      }
    });

    it("throws on non-string operation id (adversarial)", () => {
      // @ts-expect-error - deliberate adversarial call
      expect(() => TopSolidCAMFunctionIndexEngine.getOperation(null)).toThrow(
        /non-empty string/
      );
      // @ts-expect-error - deliberate adversarial call
      expect(() => TopSolidCAMFunctionIndexEngine.getOperation(42)).toThrow(
        /non-empty string/
      );
    });
  });

  describe("getTrainingTopics", () => {
    it("returns the pmi training topic on PMI-driven manufacturing", () => {
      const t = TopSolidCAMFunctionIndexEngine.getTrainingTopics("pmi");
      expect(t.length).toBeGreaterThanOrEqual(1);
      const topic = t[0];
      expect(topic.key_concepts).toEqual(
        expect.arrayContaining(["GD&T extraction"])
      );
      expect(topic.best_practices.length).toBeGreaterThanOrEqual(3);
    });

    it("returns [] for an unknown section", () => {
      expect(
        TopSolidCAMFunctionIndexEngine.getTrainingTopics("nonexistent")
      ).toEqual([]);
    });
  });

  describe("dispatcher wiring contract", () => {
    it("camDispatcher exposes the 10 topsolid_function_index_* actions", () => {
      const dispPath = join(
        __dirname,
        "../../src/tools/dispatchers/camDispatcher.ts"
      );
      const text = readFileSync(dispPath, "utf-8");
      const required = [
        "topsolid_function_index_get",
        "topsolid_function_index_list_sections",
        "topsolid_function_index_get_section",
        "topsolid_function_index_list_operations",
        "topsolid_function_index_find_parameter",
        "topsolid_function_index_search_parameters",
        "topsolid_function_index_get_operations_by_category",
        "topsolid_function_index_get_summary",
        "topsolid_function_index_get_pmi_operations",
        "topsolid_function_index_get_operation",
      ];
      for (const action of required) {
        expect(text).toContain(action);
      }
    });
  });
});
