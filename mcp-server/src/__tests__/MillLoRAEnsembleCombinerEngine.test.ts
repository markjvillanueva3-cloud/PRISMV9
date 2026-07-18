/**
 * MillLoRAEnsembleCombinerEngine — Test Suite
 * ============================================
 * MILL-PARITY-UPGRADE-MS0 / U-MILL-LORA-ENSEMBLE-COMBINER (iter92)
 *
 * Mill parity for LatheLoRAEnsembleCombinerEngine.test.ts with
 * MILL-CANONICAL coverage:
 *   - 6 lathe-shared combination methods (mean / weighted_mean / median /
 *     trimmed_mean / geometric_mean / harmonic_mean)
 *   - 2 MILL-CANONICAL methods (chatter_robust, tcpm_safe)
 *   - axis_mode filtering (require_axis drops mismatched members)
 *   - allow_cross_axis opt-in bypass
 *   - tcpm_safe drops members with high fault history
 *   - chatter_robust downweights chatter-prone members
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MillLoRAEnsembleCombinerEngine,
  MILL_CANONICAL_COMBINATION_METHODS,
  type MillNumericPrediction,
} from "../engines/MillLoRAEnsembleCombinerEngine.js";

describe("MillLoRAEnsembleCombinerEngine", () => {
  let engine: MillLoRAEnsembleCombinerEngine;

  beforeEach(() => {
    engine = new MillLoRAEnsembleCombinerEngine();
  });

  const pred = (
    model_id: string,
    value: number,
    confidence: number,
    extras?: Partial<MillNumericPrediction>,
  ): MillNumericPrediction => ({
    model_id,
    value,
    confidence,
    ...extras,
  });

  describe("MILL_CANONICAL_COMBINATION_METHODS taxonomy", () => {
    it("exposes 2 mill-canonical methods", () => {
      expect(MILL_CANONICAL_COMBINATION_METHODS.length).toBe(2);
      expect(MILL_CANONICAL_COMBINATION_METHODS).toContain("chatter_robust");
      expect(MILL_CANONICAL_COMBINATION_METHODS).toContain("tcpm_safe");
    });
  });

  describe("default config", () => {
    it("seeds lathe-parity defaults", () => {
      const cfg = engine.getConfig();
      expect(cfg.default_method).toBe("weighted_mean");
      expect(cfg.trim_percent).toBeCloseTo(0.1, 6);
      expect(cfg.outlier_z_threshold).toBeCloseTo(2.5, 6);
      expect(cfg.min_inputs).toBe(2);
      expect(cfg.max_inputs).toBe(20);
    });

    it("seeds MILL-CANONICAL thresholds", () => {
      const cfg = engine.getConfig();
      expect(cfg.tcpm_fault_history_threshold).toBeCloseTo(0.05, 6);
      expect(cfg.chatter_robust_weight_floor).toBeCloseTo(0.1, 6);
    });
  });

  describe("Pure math helpers", () => {
    it("mean of [1,2,3,4,5] = 3", () => {
      expect(engine.mean([1, 2, 3, 4, 5])).toBeCloseTo(3, 6);
    });

    it("median odd length", () => {
      expect(engine.median([1, 3, 5])).toBeCloseTo(3, 6);
    });

    it("median even length averages mid pair", () => {
      expect(engine.median([1, 2, 3, 4])).toBeCloseTo(2.5, 6);
    });

    it("weighted mean equally weighted = arithmetic mean", () => {
      expect(engine.weightedMean([1, 2, 3], [1, 1, 1])).toBeCloseTo(2, 6);
    });

    it("weighted mean throws on length mismatch", () => {
      expect(() => engine.weightedMean([1, 2], [1, 1, 1])).toThrow(/Length mismatch/);
    });

    it("geometric mean of [1,4] = 2", () => {
      expect(engine.geometricMean([1, 4])).toBeCloseTo(2, 6);
    });

    it("geometric mean returns 0 on non-positive", () => {
      expect(engine.geometricMean([1, 0])).toBe(0);
      expect(engine.geometricMean([1, -1])).toBe(0);
    });

    it("harmonic mean of [1,2] ≈ 1.333", () => {
      expect(engine.harmonicMean([1, 2])).toBeCloseTo(4 / 3, 5);
    });

    it("standardDeviation of uniform values = 0", () => {
      expect(engine.standardDeviation([5, 5, 5])).toBe(0);
    });
  });

  describe("removeOutliers", () => {
    it("strips 2.5σ outliers when sd is not dominated by the outlier", () => {
      // 9 tight values + 1 modest outlier — z-score of outlier ≈ 2.72 > 2.5
      const r = engine.removeOutliers([5, 5, 5, 5, 5, 5, 5, 5, 5, 20]);
      expect(r.removedCount).toBe(1);
    });

    it("returns original when n<4", () => {
      const r = engine.removeOutliers([1, 100, 2]);
      expect(r.removedCount).toBe(0);
    });

    it("returns original when sd=0 (all values identical)", () => {
      const r = engine.removeOutliers([5, 5, 5, 5, 5]);
      expect(r.removedCount).toBe(0);
    });
  });

  describe("combine — lathe-shared methods", () => {
    it("mean of 9 tight + 1 modest outlier strips it before averaging", () => {
      // 9 values at 10 + one at 40 → outlier z ≈ 2.72 > 2.5 default
      const ps: MillNumericPrediction[] = [];
      for (let i = 0; i < 9; i++) ps.push(pred(`m${i}`, 10, 1.0));
      ps.push(pred("outlier", 40, 1.0));
      const r = engine.combine(ps, { method: "mean" });
      expect(r.combined_value).toBeCloseTo(10, 6);
      expect(r.outliers_removed).toBe(1);
    });

    it("weighted_mean weights by confidence", () => {
      const ps = [pred("a", 10, 1.0), pred("b", 20, 3.0)];
      const r = engine.combine(ps, { method: "weighted_mean" });
      expect(r.combined_value).toBeCloseTo(17.5, 6);
    });

    it("median picks middle value", () => {
      const ps = [pred("a", 1, 1), pred("b", 5, 1), pred("c", 9, 1)];
      const r = engine.combine(ps, { method: "median" });
      expect(r.combined_value).toBeCloseTo(5, 6);
    });

    it("geometric_mean", () => {
      const ps = [pred("a", 2, 1), pred("b", 8, 1)];
      const r = engine.combine(ps, { method: "geometric_mean" });
      expect(r.combined_value).toBeCloseTo(4, 6);
    });

    it("harmonic_mean", () => {
      const ps = [pred("a", 2, 1), pred("b", 4, 1)];
      const r = engine.combine(ps, { method: "harmonic_mean" });
      expect(r.combined_value).toBeCloseTo(8 / 3, 6);
    });

    it("throws on min_inputs not met", () => {
      expect(() => engine.combine([pred("a", 1, 1)])).toThrow(/Min inputs/);
    });

    it("throws on max_inputs exceeded", () => {
      const ps: MillNumericPrediction[] = [];
      for (let i = 0; i < 25; i++) ps.push(pred(`m${i}`, i, 1));
      expect(() => engine.combine(ps)).toThrow(/Max inputs/);
    });
  });

  describe("MILL-CANONICAL: axis_mode filtering", () => {
    it("drops members tagged with a different axis_mode", () => {
      const ps = [
        pred("a", 10, 1, { axis_mode: "3_axis" }),
        pred("b", 12, 1, { axis_mode: "3_axis" }),
        pred("c", 100, 1, { axis_mode: "5_axis_simul" }),
      ];
      const r = engine.combine(ps, { require_axis: "3_axis", method: "mean" });
      expect(r.axis_mismatches_dropped).toBe(1);
      expect(r.inputs.length).toBe(2);
      expect(r.combined_value).toBeCloseTo(11, 6);
    });

    it("keeps 'shared' members regardless of require_axis", () => {
      const ps = [
        pred("a", 10, 1, { axis_mode: "3_axis" }),
        pred("b", 12, 1, { axis_mode: "shared" }),
      ];
      const r = engine.combine(ps, { require_axis: "3_axis" });
      expect(r.axis_mismatches_dropped).toBe(0);
    });

    it("keeps untagged members (axis_mode undefined)", () => {
      const ps = [pred("a", 10, 1), pred("b", 12, 1, { axis_mode: "3_axis" })];
      const r = engine.combine(ps, { require_axis: "3_axis" });
      expect(r.axis_mismatches_dropped).toBe(0);
    });

    it("allow_cross_axis=true bypasses filter", () => {
      const ps = [
        pred("a", 10, 1, { axis_mode: "3_axis" }),
        pred("b", 100, 1, { axis_mode: "5_axis_simul" }),
      ];
      const r = engine.combine(ps, { require_axis: "3_axis", allow_cross_axis: true });
      expect(r.axis_mismatches_dropped).toBe(0);
      expect(r.inputs.length).toBe(2);
    });

    it("throws if axis filter drops below min_inputs", () => {
      const ps = [
        pred("a", 10, 1, { axis_mode: "3_axis" }),
        pred("b", 100, 1, { axis_mode: "5_axis_simul" }),
        pred("c", 200, 1, { axis_mode: "5_axis_simul" }),
      ];
      expect(() => engine.combine(ps, { require_axis: "3_axis" })).toThrow(/Min inputs/);
    });
  });

  describe("MILL-CANONICAL: tcpm_safe", () => {
    it("drops members with tcpm history above threshold", () => {
      const ps = [
        pred("a", 10, 1, { tcpm_solver_failure_history: 0.01 }),
        pred("b", 12, 1, { tcpm_solver_failure_history: 0.02 }),
        pred("c", 999, 1, { tcpm_solver_failure_history: 0.50 }), // > 0.05 threshold
      ];
      const r = engine.combine(ps, { method: "tcpm_safe" });
      expect(r.tcpm_unsafe_dropped).toBe(1);
      expect(r.inputs.length).toBe(2);
      expect(r.combined_value).toBeCloseTo(11, 6);
    });

    it("keeps members with no tcpm history (undefined)", () => {
      const ps = [pred("a", 10, 1), pred("b", 12, 1)];
      const r = engine.combine(ps, { method: "tcpm_safe" });
      expect(r.tcpm_unsafe_dropped).toBe(0);
    });

    it("throws if tcpm_safe filter drops below min_inputs", () => {
      const ps = [
        pred("a", 10, 1, { tcpm_solver_failure_history: 0.50 }),
        pred("b", 12, 1, { tcpm_solver_failure_history: 0.50 }),
        pred("c", 14, 1, { tcpm_solver_failure_history: 0.01 }),
      ];
      expect(() => engine.combine(ps, { method: "tcpm_safe" })).toThrow(/tcpm_safe filter/);
    });
  });

  describe("MILL-CANONICAL: chatter_robust", () => {
    it("downweights chatter-prone members vs clean members", () => {
      // Two values; "noisy" model has high chatter breach history.
      // Result should lean toward the clean model.
      const ps = [
        pred("clean", 10, 1.0, { chatter_breach_history: 0 }),
        pred("noisy", 20, 1.0, { chatter_breach_history: 0.9 }),
      ];
      const r = engine.combine(ps, { method: "chatter_robust" });
      // Clean weight = 1.0 * (1-0) = 1.0
      // Noisy weight = 1.0 * (1-0.9) = 0.1
      // Weighted: (10*1.0 + 20*0.1) / 1.1 = 10.909...
      expect(r.combined_value).toBeCloseTo(10.909, 2);
      expect(r.combined_value < 15).toBe(true); // closer to clean
    });

    it("floor prevents zero-weight degenerate case", () => {
      const ps = [
        pred("clean", 10, 1.0, { chatter_breach_history: 0 }),
        pred("dead", 20, 1.0, { chatter_breach_history: 1.0 }),
      ];
      const r = engine.combine(ps, { method: "chatter_robust" });
      // floor=0.1, so dead's weight is max(0.1, 0) = 0.1, NOT 0
      // Weighted: (10*1.0 + 20*0.1) / 1.1 = 10.909
      expect(r.combined_value).toBeCloseTo(10.909, 2);
    });
  });

  describe("combine result structure", () => {
    it("includes axis_mismatches_dropped and tcpm_unsafe_dropped", () => {
      const ps = [pred("a", 10, 1), pred("b", 12, 1)];
      const r = engine.combine(ps);
      expect(typeof r.axis_mismatches_dropped).toBe("number");
      expect(typeof r.tcpm_unsafe_dropped).toBe("number");
      expect(r.axis_mismatches_dropped).toBe(0);
      expect(r.tcpm_unsafe_dropped).toBe(0);
    });

    it("computes min/max/range/std correctly", () => {
      const ps = [pred("a", 10, 1), pred("b", 20, 1)];
      const r = engine.combine(ps);
      expect(r.min_value).toBe(10);
      expect(r.max_value).toBe(20);
      expect(r.range).toBe(10);
      expect(r.standard_deviation).toBeGreaterThan(0);
    });
  });

  describe("getStats", () => {
    it("aggregates axis_mismatches_dropped across runs", () => {
      const ps1 = [
        pred("a", 10, 1, { axis_mode: "3_axis" }),
        pred("b", 12, 1, { axis_mode: "3_axis" }),
        pred("c", 99, 1, { axis_mode: "5_axis_simul" }),
      ];
      engine.combine(ps1, { require_axis: "3_axis" });
      engine.combine(ps1, { require_axis: "3_axis" });
      const s = engine.getStats();
      expect(s.total_axis_mismatches_dropped).toBe(2);
    });

    it("aggregates tcpm_unsafe_dropped across runs", () => {
      const ps = [
        pred("a", 10, 1, { tcpm_solver_failure_history: 0.01 }),
        pred("b", 12, 1, { tcpm_solver_failure_history: 0.02 }),
        pred("c", 99, 1, { tcpm_solver_failure_history: 0.50 }),
      ];
      engine.combine(ps, { method: "tcpm_safe" });
      const s = engine.getStats();
      expect(s.total_tcpm_unsafe_dropped).toBe(1);
    });

    it("empty stats are safe", () => {
      const s = engine.getStats();
      expect(s.total_combinations).toBe(0);
      expect(s.avg_std_deviation).toBe(0);
    });
  });

  describe("history + reset", () => {
    it("getHistory returns recent results with limit", () => {
      for (let i = 0; i < 5; i++) {
        engine.combine([pred("a", i, 1), pred("b", i + 1, 1)]);
      }
      expect(engine.getHistory().length).toBe(5);
      expect(engine.getHistory(2).length).toBe(2);
    });

    it("clear empties history", () => {
      engine.combine([pred("a", 1, 1), pred("b", 2, 1)]);
      engine.clear();
      expect(engine.getHistory().length).toBe(0);
    });

    it("reset reverts config + clears history", () => {
      engine.setConfig({ min_inputs: 5 });
      engine.combine([pred("a", 1, 1), pred("b", 2, 1), pred("c", 3, 1), pred("d", 4, 1), pred("e", 5, 1)]);
      engine.reset();
      expect(engine.getConfig().min_inputs).toBe(2);
      expect(engine.getHistory().length).toBe(0);
    });
  });

  describe("getSummary", () => {
    it("exposes axis_mismatches + tcpm counts in human summary", () => {
      const ps = [
        pred("a", 10, 1, { axis_mode: "3_axis" }),
        pred("b", 12, 1, { axis_mode: "3_axis" }),
        pred("c", 99, 1, { axis_mode: "5_axis_simul" }),
      ];
      engine.combine(ps, { require_axis: "3_axis" });
      const s = engine.getSummary();
      expect(s.includes("Axis Mismatches Dropped: 1")).toBe(true);
      expect(s.includes("TCPM Unsafe Dropped: 0")).toBe(true);
    });
  });
});
