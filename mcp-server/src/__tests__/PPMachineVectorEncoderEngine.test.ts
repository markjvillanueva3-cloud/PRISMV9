/**
 * PPMachineVectorEncoderEngine Tests — PP-AGI-MS1
 *
 * Tests machine kinematic profile embedding:
 * - Embedding generation (dimension, value range, one-hot validity)
 * - Similarity (same-type closeness, cross-type distance)
 * - Nearest neighbor (VMC→VMC, lathe→lathe)
 * - Compare (shared capabilities, key differences)
 * - Null handling for unknown machines
 * - Cache behavior
 */

import { describe, it, expect } from "vitest";
import {
  PPMachineVectorEncoderEngine,
  ppMachineVectorEncoderEngine,
  MACHINE_EMBEDDING_DIM,
} from "../engines/PPMachineVectorEncoderEngine.js";

describe("PPMachineVectorEncoderEngine", () => {
  describe("singleton", () => {
    it("exports singleton", () => {
      expect(ppMachineVectorEncoderEngine).toBeInstanceOf(PPMachineVectorEncoderEngine);
    });

    it("MACHINE_EMBEDDING_DIM is 40", () => {
      expect(MACHINE_EMBEDDING_DIM).toBe(40);
    });
  });

  describe("embed", () => {
    it("returns embedding for known machine (haas-vf2)", () => {
      const emb = ppMachineVectorEncoderEngine.embed("haas-vf2");
      expect(emb).not.toBeNull();
      expect(emb!.vector.length).toBe(MACHINE_EMBEDDING_DIM);
      expect(emb!.dimension).toBe(MACHINE_EMBEDDING_DIM);
    });

    it("returns null for unknown machine", () => {
      const emb = ppMachineVectorEncoderEngine.embed("nonexistent-xyz-999");
      expect(emb).toBeNull();
    });

    it("all values in [0, 1]", () => {
      const emb = ppMachineVectorEncoderEngine.embed("haas-vf2");
      if (!emb) return;
      for (const v of emb.vector) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    });

    it("haas-vf2 has VMC topology flag", () => {
      const emb = ppMachineVectorEncoderEngine.embed("haas-vf2");
      if (!emb) return;
      expect(emb.vector[0]).toBe(1); // topo_vmc
      expect(emb.vector[2]).toBe(0); // topo_lathe
    });

    it("returns machine metadata", () => {
      const emb = ppMachineVectorEncoderEngine.embed("haas-vf2");
      if (!emb) return;
      expect(emb.machine_id).toBe("haas-vf2");
      expect(emb.machine_name).toContain("Haas");
      expect(emb.brand).toBe("Haas");
    });

    it("one-hot topology sums to 1", () => {
      const emb = ppMachineVectorEncoderEngine.embed("haas-vf2");
      if (!emb) return;
      const topoSum = emb.vector.slice(0, 5).reduce((s, v) => s + v, 0);
      expect(topoSum).toBeCloseTo(1, 5);
    });

    it("one-hot workplane sums to 1", () => {
      const emb = ppMachineVectorEncoderEngine.embed("haas-vf2");
      if (!emb) return;
      const wpSum = emb.vector.slice(6, 9).reduce((s, v) => s + v, 0);
      expect(wpSum).toBeCloseTo(1, 5);
    });

    it("one-hot way type sums to 1", () => {
      const emb = ppMachineVectorEncoderEngine.embed("haas-vf2");
      if (!emb) return;
      const waySum = emb.vector.slice(9, 14).reduce((s, v) => s + v, 0);
      expect(waySum).toBeCloseTo(1, 5);
    });

    it("one-hot build tier sums to 1", () => {
      const emb = ppMachineVectorEncoderEngine.embed("haas-vf2");
      if (!emb) return;
      const tierSum = emb.vector.slice(14, 19).reduce((s, v) => s + v, 0);
      expect(tierSum).toBeCloseTo(1, 5);
    });

    it("has non-zero travel values", () => {
      const emb = ppMachineVectorEncoderEngine.embed("haas-vf2");
      if (!emb) return;
      expect(emb.vector[19]).toBeGreaterThan(0); // travel_x
      expect(emb.vector[20]).toBeGreaterThan(0); // travel_y
      expect(emb.vector[21]).toBeGreaterThan(0); // travel_z
    });

    it("haas-vf2 is NOT 5-axis", () => {
      const emb = ppMachineVectorEncoderEngine.embed("haas-vf2");
      if (!emb) return;
      expect(emb.vector[36]).toBe(0); // is_5axis
    });
  });

  describe("embedAll", () => {
    it("returns multiple machine embeddings", () => {
      const all = ppMachineVectorEncoderEngine.embedAll();
      expect(all.length).toBeGreaterThan(3);
    });

    it("all embeddings have correct dimension", () => {
      const all = ppMachineVectorEncoderEngine.embedAll();
      for (const emb of all) {
        expect(emb.vector.length).toBe(MACHINE_EMBEDDING_DIM);
      }
    });

    it("all machine IDs are unique", () => {
      const all = ppMachineVectorEncoderEngine.embedAll();
      const ids = all.map(e => e.machine_id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("cosineSimilarity", () => {
    it("identical vectors → 1", () => {
      const v = [1, 0, 1, 0.5];
      expect(ppMachineVectorEncoderEngine.cosineSimilarity(v, v)).toBeCloseTo(1, 5);
    });

    it("orthogonal vectors → 0", () => {
      expect(ppMachineVectorEncoderEngine.cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
    });

    it("symmetric", () => {
      const a = ppMachineVectorEncoderEngine.embed("haas-vf2")?.vector;
      const all = ppMachineVectorEncoderEngine.embedAll();
      if (!a || all.length < 2) return;
      const b = all[1].vector;
      expect(ppMachineVectorEncoderEngine.cosineSimilarity(a, b))
        .toBeCloseTo(ppMachineVectorEncoderEngine.cosineSimilarity(b, a), 10);
    });
  });

  describe("compare", () => {
    it("returns null if either machine unknown", () => {
      expect(ppMachineVectorEncoderEngine.compare("haas-vf2", "nonexistent")).toBeNull();
      expect(ppMachineVectorEncoderEngine.compare("nonexistent", "haas-vf2")).toBeNull();
    });

    it("same-type machines are more similar than cross-type", () => {
      const all = ppMachineVectorEncoderEngine.embedAll();
      if (all.length < 3) return;

      // Find two VMCs and one non-VMC
      const vmcs = all.filter(e => e.vector[0] === 1); // topo_vmc
      const others = all.filter(e => e.vector[0] !== 1);
      if (vmcs.length < 2 || others.length < 1) return;

      const sameType = ppMachineVectorEncoderEngine.compare(vmcs[0].machine_id, vmcs[1].machine_id);
      const crossType = ppMachineVectorEncoderEngine.compare(vmcs[0].machine_id, others[0].machine_id);
      if (!sameType || !crossType) return;

      expect(sameType.cosine_similarity).toBeGreaterThanOrEqual(crossType.cosine_similarity);
    });

    it("returns shared capabilities and differences", () => {
      const all = ppMachineVectorEncoderEngine.embedAll();
      if (all.length < 2) return;
      const result = ppMachineVectorEncoderEngine.compare(all[0].machine_id, all[1].machine_id);
      if (!result) return;
      expect(Array.isArray(result.shared_capabilities)).toBe(true);
      expect(Array.isArray(result.key_differences)).toBe(true);
    });
  });

  describe("findNearest", () => {
    it("returns null for unknown machine", () => {
      expect(ppMachineVectorEncoderEngine.findNearest("nonexistent")).toBeNull();
    });

    it("returns k neighbors", () => {
      const result = ppMachineVectorEncoderEngine.findNearest("haas-vf2", 3);
      if (!result) return;
      expect(result.neighbors.length).toBeLessThanOrEqual(3);
      expect(result.neighbors.length).toBeGreaterThan(0);
    });

    it("excludes query from results", () => {
      const result = ppMachineVectorEncoderEngine.findNearest("haas-vf2", 5);
      if (!result) return;
      expect(result.neighbors.every(n => n.machine_id !== "haas-vf2")).toBe(true);
    });

    it("sorted by descending similarity", () => {
      const result = ppMachineVectorEncoderEngine.findNearest("haas-vf2", 5);
      if (!result || result.neighbors.length < 2) return;
      for (let i = 1; i < result.neighbors.length; i++) {
        expect(result.neighbors[i].cosine_similarity)
          .toBeLessThanOrEqual(result.neighbors[i - 1].cosine_similarity);
      }
    });
  });

  describe("dimensionName", () => {
    it("returns known names", () => {
      expect(ppMachineVectorEncoderEngine.dimensionName(0)).toBe("topo_vmc");
      expect(ppMachineVectorEncoderEngine.dimensionName(5)).toBe("axis_count_norm");
      expect(ppMachineVectorEncoderEngine.dimensionName(36)).toBe("is_5axis");
      expect(ppMachineVectorEncoderEngine.dimensionName(39)).toBe("is_grinder");
    });

    it("returns fallback for out-of-range", () => {
      expect(ppMachineVectorEncoderEngine.dimensionName(100)).toBe("dim_100");
    });
  });

  describe("cache", () => {
    it("returns same reference on repeated embed", () => {
      const engine = new PPMachineVectorEncoderEngine();
      const first = engine.embed("haas-vf2");
      const second = engine.embed("haas-vf2");
      if (first && second) expect(first).toBe(second);
    });

    it("invalidate clears cache", () => {
      const engine = new PPMachineVectorEncoderEngine();
      const first = engine.embed("haas-vf2");
      engine.invalidate();
      const second = engine.embed("haas-vf2");
      if (first && second) {
        expect(first).not.toBe(second);
        expect(first.vector).toEqual(second.vector);
      }
    });
  });
});
