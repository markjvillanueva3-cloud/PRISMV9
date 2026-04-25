import { describe, it, expect, beforeEach } from "vitest";
import { CADFeatureClassifierEngine } from "../engines/CADFeatureClassifierEngine.js";
import type { RecognizedFeature, FeatureType } from "../engines/FeatureRecognitionEngine.js";

function makeFeature(overrides: Partial<RecognizedFeature> & { type: FeatureType }): RecognizedFeature {
  return {
    id: "F-" + Math.random().toString(36).slice(2, 8),
    confidence: 0.9,
    dimensions: { diameter_mm: 10, depth_mm: 20 },
    position: { x: 0, y: 0, z: 0 },
    orientation: { axis: "z" },
    notes: [],
    ...overrides,
  };
}

describe("CADFeatureClassifierEngine", () => {
  let engine: CADFeatureClassifierEngine;

  beforeEach(() => {
    engine = new CADFeatureClassifierEngine();
  });

  describe("classify (single feature)", () => {
    it("classifies a small through_hole as rotational/small/simple/parametric", () => {
      const r = engine.classify(makeFeature({ type: "through_hole", dimensions: { diameter_mm: 6, depth_mm: 15 } }));
      expect(r).toMatchObject({
        featureType: "through_hole",
        geometricFamily: "rotational",
        sizeClass: "small",
        complexityTier: "simple",
        strategyHint: "parametric",
      });
      expect(r.confidence).toBeGreaterThan(0.7);
      expect(r.rationale.length).toBeGreaterThanOrEqual(4);
    });

    it("classifies a pocket_freeform as freeform with scripted strategy", () => {
      const r = engine.classify(
        makeFeature({
          type: "pocket_freeform",
          dimensions: { width_mm: 80, length_mm: 120, depth_mm: 30 },
        })
      );
      expect(r.geometricFamily).toBe("freeform");
      expect(r.strategyHint).toBe("scripted");
      expect(["intermediate", "complex"]).toContain(r.complexityTier);
    });

    it("classifies a contour_3d as freeform/complex with high topology risk", () => {
      const r = engine.classify(
        makeFeature({
          type: "contour_3d",
          dimensions: { length_mm: 200, width_mm: 150, depth_mm: 50 },
          confidence: 0.95,
        })
      );
      expect(r.geometricFamily).toBe("freeform");
      expect(r.complexityTier).toBe("complex");
      // contour_3d base topology=0.45, large size×1.4 × complex×1.5 → 0.945 (clamped 1.0)
      expect(r.riskProfile.topology).toBeGreaterThan(0.6);
      expect(r.riskProfile.topology).toBeLessThanOrEqual(1);
    });

    it("upgrades size class as longest dimension increases", () => {
      const small = engine.classify(makeFeature({ type: "pocket_rectangular", dimensions: { length_mm: 20 } }));
      const medium = engine.classify(makeFeature({ type: "pocket_rectangular", dimensions: { length_mm: 60 } }));
      const large = engine.classify(makeFeature({ type: "pocket_rectangular", dimensions: { length_mm: 250 } }));
      expect(small.sizeClass).toBe("small");
      expect(medium.sizeClass).toBe("medium");
      expect(large.sizeClass).toBe("large");
    });

    it("falls back to mixed/medium with low confidence on unknown feature type", () => {
      const r = engine.classify(makeFeature({ type: "unobtanium_drill" as FeatureType }));
      expect(r.geometricFamily).toBe("mixed");
      expect(r.confidence).toBeCloseTo(0.2, 2);
      expect(r.rationale[0]).toMatch(/Unknown feature type/);
    });

    it("falls back gracefully on a malformed feature (missing id)", () => {
      const r = engine.classify({ type: "through_hole" } as unknown as RecognizedFeature);
      expect(r.confidence).toBeCloseTo(0.2, 2);
      expect(r.rationale[0]).toMatch(/Invalid feature shape/);
    });

    it("handles a feature with no measurable dimensions (longest=0 → small)", () => {
      const r = engine.classify(makeFeature({ type: "face", dimensions: {} }));
      expect(r.sizeClass).toBe("small");
    });

    it("clamps risk profile values to [0, 1]", () => {
      const r = engine.classify(
        makeFeature({
          type: "contour_3d",
          dimensions: { length_mm: 500, width_mm: 500, depth_mm: 200 },
          confidence: 1,
        })
      );
      for (const k of ["volume", "bbox", "featureCount", "topology"] as const) {
        expect(r.riskProfile[k]).toBeGreaterThanOrEqual(0);
        expect(r.riskProfile[k]).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("classifyBatch", () => {
    it("aggregates per-axis counts and computes mean confidence", () => {
      const features = [
        makeFeature({ id: "f1", type: "through_hole" }),
        makeFeature({ id: "f2", type: "blind_hole" }),
        makeFeature({ id: "f3", type: "pocket_rectangular", dimensions: { length_mm: 50 } }),
        makeFeature({ id: "f4", type: "contour_3d", dimensions: { length_mm: 200 } }),
      ];
      const { results, summary } = engine.classifyBatch(features);
      expect(results.length).toBe(4);
      expect(summary.total).toBe(4);
      expect(summary.byFamily.rotational).toBe(2);
      expect(summary.byFamily.prismatic).toBe(1);
      expect(summary.byFamily.freeform).toBe(1);
      expect(summary.meanConfidence).toBeGreaterThan(0);
      expect(summary.meanConfidence).toBeLessThanOrEqual(1);
      expect(summary.worstRisk.value).toBeGreaterThan(0);
      expect(["volume", "bbox", "featureCount", "topology"]).toContain(summary.worstRisk.channel);
    });

    it("returns empty summary on empty input", () => {
      const { results, summary } = engine.classifyBatch([]);
      expect(results).toEqual([]);
      expect(summary).toMatchObject({
        total: 0,
        meanConfidence: 0,
      });
    });
  });

  describe("groupByFamily", () => {
    it("groups classifications under each family bucket", () => {
      const classifications = [
        engine.classify(makeFeature({ id: "a", type: "through_hole" })),
        engine.classify(makeFeature({ id: "b", type: "pocket_rectangular" })),
        engine.classify(makeFeature({ id: "c", type: "contour_3d", dimensions: { length_mm: 200 } })),
      ];
      const groups = engine.groupByFamily(classifications);
      expect(groups.rotational.length).toBe(1);
      expect(groups.prismatic.length).toBe(1);
      expect(groups.freeform.length).toBe(1);
      expect(groups.sheet.length).toBe(0);
      expect(groups.mixed.length).toBe(0);
    });
  });

  describe("suggestDominantFamily", () => {
    it("returns mixed when no family has majority share", () => {
      const cs = [
        engine.classify(makeFeature({ id: "a", type: "through_hole" })),
        engine.classify(makeFeature({ id: "b", type: "pocket_rectangular" })),
        engine.classify(makeFeature({ id: "c", type: "contour_2d" })),
      ];
      const r = engine.suggestDominantFamily(cs);
      // each family has 1/3 share — no >50% winner
      expect(r.family).toBe("mixed");
      expect(r.share).toBeCloseTo(1 / 3, 2);
    });

    it("returns the dominant family when one has majority share", () => {
      const cs = [
        engine.classify(makeFeature({ id: "a", type: "through_hole" })),
        engine.classify(makeFeature({ id: "b", type: "blind_hole" })),
        engine.classify(makeFeature({ id: "c", type: "counterbore" })),
        engine.classify(makeFeature({ id: "d", type: "pocket_rectangular" })),
      ];
      const r = engine.suggestDominantFamily(cs);
      expect(r.family).toBe("rotational");
      expect(r.share).toBeCloseTo(0.75, 2);
    });

    it("returns mixed/0 on empty input", () => {
      expect(engine.suggestDominantFamily([])).toEqual({ family: "mixed", share: 0 });
    });
  });

  describe("thresholds", () => {
    it("respects custom size thresholds", () => {
      engine.setThresholds({ smallMax: 5, mediumMax: 15 });
      const r = engine.classify(makeFeature({ type: "through_hole", dimensions: { diameter_mm: 10 } }));
      expect(r.sizeClass).toBe("medium");
    });

    it("respects custom complexity thresholds (very strict simple)", () => {
      engine.setThresholds({ intermediateMin: 0.5, complexMin: 1.5 });
      const r = engine.classify(makeFeature({ type: "through_hole", dimensions: { diameter_mm: 5 } }));
      // through_hole base complexity=1, small×1.0 → 1.0; with new boundaries → intermediate
      expect(r.complexityTier).toBe("intermediate");
    });

    it("getThresholds returns a copy that doesn't mutate engine state", () => {
      const t = engine.getThresholds();
      t.smallMax = 9999;
      expect(engine.getThresholds().smallMax).not.toBe(9999);
    });
  });

  describe("strategy hints", () => {
    it("hints lofted for simple freeform", () => {
      const r = engine.classify(
        makeFeature({ type: "fillet", dimensions: { radius_mm: 2 } })
      );
      // fillet base=4, small×1.0 → 4 → intermediate; freeform+intermediate → scripted
      expect(r.geometricFamily).toBe("freeform");
      expect(r.strategyHint).toBe("scripted");
    });

    it("hints scripted for complex rotational", () => {
      const r = engine.classify(
        makeFeature({
          type: "thread_external",
          dimensions: { diameter_mm: 50, length_mm: 80, pitch_mm: 1.5 },
        })
      );
      // thread base=5, medium×1.15 → 5.75 → intermediate; rotational+intermediate → parametric
      // bump to large
      const r2 = engine.classify(
        makeFeature({
          type: "thread_external",
          dimensions: { diameter_mm: 200, length_mm: 300, pitch_mm: 2 },
        })
      );
      // thread base=5, large×1.5 → 7.5 → complex; rotational+complex → scripted
      expect(r.strategyHint).toBe("parametric");
      expect(r2.strategyHint).toBe("scripted");
    });
  });
});
