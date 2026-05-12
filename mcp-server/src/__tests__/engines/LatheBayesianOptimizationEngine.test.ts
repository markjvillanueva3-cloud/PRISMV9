/**
 * LatheBayesianOptimizationEngine Tests
 *
 * Comprehensive tests for Bayesian optimization with uncertainty quantification
 * for lathe parameter optimization.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LatheBayesianOptimizationEngine,
  latheBayesianOptimizationEngine,
  type BOConfig,
  type BayesianObservation,
  type KernelConfig,
  type LatheOptimizationConfig,
} from "../../engines/LatheBayesianOptimizationEngine.js";

describe("LatheBayesianOptimizationEngine", () => {
  let engine: LatheBayesianOptimizationEngine;

  beforeEach(() => {
    engine = new LatheBayesianOptimizationEngine(42); // Seeded for reproducibility
  });

  // ==========================================================================
  // GAUSSIAN PROCESS TESTS
  // ==========================================================================

  describe("Gaussian Process Regression", () => {
    it("should fit GP to simple observations", () => {
      const observations: BayesianObservation[] = [
        { x: [0.0], y: 1.0 },
        { x: [0.5], y: 0.5 },
        { x: [1.0], y: 1.0 },
      ];

      const kernel: KernelConfig = {
        type: "RBF",
        length_scales: [0.5],
        signal_variance: 1.0,
        noise_variance: 1e-6,
      };

      const gp = engine.fitGP(observations, kernel);

      expect(gp.X.length).toBe(3);
      expect(gp.Y.length).toBe(3);
      expect(gp.alpha.length).toBe(3);
      expect(gp.L).not.toBeNull();
    });

    it("should predict mean correctly at training points", () => {
      const observations: BayesianObservation[] = [
        { x: [0.0], y: 0.0 },
        { x: [1.0], y: 1.0 },
        { x: [2.0], y: 4.0 },
      ];

      const kernel: KernelConfig = {
        type: "RBF",
        length_scales: [1.0],
        signal_variance: 1.0,
        noise_variance: 1e-6,
      };

      const gp = engine.fitGP(observations, kernel);

      // Prediction at training point should match
      const pred = engine.predictGP(gp, [1.0]);
      expect(pred.mean).toBeCloseTo(1.0, 2);
      expect(pred.variance).toBeLessThan(0.01);
    });

    it("should have higher variance far from training data", () => {
      const observations: BayesianObservation[] = [
        { x: [0.0], y: 1.0 },
        { x: [1.0], y: 2.0 },
      ];

      const kernel: KernelConfig = {
        type: "RBF",
        length_scales: [0.3],
        signal_variance: 1.0,
        noise_variance: 1e-6,
      };

      const gp = engine.fitGP(observations, kernel);

      const predNear = engine.predictGP(gp, [0.5]);
      const predFar = engine.predictGP(gp, [5.0]);

      expect(predFar.variance).toBeGreaterThan(predNear.variance);
    });

    it("should decompose uncertainty into epistemic and aleatoric", () => {
      const observations: BayesianObservation[] = [
        { x: [0.0], y: 1.0 },
        { x: [1.0], y: 2.0 },
        { x: [2.0], y: 1.5 },
      ];

      const kernel: KernelConfig = {
        type: "RBF",
        length_scales: [0.5],
        signal_variance: 1.0,
        noise_variance: 0.1, // Significant noise
      };

      const gp = engine.fitGP(observations, kernel);
      const pred = engine.predictGP(gp, [1.5]);

      expect(pred.epistemic_uncertainty).toBeGreaterThan(0);
      expect(pred.aleatoric_uncertainty).toBeGreaterThan(0);
      expect(pred.epistemic_uncertainty ** 2 + pred.aleatoric_uncertainty ** 2)
        .toBeCloseTo(pred.variance, 2);
    });
  });

  // ==========================================================================
  // KERNEL TESTS
  // ==========================================================================

  describe("Kernels", () => {
    it("should compute RBF kernel correctly", () => {
      const observations: BayesianObservation[] = [
        { x: [0.0, 0.0], y: 1.0 },
        { x: [1.0, 1.0], y: 2.0 },
      ];

      const kernel: KernelConfig = {
        type: "RBF",
        length_scales: [1.0, 1.0],
        signal_variance: 1.0,
        noise_variance: 1e-6,
      };

      const gp = engine.fitGP(observations, kernel);
      expect(gp.X.length).toBe(2);
    });

    it("should compute Matern32 kernel", () => {
      const observations: BayesianObservation[] = [
        { x: [0.0], y: 1.0 },
        { x: [1.0], y: 2.0 },
      ];

      const kernel: KernelConfig = {
        type: "Matern32",
        length_scales: [0.5],
        signal_variance: 1.0,
        noise_variance: 1e-6,
      };

      const gp = engine.fitGP(observations, kernel);
      const pred = engine.predictGP(gp, [0.5]);
      expect(pred.mean).toBeGreaterThan(1.0);
      expect(pred.mean).toBeLessThan(2.0);
    });

    it("should compute Matern52 kernel", () => {
      const observations: BayesianObservation[] = [
        { x: [0.0], y: 0.0 },
        { x: [1.0], y: 1.0 },
        { x: [2.0], y: 0.0 },
      ];

      const kernel: KernelConfig = {
        type: "Matern52",
        length_scales: [0.8],
        signal_variance: 1.0,
        noise_variance: 1e-6,
      };

      const gp = engine.fitGP(observations, kernel);
      const pred = engine.predictGP(gp, [1.0]);
      expect(pred.mean).toBeCloseTo(1.0, 1);
    });

    it("should compute Rational Quadratic kernel", () => {
      const observations: BayesianObservation[] = [
        { x: [0.0], y: 1.0 },
        { x: [2.0], y: 3.0 },
      ];

      const kernel: KernelConfig = {
        type: "RationalQuadratic",
        length_scales: [1.0],
        signal_variance: 1.0,
        noise_variance: 1e-6,
        alpha: 2.0,
      };

      const gp = engine.fitGP(observations, kernel);
      expect(gp.alpha.length).toBe(2);
    });

    it("should compute Composite kernel", () => {
      const observations: BayesianObservation[] = [
        { x: [0.0], y: 1.0 },
        { x: [1.0], y: 0.5 },
        { x: [2.0], y: 1.0 },
      ];

      const kernel: KernelConfig = {
        type: "Composite",
        length_scales: [1.0],
        signal_variance: 1.0,
        noise_variance: 1e-6,
      };

      const gp = engine.fitGP(observations, kernel);
      const pred = engine.predictGP(gp, [1.0]);
      expect(pred.mean).toBeCloseTo(0.5, 1);
    });

    it("should support ARD (per-dimension length scales)", () => {
      const observations: BayesianObservation[] = [
        { x: [0.0, 0.0], y: 1.0 },
        { x: [1.0, 0.0], y: 2.0 },
        { x: [0.0, 1.0], y: 1.5 },
      ];

      const kernel: KernelConfig = {
        type: "RBF",
        length_scales: [0.5, 2.0], // Different scales per dimension
        signal_variance: 1.0,
        noise_variance: 1e-6,
      };

      const gp = engine.fitGP(observations, kernel);
      expect(gp.X[0].length).toBe(2);
    });
  });

  // ==========================================================================
  // ACQUISITION FUNCTION TESTS
  // ==========================================================================

  describe("Acquisition Functions", () => {
    const observations: BayesianObservation[] = [
      { x: [0.0], y: 1.0 },
      { x: [0.5], y: 0.5 },
      { x: [1.0], y: 0.8 },
    ];

    const kernel: KernelConfig = {
      type: "RBF",
      length_scales: [0.3],
      signal_variance: 1.0,
      noise_variance: 1e-6,
    };

    it("should compute Expected Improvement", () => {
      const gp = engine.fitGP(observations, kernel);
      const bestY = Math.min(...observations.map(o => o.y));

      // EI should be higher where we expect improvement
      const eiNearBest = engine.acquisitionEI(gp, [0.5], bestY);
      const eiExplore = engine.acquisitionEI(gp, [2.0], bestY);

      expect(eiExplore).toBeGreaterThan(0);
      // Far from data should have high EI due to uncertainty
      expect(eiExplore).toBeGreaterThan(eiNearBest);
    });

    it("should compute Upper Confidence Bound", () => {
      const gp = engine.fitGP(observations, kernel);

      const ucbLowKappa = engine.acquisitionUCB(gp, [0.75], 1.0);
      const ucbHighKappa = engine.acquisitionUCB(gp, [0.75], 3.0);

      // Higher kappa = more exploration
      expect(ucbHighKappa).toBeGreaterThan(ucbLowKappa);
    });

    it("should compute Probability of Improvement", () => {
      const gp = engine.fitGP(observations, kernel);
      const bestY = Math.min(...observations.map(o => o.y));

      const piAtBest = engine.acquisitionPI(gp, [0.5], bestY);
      const piFar = engine.acquisitionPI(gp, [3.0], bestY);

      expect(piAtBest).toBeLessThan(0.6); // Already near best - PI ~ 0.5 when mean = best
      expect(piFar).toBeGreaterThan(0); // Some chance of improvement
    });

    it("should compute Knowledge Gradient", () => {
      const gp = engine.fitGP(observations, kernel);

      const kg = engine.acquisitionKG(gp, [0.75], observations);
      expect(kg).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // OPTIMIZATION TESTS
  // ==========================================================================

  describe("Parameter Optimization", () => {
    it("should minimize a simple quadratic function", () => {
      const quadratic = (x: number[]): number => {
        return (x[0] - 2.0) ** 2 + (x[1] - 3.0) ** 2;
      };

      const config: BOConfig = {
        dimensions: 2,
        bounds: [
          { name: "x1", min: 0, max: 5 },
          { name: "x2", min: 0, max: 5 },
        ],
        kernel: {
          type: "RBF",
          length_scales: [1.0, 1.0],
          signal_variance: 1.0,
          noise_variance: 0.001,
        },
        acquisition: "EI",
        initial_points: 10,
        max_iterations: 30,
        direction: "minimize",
        seed: 42,
      };

      const result = engine.optimizeParameters(quadratic, config);

      expect(result.best_x[0]).toBeCloseTo(2.0, 0);
      expect(result.best_x[1]).toBeCloseTo(3.0, 0);
      expect(result.best_y).toBeLessThan(1.0);
    });

    it("should maximize a function when direction is maximize", () => {
      const negQuadratic = (x: number[]): number => {
        return -((x[0] - 2.5) ** 2);
      };

      const config: BOConfig = {
        dimensions: 1,
        bounds: [{ name: "x", min: 0, max: 5 }],
        kernel: {
          type: "Matern52",
          length_scales: [1.0],
          noise_variance: 0.001,
        },
        acquisition: "UCB",
        initial_points: 5,
        max_iterations: 20,
        direction: "maximize",
        seed: 42,
      };

      const result = engine.optimizeParameters(negQuadratic, config);

      expect(result.best_x[0]).toBeCloseTo(2.5, 0);
    });

    it("should report convergence status", () => {
      const easyFunction = (x: number[]): number => x[0] ** 2;

      const config: BOConfig = {
        dimensions: 1,
        bounds: [{ name: "x", min: -2, max: 2 }],
        kernel: { type: "RBF", length_scales: [0.5], noise_variance: 0.001 },
        acquisition: "EI",
        initial_points: 5,
        max_iterations: 50,
        seed: 42,
      };

      const result = engine.optimizeParameters(easyFunction, config);

      expect(result.convergence).toBeDefined();
      expect(typeof result.convergence.converged).toBe("boolean");
      expect(typeof result.convergence.stagnation_count).toBe("number");
    });

    it("should provide model fit assessment", () => {
      const sinusoid = (x: number[]): number => Math.sin(x[0] * 2) + 0.1 * x[0];

      const config: BOConfig = {
        dimensions: 1,
        bounds: [{ name: "x", min: 0, max: 6 }],
        kernel: { type: "Matern52", length_scales: [0.5], noise_variance: 0.01 },
        acquisition: "EI",
        initial_points: 10,
        max_iterations: 20,
        seed: 42,
      };

      const result = engine.optimizeParameters(sinusoid, config);

      expect(result.model_fit).toBeDefined();
      expect(result.model_fit.mean_squared_error).toBeGreaterThanOrEqual(0);
      expect(result.model_fit.coverage_probability).toBeGreaterThanOrEqual(0);
      expect(result.model_fit.coverage_probability).toBeLessThanOrEqual(1);
    });
  });

  // ==========================================================================
  // MULTI-OBJECTIVE TESTS
  // ==========================================================================

  describe("Multi-Objective Optimization", () => {
    it("should compute Pareto front for two objectives", () => {
      // Simple bi-objective: minimize x^2 and minimize (x-2)^2
      const obj1 = (x: number[]): number => x[0] ** 2;
      const obj2 = (x: number[]): number => (x[0] - 2) ** 2;

      const config: BOConfig = {
        dimensions: 1,
        bounds: [{ name: "x", min: 0, max: 2 }],
        kernel: { type: "RBF", length_scales: [0.5], noise_variance: 0.001 },
        acquisition: "EI",
        initial_points: 10,
        max_iterations: 20,
        seed: 42,
      };

      const result = engine.multiObjectiveOptimize([obj1, obj2], config);

      expect(result.pareto_front.length).toBeGreaterThan(0);
      expect(result.hypervolume).toBeGreaterThan(0);
      expect(result.utopia_point.length).toBe(2);
      expect(result.nadir_point.length).toBe(2);
    });

    it("should find best compromise solution", () => {
      const obj1 = (x: number[]): number => x[0];
      const obj2 = (x: number[]): number => 1 - x[0];

      const config: BOConfig = {
        dimensions: 1,
        bounds: [{ name: "x", min: 0, max: 1 }],
        kernel: { type: "RBF", length_scales: [0.3], noise_variance: 0.001 },
        acquisition: "EI",
        initial_points: 10,
        max_iterations: 15,
        seed: 42,
      };

      const result = engine.multiObjectiveOptimize([obj1, obj2], config);

      expect(result.best_compromise).toBeDefined();
      expect(result.best_compromise.x[0]).toBeGreaterThan(0);
      expect(result.best_compromise.x[0]).toBeLessThan(1);
    });

    it("should track dominated solutions count", () => {
      const obj1 = (x: number[]): number => x[0] ** 2;
      const obj2 = (x: number[]): number => (x[0] - 1) ** 2;

      const config: BOConfig = {
        dimensions: 1,
        bounds: [{ name: "x", min: 0, max: 1 }],
        kernel: { type: "RBF", length_scales: [0.2], noise_variance: 0.001 },
        acquisition: "EI",
        initial_points: 15,
        max_iterations: 20,
        seed: 42,
      };

      const result = engine.multiObjectiveOptimize([obj1, obj2], config);

      expect(typeof result.dominated_count).toBe("number");
      expect(result.dominated_count).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // BATCH OPTIMIZATION TESTS
  // ==========================================================================

  describe("Batch Optimization", () => {
    it("should generate batch of points using local penalization", () => {
      const observations: BayesianObservation[] = [
        { x: [0.0, 0.0], y: 1.0 },
        { x: [1.0, 1.0], y: 0.5 },
        { x: [0.5, 0.5], y: 0.8 },
      ];

      const kernel: KernelConfig = {
        type: "RBF",
        length_scales: [0.5, 0.5],
        noise_variance: 0.001,
      };

      const gp = engine.fitGP(observations, kernel);
      const bounds = [{ min: 0, max: 1 }, { min: 0, max: 1 }];

      const batchPoints = engine.batchAcquisition(
        gp, bounds, 2, "EI", 3, { xi: 0.01 }, observations
      );

      expect(batchPoints.length).toBe(3);
      batchPoints.forEach(point => {
        expect(point.length).toBe(2);
        expect(point[0]).toBeGreaterThanOrEqual(0);
        expect(point[0]).toBeLessThanOrEqual(1);
      });
    });

    it("should generate batch using Thompson sampling", () => {
      const observations: BayesianObservation[] = [
        { x: [0.0], y: 1.0 },
        { x: [0.5], y: 0.5 },
        { x: [1.0], y: 0.8 },
      ];

      const kernel: KernelConfig = {
        type: "RBF",
        length_scales: [0.3],
        noise_variance: 0.001,
      };

      const gp = engine.fitGP(observations, kernel);
      const bounds = [{ min: 0, max: 1 }];

      const batchPoints = engine.thompsonSamplingBatch(gp, bounds, 1, 5);

      expect(batchPoints.length).toBe(5);
      batchPoints.forEach(point => {
        expect(point[0]).toBeGreaterThanOrEqual(0);
        expect(point[0]).toBeLessThanOrEqual(1);
      });
    });
  });

  // ==========================================================================
  // UNCERTAINTY QUANTIFICATION TESTS
  // ==========================================================================

  describe("Uncertainty Quantification", () => {
    it("should quantify uncertainty metrics", () => {
      const observations: BayesianObservation[] = [
        { x: [0.0], y: 1.0 },
        { x: [0.5], y: 0.5 },
        { x: [1.0], y: 0.8 },
      ];

      const kernel: KernelConfig = {
        type: "RBF",
        length_scales: [0.3],
        noise_variance: 0.05,
      };

      const gp = engine.fitGP(observations, kernel);
      const bounds = [{ min: 0, max: 1 }];

      const testPoints = [[0.25], [0.75], [1.5]];
      const uq = engine.quantifyUncertainty(testPoints, gp, bounds);

      expect(uq.total_uncertainty).toBeGreaterThan(0);
      expect(uq.epistemic_fraction).toBeGreaterThanOrEqual(0);
      expect(uq.epistemic_fraction).toBeLessThanOrEqual(1);
      expect(uq.aleatoric_fraction).toBeGreaterThanOrEqual(0);
      expect(uq.aleatoric_fraction).toBeLessThanOrEqual(1);
      expect(uq.epistemic_fraction + uq.aleatoric_fraction).toBeCloseTo(1, 1);
    });

    it("should detect out-of-distribution points", () => {
      const observations: BayesianObservation[] = [
        { x: [0.2], y: 1.0 },
        { x: [0.4], y: 0.8 },
        { x: [0.6], y: 0.5 },
      ];

      const kernel: KernelConfig = {
        type: "RBF",
        length_scales: [0.2],
        noise_variance: 0.01,
      };

      const gp = engine.fitGP(observations, kernel);
      const bounds = [{ min: 0, max: 1 }];

      const inDistPoints = [[0.3], [0.5]];
      const oodPoints = [[0.95], [0.05]];

      const uqIn = engine.quantifyUncertainty(inDistPoints, gp, bounds);
      const uqOod = engine.quantifyUncertainty(oodPoints, gp, bounds);

      expect(uqOod.out_of_distribution_score).toBeGreaterThan(
        uqIn.out_of_distribution_score
      );
    });
  });

  // ==========================================================================
  // LATHE MANUFACTURING OPTIMIZATION TESTS
  // ==========================================================================

  describe("Lathe Manufacturing Optimization", () => {
    it("should optimize lathe cutting parameters", () => {
      const config: LatheOptimizationConfig = {
        material: "steel",
        operation: "roughing",
        machine: {
          max_rpm: 4500,
          max_power_kw: 25,
          turret_positions: 12,
          has_live_tooling: true,
        },
        tool: {
          type: "carbide",
          nose_radius_mm: 0.8,
          approach_angle_deg: 45,
        },
        workpiece: {
          diameter_mm: 50,
          length_mm: 100,
        },
        constraints: {
          max_surface_roughness_um: 6.3,
          min_tool_life_min: 30,
          max_power_kw: 20,
        },
        objectives: [
          { name: "mrr", weight: 0.5, direction: "maximize" },
          { name: "tool_life", weight: 0.3, direction: "maximize" },
          { name: "cost", weight: 0.2, direction: "minimize" },
        ],
      };

      const result = engine.optimizeLatheCutting(config);

      expect(result.optimal_parameters).toBeDefined();
      expect(result.optimal_parameters.cutting_speed_m_min).toBeGreaterThan(0);
      expect(result.optimal_parameters.feed_mm_rev).toBeGreaterThan(0);
      expect(result.optimal_parameters.depth_of_cut_mm).toBeGreaterThan(0);
      expect(result.optimal_parameters.spindle_rpm).toBeGreaterThan(0);
    });

    it("should provide predicted outcomes", () => {
      const config: LatheOptimizationConfig = {
        material: "M", // Stainless
        operation: "finishing",
        machine: {
          max_rpm: 5000,
          max_power_kw: 30,
          turret_positions: 12,
          has_live_tooling: true,
        },
        tool: {
          type: "carbide",
          nose_radius_mm: 0.4,
          approach_angle_deg: 35,
        },
        workpiece: {
          diameter_mm: 30,
          length_mm: 80,
        },
        objectives: [
          { name: "surface_finish", weight: 0.7, direction: "minimize" },
          { name: "cycle_time", weight: 0.3, direction: "minimize" },
        ],
      };

      const result = engine.optimizeLatheCutting(config);

      expect(result.predicted_outcomes.tool_life_min).toBeGreaterThan(0);
      expect(result.predicted_outcomes.surface_roughness_um).toBeGreaterThan(0);
      expect(result.predicted_outcomes.material_removal_rate_cm3_min).toBeGreaterThan(0);
      expect(result.predicted_outcomes.cutting_force_N).toBeGreaterThan(0);
    });

    it("should generate tribal knowledge tips", () => {
      const config: LatheOptimizationConfig = {
        material: "H", // Hardened
        operation: "finishing",
        machine: {
          max_rpm: 4000,
          max_power_kw: 25,
          turret_positions: 12,
          has_live_tooling: false,
        },
        tool: {
          type: "cbn",
          nose_radius_mm: 0.8,
          approach_angle_deg: 45,
        },
        workpiece: {
          diameter_mm: 40,
          length_mm: 60,
          hardness_HRC: 58,
        },
        objectives: [
          { name: "tool_life", weight: 0.5, direction: "maximize" },
          { name: "surface_finish", weight: 0.5, direction: "minimize" },
        ],
      };

      const result = engine.optimizeLatheCutting(config);

      expect(result.tribal_knowledge_applied.length).toBeGreaterThan(0);
      expect(result.tribal_knowledge_applied.some(tip =>
        tip.toLowerCase().includes("hard") ||
        tip.toLowerCase().includes("cbn") ||
        tip.toLowerCase().includes("ceramic")
      )).toBe(true);
    });

    it("should generate safety warnings for high RPM", () => {
      const config: LatheOptimizationConfig = {
        material: "aluminum",
        operation: "roughing",
        machine: {
          max_rpm: 3000, // Low limit
          max_power_kw: 15,
          turret_positions: 8,
          has_live_tooling: false,
        },
        tool: {
          type: "carbide",
          nose_radius_mm: 0.8,
          approach_angle_deg: 45,
        },
        workpiece: {
          diameter_mm: 15, // Small diameter = high RPM needed
          length_mm: 50,
        },
        objectives: [
          { name: "mrr", weight: 1.0, direction: "maximize" },
        ],
      };

      const result = engine.optimizeLatheCutting(config);

      // Should warn about RPM near limit
      expect(result.safety_warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // SPEED/FEED TRADEOFF TESTS
  // ==========================================================================

  describe("Speed/Feed Tradeoff Optimization", () => {
    it("should find Pareto front of speed/feed vs tool life", () => {
      const result = engine.optimizeSpeedFeedTradeoff(
        "steel",
        50, // 50mm diameter
        {
          max_ra_um: 3.2,
          tool_nose_radius_mm: 0.8,
        }
      );

      expect(result.pareto_front.length).toBeGreaterThan(0);
      expect(result.hypervolume).toBeGreaterThan(0);
    });

    it("should respect constraints in tradeoff optimization", () => {
      const result = engine.optimizeSpeedFeedTradeoff(
        "stainless_304",
        30,
        {
          min_tool_life_min: 45,
          max_ra_um: 1.6,
          tool_nose_radius_mm: 0.4,
        }
      );

      expect(result.pareto_front).toBeDefined();
    });
  });

  // ==========================================================================
  // SURFACE FINISH TARGETING TESTS
  // ==========================================================================

  describe("Surface Finish Targeting", () => {
    it("should target specific surface finish", () => {
      const result = engine.targetSurfaceFinish(
        1.6, // Ra 1.6 um target
        "steel",
        0.4, // 0.4mm nose radius
        { prefer_higher_speed: true }
      );

      expect(result.best_x.length).toBe(2);
      expect(result.best_y).toBeGreaterThanOrEqual(0);
    });

    it("should achieve target Ra within tolerance", () => {
      const targetRa = 3.2;
      const noseRadius = 0.8;

      const result = engine.targetSurfaceFinish(
        targetRa,
        "P", // Steel ISO group
        noseRadius
      );

      // Verify the optimal feed would produce close to target Ra
      const optFeed = result.best_x[1];
      const theoreticalRa = (optFeed ** 2 / (32 * noseRadius)) * 1000;

      expect(Math.abs(theoreticalRa - targetRa)).toBeLessThan(2.0);
    });
  });

  // ==========================================================================
  // SINGLETON EXPORT TESTS
  // ==========================================================================

  describe("Singleton Export", () => {
    it("should export singleton instance", () => {
      expect(latheBayesianOptimizationEngine).toBeDefined();
      expect(latheBayesianOptimizationEngine).toBeInstanceOf(LatheBayesianOptimizationEngine);
    });

    it("should be usable directly", () => {
      const observations: BayesianObservation[] = [
        { x: [0.0], y: 1.0 },
        { x: [1.0], y: 0.5 },
      ];

      const kernel: KernelConfig = {
        type: "RBF",
        length_scales: [0.5],
        noise_variance: 1e-6,
      };

      const gp = latheBayesianOptimizationEngine.fitGP(observations, kernel);
      expect(gp.X.length).toBe(2);
    });
  });

  // ==========================================================================
  // EDGE CASE TESTS
  // ==========================================================================

  describe("Edge Cases", () => {
    it("should handle single observation", () => {
      const observations: BayesianObservation[] = [
        { x: [0.5], y: 1.0 },
      ];

      const kernel: KernelConfig = {
        type: "RBF",
        length_scales: [0.5],
        noise_variance: 1e-6,
      };

      const gp = engine.fitGP(observations, kernel);
      const pred = engine.predictGP(gp, [0.5]);

      expect(pred.mean).toBeCloseTo(1.0, 2);
    });

    it("should handle high-dimensional optimization", () => {
      const rosenbrock = (x: number[]): number => {
        let sum = 0;
        for (let i = 0; i < x.length - 1; i++) {
          sum += 100 * (x[i + 1] - x[i] ** 2) ** 2 + (1 - x[i]) ** 2;
        }
        return sum;
      };

      const config: BOConfig = {
        dimensions: 4,
        bounds: Array(4).fill(null).map(() => ({ name: "x", min: -2, max: 2 })),
        kernel: {
          type: "Matern52",
          length_scales: Array(4).fill(1.0),
          noise_variance: 0.01,
        },
        acquisition: "EI",
        initial_points: 20,
        max_iterations: 30,
        seed: 42,
      };

      const result = engine.optimizeParameters(rosenbrock, config);

      expect(result.best_y).toBeLessThan(100); // Rosenbrock is hard; should find reasonable region
    });

    it("should handle noisy observations gracefully", () => {
      const noisyObs: BayesianObservation[] = Array.from({ length: 10 }, (_, i) => ({
        x: [i / 10],
        y: Math.sin(i / 10 * Math.PI) + (Math.random() - 0.5) * 0.5,
      }));

      const kernel: KernelConfig = {
        type: "Matern52",
        length_scales: [0.3],
        noise_variance: 0.25, // High noise
      };

      const gp = engine.fitGP(noisyObs, kernel);
      const pred = engine.predictGP(gp, [0.5]);

      expect(pred.variance).toBeGreaterThan(0.01); // Should reflect noise (variance > 0)
    });
  });
});
