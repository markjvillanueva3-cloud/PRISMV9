/**
 * FORGE-DEBUG P0 Regression Tests
 * Tests for bugs found during MASTER_INDEX sweep of Core Calculations (P0).
 * Each test reproduces the original bug condition and verifies the fix.
 */
import { describe, it, expect } from "vitest";

import {
  calculateTaylorToolLife,
  calculateDrillingForce,
  calculateSurfaceFinish,
  calculateSpindlePower,
  calculateChipLoad,
  calculateTorque,
  calculateProductivityMetrics,
  calculateJohnsonCookStress,
} from "../engines/ManufacturingCalculations.js";

import {
  advancedCalculations,
  optimizeCuttingParameters,
} from "../engines/AdvancedCalculations.js";

import {
  toolpathCalculations,
  calculateChipThinning,
  calculateMultiPassStrategy,
} from "../engines/ToolpathCalculations.js";

// ============================================================================
// ManufacturingCalculations.ts — CRITICAL fixes
// ============================================================================

describe("ManufacturingCalculations — FORGE-DEBUG P0 regressions", () => {

  describe("Johnson-Cook T_melt <= T_ref guard", () => {
    it("throws when T_melt equals T_ref and temperature > T_ref", () => {
      // Bug: (T - T_ref) / (T_melt - T_ref) → division by zero when T_melt == T_ref
      expect(() => calculateJohnsonCookStress(0.5, 1000, 600, {
        A: 800, B: 500, n: 0.34, C: 0.012, m: 1.0,
        T_ref: 500, T_melt: 500,
      })).toThrow("T_melt");
    });

    it("throws when T_melt < T_ref and temperature > T_ref", () => {
      expect(() => calculateJohnsonCookStress(0.5, 1000, 700, {
        A: 800, B: 500, n: 0.34, C: 0.012, m: 1.0,
        T_ref: 600, T_melt: 500,
      })).toThrow("T_melt");
    });
  });

  describe("Taylor tool life n=0 guard", () => {
    it("throws when Taylor exponent n is 0", () => {
      expect(() => calculateTaylorToolLife(200, { C: 300, n: 0 })).toThrow("n must be > 0");
    });

    it("throws when Taylor exponent n is negative", () => {
      expect(() => calculateTaylorToolLife(200, { C: 300, n: -0.1 })).toThrow("n must be > 0");
    });

    it("calculates normally with valid n", () => {
      const r = calculateTaylorToolLife(200, { C: 300, n: 0.25 });
      expect(r.tool_life_minutes).toBeGreaterThan(0);
      expect(isFinite(r.tool_life_minutes)).toBe(true);
    });
  });

  describe("calculateTorque — dead code removal", () => {
    it("returns finite torque for milling", () => {
      const r = calculateTorque(500, 20, "milling");
      expect(r.torque_nm).toBeGreaterThan(0);
      expect(isFinite(r.torque_nm)).toBe(true);
    });

    it("formula string differs for turning vs milling", () => {
      const rTurn = calculateTorque(500, 20, "turning");
      const rMill = calculateTorque(500, 20, "milling");
      expect(rTurn.formula).toContain("D_work");
      expect(rMill.formula).toContain("D_tool");
    });
  });

  describe("calculateProductivityMetrics — mrr=0 div/0 guard", () => {
    it("returns finite cost when axial_depth=0 (mrr=0)", () => {
      const r = calculateProductivityMetrics(
        200, 0.1, 0, 10, 20, 4, 300, 0.25, 25, 1.5
      );
      expect(isFinite(r.cost_per_cm3)).toBe(true);
      expect(r.cost_per_cm3).toBe(0);
    });
  });

  describe("calculateSpindlePower — negative value guards", () => {
    it("throws on negative cutting force", () => {
      expect(() => calculateSpindlePower(-100, 200, 20)).toThrow("cutting_force must be >= 0");
    });

    it("throws on negative cutting speed", () => {
      expect(() => calculateSpindlePower(100, -200, 20)).toThrow("cutting_speed must be >= 0");
    });

    it("accepts zero cutting force (zero power)", () => {
      const r = calculateSpindlePower(0, 200, 20);
      expect(r.power_cutting_kw).toBe(0);
    });
  });

  describe("calculateChipLoad — hex guard", () => {
    it("returns finite chip_thinning_factor with very small radial depth", () => {
      // Very small ae → hex approaches 0, chip_thinning_factor must stay finite
      const r = calculateChipLoad(100, 10000, 4, 0.001, 20);
      expect(isFinite(r.chip_thinning_factor)).toBe(true);
      expect(r.chip_thinning_factor).toBeGreaterThanOrEqual(1);
    });
  });

  describe("calculateDrillingForce — Ff/Fc ratio guard", () => {
    it("returns Ff_over_Fc=0 when feed=0 (Fc=0)", () => {
      const r = calculateDrillingForce(
        { drill_diameter: 10, feed_per_rev: 0, cutting_speed: 80 },
        { kc1_1: 2000, mc: 0.25 }
      );
      expect(isFinite(r.force_ratios.Ff_over_Fc)).toBe(true);
      expect(r.force_ratios.Ff_over_Fc).toBe(0);
    });
  });

  describe("calculateSurfaceFinish — nose_radius=0 guard", () => {
    it("returns finite Ra when nose_radius=0", () => {
      const r = calculateSurfaceFinish(0.2, 0, "turning");
      expect(isFinite(r.theoretical_Ra)).toBe(true);
      expect(r.theoretical_Ra).toBe(0);
    });
  });
});

// ============================================================================
// AdvancedCalculations.ts — CRITICAL + MAJOR fixes
// ============================================================================

describe("AdvancedCalculations — FORGE-DEBUG P0 regressions", () => {

  describe("Ra formula — spurious *2 removed", () => {
    it("surface_finish values are finite and positive", () => {
      const result = optimizeCuttingParameters(
        { max_power: 999, max_force: 99999, min_tool_life: 0, max_surface_finish: 999 },
        { productivity: 1, cost: 0, quality: 0, tool_life: 0 },
        2000, 300, 0.25, 20, 4
      );
      expect(result.objective_values.surface_finish).toBeGreaterThan(0);
      expect(isFinite(result.objective_values.surface_finish)).toBe(true);
    });
  });

  describe("constraints_satisfied — tracks feasibility", () => {
    it("returns constraints_satisfied=false when all infeasible", () => {
      const result = optimizeCuttingParameters(
        { max_power: 0.001, max_force: 0.001, min_tool_life: 99999, max_surface_finish: 0.0001 },
        { productivity: 1, cost: 1, quality: 1, tool_life: 1 },
        2000, 300, 0.25, 20, 4
      );
      expect(result.constraints_satisfied).toBe(false);
    });

    it("returns constraints_satisfied=true when feasible solutions exist", () => {
      const result = optimizeCuttingParameters(
        { max_power: 50, max_force: 5000, min_tool_life: 1, max_surface_finish: 10 },
        { productivity: 1, cost: 1, quality: 1, tool_life: 1 },
        2000, 300, 0.25, 20, 4
      );
      expect(result.constraints_satisfied).toBe(true);
    });
  });

  describe("volume_to_remove falsy check", () => {
    it("skips cost when volume_to_remove=0", () => {
      const r = advancedCalculations.minimumCostSpeed(
        300, 0.25,
        { machine_rate: 1.5, tool_cost: 25, tool_change_time: 50 },
        0, 0
      );
      expect(r).toBeDefined();
      expect(r.optimal_speed).toBeGreaterThan(0);
    });
  });

  describe("toolDeflection — dynamic factor", () => {
    it("dynamic_deflection uses clamped factor of 1.5", () => {
      const r = advancedCalculations.toolDeflection(500, 12, 48, 600, 0.003);
      expect(r.dynamic_deflection).toBeCloseTo(r.static_deflection * 1.5, 6);
    });
  });
});

// ============================================================================
// ToolpathCalculations.ts — CRITICAL + MAJOR fixes
// ============================================================================

describe("ToolpathCalculations — FORGE-DEBUG P0 regressions", () => {

  describe("engagementAngle — max_chip_thickness at full slot", () => {
    it("max_chip_thickness equals fz at full-slot (ae=D)", () => {
      const r = toolpathCalculations.engagementAngle(20, 20, 0.1, true, 200);
      // At full slot: engagement=180°, sin(90°)=1, so max_chip = fz
      expect(r.max_chip_thickness).toBeCloseTo(0.1, 2);
    });

    it("max_chip_thickness > 0 at 50% engagement", () => {
      const r = toolpathCalculations.engagementAngle(20, 10, 0.1, true, 200);
      expect(r.max_chip_thickness).toBeGreaterThan(0);
      expect(r.max_chip_thickness).toBeLessThanOrEqual(0.1);
    });
  });

  describe("calculateChipThinning — dead hex removed + div/0 guard", () => {
    it("returns finite values when radial_depth=0", () => {
      const r = calculateChipThinning(20, 0, 0.1, 4, 200);
      expect(isFinite(r.chip_thinning.fz_compensated)).toBe(true);
      expect(r.chip_thinning.fz_compensated).toBe(0.1);
    });

    it("returns finite values at very small ae_ratio", () => {
      const r = calculateChipThinning(20, 0.01, 0.1, 4, 200);
      expect(isFinite(r.chip_thinning.fz_compensated)).toBe(true);
      expect(isFinite(r.chip_thinning.hex_without_compensation)).toBe(true);
    });
  });

  describe("trochoidalParams — MRR includes number_of_teeth", () => {
    it("MRR scales with number_of_teeth", () => {
      const r2 = toolpathCalculations.trochoidalParams(20, 30, 10, 200, 0.1, 2);
      const r4 = toolpathCalculations.trochoidalParams(20, 30, 10, 200, 0.1, 4);
      expect(r4.mrr / r2.mrr).toBeCloseTo(2, 1);
    });
  });

  describe("calculateMultiPassStrategy — kc1_1=0 guard", () => {
    it("returns valid strategy when kc1_1=0", () => {
      const r = calculateMultiPassStrategy(
        10, 20, 0, 15, 200, 300, 0.1, 0.05
      );
      expect(r).toBeDefined();
      const roughing = r.strategy.phases[0];
      expect(isFinite(roughing.passes)).toBe(true);
      expect(roughing.passes).toBeGreaterThanOrEqual(0);
    });
  });
});
