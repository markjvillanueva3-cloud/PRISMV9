/**
 * PPToolpathStrategyEncoderEngine Tests — PP-AGI-MS6
 */

import { describe, it, expect } from "vitest";
import {
  PPToolpathStrategyEncoderEngine,
  ppToolpathStrategyEncoderEngine,
  TOOLPATH_EMBEDDING_DIM,
  type ToolpathSpec,
} from "../engines/PPToolpathStrategyEncoderEngine.js";

const adaptiveRough: ToolpathSpec = {
  operation_type: "pocket", dimension: "3d", phase: "roughing",
  stepover_ratio: 0.10, doc_ratio: 1.5, mrr_priority: 0.9,
  adaptive: true, constant_chip_load: true, climb_milling: true, hsm: true,
};

const parallelFinish: ToolpathSpec = {
  operation_type: "contour", dimension: "3d", phase: "finishing",
  stepover_ratio: 0.05, surface_priority: 0.9, climb_milling: true, hsm: true,
};

const turningRough: ToolpathSpec = {
  operation_type: "turning", dimension: "2.5d", phase: "roughing",
  doc_ratio: 1.0, mrr_priority: 0.8, coolant_critical: true,
};

describe("PPToolpathStrategyEncoderEngine", () => {
  it("exports singleton", () => {
    expect(ppToolpathStrategyEncoderEngine).toBeInstanceOf(PPToolpathStrategyEncoderEngine);
  });

  it("TOOLPATH_EMBEDDING_DIM is 28", () => {
    expect(TOOLPATH_EMBEDDING_DIM).toBe(28);
  });

  describe("embed", () => {
    it("returns correct dimension", () => {
      const emb = ppToolpathStrategyEncoderEngine.embed(adaptiveRough);
      expect(emb.vector.length).toBe(28);
    });

    it("all values in [0, 1]", () => {
      const emb = ppToolpathStrategyEncoderEngine.embed(adaptiveRough);
      for (const v of emb.vector) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    });

    it("operation type one-hot sums to 1", () => {
      const emb = ppToolpathStrategyEncoderEngine.embed(adaptiveRough);
      expect(emb.vector.slice(0, 6).reduce((s, v) => s + v, 0)).toBeCloseTo(1, 5);
    });

    it("dimension one-hot sums to 1", () => {
      const emb = ppToolpathStrategyEncoderEngine.embed(adaptiveRough);
      expect(emb.vector.slice(6, 9).reduce((s, v) => s + v, 0)).toBeCloseTo(1, 5);
    });

    it("phase one-hot sums to 1", () => {
      const emb = ppToolpathStrategyEncoderEngine.embed(adaptiveRough);
      expect(emb.vector.slice(9, 12).reduce((s, v) => s + v, 0)).toBeCloseTo(1, 5);
    });

    it("pocket has op_pocket = 1", () => {
      const emb = ppToolpathStrategyEncoderEngine.embed(adaptiveRough);
      expect(emb.vector[1]).toBe(1); // op_pocket
    });

    it("adaptive flag is set", () => {
      const emb = ppToolpathStrategyEncoderEngine.embed(adaptiveRough);
      expect(emb.vector[17]).toBe(1); // adaptive
    });

    it("turning has op_turning = 1", () => {
      const emb = ppToolpathStrategyEncoderEngine.embed(turningRough);
      expect(emb.vector[4]).toBe(1); // op_turning
    });
  });

  describe("compare", () => {
    it("same-type+phase strategies more similar than cross-type", () => {
      const sameType = ppToolpathStrategyEncoderEngine.compare(adaptiveRough, {
        operation_type: "pocket", phase: "roughing", dimension: "3d",
        stepover_ratio: 0.15, doc_ratio: 1.0, mrr_priority: 0.8,
        adaptive: true, climb_milling: true, hsm: true,
      });
      const crossType = ppToolpathStrategyEncoderEngine.compare(adaptiveRough, turningRough);
      expect(sameType.cosine_similarity).toBeGreaterThan(crossType.cosine_similarity);
    });

    it("identical strategies → similarity 1", () => {
      const result = ppToolpathStrategyEncoderEngine.compare(adaptiveRough, adaptiveRough);
      expect(result.cosine_similarity).toBeCloseTo(1, 4);
    });

    it("returns key differences", () => {
      const result = ppToolpathStrategyEncoderEngine.compare(adaptiveRough, turningRough);
      expect(result.key_differences.length).toBeGreaterThan(0);
    });
  });

  describe("recommend", () => {
    it("returns k recommendations", () => {
      const result = ppToolpathStrategyEncoderEngine.recommend(adaptiveRough, 3);
      expect(result.recommendations.length).toBe(3);
    });

    it("sorted by descending similarity", () => {
      const result = ppToolpathStrategyEncoderEngine.recommend(adaptiveRough, 5);
      for (let i = 1; i < result.recommendations.length; i++) {
        expect(result.recommendations[i].cosine_similarity)
          .toBeLessThanOrEqual(result.recommendations[i - 1].cosine_similarity);
      }
    });

    it("best match for adaptive roughing is another roughing strategy", () => {
      const result = ppToolpathStrategyEncoderEngine.recommend(adaptiveRough, 1);
      expect(result.recommendations[0].strategy.phase).toBe("roughing");
    });

    it("best match for finish is another finish strategy", () => {
      const result = ppToolpathStrategyEncoderEngine.recommend(parallelFinish, 1);
      expect(result.recommendations[0].strategy.phase).toBe("finishing");
    });

    it("recommendations have labels", () => {
      const result = ppToolpathStrategyEncoderEngine.recommend(adaptiveRough, 3);
      for (const r of result.recommendations) {
        expect(r.label.length).toBeGreaterThan(0);
      }
    });
  });

  describe("embedReferenceLibrary", () => {
    it("returns 15 reference strategies", () => {
      const lib = ppToolpathStrategyEncoderEngine.embedReferenceLibrary();
      expect(lib.length).toBe(15);
    });

    it("all have correct dimension", () => {
      const lib = ppToolpathStrategyEncoderEngine.embedReferenceLibrary();
      for (const s of lib) expect(s.vector.length).toBe(28);
    });
  });

  describe("dimensionName", () => {
    it("returns known names", () => {
      expect(ppToolpathStrategyEncoderEngine.dimensionName(0)).toBe("op_facing");
      expect(ppToolpathStrategyEncoderEngine.dimensionName(17)).toBe("adaptive");
      expect(ppToolpathStrategyEncoderEngine.dimensionName(27)).toBe("coolant_critical");
    });
  });
});
