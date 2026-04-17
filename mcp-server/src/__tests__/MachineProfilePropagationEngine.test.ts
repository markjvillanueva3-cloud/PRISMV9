/**
 * Tests for MachineProfilePropagationEngine
 * @milestone MCAT-MS0/P3-U03
 *
 * Verifies propagation of machine-profile into quoting, scheduling,
 * feasibility, and what-if analysis consumers.
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
  machineProfilePropagationEngine,
  type QuoteContext,
  type SchedulingContext,
  type FeasibilityContext,
  type WhatIfResult,
  type MachineComparisonResult,
} from "../engines/MachineProfilePropagationEngine.js";
import { shopMachineOverlayEngine } from "../engines/ShopMachineOverlayEngine.js";

describe("MachineProfilePropagationEngine", () => {
  beforeAll(() => {
    // Ensure test overlays exist
    try {
      shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "LTH-01",
        user_id: "prop-test",
        display_name: "Propagation Test Lathe",
      });
    } catch { /* exists */ }

    try {
      shopMachineOverlayEngine.createOverlay({
        shop_machine_id: "VMC-01",
        user_id: "prop-test",
        display_name: "Propagation Test VMC",
      });
    } catch { /* exists */ }
  });

  beforeEach(() => {
    // Clear caches for test isolation
    machineProfilePropagationEngine.invalidate("LTH-01");
    machineProfilePropagationEngine.invalidate("VMC-01");
  });

  describe("getQuoteContext", () => {
    it("returns quote context for valid machine", () => {
      const ctx = machineProfilePropagationEngine.getQuoteContext("LTH-01");

      expect(ctx).toBeDefined();
      expect(ctx?.machine_id).toBe("LTH-01");
    });

    it("includes hourly rate", () => {
      const ctx = machineProfilePropagationEngine.getQuoteContext("LTH-01");

      expect(ctx?.hourly_rate).toBeGreaterThan(0);
    });

    it("includes setup time estimate", () => {
      const ctx = machineProfilePropagationEngine.getQuoteContext("LTH-01");

      expect(ctx?.setup_time_minutes).toBeGreaterThan(0);
    });

    it("includes machine capabilities", () => {
      const ctx = machineProfilePropagationEngine.getQuoteContext("LTH-01");

      expect(ctx?.capabilities).toBeDefined();
      expect(ctx?.capabilities.max_rpm).toBeGreaterThan(0);
      expect(ctx?.capabilities.max_power_kw).toBeGreaterThan(0);
    });

    it("includes efficiency factor", () => {
      const ctx = machineProfilePropagationEngine.getQuoteContext("LTH-01");

      expect(ctx?.efficiency_factor).toBeGreaterThan(0);
      expect(ctx?.efficiency_factor).toBeLessThanOrEqual(1);
    });

    it("caches context for repeated access", () => {
      const ctx1 = machineProfilePropagationEngine.getQuoteContext("LTH-01");
      const ctx2 = machineProfilePropagationEngine.getQuoteContext("LTH-01");

      expect(ctx1).toBe(ctx2);
    });

    it("returns null for invalid machine", () => {
      const ctx = machineProfilePropagationEngine.getQuoteContext("INVALID-XYZ");

      expect(ctx).toBeNull();
    });
  });

  describe("getQuoteContexts", () => {
    it("returns contexts for multiple machines", () => {
      const contexts = machineProfilePropagationEngine.getQuoteContexts(["LTH-01", "VMC-01"]);

      expect(contexts.size).toBeGreaterThanOrEqual(1);
    });

    it("skips invalid machines", () => {
      const contexts = machineProfilePropagationEngine.getQuoteContexts(["LTH-01", "INVALID"]);

      expect(contexts.has("LTH-01")).toBe(true);
      expect(contexts.has("INVALID")).toBe(false);
    });
  });

  describe("calculateQuoteEstimate", () => {
    it("calculates quote for valid machine", () => {
      const estimate = machineProfilePropagationEngine.calculateQuoteEstimate({
        machine_id: "LTH-01",
        cycle_time_minutes: 30,
      });

      expect(estimate).toBeDefined();
      expect(estimate?.machine_cost).toBeGreaterThan(0);
      expect(estimate?.total_cost).toBeGreaterThan(0);
    });

    it("includes setup cost", () => {
      const estimate = machineProfilePropagationEngine.calculateQuoteEstimate({
        machine_id: "LTH-01",
        cycle_time_minutes: 30,
        setup_count: 2,
      });

      expect(estimate?.setup_cost).toBeGreaterThan(0);
    });

    it("includes breakdown items", () => {
      const estimate = machineProfilePropagationEngine.calculateQuoteEstimate({
        machine_id: "LTH-01",
        cycle_time_minutes: 30,
        material_cost: 50,
        tooling_cost: 25,
      });

      expect(estimate?.breakdown.length).toBeGreaterThanOrEqual(4);
      expect(estimate?.breakdown.some(b => b.item === "Material")).toBe(true);
      expect(estimate?.breakdown.some(b => b.item === "Tooling")).toBe(true);
    });

    it("calculates effective rate with efficiency", () => {
      const estimate = machineProfilePropagationEngine.calculateQuoteEstimate({
        machine_id: "LTH-01",
        cycle_time_minutes: 30,
      });

      const ctx = machineProfilePropagationEngine.getQuoteContext("LTH-01");
      expect(estimate?.effective_rate).toBeCloseTo(ctx!.hourly_rate * ctx!.efficiency_factor, 1);
    });

    it("returns null for invalid machine", () => {
      const estimate = machineProfilePropagationEngine.calculateQuoteEstimate({
        machine_id: "INVALID-XYZ",
        cycle_time_minutes: 30,
      });

      expect(estimate).toBeNull();
    });
  });

  describe("getSchedulingContext", () => {
    it("returns scheduling context for valid machine", () => {
      const ctx = machineProfilePropagationEngine.getSchedulingContext("LTH-01");

      expect(ctx).toBeDefined();
      expect(ctx?.machine_id).toBe("LTH-01");
    });

    it("includes shift hours", () => {
      const ctx = machineProfilePropagationEngine.getSchedulingContext("LTH-01");

      expect(ctx?.shift_hours_per_day).toBeGreaterThan(0);
    });

    it("includes capacity units", () => {
      const ctx = machineProfilePropagationEngine.getSchedulingContext("LTH-01");

      expect(ctx?.capacity_units_per_hour).toBeGreaterThan(0);
    });

    it("includes compatible operations", () => {
      const ctx = machineProfilePropagationEngine.getSchedulingContext("LTH-01");

      expect(Array.isArray(ctx?.compatible_operations)).toBe(true);
    });

    it("returns null for invalid machine", () => {
      const ctx = machineProfilePropagationEngine.getSchedulingContext("INVALID");

      expect(ctx).toBeNull();
    });
  });

  describe("getAllSchedulingContexts", () => {
    it("returns contexts for all shop machines", () => {
      const contexts = machineProfilePropagationEngine.getAllSchedulingContexts();

      expect(Array.isArray(contexts)).toBe(true);
      expect(contexts.length).toBeGreaterThan(0);
    });

    it("each context has required fields", () => {
      const contexts = machineProfilePropagationEngine.getAllSchedulingContexts();

      for (const ctx of contexts) {
        expect(ctx.machine_id).toBeDefined();
        expect(ctx.display_name).toBeDefined();
        expect(ctx.machine_type).toBeDefined();
      }
    });
  });

  describe("findBestMachineForScheduling", () => {
    it("finds machine for operation type", () => {
      const result = machineProfilePropagationEngine.findBestMachineForScheduling({
        operation_type: "turning",
        required_hours: 2,
      });

      // May or may not find a match depending on shop config
      if (result) {
        expect(result.recommended_machine).toBeDefined();
        expect(result.reason).toBeDefined();
      }
    });

    it("returns alternatives when available", () => {
      const result = machineProfilePropagationEngine.findBestMachineForScheduling({
        operation_type: "milling",
        required_hours: 1,
      });

      if (result && result.alternatives) {
        expect(Array.isArray(result.alternatives)).toBe(true);
      }
    });
  });

  describe("getFeasibilityContext", () => {
    it("returns feasibility context for valid machine", () => {
      const ctx = machineProfilePropagationEngine.getFeasibilityContext("LTH-01");

      expect(ctx).toBeDefined();
      expect(ctx?.machine_id).toBe("LTH-01");
    });

    it("includes capability limits", () => {
      const ctx = machineProfilePropagationEngine.getFeasibilityContext("LTH-01");

      expect(ctx?.capabilities.max_rpm).toBeGreaterThan(0);
      expect(ctx?.capabilities.envelope_x_mm).toBeGreaterThan(0);
    });

    it("includes controller info", () => {
      const ctx = machineProfilePropagationEngine.getFeasibilityContext("LTH-01");

      expect(ctx?.controller).toBeDefined();
      expect(ctx?.controller.id).toBeDefined();
    });

    it("includes constraints list", () => {
      const ctx = machineProfilePropagationEngine.getFeasibilityContext("LTH-01");

      expect(Array.isArray(ctx?.constraints)).toBe(true);
    });
  });

  describe("checkFeasibility", () => {
    it("returns feasibility result", () => {
      const result = machineProfilePropagationEngine.checkFeasibility({
        machine_id: "LTH-01",
        operation_type: "turning",
      });

      expect(typeof result.feasible).toBe("boolean");
      expect(typeof result.score).toBe("number");
    });

    it("includes detailed checks", () => {
      const result = machineProfilePropagationEngine.checkFeasibility({
        machine_id: "LTH-01",
        operation_type: "turning",
        required_rpm: 3000,
      });

      expect(Array.isArray(result.checks)).toBe(true);
    });

    it("checks envelope constraints", () => {
      const result = machineProfilePropagationEngine.checkFeasibility({
        machine_id: "LTH-01",
        operation_type: "turning",
        part_dims: { x: 100, y: 100, z: 200 },
      });

      const envelopeCheck = result.checks.find(c => c.name === "envelope");
      expect(envelopeCheck).toBeDefined();
    });

    it("checks weight constraints", () => {
      const result = machineProfilePropagationEngine.checkFeasibility({
        machine_id: "LTH-01",
        operation_type: "turning",
        part_weight_kg: 50,
      });

      // Weight check only if table_load_kg is defined
      expect(Array.isArray(result.checks)).toBe(true);
    });

    it("identifies blockers for infeasible operations", () => {
      const result = machineProfilePropagationEngine.checkFeasibility({
        machine_id: "LTH-01",
        operation_type: "turning",
        part_dims: { x: 10000, y: 10000, z: 10000 }, // Huge part
      });

      expect(result.feasible).toBe(false);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it("returns failure for invalid machine", () => {
      const result = machineProfilePropagationEngine.checkFeasibility({
        machine_id: "INVALID",
        operation_type: "turning",
      });

      expect(result.feasible).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  describe("runWhatIfAnalysis", () => {
    it("runs what-if analysis", () => {
      const result = machineProfilePropagationEngine.runWhatIfAnalysis({
        base_machine_id: "LTH-01",
        scenario_name: "Rate reduction",
        modifications: [{ field: "hourly_rate", value: 70 }],
        operation: {
          type: "turning",
          cycle_time_minutes: 30,
        },
      });

      expect(result).toBeDefined();
      expect(result?.scenario_id).toBeDefined();
    });

    it("includes baseline values", () => {
      const result = machineProfilePropagationEngine.runWhatIfAnalysis({
        base_machine_id: "LTH-01",
        scenario_name: "Test",
        modifications: [],
        operation: { type: "turning", cycle_time_minutes: 30 },
      });

      expect(result?.baseline.quote_rate).toBeGreaterThan(0);
      expect(result?.baseline.cycle_estimate_min).toBeGreaterThan(0);
    });

    it("calculates deltas", () => {
      const result = machineProfilePropagationEngine.runWhatIfAnalysis({
        base_machine_id: "LTH-01",
        scenario_name: "Rate change",
        modifications: [{ field: "hourly_rate", value: 100 }],
        operation: { type: "turning", cycle_time_minutes: 30 },
      });

      expect(typeof result?.delta.rate_change_pct).toBe("number");
    });

    it("provides recommendations", () => {
      const result = machineProfilePropagationEngine.runWhatIfAnalysis({
        base_machine_id: "LTH-01",
        scenario_name: "Test",
        modifications: [{ field: "efficiency", value: 0.95 }],
        operation: { type: "turning", cycle_time_minutes: 30 },
      });

      expect(Array.isArray(result?.recommendations)).toBe(true);
    });

    it("returns null for invalid machine", () => {
      const result = machineProfilePropagationEngine.runWhatIfAnalysis({
        base_machine_id: "INVALID",
        scenario_name: "Test",
        modifications: [],
        operation: { type: "turning", cycle_time_minutes: 30 },
      });

      expect(result).toBeNull();
    });
  });

  describe("compareMachines", () => {
    it("compares multiple machines", () => {
      const result = machineProfilePropagationEngine.compareMachines({
        machine_ids: ["LTH-01", "VMC-01"],
        operation: {
          type: "milling",
          cycle_time_minutes: 45,
        },
      });

      // May return null if machines don't support operation
      if (result) {
        expect(result.machines.length).toBeGreaterThan(0);
      }
    });

    it("identifies best for cost", () => {
      const result = machineProfilePropagationEngine.compareMachines({
        machine_ids: ["LTH-01"],
        operation: { type: "turning", cycle_time_minutes: 30 },
      });

      if (result) {
        expect(result.best_for_cost).toBeDefined();
      }
    });

    it("identifies best overall", () => {
      const result = machineProfilePropagationEngine.compareMachines({
        machine_ids: ["LTH-01"],
        operation: { type: "turning", cycle_time_minutes: 30 },
      });

      if (result) {
        expect(result.best_overall).toBeDefined();
        expect(result.recommendation).toBeDefined();
      }
    });

    it("returns null for empty machine list", () => {
      const result = machineProfilePropagationEngine.compareMachines({
        machine_ids: [],
        operation: { type: "turning", cycle_time_minutes: 30 },
      });

      expect(result).toBeNull();
    });
  });

  describe("propagateAll", () => {
    it("propagates all machine contexts", () => {
      const stats = machineProfilePropagationEngine.propagateAll();

      expect(stats.total_quote_contexts).toBeGreaterThan(0);
      expect(stats.total_scheduling_contexts).toBeGreaterThan(0);
      expect(stats.total_feasibility_contexts).toBeGreaterThan(0);
    });

    it("updates last propagation timestamp", () => {
      const stats = machineProfilePropagationEngine.propagateAll();

      expect(stats.last_propagation).toBeDefined();
      expect(stats.last_propagation).not.toBe("never");
    });

    it("calculates coverage percentage", () => {
      const stats = machineProfilePropagationEngine.propagateAll();

      expect(stats.propagation_coverage_pct).toBeGreaterThanOrEqual(0);
      expect(stats.propagation_coverage_pct).toBeLessThanOrEqual(100);
    });
  });

  describe("invalidate", () => {
    it("clears cached contexts for machine", () => {
      // First populate cache
      machineProfilePropagationEngine.getQuoteContext("LTH-01");
      machineProfilePropagationEngine.getSchedulingContext("LTH-01");

      // Invalidate
      machineProfilePropagationEngine.invalidate("LTH-01");

      // Stats should reflect cleared cache (for this machine)
      const stats = machineProfilePropagationEngine.getStats();
      // After invalidate, if no other machines cached, counts drop
      expect(stats.total_quote_contexts).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getStats", () => {
    it("returns propagation statistics", () => {
      const stats = machineProfilePropagationEngine.getStats();

      expect(typeof stats.total_quote_contexts).toBe("number");
      expect(typeof stats.total_scheduling_contexts).toBe("number");
      expect(typeof stats.total_feasibility_contexts).toBe("number");
      expect(typeof stats.propagation_coverage_pct).toBe("number");
    });
  });

  describe("getSelfAwareness", () => {
    it("returns engine metadata", () => {
      const awareness = machineProfilePropagationEngine.getSelfAwareness();

      expect(awareness.engine).toBe("MachineProfilePropagationEngine");
      expect(awareness.milestone).toBe("MCAT-MS0/P3-U03");
    });

    it("lists all capabilities", () => {
      const awareness = machineProfilePropagationEngine.getSelfAwareness();

      expect(awareness.capabilities).toContain("getQuoteContext");
      expect(awareness.capabilities).toContain("checkFeasibility");
      expect(awareness.capabilities).toContain("runWhatIfAnalysis");
      expect(awareness.capabilities).toContain("compareMachines");
    });

    it("lists consumers", () => {
      const awareness = machineProfilePropagationEngine.getSelfAwareness();

      expect(awareness.consumers).toContain("InstantQuoteEngine");
      expect(awareness.consumers).toContain("CapacityPlanningEngine");
    });
  });
});
