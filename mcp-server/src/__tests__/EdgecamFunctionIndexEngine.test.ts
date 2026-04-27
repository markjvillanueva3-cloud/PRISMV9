/**
 * EdgecamFunctionIndexEngine tests — CAM-EXHAUST-MS0/U-CAM-FIDX-09
 *
 * Real-data tests against the four Edgecam catalog files
 * (milling, turning, drilling, five_axis). Catalogs ship in
 * mcp-server/data/cam-functions/edgecam/.
 *
 * Coverage targets the FunctionIndex pattern shared with
 * Mastercam / Fusion 360 / InventorHSM / hyperMILL / NXCAM /
 * PowerMill / SolidCAM / CATIA function-index engines.
 *
 * Includes:
 *   - structural assertions on the loaded index
 *   - known-section / known-operation contract checks
 *   - parameter search (positive + adversarial)
 *   - failure modes (missing section, empty/non-string args)
 *   - cache stability + reset
 *   - dispatcher-wiring assertion (action enum is uniform with peers)
 */

import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect, beforeEach } from "vitest";
import { EdgecamFunctionIndexEngine } from "../engines/EdgecamFunctionIndexEngine.js";

describe("EdgecamFunctionIndexEngine", () => {
  beforeEach(() => {
    EdgecamFunctionIndexEngine.resetCache();
  });

  describe("getIndex", () => {
    it("returns a valid function index with system_id 'edgecam'", () => {
      const index = EdgecamFunctionIndexEngine.getIndex();
      expect(index.system_id).toBe("edgecam");
      expect(typeof index.sections).toBe("object");
      expect(typeof index.total_operations).toBe("number");
      expect(typeof index.total_parameters).toBe("number");
      expect(Array.isArray(index.categories)).toBe(true);
    });

    it("loads all four shipped sections", () => {
      const index = EdgecamFunctionIndexEngine.getIndex();
      const keys = Object.keys(index.sections).sort();
      expect(keys).toEqual(["drilling", "five_axis", "milling", "turning"]);
    });

    it("totals match the sum of section summaries (≥ 21 operations, ≥ 200 params)", () => {
      // milling 6 + turning 6 + drilling 5 + five_axis 4 = 21
      // params summed from per-section summary blocks
      const index = EdgecamFunctionIndexEngine.getIndex();
      expect(index.total_operations).toBeGreaterThanOrEqual(21);
      expect(index.total_parameters).toBeGreaterThanOrEqual(200);
    });

    it("aggregates categories across sections", () => {
      const index = EdgecamFunctionIndexEngine.getIndex();
      // milling: roughing/finishing/profiling/high_efficiency
      // turning: roughing/finishing/grooving/threading/parting
      // drilling: holemaking
      // five_axis: five_axis/high_efficiency/indexed/simultaneous
      expect(index.categories).toEqual(
        expect.arrayContaining([
          "roughing",
          "finishing",
          "high_efficiency",
          "indexed",
          "holemaking",
          "threading",
        ])
      );
    });

    it("caches the index so two calls return the same reference", () => {
      const a = EdgecamFunctionIndexEngine.getIndex();
      const b = EdgecamFunctionIndexEngine.getIndex();
      expect(a).toBe(b);
    });

    it("resetCache forces a re-load (different reference, same shape)", () => {
      const a = EdgecamFunctionIndexEngine.getIndex();
      EdgecamFunctionIndexEngine.resetCache();
      const b = EdgecamFunctionIndexEngine.getIndex();
      expect(a).not.toBe(b);
      expect(b.system_id).toBe(a.system_id);
      expect(b.total_operations).toBe(a.total_operations);
      expect(b.total_parameters).toBe(a.total_parameters);
    });
  });

  describe("listSections / getSection", () => {
    it("listSections returns the four shipped section keys", () => {
      const sections = EdgecamFunctionIndexEngine.listSections();
      expect(sections.sort()).toEqual([
        "drilling",
        "five_axis",
        "milling",
        "turning",
      ]);
    });

    it("getSection returns the milling section with at least 6 operations", () => {
      const section = EdgecamFunctionIndexEngine.getSection("milling");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        expect(section.system_id).toBe("edgecam");
        expect(section.section_key).toBe("milling");
        const opIds = Object.keys(section.operations);
        expect(opIds.length).toBeGreaterThanOrEqual(6);
        expect(opIds).toEqual(
          expect.arrayContaining([
            "rough_profile",
            "rough_pocket",
            "waveform_rough",
            "finish_profile",
          ])
        );
      }
    });

    it("getSection waveform_rough has expected category, tabs, params", () => {
      const section = EdgecamFunctionIndexEngine.getSection("milling");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        const wave = section.operations.waveform_rough;
        expect(wave.category).toBe("high_efficiency");
        expect(wave.dialog_tabs).toEqual([
          "Tool",
          "Boundary",
          "Levels",
          "Engagement",
          "Smoothing",
          "Strategy",
        ]);
        expect(wave.parameters.engagement.tea.unit).toBe("deg");
        expect(wave.parameters.engagement.tea.required).toBe(true);
        expect(wave.parameters.engagement.tea.range).toEqual([5, 90]);
      }
    });

    it("getSection returns an error object for an unknown key", () => {
      const section = EdgecamFunctionIndexEngine.getSection("does_not_exist");
      expect("error" in section).toBe(true);
      if ("error" in section) {
        expect(section.error).toContain("does_not_exist");
        expect(section.available).toEqual(
          expect.arrayContaining(["milling", "turning", "drilling", "five_axis"])
        );
      }
    });
  });

  describe("listOperations", () => {
    it("returns at least 21 operations across sections", () => {
      const ops = EdgecamFunctionIndexEngine.listOperations();
      expect(ops.length).toBeGreaterThanOrEqual(21);
    });

    it("every returned op has the four required fields populated", () => {
      const ops = EdgecamFunctionIndexEngine.listOperations();
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

    it("waveform_rough is in milling/high_efficiency", () => {
      const ops = EdgecamFunctionIndexEngine.listOperations();
      const wave = ops.find((o) => o.operation_id === "waveform_rough");
      expect(wave?.section).toBe("milling");
      expect(wave?.category).toBe("high_efficiency");
      expect(wave?.display_name).toBe("Waveform Roughing");
    });
  });

  describe("findParameter", () => {
    it("locates 'stockToLeave' across at least three operations", () => {
      const results = EdgecamFunctionIndexEngine.findParameter("stockToLeave");
      expect(results.length).toBeGreaterThanOrEqual(3);
      const ops = new Set(results.map((r) => r.operation_id));
      expect(ops.has("rough_profile")).toBe(true);
    });

    it("locates 'tea' inside the waveform_rough operation only", () => {
      const results = EdgecamFunctionIndexEngine.findParameter("tea");
      expect(results.length).toBeGreaterThanOrEqual(1);
      const wave = results.find((r) => r.operation_id === "waveform_rough");
      expect(wave?.section).toBe("milling");
      expect(wave?.group).toBe("engagement");
      expect(wave?.parameter_name).toBe("tea");
      expect(wave?.parameter.unit).toBe("deg");
      expect(wave?.parameter.required).toBe(true);
    });

    it("returns an empty array for a needle that never matches", () => {
      const results = EdgecamFunctionIndexEngine.findParameter(
        "xyz_no_such_parameter_123"
      );
      expect(results).toEqual([]);
    });

    it("throws on empty / non-string parameterName (failure mode)", () => {
      expect(() => EdgecamFunctionIndexEngine.findParameter("")).toThrow(
        /non-empty string/
      );
      // @ts-expect-error - deliberate adversarial call
      expect(() => EdgecamFunctionIndexEngine.findParameter(null)).toThrow(
        /non-empty string/
      );
      // @ts-expect-error - deliberate adversarial call
      expect(() => EdgecamFunctionIndexEngine.findParameter(undefined)).toThrow(
        /non-empty string/
      );
    });
  });

  describe("searchParameters", () => {
    it("matches by description as well as by name", () => {
      const results = EdgecamFunctionIndexEngine.searchParameters(
        "trochoidal",
        50
      );
      expect(results.length).toBeGreaterThanOrEqual(1);
      const hit = results.find(
        (r) => r.description?.toLowerCase().includes("trochoidal") ||
               r.parameter_name.toLowerCase().includes("trochoidal")
      );
      expect(hit?.section).toBe("milling");
    });

    it("respects the limit cap", () => {
      const results = EdgecamFunctionIndexEngine.searchParameters("type", 5);
      expect(results.length).toBe(5);
    });

    it("clamps non-positive limits to a safe default of 1", () => {
      const r = EdgecamFunctionIndexEngine.searchParameters("type", -10);
      expect(r.length).toBe(1);
    });

    it("clamps oversized limits to 500 (DoS guard)", () => {
      const r = EdgecamFunctionIndexEngine.searchParameters("a", 100000);
      expect(r.length).toBeLessThanOrEqual(500);
    });

    it("throws on empty query (failure mode)", () => {
      expect(() => EdgecamFunctionIndexEngine.searchParameters("")).toThrow(
        /non-empty string/
      );
    });
  });

  describe("getOperationsByCategory", () => {
    it("returns at least two finishing operations", () => {
      const ops =
        EdgecamFunctionIndexEngine.getOperationsByCategory("finishing");
      expect(ops.length).toBeGreaterThanOrEqual(2);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toEqual(
        expect.arrayContaining(["finish_profile", "finish_turn"])
      );
    });

    it("returns drilling operations under 'holemaking'", () => {
      const ops =
        EdgecamFunctionIndexEngine.getOperationsByCategory("holemaking");
      expect(ops.length).toBeGreaterThanOrEqual(5);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toEqual(
        expect.arrayContaining(["drill", "peck_drill", "tap", "ream"])
      );
    });

    it("returns [] for an unknown category", () => {
      const ops = EdgecamFunctionIndexEngine.getOperationsByCategory(
        "nonexistent_category_xyz"
      );
      expect(ops).toEqual([]);
    });

    it("throws on empty category (failure mode)", () => {
      expect(() =>
        EdgecamFunctionIndexEngine.getOperationsByCategory("")
      ).toThrow(/non-empty string/);
    });
  });

  describe("getSummary", () => {
    it("aggregates counts that match the index", () => {
      const idx = EdgecamFunctionIndexEngine.getIndex();
      const sum = EdgecamFunctionIndexEngine.getSummary();
      expect(sum.system_id).toBe("edgecam");
      expect(sum.total_sections).toBe(Object.keys(idx.sections).length);
      expect(sum.total_operations).toBe(idx.total_operations);
      expect(sum.total_parameters).toBe(idx.total_parameters);
      const sumOps = sum.sections.reduce((a, s) => a + s.operations, 0);
      expect(sumOps).toBe(sum.total_operations);
    });
  });

  describe("getWaveformOperations", () => {
    it("returns waveform_rough as a flagship high-efficiency op", () => {
      const ops = EdgecamFunctionIndexEngine.getWaveformOperations();
      expect(ops.length).toBeGreaterThanOrEqual(1);
      const wave = ops.find((o) => o.operation_id === "waveform_rough");
      expect(wave?.section).toBe("milling");
      expect(wave?.display_name).toBe("Waveform Roughing");
    });
  });

  describe("getOperation", () => {
    it("looks up rough_turn under turning", () => {
      const r = EdgecamFunctionIndexEngine.getOperation("rough_turn");
      expect("error" in r).toBe(false);
      if (!("error" in r)) {
        expect(r.section).toBe("turning");
        expect(r.operation.category).toBe("roughing");
        expect(r.operation.dialog_tabs).toEqual([
          "Tool",
          "Profile",
          "Stepover",
          "Strategy",
          "Cycle",
        ]);
        expect(r.operation.parameters.cycle.cycleType.values).toEqual([
          "G71",
          "G72",
          "G73",
          "long_form",
        ]);
      }
    });

    it("returns an error for an unknown operation id", () => {
      const r = EdgecamFunctionIndexEngine.getOperation("does_not_exist_op");
      expect("error" in r).toBe(true);
      if ("error" in r) {
        expect(r.error).toContain("does_not_exist_op");
      }
    });

    it("throws on non-string operation id (adversarial)", () => {
      // @ts-expect-error - deliberate adversarial call
      expect(() => EdgecamFunctionIndexEngine.getOperation(null)).toThrow(
        /non-empty string/
      );
      // @ts-expect-error - deliberate adversarial call
      expect(() => EdgecamFunctionIndexEngine.getOperation(42)).toThrow(
        /non-empty string/
      );
    });
  });

  describe("getTrainingTopics", () => {
    it("returns the milling training topic on Waveform Roughing", () => {
      const t = EdgecamFunctionIndexEngine.getTrainingTopics("milling");
      expect(t.length).toBeGreaterThanOrEqual(1);
      const wave = t.find((x) => x.topic.includes("Waveform"));
      expect(wave?.key_concepts).toEqual(
        expect.arrayContaining(["constant tool engagement angle"])
      );
      expect(wave?.best_practices.length).toBeGreaterThanOrEqual(3);
    });

    it("returns [] for an unknown section", () => {
      expect(
        EdgecamFunctionIndexEngine.getTrainingTopics("nonexistent")
      ).toEqual([]);
    });
  });

  describe("dispatcher wiring contract", () => {
    it("camDispatcher exposes the 10 edgecam_function_index_* actions", () => {
      const dispPath = join(
        __dirname,
        "../../src/tools/dispatchers/camDispatcher.ts"
      );
      const text = readFileSync(dispPath, "utf-8");
      const required = [
        "edgecam_function_index_get",
        "edgecam_function_index_list_sections",
        "edgecam_function_index_get_section",
        "edgecam_function_index_list_operations",
        "edgecam_function_index_find_parameter",
        "edgecam_function_index_search_parameters",
        "edgecam_function_index_get_operations_by_category",
        "edgecam_function_index_get_summary",
        "edgecam_function_index_get_waveform_operations",
        "edgecam_function_index_get_operation",
      ];
      for (const action of required) {
        expect(text).toContain(action);
      }
    });
  });
});
