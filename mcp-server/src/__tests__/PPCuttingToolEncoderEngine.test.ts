/**
 * PPCuttingToolEncoderEngine Tests — PP-AGI-MS2
 *
 * Tests tool geometry embedding:
 * - Embedding dimension and value range
 * - One-hot validation (type, substrate, coating)
 * - Same-type similarity (endmill→endmill closer than endmill→drill)
 * - Reference library search
 * - Key differences detection
 */

import { describe, it, expect } from "vitest";
import {
  PPCuttingToolEncoderEngine,
  ppCuttingToolEncoderEngine,
  TOOL_EMBEDDING_DIM,
  type ToolSpec,
} from "../engines/PPCuttingToolEncoderEngine.js";

const endmill10: ToolSpec = {
  tool_type: "endmill", diameter_mm: 10, flute_count: 4,
  overall_length_mm: 72, helix_angle_deg: 35, substrate: "carbide",
  coating: "tialn", iso_groups: ["P", "M", "K"], roughing: true, finishing: true,
};

const drill8: ToolSpec = {
  tool_type: "drill", diameter_mm: 8, flute_count: 2,
  overall_length_mm: 79, substrate: "carbide", coating: "tin",
  iso_groups: ["P", "M", "K", "N"], roughing: true, coolant_through: true,
};

const endmill20: ToolSpec = {
  tool_type: "endmill", diameter_mm: 20, flute_count: 5,
  overall_length_mm: 104, helix_angle_deg: 38, substrate: "carbide",
  coating: "tialn", iso_groups: ["P", "M", "K"], roughing: true,
};

describe("PPCuttingToolEncoderEngine", () => {
  describe("singleton", () => {
    it("exports singleton", () => {
      expect(ppCuttingToolEncoderEngine).toBeInstanceOf(PPCuttingToolEncoderEngine);
    });
    it("TOOL_EMBEDDING_DIM is 36", () => {
      expect(TOOL_EMBEDDING_DIM).toBe(36);
    });
  });

  describe("embed", () => {
    it("returns correct dimension", () => {
      const emb = ppCuttingToolEncoderEngine.embed(endmill10);
      expect(emb.vector.length).toBe(TOOL_EMBEDDING_DIM);
      expect(emb.dimension).toBe(TOOL_EMBEDDING_DIM);
    });

    it("all values in [0, 1]", () => {
      const emb = ppCuttingToolEncoderEngine.embed(endmill10);
      for (const v of emb.vector) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    });

    it("endmill has type_endmill = 1", () => {
      const emb = ppCuttingToolEncoderEngine.embed(endmill10);
      expect(emb.vector[0]).toBe(1); // type_endmill
      expect(emb.vector[2]).toBe(0); // type_drill
    });

    it("drill has type_drill = 1", () => {
      const emb = ppCuttingToolEncoderEngine.embed(drill8);
      expect(emb.vector[2]).toBe(1); // type_drill
      expect(emb.vector[0]).toBe(0); // type_endmill
    });

    it("tool type one-hot sums to 1", () => {
      const emb = ppCuttingToolEncoderEngine.embed(endmill10);
      expect(emb.vector.slice(0, 8).reduce((s, v) => s + v, 0)).toBeCloseTo(1, 5);
    });

    it("substrate one-hot sums to 1", () => {
      const emb = ppCuttingToolEncoderEngine.embed(endmill10);
      expect(emb.vector.slice(15, 19).reduce((s, v) => s + v, 0)).toBeCloseTo(1, 5);
    });

    it("coating one-hot sums to 1", () => {
      const emb = ppCuttingToolEncoderEngine.embed(endmill10);
      expect(emb.vector.slice(19, 24).reduce((s, v) => s + v, 0)).toBeCloseTo(1, 5);
    });

    it("helix angle bucket sums to 1", () => {
      const emb = ppCuttingToolEncoderEngine.embed(endmill10);
      expect(emb.vector.slice(12, 15).reduce((s, v) => s + v, 0)).toBeCloseTo(1, 5);
    });

    it("ISO group flags are correct", () => {
      const emb = ppCuttingToolEncoderEngine.embed(endmill10);
      expect(emb.vector[24]).toBe(1); // P
      expect(emb.vector[25]).toBe(1); // M
      expect(emb.vector[26]).toBe(1); // K
      expect(emb.vector[27]).toBe(0); // N
      expect(emb.vector[28]).toBe(0); // S
    });

    it("diameter is normalized", () => {
      const small = ppCuttingToolEncoderEngine.embed({ tool_type: "endmill", diameter_mm: 1 });
      const large = ppCuttingToolEncoderEngine.embed({ tool_type: "endmill", diameter_mm: 40 });
      expect(large.vector[8]).toBeGreaterThan(small.vector[8]);
    });

    it("CBN insert encodes ceramic substrate", () => {
      const emb = ppCuttingToolEncoderEngine.embed({
        tool_type: "insert_turning", substrate: "cbn", coating: "uncoated",
        iso_groups: ["H"],
      });
      expect(emb.vector[18]).toBe(1); // substrate_ceramic_cbn
      expect(emb.vector[19]).toBe(1); // coating_uncoated
      expect(emb.vector[29]).toBe(1); // iso_h
    });
  });

  describe("embedReferenceLibrary", () => {
    it("returns 12 reference tools", () => {
      const lib = ppCuttingToolEncoderEngine.embedReferenceLibrary();
      expect(lib.length).toBe(12);
    });

    it("all have labels", () => {
      const lib = ppCuttingToolEncoderEngine.embedReferenceLibrary();
      for (const t of lib) {
        expect(t.label.length).toBeGreaterThan(0);
      }
    });
  });

  describe("compare", () => {
    it("same-type tools are more similar", () => {
      const sameType = ppCuttingToolEncoderEngine.compare(endmill10, endmill20);
      const diffType = ppCuttingToolEncoderEngine.compare(endmill10, drill8);
      expect(sameType.cosine_similarity).toBeGreaterThan(diffType.cosine_similarity);
    });

    it("returns key differences", () => {
      const result = ppCuttingToolEncoderEngine.compare(endmill10, drill8);
      expect(result.key_differences.length).toBeGreaterThan(0);
      expect(result.key_differences.some(d => d.startsWith("type_"))).toBe(true);
    });

    it("identical tools have similarity 1", () => {
      const result = ppCuttingToolEncoderEngine.compare(endmill10, endmill10);
      expect(result.cosine_similarity).toBeCloseTo(1, 4);
    });
  });

  describe("findNearest", () => {
    it("returns k neighbors", () => {
      const result = ppCuttingToolEncoderEngine.findNearest(endmill10, 3);
      expect(result.neighbors.length).toBe(3);
    });

    it("sorted by descending similarity", () => {
      const result = ppCuttingToolEncoderEngine.findNearest(endmill10, 5);
      for (let i = 1; i < result.neighbors.length; i++) {
        expect(result.neighbors[i].cosine_similarity)
          .toBeLessThanOrEqual(result.neighbors[i - 1].cosine_similarity);
      }
    });

    it("nearest to endmill is another endmill", () => {
      const result = ppCuttingToolEncoderEngine.findNearest(endmill10, 1);
      expect(result.neighbors[0].tool.tool_type).toBe("endmill");
    });

    it("nearest to drill is another drill", () => {
      const result = ppCuttingToolEncoderEngine.findNearest(drill8, 1);
      expect(result.neighbors[0].tool.tool_type).toBe("drill");
    });

    it("neighbors have labels", () => {
      const result = ppCuttingToolEncoderEngine.findNearest(endmill10, 3);
      for (const n of result.neighbors) {
        expect(n.label.length).toBeGreaterThan(0);
      }
    });
  });

  describe("dimensionName", () => {
    it("returns known names", () => {
      expect(ppCuttingToolEncoderEngine.dimensionName(0)).toBe("type_endmill");
      expect(ppCuttingToolEncoderEngine.dimensionName(8)).toBe("diameter_norm");
      expect(ppCuttingToolEncoderEngine.dimensionName(35)).toBe("ld_ratio_norm");
    });
  });
});
