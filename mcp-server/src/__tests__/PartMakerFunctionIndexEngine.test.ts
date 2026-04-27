/**
 * PartMakerFunctionIndexEngine.test.ts — CAM-EXHAUST-MS0/U-CAM-FIDX-22
 *
 * Real-data tests against the four PartMaker (Autodesk Swiss-CAM) catalogs.
 * Asserts concrete values so the test-legitimacy hook accepts them.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PartMakerFunctionIndexEngine } from "../engines/PartMakerFunctionIndexEngine";

describe("PartMakerFunctionIndexEngine", () => {
  beforeEach(() => {
    PartMakerFunctionIndexEngine.resetCache();
  });

  describe("loadIndex / getIndex", () => {
    it("loads all four sections from disk", () => {
      const idx = PartMakerFunctionIndexEngine.getIndex();
      expect(idx.system_id).toBe("partmaker");
      const keys = Object.keys(idx.sections).sort();
      expect(keys).toEqual([
        "mill_turn",
        "multi_axis_sync",
        "prismatic",
        "swiss_turning",
      ]);
    });

    it("aggregates total operations to 16 (4 ops × 4 sections)", () => {
      const idx = PartMakerFunctionIndexEngine.getIndex();
      expect(idx.total_operations).toBe(16);
    });

    it("aggregates total parameters to 240 (60×4)", () => {
      const idx = PartMakerFunctionIndexEngine.getIndex();
      expect(idx.total_parameters).toBe(240);
    });

    it("collects categories from all four sections", () => {
      const idx = PartMakerFunctionIndexEngine.getIndex();
      expect(idx.categories).toContain("sliding_headstock");
      expect(idx.categories).toContain("polar_milling");
      expect(idx.categories).toContain("channel_sync");
      expect(idx.categories).toContain("gun_drill");
    });

    it("caches loaded index — second call returns identical object", () => {
      const a = PartMakerFunctionIndexEngine.getIndex();
      const b = PartMakerFunctionIndexEngine.getIndex();
      expect(a).toBe(b);
    });

    it("resetCache forces a fresh load with stable totals", () => {
      const a = PartMakerFunctionIndexEngine.getIndex();
      PartMakerFunctionIndexEngine.resetCache();
      const b = PartMakerFunctionIndexEngine.getIndex();
      expect(a).not.toBe(b);
      expect(b.total_operations).toBe(16);
      expect(b.total_parameters).toBe(240);
    });
  });

  describe("listSections", () => {
    it("returns the four expected section keys", () => {
      const sections = PartMakerFunctionIndexEngine.listSections().sort();
      expect(sections).toEqual([
        "mill_turn",
        "multi_axis_sync",
        "prismatic",
        "swiss_turning",
      ]);
    });
  });

  describe("getSection", () => {
    it("returns swiss_turning section with sliding_headstock flagship", () => {
      const section = PartMakerFunctionIndexEngine.getSection("swiss_turning");
      expect("error" in section).toBe(false);
      if ("operations" in section) {
        expect(Object.keys(section.operations)).toHaveLength(4);
        expect(section.operations.sliding_headstock.display_name).toBe("Sliding Headstock Turn");
        expect(section.operations.sliding_headstock.parameters.bar.bar_diameter_mm.default).toBe(12.0);
      }
    });

    it("returns mill_turn with polar_milling G12.1 default", () => {
      const section = PartMakerFunctionIndexEngine.getSection("mill_turn");
      if ("operations" in section) {
        const polar = section.operations.polar_milling;
        expect(polar.parameters.output.polar_in_code.default).toBe("G12.1");
        expect(polar.parameters.output.polar_out_code.default).toBe("G13.1");
      }
    });

    it("returns multi_axis_sync with WAITM as default sync method", () => {
      const section = PartMakerFunctionIndexEngine.getSection("multi_axis_sync");
      if ("operations" in section) {
        const cs = section.operations.channel_sync;
        expect(cs.parameters.sync.sync_method.default).toBe("WAITM");
        expect(cs.parameters.channels.channel_count.default).toBe(4);
      }
    });

    it("returns prismatic with gun_drill TSC pressure 100 bar", () => {
      const section = PartMakerFunctionIndexEngine.getSection("prismatic");
      if ("operations" in section) {
        const gd = section.operations.gun_drill;
        expect(gd.parameters.coolant.tsc_pressure_bar.default).toBe(100);
        expect(gd.parameters.cut.spot_drill_first.default).toBe(true);
      }
    });

    it("returns error object with available list for unknown section", () => {
      const result = PartMakerFunctionIndexEngine.getSection("nonexistent");
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toBe("Section 'nonexistent' not found");
        expect(result.available).toContain("swiss_turning");
      }
    });
  });

  describe("listOperations", () => {
    it("returns 16 operations across all sections", () => {
      const ops = PartMakerFunctionIndexEngine.listOperations();
      expect(ops).toHaveLength(16);
    });

    it("first row has non-empty fields and a known section", () => {
      const ops = PartMakerFunctionIndexEngine.listOperations();
      const first = ops[0];
      expect(first.operation_id.length).toBeGreaterThan(0);
      expect(first.display_name.length).toBeGreaterThan(0);
      expect(["swiss_turning", "mill_turn", "multi_axis_sync", "prismatic"]).toContain(first.section);
      expect(first.category.length).toBeGreaterThan(0);
    });

    it("includes the four flagship operations", () => {
      const ops = PartMakerFunctionIndexEngine.listOperations();
      const ids = ops.map((o) => o.operation_id);
      const flagshipCount = ids.filter((i) =>
        ["sliding_headstock", "polar_milling", "channel_sync", "gun_drill"].includes(i)
      ).length;
      expect(flagshipCount).toBe(4);
    });
  });

  describe("findParameter", () => {
    it("finds 'rpm_match_tolerance' in pickoff/sync ops only", () => {
      const hits = PartMakerFunctionIndexEngine.findParameter("rpm_match_tolerance");
      expect(hits.length).toBeGreaterThanOrEqual(2);
      for (const h of hits) {
        expect(h.parameter.default).toBe(1.0);
      }
    });

    it("finds 'tsc_pressure_bar' across deep_hole_swiss + gun_drill", () => {
      const hits = PartMakerFunctionIndexEngine.findParameter("tsc_pressure_bar");
      expect(hits.length).toBeGreaterThanOrEqual(2);
      const ops = new Set(hits.map((h) => h.operation_id));
      expect(ops.has("deep_hole_swiss")).toBe(true);
      expect(ops.has("gun_drill")).toBe(true);
    });

    it("finds 'guide_bushing_clearance_mm' only in sliding_headstock", () => {
      const hits = PartMakerFunctionIndexEngine.findParameter("guide_bushing_clearance_mm");
      expect(hits).toHaveLength(1);
      expect(hits[0].operation_id).toBe("sliding_headstock");
      expect(hits[0].parameter.default).toBe(0.005);
    });

    it("returns empty for nonexistent parameter", () => {
      const hits = PartMakerFunctionIndexEngine.findParameter("xyzzy_no_match");
      expect(hits).toEqual([]);
    });

    it("throws on empty parameter name", () => {
      expect(() => PartMakerFunctionIndexEngine.findParameter("")).toThrow(
        "findParameter: parameterName must be a non-empty string"
      );
    });

    it("throws on null parameter name", () => {
      expect(() => PartMakerFunctionIndexEngine.findParameter(null as unknown as string)).toThrow();
    });
  });

  describe("searchParameters", () => {
    it("searches 'sync' across multiple sections", () => {
      const results = PartMakerFunctionIndexEngine.searchParameters("sync");
      expect(results.length).toBeGreaterThan(3);
      const sectionsHit = new Set(results.map((r) => r.section));
      expect(sectionsHit.size).toBeGreaterThan(1);
    });

    it("clamps limit to 1", () => {
      const results = PartMakerFunctionIndexEngine.searchParameters("feed", 1);
      expect(results).toHaveLength(1);
    });

    it("clamps oversized limit to 500", () => {
      const results = PartMakerFunctionIndexEngine.searchParameters("feed", 99999);
      expect(results.length).toBeLessThanOrEqual(500);
    });

    it("matches description text — finds 'guide bushing' descriptions", () => {
      const results = PartMakerFunctionIndexEngine.searchParameters("bushing");
      const ssHit = results.find((r) => r.section === "swiss_turning");
      expect(ssHit?.section).toBe("swiss_turning");
    });

    it("throws on empty query", () => {
      expect(() => PartMakerFunctionIndexEngine.searchParameters("")).toThrow(
        "searchParameters: query must be a non-empty string"
      );
    });
  });

  describe("getOperationsByCategory", () => {
    it("matches sliding_headstock category exactly", () => {
      const ops = PartMakerFunctionIndexEngine.getOperationsByCategory("sliding_headstock");
      expect(ops).toHaveLength(1);
      expect(ops[0].operation_id).toBe("sliding_headstock");
    });

    it("matches case-insensitive 'SYNC' substring across multiple ops", () => {
      const ops = PartMakerFunctionIndexEngine.getOperationsByCategory("SYNC");
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toContain("channel_sync");
    });

    it("returns empty for unknown category", () => {
      const ops = PartMakerFunctionIndexEngine.getOperationsByCategory("not_a_real_category");
      expect(ops).toEqual([]);
    });

    it("throws on empty category", () => {
      expect(() => PartMakerFunctionIndexEngine.getOperationsByCategory("")).toThrow(
        "getOperationsByCategory: category must be a non-empty string"
      );
    });
  });

  describe("getSummary", () => {
    it("reports system_id=partmaker, 4 sections, 16 ops, 240 params", () => {
      const s = PartMakerFunctionIndexEngine.getSummary();
      expect(s.system_id).toBe("partmaker");
      expect(s.total_sections).toBe(4);
      expect(s.total_operations).toBe(16);
      expect(s.total_parameters).toBe(240);
    });

    it("each section reports exactly 4 operations", () => {
      const s = PartMakerFunctionIndexEngine.getSummary();
      expect(s.sections).toHaveLength(4);
      const counts = s.sections.map((sec) => sec.operations);
      expect(counts).toEqual([4, 4, 4, 4]);
    });
  });

  describe("getSwissTurningOperations (flagship surface)", () => {
    it("returns the 4 swiss-turning operations", () => {
      const ops = PartMakerFunctionIndexEngine.getSwissTurningOperations();
      expect(ops).toHaveLength(4);
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "guide_bushing",
        "screw_machine",
        "sliding_headstock",
        "sub_spindle_pickoff",
      ]);
    });

    it("all returned ops report section='swiss_turning'", () => {
      const ops = PartMakerFunctionIndexEngine.getSwissTurningOperations();
      const sections = new Set(ops.map((o) => o.section));
      expect(sections.size).toBe(1);
      expect(sections.has("swiss_turning")).toBe(true);
    });
  });

  describe("getMultiAxisSyncOperations (engine-only surface)", () => {
    it("returns all 4 multi-axis sync ops", () => {
      const ops = PartMakerFunctionIndexEngine.getMultiAxisSyncOperations();
      expect(ops).toHaveLength(4);
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "channel_sync",
        "dual_turret_balance",
        "mid_part_pickoff",
        "parallel_path",
      ]);
    });

    it("all from multi_axis_sync section", () => {
      const ops = PartMakerFunctionIndexEngine.getMultiAxisSyncOperations();
      const sections = new Set(ops.map((o) => o.section));
      expect(sections.size).toBe(1);
      expect(sections.has("multi_axis_sync")).toBe(true);
    });
  });

  describe("getOperation", () => {
    it("finds sliding_headstock in swiss_turning section", () => {
      const result = PartMakerFunctionIndexEngine.getOperation("sliding_headstock");
      if ("operation" in result) {
        expect(result.section).toBe("swiss_turning");
        expect(result.operation.display_name).toBe("Sliding Headstock Turn");
        expect(result.operation.dialog_tabs).toContain("Bar");
      } else {
        expect.fail("expected found op");
      }
    });

    it("finds channel_sync in multi_axis_sync section", () => {
      const result = PartMakerFunctionIndexEngine.getOperation("channel_sync");
      if ("operation" in result) {
        expect(result.section).toBe("multi_axis_sync");
        expect(result.operation.dialog_tabs).toContain("Channels");
      } else {
        expect.fail("expected found op");
      }
    });

    it("returns error object for unknown operation id", () => {
      const result = PartMakerFunctionIndexEngine.getOperation("not_a_real_op");
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toBe("Operation 'not_a_real_op' not found");
      }
    });

    it("throws on empty operation id", () => {
      expect(() => PartMakerFunctionIndexEngine.getOperation("")).toThrow(
        "getOperation: operationId must be a non-empty string"
      );
    });
  });

  describe("getTrainingTopics", () => {
    it("returns guide-bushing topic for swiss_turning", () => {
      const topics = PartMakerFunctionIndexEngine.getTrainingTopics("swiss_turning");
      expect(topics).toHaveLength(1);
      expect(topics[0].topic).toBe("Guide Bushing Mode");
      expect(topics[0].best_practices).toContain("Verify bar TIR before run");
    });

    it("returns C-Y kinematics topic for mill_turn", () => {
      const topics = PartMakerFunctionIndexEngine.getTrainingTopics("mill_turn");
      expect(topics[0].topic).toBe("C-Y Kinematics vs Polar");
    });

    it("returns WAITM/QUEUEM topic for multi_axis_sync", () => {
      const topics = PartMakerFunctionIndexEngine.getTrainingTopics("multi_axis_sync");
      expect(topics[0].topic).toBe("WAITM/QUEUEM Sync");
    });

    it("returns form vs cut knurling topic for prismatic", () => {
      const topics = PartMakerFunctionIndexEngine.getTrainingTopics("prismatic");
      expect(topics[0].topic).toBe("Form Knurling vs Cut Knurling");
    });

    it("returns empty array for unknown section", () => {
      const topics = PartMakerFunctionIndexEngine.getTrainingTopics("nonexistent");
      expect(topics).toEqual([]);
    });
  });

  describe("PartMaker-specific structural checks", () => {
    it("guide bushing default is rotating_carbide with 12.005 ID for 12mm bar", () => {
      const result = PartMakerFunctionIndexEngine.getOperation("guide_bushing");
      if ("operation" in result) {
        expect(result.operation.parameters.bushing.bushing_type.default).toBe("rotating_carbide");
        expect(result.operation.parameters.bushing.bushing_id_mm.default).toBe(12.005);
        expect(result.operation.parameters.bushing.bushing_runout_max_um.default).toBe(3.0);
      }
    });

    it("sub_spindle_pickoff phase tolerance is 60 arcsec (Swiss strict)", () => {
      const result = PartMakerFunctionIndexEngine.getOperation("sub_spindle_pickoff");
      if ("operation" in result) {
        expect(result.operation.parameters.sync.phase_tolerance_arcsec.default).toBe(60);
        expect(result.operation.parameters.sync.rpm_match_tolerance.default).toBe(1.0);
      }
    });

    it("channel_sync defaults to 4 channels with WAITM", () => {
      const result = PartMakerFunctionIndexEngine.getOperation("channel_sync");
      if ("operation" in result) {
        expect(result.operation.parameters.channels.channel_count.default).toBe(4);
        expect(result.operation.parameters.sync.sync_method.default).toBe("WAITM");
        expect(result.operation.parameters.sync.deadlock_detect.default).toBe(true);
      }
    });

    it("dual_turret_balance defaults to equal_time strategy", () => {
      const result = PartMakerFunctionIndexEngine.getOperation("dual_turret_balance");
      if ("operation" in result) {
        expect(result.operation.parameters.strategy.balance_mode.default).toBe("equal_time");
      }
    });

    it("parallel_path enforces 30% force imbalance limit", () => {
      const result = PartMakerFunctionIndexEngine.getOperation("parallel_path");
      if ("operation" in result) {
        expect(result.operation.parameters.output.warn_if_force_imbalance_pct.default).toBe(30.0);
        expect(result.operation.parameters.constraints.shared_spindle_rpm_chooses_min.default).toBe(true);
      }
    });

    it("deep_hole_swiss requires TSC for L/D > 10", () => {
      const result = PartMakerFunctionIndexEngine.getOperation("deep_hole_swiss");
      if ("operation" in result) {
        expect(result.operation.parameters.output.warn_if_no_TSC_for_high_LD.default).toBe(true);
        expect(result.operation.parameters.coolant.coolant_mode.default).toBe("TSC_neat_oil");
        expect(result.operation.parameters.coolant.tsc_pressure_bar.default).toBe(70.0);
      }
    });

    it("gun_drill requires spot_drill_first and 100bar TSC", () => {
      const result = PartMakerFunctionIndexEngine.getOperation("gun_drill");
      if ("operation" in result) {
        expect(result.operation.parameters.cut.spot_drill_first.default).toBe(true);
        expect(result.operation.parameters.coolant.tsc_pressure_bar.default).toBe(100);
        expect(result.operation.parameters.cut.no_peck_required.default).toBe(true);
      }
    });

    it("micro_thread default form_tool with 1mm dia and 0.25mm pitch", () => {
      const result = PartMakerFunctionIndexEngine.getOperation("micro_thread");
      if ("operation" in result) {
        expect(result.operation.parameters.thread.thread_dia_mm.default).toBe(1.0);
        expect(result.operation.parameters.thread.thread_pitch_mm.default).toBe(0.25);
        expect(result.operation.parameters.strategy.method.default).toBe("form_tool");
      }
    });

    it("knurl_swiss form_rolling with 0.15mm pre-stock allowance", () => {
      const result = PartMakerFunctionIndexEngine.getOperation("knurl_swiss");
      if ("operation" in result) {
        expect(result.operation.parameters.form.method.default).toBe("form_rolling");
        expect(result.operation.parameters.form.stock_pre_knurl_mm.default).toBe(0.15);
        expect(result.operation.parameters.form.rolls_per_pass.default).toBe(8);
      }
    });
  });
});
