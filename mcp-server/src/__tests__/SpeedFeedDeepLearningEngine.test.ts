/**
 * SpeedFeedDeepLearningEngine — test surface.
 *
 * Unblocks `stop_on_unwired_assets.mjs` after the SF-PSN-WIRE-MS0/U-SFPSN-01
 * header edit re-surfaced the DL engine as "untested".
 *
 * Strategy: exercise every public method on the singleton with REAL
 * reference values and algebraic invariants. We avoid asserting exact
 * neural-network outputs (NN weights may be randomly initialized at module
 * load) and instead assert:
 *   - structural shape (every returned field present, numeric, finite)
 *   - algebraic identities baked into the engine (RPM ↔ Vc, feed_rate ↔ fz×n×z,
 *     Taylor monotonicity, Ra ∝ fz², power scales with Vc, Kienzle force
 *     scales with ap)
 *   - qualitative ISO-group ordering (Vc_aluminum > Vc_titanium)
 *   - boolean gate semantics (within_machine_limits, chip_load_balanced)
 *   - feedback ↔ stats round-trip
 */

import { describe, it, expect } from "vitest";
import { speedFeedDeepLearningEngine } from "../engines/SpeedFeedDeepLearningEngine.js";

describe("SpeedFeedDeepLearningEngine", () => {
  describe("predictSpeed", () => {
    it("returns finite, structurally complete prediction for 4140 steel", () => {
      const r = speedFeedDeepLearningEngine.predictSpeed("4140 steel", 12, 4, "milling", "roughing", 200);
      expect(Number.isFinite(r.cutting_speed_mpm)).toBe(true);
      expect(r.cutting_speed_mpm).toBeGreaterThan(0);
      expect(Number.isFinite(r.spindle_rpm)).toBe(true);
      expect(r.spindle_rpm).toBeGreaterThan(0);
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(r.reasoning)).toBe(true);
      expect(r.reasoning.length).toBeGreaterThanOrEqual(4);
      expect(typeof r.physics_basis).toBe("string");
      expect(r.monte_carlo.samples).toBe(1000);
      expect(r.monte_carlo.confidence_95.lower).toBeLessThanOrEqual(r.monte_carlo.confidence_95.upper);
    });

    it("enforces the algebraic identity RPM × π × D / 1000 ≈ Vc (round-trip ≤1 m/min)", () => {
      // Engine computes rpm from UN-rounded Vc, then rounds Vc to integer.
      // Reconstructing Vc from rpm therefore matches cutting_speed_mpm within ±0.5
      // (Vc rounding) + ±π·D/2000 (rpm rounding) = under 1 m/min for any small D.
      const D = 10;
      const r = speedFeedDeepLearningEngine.predictSpeed("6061 aluminum", D, 3, "milling", "finishing", 95);
      const reconstructedVc = (r.spindle_rpm * Math.PI * D) / 1000;
      expect(Math.abs(reconstructedVc - r.cutting_speed_mpm)).toBeLessThan(1.0);
    });

    it("orders ISO groups correctly: aluminum (N) > titanium (S) cutting speed", () => {
      const al = speedFeedDeepLearningEngine.predictSpeed("6061 aluminum", 12, 3, "milling", "roughing", 95);
      const ti = speedFeedDeepLearningEngine.predictSpeed("ti-6al-4v titanium", 12, 3, "milling", "roughing", 320);
      expect(al.cutting_speed_mpm).toBeGreaterThan(ti.cutting_speed_mpm);
    });
  });

  describe("predictFeed", () => {
    it("returns balanced chip load for typical 4-flute roughing in stainless 316", () => {
      const r = speedFeedDeepLearningEngine.predictFeed("316 stainless", 12, 4, 80, "roughing", 4, 6);
      expect(r.feed_per_tooth_mm).toBeGreaterThan(0);
      expect(r.feed_per_tooth_mm).toBeLessThan(0.5); // sanity ceiling
      expect(r.feed_rate_mmmin).toBeGreaterThan(0);
      // Engine rounds feed_per_tooth and feed_per_rev to 3 dp INDEPENDENTLY, so
      // their relation drifts by up to ±0.001 even though both derive from the
      // same unrounded finalFeed × flutes.
      expect(r.feed_per_rev_mm).toBeCloseTo(r.feed_per_tooth_mm * 4, 2);
      expect(typeof r.chip_load_balanced).toBe("boolean");
    });

    it("feed_rate matches rpm × feed_per_rev within the engine's 3-dp rounding cascade", () => {
      const D = 10;
      const flutes = 3;
      const Vc = 200;
      const r = speedFeedDeepLearningEngine.predictFeed("6061 aluminum", D, flutes, Vc, "semi_finishing", 2, 5);
      const rpm = (Vc * 1000) / (Math.PI * D);
      // The engine returns feed_per_tooth and feed_per_rev rounded to 3 dp, then
      // returns feed_rate computed from the UN-rounded internals. Reconstructing
      // feed_rate from the rounded feed_per_rev therefore drifts up to
      // ceil(rpm × 0.001) mm/min from the engine's value.
      const expectedFeedRate = Math.round(rpm * r.feed_per_rev_mm);
      const tolerance = Math.ceil(rpm * 0.001) + 1;
      expect(Math.abs(r.feed_rate_mmmin - expectedFeedRate)).toBeLessThanOrEqual(tolerance);
    });
  });

  describe("predictToolLife", () => {
    it("Taylor monotonicity: doubling Vc shortens life (steel 1045, carbide)", () => {
      const lowV = speedFeedDeepLearningEngine.predictToolLife("1045 steel", 100, 0.10, 2.0, "carbide");
      const highV = speedFeedDeepLearningEngine.predictToolLife("1045 steel", 200, 0.10, 2.0, "carbide");
      expect(highV.tool_life_min).toBeLessThan(lowV.tool_life_min);
    });

    it("PCD outlasts HSS at identical conditions on aluminum", () => {
      const hss = speedFeedDeepLearningEngine.predictToolLife("6061 aluminum", 300, 0.08, 1.5, "hss");
      const pcd = speedFeedDeepLearningEngine.predictToolLife("6061 aluminum", 300, 0.08, 1.5, "pcd");
      expect(pcd.tool_life_min).toBeGreaterThan(hss.tool_life_min);
      // Engine wires PCD factor at 2.0× and HSS at 0.3×, so ratio ≈ 6.67.
      expect(pcd.tool_life_min / Math.max(1, hss.tool_life_min)).toBeGreaterThan(3);
    });

    it("returns Taylor basis with positive C, n in (0,1), and matching Vc", () => {
      const r = speedFeedDeepLearningEngine.predictToolLife("4140 steel", 150, 0.10, 2.0);
      expect(r.taylor_basis.C).toBeGreaterThan(0);
      expect(r.taylor_basis.n).toBeGreaterThan(0);
      expect(r.taylor_basis.n).toBeLessThan(1);
      expect(r.taylor_basis.Vc).toBe(150);
      expect(r.weibull_shape).toBe(2.0);
      expect(r.weibull_scale).toBeGreaterThan(r.tool_life_min); // scale > mean for shape=2 (× 1.13)
    });
  });

  describe("predictSurfaceFinish", () => {
    it("Ra scales quadratically with feed (Ra ∝ fz²): doubling fz ≈ 4× Ra", () => {
      const lo = speedFeedDeepLearningEngine.predictSurfaceFinish(0.05, 0.8, "milling", "finishing");
      const hi = speedFeedDeepLearningEngine.predictSurfaceFinish(0.10, 0.8, "milling", "finishing");
      const ratio = hi.predicted_Ra_um / lo.predicted_Ra_um;
      expect(ratio).toBeGreaterThan(3);
      expect(ratio).toBeLessThan(5);
    });

    it("smaller corner radius flagged in limiting_factors", () => {
      const r = speedFeedDeepLearningEngine.predictSurfaceFinish(0.05, 0.2, "milling", "finishing");
      expect(r.limiting_factors.some(s => s.toLowerCase().includes("corner"))).toBe(true);
    });
  });

  describe("predictPower", () => {
    it("power scales approximately linearly with cutting speed (P = Fc·Vc/60000)", () => {
      const lo = speedFeedDeepLearningEngine.predictPower("4140 steel", 100, 0.10, 2.0, 5.0, 15);
      const hi = speedFeedDeepLearningEngine.predictPower("4140 steel", 300, 0.10, 2.0, 5.0, 15);
      // At fixed fz/ap/ae, Fc is constant, so P_hi / P_lo ≈ Vc_hi / Vc_lo = 3.0
      expect(hi.power_kW / lo.power_kW).toBeGreaterThan(2.8);
      expect(hi.power_kW / lo.power_kW).toBeLessThan(3.2);
    });

    it("flips within_machine_limits=false past 80% of machine power", () => {
      // 4140 steel + heavy cut on a small machine: should exceed.
      const r = speedFeedDeepLearningEngine.predictPower("4140 steel", 400, 0.20, 8.0, 12.0, 3);
      expect(r.within_machine_limits).toBe(false);
      expect(r.power_utilization_pct).toBeGreaterThan(80);
    });

    it("Kienzle basis returns canonical P-group kc1.1=1800 N/mm² and positive Fc", () => {
      const r = speedFeedDeepLearningEngine.predictPower("1045 steel", 150, 0.10, 2.0, 5.0, 15);
      expect(r.kienzle_basis.kc1_1).toBe(1800);
      expect(r.kienzle_basis.mc).toBeGreaterThan(0);
      expect(r.kienzle_basis.mc).toBeLessThan(1);
      expect(r.kienzle_basis.Fc).toBeGreaterThan(0);
    });
  });

  describe("chainOfThoughtAnalysis", () => {
    it("emits exactly 5 reasoning steps with monotonic step indices and bounded confidence", () => {
      const r = speedFeedDeepLearningEngine.chainOfThoughtAnalysis("316 stainless", 10, 4, "milling", "roughing");
      expect(r.reasoning_steps.length).toBe(5);
      r.reasoning_steps.forEach((s, idx) => {
        expect(s.step).toBe(idx + 1);
        expect(s.confidence).toBeGreaterThan(0);
        expect(s.confidence).toBeLessThanOrEqual(1);
        expect(typeof s.principle).toBe("string");
      });
      expect(r.physics_validated).toBe(true);
      // overall_confidence = product of step confidences, all ∈ (0,1].
      expect(r.overall_confidence).toBeGreaterThan(0);
      expect(r.overall_confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("bayesianOptimize", () => {
    it("returns a constraint-feasible optimum (or converged=false) with valid bounded params", () => {
      const r = speedFeedDeepLearningEngine.bayesianOptimize(
        "4140 steel", 10, 4, "milling",
        { max_power_kW: 15, min_tool_life_min: 30, max_Ra_um: 3.2 }
      );
      expect(r.iterations).toBe(50);
      expect(r.optimal_speed_mpm).toBeGreaterThanOrEqual(50);
      expect(r.optimal_speed_mpm).toBeLessThanOrEqual(400);
      expect(r.optimal_feed_mm).toBeGreaterThanOrEqual(0.02);
      expect(r.optimal_feed_mm).toBeLessThanOrEqual(0.20);
      expect(r.optimal_depth_mm).toBeGreaterThanOrEqual(0.5);
      expect(r.optimal_depth_mm).toBeLessThanOrEqual(5.0);
      if (r.convergence) {
        // If converged, the optimum must satisfy all three constraints.
        expect(r.predicted_tool_life).toBeGreaterThanOrEqual(30);
        expect(r.predicted_finish).toBeLessThanOrEqual(3.2);
      }
    });
  });

  describe("comprehensiveAnalysis", () => {
    it("returns nine sub-results with concrete numeric content + weighted overall_confidence in (0,1]", async () => {
      const r = await speedFeedDeepLearningEngine.comprehensiveAnalysis({
        material: "6061 aluminum",
        tool_diameter_mm: 12,
        flutes: 3,
        operation: "milling",
        cut_type: "semi_finishing",
        hardness_HB: 95,
      });
      // speed sub-result: positive Vc + algebraic RPM round-trip (within 1 m/min, see predictSpeed test).
      expect(r.speed.cutting_speed_mpm).toBeGreaterThan(0);
      const reconstructedVc = (r.speed.spindle_rpm * Math.PI * 12) / 1000;
      expect(Math.abs(reconstructedVc - r.speed.cutting_speed_mpm)).toBeLessThan(1.0);
      // feed sub-result: positive fz + feed_per_rev = fz × flutes
      expect(r.feed.feed_per_tooth_mm).toBeGreaterThan(0);
      // 3-dp independent rounding drift (see predictFeed test for derivation).
      expect(r.feed.feed_per_rev_mm).toBeCloseTo(r.feed.feed_per_tooth_mm * 3, 2);
      // tool_life sub-result: positive life + Weibull shape exactly 2
      expect(r.tool_life.tool_life_min).toBeGreaterThan(0);
      expect(r.tool_life.weibull_shape).toBe(2.0);
      // surface_finish sub-result: positive Ra + range encloses point estimate
      expect(r.surface_finish.predicted_Ra_um).toBeGreaterThan(0);
      expect(r.surface_finish.achievable_range.min).toBeLessThanOrEqual(r.surface_finish.predicted_Ra_um);
      expect(r.surface_finish.achievable_range.max).toBeGreaterThanOrEqual(r.surface_finish.predicted_Ra_um);
      // power sub-result: positive kW + non-negative utilization
      expect(r.power.power_kW).toBeGreaterThan(0);
      expect(r.power.power_utilization_pct).toBeGreaterThanOrEqual(0);
      // optimized: 50 iterations, valid bounds
      expect(r.optimized.iterations).toBe(50);
      expect(r.optimized.optimal_speed_mpm).toBeGreaterThanOrEqual(50);
      // reasoning: 5 chain-of-thought steps, physics_validated
      expect(r.reasoning.reasoning_steps.length).toBe(5);
      expect(r.reasoning.physics_validated).toBe(true);
      // tribal_insights: 6061 triggers aluminum tips (2 entries)
      expect(r.tribal_insights.length).toBeGreaterThanOrEqual(2);
      expect(r.tribal_insights.some(s => s.toLowerCase().includes("aluminum"))).toBe(true);
      // self_learning_adjustments: initial calibration vector populated for all 4 keys
      expect(r.self_learning_adjustments.speed).toBeGreaterThan(0);
      expect(r.self_learning_adjustments.feed).toBeGreaterThan(0);
      expect(r.self_learning_adjustments.tool_life).toBeGreaterThan(0);
      expect(r.self_learning_adjustments.surface_finish).toBeGreaterThan(0);
      // overall_confidence weighted sum, bounded.
      expect(r.overall_confidence).toBeGreaterThan(0);
      expect(r.overall_confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("self-learning feedback ↔ stats", () => {
    it("recordFeedback increments getSelfLearningStats().total_feedback", () => {
      const before = speedFeedDeepLearningEngine.getSelfLearningStats().total_feedback;
      speedFeedDeepLearningEngine.recordFeedback(
        "test-job-1",
        { speed_mpm: 200, feed_mm: 0.10, tool_life_min: 60, Ra_um: 1.6 },
        { speed_mpm: 210, feed_mm: 0.095, tool_life_min: 55, Ra_um: 1.8 }
      );
      const after = speedFeedDeepLearningEngine.getSelfLearningStats().total_feedback;
      expect(after).toBe(before + 1);
    });

    it("stats() exposes query counter and the three NNs", () => {
      const before = speedFeedDeepLearningEngine.stats().queries_processed;
      speedFeedDeepLearningEngine.predictSpeed("1045 steel", 10, 4, "milling", "roughing", 200);
      const after = speedFeedDeepLearningEngine.stats();
      expect(after.queries_processed).toBe(before + 1);
      expect(after.neural_networks).toBe(3);
      expect(after.self_learning_feedback).toBe(
        speedFeedDeepLearningEngine.getSelfLearningStats().total_feedback
      );
    });
  });
});
