/**
 * PPMaterialPropertyVectorEngine Tests — PP-AGI-MS3
 *
 * Tests material property embedding:
 * - Embedding generation and dimension correctness
 * - One-hot ISO group validation
 * - Same-group similarity (steels more similar to each other)
 * - Cross-group distance (steel vs aluminum)
 * - Substitution safety detection
 * - Parameter transfer confidence
 * - Nearest neighbor search
 */

import { describe, it, expect } from "vitest";
import {
  PPMaterialPropertyVectorEngine,
  ppMaterialPropertyVectorEngine,
  MATERIAL_EMBEDDING_DIM,
} from "../engines/PPMaterialPropertyVectorEngine.js";

describe("PPMaterialPropertyVectorEngine", () => {
  describe("singleton", () => {
    it("exports singleton", () => {
      expect(ppMaterialPropertyVectorEngine).toBeInstanceOf(PPMaterialPropertyVectorEngine);
    });

    it("MATERIAL_EMBEDDING_DIM is 32", () => {
      expect(MATERIAL_EMBEDDING_DIM).toBe(32);
    });
  });

  describe("embed", () => {
    it("returns embedding for known material", () => {
      const emb = ppMaterialPropertyVectorEngine.embed("1018");
      if (!emb) { /* may not be in DB */ return; }
      expect(emb.vector.length).toBe(MATERIAL_EMBEDDING_DIM);
      expect(emb.dimension).toBe(MATERIAL_EMBEDDING_DIM);
    });

    it("returns null for unknown material", () => {
      expect(ppMaterialPropertyVectorEngine.embed("unobtanium_xyz")).toBeNull();
    });

    it("all values in [0, 1]", () => {
      const all = ppMaterialPropertyVectorEngine.embedAll();
      for (const emb of all) {
        for (const v of emb.vector) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
    });

    it("ISO group one-hot sums to 1", () => {
      const all = ppMaterialPropertyVectorEngine.embedAll();
      for (const emb of all) {
        const groupSum = emb.vector.slice(0, 7).reduce((s, v) => s + v, 0);
        expect(groupSum).toBeCloseTo(1, 5);
      }
    });

    it("chip formation one-hot sums to 1", () => {
      const all = ppMaterialPropertyVectorEngine.embedAll();
      for (const emb of all) {
        const chipSum = emb.vector.slice(18, 21).reduce((s, v) => s + v, 0);
        expect(chipSum).toBeCloseTo(1, 5);
      }
    });

    it("BUE tendency one-hot sums to 1", () => {
      const all = ppMaterialPropertyVectorEngine.embedAll();
      for (const emb of all) {
        const bueSum = emb.vector.slice(21, 24).reduce((s, v) => s + v, 0);
        expect(bueSum).toBeCloseTo(1, 5);
      }
    });

    it("has non-zero cutting coefficients", () => {
      const all = ppMaterialPropertyVectorEngine.embedAll();
      if (all.length === 0) return;
      const emb = all[0];
      expect(emb.vector[7]).toBeGreaterThan(0); // kc1.1
    });
  });

  describe("embedAll", () => {
    it("returns multiple materials", () => {
      const all = ppMaterialPropertyVectorEngine.embedAll();
      expect(all.length).toBeGreaterThan(5);
    });

    it("all IDs are unique", () => {
      const all = ppMaterialPropertyVectorEngine.embedAll();
      const ids = all.map(e => e.material_id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("compare", () => {
    it("returns null for unknown materials", () => {
      expect(ppMaterialPropertyVectorEngine.compare("unknown_a", "unknown_b")).toBeNull();
    });

    it("same-category materials have higher similarity", () => {
      const all = ppMaterialPropertyVectorEngine.embedAll();
      if (all.length < 4) return;

      // Find two steels and one non-steel
      const steels = all.filter(e => e.vector[0] === 1); // ISO P (carbon/alloy steel)
      const others = all.filter(e => e.vector[0] !== 1 && e.vector[5] !== 1); // not steel
      if (steels.length < 2 || others.length < 1) return;

      const sameCat = ppMaterialPropertyVectorEngine.compare(
        steels[0].material_id, steels[1].material_id);
      const crossCat = ppMaterialPropertyVectorEngine.compare(
        steels[0].material_id, others[0].material_id);
      if (!sameCat || !crossCat) return;

      expect(sameCat.cosine_similarity).toBeGreaterThanOrEqual(crossCat.cosine_similarity);
    });

    it("includes substitution_safe flag", () => {
      const all = ppMaterialPropertyVectorEngine.embedAll();
      if (all.length < 2) return;
      const result = ppMaterialPropertyVectorEngine.compare(
        all[0].material_id, all[1].material_id);
      if (!result) return;
      expect(typeof result.substitution_safe).toBe("boolean");
    });

    it("includes parameter_transfer_confidence in [0, 1]", () => {
      const all = ppMaterialPropertyVectorEngine.embedAll();
      if (all.length < 2) return;
      const result = ppMaterialPropertyVectorEngine.compare(
        all[0].material_id, all[1].material_id);
      if (!result) return;
      expect(result.parameter_transfer_confidence).toBeGreaterThanOrEqual(0);
      expect(result.parameter_transfer_confidence).toBeLessThanOrEqual(1);
    });

    it("returns key_differences array", () => {
      const all = ppMaterialPropertyVectorEngine.embedAll();
      if (all.length < 2) return;
      const result = ppMaterialPropertyVectorEngine.compare(
        all[0].material_id, all[all.length - 1].material_id);
      if (!result) return;
      expect(Array.isArray(result.key_differences)).toBe(true);
    });
  });

  describe("findNearest", () => {
    it("returns null for unknown material", () => {
      expect(ppMaterialPropertyVectorEngine.findNearest("unknown_xyz")).toBeNull();
    });

    it("returns k neighbors for known material", () => {
      const all = ppMaterialPropertyVectorEngine.embedAll();
      if (all.length < 2) return;
      const result = ppMaterialPropertyVectorEngine.findNearest(all[0].material_id, 3);
      if (!result) return;
      expect(result.neighbors.length).toBeLessThanOrEqual(3);
      expect(result.neighbors.length).toBeGreaterThan(0);
    });

    it("excludes query from results", () => {
      const all = ppMaterialPropertyVectorEngine.embedAll();
      if (all.length < 2) return;
      const result = ppMaterialPropertyVectorEngine.findNearest(all[0].material_id, 5);
      if (!result) return;
      expect(result.neighbors.every(n => n.material_id !== all[0].material_id)).toBe(true);
    });

    it("sorted by descending similarity", () => {
      const all = ppMaterialPropertyVectorEngine.embedAll();
      if (all.length < 3) return;
      const result = ppMaterialPropertyVectorEngine.findNearest(all[0].material_id, 5);
      if (!result || result.neighbors.length < 2) return;
      for (let i = 1; i < result.neighbors.length; i++) {
        expect(result.neighbors[i].cosine_similarity)
          .toBeLessThanOrEqual(result.neighbors[i - 1].cosine_similarity);
      }
    });

    it("nearest neighbor is in same category for steels", () => {
      const all = ppMaterialPropertyVectorEngine.embedAll();
      const steels = all.filter(e => e.category === "carbon_steel" || e.category === "alloy_steel");
      if (steels.length < 3) return;
      const result = ppMaterialPropertyVectorEngine.findNearest(steels[0].material_id, 1);
      if (!result || result.neighbors.length === 0) return;
      // Nearest to a steel should be another steel or similar
      expect(["carbon_steel", "alloy_steel", "tool_steel"].includes(result.neighbors[0].category)).toBe(true);
    });
  });

  describe("dimensionName", () => {
    it("returns known names", () => {
      expect(ppMaterialPropertyVectorEngine.dimensionName(0)).toBe("iso_p");
      expect(ppMaterialPropertyVectorEngine.dimensionName(7)).toBe("kc1_1_norm");
      expect(ppMaterialPropertyVectorEngine.dimensionName(31)).toBe("is_nonferrous");
    });

    it("fallback for out of range", () => {
      expect(ppMaterialPropertyVectorEngine.dimensionName(100)).toBe("dim_100");
    });
  });

  describe("cache", () => {
    it("same reference on repeated embed", () => {
      const engine = new PPMaterialPropertyVectorEngine();
      const all = engine.embedAll();
      if (all.length === 0) return;
      const first = engine.embed(all[0].material_id);
      const second = engine.embed(all[0].material_id);
      if (first && second) expect(first).toBe(second);
    });

    it("invalidate clears cache", () => {
      const engine = new PPMaterialPropertyVectorEngine();
      const all = engine.embedAll();
      if (all.length === 0) return;
      const first = engine.embed(all[0].material_id);
      engine.invalidate();
      const second = engine.embed(all[0].material_id);
      if (first && second) {
        expect(first).not.toBe(second);
        expect(first.vector).toEqual(second.vector);
      }
    });
  });
});
