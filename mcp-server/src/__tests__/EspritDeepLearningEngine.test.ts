/**
 * EspritDeepLearningEngine Tests — KILO-CAM-MASTERY-MS0 campaign iter 7
 *
 * Verifies the Esprit DL deep-reasoning surface: strategy selection,
 * parameter validation, kilo refuse-list enforcement.
 *
 * @milestone KILO-CAM-MASTERY-MS0
 */

import { describe, it, expect } from "vitest";
import {
  espritDeepLearningEngine,
  EspritStrategyRecommendationSchema,
  type EspritFeatureInput,
} from "../engines/EspritDeepLearningEngine.js";

const FEATURE_POCKET: EspritFeatureInput = {
  feature_id: "F1",
  feature_type: "closed_2d_pocket",
  material_iso_group: "P",
  tolerance_total_mm: 0.05,
};

const FEATURE_5AX_BLADE: EspritFeatureInput = {
  feature_id: "F2",
  feature_type: "blade_or_blisk",
  material_iso_group: "S",
  tolerance_total_mm: 0.025,
};

const FEATURE_UNKNOWN: EspritFeatureInput = {
  feature_id: "F3",
  feature_type: "made_up_garbage",
  material_iso_group: "P",
  tolerance_total_mm: 0.1,
};

const FEATURE_NO_TOL: EspritFeatureInput = {
  feature_id: "F4",
  feature_type: "planar_face",
  material_iso_group: "P",
  // tolerance_total_mm intentionally omitted
};

describe("EspritDeepLearningEngine", () => {
  describe("selectOptimalStrategy", () => {
    it("closed_2d_pocket → primary strategy es.2d.pocketing", () => {
      const rec = espritDeepLearningEngine.selectOptimalStrategy(FEATURE_POCKET);
      expect(rec.recommended_strategy).toBe("es.2d.pocketing");
    });

    it("closed_2d_pocket offers 2 candidate strategies (pocketing + profitmilling)", () => {
      const rec = espritDeepLearningEngine.selectOptimalStrategy(FEATURE_POCKET);
      expect(rec.candidate_strategies).toEqual(["es.2d.pocketing", "es.2d.profitmilling"]);
    });

    it("blade_or_blisk → primary es.5x.blade_impeller (high confidence, single candidate)", () => {
      const rec = espritDeepLearningEngine.selectOptimalStrategy(FEATURE_5AX_BLADE);
      expect(rec.recommended_strategy).toBe("es.5x.blade_impeller");
      expect(rec.confidence).toBeCloseTo(0.95, 2);
    });

    it("tolerance flows through to recommendation (refuse-list: tolerance-stack)", () => {
      const rec = espritDeepLearningEngine.selectOptimalStrategy(FEATURE_5AX_BLADE);
      expect(rec.tolerance_total_mm).toBe(0.025);
    });

    it("doc_anchor cites the Esprit reference", () => {
      const rec = espritDeepLearningEngine.selectOptimalStrategy(FEATURE_POCKET);
      expect(rec.doc_anchor).toMatch(/Esprit 2024/);
    });
  });

  describe("refuse: no silent fallback for unknown feature types", () => {
    it("unknown feature_type returns recommended_strategy=null", () => {
      const rec = espritDeepLearningEngine.selectOptimalStrategy(FEATURE_UNKNOWN);
      expect(rec.recommended_strategy).toBe(null);
    });

    it("unknown feature_type returns empty candidate_strategies", () => {
      const rec = espritDeepLearningEngine.selectOptimalStrategy(FEATURE_UNKNOWN);
      expect(rec.candidate_strategies.length).toBe(0);
    });

    it("unknown feature_type surfaces a gap message naming the feature type", () => {
      const rec = espritDeepLearningEngine.selectOptimalStrategy(FEATURE_UNKNOWN);
      expect(rec.gap).not.toBeNull();
      expect(rec.gap!).toMatch(/made_up_garbage/);
    });

    it("unknown feature_type has confidence 0", () => {
      const rec = espritDeepLearningEngine.selectOptimalStrategy(FEATURE_UNKNOWN);
      expect(rec.confidence).toBe(0);
    });
  });

  describe("validateParameters — hard gate", () => {
    it("good feature with tolerance + known type passes", () => {
      const v = espritDeepLearningEngine.validateParameters(FEATURE_POCKET);
      expect(v.passed).toBe(true);
      expect(v.failures.length).toBe(0);
    });

    it("feature missing tolerance fails the PMI gate (refuse-list)", () => {
      const v = espritDeepLearningEngine.validateParameters(FEATURE_NO_TOL);
      expect(v.passed).toBe(false);
      expect(v.failures.some(f => f.includes("tolerance_total_mm"))).toBe(true);
    });

    it("feature with unknown type fails the no-silent-fallback gate", () => {
      const v = espritDeepLearningEngine.validateParameters(FEATURE_UNKNOWN);
      expect(v.passed).toBe(false);
      expect(v.failures.some(f => f.includes("no Esprit strategy mapping"))).toBe(true);
    });
  });

  describe("explainStrategy", () => {
    it("returns the strategy + doc anchor", () => {
      const e = espritDeepLearningEngine.explainStrategy("es.5x.swarf");
      expect(e.strategy).toBe("es.5x.swarf");
      expect(e.doc_anchor).toMatch(/Esprit/);
    });
  });

  describe("R12 schema gates", () => {
    it("schema rejects invalid material iso_group", () => {
      const bad = { ...FEATURE_POCKET, material_iso_group: "Z" as never };
      expect(() => espritDeepLearningEngine.selectOptimalStrategy(bad as EspritFeatureInput)).toThrow();
    });

    it("schema rejects negative tolerance", () => {
      const bad = { ...FEATURE_POCKET, tolerance_total_mm: -0.01 };
      expect(() => espritDeepLearningEngine.selectOptimalStrategy(bad as EspritFeatureInput)).toThrow();
    });

    it("recommendation passes own zod schema round-trip", () => {
      const rec = espritDeepLearningEngine.selectOptimalStrategy(FEATURE_POCKET);
      expect(() => EspritStrategyRecommendationSchema.parse(rec)).not.toThrow();
    });

    it("output fingerprints source for auditability", () => {
      const rec = espritDeepLearningEngine.selectOptimalStrategy(FEATURE_POCKET);
      expect(rec.source).toBe("esprit_deep_learning");
    });
  });

  describe("Feature map coverage", () => {
    it("covers all 5-axis specialty paths (port_rough, port_finish, blade)", () => {
      expect(espritDeepLearningEngine.featureMap.internal_port_rough).toContain("es.5x.port_rough");
      expect(espritDeepLearningEngine.featureMap.internal_port_finish).toContain("es.5x.port_finish");
      expect(espritDeepLearningEngine.featureMap.blade_or_blisk).toContain("es.5x.blade_impeller");
    });

    it("covers mill-turn paths (Y-axis, B-axis live, sub-spindle)", () => {
      expect(espritDeepLearningEngine.featureMap.off_center_y_milling).toContain("es.mt.y_axis_mill");
      expect(espritDeepLearningEngine.featureMap.b_axis_live_tooling).toContain("es.mt.b_axis_live");
      expect(espritDeepLearningEngine.featureMap.sub_spindle_handoff).toContain("es.mt.sub_spindle_transfer");
    });

    it("covers lathe profile + finish paths", () => {
      expect(espritDeepLearningEngine.featureMap.turn_blank).toContain("es.lathe.solidturn_rough");
      expect(espritDeepLearningEngine.featureMap.turn_finish_profile).toContain("es.lathe.solidturn_finish");
    });
  });
});
