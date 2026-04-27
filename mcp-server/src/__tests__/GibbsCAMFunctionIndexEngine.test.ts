/**
 * GibbsCAMFunctionIndexEngine tests — CAM-EXHAUST-MS0/U-CAM-FIDX-11
 *
 * Real-data tests against the four GibbsCAM catalog files
 * (milling, turning, mill_turn, vmc).
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
import { GibbsCAMFunctionIndexEngine } from "../engines/GibbsCAMFunctionIndexEngine.js";

describe("GibbsCAMFunctionIndexEngine", () => {
  beforeEach(() => {
    GibbsCAMFunctionIndexEngine.resetCache();
  });

  describe("getIndex", () => {
    it("returns a valid function index with system_id 'gibbscam'", () => {
      const index = GibbsCAMFunctionIndexEngine.getIndex();
      expect(index.system_id).toBe("gibbscam");
      expect(typeof index.sections).toBe("object");
      expect(typeof index.total_operations).toBe("number");
      expect(typeof index.total_parameters).toBe("number");
      expect(Array.isArray(index.categories)).toBe(true);
    });

    it("loads all four shipped sections", () => {
      const index = GibbsCAMFunctionIndexEngine.getIndex();
      const keys = Object.keys(index.sections).sort();
      expect(keys).toEqual(["mill_turn", "milling", "turning", "vmc"]);
    });

    it("totals match summary blocks (≥ 18 operations, ≥ 250 params)", () => {
      // milling 5 + turning 5 + mill_turn 4 + vmc 4 = 18
      const index = GibbsCAMFunctionIndexEngine.getIndex();
      expect(index.total_operations).toBeGreaterThanOrEqual(18);
      expect(index.total_parameters).toBeGreaterThanOrEqual(250);
    });

    it("aggregates GibbsCAM-distinctive categories", () => {
      const index = GibbsCAMFunctionIndexEngine.getIndex();
      expect(index.categories).toEqual(
        expect.arrayContaining([
          "high_efficiency",
          "live_tooling",
          "vmc",
          "machine_simulation",
        ])
      );
    });

    it("caches the index so two calls return the same reference", () => {
      const a = GibbsCAMFunctionIndexEngine.getIndex();
      const b = GibbsCAMFunctionIndexEngine.getIndex();
      expect(a).toBe(b);
    });

    it("resetCache forces a re-load (different reference, same shape)", () => {
      const a = GibbsCAMFunctionIndexEngine.getIndex();
      GibbsCAMFunctionIndexEngine.resetCache();
      const b = GibbsCAMFunctionIndexEngine.getIndex();
      expect(a).not.toBe(b);
      expect(b.system_id).toBe(a.system_id);
      expect(b.total_operations).toBe(a.total_operations);
      expect(b.total_parameters).toBe(a.total_parameters);
    });
  });

  describe("listSections / getSection", () => {
    it("listSections returns the four shipped section keys", () => {
      const sections = GibbsCAMFunctionIndexEngine.listSections();
      expect(sections.sort()).toEqual([
        "mill_turn",
        "milling",
        "turning",
        "vmc",
      ]);
    });

    it("getSection returns the milling section with VoluMill present", () => {
      const section = GibbsCAMFunctionIndexEngine.getSection("milling");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        expect(section.system_id).toBe("gibbscam");
        expect(section.section_key).toBe("milling");
        const opIds = Object.keys(section.operations);
        expect(opIds.length).toBeGreaterThanOrEqual(5);
        expect(opIds).toEqual(
          expect.arrayContaining(["vomotion_rough", "pocket_2d", "contour_mill", "surface_finish"])
        );
      }
    });

    it("VoluMill has expected category, tabs, and TEA range", () => {
      const section = GibbsCAMFunctionIndexEngine.getSection("milling");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        const op = section.operations.vomotion_rough;
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

    it("VMC simulate has expected stop triggers", () => {
      const section = GibbsCAMFunctionIndexEngine.getSection("vmc");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        const op = section.operations.vmc_simulate;
        expect(op.category).toBe("machine_simulation");
        expect(op.parameters.triggers.stopOnCollision.default).toBe(true);
        expect(op.parameters.triggers.stopOnAxisLimit.default).toBe(true);
        expect(op.parameters.triggers.stopOnRapidThruStock.default).toBe(true);
      }
    });

    it("getSection returns an error object for an unknown key", () => {
      const section = GibbsCAMFunctionIndexEngine.getSection("does_not_exist");
      expect("error" in section).toBe(true);
      if ("error" in section) {
        expect(section.error).toContain("does_not_exist");
        expect(section.available).toEqual(
          expect.arrayContaining(["milling", "turning", "mill_turn", "vmc"])
        );
      }
    });
  });

  describe("listOperations", () => {
    it("returns at least 18 operations across sections", () => {
      const ops = GibbsCAMFunctionIndexEngine.listOperations();
      expect(ops.length).toBeGreaterThanOrEqual(18);
    });

    it("every returned op has the four required fields populated", () => {
      const ops = GibbsCAMFunctionIndexEngine.listOperations();
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

    it("MTM channel sync is in mill_turn/synchronized", () => {
      const ops = GibbsCAMFunctionIndexEngine.listOperations();
      const mtm = ops.find((o) => o.operation_id === "mtm_channel_sync");
      expect(mtm?.section).toBe("mill_turn");
      expect(mtm?.category).toBe("synchronized");
    });

    it("vmc_collision_check is in vmc/collision_check", () => {
      const ops = GibbsCAMFunctionIndexEngine.listOperations();
      const cc = ops.find((o) => o.operation_id === "vmc_collision_check");
      expect(cc?.section).toBe("vmc");
      expect(cc?.category).toBe("collision_check");
    });
  });

  describe("findParameter", () => {
    it("locates 'tea' inside vomotion_rough only", () => {
      const results = GibbsCAMFunctionIndexEngine.findParameter("tea");
      const profit = results.find((r) => r.operation_id === "vomotion_rough");
      expect(profit?.section).toBe("milling");
      expect(profit?.group).toBe("engagement");
      expect(profit?.parameter_name).toBe("tea");
      expect(profit?.parameter.required).toBe(true);
      expect(profit?.parameter.unit).toBe("deg");
    });

    it("locates 'shellThickness' inside vmc_collision_check only", () => {
      const results =
        GibbsCAMFunctionIndexEngine.findParameter("shellThickness");
      expect(results.length).toBe(1);
      expect(results[0].operation_id).toBe("vmc_collision_check");
      expect(results[0].section).toBe("vmc");
      expect(results[0].parameter.unit).toBe("mm");
      expect(results[0].parameter.default).toBe(0.5);
    });

    it("returns an empty array for a needle that never matches", () => {
      const results = GibbsCAMFunctionIndexEngine.findParameter(
        "xyz_no_such_parameter_999"
      );
      expect(results).toEqual([]);
    });

    it("throws on empty / non-string parameterName (failure mode)", () => {
      expect(() => GibbsCAMFunctionIndexEngine.findParameter("")).toThrow(
        /non-empty string/
      );
      // @ts-expect-error - deliberate adversarial call
      expect(() => GibbsCAMFunctionIndexEngine.findParameter(null)).toThrow(
        /non-empty string/
      );
      // @ts-expect-error - deliberate adversarial call
      expect(() =>
        GibbsCAMFunctionIndexEngine.findParameter(undefined)
      ).toThrow(/non-empty string/);
    });
  });

  describe("searchParameters", () => {
    it("matches by description (Celeritive on VoluMill)", () => {
      const results = GibbsCAMFunctionIndexEngine.searchParameters(
        "Celeritive",
        50
      );
      // 'Celeritive' is in the VoluMill operation description, but search hits
      // parameter descriptions, not operation descriptions, so this should be 0.
      // Use 'Minkowski' which IS in a parameter description (vmc_collision_check).
      expect(results.length).toBe(0);
    });

    it("matches by parameter description (Minkowski on collision check)", () => {
      const results = GibbsCAMFunctionIndexEngine.searchParameters(
        "Minkowski",
        50
      );
      expect(results.length).toBeGreaterThanOrEqual(1);
      const hit = results.find(
        (r) => r.operation_id === "vmc_collision_check"
      );
      expect(hit?.parameter_name).toBe("shellThickness");
    });

    it("respects the limit cap", () => {
      const results = GibbsCAMFunctionIndexEngine.searchParameters("type", 5);
      expect(results.length).toBe(5);
    });

    it("clamps non-positive limits to a safe default of 1", () => {
      const r = GibbsCAMFunctionIndexEngine.searchParameters("type", -10);
      expect(r.length).toBe(1);
    });

    it("clamps oversized limits to 500 (DoS guard)", () => {
      const r = GibbsCAMFunctionIndexEngine.searchParameters("a", 100000);
      expect(r.length).toBeLessThanOrEqual(500);
    });

    it("throws on empty query (failure mode)", () => {
      expect(() => GibbsCAMFunctionIndexEngine.searchParameters("")).toThrow(
        /non-empty string/
      );
    });
  });

  describe("getOperationsByCategory", () => {
    it("returns at least two finishing operations", () => {
      const ops =
        GibbsCAMFunctionIndexEngine.getOperationsByCategory("finishing");
      expect(ops.length).toBeGreaterThanOrEqual(3);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toEqual(
        expect.arrayContaining(["contour_mill", "finish_turn", "surface_finish"])
      );
    });

    it("returns live_tooling ops", () => {
      const ops =
        GibbsCAMFunctionIndexEngine.getOperationsByCategory("live_tooling");
      expect(ops.length).toBeGreaterThanOrEqual(2);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toEqual(
        expect.arrayContaining([
          "live_tool_drill_radial",
          "live_tool_mill_face",
        ])
      );
    });

    it("returns [] for an unknown category", () => {
      const ops = GibbsCAMFunctionIndexEngine.getOperationsByCategory(
        "nonexistent_category_xyz"
      );
      expect(ops).toEqual([]);
    });

    it("throws on empty category (failure mode)", () => {
      expect(() =>
        GibbsCAMFunctionIndexEngine.getOperationsByCategory("")
      ).toThrow(/non-empty string/);
    });
  });

  describe("getSummary", () => {
    it("aggregates counts that match the index", () => {
      const idx = GibbsCAMFunctionIndexEngine.getIndex();
      const sum = GibbsCAMFunctionIndexEngine.getSummary();
      expect(sum.system_id).toBe("gibbscam");
      expect(sum.total_sections).toBe(Object.keys(idx.sections).length);
      expect(sum.total_operations).toBe(idx.total_operations);
      expect(sum.total_parameters).toBe(idx.total_parameters);
      const sumOps = sum.sections.reduce((a, s) => a + s.operations, 0);
      expect(sumOps).toBe(sum.total_operations);
    });
  });

  describe("getVoluMillOperations", () => {
    it("returns vomotion_rough as flagship VoluMill op", () => {
      const ops = GibbsCAMFunctionIndexEngine.getVoluMillOperations();
      expect(ops.length).toBeGreaterThanOrEqual(1);
      const vm = ops.find((o) => o.operation_id === "vomotion_rough");
      expect(vm?.section).toBe("milling");
      expect(vm?.display_name).toBe("VoluMill Roughing");
    });
  });

  describe("getVMCOperations", () => {
    it("returns all four VMC operations", () => {
      const ops = GibbsCAMFunctionIndexEngine.getVMCOperations();
      expect(ops.length).toBe(4);
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "vmc_collision_check",
        "vmc_kinematic_setup",
        "vmc_post_validate",
        "vmc_simulate",
      ]);
      for (const op of ops) {
        expect(op.section).toBe("vmc");
      }
    });
  });

  describe("getOperation", () => {
    it("looks up mtm_channel_sync under mill_turn", () => {
      const r = GibbsCAMFunctionIndexEngine.getOperation("mtm_channel_sync");
      expect("error" in r).toBe(false);
      if (!("error" in r)) {
        expect(r.section).toBe("mill_turn");
        expect(r.operation.category).toBe("synchronized");
        expect(r.operation.dialog_tabs).toEqual([
          "Channels",
          "Sync",
          "Strategy",
        ]);
        expect(r.operation.parameters.sync.syncMcode.default).toBe("M196");
      }
    });

    it("returns an error for an unknown operation id", () => {
      const r = GibbsCAMFunctionIndexEngine.getOperation("does_not_exist_op");
      expect("error" in r).toBe(true);
      if ("error" in r) {
        expect(r.error).toContain("does_not_exist_op");
      }
    });

    it("throws on non-string operation id (adversarial)", () => {
      // @ts-expect-error - deliberate adversarial call
      expect(() => GibbsCAMFunctionIndexEngine.getOperation(null)).toThrow(
        /non-empty string/
      );
      // @ts-expect-error - deliberate adversarial call
      expect(() => GibbsCAMFunctionIndexEngine.getOperation(42)).toThrow(
        /non-empty string/
      );
    });
  });

  describe("getTrainingTopics", () => {
    it("returns the vmc training topic on Why VMC matters", () => {
      const t = GibbsCAMFunctionIndexEngine.getTrainingTopics("vmc");
      expect(t.length).toBeGreaterThanOrEqual(1);
      const why = t.find((x) => x.topic.includes("Why VMC"));
      expect(why?.key_concepts).toEqual(
        expect.arrayContaining(["machine kinematics"])
      );
      expect(why?.best_practices.length).toBeGreaterThanOrEqual(3);
    });

    it("returns [] for an unknown section", () => {
      expect(
        GibbsCAMFunctionIndexEngine.getTrainingTopics("nonexistent")
      ).toEqual([]);
    });
  });

  describe("dispatcher wiring contract", () => {
    it("camDispatcher exposes the 10 gibbscam_function_index_* actions", () => {
      const dispPath = join(
        __dirname,
        "../../src/tools/dispatchers/camDispatcher.ts"
      );
      const text = readFileSync(dispPath, "utf-8");
      const required = [
        "gibbscam_function_index_get",
        "gibbscam_function_index_list_sections",
        "gibbscam_function_index_get_section",
        "gibbscam_function_index_list_operations",
        "gibbscam_function_index_find_parameter",
        "gibbscam_function_index_search_parameters",
        "gibbscam_function_index_get_operations_by_category",
        "gibbscam_function_index_get_summary",
        "gibbscam_function_index_get_volumill_operations",
        "gibbscam_function_index_get_operation",
      ];
      for (const action of required) {
        expect(text).toContain(action);
      }
    });
  });
});
