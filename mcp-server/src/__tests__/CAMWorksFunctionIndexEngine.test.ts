/**
 * CAMWorksFunctionIndexEngine tests — CAM-EXHAUST-MS0/U-CAM-FIDX-14
 *
 * Real-data tests against the four CAMWorks catalog files
 * (afr, milling, turning, techdb).
 */

import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect, beforeEach } from "vitest";
import { CAMWorksFunctionIndexEngine } from "../engines/CAMWorksFunctionIndexEngine.js";

describe("CAMWorksFunctionIndexEngine", () => {
  beforeEach(() => {
    CAMWorksFunctionIndexEngine.resetCache();
  });

  describe("getIndex", () => {
    it("returns a valid function index with system_id 'camworks'", () => {
      const index = CAMWorksFunctionIndexEngine.getIndex();
      expect(index.system_id).toBe("camworks");
      expect(typeof index.sections).toBe("object");
      expect(typeof index.total_operations).toBe("number");
      expect(typeof index.total_parameters).toBe("number");
      expect(Array.isArray(index.categories)).toBe(true);
    });

    it("loads all four shipped sections", () => {
      const index = CAMWorksFunctionIndexEngine.getIndex();
      const keys = Object.keys(index.sections).sort();
      expect(keys).toEqual(["afr", "milling", "techdb", "turning"]);
    });

    it("totals match summary blocks (≥ 17 operations, ≥ 240 params)", () => {
      // afr 4 + milling 5 + turning 4 + techdb 4 = 17
      const index = CAMWorksFunctionIndexEngine.getIndex();
      expect(index.total_operations).toBeGreaterThanOrEqual(17);
      expect(index.total_parameters).toBeGreaterThanOrEqual(240);
    });

    it("aggregates CAMWorks-distinctive categories", () => {
      const index = CAMWorksFunctionIndexEngine.getIndex();
      expect(index.categories).toEqual(
        expect.arrayContaining([
          "afr",
          "techdb",
          "rules",
          "tool_selection",
        ])
      );
    });

    it("caches the index so two calls return the same reference", () => {
      const a = CAMWorksFunctionIndexEngine.getIndex();
      const b = CAMWorksFunctionIndexEngine.getIndex();
      expect(a).toBe(b);
    });

    it("resetCache forces a re-load (different reference, same shape)", () => {
      const a = CAMWorksFunctionIndexEngine.getIndex();
      CAMWorksFunctionIndexEngine.resetCache();
      const b = CAMWorksFunctionIndexEngine.getIndex();
      expect(a).not.toBe(b);
      expect(b.system_id).toBe(a.system_id);
      expect(b.total_operations).toBe(a.total_operations);
      expect(b.total_parameters).toBe(a.total_parameters);
    });
  });

  describe("listSections / getSection", () => {
    it("listSections returns the four shipped section keys", () => {
      const sections = CAMWorksFunctionIndexEngine.listSections();
      expect(sections.sort()).toEqual(["afr", "milling", "techdb", "turning"]);
    });

    it("getSection returns the afr section with afr_extract present", () => {
      const section = CAMWorksFunctionIndexEngine.getSection("afr");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        expect(section.system_id).toBe("camworks");
        expect(section.section_key).toBe("afr");
        const opIds = Object.keys(section.operations);
        expect(opIds.length).toBeGreaterThanOrEqual(4);
        expect(opIds).toEqual(
          expect.arrayContaining([
            "afr_extract",
            "interactive_feature",
            "feature_classify",
            "feature_groups",
          ])
        );
      }
    });

    it("AFR Extract has expected detection toggles", () => {
      const section = CAMWorksFunctionIndexEngine.getSection("afr");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        const op = section.operations.afr_extract;
        expect(op.category).toBe("afr");
        expect(op.parameters.detection.detectMillFeatures.default).toBe(true);
        expect(op.parameters.detection.detectHoles.default).toBe(true);
        expect(op.parameters.detection.detectThreads.default).toBe(true);
        expect(op.parameters.output.applyTechDB.default).toBe(true);
      }
    });

    it("TechDB Rule Create has match keys for feature/material/tolerance", () => {
      const section = CAMWorksFunctionIndexEngine.getSection("techdb");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        const op = section.operations.techdb_rule_create;
        expect(op.category).toBe("rules");
        expect(op.parameters.match.featureClass.required).toBe(true);
        expect(op.parameters.match.material.required).toBe(true);
        expect(op.parameters.match.toleranceClass.values).toEqual([
          "it6",
          "it7",
          "it8",
          "it9",
          "it10",
          "general",
        ]);
        expect(op.parameters.action.tool.required).toBe(true);
        expect(op.parameters.action.strategy.required).toBe(true);
      }
    });

    it("getSection returns an error object for an unknown key", () => {
      const section = CAMWorksFunctionIndexEngine.getSection("does_not_exist");
      expect("error" in section).toBe(true);
      if ("error" in section) {
        expect(section.error).toContain("does_not_exist");
        expect(section.available).toEqual(
          expect.arrayContaining(["afr", "milling", "turning", "techdb"])
        );
      }
    });
  });

  describe("listOperations", () => {
    it("returns at least 17 operations across sections", () => {
      const ops = CAMWorksFunctionIndexEngine.listOperations();
      expect(ops.length).toBeGreaterThanOrEqual(17);
    });

    it("every returned op has the four required fields populated", () => {
      const ops = CAMWorksFunctionIndexEngine.listOperations();
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

    it("vomill_rough is in milling/high_efficiency", () => {
      const ops = CAMWorksFunctionIndexEngine.listOperations();
      const v = ops.find((o) => o.operation_id === "vomill_rough");
      expect(v?.section).toBe("milling");
      expect(v?.category).toBe("high_efficiency");
    });

    it("techdb_rule_query is in techdb/rules", () => {
      const ops = CAMWorksFunctionIndexEngine.listOperations();
      const t = ops.find((o) => o.operation_id === "techdb_rule_query");
      expect(t?.section).toBe("techdb");
      expect(t?.category).toBe("rules");
    });
  });

  describe("findParameter", () => {
    it("locates 'tea' inside vomill_rough", () => {
      const results = CAMWorksFunctionIndexEngine.findParameter("tea");
      const t = results.find((r) => r.operation_id === "vomill_rough");
      expect(t?.section).toBe("milling");
      expect(t?.parameter.required).toBe(true);
      expect(t?.parameter.unit).toBe("deg");
    });

    it("locates 'featureClass' across multiple TechDB ops", () => {
      const results =
        CAMWorksFunctionIndexEngine.findParameter("featureClass");
      expect(results.length).toBeGreaterThanOrEqual(2);
      const ops = new Set(results.map((r) => r.operation_id));
      expect(ops.has("techdb_rule_create")).toBe(true);
      expect(ops.has("techdb_rule_query")).toBe(true);
    });

    it("locates 'applyTechDB' inside afr_extract and interactive_feature", () => {
      const results = CAMWorksFunctionIndexEngine.findParameter("applyTechDB");
      expect(results.length).toBeGreaterThanOrEqual(2);
      const ops = new Set(results.map((r) => r.operation_id));
      expect(ops.has("afr_extract")).toBe(true);
      expect(ops.has("interactive_feature")).toBe(true);
    });

    it("returns an empty array for a needle that never matches", () => {
      const results = CAMWorksFunctionIndexEngine.findParameter(
        "xyz_no_such_parameter_999"
      );
      expect(results).toEqual([]);
    });

    it("throws on empty / non-string parameterName (failure mode)", () => {
      expect(() => CAMWorksFunctionIndexEngine.findParameter("")).toThrow(
        /non-empty string/
      );
      // @ts-expect-error - deliberate adversarial call
      expect(() => CAMWorksFunctionIndexEngine.findParameter(null)).toThrow(
        /non-empty string/
      );
      // @ts-expect-error - deliberate adversarial call
      expect(() =>
        CAMWorksFunctionIndexEngine.findParameter(undefined)
      ).toThrow(/non-empty string/);
    });
  });

  describe("searchParameters", () => {
    it("matches by description (cosmetic threads on AFR)", () => {
      // 'cosmetic' appears in AFR detectThreads description
      const results = CAMWorksFunctionIndexEngine.searchParameters(
        "cosmetic",
        50
      );
      expect(results.length).toBeGreaterThanOrEqual(1);
      const hit = results.find((r) => r.operation_id === "afr_extract");
      expect(hit?.section).toBe("afr");
    });

    it("respects the limit cap", () => {
      const results = CAMWorksFunctionIndexEngine.searchParameters("type", 5);
      expect(results.length).toBe(5);
    });

    it("clamps non-positive limits to a safe default of 1", () => {
      const r = CAMWorksFunctionIndexEngine.searchParameters("type", -10);
      expect(r.length).toBe(1);
    });

    it("clamps oversized limits to 500 (DoS guard)", () => {
      const r = CAMWorksFunctionIndexEngine.searchParameters("a", 100000);
      expect(r.length).toBeLessThanOrEqual(500);
    });

    it("throws on empty query (failure mode)", () => {
      expect(() => CAMWorksFunctionIndexEngine.searchParameters("")).toThrow(
        /non-empty string/
      );
    });
  });

  describe("getOperationsByCategory", () => {
    it("returns AFR operations under 'afr' category", () => {
      const ops = CAMWorksFunctionIndexEngine.getOperationsByCategory("afr");
      expect(ops.length).toBeGreaterThanOrEqual(1);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toEqual(expect.arrayContaining(["afr_extract"]));
    });

    it("returns rules operations", () => {
      const ops = CAMWorksFunctionIndexEngine.getOperationsByCategory("rules");
      expect(ops.length).toBeGreaterThanOrEqual(2);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toEqual(
        expect.arrayContaining(["techdb_rule_create", "techdb_rule_query"])
      );
    });

    it("returns drilling operations", () => {
      const ops =
        CAMWorksFunctionIndexEngine.getOperationsByCategory("drilling");
      expect(ops.length).toBeGreaterThanOrEqual(1);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toEqual(expect.arrayContaining(["drill_cycle"]));
    });

    it("returns [] for an unknown category", () => {
      const ops = CAMWorksFunctionIndexEngine.getOperationsByCategory(
        "nonexistent_category_xyz"
      );
      expect(ops).toEqual([]);
    });

    it("throws on empty category (failure mode)", () => {
      expect(() =>
        CAMWorksFunctionIndexEngine.getOperationsByCategory("")
      ).toThrow(/non-empty string/);
    });
  });

  describe("getSummary", () => {
    it("aggregates counts that match the index", () => {
      const idx = CAMWorksFunctionIndexEngine.getIndex();
      const sum = CAMWorksFunctionIndexEngine.getSummary();
      expect(sum.system_id).toBe("camworks");
      expect(sum.total_sections).toBe(Object.keys(idx.sections).length);
      expect(sum.total_operations).toBe(idx.total_operations);
      expect(sum.total_parameters).toBe(idx.total_parameters);
      const sumOps = sum.sections.reduce((a, s) => a + s.operations, 0);
      expect(sumOps).toBe(sum.total_operations);
    });
  });

  describe("getAFROperations", () => {
    it("returns all four AFR operations", () => {
      const ops = CAMWorksFunctionIndexEngine.getAFROperations();
      expect(ops.length).toBe(4);
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "afr_extract",
        "feature_classify",
        "feature_groups",
        "interactive_feature",
      ]);
      for (const op of ops) {
        expect(op.section).toBe("afr");
      }
    });
  });

  describe("getTechDBOperations", () => {
    it("returns all four TechDB operations", () => {
      const ops = CAMWorksFunctionIndexEngine.getTechDBOperations();
      expect(ops.length).toBe(4);
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "post_management",
        "techdb_rule_create",
        "techdb_rule_query",
        "tool_selection",
      ]);
      for (const op of ops) {
        expect(op.section).toBe("techdb");
      }
    });
  });

  describe("getOperation", () => {
    it("looks up tool_selection under techdb", () => {
      const r = CAMWorksFunctionIndexEngine.getOperation("tool_selection");
      expect("error" in r).toBe(false);
      if (!("error" in r)) {
        expect(r.section).toBe("techdb");
        expect(r.operation.category).toBe("tool_selection");
        expect(r.operation.dialog_tabs).toEqual([
          "Feature",
          "Crib",
          "Constraints",
          "Output",
        ]);
        expect(r.operation.parameters.constraints.checkSpindleTorque.default).toBe(true);
        expect(r.operation.parameters.constraints.checkDeflection.default).toBe(true);
      }
    });

    it("returns an error for an unknown operation id", () => {
      const r = CAMWorksFunctionIndexEngine.getOperation("does_not_exist_op");
      expect("error" in r).toBe(true);
      if ("error" in r) {
        expect(r.error).toContain("does_not_exist_op");
      }
    });

    it("throws on non-string operation id (adversarial)", () => {
      // @ts-expect-error - deliberate adversarial call
      expect(() => CAMWorksFunctionIndexEngine.getOperation(null)).toThrow(
        /non-empty string/
      );
      // @ts-expect-error - deliberate adversarial call
      expect(() => CAMWorksFunctionIndexEngine.getOperation(42)).toThrow(
        /non-empty string/
      );
    });
  });

  describe("getTrainingTopics", () => {
    it("returns the afr training topic on AFR + TechDB workflow", () => {
      const t = CAMWorksFunctionIndexEngine.getTrainingTopics("afr");
      expect(t.length).toBeGreaterThanOrEqual(1);
      const topic = t[0];
      expect(topic.key_concepts).toEqual(
        expect.arrayContaining(["automatic feature recognition"])
      );
      expect(topic.best_practices.length).toBeGreaterThanOrEqual(3);
    });

    it("returns [] for an unknown section", () => {
      expect(
        CAMWorksFunctionIndexEngine.getTrainingTopics("nonexistent")
      ).toEqual([]);
    });
  });

  describe("dispatcher wiring contract", () => {
    it("camDispatcher exposes the 10 camworks_function_index_* actions", () => {
      const dispPath = join(
        __dirname,
        "../../src/tools/dispatchers/camDispatcher.ts"
      );
      const text = readFileSync(dispPath, "utf-8");
      const required = [
        "camworks_function_index_get",
        "camworks_function_index_list_sections",
        "camworks_function_index_get_section",
        "camworks_function_index_list_operations",
        "camworks_function_index_find_parameter",
        "camworks_function_index_search_parameters",
        "camworks_function_index_get_operations_by_category",
        "camworks_function_index_get_summary",
        "camworks_function_index_get_afr_operations",
        "camworks_function_index_get_operation",
      ];
      for (const action of required) {
        expect(text).toContain(action);
      }
    });
  });
});
