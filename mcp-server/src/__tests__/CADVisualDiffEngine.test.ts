/**
 * CADVisualDiffEngine.test.ts — U-FS-05 (PHASE-47)
 *
 * Verifies feature-tree diff + parameter delta + perceptual-hash comparison.
 */

import { describe, it, expect } from "vitest";
import { CADVisualDiffEngine } from "../engines/CADVisualDiffEngine.js";
import type { FeatureSnapshot } from "../schemas/cadVisualDiffSchema.js";

const eng = new CADVisualDiffEngine();

function feat(
  id: string,
  type: string,
  params: FeatureSnapshot["parameters"],
  order = 0,
): FeatureSnapshot {
  return { id, featureType: type, parameters: params, order };
}

describe("CADVisualDiffEngine (U-FS-05)", () => {
  describe("diffFeatureTrees — classification", () => {
    it("identifies added features", () => {
      const diffs = eng.diffFeatureTrees(
        [feat("F1", "extrude", { depth: 10 })],
        [feat("F1", "extrude", { depth: 10 }), feat("F2", "fillet", { r: 2 }, 1)],
      );
      const added = diffs.filter((d) => d.kind === "added");
      expect(added.length).toBe(1);
      expect(added[0].id).toBe("F2");
    });

    it("identifies removed features", () => {
      const diffs = eng.diffFeatureTrees(
        [feat("F1", "extrude", { depth: 10 }), feat("F2", "hole", { d: 5 }, 1)],
        [feat("F1", "extrude", { depth: 10 })],
      );
      const removed = diffs.filter((d) => d.kind === "removed");
      expect(removed.length).toBe(1);
      expect(removed[0].id).toBe("F2");
    });

    it("identifies modified features (param change)", () => {
      const diffs = eng.diffFeatureTrees(
        [feat("F1", "extrude", { depth: 10 })],
        [feat("F1", "extrude", { depth: 20 })],
      );
      const mod = diffs.find((d) => d.id === "F1");
      expect(mod?.kind).toBe("modified");
      expect(mod?.parameterDeltas.length).toBe(1);
      expect(mod?.parameterDeltas[0].key).toBe("depth");
      expect(mod?.parameterDeltas[0].numericDelta).toBeCloseTo(10);
      expect(mod?.parameterDeltas[0].percentDelta).toBeCloseTo(100);
    });

    it("identifies feature-type change as modified", () => {
      const diffs = eng.diffFeatureTrees(
        [feat("F1", "extrude", { d: 5 })],
        [feat("F1", "cut", { d: 5 })],
      );
      const m = diffs.find((d) => d.id === "F1");
      expect(m?.kind).toBe("modified");
    });

    it("identifies moved features (order change, params same)", () => {
      const diffs = eng.diffFeatureTrees(
        [feat("F1", "extrude", { d: 5 }, 0)],
        [feat("F1", "extrude", { d: 5 }, 3)],
      );
      const m = diffs.find((d) => d.id === "F1");
      expect(m?.kind).toBe("moved");
      expect(m?.orderBefore).toBe(0);
      expect(m?.orderAfter).toBe(3);
    });

    it("identifies unchanged features", () => {
      const diffs = eng.diffFeatureTrees(
        [feat("F1", "extrude", { d: 5 }, 0)],
        [feat("F1", "extrude", { d: 5 }, 0)],
      );
      const m = diffs.find((d) => d.id === "F1");
      expect(m?.kind).toBe("unchanged");
      expect(m?.parameterDeltas.length).toBe(0);
    });
  });

  describe("diffParameters — numeric + string + boolean", () => {
    it("handles numeric delta with percent change", () => {
      const diffs = eng.diffFeatureTrees(
        [feat("F1", "extrude", { depth: 8 })],
        [feat("F1", "extrude", { depth: 12 })],
      );
      const d = diffs[0].parameterDeltas[0];
      expect(d.numericDelta).toBeCloseTo(4);
      expect(d.percentDelta).toBeCloseTo(50);
    });

    it("handles string param change", () => {
      const diffs = eng.diffFeatureTrees(
        [feat("F1", "part", { material: "A2" })],
        [feat("F1", "part", { material: "D2" })],
      );
      const d = diffs[0].parameterDeltas[0];
      expect(d.before).toBe("A2");
      expect(d.after).toBe("D2");
      expect(d.numericDelta).toBeUndefined();
    });

    it("handles boolean param change", () => {
      const diffs = eng.diffFeatureTrees(
        [feat("F1", "hole", { through: false })],
        [feat("F1", "hole", { through: true })],
      );
      const d = diffs[0].parameterDeltas[0];
      expect(d.before).toBe(false);
      expect(d.after).toBe(true);
    });

    it("handles param added/removed (null bookends)", () => {
      const diffs = eng.diffFeatureTrees(
        [feat("F1", "hole", { d: 5 })],
        [feat("F1", "hole", { d: 5, depth: 10 })],
      );
      const d = diffs[0].parameterDeltas.find((p) => p.key === "depth")!;
      expect(d.before).toBeNull();
      expect(d.after).toBe(10);
    });

    it("ignores floating-point equality within epsilon", () => {
      const diffs = eng.diffFeatureTrees(
        [feat("F1", "extrude", { d: 10.000000001 })],
        [feat("F1", "extrude", { d: 10.000000002 })],
      );
      expect(diffs[0].kind).toBe("unchanged");
    });
  });

  describe("comparePerceptualHashes", () => {
    it("reports identical for same hash", () => {
      const res = eng.comparePerceptualHashes("ff00ff00", "ff00ff00");
      expect(res.hammingDistance).toBe(0);
      expect(res.similarity).toBe(1);
      expect(res.verdict).toBe("identical");
    });

    it("reports different for inverse hash", () => {
      const res = eng.comparePerceptualHashes("ffff", "0000");
      expect(res.hammingDistance).toBe(16);
      expect(res.similarity).toBe(0);
      expect(res.verdict).toBe("different");
    });

    it("reports near_identical for small hamming", () => {
      // 1 bit off in 64 bits → similarity = 63/64 ≈ 0.984 → "identical"
      // 3 bits off in 64 bits → similarity = 61/64 ≈ 0.953 → "near_identical"
      const res = eng.comparePerceptualHashes(
        "f0f0f0f0f0f0f0f0",
        "f0f0f0f0f0f0f0f7", // last nibble 0→7 = 3 bits flipped
      );
      expect(res.hammingDistance).toBe(3);
      expect(res.verdict).toBe("near_identical");
    });

    it("rejects mismatched hash length", () => {
      expect(() => eng.comparePerceptualHashes("ff", "ffff")).toThrow(/lengths/);
    });

    it("rejects non-hex input", () => {
      expect(() => eng.comparePerceptualHashes("zzzz", "0000")).toThrow(/hex/);
    });
  });

  describe("buildReport — full report", () => {
    it("aggregates feature + perceptual + summary", () => {
      const report = eng.buildReport({
        drawingNumber: "PN-100",
        beforeRevision: "A",
        afterRevision: "B",
        beforeTree: [
          feat("F1", "extrude", { depth: 10 }, 0),
          feat("F2", "hole", { d: 5 }, 1),
        ],
        afterTree: [
          feat("F1", "extrude", { depth: 12 }, 0), // modified
          feat("F3", "fillet", { r: 2 }, 1), // added (F2 removed)
        ],
        beforePerceptualHash: "f0f0f0f0f0f0f0f0",
        afterPerceptualHash: "f0f0f0f0f0f0f0f7", // 3 bits diff
        generatedAt: "2026-04-19T00:00:00Z",
      });
      expect(report.summary.added).toBe(1);
      expect(report.summary.removed).toBe(1);
      expect(report.summary.modified).toBe(1);
      expect(report.summary.unchanged).toBe(0);
      expect(report.perceptual?.verdict).toBe("near_identical");
      expect(report.schemaVersion).toBe(1);
    });

    it("omits perceptual block when hashes not provided", () => {
      const report = eng.buildReport({
        drawingNumber: "PN-100",
        beforeRevision: "A",
        afterRevision: "B",
        beforeTree: [feat("F1", "e", { d: 1 })],
        afterTree: [feat("F1", "e", { d: 1 })],
      });
      expect(report.perceptual).toBeUndefined();
      expect(report.summary.unchanged).toBe(1);
    });
  });

  describe("parameter deltas sorted by key", () => {
    it("returns deltas in alphabetical order", () => {
      const diffs = eng.diffFeatureTrees(
        [feat("F1", "x", { z: 1, a: 2, m: 3 })],
        [feat("F1", "x", { z: 10, a: 20, m: 30 })],
      );
      const keys = diffs[0].parameterDeltas.map((d) => d.key);
      expect(keys).toEqual(["a", "m", "z"]);
    });
  });
});
