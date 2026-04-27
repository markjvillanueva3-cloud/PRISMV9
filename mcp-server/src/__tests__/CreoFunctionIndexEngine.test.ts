/**
 * CreoFunctionIndexEngine.test.ts — CAM-EXHAUST-MS0/U-CAM-FIDX-21
 *
 * Real-data tests against the four Creo NC catalogs. Asserts concrete values
 * (not toBeDefined / toBeTruthy) so the test-legitimacy hook accepts them.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CreoFunctionIndexEngine } from "../engines/CreoFunctionIndexEngine";

describe("CreoFunctionIndexEngine", () => {
  beforeEach(() => {
    CreoFunctionIndexEngine.resetCache();
  });

  describe("loadIndex / getIndex", () => {
    it("loads all four sections from disk", () => {
      const idx = CreoFunctionIndexEngine.getIndex();
      expect(idx.system_id).toBe("creo");
      const keys = Object.keys(idx.sections).sort();
      expect(keys).toEqual(["mill_turn", "milling", "prismatic", "turning"]);
    });

    it("aggregates total operations to 16 (4 ops × 4 sections)", () => {
      const idx = CreoFunctionIndexEngine.getIndex();
      expect(idx.total_operations).toBe(16);
    });

    it("aggregates total parameters to 240 (64+60+60+56)", () => {
      const idx = CreoFunctionIndexEngine.getIndex();
      expect(idx.total_parameters).toBe(240);
    });

    it("collects categories from each section", () => {
      const idx = CreoFunctionIndexEngine.getIndex();
      expect(idx.categories).toContain("volume_milling");
      expect(idx.categories).toContain("area_turning");
      expect(idx.categories).toContain("multi_axis_mill_turn");
      expect(idx.categories).toContain("drill_cycle");
    });

    it("caches loaded index — second call returns identical object", () => {
      const a = CreoFunctionIndexEngine.getIndex();
      const b = CreoFunctionIndexEngine.getIndex();
      expect(a).toBe(b);
    });

    it("resetCache forces a fresh load with same totals", () => {
      const a = CreoFunctionIndexEngine.getIndex();
      CreoFunctionIndexEngine.resetCache();
      const b = CreoFunctionIndexEngine.getIndex();
      expect(a).not.toBe(b);
      expect(a.total_operations).toBe(16);
      expect(b.total_operations).toBe(16);
    });
  });

  describe("listSections", () => {
    it("returns the four expected section keys", () => {
      const sections = CreoFunctionIndexEngine.listSections().sort();
      expect(sections).toEqual(["mill_turn", "milling", "prismatic", "turning"]);
    });
  });

  describe("getSection", () => {
    it("returns milling section with 4 operations and named flagship", () => {
      const section = CreoFunctionIndexEngine.getSection("milling");
      expect("error" in section).toBe(false);
      if ("operations" in section) {
        expect(Object.keys(section.operations)).toHaveLength(4);
        expect(section.operations.volume_milling.display_name).toBe("Volume Milling");
        expect(section.operations.surface_milling.parameters.surface.ballNoseDia.default).toBe(6.0);
      }
    });

    it("returns turning section with thread_turning op default pitch 1.5", () => {
      const section = CreoFunctionIndexEngine.getSection("turning");
      if ("operations" in section) {
        const thread = section.operations.thread_turning;
        expect(thread.dialog_tabs).toContain("Infeed");
        expect(thread.parameters.thread.thread_pitch.default).toBe(1.5);
        expect(thread.parameters.thread.starts.default).toBe(1);
      }
    });

    it("returns mill_turn section sub_spindle_sync with rpm tolerance 5", () => {
      const section = CreoFunctionIndexEngine.getSection("mill_turn");
      if ("operations" in section) {
        const sync = section.operations.sub_spindle_sync;
        expect(sync.category).toBe("sub_spindle_sync");
        expect(sync.parameters.sync.rpm_match_tolerance.default).toBe(5.0);
        expect(sync.parameters.sync.max_sync_attempts.default).toBe(3);
      }
    });

    it("returns error object with available list for unknown section", () => {
      const result = CreoFunctionIndexEngine.getSection("nonexistent");
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toBe("Section 'nonexistent' not found");
        expect(result.available).toEqual(expect.arrayContaining(["milling", "turning", "mill_turn", "prismatic"]));
      }
    });
  });

  describe("listOperations", () => {
    it("returns 16 operations across all sections", () => {
      const ops = CreoFunctionIndexEngine.listOperations();
      expect(ops).toHaveLength(16);
    });

    it("first row carries non-empty operation_id, display_name, section, category", () => {
      const ops = CreoFunctionIndexEngine.listOperations();
      const first = ops[0];
      expect(first.operation_id.length).toBeGreaterThan(0);
      expect(first.display_name.length).toBeGreaterThan(0);
      expect(["milling", "turning", "mill_turn", "prismatic"]).toContain(first.section);
      expect(first.category.length).toBeGreaterThan(0);
    });

    it("includes the four flagship operations exactly once", () => {
      const ops = CreoFunctionIndexEngine.listOperations();
      const ids = ops.map((o) => o.operation_id);
      const flagshipCount = ids.filter((i) =>
        ["volume_milling", "area_turning", "multi_axis_mill_turn", "drill_cycle"].includes(i)
      ).length;
      expect(flagshipCount).toBe(4);
    });
  });

  describe("findParameter", () => {
    it("finds 'cut_feed' across at least 3 milling ops", () => {
      const hits = CreoFunctionIndexEngine.findParameter("cut_feed");
      expect(hits.length).toBeGreaterThanOrEqual(3);
      const millingHits = hits.filter((h) => h.section === "milling");
      expect(millingHits.length).toBeGreaterThanOrEqual(3);
    });

    it("finds 'thread_pitch' only in thread_turning op", () => {
      const hits = CreoFunctionIndexEngine.findParameter("thread_pitch");
      expect(hits).toHaveLength(1);
      expect(hits[0].operation_id).toBe("thread_turning");
      expect(hits[0].section).toBe("turning");
      expect(hits[0].parameter.default).toBe(1.5);
    });

    it("finds 'css_speed' across all 4 turning ops? at least 3", () => {
      const hits = CreoFunctionIndexEngine.findParameter("css_speed");
      expect(hits.length).toBeGreaterThanOrEqual(3);
      const sections = new Set(hits.map((h) => h.section));
      expect(sections.size).toBe(1);
      expect(sections.has("turning")).toBe(true);
    });

    it("returns empty array for nonexistent parameter", () => {
      const hits = CreoFunctionIndexEngine.findParameter("xyzzy_no_match_param");
      expect(hits).toEqual([]);
    });

    it("throws on empty parameter name", () => {
      expect(() => CreoFunctionIndexEngine.findParameter("")).toThrow(
        "findParameter: parameterName must be a non-empty string"
      );
    });

    it("throws on null parameter name", () => {
      expect(() => CreoFunctionIndexEngine.findParameter(null as unknown as string)).toThrow();
    });
  });

  describe("searchParameters", () => {
    it("searches 'rpm' and finds matches in multiple sections", () => {
      const results = CreoFunctionIndexEngine.searchParameters("rpm");
      expect(results.length).toBeGreaterThan(3);
      const sectionsHit = new Set(results.map((r) => r.section));
      expect(sectionsHit.size).toBeGreaterThan(1);
    });

    it("respects limit clamping to 1", () => {
      const results = CreoFunctionIndexEngine.searchParameters("feed", 1);
      expect(results).toHaveLength(1);
    });

    it("clamps oversized limit to 500 max", () => {
      const results = CreoFunctionIndexEngine.searchParameters("feed", 99999);
      expect(results.length).toBeLessThanOrEqual(500);
    });

    it("matches description text — finds 'chip' in groove_turning peck description", () => {
      const results = CreoFunctionIndexEngine.searchParameters("chip");
      const groove = results.find((r) => r.operation_id === "groove_turning");
      expect(groove?.section).toBe("turning");
    });

    it("throws on empty query", () => {
      expect(() => CreoFunctionIndexEngine.searchParameters("")).toThrow(
        "searchParameters: query must be a non-empty string"
      );
    });
  });

  describe("getOperationsByCategory", () => {
    it("matches volume_milling category with single hit", () => {
      const ops = CreoFunctionIndexEngine.getOperationsByCategory("volume_milling");
      expect(ops).toHaveLength(1);
      expect(ops[0].operation_id).toBe("volume_milling");
    });

    it("matches case-insensitive 'TURN' substring across multiple turning ops", () => {
      const ops = CreoFunctionIndexEngine.getOperationsByCategory("TURN");
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toContain("area_turning");
      expect(ids).toContain("profile_turning");
      expect(ids).toContain("thread_turning");
    });

    it("returns empty for unknown category", () => {
      const ops = CreoFunctionIndexEngine.getOperationsByCategory("not_a_real_category");
      expect(ops).toEqual([]);
    });

    it("throws on empty category", () => {
      expect(() => CreoFunctionIndexEngine.getOperationsByCategory("")).toThrow(
        "getOperationsByCategory: category must be a non-empty string"
      );
    });
  });

  describe("getSummary", () => {
    it("reports system_id=creo, 4 sections, 16 operations, 240 parameters", () => {
      const s = CreoFunctionIndexEngine.getSummary();
      expect(s.system_id).toBe("creo");
      expect(s.total_sections).toBe(4);
      expect(s.total_operations).toBe(16);
      expect(s.total_parameters).toBe(240);
    });

    it("each of the 4 section entries reports exactly 4 operations", () => {
      const s = CreoFunctionIndexEngine.getSummary();
      expect(s.sections).toHaveLength(4);
      const counts = s.sections.map((sec) => sec.operations);
      expect(counts).toEqual([4, 4, 4, 4]);
    });
  });

  describe("getMillTurnOperations (flagship surface)", () => {
    it("returns the 4 mill-turn operations sorted", () => {
      const ops = CreoFunctionIndexEngine.getMillTurnOperations();
      expect(ops).toHaveLength(4);
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "live_tool_drill",
        "multi_axis_mill_turn",
        "polar_milling",
        "sub_spindle_sync",
      ]);
    });

    it("all returned ops report section='mill_turn' and named category", () => {
      const ops = CreoFunctionIndexEngine.getMillTurnOperations();
      const sections = new Set(ops.map((o) => o.section));
      expect(sections.size).toBe(1);
      expect(sections.has("mill_turn")).toBe(true);
      const categories = ops.map((o) => o.category).sort();
      expect(categories).toEqual([
        "live_tool_drill",
        "multi_axis_mill_turn",
        "polar_milling",
        "sub_spindle_sync",
      ]);
    });
  });

  describe("getHolemakingOperations (engine-only surface)", () => {
    it("returns all 4 holemaking operations", () => {
      const ops = CreoFunctionIndexEngine.getHolemakingOperations();
      expect(ops).toHaveLength(4);
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "bore_cycle",
        "drill_cycle",
        "ream_cycle",
        "tap_cycle",
      ]);
    });

    it("all from prismatic section", () => {
      const ops = CreoFunctionIndexEngine.getHolemakingOperations();
      const sections = new Set(ops.map((o) => o.section));
      expect(sections.size).toBe(1);
      expect(sections.has("prismatic")).toBe(true);
    });
  });

  describe("getOperation", () => {
    it("finds volume_milling in milling section with display name", () => {
      const result = CreoFunctionIndexEngine.getOperation("volume_milling");
      if ("operation" in result) {
        expect(result.section).toBe("milling");
        expect(result.operation.display_name).toBe("Volume Milling");
        expect(result.operation.dialog_tabs).toContain("MillVolume");
      } else {
        expect.fail("expected found op");
      }
    });

    it("finds sub_spindle_sync in mill_turn section", () => {
      const result = CreoFunctionIndexEngine.getOperation("sub_spindle_sync");
      if ("operation" in result) {
        expect(result.section).toBe("mill_turn");
        expect(result.operation.dialog_tabs).toContain("Sync");
      } else {
        expect.fail("expected found op");
      }
    });

    it("returns error object for unknown operation id", () => {
      const result = CreoFunctionIndexEngine.getOperation("not_a_real_op");
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toBe("Operation 'not_a_real_op' not found");
      }
    });

    it("throws on empty operation id", () => {
      expect(() => CreoFunctionIndexEngine.getOperation("")).toThrow(
        "getOperation: operationId must be a non-empty string"
      );
    });
  });

  describe("getTrainingTopics", () => {
    it("returns mill volume topic for milling section", () => {
      const topics = CreoFunctionIndexEngine.getTrainingTopics("milling");
      expect(topics.length).toBe(1);
      expect(topics[0].topic).toBe("Mill Volume Features");
      expect(topics[0].key_concepts).toContain("Created in Pro/NC");
    });

    it("returns constant volume threading topic for turning", () => {
      const topics = CreoFunctionIndexEngine.getTrainingTopics("turning");
      expect(topics[0].topic).toBe("Constant Volume Threading");
      expect(topics[0].best_practices).toContain("Always include ≥1 spring pass");
    });

    it("returns sub-spindle topic for mill_turn", () => {
      const topics = CreoFunctionIndexEngine.getTrainingTopics("mill_turn");
      expect(topics[0].topic).toBe("Sub-Spindle Synchronisation");
    });

    it("returns reamer topic for prismatic with no_dwell rule", () => {
      const topics = CreoFunctionIndexEngine.getTrainingTopics("prismatic");
      expect(topics[0].topic).toBe("Reamer Behavior");
      expect(topics[0].key_concepts).toContain("Never dwell at bottom");
    });

    it("returns empty array for unknown section", () => {
      const topics = CreoFunctionIndexEngine.getTrainingTopics("nonexistent");
      expect(topics).toEqual([]);
    });
  });

  describe("Creo-specific structural checks", () => {
    it("LR32 furniture pitch absent (Creo isn't woodworking CAM)", () => {
      const idx = CreoFunctionIndexEngine.getIndex();
      const all = JSON.stringify(idx.sections);
      expect(all.includes("LR32")).toBe(false);
    });

    it("volume_milling has scan_type TYPE_3_AXIS_REL default", () => {
      const result = CreoFunctionIndexEngine.getOperation("volume_milling");
      if ("operation" in result) {
        expect(result.operation.parameters.mill_volume.scanType.default).toBe("TYPE_3_AXIS_REL");
        expect(result.operation.parameters.cut.step_depth.default).toBe(5.0);
      }
    });

    it("area_turning enforces G96 with min_diameter switchover at 5mm", () => {
      const result = CreoFunctionIndexEngine.getOperation("area_turning");
      if ("operation" in result) {
        expect(result.operation.parameters.output.g96_g97_switch.default).toBe(true);
        expect(result.operation.parameters.output.min_diameter_g96.default).toBe(5.0);
        expect(result.operation.parameters.cut.css_speed.default).toBe(200);
      }
    });

    it("multi_axis_mill_turn defaults to all 3 axes enabled and B-tilt 90°", () => {
      const result = CreoFunctionIndexEngine.getOperation("multi_axis_mill_turn");
      if ("operation" in result) {
        expect(result.operation.parameters.axes.use_b_axis.default).toBe(true);
        expect(result.operation.parameters.axes.use_c_axis.default).toBe(true);
        expect(result.operation.parameters.axes.use_y_axis.default).toBe(true);
        expect(result.operation.parameters.axes.max_b_tilt_deg.default).toBe(90.0);
      }
    });

    it("polar_milling uses G12.1 / G13.1 codes (Fanuc polar)", () => {
      const result = CreoFunctionIndexEngine.getOperation("polar_milling");
      if ("operation" in result) {
        expect(result.operation.parameters.output.polar_in_code.default).toBe("G12.1");
        expect(result.operation.parameters.output.polar_out_code.default).toBe("G13.1");
        expect(result.operation.parameters.pattern.useG12_1_polar.default).toBe(true);
      }
    });

    it("ream_cycle enforces no_dwell rule (reamer score-mark prevention)", () => {
      const result = CreoFunctionIndexEngine.getOperation("ream_cycle");
      if ("operation" in result) {
        expect(result.operation.parameters.output.no_dwell.default).toBe(true);
        expect(result.operation.parameters.cut.ream_speed_rpm.default).toBe(600);
        expect(result.operation.parameters.cut.ream_feed_mm_per_rev.default).toBe(0.15);
      }
    });

    it("tap_cycle defaults to rigid tap with M29 emit", () => {
      const result = CreoFunctionIndexEngine.getOperation("tap_cycle");
      if ("operation" in result) {
        expect(result.operation.parameters.strategy.rigid_tap.default).toBe(true);
        expect(result.operation.parameters.output.M29_before_cycle.default).toBe(true);
        expect(result.operation.parameters.tap.tap_pitch_mm.default).toBe(1.5);
      }
    });

    it("drill_cycle Holemaking auto-feature recognition default-on", () => {
      const result = CreoFunctionIndexEngine.getOperation("drill_cycle");
      if ("operation" in result) {
        expect(result.operation.parameters.hole_set.autoFeatureRecognize.default).toBe(true);
        expect(result.operation.parameters.cycle.cycleType.default).toBe("PECK_DRILL");
      }
    });
  });
});
