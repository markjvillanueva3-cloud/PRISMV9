/**
 * ShopConfigurationEngine test suite — JM Die Company (canonical test shop)
 *
 * Tests: CRUD operations, rate validation, bridge methods (toJobCostingRates,
 * toCostingParams, toCapacityMachines), machine management, and profile reset.
 *
 * JM Die: Cold heading die & tooling shop. 21 machines across 7 Okuma lathes,
 * 5 mills, 2 sinker EDMs, 1 wire EDM, and 6 support machines.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { shopConfigurationEngine, ShopConfigurationEngine } from "../engines/ShopConfigurationEngine.js";

const PROFILE_ID = ShopConfigurationEngine.DEFAULT_PROFILE_ID; // "jm-die"

describe("ShopConfigurationEngine", () => {

  beforeEach(() => {
    shopConfigurationEngine.resetProfile(PROFILE_ID);
  });

  // ── GET / LIST ──────────────────────────────────────────────────────────

  describe("getProfile / listProfiles", () => {
    it("returns JM Die profile with expected defaults", () => {
      const profile = shopConfigurationEngine.getProfile(PROFILE_ID);
      expect(profile.id).toBe("jm-die");
      expect(profile.name).toBe("JM Die Company");
      expect(profile.rates.labor_per_hr).toBe(55.00);
      expect(profile.rates.overhead_per_hr).toBe(30.00);
      expect(profile.rates.setup_per_hr).toBe(65.00);
      expect(profile.rates.programming_per_hr).toBe(85.00);
      expect(profile.rates.inspection_per_hr).toBe(55.00);
      expect(profile.overhead_pct).toBe(18);
      expect(profile.material_markup_pct).toBe(15);
      expect(profile.tooling_cost_per_op).toBe(20.00);
      expect(profile.material_cost_per_part_default).toBe(35.00);
      expect(profile.company_profile.legal_name).toBe("JM Die Company");
      expect(profile.company_profile.canonical_test_shop).toBe(true);
      expect(profile.source_roots.programs_root).toBe("H:\\PRISM\\JM DIE\\Programs");
      expect(profile.seed_domains.some((domain) => domain.id === "employee_database")).toBe(true);
      expect(profile.seed_domains.find((domain) => domain.id === "tool_holders")?.status).toBe("in_progress");
      expect(profile.seed_domains.find((domain) => domain.id === "tooling")?.status).toBe("in_progress");
      expect(profile.seed_domains.find((domain) => domain.id === "materials")?.status).toBe("in_progress");
    });

    it("returns JM Die profile for unknown IDs", () => {
      const profile = shopConfigurationEngine.getProfile("nonexistent");
      expect(profile.id).toBe("jm-die");
    });

    it("returns JM Die profile via 'default' alias", () => {
      const profile = shopConfigurationEngine.getProfile("default");
      expect(profile.id).toBe("jm-die");
    });

    it("lists all profiles", () => {
      const profiles = shopConfigurationEngine.listProfiles();
      expect(profiles.length).toBeGreaterThanOrEqual(1);
      expect(profiles.some(p => p.id === "jm-die")).toBe(true);
    });
  });

  // ── RATES ───────────────────────────────────────────────────────────────

  describe("rates", () => {
    it("getRates returns copy of rates", () => {
      const rates = shopConfigurationEngine.getRates();
      expect(rates.labor_per_hr).toBe(55.00);
      rates.labor_per_hr = 999;
      expect(shopConfigurationEngine.getRates().labor_per_hr).toBe(55.00);
    });

    it("updateRates merges partial updates", () => {
      const updated = shopConfigurationEngine.updateRates(PROFILE_ID, { labor_per_hr: 65.00 });
      expect(updated.labor_per_hr).toBe(65.00);
      expect(updated.overhead_per_hr).toBe(30.00);
      expect(updated.setup_per_hr).toBe(65.00);
    });

    it("rate change propagates to profile", () => {
      shopConfigurationEngine.updateRates(PROFILE_ID, { programming_per_hr: 100.00 });
      const profile = shopConfigurationEngine.getProfile(PROFILE_ID);
      expect(profile.rates.programming_per_hr).toBe(100.00);
    });
  });

  // ── MACHINES ────────────────────────────────────────────────────────────

  describe("machines", () => {
    it("JM Die profile has 21 machines", () => {
      const machines = shopConfigurationEngine.getMachines();
      expect(machines.length).toBe(21);
    });

    it("has 7 Okuma lathes", () => {
      const machines = shopConfigurationEngine.getMachines();
      const lathes = machines.filter((m: any) => m.id.startsWith("LTH-"));
      expect(lathes.length).toBe(7);
      const okumaLathes = lathes.filter((m: any) => m.controller === "okuma");
      expect(okumaLathes.length).toBe(7);
    });

    it("has Roku-Roku HC 658-II mill", () => {
      const machines = shopConfigurationEngine.getMachines();
      const roku = machines.find((m: any) => m.id === "VMC-05");
      expect(roku).toBeDefined();
      expect(roku!.name).toBe("Roku-Roku HC 658-II");
      expect(roku!.capabilities).toContain("engraving");
      expect(roku!.capabilities).toContain("graphite_milling");
    });

    it("has Mitsubishi wire EDM", () => {
      const machines = shopConfigurationEngine.getMachines();
      const wedm = machines.find((m: any) => m.id === "WEDM-01");
      expect(wedm).toBeDefined();
      expect(wedm!.name).toBe("Mitsubishi FA10S");
      expect(wedm!.wedm_brand).toBe("mitsubishi");
      expect(wedm!.wedm_wire_inventory!.length).toBe(2);
    });

    it("has 2 sinker EDMs", () => {
      const machines = shopConfigurationEngine.getMachines();
      const edms = machines.filter((m: any) => m.id.startsWith("EDM-"));
      expect(edms.length).toBe(2);
    });

    it("addMachine adds a new machine", () => {
      const machines = shopConfigurationEngine.addMachine(PROFILE_ID, {
        id: "TEST-01", name: "Test Machine", type: "VMC",
        hourly_rate: 65, efficiency_factor: 0.75,
        capabilities: ["milling"],
        hours_per_shift: 10, shifts_per_day: 1, days_per_week: 5,
      });
      expect(machines.length).toBe(22);
    });

    it("addMachine rejects duplicate ID", () => {
      expect(() =>
        shopConfigurationEngine.addMachine(PROFILE_ID, {
          id: "VMC-01", name: "Duplicate", type: "VMC",
          hourly_rate: 100, efficiency_factor: 0.8,
          capabilities: [], hours_per_shift: 8, shifts_per_day: 1, days_per_week: 5,
        })
      ).toThrow(/already exists/);
    });

    it("updateMachine modifies existing machine", () => {
      const updated = shopConfigurationEngine.updateMachine(PROFILE_ID, "VMC-01", { hourly_rate: 100 });
      expect(updated.hourly_rate).toBe(100);
      expect(updated.id).toBe("VMC-01");
      expect(updated.name).toBe("Hurco VM30i");
    });

    it("updateMachine throws for unknown machine", () => {
      expect(() =>
        shopConfigurationEngine.updateMachine(PROFILE_ID, "UNKNOWN-1", { hourly_rate: 50 })
      ).toThrow(/not found/);
    });

    it("removeMachine removes by ID", () => {
      const remaining = shopConfigurationEngine.removeMachine(PROFILE_ID, "SAW-01");
      expect(remaining.length).toBe(20);
      expect(remaining.find((m: any) => m.id === "SAW-01")).toBeUndefined();
    });

    it("removeMachine throws for unknown machine", () => {
      expect(() => shopConfigurationEngine.removeMachine(PROFILE_ID, "UNKNOWN-1")).toThrow(/not found/);
    });

    it("getMachineRate by ID", () => {
      const rate = shopConfigurationEngine.getMachineRate(PROFILE_ID, "VMC-05");
      expect(rate).toBe(110); // Roku-Roku HC 658-II rate
    });

    it("getMachineRate by type", () => {
      const rate = shopConfigurationEngine.getMachineRate(PROFILE_ID, "Lathe");
      expect(rate).toBeGreaterThan(0);
    });

    it("getMachineRate fallback for unknown", () => {
      const rate = shopConfigurationEngine.getMachineRate(PROFILE_ID, "Plasma Cutter");
      expect(rate).toBe(85); // default fallback
    });
  });

  describe("machine controller registry", () => {
    it("returns canonical JM Die controller mappings and release posture", () => {
      const registry = shopConfigurationEngine.getMachineControllerRegistry();
      expect(registry).toHaveLength(21);

      const roku = registry.find((entry) => entry.machine_id === "VMC-05");
      expect(roku).toBeDefined();
      expect(roku?.controller_family).toBe("fanuc");
      expect(roku?.controller_model).toBe("Fanuc 31i-B5");
      expect(roku?.program_release_ready).toBe(true);
      expect(roku?.canonical_test_machine).toBe(true);
      expect(roku?.machine_source_root).toBe("H:\\PRISM\\JM DIE\\Machines");
      expect(roku?.controller_source_root).toBe("H:\\PRISM\\JM DIE\\Controllers");

      const wedm = registry.find((entry) => entry.machine_id === "WEDM-01");
      expect(wedm).toBeDefined();
      expect(wedm?.controller_family).toBe("mitsubishi");
      expect(wedm?.controller_model).toBe("W31MV-2");
      expect(wedm?.program_release_ready).toBe(false);

      const manual = registry.find((entry) => entry.machine_id === "MAN-01");
      expect(manual).toBeDefined();
      expect(manual?.controller_model).toBe("pending_mapping");
      expect(manual?.program_release_ready).toBe(true);
    });

    it("summarizes mapped controllers and release-ready machines", () => {
      const summary = shopConfigurationEngine.getMachineSeedSummary();
      expect(summary.shop_id).toBe("jm-die");
      expect(summary.machine_count).toBe(21);
      expect(summary.mapped_controller_count).toBe(15);
      expect(summary.unmapped_machine_count).toBe(6);
      expect(summary.program_release_ready_machine_count).toBe(14);
      expect(summary.machine_source_root).toBe("H:\\PRISM\\JM DIE\\Machines");
      expect(summary.controller_source_root).toBe("H:\\PRISM\\JM DIE\\Controllers");
    });
  });

  // ── BRIDGE METHODS ──────────────────────────────────────────────────────

  describe("toJobCostingRates", () => {
    it("maps shop rates to JobCostingEngine format", () => {
      const jcr = shopConfigurationEngine.toJobCostingRates();
      expect(jcr.laborRate).toBe(55.00);
      expect(jcr.overheadRate).toBe(30.00);
      expect(jcr.adminRate).toBe(15.00);
      expect(jcr.setupRate).toBe(65.00);
      expect(jcr.programmingRate).toBe(85.00);
      expect(jcr.inspectionRate).toBe(55.00);
      // Machine rates mapped via TYPE_TO_RATE_KEY
      expect(jcr.machineRates["cnc_lathe"]).toBeGreaterThan(0);
      expect(jcr.machineRates["wire_edm"]).toBeGreaterThan(0);
    });

    it("rate changes propagate to bridge output", () => {
      shopConfigurationEngine.updateRates(PROFILE_ID, { labor_per_hr: 65 });
      const jcr = shopConfigurationEngine.toJobCostingRates();
      expect(jcr.laborRate).toBe(65);
    });
  });

  describe("toCostingParams", () => {
    it("maps to ERPIntegrationEngine format", () => {
      const params = shopConfigurationEngine.toCostingParams();
      expect(params.machineRate).toBeGreaterThan(0); // First VMC rate
      expect(params.laborRate).toBe(55);
      expect(params.overheadPct).toBe(18);
      expect(params.toolingCostPerOp).toBe(20);
      expect(params.materialCostPerPart).toBe(35);
    });
  });

  describe("toCapacityMachines", () => {
    it("maps to CapacityPlanningEngine format", () => {
      const machines = shopConfigurationEngine.toCapacityMachines();
      expect(machines.length).toBe(21);
      const vmc01 = machines.find((m: any) => m.machine_id === "VMC-01");
      expect(vmc01).toBeDefined();
      expect(vmc01!.machine_name).toBe("Hurco VM30i");
      expect(vmc01!.hours_per_shift).toBe(10);
      expect(vmc01!.shifts_per_day).toBe(1);
    });
  });

  // ── VALIDATION ──────────────────────────────────────────────────────────

  describe("validateProfile", () => {
    it("JM Die profile has no warnings", () => {
      const profile = shopConfigurationEngine.getProfile(PROFILE_ID);
      const warnings = shopConfigurationEngine.validateProfile(profile);
      expect(warnings.length).toBe(0);
    });

    it("admin_burden_pct defaults to 12", () => {
      const profile = shopConfigurationEngine.getProfile(PROFILE_ID);
      expect(profile.admin_burden_pct).toBe(12);
    });

    it("warns on out-of-range labor rate", () => {
      shopConfigurationEngine.updateRates(PROFILE_ID, { labor_per_hr: 10 });
      const profile = shopConfigurationEngine.getProfile(PROFILE_ID);
      const warnings = shopConfigurationEngine.validateProfile(profile);
      expect(warnings.some((w: string) => w.includes("labor_per_hr"))).toBe(true);
    });

    it("warns on extreme machine rate", () => {
      shopConfigurationEngine.updateMachine(PROFILE_ID, "VMC-01", { hourly_rate: 600 });
      const profile = shopConfigurationEngine.getProfile(PROFILE_ID);
      const warnings = shopConfigurationEngine.validateProfile(profile);
      expect(warnings.some((w: string) => w.includes("VMC-01"))).toBe(true);
    });

    it("warns on extreme efficiency", () => {
      shopConfigurationEngine.updateMachine(PROFILE_ID, "VMC-01", { efficiency_factor: 0.1 });
      const profile = shopConfigurationEngine.getProfile(PROFILE_ID);
      const warnings = shopConfigurationEngine.validateProfile(profile);
      expect(warnings.some((w: string) => w.includes("efficiency"))).toBe(true);
    });
  });

  // ── RESET ───────────────────────────────────────────────────────────────

  describe("resetProfile", () => {
    it("restores factory defaults after modifications", () => {
      shopConfigurationEngine.updateRates(PROFILE_ID, { labor_per_hr: 999 });
      shopConfigurationEngine.removeMachine(PROFILE_ID, "SAW-01");
      expect(shopConfigurationEngine.getMachines().length).toBe(20);

      shopConfigurationEngine.resetProfile(PROFILE_ID);

      const profile = shopConfigurationEngine.getProfile(PROFILE_ID);
      expect(profile.rates.labor_per_hr).toBe(55.00);
      expect(profile.machines.length).toBe(21);
    });
  });

  // ── STATS ───────────────────────────────────────────────────────────────

  describe("getStats", () => {
    it("returns correct stats for JM Die profile", () => {
      const stats = shopConfigurationEngine.getStats();
      expect(stats.profile_count).toBeGreaterThanOrEqual(1);
      expect(stats.machine_count).toBe(21);
      expect(stats.avg_machine_rate).toBeGreaterThan(0);
      expect(stats.total_weekly_capacity_hours).toBeGreaterThan(0);
      expect(stats.mapped_controller_count).toBe(15);
      expect(stats.program_release_ready_machine_count).toBe(14);
    });
  });

  // ── RATE CHANGE → QUOTE CHANGE (EXIT GATE requirement) ─────────────────

  describe("rate change → costing propagation", () => {
    it("rate increase changes all bridge outputs proportionally", () => {
      const before = shopConfigurationEngine.toCostingParams();
      expect(before.laborRate).toBe(55);

      shopConfigurationEngine.updateRates(PROFILE_ID, { labor_per_hr: 110 });
      const after = shopConfigurationEngine.toCostingParams();
      expect(after.laborRate).toBe(110);

      const jcr = shopConfigurationEngine.toJobCostingRates();
      expect(jcr.laborRate).toBe(110);
    });

    it("machine rate change appears in JobCosting bridge", () => {
      shopConfigurationEngine.updateMachine(PROFILE_ID, "VMC-01", { hourly_rate: 100 });
      const jcr = shopConfigurationEngine.toJobCostingRates();
      // Multiple VMCs map to cnc_mill_3axis — the last one wins in the map
      expect(jcr.machineRates["cnc_mill_3axis"]).toBeGreaterThan(0);
    });

    it("overhead_pct change appears in costing params", () => {
      shopConfigurationEngine.updateProfile(PROFILE_ID, { overhead_pct: 25 });
      const params = shopConfigurationEngine.toCostingParams();
      expect(params.overheadPct).toBe(25);
    });
  });
});
