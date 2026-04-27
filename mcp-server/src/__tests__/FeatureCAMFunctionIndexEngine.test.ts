/**
 * FeatureCAMFunctionIndexEngine.test.ts — CAM-EXHAUST-MS0/U-CAM-FIDX-24
 *
 * Real-data tests against the four FeatureCAM (Autodesk) catalogs.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { FeatureCAMFunctionIndexEngine } from "../engines/FeatureCAMFunctionIndexEngine";

describe("FeatureCAMFunctionIndexEngine", () => {
  beforeEach(() => {
    FeatureCAMFunctionIndexEngine.resetCache();
  });

  describe("loadIndex / getIndex", () => {
    it("loads all four sections from disk", () => {
      const idx = FeatureCAMFunctionIndexEngine.getIndex();
      expect(idx.system_id).toBe("featurecam");
      const keys = Object.keys(idx.sections).sort();
      expect(keys).toEqual(["afr", "drilling", "milling", "turning"]);
    });

    it("aggregates total operations to 16 (4 ops × 4 sections)", () => {
      const idx = FeatureCAMFunctionIndexEngine.getIndex();
      expect(idx.total_operations).toBe(16);
    });

    it("aggregates total parameters to 240", () => {
      const idx = FeatureCAMFunctionIndexEngine.getIndex();
      expect(idx.total_parameters).toBe(240);
    });

    it("collects categories from all four sections", () => {
      const idx = FeatureCAMFunctionIndexEngine.getIndex();
      expect(idx.categories).toContain("afr_enable");
      expect(idx.categories).toContain("face_milling");
      expect(idx.categories).toContain("rough_turning");
      expect(idx.categories).toContain("drill");
    });

    it("caches loaded index — second call returns identical object", () => {
      const a = FeatureCAMFunctionIndexEngine.getIndex();
      const b = FeatureCAMFunctionIndexEngine.getIndex();
      expect(a).toBe(b);
    });

    it("resetCache forces a fresh load with stable totals", () => {
      const a = FeatureCAMFunctionIndexEngine.getIndex();
      FeatureCAMFunctionIndexEngine.resetCache();
      const b = FeatureCAMFunctionIndexEngine.getIndex();
      expect(a).not.toBe(b);
      expect(b.total_operations).toBe(16);
      expect(b.total_parameters).toBe(240);
    });
  });

  describe("listSections", () => {
    it("returns the four expected section keys", () => {
      const sections = FeatureCAMFunctionIndexEngine.listSections().sort();
      expect(sections).toEqual(["afr", "drilling", "milling", "turning"]);
    });
  });

  describe("getSection", () => {
    it("returns afr section with afr_enable flagship", () => {
      const section = FeatureCAMFunctionIndexEngine.getSection("afr");
      expect("error" in section).toBe(false);
      if ("operations" in section) {
        expect(Object.keys(section.operations)).toHaveLength(4);
        expect(section.operations.afr_enable.display_name).toBe("Automatic Feature Recognition (AFR)");
        expect(section.operations.afr_enable.parameters.detection.detect_holes.default).toBe(true);
      }
    });

    it("returns milling section with pocket_milling trochoidal default", () => {
      const section = FeatureCAMFunctionIndexEngine.getSection("milling");
      if ("operations" in section) {
        const pkt = section.operations.pocket_milling;
        expect(pkt.parameters.rough.rough_strategy.default).toBe("trochoidal_HSM");
        expect(pkt.parameters.rough.stepover_pct_of_dia.default).toBe(8);
      }
    });

    it("returns turning section with constant_volume thread default", () => {
      const section = FeatureCAMFunctionIndexEngine.getSection("turning");
      if ("operations" in section) {
        const thr = section.operations.thread_turning;
        expect(thr.parameters.infeed.infeed_mode.default).toBe("constant_volume");
        expect(thr.parameters.thread.thread_pitch_mm.default).toBe(1.5);
      }
    });

    it("returns drilling section with no_dwell ream rule", () => {
      const section = FeatureCAMFunctionIndexEngine.getSection("drilling");
      if ("operations" in section) {
        const r = section.operations.ream;
        expect(r.parameters.output.no_dwell_at_bottom.default).toBe(true);
        expect(r.parameters.cut.ream_rpm.default).toBe(600);
      }
    });

    it("returns error object with available list for unknown section", () => {
      const result = FeatureCAMFunctionIndexEngine.getSection("nonexistent");
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toBe("Section 'nonexistent' not found");
        expect(result.available).toContain("afr");
      }
    });
  });

  describe("listOperations", () => {
    it("returns 16 operations across all sections", () => {
      const ops = FeatureCAMFunctionIndexEngine.listOperations();
      expect(ops).toHaveLength(16);
    });

    it("first row carries non-empty fields and recognized section", () => {
      const ops = FeatureCAMFunctionIndexEngine.listOperations();
      const first = ops[0];
      expect(first.operation_id.length).toBeGreaterThan(0);
      expect(first.display_name.length).toBeGreaterThan(0);
      expect(["afr", "milling", "turning", "drilling"]).toContain(first.section);
      expect(first.category.length).toBeGreaterThan(0);
    });

    it("includes the four flagship operations", () => {
      const ops = FeatureCAMFunctionIndexEngine.listOperations();
      const ids = ops.map((o) => o.operation_id);
      const flagshipCount = ids.filter((i) =>
        ["afr_enable", "pocket_milling", "rough_turning", "drill"].includes(i)
      ).length;
      expect(flagshipCount).toBe(4);
    });
  });

  describe("findParameter", () => {
    it("finds 'css_speed_m_per_min' across multiple turning ops", () => {
      const hits = FeatureCAMFunctionIndexEngine.findParameter("css_speed_m_per_min");
      expect(hits.length).toBeGreaterThanOrEqual(3);
      for (const h of hits) {
        expect(h.section).toBe("turning");
      }
    });

    it("finds 'detect_holes' only in afr_enable", () => {
      const hits = FeatureCAMFunctionIndexEngine.findParameter("detect_holes");
      expect(hits).toHaveLength(1);
      expect(hits[0].operation_id).toBe("afr_enable");
      expect(hits[0].parameter.default).toBe(true);
    });

    it("finds 'rigid_tap' only in tap op", () => {
      const hits = FeatureCAMFunctionIndexEngine.findParameter("rigid_tap");
      expect(hits).toHaveLength(1);
      expect(hits[0].operation_id).toBe("tap");
      expect(hits[0].parameter.default).toBe(true);
    });

    it("returns empty for nonexistent parameter", () => {
      const hits = FeatureCAMFunctionIndexEngine.findParameter("xyzzy_no_match");
      expect(hits).toEqual([]);
    });

    it("throws on empty parameter name", () => {
      expect(() => FeatureCAMFunctionIndexEngine.findParameter("")).toThrow(
        "findParameter: parameterName must be a non-empty string"
      );
    });

    it("throws on null parameter name", () => {
      expect(() => FeatureCAMFunctionIndexEngine.findParameter(null as unknown as string)).toThrow();
    });
  });

  describe("searchParameters", () => {
    it("searches 'feed' across multiple sections", () => {
      const results = FeatureCAMFunctionIndexEngine.searchParameters("feed");
      expect(results.length).toBeGreaterThan(3);
      const sectionsHit = new Set(results.map((r) => r.section));
      expect(sectionsHit.size).toBeGreaterThan(1);
    });

    it("clamps limit to 1", () => {
      const results = FeatureCAMFunctionIndexEngine.searchParameters("feed", 1);
      expect(results).toHaveLength(1);
    });

    it("clamps oversized limit to 500", () => {
      const results = FeatureCAMFunctionIndexEngine.searchParameters("feed", 99999);
      expect(results.length).toBeLessThanOrEqual(500);
    });

    it("matches description text — finds 'AFR' in description", () => {
      const results = FeatureCAMFunctionIndexEngine.searchParameters("AFR");
      const afrHit = results.find((r) => r.section === "afr");
      expect(afrHit?.section).toBe("afr");
    });

    it("throws on empty query", () => {
      expect(() => FeatureCAMFunctionIndexEngine.searchParameters("")).toThrow(
        "searchParameters: query must be a non-empty string"
      );
    });
  });

  describe("getOperationsByCategory", () => {
    it("matches afr_enable with single hit", () => {
      const ops = FeatureCAMFunctionIndexEngine.getOperationsByCategory("afr_enable");
      expect(ops).toHaveLength(1);
      expect(ops[0].operation_id).toBe("afr_enable");
    });

    it("matches case-insensitive 'TURN' substring across multiple turning ops", () => {
      const ops = FeatureCAMFunctionIndexEngine.getOperationsByCategory("TURN");
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toContain("rough_turning");
      expect(ids).toContain("finish_turning");
    });

    it("returns empty for unknown category", () => {
      const ops = FeatureCAMFunctionIndexEngine.getOperationsByCategory("not_a_real_category");
      expect(ops).toEqual([]);
    });

    it("throws on empty category", () => {
      expect(() => FeatureCAMFunctionIndexEngine.getOperationsByCategory("")).toThrow(
        "getOperationsByCategory: category must be a non-empty string"
      );
    });
  });

  describe("getSummary", () => {
    it("reports system_id=featurecam, 4 sections, 16 ops, 240 params", () => {
      const s = FeatureCAMFunctionIndexEngine.getSummary();
      expect(s.system_id).toBe("featurecam");
      expect(s.total_sections).toBe(4);
      expect(s.total_operations).toBe(16);
      expect(s.total_parameters).toBe(240);
    });

    it("each of the 4 section entries reports exactly 4 operations", () => {
      const s = FeatureCAMFunctionIndexEngine.getSummary();
      expect(s.sections).toHaveLength(4);
      const counts = s.sections.map((sec) => sec.operations);
      expect(counts).toEqual([4, 4, 4, 4]);
    });
  });

  describe("getAFROperations (flagship surface)", () => {
    it("returns the 4 AFR operations", () => {
      const ops = FeatureCAMFunctionIndexEngine.getAFROperations();
      expect(ops).toHaveLength(4);
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "afr_classify",
        "afr_enable",
        "afr_suggest",
        "manual_feature",
      ]);
    });

    it("all AFR ops report section='afr'", () => {
      const ops = FeatureCAMFunctionIndexEngine.getAFROperations();
      const sections = new Set(ops.map((o) => o.section));
      expect(sections.size).toBe(1);
      expect(sections.has("afr")).toBe(true);
    });
  });

  describe("getHolemakingOperations (engine-only surface)", () => {
    it("returns the 4 drilling ops", () => {
      const ops = FeatureCAMFunctionIndexEngine.getHolemakingOperations();
      expect(ops).toHaveLength(4);
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual(["bore", "drill", "ream", "tap"]);
    });

    it("all from drilling section", () => {
      const ops = FeatureCAMFunctionIndexEngine.getHolemakingOperations();
      const sections = new Set(ops.map((o) => o.section));
      expect(sections.size).toBe(1);
      expect(sections.has("drilling")).toBe(true);
    });
  });

  describe("getOperation", () => {
    it("finds afr_enable in afr section", () => {
      const result = FeatureCAMFunctionIndexEngine.getOperation("afr_enable");
      if ("operation" in result) {
        expect(result.section).toBe("afr");
        expect(result.operation.dialog_tabs).toContain("Detection");
      } else {
        expect.fail("expected found op");
      }
    });

    it("finds bore in drilling section", () => {
      const result = FeatureCAMFunctionIndexEngine.getOperation("bore");
      if ("operation" in result) {
        expect(result.section).toBe("drilling");
        expect(result.operation.parameters.cycle.cycle_type.default).toBe("G85");
      } else {
        expect.fail("expected found op");
      }
    });

    it("returns error object for unknown operation id", () => {
      const result = FeatureCAMFunctionIndexEngine.getOperation("not_a_real_op");
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toBe("Operation 'not_a_real_op' not found");
      }
    });

    it("throws on empty operation id", () => {
      expect(() => FeatureCAMFunctionIndexEngine.getOperation("")).toThrow(
        "getOperation: operationId must be a non-empty string"
      );
    });
  });

  describe("getTrainingTopics", () => {
    it("returns AFR engine topic for afr section", () => {
      const topics = FeatureCAMFunctionIndexEngine.getTrainingTopics("afr");
      expect(topics).toHaveLength(1);
      expect(topics[0].topic).toBe("FeatureCAM AFR Engine");
      expect(topics[0].best_practices).toContain("Run AFR before manual feature definition");
    });

    it("returns trochoidal HSM topic for milling", () => {
      const topics = FeatureCAMFunctionIndexEngine.getTrainingTopics("milling");
      expect(topics[0].topic).toBe("Trochoidal HSM Pocket");
    });

    it("returns auto-feed-from-Ra topic for turning", () => {
      const topics = FeatureCAMFunctionIndexEngine.getTrainingTopics("turning");
      expect(topics[0].topic).toBe("Auto Feed from Ra");
    });

    it("returns reamer score-mark topic for drilling", () => {
      const topics = FeatureCAMFunctionIndexEngine.getTrainingTopics("drilling");
      expect(topics[0].topic).toBe("Reamer Score Mark Prevention");
    });

    it("returns empty array for unknown section", () => {
      const topics = FeatureCAMFunctionIndexEngine.getTrainingTopics("nonexistent");
      expect(topics).toEqual([]);
    });
  });

  describe("FeatureCAM-specific structural checks", () => {
    it("AFR detects 6 feature types by default", () => {
      const result = FeatureCAMFunctionIndexEngine.getOperation("afr_enable");
      if ("operation" in result) {
        const det = result.operation.parameters.detection;
        expect(det.detect_holes.default).toBe(true);
        expect(det.detect_pockets.default).toBe(true);
        expect(det.detect_slots.default).toBe(true);
        expect(det.detect_bosses.default).toBe(true);
        expect(det.detect_chamfers.default).toBe(true);
        expect(det.detect_threads.default).toBe(true);
      }
    });

    it("AFR classify defaults to 80% confidence threshold", () => {
      const result = FeatureCAMFunctionIndexEngine.getOperation("afr_classify");
      if ("operation" in result) {
        expect(result.operation.parameters.classify.min_confidence_pct.default).toBe(80.0);
        expect(result.operation.parameters.tolerance.h7_for_bores.default).toBe(true);
      }
    });

    it("SmartCut suggests rough+finish + alternatives by default", () => {
      const result = FeatureCAMFunctionIndexEngine.getOperation("afr_suggest");
      if ("operation" in result) {
        expect(result.operation.parameters.strategy.strategy_engine.default).toBe("FCAM_SmartCut");
        expect(result.operation.parameters.strategy.rough_then_finish.default).toBe(true);
        expect(result.operation.parameters.output.report_alternative_strategies.default).toBe(true);
      }
    });

    it("face_milling defaults to 75% engagement, climb cut", () => {
      const result = FeatureCAMFunctionIndexEngine.getOperation("face_milling");
      if ("operation" in result) {
        expect(result.operation.parameters.cut.step_over_pct_of_dia.default).toBe(75);
        expect(result.operation.parameters.output.climb_or_conventional.default).toBe("climb");
      }
    });

    it("pocket_milling trochoidal HSM at 8% stepover, helix entry", () => {
      const result = FeatureCAMFunctionIndexEngine.getOperation("pocket_milling");
      if ("operation" in result) {
        expect(result.operation.parameters.rough.rough_strategy.default).toBe("trochoidal_HSM");
        expect(result.operation.parameters.rough.stepover_pct_of_dia.default).toBe(8);
        expect(result.operation.parameters.entry.entry_method.default).toBe("helix");
      }
    });

    it("rib_milling defaults to alternating climb/conventional for force balance", () => {
      const result = FeatureCAMFunctionIndexEngine.getOperation("rib_milling");
      if ("operation" in result) {
        expect(result.operation.parameters.strategy.approach_strategy.default).toBe("alternating_climb_conv");
        expect(result.operation.parameters.output.warn_if_aspect_exceeds.default).toBe(8.0);
      }
    });

    it("finish_turning auto-derives feed from Ra", () => {
      const result = FeatureCAMFunctionIndexEngine.getOperation("finish_turning");
      if ("operation" in result) {
        expect(result.operation.parameters.finish.auto_feed_from_ra.default).toBe(true);
        expect(result.operation.parameters.finish.spring_pass.default).toBe(true);
        expect(result.operation.parameters.insert.use_wiper_geometry.default).toBe(true);
      }
    });

    it("tap defaults to rigid M29 + warns on wrong predrill", () => {
      const result = FeatureCAMFunctionIndexEngine.getOperation("tap");
      if ("operation" in result) {
        expect(result.operation.parameters.strategy.rigid_tap.default).toBe(true);
        expect(result.operation.parameters.output.M29_before_cycle.default).toBe(true);
        expect(result.operation.parameters.output.warn_if_pre_drill_wrong.default).toBe(true);
      }
    });

    it("ream enforces no_dwell + verifies runout pre-run", () => {
      const result = FeatureCAMFunctionIndexEngine.getOperation("ream");
      if ("operation" in result) {
        expect(result.operation.parameters.output.no_dwell_at_bottom.default).toBe(true);
        expect(result.operation.parameters.output.verify_reamer_runout_before_run.default).toBe(true);
        expect(result.operation.parameters.cut.ream_rpm.default).toBe(600);
      }
    });
  });
});
