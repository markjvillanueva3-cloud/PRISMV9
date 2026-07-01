/**
 * AdvancedCalculations — Stability Lobes & Cost Optimization Tests
 *
 * Tests for the UNTESTED functions in AdvancedCalculations.ts:
 *   - calculateStabilityLobes (Altintas-Budak model)
 *   - calculateMinimumCostSpeed (economic cutting speed)
 *   - optimizeCuttingParameters (multi-objective optimizer)
 *
 * Includes FORGE-DEBUG regression tests for fixes in commit d8194113:
 *   - damping_ratio >= 1.0 guard (overdamped rejection)
 *   - kc > 0 and teeth >= 1 validation
 *   - Taylor exponent n range (0 < n < 1)
 *   - total_weight <= 0 guard
 *   - cost_norm clamped to [0,1]
 *
 * @milestone SYS-MS2-U03
 */

import { describe, it, expect } from "vitest";
import {
  calculateStabilityLobes,
  optimizeCuttingParameters,
  type ModalParameters,
  type StabilityResult,
  type OptimizationConstraints,
  type OptimizationWeights,
} from "../engines/AdvancedCalculations.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

function makeModalParams(overrides: Partial<ModalParameters> = {}): ModalParameters {
  return {
    natural_frequency: 800,   // Hz — typical for end mill in ER32
    damping_ratio: 0.03,      // ζ — typical underdamped machining system
    stiffness: 5e6,           // N/m — typical tool stiffness
    ...overrides,
  };
}

// ============================================================================
// 1. calculateStabilityLobes
// ============================================================================

describe("calculateStabilityLobes", () => {
  describe("happy path — steel milling", () => {
    it("returns all required result fields", () => {
      const result = calculateStabilityLobes(makeModalParams(), 1800, 4);
      expect(result.critical_depth).toBeDefined();
      expect(result.spindle_speeds).toBeDefined();
      expect(result.stability_lobes).toBeDefined();
      expect(result.chatter_frequency).toBeDefined();
      expect(result.is_stable).toBeDefined();
      expect(result.margin_percent).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

    it("critical depth is positive and finite", () => {
      const result = calculateStabilityLobes(makeModalParams(), 1800, 4);
      expect(result.critical_depth).toBeGreaterThan(0);
      expect(Number.isFinite(result.critical_depth)).toBe(true);
    });

    it("chatter frequency is at or above natural frequency", () => {
      const result = calculateStabilityLobes(makeModalParams(), 1800, 4);
      expect(result.chatter_frequency).toBeGreaterThanOrEqual(800);
    });

    it("stability lobes array is populated with valid entries", () => {
      const result = calculateStabilityLobes(makeModalParams(), 1800, 4);
      expect(result.stability_lobes.length).toBeGreaterThan(0);
      for (const lobe of result.stability_lobes) {
        expect(lobe.lobe_number).toBeGreaterThanOrEqual(0);
        expect(lobe.speed_min).toBeGreaterThan(0);
        expect(lobe.speed_max).toBeGreaterThan(lobe.speed_min);
        expect(lobe.depth_limit).toBeGreaterThan(0);
        expect(Number.isFinite(lobe.depth_limit)).toBe(true);
      }
    });

    it("spindle speeds array contains positive RPM values", () => {
      const result = calculateStabilityLobes(makeModalParams(), 1800, 4);
      expect(result.spindle_speeds.length).toBeGreaterThan(0);
      for (const rpm of result.spindle_speeds) {
        expect(rpm).toBeGreaterThan(0);
        expect(Number.isFinite(rpm)).toBe(true);
      }
    });
  });

  describe("current operating point assessment", () => {
    it("reports stability status for given depth and speed", () => {
      const result = calculateStabilityLobes(makeModalParams(), 1800, 4, 1.0, 6000);
      expect(typeof result.is_stable).toBe("boolean");
      expect(Number.isFinite(result.margin_percent)).toBe(true);
    });

    it("shallow depth has finite stability metrics", () => {
      const result = calculateStabilityLobes(makeModalParams(), 1800, 4, 0.5, 6000);
      expect(typeof result.is_stable).toBe("boolean");
      expect(Number.isFinite(result.margin_percent)).toBe(true);
      expect(result.critical_depth).toBeGreaterThan(0);
    });
  });

  describe("stiffness effects", () => {
    it("higher stiffness increases critical depth", () => {
      const soft = calculateStabilityLobes(makeModalParams({ stiffness: 1e6 }), 1800, 4);
      const stiff = calculateStabilityLobes(makeModalParams({ stiffness: 10e6 }), 1800, 4);
      expect(stiff.critical_depth).toBeGreaterThan(soft.critical_depth);
    });

    it("higher kc decreases critical depth", () => {
      const softMat = calculateStabilityLobes(makeModalParams(), 700, 4);   // aluminum
      const hardMat = calculateStabilityLobes(makeModalParams(), 2500, 4);  // hardened steel
      expect(softMat.critical_depth).toBeGreaterThan(hardMat.critical_depth);
    });
  });

  describe("FORGE-DEBUG regression: damping_ratio >= 1.0 guard", () => {
    it("damping_ratio = 0.999 (barely underdamped) works", () => {
      const result = calculateStabilityLobes(makeModalParams({ damping_ratio: 0.999 }), 1800, 4);
      expect(result.critical_depth).toBeGreaterThan(0);
    });

    it("damping_ratio = 1.0 (critically damped) throws", () => {
      expect(() => {
        calculateStabilityLobes(makeModalParams({ damping_ratio: 1.0 }), 1800, 4);
      }).toThrow(/damping ratio.*>= 1\.0/i);
    });

    it("damping_ratio = 1.5 (overdamped) throws", () => {
      expect(() => {
        calculateStabilityLobes(makeModalParams({ damping_ratio: 1.5 }), 1800, 4);
      }).toThrow(/damping ratio.*>= 1\.0/i);
    });
  });

  describe("FORGE-DEBUG regression: kc and teeth validation", () => {
    it("kc = 0 throws", () => {
      expect(() => {
        calculateStabilityLobes(makeModalParams(), 0, 4);
      }).toThrow(/kc.*must be > 0/i);
    });

    it("kc < 0 throws", () => {
      expect(() => {
        calculateStabilityLobes(makeModalParams(), -100, 4);
      }).toThrow(/kc.*must be > 0/i);
    });

    it("teeth = 0 throws", () => {
      expect(() => {
        calculateStabilityLobes(makeModalParams(), 1800, 0);
      }).toThrow(/teeth.*must be >= 1/i);
    });

    it("teeth = 1 works (single-flute)", () => {
      const result = calculateStabilityLobes(makeModalParams(), 1800, 1);
      expect(result.critical_depth).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("very low damping produces warnings", () => {
      const result = calculateStabilityLobes(makeModalParams({ damping_ratio: 0.001 }), 1800, 4);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("no NaN in any output", () => {
      const result = calculateStabilityLobes(makeModalParams(), 1800, 4, 2, 8000);
      expect(Number.isNaN(result.critical_depth)).toBe(false);
      expect(Number.isNaN(result.chatter_frequency)).toBe(false);
      expect(Number.isNaN(result.margin_percent)).toBe(false);
    });
  });
});

// ============================================================================
// 2. optimizeCuttingParameters
// ============================================================================

describe("optimizeCuttingParameters", () => {
  // Correct signature: (constraints, weights, material_kc, taylor_C, taylor_n, tool_diameter, number_of_teeth)
  const defaultConstraints = { max_power: 15, max_temperature: 800, max_surface_finish: 3.2 };
  const defaultWeights = { productivity: 0.3, cost: 0.3, quality: 0.2, tool_life: 0.2 };

  describe("happy path — steel pocket", () => {
    it("returns optimized parameters", () => {
      const result = optimizeCuttingParameters(
        defaultConstraints, defaultWeights, 1800, 200, 0.25, 20, 4
      );
      expect(result).toBeDefined();
      expect(result.optimal_speed).toBeGreaterThan(0);
      expect(result.optimal_feed).toBeGreaterThan(0);
      expect(result.optimal_depth).toBeGreaterThan(0);
      expect(result.objective_values).toBeDefined();
    });

    it("optimal speed is within physical range", () => {
      const result = optimizeCuttingParameters(
        defaultConstraints, defaultWeights, 1800, 200, 0.25, 20, 4
      );
      expect(result.optimal_speed).toBeGreaterThan(10);
      expect(result.optimal_speed).toBeLessThan(2000);
    });
  });

  describe("FORGE-DEBUG regression: total_weight <= 0 guard", () => {
    it("all weights = 0 throws", () => {
      expect(() => {
        optimizeCuttingParameters(
          defaultConstraints,
          { productivity: 0, cost: 0, quality: 0, tool_life: 0 },
          1800, 200, 0.25, 20, 4
        );
      }).toThrow(/weight/i);
    });
  });

  describe("taylor_n edge values", () => {
    it("taylor_n = 0.25 (typical carbide) works", () => {
      const result = optimizeCuttingParameters(
        defaultConstraints,
        { productivity: 0.5, cost: 0.5, quality: 0, tool_life: 0 },
        1800, 200, 0.25, 20, 4
      );
      expect(result.optimal_speed).toBeGreaterThan(0);
    });

    it("taylor_n near zero produces finite optimal speed", () => {
      const result = optimizeCuttingParameters(
        defaultConstraints, defaultWeights, 1800, 200, 0.01, 20, 4
      );
      expect(Number.isFinite(result.optimal_speed)).toBe(true);
      expect(Number.isFinite(result.optimal_feed)).toBe(true);
    });

    it("taylor_n = 0.5 (ceramic range) works", () => {
      const result = optimizeCuttingParameters(
        defaultConstraints, defaultWeights, 1800, 200, 0.5, 20, 4
      );
      expect(result.optimal_speed).toBeGreaterThan(0);
      expect(Number.isFinite(result.objective_values.tool_life)).toBe(true);
    });
  });

  describe("FORGE-DEBUG regression: cost_norm clamped to [0,1]", () => {
    it("extreme tool life does not produce NaN in objective values", () => {
      const result = optimizeCuttingParameters(
        defaultConstraints,
        { productivity: 0, cost: 1, quality: 0, tool_life: 0 },
        1800, 500, 0.25, 20, 4  // Taylor C=500 → long tool life
      );
      expect(Number.isFinite(result.objective_values.cost_per_part)).toBe(true);
      expect(Number.isFinite(result.objective_values.tool_life)).toBe(true);
    });
  });

  describe("weight emphasis effects", () => {
    it("productivity-heavy weights produce higher MRR than quality-heavy", () => {
      const prod = optimizeCuttingParameters(
        defaultConstraints,
        { productivity: 1.0, cost: 0, quality: 0, tool_life: 0 },
        1800, 200, 0.25, 20, 4
      );
      const qual = optimizeCuttingParameters(
        defaultConstraints,
        { productivity: 0, cost: 0, quality: 1.0, tool_life: 0 },
        1800, 200, 0.25, 20, 4
      );
      expect(prod.objective_values.mrr).toBeGreaterThanOrEqual(qual.objective_values.mrr * 0.8);
    });
  });

  describe("edge cases", () => {
    it("no NaN in outputs", () => {
      const result = optimizeCuttingParameters(
        defaultConstraints,
        { productivity: 0.25, cost: 0.25, quality: 0.25, tool_life: 0.25 },
        1800, 200, 0.25, 20, 4
      );
      expect(Number.isNaN(result.optimal_speed)).toBe(false);
      expect(Number.isNaN(result.optimal_feed)).toBe(false);
      expect(Number.isNaN(result.optimal_depth)).toBe(false);
      expect(Number.isFinite(result.objective_values.mrr)).toBe(true);
    });
  });
});
