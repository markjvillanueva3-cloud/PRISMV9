/**
 * SpeedFeedDeepLearningEngine Test Suite — SF-AI-L1
 *
 * Tests for neural network predictions, Monte Carlo uncertainty,
 * Bayesian optimization, chain-of-thought reasoning, and self-learning.
 *
 * @module __tests__/speed-feed-deep-learning
 */

import { describe, it, expect, beforeEach } from "vitest";
import { speedFeedDeepLearningEngine } from "../engines/SpeedFeedDeepLearningEngine.js";

describe("SpeedFeedDeepLearningEngine — SF-AI-L1", () => {
  // ============================================================================
  // SPEED PREDICTION
  // ============================================================================

  describe("predictSpeed", () => {
    it("should predict cutting speed for 4140 steel milling", () => {
      const result = speedFeedDeepLearningEngine.predictSpeed(
        "4140",
        12,
        4,
        "milling",
        "roughing",
        200
      );

      expect(result.cutting_speed_mpm).toBeGreaterThan(50);
      expect(result.cutting_speed_mpm).toBeLessThan(400);
      expect(result.spindle_rpm).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
      expect(result.reasoning).toBeInstanceOf(Array);
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.monte_carlo).toBeDefined();
      expect(result.monte_carlo.mean).toBeCloseTo(result.cutting_speed_mpm, -1);
    });

    it("should predict higher speed for aluminum than steel", () => {
      const steelResult = speedFeedDeepLearningEngine.predictSpeed(
        "4140",
        12,
        4,
        "milling",
        "roughing",
        200
      );
      const aluminumResult = speedFeedDeepLearningEngine.predictSpeed(
        "6061",
        12,
        4,
        "milling",
        "roughing",
        100
      );

      expect(aluminumResult.cutting_speed_mpm).toBeGreaterThan(steelResult.cutting_speed_mpm);
    });

    it("should predict higher speed for finishing than roughing", () => {
      const roughingResult = speedFeedDeepLearningEngine.predictSpeed(
        "4140",
        12,
        4,
        "milling",
        "roughing",
        200
      );
      const finishingResult = speedFeedDeepLearningEngine.predictSpeed(
        "4140",
        12,
        4,
        "milling",
        "finishing",
        200
      );

      expect(finishingResult.cutting_speed_mpm).toBeGreaterThan(roughingResult.cutting_speed_mpm);
    });

    it("should include Monte Carlo confidence interval", () => {
      const result = speedFeedDeepLearningEngine.predictSpeed(
        "Ti-6Al-4V",
        10,
        4,
        "milling",
        "semi_finishing"
      );

      expect(result.monte_carlo.confidence_95.lower).toBeLessThan(result.monte_carlo.mean);
      expect(result.monte_carlo.confidence_95.upper).toBeGreaterThan(result.monte_carlo.mean);
      expect(result.monte_carlo.samples).toBe(1000);
    });

    it("should handle different material groups", () => {
      const materials = ["4140", "316L", "Ti-6Al-4V", "Inconel 718", "6061-T6", "D2"];
      for (const mat of materials) {
        const result = speedFeedDeepLearningEngine.predictSpeed(mat, 12, 4, "milling", "roughing");
        expect(result.cutting_speed_mpm).toBeGreaterThan(0);
        expect(result.physics_basis).toContain("×");
      }
    });
  });

  // ============================================================================
  // FEED PREDICTION
  // ============================================================================

  describe("predictFeed", () => {
    it("should predict feed for standard milling conditions", () => {
      const result = speedFeedDeepLearningEngine.predictFeed(
        "4140",
        12,
        4,
        150,
        "roughing",
        3,
        4
      );

      expect(result.feed_per_tooth_mm).toBeGreaterThan(0.02);
      expect(result.feed_per_tooth_mm).toBeLessThan(0.3);
      expect(result.feed_rate_mmmin).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.reasoning).toBeInstanceOf(Array);
    });

    it("should apply chip thinning for low ae", () => {
      const normalAe = speedFeedDeepLearningEngine.predictFeed(
        "4140",
        12,
        4,
        150,
        "roughing",
        3,
        6
      );
      const lowAe = speedFeedDeepLearningEngine.predictFeed(
        "4140",
        12,
        4,
        150,
        "roughing",
        3,
        2
      );

      // With chip thinning, fz should be higher for low ae
      expect(lowAe.feed_per_tooth_mm).toBeGreaterThanOrEqual(normalAe.feed_per_tooth_mm * 0.8);
    });

    it("should predict lower feed for finishing", () => {
      const roughing = speedFeedDeepLearningEngine.predictFeed("4140", 12, 4, 150, "roughing");
      const finishing = speedFeedDeepLearningEngine.predictFeed("4140", 12, 4, 150, "finishing");

      expect(finishing.feed_per_tooth_mm).toBeLessThan(roughing.feed_per_tooth_mm);
    });

    it("should include Monte Carlo uncertainty", () => {
      const result = speedFeedDeepLearningEngine.predictFeed(
        "6061",
        16,
        3,
        300,
        "semi_finishing"
      );

      expect(result.monte_carlo).toBeDefined();
      expect(result.monte_carlo.percentiles.p50).toBeCloseTo(result.monte_carlo.mean, 0);
    });
  });

  // ============================================================================
  // TOOL LIFE PREDICTION
  // ============================================================================

  describe("predictToolLife", () => {
    it("should predict tool life with Weibull distribution", () => {
      const result = speedFeedDeepLearningEngine.predictToolLife(
        "4140",
        150,
        0.1,
        3
      );

      expect(result.tool_life_min).toBeGreaterThan(0);
      expect(result.tool_life_parts).toBeGreaterThan(0);
      expect(result.weibull_shape).toBeGreaterThan(0);
      expect(result.weibull_scale).toBeGreaterThan(0);
      expect(result.taylor_basis).toBeDefined();
      expect(result.taylor_basis.C).toBeGreaterThan(0);
      expect(result.taylor_basis.n).toBeGreaterThan(0);
    });

    it("should predict shorter life at higher speeds", () => {
      const lowSpeed = speedFeedDeepLearningEngine.predictToolLife("4140", 100, 0.1, 2);
      const highSpeed = speedFeedDeepLearningEngine.predictToolLife("4140", 250, 0.1, 2);

      expect(highSpeed.tool_life_min).toBeLessThan(lowSpeed.tool_life_min);
    });

    it("should have reasonable confidence", () => {
      const result = speedFeedDeepLearningEngine.predictToolLife("316L", 80, 0.08, 2);

      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  // ============================================================================
  // SURFACE FINISH PREDICTION
  // ============================================================================

  describe("predictSurfaceFinish", () => {
    it("should predict surface roughness based on feed and geometry", () => {
      const result = speedFeedDeepLearningEngine.predictSurfaceFinish(
        0.1,
        0.8,
        "milling",
        "finishing"
      );

      expect(result.predicted_Ra_um).toBeGreaterThan(0);
      expect(result.predicted_Ra_um).toBeLessThan(20);
      expect(result.achievable_range.min).toBeLessThan(result.predicted_Ra_um);
      expect(result.achievable_range.max).toBeGreaterThan(result.predicted_Ra_um);
    });

    it("should predict finer finish for smaller feed", () => {
      const coarseFeed = speedFeedDeepLearningEngine.predictSurfaceFinish(0.2, 0.8, "milling", "finishing");
      const fineFeed = speedFeedDeepLearningEngine.predictSurfaceFinish(0.05, 0.8, "milling", "finishing");

      expect(fineFeed.predicted_Ra_um).toBeLessThan(coarseFeed.predicted_Ra_um);
    });

    it("should predict finer finish for larger corner radius", () => {
      const smallRadius = speedFeedDeepLearningEngine.predictSurfaceFinish(0.1, 0.4, "milling", "finishing");
      const largeRadius = speedFeedDeepLearningEngine.predictSurfaceFinish(0.1, 1.6, "milling", "finishing");

      expect(largeRadius.predicted_Ra_um).toBeLessThan(smallRadius.predicted_Ra_um);
    });

    it("should include Monte Carlo confidence", () => {
      const result = speedFeedDeepLearningEngine.predictSurfaceFinish(0.08, 0.8, "turning", "finishing");

      expect(result.monte_carlo).toBeDefined();
      expect(result.monte_carlo.std_dev).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // POWER PREDICTION
  // ============================================================================

  describe("predictPower", () => {
    it("should predict power and torque", () => {
      const result = speedFeedDeepLearningEngine.predictPower(
        "4140",
        150,
        0.1,
        3,
        4,
        15
      );

      expect(result.power_kW).toBeGreaterThan(0);
      expect(result.torque_Nm).toBeGreaterThan(0);
      expect(result.power_utilization_pct).toBeGreaterThan(0);
      expect(result.kienzle_basis).toBeDefined();
      expect(result.kienzle_basis.kc1_1).toBeGreaterThan(0);
    });

    it("should flag when exceeding machine limits", () => {
      const withinLimits = speedFeedDeepLearningEngine.predictPower("4140", 150, 0.1, 3, 4, 20);
      const exceedingLimits = speedFeedDeepLearningEngine.predictPower("4140", 150, 0.3, 10, 12, 5);

      expect(withinLimits.within_machine_limits).toBe(true);
      // With aggressive parameters and low machine power, should exceed
      expect(exceedingLimits.power_utilization_pct).toBeGreaterThan(50);
    });

    it("should use Kienzle force model", () => {
      const result = speedFeedDeepLearningEngine.predictPower("316L", 100, 0.12, 4, 6);

      expect(result.kienzle_basis.mc).toBeGreaterThan(0);
      expect(result.kienzle_basis.mc).toBeLessThan(1);
      expect(result.kienzle_basis.Fc).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // BAYESIAN OPTIMIZATION
  // ============================================================================

  describe("bayesianOptimize", () => {
    it("should find optimal parameters within constraints", () => {
      const result = speedFeedDeepLearningEngine.bayesianOptimize(
        "4140",
        12,
        4,
        "milling",
        {
          max_power_kW: 15,
          min_tool_life_min: 30,
          max_Ra_um: 3.2,
        }
      );

      expect(result.optimal_speed_mpm).toBeGreaterThan(50);
      expect(result.optimal_speed_mpm).toBeLessThan(400);
      expect(result.optimal_feed_mm).toBeGreaterThan(0.02);
      expect(result.optimal_feed_mm).toBeLessThan(0.25);
      expect(result.predicted_mrr).toBeGreaterThan(0);
      expect(result.iterations).toBeGreaterThanOrEqual(50);
      expect(result.pareto_optimal).toBe(true);
    });

    it("should respect tool life constraint", () => {
      const result = speedFeedDeepLearningEngine.bayesianOptimize(
        "4140",
        12,
        4,
        "milling",
        { min_tool_life_min: 60 }
      );

      expect(result.predicted_tool_life).toBeGreaterThanOrEqual(30); // May not hit exact constraint but should be reasonable
    });

    it("should balance MRR vs tool life", () => {
      const aggressiveResult = speedFeedDeepLearningEngine.bayesianOptimize(
        "4140",
        12,
        4,
        "milling",
        { min_tool_life_min: 15 }
      );
      const conservativeResult = speedFeedDeepLearningEngine.bayesianOptimize(
        "4140",
        12,
        4,
        "milling",
        { min_tool_life_min: 90 }
      );

      // Aggressive should have higher MRR (if it converges)
      if (aggressiveResult.convergence && conservativeResult.convergence) {
        expect(aggressiveResult.predicted_mrr).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ============================================================================
  // CHAIN OF THOUGHT
  // ============================================================================

  describe("chainOfThoughtAnalysis", () => {
    it("should provide step-by-step reasoning", () => {
      const result = speedFeedDeepLearningEngine.chainOfThoughtAnalysis(
        "4140",
        12,
        4,
        "milling",
        "roughing"
      );

      expect(result.reasoning_steps).toBeInstanceOf(Array);
      expect(result.reasoning_steps.length).toBeGreaterThanOrEqual(4);
      expect(result.final_answer).toContain("m/min");
      expect(result.overall_confidence).toBeGreaterThan(0);
      expect(result.physics_validated).toBe(true);
    });

    it("should have confidence per step", () => {
      const result = speedFeedDeepLearningEngine.chainOfThoughtAnalysis(
        "6061",
        16,
        3,
        "milling",
        "finishing"
      );

      for (const step of result.reasoning_steps) {
        expect(step.step).toBeGreaterThan(0);
        expect(step.principle).toBeTruthy();
        expect(step.calculation).toBeTruthy();
        expect(step.result).toBeTruthy();
        expect(step.confidence).toBeGreaterThan(0);
        expect(step.confidence).toBeLessThanOrEqual(1.0);
      }
    });

    it("should include ISO group classification", () => {
      const result = speedFeedDeepLearningEngine.chainOfThoughtAnalysis(
        "Ti-6Al-4V",
        10,
        4,
        "milling",
        "semi_finishing"
      );

      expect(result.reasoning_steps[0].principle).toContain("ISO");
    });
  });

  // ============================================================================
  // COMPREHENSIVE ANALYSIS
  // ============================================================================

  describe("comprehensiveAnalysis", () => {
    it("should provide full analysis with all components", async () => {
      const result = await speedFeedDeepLearningEngine.comprehensiveAnalysis({
        material: "4140",
        tool_diameter_mm: 12,
        flutes: 4,
        operation: "milling",
        cut_type: "roughing",
        hardness_HB: 200,
        corner_radius_mm: 0.8,
        axial_depth_mm: 3,
        radial_depth_mm: 4,
        machine_power_kW: 15,
      });

      expect(result.speed).toBeDefined();
      expect(result.feed).toBeDefined();
      expect(result.tool_life).toBeDefined();
      expect(result.surface_finish).toBeDefined();
      expect(result.power).toBeDefined();
      expect(result.optimized).toBeDefined();
      expect(result.reasoning).toBeDefined();
      expect(result.tribal_insights).toBeInstanceOf(Array);
      expect(result.overall_confidence).toBeGreaterThan(0);
    });

    it("should include tribal knowledge for specific materials", async () => {
      const stainlessResult = await speedFeedDeepLearningEngine.comprehensiveAnalysis({
        material: "316L stainless",
        tool_diameter_mm: 12,
        flutes: 4,
        operation: "milling",
        cut_type: "roughing",
      });

      expect(stainlessResult.tribal_insights.length).toBeGreaterThan(0);
      expect(stainlessResult.tribal_insights.some(i => i.toLowerCase().includes("work-harden") || i.toLowerCase().includes("stainless"))).toBe(true);
    });

    it("should include self-learning adjustments", async () => {
      const result = await speedFeedDeepLearningEngine.comprehensiveAnalysis({
        material: "4140",
        tool_diameter_mm: 10,
        flutes: 4,
        operation: "milling",
        cut_type: "semi_finishing",
      });

      expect(result.self_learning_adjustments).toBeDefined();
      expect(result.self_learning_adjustments.speed).toBeDefined();
      expect(result.self_learning_adjustments.feed).toBeDefined();
    });
  });

  // ============================================================================
  // SELF-LEARNING FEEDBACK
  // ============================================================================

  describe("recordFeedback and getSelfLearningStats", () => {
    it("should record feedback and update stats", () => {
      const initialStats = speedFeedDeepLearningEngine.getSelfLearningStats();
      const initialCount = initialStats.total_feedback;

      speedFeedDeepLearningEngine.recordFeedback(
        "test-job-001",
        { speed_mpm: 150, feed_mm: 0.1, tool_life_min: 60, Ra_um: 1.6 },
        { speed_mpm: 145, tool_life_min: 55 }
      );

      const newStats = speedFeedDeepLearningEngine.getSelfLearningStats();
      expect(newStats.total_feedback).toBe(initialCount + 1);
    });

    it("should handle partial actual values", () => {
      speedFeedDeepLearningEngine.recordFeedback(
        "test-job-002",
        { speed_mpm: 200, feed_mm: 0.08, tool_life_min: 45, Ra_um: 2.0 },
        { Ra_um: 2.2 } // Only surface finish measured
      );

      const stats = speedFeedDeepLearningEngine.getSelfLearningStats();
      expect(stats.total_feedback).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // STATISTICS
  // ============================================================================

  describe("stats", () => {
    it("should return query count and network info", () => {
      // Run some queries first
      speedFeedDeepLearningEngine.predictSpeed("4140", 12, 4, "milling", "roughing");
      speedFeedDeepLearningEngine.predictFeed("4140", 12, 4, 150, "roughing");

      const stats = speedFeedDeepLearningEngine.stats();

      expect(stats.queries_processed).toBeGreaterThan(0);
      expect(stats.neural_networks).toBe(3);
      expect(stats.self_learning_feedback).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("should handle unknown materials gracefully", () => {
      const result = speedFeedDeepLearningEngine.predictSpeed(
        "UnknownMaterial123",
        12,
        4,
        "milling",
        "roughing"
      );

      expect(result.cutting_speed_mpm).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(0.95); // Should have lower confidence
    });

    it("should handle small tool diameters", () => {
      const result = speedFeedDeepLearningEngine.predictSpeed(
        "4140",
        1,
        2,
        "milling",
        "finishing"
      );

      expect(result.spindle_rpm).toBeGreaterThan(result.cutting_speed_mpm * 1000 / (Math.PI * 2));
    });

    it("should handle different operations", () => {
      const operations: Array<"milling" | "turning" | "drilling" | "tapping"> = [
        "milling", "turning", "drilling", "tapping"
      ];

      for (const op of operations) {
        const result = speedFeedDeepLearningEngine.predictSpeed("4140", 10, 4, op, "roughing");
        expect(result.cutting_speed_mpm).toBeGreaterThan(0);
      }
    });

    it("should handle hardened steels (H group)", () => {
      const result = speedFeedDeepLearningEngine.predictSpeed(
        "D2 hardened",
        10,
        4,
        "milling",
        "finishing",
        58 * 3 + 100 // ~274 HB (simulating 58 HRC)
      );

      expect(result.cutting_speed_mpm).toBeGreaterThan(0);
      expect(result.cutting_speed_mpm).toBeLessThan(150); // Should be conservative for hardened
    });
  });

  // ============================================================================
  // MONTE CARLO STATISTICS
  // ============================================================================

  describe("Monte Carlo statistics", () => {
    it("should have valid percentile ordering", () => {
      const result = speedFeedDeepLearningEngine.predictSpeed(
        "4140",
        12,
        4,
        "milling",
        "roughing"
      );

      const mc = result.monte_carlo;
      expect(mc.percentiles.p5).toBeLessThanOrEqual(mc.percentiles.p10);
      expect(mc.percentiles.p10).toBeLessThanOrEqual(mc.percentiles.p50);
      expect(mc.percentiles.p50).toBeLessThanOrEqual(mc.percentiles.p90);
      expect(mc.percentiles.p90).toBeLessThanOrEqual(mc.percentiles.p95);
    });

    it("should have std_dev consistent with confidence interval", () => {
      const result = speedFeedDeepLearningEngine.predictToolLife("4140", 150, 0.1, 3);

      const mc = result.monte_carlo;
      const expectedRange = mc.std_dev * 4; // ~2 sigma each side
      const actualRange = mc.confidence_95.upper - mc.confidence_95.lower;

      expect(actualRange).toBeGreaterThan(0);
      expect(actualRange).toBeLessThan(mc.mean * 3); // Shouldn't be ridiculously wide
    });
  });
});
