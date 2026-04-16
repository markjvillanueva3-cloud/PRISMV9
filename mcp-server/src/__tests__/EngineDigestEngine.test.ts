/**
 * EngineDigestEngine Test Suite
 * ==============================
 *
 * AGENT-MS1 U-AGT02 — Validates the engine capability map against its
 * exit criteria:
 *   - Engines indexed with descriptions
 *   - Search 'cutting force' returns cutting-force engines
 *   - Search 'quote' returns quoting engines
 *   - Category groupings match expected patterns
 *
 * @milestone AGENT-MS1
 * @unit U-AGT02
 */

import { describe, it, expect } from "vitest";
import {
  EngineDigestEngine,
  engineDigestEngine,
} from "../engines/EngineDigestEngine.js";
import * as path from "path";

// Point at real project engines dir so we exercise the live inventory
const ENGINE_DIR = path.resolve(process.cwd(), "src", "engines");
const localEngine = new EngineDigestEngine(ENGINE_DIR);

// Note: buildInventory scans all engines — these tests may take longer
// than a typical unit suite. That is intentional: this is a real integration
// check that the scanner handles the actual codebase.

describe("EngineDigestEngine", () => {
  // ── buildInventory() ──────────────────────────────────────────────────

  describe("buildInventory()", () => {
    it("returns an inventory with positive engine count", async () => {
      const inv = await localEngine.buildInventory();
      expect(inv.engineCount).toBeGreaterThan(100);
    });

    it("reports positive totalLoc", async () => {
      const inv = await localEngine.buildInventory();
      expect(inv.totalLoc).toBeGreaterThan(10000);
    });

    it("builds a non-empty category map", async () => {
      const inv = await localEngine.buildInventory();
      expect(inv.byCategory.size).toBeGreaterThan(0);
    });

    it("builds a non-empty subcategory map", async () => {
      const inv = await localEngine.buildInventory();
      expect(inv.bySubcategory.size).toBeGreaterThan(0);
    });

    it("builds forward and reverse dependency graphs", async () => {
      const inv = await localEngine.buildInventory();
      expect(inv.dependencyGraph).toBeDefined();
      expect(inv.reverseDependencies).toBeDefined();
    });

    it("caches between calls without forceRefresh", async () => {
      const a = await localEngine.buildInventory();
      const b = await localEngine.buildInventory();
      expect(a).toBe(b);
    });

    it("forceRefresh rebuilds the inventory", async () => {
      const a = await localEngine.buildInventory();
      const b = await localEngine.buildInventory(true);
      expect(b.builtAt.getTime()).toBeGreaterThanOrEqual(a.builtAt.getTime());
    });
  });

  // ── Engine coverage ───────────────────────────────────────────────────

  describe("engine coverage (MS8-MS12 artifacts)", () => {
    it("indexes LatheMasterOrchestratorFacadeEngine", async () => {
      const hit = await localEngine.findByName("LatheMasterOrchestratorFacadeEngineImpl");
      // Not all classes use the Impl suffix — try the raw name too
      const fallback = await localEngine.findByName("LatheMasterOrchestratorFacadeEngine");
      expect(hit || fallback).not.toBeNull();
    });

    it("indexes LatheProgrammingStyleSelectorEngine (E107)", async () => {
      const results = await localEngine.search("ProgrammingStyleSelector");
      expect(results.length).toBeGreaterThan(0);
    });

    it("indexes LatheProgramCatalogEngine (E108)", async () => {
      const results = await localEngine.search("ProgramCatalog");
      expect(results.length).toBeGreaterThan(0);
    });

    it("indexes LatheProgrammingCostEngine (E109)", async () => {
      const results = await localEngine.search("ProgrammingCost");
      expect(results.length).toBeGreaterThan(0);
    });

    it("indexes LathePartFamilyPlanningEngine (E110)", async () => {
      const results = await localEngine.search("FamilyPlanning");
      expect(results.length).toBeGreaterThan(0);
    });
  });

  // ── Digest structure ─────────────────────────────────────────────────

  describe("EngineDigest shape", () => {
    it("each digest has the required fields", async () => {
      const inv = await localEngine.buildInventory();
      const sample = inv.all[0]!;
      expect(sample.filename).toBeDefined();
      expect(sample.className).toBeDefined();
      expect(typeof sample.loc).toBe("number");
      expect(Array.isArray(sample.methodNames)).toBe(true);
      expect(Array.isArray(sample.dependencies)).toBe(true);
      expect(sample.category).toBeDefined();
      expect(sample.subcategory).toBeDefined();
      expect(sample.description).toBeDefined();
      expect(typeof sample.hasSingleton).toBe("boolean");
      expect(sample.modifiedAt).toBeInstanceOf(Date);
    });
  });

  // ── Search ────────────────────────────────────────────────────────────

  describe("search()", () => {
    it("search 'cutting force' returns cutting-force related engines", async () => {
      const results = await localEngine.search("cutting force");
      expect(results.length).toBeGreaterThan(0);
      // Top results should reference force/kienzle/cutting
      const topClassName = results[0]!.engine.className.toLowerCase();
      expect(
        topClassName.includes("force") ||
          topClassName.includes("kienzle") ||
          topClassName.includes("cutting")
      ).toBe(true);
    });

    it("search 'quote' returns quoting engines", async () => {
      const results = await localEngine.search("quote");
      expect(results.length).toBeGreaterThan(0);
      const names = results.map((r) => r.engine.className);
      const hasQuote = names.some((n) => /quot/i.test(n));
      expect(hasQuote).toBe(true);
    });

    it("search 'lathe' returns many lathe engines", async () => {
      const results = await localEngine.search("lathe", 50);
      expect(results.length).toBeGreaterThan(5);
    });

    it("results are sorted by score descending", async () => {
      const results = await localEngine.search("lathe");
      for (let i = 1; i < results.length; i++) {
        expect(results[i]!.score).toBeLessThanOrEqual(results[i - 1]!.score);
      }
    });

    it("respects limit parameter", async () => {
      const results = await localEngine.search("engine", 5);
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it("results include matchedOn diagnostics", async () => {
      const results = await localEngine.search("cutting force", 3);
      results.forEach((r) => {
        expect(Array.isArray(r.matchedOn)).toBe(true);
        expect(r.matchedOn.length).toBeGreaterThan(0);
      });
    });
  });

  // ── Category filtering ────────────────────────────────────────────────

  describe("getByCategory() / getBySubcategory()", () => {
    it("getByCategory returns engines in that category", async () => {
      const inv = await localEngine.buildInventory();
      const [firstCat] = [...inv.byCategory.keys()];
      const engines = await localEngine.getByCategory(firstCat!);
      expect(engines.length).toBeGreaterThan(0);
      engines.forEach((e) => expect(e.category).toBe(firstCat));
    });

    it("getByCategory with unknown category returns empty", async () => {
      const engines = await localEngine.getByCategory("xxx_not_a_category");
      expect(engines).toEqual([]);
    });

    it("getBySubcategory returns engines under a subcategory", async () => {
      const inv = await localEngine.buildInventory();
      const [firstSub] = [...inv.bySubcategory.keys()];
      const engines = await localEngine.getBySubcategory(firstSub!);
      expect(engines.length).toBeGreaterThan(0);
    });
  });

  // ── Stats ─────────────────────────────────────────────────────────────

  describe("getStats()", () => {
    it("returns comprehensive statistics", async () => {
      const stats = await localEngine.getStats();
      expect(stats.engineCount).toBeGreaterThan(0);
      expect(stats.totalLoc).toBeGreaterThan(0);
      expect(stats.avgLoc).toBeGreaterThan(0);
      expect(stats.categories.length).toBeGreaterThan(0);
    });

    it("topByLoc returns up to 10 largest engines", async () => {
      const stats = await localEngine.getStats();
      expect(stats.topByLoc.length).toBeGreaterThan(0);
      expect(stats.topByLoc.length).toBeLessThanOrEqual(10);
      // Sorted descending
      for (let i = 1; i < stats.topByLoc.length; i++) {
        expect(stats.topByLoc[i]!.loc).toBeLessThanOrEqual(stats.topByLoc[i - 1]!.loc);
      }
    });

    it("topByMethods returns up to 10 method-richest engines sorted desc", async () => {
      const stats = await localEngine.getStats();
      for (let i = 1; i < stats.topByMethods.length; i++) {
        expect(stats.topByMethods[i]!.methods).toBeLessThanOrEqual(
          stats.topByMethods[i - 1]!.methods
        );
      }
    });
  });

  // ── findByName() ──────────────────────────────────────────────────────

  describe("findByName()", () => {
    it("findByName is case-insensitive", async () => {
      const inv = await localEngine.buildInventory();
      const sample = inv.all[0]!;
      const found = await localEngine.findByName(sample.className.toLowerCase());
      expect(found).not.toBeNull();
    });

    it("findByName with unknown name returns null", async () => {
      const found = await localEngine.findByName("ThisEngineDoesNotExistFooBar");
      expect(found).toBeNull();
    });
  });

  // ── Dependency graph ─────────────────────────────────────────────────

  describe("dependency graph", () => {
    it("getDependencies returns dependency list (may be empty)", async () => {
      const inv = await localEngine.buildInventory();
      const sample = inv.all[0]!;
      const deps = await localEngine.getDependencies(sample.className);
      expect(Array.isArray(deps)).toBe(true);
    });

    it("getDependents returns reverse dependency list (may be empty)", async () => {
      const inv = await localEngine.buildInventory();
      const sample = inv.all[0]!;
      const deps = await localEngine.getDependents(sample.className);
      expect(Array.isArray(deps)).toBe(true);
    });
  });

  // ── Singleton ─────────────────────────────────────────────────────────

  describe("singleton export", () => {
    it("exports engineDigestEngine", () => {
      expect(engineDigestEngine).toBeDefined();
      expect(engineDigestEngine).toBeInstanceOf(EngineDigestEngine);
    });
  });
});
