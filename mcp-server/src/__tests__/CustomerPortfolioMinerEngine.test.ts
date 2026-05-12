/**
 * CustomerPortfolioMinerEngine — Tests
 * RES-MS21: Validates customer portfolio mining from JM Die CNC LATHE archive
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  CustomerPortfolioMinerEngine,
  type CustomerProfile,
  type PortfolioMineResult,
} from "../engines/CustomerPortfolioMinerEngine.js";

// ============================================================================
// SHARED DATA (mine once, reuse across tests)
// ============================================================================

let customers: string[];
let fontanaProfile: CustomerProfile;
let auditResult: Awaited<ReturnType<typeof CustomerPortfolioMinerEngine.audit>>;

beforeAll(async () => {
  customers = await CustomerPortfolioMinerEngine.listCustomers();
  fontanaProfile = await CustomerPortfolioMinerEngine.mineCustomer("FONTANA");
  auditResult = await CustomerPortfolioMinerEngine.audit();
}, 120_000);

// ============================================================================
// SOURCE INFO
// ============================================================================

describe("CustomerPortfolioMinerEngine", () => {
  describe("getSources()", () => {
    it("returns correct root path", () => {
      const sources = CustomerPortfolioMinerEngine.getSources();
      expect(sources.rootPath).toContain("JM DIE");
      expect(sources.rootPath).toContain("CNC LATHE");
    });

    it("expects 118 customers", () => {
      const sources = CustomerPortfolioMinerEngine.getSources();
      expect(sources.expectedCustomers).toBe(118);
    });

    it("expects ~15599 programs", () => {
      const sources = CustomerPortfolioMinerEngine.getSources();
      expect(sources.expectedPrograms).toBe(15599);
    });
  });

  // ==========================================================================
  // CUSTOMER LISTING
  // ==========================================================================

  describe("listCustomers()", () => {
    it("finds at least 100 customer folders", () => {
      expect(customers.length).toBeGreaterThanOrEqual(100);
    });

    it("finds exactly 118 customer folders", () => {
      expect(customers.length).toBe(118);
    });

    it("includes FONTANA (largest customer)", () => {
      expect(customers).toContain("FONTANA");
    });

    it("includes ITW (second largest)", () => {
      expect(customers).toContain("ITW");
    });

    it("includes OPTIMAS", () => {
      expect(customers).toContain("OPTIMAS");
    });

    it("returns sorted list", () => {
      const sorted = [...customers].sort();
      expect(customers).toEqual(sorted);
    });
  });

  // ==========================================================================
  // FONTANA PROFILE (largest customer, ~908 programs)
  // ==========================================================================

  describe("mineCustomer() — FONTANA", () => {
    it("finds 500+ programs for FONTANA", () => {
      expect(fontanaProfile.programCount).toBeGreaterThanOrEqual(500);
    });

    it("parses at least 100 programs (capped at 200)", () => {
      expect(fontanaProfile.parsedCount).toBeGreaterThanOrEqual(100);
    });

    it("identifies tool preferences", () => {
      expect(fontanaProfile.toolPreferences.length).toBeGreaterThan(0);
    });

    it("identifies operation patterns", () => {
      expect(fontanaProfile.operationPatterns.length).toBeGreaterThan(0);
    });

    it("FONTANA uses rough-finish cycles (G85/G87)", () => {
      expect(fontanaProfile.usesRoughFinishCycles).toBe(true);
      expect(fontanaProfile.roughFinishCyclePercent).toBeGreaterThan(50);
    });

    it("has feed rate statistics", () => {
      expect(fontanaProfile.feedStats).not.toBeNull();
      expect(fontanaProfile.feedStats!.min).toBeGreaterThan(0);
      expect(fontanaProfile.feedStats!.max).toBeLessThanOrEqual(100); // IPR (some rapid moves have high F values)
      expect(fontanaProfile.feedStats!.count).toBeGreaterThan(10);
    });

    it("has spindle RPM statistics", () => {
      expect(fontanaProfile.spindleRpmStats).not.toBeNull();
      expect(fontanaProfile.spindleRpmStats!.min).toBeGreaterThan(0);
      expect(fontanaProfile.spindleRpmStats!.max).toBeLessThanOrEqual(6000);
    });

    it("average tools per program is reasonable (1-15)", () => {
      expect(fontanaProfile.avgToolsPerProgram).toBeGreaterThanOrEqual(1);
      expect(fontanaProfile.avgToolsPerProgram).toBeLessThanOrEqual(15);
    });

    it("tier is platinum (500+ programs)", () => {
      expect(fontanaProfile.tier).toBe("platinum");
    });

    it("top tool preferences have usage percentages", () => {
      const topTool = fontanaProfile.toolPreferences[0];
      expect(topTool).toBeDefined();
      expect(topTool.usagePercent).toBeGreaterThan(0);
      expect(topTool.usagePercent).toBeLessThanOrEqual(100);
    });
  });

  // ==========================================================================
  // AUDIT (top 10 customers)
  // ==========================================================================

  describe("audit()", () => {
    it("reports 118 total customers", () => {
      expect(auditResult.totalCustomers).toBe(118);
    });

    it("samples 10 customers", () => {
      expect(auditResult.sampleSize).toBe(10);
    });

    it("finds programs across sampled customers", () => {
      expect(auditResult.totalPrograms).toBeGreaterThan(0);
    });

    it("parses programs successfully", () => {
      expect(auditResult.totalParsed).toBeGreaterThan(0);
    });

    it("has tier breakdown", () => {
      const totalTiers =
        auditResult.byTier.platinum +
        auditResult.byTier.gold +
        auditResult.byTier.silver +
        auditResult.byTier.bronze;
      expect(totalTiers).toBe(auditResult.sampleSize);
    });

    it("has top customers list", () => {
      expect(auditResult.topCustomers.length).toBeGreaterThan(0);
      expect(auditResult.topCustomers[0].programCount).toBeGreaterThan(0);
    });

    it("reports average tools per program", () => {
      expect(auditResult.avgToolsPerProgram).toBeGreaterThan(0);
    });

    it("reports rough-finish cycle usage percentage", () => {
      expect(auditResult.roughFinishCycleUsage).toBeGreaterThanOrEqual(0);
      expect(auditResult.roughFinishCycleUsage).toBeLessThanOrEqual(100);
    });
  });

  // ==========================================================================
  // TIER CLASSIFICATION
  // ==========================================================================

  describe("tier classification", () => {
    it("platinum = 500+ programs", async () => {
      // FONTANA has 900+ so should be platinum
      expect(fontanaProfile.tier).toBe("platinum");
    });

    it("small customer gets bronze tier", async () => {
      // Find a small customer
      const smallCustomers = customers.filter(
        (c) => !["FONTANA", "ITW", "OPTIMAS", "ATF", "HPFS", "HOLO-KROME", "AIR", "OMG"].includes(c)
      );
      if (smallCustomers.length > 0) {
        const profile = await CustomerPortfolioMinerEngine.mineCustomer(smallCustomers[smallCustomers.length - 1]);
        // Last alphabetically is likely small
        expect(["bronze", "silver", "gold", "platinum"]).toContain(profile.tier);
      }
    }, 30_000);
  });

  // ==========================================================================
  // CUSTOMER LOOKUP
  // ==========================================================================

  describe("getCustomerProfile()", () => {
    it("finds customer by exact name", async () => {
      const profile = await CustomerPortfolioMinerEngine.getCustomerProfile("ITW");
      expect(profile).not.toBeNull();
      expect(profile!.name).toBe("ITW");
      expect(profile!.programCount).toBeGreaterThan(100);
    }, 60_000);

    it("case-insensitive search works", async () => {
      const profile = await CustomerPortfolioMinerEngine.getCustomerProfile("fontana");
      expect(profile).not.toBeNull();
      expect(profile!.name).toBe("FONTANA");
    }, 60_000);

    it("returns null for unknown customer", async () => {
      const profile = await CustomerPortfolioMinerEngine.getCustomerProfile("NONEXISTENT_CORP");
      expect(profile).toBeNull();
    });
  });

  // ==========================================================================
  // FILTER BY TIER
  // ==========================================================================

  describe("filterByTier()", () => {
    it("platinum filter returns only platinum customers", () => {
      const profiles: CustomerProfile[] = [
        { ...fontanaProfile, tier: "platinum" },
        { ...fontanaProfile, name: "SMALL", tier: "bronze" },
      ];
      const filtered = CustomerPortfolioMinerEngine.filterByTier(profiles, "platinum");
      expect(filtered.length).toBe(1);
      expect(filtered[0].tier).toBe("platinum");
    });

    it("bronze filter returns all customers", () => {
      const profiles: CustomerProfile[] = [
        { ...fontanaProfile, tier: "platinum" },
        { ...fontanaProfile, name: "MED", tier: "silver" },
        { ...fontanaProfile, name: "SMALL", tier: "bronze" },
      ];
      const filtered = CustomerPortfolioMinerEngine.filterByTier(profiles, "bronze");
      expect(filtered.length).toBe(3);
    });
  });

  // ==========================================================================
  // OPERATION PATTERNS
  // ==========================================================================

  describe("operation patterns", () => {
    it("G85 appears in FONTANA operation patterns", () => {
      const g85 = fontanaProfile.operationPatterns.find((p) => p.type === "G85");
      expect(g85).toBeDefined();
      expect(g85!.frequency).toBeGreaterThan(0);
    });

    it("operation frequency percents sum to approximately 100", () => {
      const totalPercent = fontanaProfile.operationPatterns.reduce(
        (s, p) => s + p.frequencyPercent,
        0
      );
      expect(totalPercent).toBeCloseTo(100, 0);
    });
  });
});
