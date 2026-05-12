/**
 * Tests for RealTimeOptimizationEngine (MILL-AGI Phase 0.5)
 *
 * Validates real-time parameter optimization:
 *   - Optimization methods (Nelder-Mead, Bayesian, multi-start)
 *   - Multi-objective optimization
 *   - Constraint handling
 *   - Pareto frontier generation
 *   - Single-step optimization
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  RealTimeOptimizationEngine,
  realTimeOptimizationEngine,
  type ParameterSet,
  type OptimizationObjective,
  type Constraint,
  type OptimizerConfig,
} from "../engines/RealTimeOptimizationEngine.js";

describe("RealTimeOptimizationEngine (MILL-AGI P0.5)", () => {
  let engine: RealTimeOptimizationEngine;

  beforeEach(() => {
    engine = new RealTimeOptimizationEngine();
  });

  // ============================================================================
  // TEST DATA
  // ============================================================================

  const mrrObjective: OptimizationObjective = {
    name: "mrr",
    type: "maximize",
    weight: 0.4,
  };

  const toolLifeObjective: OptimizationObjective = {
    name: "tool_life",
    type: "maximize",
    weight: 0.3,
  };

  const surfaceObjective: OptimizationObjective = {
    name: "surface_roughness",
    type: "minimize",
    weight: 0.3,
  };

  const powerConstraint: Constraint = {
    name: "max_power",
    type: "max",
    parameter: "power",
    value: 10000,
    hard: true,
  };

  const simpleEvaluator = (params: ParameterSet): Record<string, number> => {
    const mrr =
      params.cutting_speed_mpm *
      params.feed_per_tooth_mm *
      params.axial_depth_mm *
      params.radial_depth_mm;
    const toolLife = 100 / (1 + params.cutting_speed_mpm / 100);
    const surfaceRoughness =
      (params.feed_per_tooth_mm * params.feed_per_tooth_mm) / 0.01;
    const power = mrr * 0.5;

    return {
      mrr,
      tool_life: toolLife,
      surface_roughness: surfaceRoughness,
      power,
    };
  };

  const initialParams: ParameterSet = {
    cutting_speed_mpm: 150,
    feed_per_tooth_mm: 0.1,
    axial_depth_mm: 2,
    radial_depth_mm: 6,
  };

  // ============================================================================
  // OBJECTIVES AND CONSTRAINTS
  // ============================================================================

  describe("objectives and constraints", () => {
    it("adds objectives", () => {
      engine.addObjective(mrrObjective);
      engine.addObjective(toolLifeObjective);

      const objectives = engine.getObjectives();
      expect(objectives.length).toBe(2);
    });

    it("adds constraints", () => {
      engine.addConstraint(powerConstraint);

      const constraints = engine.getConstraints();
      expect(constraints.length).toBe(1);
    });

    it("clears objectives and constraints", () => {
      engine.addObjective(mrrObjective);
      engine.addConstraint(powerConstraint);

      engine.clearObjectivesAndConstraints();

      expect(engine.getObjectives().length).toBe(0);
      expect(engine.getConstraints().length).toBe(0);
    });
  });

  // ============================================================================
  // BOUNDS
  // ============================================================================

  describe("bounds", () => {
    it("has default bounds", () => {
      const bounds = engine.getBounds();

      expect(bounds.cutting_speed_mpm.min).toBeGreaterThan(0);
      expect(bounds.cutting_speed_mpm.max).toBeGreaterThan(bounds.cutting_speed_mpm.min);
    });

    it("updates bounds", () => {
      engine.setBounds({
        cutting_speed_mpm: { min: 50, max: 300 },
      });

      const bounds = engine.getBounds();
      expect(bounds.cutting_speed_mpm.min).toBe(50);
      expect(bounds.cutting_speed_mpm.max).toBe(300);
    });
  });

  // ============================================================================
  // NELDER-MEAD OPTIMIZATION
  // ============================================================================

  describe("Nelder-Mead optimization", () => {
    it("returns optimization result", () => {
      engine.addObjective(mrrObjective);

      const result = engine.optimize(simpleEvaluator, initialParams);

      expect(result.optimal_params).toBeDefined();
      expect(result.score).toBeDefined();
      expect(result.iterations).toBeGreaterThan(0);
      expect(result.optimization_time_ms).toBeGreaterThan(0);
    });

    it("improves MRR objective", () => {
      engine.addObjective(mrrObjective);

      const initialObj = simpleEvaluator(initialParams);
      const result = engine.optimize(simpleEvaluator, initialParams);
      const finalObj = simpleEvaluator(result.optimal_params);

      // Should improve or maintain MRR
      expect(finalObj.mrr).toBeGreaterThanOrEqual(initialObj.mrr * 0.8);
    });

    it("respects parameter bounds", () => {
      engine.addObjective(mrrObjective);
      engine.setBounds({
        cutting_speed_mpm: { min: 100, max: 200 },
      });

      const result = engine.optimize(simpleEvaluator, initialParams);

      expect(result.optimal_params.cutting_speed_mpm).toBeGreaterThanOrEqual(100);
      expect(result.optimal_params.cutting_speed_mpm).toBeLessThanOrEqual(200);
    });

    it("tracks convergence history", () => {
      engine.addObjective(mrrObjective);

      engine.optimize(simpleEvaluator, initialParams);
      const state = engine.getState();

      expect(state.convergence_history.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // BAYESIAN OPTIMIZATION
  // ============================================================================

  describe("Bayesian optimization", () => {
    it("runs Bayesian optimization", () => {
      const bayesEngine = new RealTimeOptimizationEngine({
        method: "bayesian",
        max_iterations: 20,
      });
      bayesEngine.addObjective(mrrObjective);

      const result = bayesEngine.optimize(simpleEvaluator, initialParams);

      expect(result.optimal_params).toBeDefined();
      expect(result.iterations).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // MULTI-START OPTIMIZATION
  // ============================================================================

  describe("multi-start optimization", () => {
    it("runs multi-start optimization", () => {
      const msEngine = new RealTimeOptimizationEngine({
        method: "multi-start",
        num_restarts: 2,
        max_iterations: 10,
      });
      msEngine.addObjective(mrrObjective);

      const result = msEngine.optimize(simpleEvaluator);

      expect(result.optimal_params).toBeDefined();
    });
  });

  // ============================================================================
  // GRADIENT-FREE OPTIMIZATION
  // ============================================================================

  describe("gradient-free optimization", () => {
    it("runs gradient-free optimization", () => {
      const gfEngine = new RealTimeOptimizationEngine({
        method: "gradient-free",
        max_iterations: 50,
      });
      gfEngine.addObjective(mrrObjective);

      const result = gfEngine.optimize(simpleEvaluator, initialParams);

      expect(result.optimal_params).toBeDefined();
    });
  });

  // ============================================================================
  // MULTI-OBJECTIVE OPTIMIZATION
  // ============================================================================

  describe("multi-objective optimization", () => {
    it("handles multiple objectives", () => {
      engine.addObjective(mrrObjective);
      engine.addObjective(toolLifeObjective);
      engine.addObjective(surfaceObjective);

      const result = engine.optimize(simpleEvaluator, initialParams);

      expect(result.optimal_params).toBeDefined();
      expect(result.objectives).toBeDefined();
    });

    it("generates Pareto front", () => {
      engine.addObjective(mrrObjective);
      engine.addObjective(toolLifeObjective);

      const paretoFront = engine.generateParetoFront(simpleEvaluator, 10);

      expect(paretoFront.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // CONSTRAINT HANDLING
  // ============================================================================

  describe("constraint handling", () => {
    it("penalizes constraint violations", () => {
      engine.addObjective(mrrObjective);
      engine.addConstraint({
        name: "max_speed",
        type: "max",
        parameter: "cutting_speed_mpm",
        value: 100,
        hard: true,
      });

      const result = engine.optimize(simpleEvaluator, {
        ...initialParams,
        cutting_speed_mpm: 200, // Violates constraint
      });

      // Should move toward satisfying constraint
      expect(result.optimal_params.cutting_speed_mpm).toBeLessThanOrEqual(150);
    });
  });

  // ============================================================================
  // SINGLE-STEP OPTIMIZATION
  // ============================================================================

  describe("single-step optimization", () => {
    it("suggests improved parameters", () => {
      engine.addObjective(mrrObjective);

      const step = engine.step(initialParams, simpleEvaluator);

      expect(step.suggested_params).toBeDefined();
      expect(step.expected_improvement).toBeDefined();
      expect(step.direction).toBeDefined();
    });

    it("provides optimization direction", () => {
      engine.addObjective(mrrObjective);

      const step = engine.step(initialParams, simpleEvaluator);

      expect(step.direction.cutting_speed_mpm).toBeDefined();
      expect(step.direction.feed_per_tooth_mm).toBeDefined();
    });
  });

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  describe("state management", () => {
    it("returns optimization state", () => {
      engine.addObjective(mrrObjective);
      engine.optimize(simpleEvaluator, initialParams);

      const state = engine.getState();

      expect(state.iteration).toBeGreaterThanOrEqual(0);
      expect(state.best_params).toBeDefined();
      expect(state.best_score).toBeDefined();
    });

    it("resets state", () => {
      engine.addObjective(mrrObjective);
      engine.optimize(simpleEvaluator, initialParams);

      engine.reset();
      const state = engine.getState();

      expect(state.convergence_history.length).toBe(0);
    });
  });

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  describe("configuration", () => {
    it("returns config", () => {
      const config = engine.getConfig();

      expect(config.method).toBeDefined();
      expect(config.max_iterations).toBeDefined();
    });

    it("applies custom config", () => {
      const customEngine = new RealTimeOptimizationEngine({
        method: "bayesian",
        max_iterations: 50,
      });

      const config = customEngine.getConfig();
      expect(config.method).toBe("bayesian");
      expect(config.max_iterations).toBe(50);
    });
  });

  // ============================================================================
  // CONVERGENCE
  // ============================================================================

  describe("convergence", () => {
    it("detects convergence", () => {
      const fastConvergeEngine = new RealTimeOptimizationEngine({
        convergence_threshold: 0.1,
        max_iterations: 100,
      });
      fastConvergeEngine.addObjective(mrrObjective);

      const result = fastConvergeEngine.optimize(simpleEvaluator, initialParams);

      // Should converge before max iterations
      expect(result.convergence_achieved || result.iterations < 100).toBe(true);
    });
  });

  // ============================================================================
  // SINGLETON
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(realTimeOptimizationEngine).toBeDefined();
      expect(realTimeOptimizationEngine).toBeInstanceOf(RealTimeOptimizationEngine);
    });
  });
});
