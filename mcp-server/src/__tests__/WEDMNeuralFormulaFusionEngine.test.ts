/**
 * WEDMNeuralFormulaFusionEngine tests — MS-P0.5-COORD U-P0.5-COORD-06
 */
import { describe, it, expect, beforeEach } from "vitest";
import { wedmNeuralFormulaFusionEngine } from "../engines/WEDMNeuralFormulaFusionEngine.js";

describe("WEDMNeuralFormulaFusionEngine", () => {
  beforeEach(() => {
    wedmNeuralFormulaFusionEngine.resetForTests();
  });

  describe("fuse (cold start)", () => {
    it("uses prior weights when no observations recorded", () => {
      const r = wedmNeuralFormulaFusionEngine.fuse(
        [
          { source: "kienzle", value: 10, priorWeight: 1 },
          { source: "ml", value: 20, priorWeight: 1 },
        ],
        { target: "mrr", material: "D2", operation: "roughing" },
      );
      expect(r.fusedValue).toBeCloseTo(15, 5);
      expect(r.participatingEstimators).toBe(2);
      expect(r.weights.length).toBe(2);
    });

    it("honors non-uniform priors at cold start", () => {
      const r = wedmNeuralFormulaFusionEngine.fuse(
        [
          { source: "a", value: 10, priorWeight: 3 },
          { source: "b", value: 20, priorWeight: 1 },
        ],
        { target: "mrr" },
      );
      expect(r.weights[0].weight).toBeCloseTo(0.75, 3);
      expect(r.weights[1].weight).toBeCloseTo(0.25, 3);
      expect(r.fusedValue).toBeCloseTo(12.5, 3);
    });

    it("returns NaN when no finite estimators", () => {
      const r = wedmNeuralFormulaFusionEngine.fuse(
        [{ source: "bad", value: NaN }],
        { target: "mrr" },
      );
      expect(Number.isNaN(r.fusedValue)).toBe(true);
      expect(r.participatingEstimators).toBe(0);
    });

    it("filters out non-finite estimators but keeps finite ones", () => {
      const r = wedmNeuralFormulaFusionEngine.fuse(
        [
          { source: "a", value: 10 },
          { source: "b", value: NaN },
          { source: "c", value: 20 },
        ],
        { target: "mrr" },
      );
      expect(r.participatingEstimators).toBe(2);
      expect(r.fusedValue).toBeCloseTo(15, 3);
    });
  });

  describe("recordObservation + adaptation", () => {
    it("after observations, consistently-accurate sources gain weight", () => {
      const ctx = { target: "mrr", material: "D2" };
      const estSet = [
        { source: "accurate", value: 10 },
        { source: "noisy", value: 50 },
      ];
      for (let i = 0; i < 5; i++) {
        wedmNeuralFormulaFusionEngine.recordObservation(estSet, 10, ctx);
      }
      const r = wedmNeuralFormulaFusionEngine.fuse(estSet, ctx);
      const accurateW = r.weights.find((w) => w.source === "accurate")!.weight;
      const noisyW = r.weights.find((w) => w.source === "noisy")!.weight;
      expect(accurateW).toBeGreaterThan(noisyW);
    });

    it("fused value pulls toward accurate estimator after adaptation", () => {
      const ctx = { target: "ra", material: "Ti6Al4V" };
      const estSet = [
        { source: "good", value: 3.2 },
        { source: "bad", value: 12.0 },
      ];
      for (let i = 0; i < 10; i++) {
        wedmNeuralFormulaFusionEngine.recordObservation(estSet, 3.2, ctx);
      }
      const r = wedmNeuralFormulaFusionEngine.fuse(estSet, ctx);
      expect(r.fusedValue).toBeLessThan(7.6);
      expect(r.fusedValue).toBeGreaterThan(3.0);
    });

    it("residuals correctly reflect per-source absolute error", () => {
      const r = wedmNeuralFormulaFusionEngine.recordObservation(
        [
          { source: "a", value: 10 },
          { source: "b", value: 7 },
        ],
        9,
        { target: "mrr" },
      );
      expect(r.residualsBySource.a).toBeCloseTo(1, 3);
      expect(r.residualsBySource.b).toBeCloseTo(2, 3);
    });

    it("different contexts do not share weights", () => {
      const ctxA = { target: "mrr", material: "D2" };
      const ctxB = { target: "mrr", material: "Ti" };
      const estSet = [
        { source: "a", value: 10 },
        { source: "b", value: 20 },
      ];
      for (let i = 0; i < 5; i++) {
        wedmNeuralFormulaFusionEngine.recordObservation(estSet, 10, ctxA);
      }
      const rA = wedmNeuralFormulaFusionEngine.fuse(estSet, ctxA);
      const rB = wedmNeuralFormulaFusionEngine.fuse(estSet, ctxB);
      expect(rA.weights[0].weight).toBeGreaterThan(rB.weights[0].weight);
    });
  });

  describe("stdDev and effectiveN", () => {
    it("stdDev is zero when all estimators agree", () => {
      const r = wedmNeuralFormulaFusionEngine.fuse(
        [
          { source: "a", value: 10 },
          { source: "b", value: 10 },
        ],
        { target: "mrr" },
      );
      expect(r.stdDev).toBeCloseTo(0, 5);
    });

    it("stdDev reflects disagreement", () => {
      const r = wedmNeuralFormulaFusionEngine.fuse(
        [
          { source: "a", value: 1 },
          { source: "b", value: 9 },
        ],
        { target: "mrr" },
      );
      expect(r.stdDev).toBeGreaterThan(0);
    });

    it("effectiveN reflects weight concentration (equal weights -> N)", () => {
      const r = wedmNeuralFormulaFusionEngine.fuse(
        [
          { source: "a", value: 1 },
          { source: "b", value: 2 },
          { source: "c", value: 3 },
        ],
        { target: "mrr" },
      );
      expect(r.effectiveN).toBeCloseTo(3, 1);
    });
  });

  describe("stats", () => {
    it("tracks totalFusions and totalObservations", () => {
      const est = [{ source: "a", value: 1 }];
      wedmNeuralFormulaFusionEngine.fuse(est, { target: "m" });
      wedmNeuralFormulaFusionEngine.fuse(est, { target: "m" });
      wedmNeuralFormulaFusionEngine.recordObservation(est, 1, { target: "m" });
      const s = wedmNeuralFormulaFusionEngine.getStats();
      expect(s.totalFusions).toBe(2);
      expect(s.totalObservations).toBe(1);
    });

    it("getContextStats returns null for unknown context", () => {
      expect(wedmNeuralFormulaFusionEngine.getContextStats({ target: "never-used" })).toBeNull();
    });

    it("getContextStats returns EMA errors for tracked context", () => {
      const ctx = { target: "mrr", material: "D2" };
      const est = [
        { source: "a", value: 10 },
        { source: "b", value: 14 },
      ];
      wedmNeuralFormulaFusionEngine.recordObservation(est, 10, ctx);
      const s = wedmNeuralFormulaFusionEngine.getContextStats(ctx);
      expect(s?.observations).toBe(1);
      expect(s?.sources.length).toBe(2);
      expect(s?.sources[0].source).toBe("a");
    });
  });
});
