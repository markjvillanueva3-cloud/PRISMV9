/**
 * EspritFunctionIndexEngine tests — CAM-EXHAUST-MS0/U-CAM-FIDX-10
 *
 * Real-data tests against the four ESPRIT catalog files
 * (milling, turning, mill_turn, swiss). Catalogs ship in
 * mcp-server/data/cam-functions/esprit/.
 *
 * Coverage:
 *   - structural assertions on the loaded index
 *   - known-section / known-operation contract checks
 *   - parameter search (positive + adversarial)
 *   - failure modes (missing section, empty/non-string args)
 *   - cache stability + reset
 *   - dispatcher-wiring assertion
 */

import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect, beforeEach } from "vitest";
import { EspritFunctionIndexEngine } from "../engines/EspritFunctionIndexEngine.js";

describe("EspritFunctionIndexEngine", () => {
  beforeEach(() => {
    EspritFunctionIndexEngine.resetCache();
  });

  describe("getIndex", () => {
    it("returns a valid function index with system_id 'esprit'", () => {
      const index = EspritFunctionIndexEngine.getIndex();
      expect(index.system_id).toBe("esprit");
      expect(typeof index.sections).toBe("object");
      expect(typeof index.total_operations).toBe("number");
      expect(typeof index.total_parameters).toBe("number");
      expect(Array.isArray(index.categories)).toBe(true);
    });

    it("loads all four shipped sections", () => {
      const index = EspritFunctionIndexEngine.getIndex();
      const keys = Object.keys(index.sections).sort();
      expect(keys).toEqual(["mill_turn", "milling", "swiss", "turning"]);
    });

    it("totals match summary blocks (≥ 18 operations, ≥ 200 params)", () => {
      // milling 5 + turning 5 + mill_turn 4 + swiss 4 = 18
      const index = EspritFunctionIndexEngine.getIndex();
      expect(index.total_operations).toBeGreaterThanOrEqual(18);
      expect(index.total_parameters).toBeGreaterThanOrEqual(200);
    });

    it("aggregates ESPRIT-distinctive categories", () => {
      const index = EspritFunctionIndexEngine.getIndex();
      // milling: roughing/finishing/high_efficiency/profiling
      // turning: roughing/finishing/grooving/threading/parting
      // mill_turn: mill_turn/live_tooling/sub_spindle/synchronized
      // swiss: swiss/guide_bushing/back_working/thread_whirling
      expect(index.categories).toEqual(
        expect.arrayContaining([
          "high_efficiency",
          "live_tooling",
          "swiss",
          "thread_whirling",
        ])
      );
    });

    it("caches the index so two calls return the same reference", () => {
      const a = EspritFunctionIndexEngine.getIndex();
      const b = EspritFunctionIndexEngine.getIndex();
      expect(a).toBe(b);
    });

    it("resetCache forces a re-load (different reference, same shape)", () => {
      const a = EspritFunctionIndexEngine.getIndex();
      EspritFunctionIndexEngine.resetCache();
      const b = EspritFunctionIndexEngine.getIndex();
      expect(a).not.toBe(b);
      expect(b.system_id).toBe(a.system_id);
      expect(b.total_operations).toBe(a.total_operations);
      expect(b.total_parameters).toBe(a.total_parameters);
    });
  });

  describe("listSections / getSection", () => {
    it("listSections returns the four shipped section keys", () => {
      const sections = EspritFunctionIndexEngine.listSections();
      expect(sections.sort()).toEqual([
        "mill_turn",
        "milling",
        "swiss",
        "turning",
      ]);
    });

    it("getSection returns the milling section with expected operations", () => {
      const section = EspritFunctionIndexEngine.getSection("milling");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        expect(section.system_id).toBe("esprit");
        expect(section.section_key).toBe("milling");
        const opIds = Object.keys(section.operations);
        expect(opIds.length).toBeGreaterThanOrEqual(5);
        expect(opIds).toEqual(
          expect.arrayContaining([
            "profitmilling_rough",
            "pocket_rough",
            "contour_finish",
            "z_level_finish",
          ])
        );
      }
    });

    it("ProfitMilling has expected category, tabs, params", () => {
      const section = EspritFunctionIndexEngine.getSection("milling");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        const op = section.operations.profitmilling_rough;
        expect(op.category).toBe("high_efficiency");
        expect(op.dialog_tabs).toEqual([
          "Tool",
          "Boundary",
          "Levels",
          "Engagement",
          "Smoothing",
          "Linking",
        ]);
        expect(op.parameters.engagement.tea.unit).toBe("deg");
        expect(op.parameters.engagement.tea.required).toBe(true);
        expect(op.parameters.engagement.tea.range).toEqual([5, 90]);
      }
    });

    it("Polygon turning sync ratio is a string for non-numeric ratios", () => {
      const section = EspritFunctionIndexEngine.getSection("swiss");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        const op = section.operations.polygon_turning;
        expect(op.category).toBe("swiss");
        expect(op.parameters.sync.ratio.type).toBe("string");
        expect(op.parameters.sync.ratio.required).toBe(true);
      }
    });

    it("getSection returns an error object for an unknown key", () => {
      const section = EspritFunctionIndexEngine.getSection("does_not_exist");
      expect("error" in section).toBe(true);
      if ("error" in section) {
        expect(section.error).toContain("does_not_exist");
        expect(section.available).toEqual(
          expect.arrayContaining(["milling", "turning", "mill_turn", "swiss"])
        );
      }
    });
  });

  describe("listOperations", () => {
    it("returns at least 18 operations across sections", () => {
      const ops = EspritFunctionIndexEngine.listOperations();
      expect(ops.length).toBeGreaterThanOrEqual(18);
    });

    it("every returned op has the four required fields populated", () => {
      const ops = EspritFunctionIndexEngine.listOperations();
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

    it("ProfitTurning is in turning/roughing", () => {
      const ops = EspritFunctionIndexEngine.listOperations();
      const profit = ops.find((o) => o.operation_id === "profitturning");
      expect(profit?.section).toBe("turning");
      expect(profit?.category).toBe("roughing");
      expect(profit?.display_name).toBe("ProfitTurning");
    });

    it("Thread whirling is in swiss/thread_whirling", () => {
      const ops = EspritFunctionIndexEngine.listOperations();
      const whirl = ops.find((o) => o.operation_id === "thread_whirling");
      expect(whirl?.section).toBe("swiss");
      expect(whirl?.category).toBe("thread_whirling");
    });
  });

  describe("findParameter", () => {
    it("locates 'tea' inside ProfitMilling only", () => {
      const results = EspritFunctionIndexEngine.findParameter("tea");
      expect(results.length).toBeGreaterThanOrEqual(1);
      const profit = results.find(
        (r) => r.operation_id === "profitmilling_rough"
      );
      expect(profit?.section).toBe("milling");
      expect(profit?.group).toBe("engagement");
      expect(profit?.parameter_name).toBe("tea");
      expect(profit?.parameter.unit).toBe("deg");
      expect(profit?.parameter.required).toBe(true);
    });

    it("locates 'whirlRPM' inside thread_whirling only", () => {
      const results = EspritFunctionIndexEngine.findParameter("whirlRPM");
      expect(results.length).toBe(1);
      expect(results[0].operation_id).toBe("thread_whirling");
      expect(results[0].section).toBe("swiss");
      expect(results[0].parameter.unit).toBe("rpm");
      expect(results[0].parameter.range).toEqual([1000, 12000]);
    });

    it("returns an empty array for a needle that never matches", () => {
      const results = EspritFunctionIndexEngine.findParameter(
        "xyz_no_such_parameter_999"
      );
      expect(results).toEqual([]);
    });

    it("throws on empty / non-string parameterName (failure mode)", () => {
      expect(() => EspritFunctionIndexEngine.findParameter("")).toThrow(
        /non-empty string/
      );
      // @ts-expect-error - deliberate adversarial call
      expect(() => EspritFunctionIndexEngine.findParameter(null)).toThrow(
        /non-empty string/
      );
      // @ts-expect-error - deliberate adversarial call
      expect(() => EspritFunctionIndexEngine.findParameter(undefined)).toThrow(
        /non-empty string/
      );
    });
  });

  describe("searchParameters", () => {
    it("matches by description as well as by name (Profit family)", () => {
      // 'constantChipVolume' param name on profitturning + description mentions 'chip load'
      const results = EspritFunctionIndexEngine.searchParameters(
        "constantChip",
        50
      );
      expect(results.length).toBeGreaterThanOrEqual(1);
      const hit = results.find((r) => r.operation_id === "profitturning");
      expect(hit?.section).toBe("turning");
      expect(hit?.parameter_name).toBe("constantChipVolume");
    });

    it("respects the limit cap", () => {
      const results = EspritFunctionIndexEngine.searchParameters("type", 5);
      expect(results.length).toBe(5);
    });

    it("clamps non-positive limits to a safe default of 1", () => {
      const r = EspritFunctionIndexEngine.searchParameters("type", -10);
      expect(r.length).toBe(1);
    });

    it("clamps oversized limits to 500 (DoS guard)", () => {
      const r = EspritFunctionIndexEngine.searchParameters("a", 100000);
      expect(r.length).toBeLessThanOrEqual(500);
    });

    it("throws on empty query (failure mode)", () => {
      expect(() => EspritFunctionIndexEngine.searchParameters("")).toThrow(
        /non-empty string/
      );
    });
  });

  describe("getOperationsByCategory", () => {
    it("returns at least two finishing operations", () => {
      const ops =
        EspritFunctionIndexEngine.getOperationsByCategory("finishing");
      expect(ops.length).toBeGreaterThanOrEqual(2);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toEqual(
        expect.arrayContaining(["contour_finish", "finish_turn"])
      );
    });

    it("returns live_tooling ops under that category", () => {
      const ops =
        EspritFunctionIndexEngine.getOperationsByCategory("live_tooling");
      expect(ops.length).toBeGreaterThanOrEqual(2);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toEqual(
        expect.arrayContaining([
          "live_tool_drill_cyl",
          "live_tool_mill_face",
        ])
      );
    });

    it("returns [] for an unknown category", () => {
      const ops = EspritFunctionIndexEngine.getOperationsByCategory(
        "nonexistent_category_xyz"
      );
      expect(ops).toEqual([]);
    });

    it("throws on empty category (failure mode)", () => {
      expect(() =>
        EspritFunctionIndexEngine.getOperationsByCategory("")
      ).toThrow(/non-empty string/);
    });
  });

  describe("getSummary", () => {
    it("aggregates counts that match the index", () => {
      const idx = EspritFunctionIndexEngine.getIndex();
      const sum = EspritFunctionIndexEngine.getSummary();
      expect(sum.system_id).toBe("esprit");
      expect(sum.total_sections).toBe(Object.keys(idx.sections).length);
      expect(sum.total_operations).toBe(idx.total_operations);
      expect(sum.total_parameters).toBe(idx.total_parameters);
      const sumOps = sum.sections.reduce((a, s) => a + s.operations, 0);
      expect(sumOps).toBe(sum.total_operations);
    });
  });

  describe("getProfitOperations", () => {
    it("returns both ProfitMilling and ProfitTurning", () => {
      const ops = EspritFunctionIndexEngine.getProfitOperations();
      expect(ops.length).toBeGreaterThanOrEqual(2);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toEqual(
        expect.arrayContaining(["profitmilling_rough", "profitturning"])
      );
    });
  });

  describe("getMillTurnOperations", () => {
    it("returns ops only from mill_turn and swiss sections", () => {
      const ops = EspritFunctionIndexEngine.getMillTurnOperations();
      expect(ops.length).toBeGreaterThanOrEqual(8);
      for (const op of ops) {
        expect(["mill_turn", "swiss"]).toContain(op.section);
      }
    });

    it("includes sub_spindle_handoff and thread_whirling", () => {
      const ops = EspritFunctionIndexEngine.getMillTurnOperations();
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toEqual(
        expect.arrayContaining(["sub_spindle_handoff", "thread_whirling"])
      );
    });
  });

  describe("getOperation", () => {
    it("looks up sub_spindle_handoff under mill_turn", () => {
      const r = EspritFunctionIndexEngine.getOperation("sub_spindle_handoff");
      expect("error" in r).toBe(false);
      if (!("error" in r)) {
        expect(r.section).toBe("mill_turn");
        expect(r.operation.category).toBe("sub_spindle");
        expect(r.operation.dialog_tabs).toEqual([
          "Sync",
          "Transfer",
          "Cut-Off",
          "Validation",
        ]);
        expect(r.operation.parameters.sync.syncMode.values).toEqual([
          "spindle_sync",
          "feed_sync",
          "position_sync",
        ]);
      }
    });

    it("returns an error for an unknown operation id", () => {
      const r = EspritFunctionIndexEngine.getOperation("does_not_exist_op");
      expect("error" in r).toBe(true);
      if ("error" in r) {
        expect(r.error).toContain("does_not_exist_op");
      }
    });

    it("throws on non-string operation id (adversarial)", () => {
      // @ts-expect-error - deliberate adversarial call
      expect(() => EspritFunctionIndexEngine.getOperation(null)).toThrow(
        /non-empty string/
      );
      // @ts-expect-error - deliberate adversarial call
      expect(() => EspritFunctionIndexEngine.getOperation(42)).toThrow(
        /non-empty string/
      );
    });
  });

  describe("getTrainingTopics", () => {
    it("returns the swiss training topic on Swiss vs conventional", () => {
      const t = EspritFunctionIndexEngine.getTrainingTopics("swiss");
      expect(t.length).toBeGreaterThanOrEqual(1);
      const swiss = t.find((x) => x.topic.includes("Swiss"));
      expect(swiss?.key_concepts).toEqual(
        expect.arrayContaining(["sliding headstock"])
      );
      expect(swiss?.best_practices.length).toBeGreaterThanOrEqual(3);
    });

    it("returns [] for an unknown section", () => {
      expect(
        EspritFunctionIndexEngine.getTrainingTopics("nonexistent")
      ).toEqual([]);
    });
  });

  describe("dispatcher wiring contract", () => {
    it("camDispatcher exposes the 10 esprit_function_index_* actions", () => {
      const dispPath = join(
        __dirname,
        "../../src/tools/dispatchers/camDispatcher.ts"
      );
      const text = readFileSync(dispPath, "utf-8");
      const required = [
        "esprit_function_index_get",
        "esprit_function_index_list_sections",
        "esprit_function_index_get_section",
        "esprit_function_index_list_operations",
        "esprit_function_index_find_parameter",
        "esprit_function_index_search_parameters",
        "esprit_function_index_get_operations_by_category",
        "esprit_function_index_get_summary",
        "esprit_function_index_get_profit_operations",
        "esprit_function_index_get_operation",
      ];
      for (const action of required) {
        expect(text).toContain(action);
      }
    });
  });
});
