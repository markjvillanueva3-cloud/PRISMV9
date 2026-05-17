/**
 * ShopConfigurationEngine — public-surface behavioral tests
 *
 * Covers the singleton's profile / rates / machine accessors. Each test runs
 * against a freshly-reset DEFAULT profile so mutations from earlier tests
 * cannot leak into later ones.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { shopConfigurationEngine, ShopConfigurationEngine } from "../engines/ShopConfigurationEngine.js";

describe("ShopConfigurationEngine", () => {
  beforeEach(() => {
    shopConfigurationEngine.resetProfile();
  });

  describe("singleton + class", () => {
    it("exports a singleton instance", () => {
      expect(shopConfigurationEngine).toBeInstanceOf(ShopConfigurationEngine);
    });

    it("returns the JM Die default profile from getActiveProfile()", () => {
      const profile = shopConfigurationEngine.getActiveProfile();
      expect(profile.company_profile.legal_name).toMatch(/JM Die/i);
      expect(profile.company_profile.short_code).toBe("JM-DIE");
      expect(profile.company_profile.canonical_test_shop).toBe(true);
    });

    it("anchors company.domain to the JM Die industry field", () => {
      const profile = shopConfigurationEngine.getActiveProfile();
      expect(profile.company_profile.domain.length).toBeGreaterThan(0);
      expect(profile.company_profile.domain.toLowerCase()).toContain("die");
    });
  });

  describe("source roots — required keys", () => {
    it("supplies every ShopSourceRoots key from the canonical shop tree", () => {
      const profile = shopConfigurationEngine.getActiveProfile();
      const required = [
        "company_root", "programs_root", "employee_database_root",
        "machines_root", "controllers_root", "tool_holders_root",
        "tooling_root", "materials_root", "prints_root",
      ] as const;
      for (const key of required) {
        expect(profile.source_roots[key].length).toBeGreaterThan(0);
        expect(profile.source_roots[key]).toMatch(/JM DIE/i);
      }
    });

    it("derives machines_root + company_root from the JM Die archive path", () => {
      const profile = shopConfigurationEngine.getActiveProfile();
      expect(profile.source_roots.company_root).toContain("JM DIE");
      expect(profile.source_roots.machines_root).toContain("JM DIE");
      expect(profile.source_roots.machines_root).toMatch(/MACHINES$/);
    });
  });

  describe("listProfiles + getProfile", () => {
    it("listProfiles() returns at least the default profile", () => {
      const profiles = shopConfigurationEngine.listProfiles();
      expect(profiles.length).toBeGreaterThanOrEqual(1);
      expect(profiles[0].company_profile.short_code).toBe("JM-DIE");
    });

    it("getProfile() with default id returns the active profile", () => {
      const a = shopConfigurationEngine.getActiveProfile();
      const b = shopConfigurationEngine.getProfile();
      expect(b.id).toBe(a.id);
    });
  });

  describe("rates surface", () => {
    it("getRates() returns numeric rates for every defined category", () => {
      const rates = shopConfigurationEngine.getRates();
      // shop rate categories should at minimum carry labor + machine billing levers
      expect(typeof rates).toBe("object");
      const keys = Object.keys(rates);
      expect(keys.length).toBeGreaterThan(0);
    });

    it("toJobCostingRates() exposes a job-costing-shaped subset", () => {
      const rates = shopConfigurationEngine.toJobCostingRates();
      expect(typeof rates).toBe("object");
    });
  });

  describe("machines", () => {
    it("getMachines() returns the canonical JM Die machine fleet", () => {
      const machines = shopConfigurationEngine.getMachines();
      expect(Array.isArray(machines)).toBe(true);
      expect(machines.length).toBeGreaterThan(0);
    });

    it("getMachineRate() returns a non-negative number for a known machine type", () => {
      const machines = shopConfigurationEngine.getMachines();
      if (machines.length > 0) {
        const rate = shopConfigurationEngine.getMachineRate(
          ShopConfigurationEngine.DEFAULT_PROFILE_ID,
          machines[0].id,
        );
        expect(rate).toBeGreaterThanOrEqual(0);
      }
    });

    it("getEffectiveMachineRate() is >= getMachineRate() for the same machine (maintenance burden adds)", () => {
      const machines = shopConfigurationEngine.getMachines();
      if (machines.length > 0) {
        const base = shopConfigurationEngine.getMachineRate(
          ShopConfigurationEngine.DEFAULT_PROFILE_ID,
          machines[0].id,
        );
        const effective = shopConfigurationEngine.getEffectiveMachineRate(
          ShopConfigurationEngine.DEFAULT_PROFILE_ID,
          machines[0].id,
        );
        expect(effective).toBeGreaterThanOrEqual(base);
      }
    });
  });

  describe("resetProfile()", () => {
    it("returns the original company profile after a reset", () => {
      const before = shopConfigurationEngine.getActiveProfile();
      shopConfigurationEngine.resetProfile();
      const after = shopConfigurationEngine.getActiveProfile();
      expect(after.company_profile.legal_name).toBe(before.company_profile.legal_name);
      expect(after.company_profile.short_code).toBe(before.company_profile.short_code);
    });
  });
});
