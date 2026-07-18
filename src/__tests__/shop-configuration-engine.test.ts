/**
 * ShopConfigurationEngine test suite — Session 5-2 EXIT GATE
 *
 * Tests: CRUD operations, rate validation, bridge methods (toJobCostingRates,
 * toCostingParams, toCapacityMachines), machine management, and profile reset.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { shopConfigurationEngine } from "../engines/ShopConfigurationEngine.js";

describe("ShopConfigurationEngine", () => {

  beforeEach(() => {
    // Reset to known state before each test
    shopConfigurationEngine.resetProfile("default");
  });

  // ── GET / LIST ──────────────────────────────────────────────────────────

  describe("getProfile / listProfiles", () => {
    it("returns default profile with expected defaults", () => {
      const profile = shopConfigurationEngine.getProfile("default");
      expect(profile.id).toBe("default");
      expect(profile.name).toBe("Default Shop Profile");
      expect(profile.rates.labor_per_hr).toBe(45.00);
      expect(profile.rates.overhead_per_hr).toBe(35.00);
      expect(profile.rates.setup_per_hr).toBe(55.00);
      expect(profile.rates.programming_per_hr).toBe(75.00);
      expect(profile.rates.inspection_per_hr).toBe(50.00);
      expect(profile.overhead_pct).toBe(15);
      expect(profile.material_markup_pct).toBe(10);
      expect(profile.tooling_cost_per_op).toBe(15.00);
      expect(profile.material_cost_per_part_default).toBe(25.00);
    });

    it("returns default profile for unknown IDs", () => {
      const profile = shopConfigurationEngine.getProfile("nonexistent");
      expect(profile.id).toBe("default");
    });

    it("lists all profiles", () => {
      const profiles = shopConfigurationEngine.listProfiles();
      expect(profiles.length).toBeGreaterThanOrEqual(1);
      expect(profiles[0].id).toBe("default");
    });
  });

  // ── RATES ───────────────────────────────────────────────────────────────

  describe("rates", () => {
    it("getRates returns copy of rates", () => {
      const rates = shopConfigurationEngine.getRates();
      expect(rates.labor_per_hr).toBe(45.00);
      // Verify it's a copy (mutation doesn't affect original)
      rates.labor_per_hr = 999;
      expect(shopConfigurationEngine.getRates().labor_per_hr).toBe(45.00);
    });

    it("updateRates merges partial updates", () => {
      const updated = shopConfigurationEngine.updateRates("default", { labor_per_hr: 65.00 });
      expect(updated.labor_per_hr).toBe(65.00);
      // Other rates unchanged
      expect(updated.overhead_per_hr).toBe(35.00);
      expect(updated.setup_per_hr).toBe(55.00);
    });

    it("rate change propagates to profile", () => {
      shopConfigurationEngine.updateRates("default", { programming_per_hr: 100.00 });
      const profile = shopConfigurationEngine.getProfile("default");
      expect(profile.rates.programming_per_hr).toBe(100.00);
    });
  });

  // ── MACHINES ────────────────────────────────────────────────────────────

  describe("machines", () => {
    it("default profile has 8 machines", () => {
      const machines = shopConfigurationEngine.getMachines();
      expect(machines.length).toBe(8);
    });

    it("addMachine adds a new machine", () => {
      const machines = shopConfigurationEngine.addMachine("default", {
        id: "WIRE-1", name: "Fanuc RoboCut", type: "Wire EDM",
        hourly_rate: 110, efficiency_factor: 0.75,
        capabilities: ["wire_edm", "taper_cutting"],
        hours_per_shift: 8, shifts_per_day: 1, days_per_week: 5,
      });
      expect(machines.length).toBe(9);
      expect(machines.find((m: any) => m.id === "WIRE-1")).toBeDefined();
    });

    it("addMachine rejects duplicate ID", () => {
      expect(() =>
        shopConfigurationEngine.addMachine("default", {
          id: "VMC-1", name: "Duplicate", type: "VMC",
          hourly_rate: 100, efficiency_factor: 0.8,
          capabilities: [], hours_per_shift: 8, shifts_per_day: 1, days_per_week: 5,
        })
      ).toThrow(/already exists/);
    });

    it("updateMachine modifies existing machine", () => {
      const updated = shopConfigurationEngine.updateMachine("default", "VMC-1", { hourly_rate: 95 });
      expect(updated.hourly_rate).toBe(95);
      expect(updated.id).toBe("VMC-1");
      // Name should be preserved
      expect(updated.name).toBe("Haas VF-2");
    });

    it("updateMachine throws for unknown machine", () => {
      expect(() =>
        shopConfigurationEngine.updateMachine("default", "UNKNOWN-1", { hourly_rate: 50 })
      ).toThrow(/not found/);
    });

    it("removeMachine removes by ID", () => {
      const remaining = shopConfigurationEngine.removeMachine("default", "SAW-1");
      expect(remaining.length).toBe(7);
      expect(remaining.find((m: any) => m.id === "SAW-1")).toBeUndefined();
    });

    it("removeMachine throws for unknown machine", () => {
      expect(() => shopConfigurationEngine.removeMachine("default", "UNKNOWN-1")).toThrow(/not found/);
    });

    it("getMachineRate by ID", () => {
      const rate = shopConfigurationEngine.getMachineRate("default", "VMC-2");
      expect(rate).toBe(150); // DMG MORI DMU 50 5-axis rate
    });

    it("getMachineRate by type", () => {
      const rate = shopConfigurationEngine.getMachineRate("default", "Lathe");
      expect(rate).toBe(75);
    });

    it("getMachineRate fallback for unknown", () => {
      const rate = shopConfigurationEngine.getMachineRate("default", "Plasma Cutter");
      expect(rate).toBe(85); // default fallback
    });
  });

  // ── BRIDGE METHODS ──────────────────────────────────────────────────────

  describe("toJobCostingRates", () => {
    it("maps shop rates to JobCostingEngine format", () => {
      const jcr = shopConfigurationEngine.toJobCostingRates();
      expect(jcr.laborRate).toBe(45.00);
      expect(jcr.overheadRate).toBe(35.00);
      expect(jcr.adminRate).toBe(15.00);
      expect(jcr.setupRate).toBe(55.00);
      expect(jcr.programmingRate).toBe(75.00);
      expect(jcr.inspectionRate).toBe(50.00);
      // Machine rates mapped via TYPE_TO_RATE_KEY
      expect(jcr.machineRates["cnc_mill_3axis"]).toBe(85.00);
      expect(jcr.machineRates["cnc_mill_5axis"]).toBe(150.00);
      expect(jcr.machineRates["cnc_lathe"]).toBe(75.00);
    });

    it("rate changes propagate to bridge output", () => {
      shopConfigurationEngine.updateRates("default", { labor_per_hr: 65 });
      const jcr = shopConfigurationEngine.toJobCostingRates();
      expect(jcr.laborRate).toBe(65);
    });
  });

  describe("toCostingParams", () => {
    it("maps to ERPIntegrationEngine format", () => {
      const params = shopConfigurationEngine.toCostingParams();
      expect(params.machineRate).toBe(85); // VMC-1 Haas VF-2 rate
      expect(params.laborRate).toBe(45);
      expect(params.overheadPct).toBe(15);
      expect(params.toolingCostPerOp).toBe(15);
      expect(params.materialCostPerPart).toBe(25);
    });
  });

  describe("toCapacityMachines", () => {
    it("maps to CapacityPlanningEngine format", () => {
      const machines = shopConfigurationEngine.toCapacityMachines();
      expect(machines.length).toBe(8);
      const vmc1 = machines.find((m: any) => m.machine_id === "VMC-1");
      expect(vmc1).toBeDefined();
      expect(vmc1.machine_name).toBe("Haas VF-2");
      expect(vmc1.hours_per_shift).toBe(8);
      expect(vmc1.shifts_per_day).toBe(2);
      expect(vmc1.efficiency_factor).toBe(0.85);
    });
  });

  // ── VALIDATION ──────────────────────────────────────────────────────────

  describe("validateProfile", () => {
    it("default profile has no warnings", () => {
      const profile = shopConfigurationEngine.getProfile("default");
      const warnings = shopConfigurationEngine.validateProfile(profile);
      expect(warnings.length).toBe(0);
    });

    it("admin_burden_pct defaults to 15", () => {
      const profile = shopConfigurationEngine.getProfile("default");
      expect(profile.admin_burden_pct).toBe(15);
    });

    it("warns on out-of-range labor rate", () => {
      shopConfigurationEngine.updateRates("default", { labor_per_hr: 10 });
      const profile = shopConfigurationEngine.getProfile("default");
      const warnings = shopConfigurationEngine.validateProfile(profile);
      expect(warnings.some((w: string) => w.includes("labor_per_hr"))).toBe(true);
    });

    it("warns on extreme machine rate", () => {
      shopConfigurationEngine.updateMachine("default", "VMC-1", { hourly_rate: 600 });
      const profile = shopConfigurationEngine.getProfile("default");
      const warnings = shopConfigurationEngine.validateProfile(profile);
      expect(warnings.some((w: string) => w.includes("VMC-1"))).toBe(true);
    });

    it("warns on extreme efficiency", () => {
      shopConfigurationEngine.updateMachine("default", "VMC-1", { efficiency_factor: 0.1 });
      const profile = shopConfigurationEngine.getProfile("default");
      const warnings = shopConfigurationEngine.validateProfile(profile);
      expect(warnings.some((w: string) => w.includes("efficiency"))).toBe(true);
    });
  });

  // ── RESET ───────────────────────────────────────────────────────────────

  describe("resetProfile", () => {
    it("restores factory defaults after modifications", () => {
      shopConfigurationEngine.updateRates("default", { labor_per_hr: 999 });
      shopConfigurationEngine.removeMachine("default", "SAW-1");
      expect(shopConfigurationEngine.getMachines().length).toBe(7);

      shopConfigurationEngine.resetProfile("default");

      const profile = shopConfigurationEngine.getProfile("default");
      expect(profile.rates.labor_per_hr).toBe(45.00);
      expect(profile.machines.length).toBe(8);
    });
  });

  // ── STATS ───────────────────────────────────────────────────────────────

  describe("getStats", () => {
    it("returns correct stats for default profile", () => {
      const stats = shopConfigurationEngine.getStats();
      expect(stats.profile_count).toBe(1);
      expect(stats.machine_count).toBe(8);
      expect(stats.avg_machine_rate).toBeGreaterThan(0);
      expect(stats.total_weekly_capacity_hours).toBeGreaterThan(0);
    });
  });

  // ── RATE CHANGE → QUOTE CHANGE (EXIT GATE requirement) ─────────────────

  describe("rate change → costing propagation", () => {
    it("rate increase changes all bridge outputs proportionally", () => {
      const before = shopConfigurationEngine.toCostingParams();
      expect(before.laborRate).toBe(45);

      shopConfigurationEngine.updateRates("default", { labor_per_hr: 90 }); // 2x
      const after = shopConfigurationEngine.toCostingParams();
      expect(after.laborRate).toBe(90);

      // JobCostingEngine bridge should also reflect the change
      const jcr = shopConfigurationEngine.toJobCostingRates();
      expect(jcr.laborRate).toBe(90);
    });

    it("machine rate change appears in JobCosting bridge", () => {
      shopConfigurationEngine.updateMachine("default", "VMC-1", { hourly_rate: 100 });
      const jcr = shopConfigurationEngine.toJobCostingRates();
      expect(jcr.machineRates["cnc_mill_3axis"]).toBe(100);
    });

    it("overhead_pct change appears in costing params", () => {
      shopConfigurationEngine.updateProfile("default", { overhead_pct: 25 });
      const params = shopConfigurationEngine.toCostingParams();
      expect(params.overheadPct).toBe(25);
    });
  });
});
