/**
 * PPControllerEmbeddingEngine Tests — PP-AGI-MS0
 *
 * Tests controller dialect embedding for ML operations:
 * - Embedding generation (correct dimension, valid values)
 * - Cosine similarity (symmetry, identity, range)
 * - Nearest neighbor search (Fanuc→Fanuc closeness)
 * - Clustering (manufacturer grouping)
 * - Feature importance (identifies real differences)
 * - Compare (shared/divergent features)
 * - Edge cases and cache behavior
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  PPControllerEmbeddingEngine,
  ppControllerEmbeddingEngine,
  EMBEDDING_DIM,
  type ControllerEmbedding,
} from "../engines/PPControllerEmbeddingEngine.js";

describe("PPControllerEmbeddingEngine", () => {
  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(ppControllerEmbeddingEngine).toBeDefined();
      expect(ppControllerEmbeddingEngine).toBeInstanceOf(PPControllerEmbeddingEngine);
    });

    it("EMBEDDING_DIM is 48", () => {
      expect(EMBEDDING_DIM).toBe(48);
    });
  });

  describe("embed", () => {
    it("returns embedding with correct dimension", () => {
      const emb = ppControllerEmbeddingEngine.embed("fanuc_31i");
      expect(emb.vector.length).toBe(EMBEDDING_DIM);
      expect(emb.dimension).toBe(EMBEDDING_DIM);
    });

    it("returns controller metadata", () => {
      const emb = ppControllerEmbeddingEngine.embed("fanuc_31i");
      expect(emb.controller_id).toBe("fanuc_31i");
      expect(emb.display_name).toContain("Fanuc");
      expect(emb.manufacturer).toBe("Fanuc");
      expect(emb.base_family).toBe("fanuc");
    });

    it("all vector values are in [0, 1]", () => {
      const emb = ppControllerEmbeddingEngine.embed("fanuc_31i");
      for (const v of emb.vector) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    });

    it("fanuc_31i has family_fanuc = 1", () => {
      const emb = ppControllerEmbeddingEngine.embed("fanuc_31i");
      expect(emb.vector[0]).toBe(1); // family_fanuc
      expect(emb.vector[1]).toBe(0); // family_siemens
      expect(emb.vector[2]).toBe(0); // family_heidenhain
    });

    it("siemens_840d has family_siemens = 1", () => {
      const emb = ppControllerEmbeddingEngine.embed("siemens_840d");
      expect(emb.vector[0]).toBe(0); // family_fanuc
      expect(emb.vector[1]).toBe(1); // family_siemens
    });

    it("haas_ngc falls back to 'other' family", () => {
      const emb = ppControllerEmbeddingEngine.embed("haas_ngc");
      // Haas is its own family, check which bucket
      const familyBits = emb.vector.slice(0, 6);
      expect(familyBits.reduce((s, v) => s + v, 0)).toBe(1); // exactly one hot
    });

    it("unknown controller falls back to generic_fanuc", () => {
      const unknown = ppControllerEmbeddingEngine.embed("unknown_xyz");
      const generic = ppControllerEmbeddingEngine.embed("generic_fanuc");
      expect(unknown.vector).toEqual(generic.vector);
    });

    it("embedding has non-zero entries (not empty vector)", () => {
      const emb = ppControllerEmbeddingEngine.embed("fanuc_31i");
      const nonZero = emb.vector.filter(v => v > 0).length;
      expect(nonZero).toBeGreaterThan(5);
    });

    it("fanuc_31i has TCPC support (dim 19)", () => {
      const emb = ppControllerEmbeddingEngine.embed("fanuc_31i");
      expect(emb.vector[19]).toBe(1); // has_tcpc
    });

    it("fanuc_0i does NOT have TCPC support", () => {
      const emb = ppControllerEmbeddingEngine.embed("fanuc_0i");
      expect(emb.vector[19]).toBe(0);
    });
  });

  describe("embedAll", () => {
    it("returns embeddings for all controllers", () => {
      const all = ppControllerEmbeddingEngine.embedAll();
      expect(all.length).toBeGreaterThan(20); // at least 27 dialects
    });

    it("all embeddings have correct dimension", () => {
      const all = ppControllerEmbeddingEngine.embedAll();
      for (const emb of all) {
        expect(emb.vector.length).toBe(EMBEDDING_DIM);
      }
    });

    it("all controller IDs are unique", () => {
      const all = ppControllerEmbeddingEngine.embedAll();
      const ids = all.map(e => e.controller_id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("one-hot family sums to 1 for each controller", () => {
      const all = ppControllerEmbeddingEngine.embedAll();
      for (const emb of all) {
        const familySum = emb.vector.slice(0, 6).reduce((s, v) => s + v, 0);
        expect(familySum).toBeCloseTo(1, 5);
      }
    });

    it("one-hot arc format sums to 1", () => {
      const all = ppControllerEmbeddingEngine.embedAll();
      for (const emb of all) {
        const arcSum = emb.vector.slice(6, 10).reduce((s, v) => s + v, 0);
        expect(arcSum).toBeCloseTo(1, 5);
      }
    });
  });

  describe("cosineSimilarity", () => {
    it("identical vectors have similarity 1", () => {
      const v = [1, 0, 1, 0.5, 0.8];
      expect(ppControllerEmbeddingEngine.cosineSimilarity(v, v)).toBeCloseTo(1, 5);
    });

    it("orthogonal vectors have similarity 0", () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      expect(ppControllerEmbeddingEngine.cosineSimilarity(a, b)).toBeCloseTo(0, 5);
    });

    it("similarity is symmetric", () => {
      const a = ppControllerEmbeddingEngine.embed("fanuc_31i").vector;
      const b = ppControllerEmbeddingEngine.embed("siemens_840d").vector;
      const simAB = ppControllerEmbeddingEngine.cosineSimilarity(a, b);
      const simBA = ppControllerEmbeddingEngine.cosineSimilarity(b, a);
      expect(simAB).toBeCloseTo(simBA, 10);
    });

    it("similarity is in [-1, 1]", () => {
      const all = ppControllerEmbeddingEngine.embedAll();
      for (let i = 0; i < Math.min(all.length, 10); i++) {
        for (let j = i + 1; j < Math.min(all.length, 10); j++) {
          const sim = ppControllerEmbeddingEngine.cosineSimilarity(all[i].vector, all[j].vector);
          expect(sim).toBeGreaterThanOrEqual(-1);
          expect(sim).toBeLessThanOrEqual(1);
        }
      }
    });

    it("zero vector returns 0", () => {
      const zero = new Array(48).fill(0);
      const v = [1, 0, 1, 0.5];
      expect(ppControllerEmbeddingEngine.cosineSimilarity(zero.slice(0, 4), v)).toBe(0);
    });
  });

  describe("euclideanDistance", () => {
    it("identical vectors have distance 0", () => {
      const v = [1, 2, 3];
      expect(ppControllerEmbeddingEngine.euclideanDistance(v, v)).toBe(0);
    });

    it("distance is symmetric", () => {
      const a = ppControllerEmbeddingEngine.embed("fanuc_31i").vector;
      const b = ppControllerEmbeddingEngine.embed("siemens_840d").vector;
      const dAB = ppControllerEmbeddingEngine.euclideanDistance(a, b);
      const dBA = ppControllerEmbeddingEngine.euclideanDistance(b, a);
      expect(dAB).toBeCloseTo(dBA, 10);
    });

    it("known distance: [0,0] to [3,4] = 5", () => {
      expect(ppControllerEmbeddingEngine.euclideanDistance([0, 0], [3, 4])).toBeCloseTo(5, 5);
    });

    it("distance is non-negative", () => {
      const all = ppControllerEmbeddingEngine.embedAll();
      for (let i = 0; i < Math.min(all.length, 5); i++) {
        for (let j = i + 1; j < Math.min(all.length, 5); j++) {
          const d = ppControllerEmbeddingEngine.euclideanDistance(all[i].vector, all[j].vector);
          expect(d).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe("compare", () => {
    it("same-family controllers are highly similar", () => {
      const result = ppControllerEmbeddingEngine.compare("fanuc_31i", "fanuc_30i");
      expect(result.cosine_similarity).toBeGreaterThan(0.8);
    });

    it("different-family controllers are less similar", () => {
      const sameFamily = ppControllerEmbeddingEngine.compare("fanuc_31i", "fanuc_30i");
      const diffFamily = ppControllerEmbeddingEngine.compare("fanuc_31i", "siemens_840d");
      expect(sameFamily.cosine_similarity).toBeGreaterThan(diffFamily.cosine_similarity);
    });

    it("returns shared features for same-family", () => {
      const result = ppControllerEmbeddingEngine.compare("fanuc_31i", "fanuc_30i");
      expect(result.shared_features).toContain("family_fanuc");
    });

    it("returns divergent features for different families", () => {
      const result = ppControllerEmbeddingEngine.compare("fanuc_31i", "siemens_840d");
      expect(result.divergent_features.length).toBeGreaterThan(0);
    });

    it("controller IDs are in the result", () => {
      const result = ppControllerEmbeddingEngine.compare("fanuc_31i", "haas_ngc");
      expect(result.controller_a).toBe("fanuc_31i");
      expect(result.controller_b).toBe("haas_ngc");
    });
  });

  describe("findNearest", () => {
    it("returns k neighbors", () => {
      const result = ppControllerEmbeddingEngine.findNearest("fanuc_31i", 3);
      expect(result.neighbors.length).toBe(3);
    });

    it("query controller is excluded from results", () => {
      const result = ppControllerEmbeddingEngine.findNearest("fanuc_31i", 5);
      expect(result.neighbors.every(n => n.controller_id !== "fanuc_31i")).toBe(true);
    });

    it("results are sorted by descending similarity", () => {
      const result = ppControllerEmbeddingEngine.findNearest("fanuc_31i", 5);
      for (let i = 1; i < result.neighbors.length; i++) {
        expect(result.neighbors[i].cosine_similarity)
          .toBeLessThanOrEqual(result.neighbors[i - 1].cosine_similarity);
      }
    });

    it("fanuc_31i nearest neighbor is another Fanuc", () => {
      const result = ppControllerEmbeddingEngine.findNearest("fanuc_31i", 1);
      expect(result.neighbors[0].controller_id).toMatch(/fanuc/);
    });

    it("siemens_840d nearest neighbor is another Siemens", () => {
      const result = ppControllerEmbeddingEngine.findNearest("siemens_840d", 1);
      expect(result.neighbors[0].controller_id).toMatch(/siemens/);
    });

    it("query field matches input", () => {
      const result = ppControllerEmbeddingEngine.findNearest("haas_ngc", 3);
      expect(result.query).toBe("haas_ngc");
    });

    it("neighbors have similarity and distance", () => {
      const result = ppControllerEmbeddingEngine.findNearest("fanuc_31i", 2);
      for (const n of result.neighbors) {
        expect(typeof n.cosine_similarity).toBe("number");
        expect(typeof n.euclidean_distance).toBe("number");
        expect(n.display_name.length).toBeGreaterThan(0);
      }
    });
  });

  describe("cluster", () => {
    it("returns requested number of clusters", () => {
      const result = ppControllerEmbeddingEngine.cluster(4);
      expect(result.clusters.length).toBe(4);
    });

    it("all controllers are assigned to a cluster", () => {
      const result = ppControllerEmbeddingEngine.cluster(4);
      const all = ppControllerEmbeddingEngine.embedAll();
      const memberCount = result.clusters.reduce((s, c) => s + c.members.length, 0);
      expect(memberCount).toBe(all.length);
    });

    it("each cluster has at least one member", () => {
      const result = ppControllerEmbeddingEngine.cluster(3);
      for (const c of result.clusters) {
        expect(c.members.length).toBeGreaterThan(0);
      }
    });

    it("silhouette score is in [-1, 1]", () => {
      const result = ppControllerEmbeddingEngine.cluster(4);
      expect(result.silhouette_score).toBeGreaterThanOrEqual(-1);
      expect(result.silhouette_score).toBeLessThanOrEqual(1);
    });

    it("centroids have correct dimension", () => {
      const result = ppControllerEmbeddingEngine.cluster(3);
      for (const c of result.clusters) {
        expect(c.centroid.length).toBe(EMBEDDING_DIM);
      }
    });

    it("cohesion is positive", () => {
      const result = ppControllerEmbeddingEngine.cluster(3);
      for (const c of result.clusters) {
        expect(c.cohesion).toBeGreaterThan(0);
      }
    });
  });

  describe("featureImportance", () => {
    it("returns top differences between controllers", () => {
      const result = ppControllerEmbeddingEngine.featureImportance("fanuc_31i", "siemens_840d");
      expect(result.top_differences.length).toBeGreaterThan(0);
    });

    it("differences are sorted by abs_diff descending", () => {
      const result = ppControllerEmbeddingEngine.featureImportance("fanuc_31i", "siemens_840d");
      for (let i = 1; i < result.top_differences.length; i++) {
        expect(result.top_differences[i].abs_diff)
          .toBeLessThanOrEqual(result.top_differences[i - 1].abs_diff);
      }
    });

    it("family difference appears for cross-family comparison", () => {
      const result = ppControllerEmbeddingEngine.featureImportance("fanuc_31i", "siemens_840d");
      const familyDiffs = result.top_differences.filter(d => d.name.startsWith("family_"));
      expect(familyDiffs.length).toBeGreaterThan(0);
    });

    it("same-family has fewer differences than cross-family", () => {
      const same = ppControllerEmbeddingEngine.featureImportance("fanuc_31i", "fanuc_30i");
      const cross = ppControllerEmbeddingEngine.featureImportance("fanuc_31i", "siemens_840d");
      expect(same.top_differences.length).toBeLessThanOrEqual(cross.top_differences.length);
    });

    it("max 10 differences returned", () => {
      const result = ppControllerEmbeddingEngine.featureImportance("fanuc_0i", "siemens_840d");
      expect(result.top_differences.length).toBeLessThanOrEqual(10);
    });
  });

  describe("dimensionName", () => {
    it("returns known names for valid indices", () => {
      expect(ppControllerEmbeddingEngine.dimensionName(0)).toBe("family_fanuc");
      expect(ppControllerEmbeddingEngine.dimensionName(1)).toBe("family_siemens");
      expect(ppControllerEmbeddingEngine.dimensionName(19)).toBe("has_tcpc");
      expect(ppControllerEmbeddingEngine.dimensionName(47)).toBe("decimal_mandatory_point");
    });

    it("returns fallback for out-of-range index", () => {
      expect(ppControllerEmbeddingEngine.dimensionName(100)).toBe("dim_100");
    });
  });

  describe("cache behavior", () => {
    it("returns same object on repeated embed calls", () => {
      const engine = new PPControllerEmbeddingEngine();
      const first = engine.embed("fanuc_31i");
      const second = engine.embed("fanuc_31i");
      expect(first).toBe(second); // same reference
    });

    it("invalidate clears cache", () => {
      const engine = new PPControllerEmbeddingEngine();
      const first = engine.embed("fanuc_31i");
      engine.invalidate();
      const second = engine.embed("fanuc_31i");
      expect(first).not.toBe(second); // different reference
      expect(first.vector).toEqual(second.vector); // same values
    });
  });
});
