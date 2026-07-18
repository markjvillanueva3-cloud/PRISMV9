/**
 * MonolithManufacturerCatalogManifestEngine round-trip tests.
 * JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-MFR-CATALOG-MANIFEST.
 *
 * Pins the manifest counts from PRISM_MANUFACTURER_CATALOG_DB v1.0.0
 * (744 inserts + 197 grades + 3424 cutting_data + 3403 tool_bodies across
 * 13 manufacturer slots).
 */

import { describe, it, expect } from "vitest";
import {
  MonolithManufacturerCatalogManifestEngine,
  monolithManufacturerCatalogManifestEngine,
} from "../engines/MonolithManufacturerCatalogManifestEngine.js";

const engine = monolithManufacturerCatalogManifestEngine;

describe("MonolithManufacturerCatalogManifestEngine — metadata", () => {
  it("version is '1.0.0'", () => {
    expect(engine.version).toBe("1.0.0");
  });

  it("generated timestamp preserved verbatim", () => {
    expect(engine.generated).toBe("2026-01-18T00:49:14.294461");
  });

  it("totalPages reports 7904 (source PDF page count)", () => {
    expect(engine.totalPages).toBe(7904);
  });
});

describe("MonolithManufacturerCatalogManifestEngine — manufacturer lists", () => {
  it("listManufacturers returns 11 names from source's top-level array", () => {
    const m = engine.listManufacturers();
    expect(m).toHaveLength(11);
    expect(m).toEqual([
      "CARMEX", "GENERIC", "GLOBAL_CNC", "IMCO", "LYNDEX_NIKKEN",
      "OSG", "PARLEC", "SANDVIK", "SECO", "SGS", "TUNGALOY",
    ]);
  });

  it("listAllManufacturerStatsKeys returns all 13 stats-table keys (includes INGERSOLL + MA_FORD)", () => {
    const keys = engine.listAllManufacturerStatsKeys();
    expect(keys).toHaveLength(13);
    expect(keys).toContain("INGERSOLL");
    expect(keys).toContain("MA_FORD");
  });

  it("listManufacturersWithInventory filters out zero-count entries", () => {
    const m = engine.listManufacturersWithInventory();
    // Excluded: INGERSOLL (0/0/0) + MA_FORD (0/0/0) = 11 with inventory
    expect(m).toHaveLength(11);
    expect(m).not.toContain("INGERSOLL");
    expect(m).not.toContain("MA_FORD");
  });
});

describe("MonolithManufacturerCatalogManifestEngine — stats counts", () => {
  it("headline totals: 744 inserts + 197 grades + 3424 cutting_data + 3403 tool_bodies", () => {
    const s = engine.getStats();
    expect(s.inserts).toBe(744);
    expect(s.grades).toBe(197);
    expect(s.cuttingData).toBe(3424);
    expect(s.toolBodies).toBe(3403);
  });

  it("SECO carries the most inserts (483) per monolith source", () => {
    const c = engine.getCountsFor("SECO");
    expect(c).toEqual({ inserts: 483, grades: 55, cutting_data: 111 });
  });

  it("SANDVIK carries 251 inserts + 15 grades + 0 cutting_data", () => {
    expect(engine.getCountsFor("SANDVIK")).toEqual({
      inserts: 251, grades: 15, cutting_data: 0,
    });
  });

  it("LYNDEX_NIKKEN carries the most cutting_data (1221) per monolith source", () => {
    expect(engine.getCountsFor("LYNDEX_NIKKEN")).toEqual({
      inserts: 0, grades: 45, cutting_data: 1221,
    });
  });

  it("OSG: 10 inserts + 36 grades + 976 cutting_data", () => {
    expect(engine.getCountsFor("OSG")).toEqual({
      inserts: 10, grades: 36, cutting_data: 976,
    });
  });

  it("TUNGALOY: 585 cutting_data, no inserts/grades", () => {
    expect(engine.getCountsFor("TUNGALOY")).toEqual({
      inserts: 0, grades: 0, cutting_data: 585,
    });
  });

  it("INGERSOLL/MA_FORD: all-zero counts (per monolith stats table)", () => {
    expect(engine.getCountsFor("INGERSOLL")).toEqual({ inserts: 0, grades: 0, cutting_data: 0 });
    expect(engine.getCountsFor("MA_FORD")).toEqual({ inserts: 0, grades: 0, cutting_data: 0 });
  });

  it("sum of per-manufacturer cutting_data matches headline (3424)", () => {
    const stats = engine.getStats();
    const sum = Object.values(stats.byManufacturer)
      .reduce((a, c) => a + c.cutting_data, 0);
    expect(sum).toBe(3424);
  });
});

describe("MonolithManufacturerCatalogManifestEngine — fail-soft (R12)", () => {
  it("getCountsFor unknown name returns null", () => {
    expect(engine.getCountsFor("UNKNOWN_MFR")).toBe(null);
  });

  it("getCountsFor empty/whitespace returns null", () => {
    expect(engine.getCountsFor("")).toBe(null);
    expect(engine.getCountsFor("   ")).toBe(null);
  });
});

describe("MonolithManufacturerCatalogManifestEngine — rank by inventory weight", () => {
  it("LYNDEX_NIKKEN leads ranking (0+45+1221 = 1266 — top cutting_data drives weight)", () => {
    const ranked = engine.rankByInventoryWeight();
    expect(ranked[0].manufacturer).toBe("LYNDEX_NIKKEN");
    expect(ranked[0].weight).toBe(1266);
  });

  it("ranking order: LYNDEX_NIKKEN (1266) > OSG (1022) > SECO (649)", () => {
    const ranked = engine.rankByInventoryWeight();
    expect(ranked[0]).toEqual({ manufacturer: "LYNDEX_NIKKEN", weight: 1266 });
    expect(ranked[1]).toEqual({ manufacturer: "OSG", weight: 1022 });
    expect(ranked[2]).toEqual({ manufacturer: "SECO", weight: 649 });
  });

  it("ranked output covers all 13 stats keys (zero-count entries included at end)", () => {
    const ranked = engine.rankByInventoryWeight();
    expect(ranked).toHaveLength(13);
    const last = ranked[ranked.length - 1];
    expect(last.weight).toBe(0);
  });

  it("ranking is descending (each ≥ next)", () => {
    const ranked = engine.rankByInventoryWeight();
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i].weight).toBeGreaterThanOrEqual(ranked[i + 1].weight);
    }
  });
});

describe("MonolithManufacturerCatalogManifestEngine — immutability", () => {
  it("getStats returns a deep clone (mutating byManufacturer doesn't affect source)", () => {
    const s = engine.getStats();
    s.byManufacturer.SECO.inserts = 999;
    const s2 = engine.getStats();
    expect(s2.byManufacturer.SECO.inserts).toBe(483);
  });

  it("listManufacturers immutability: mutating returned array doesn't affect store", () => {
    const a = engine.listManufacturers();
    a.pop();
    expect(engine.listManufacturers()).toHaveLength(11);
  });

  it("fresh instance returns identical data", () => {
    const fresh = new MonolithManufacturerCatalogManifestEngine();
    expect(fresh.getStats()).toEqual(engine.getStats());
    expect(fresh.listManufacturers()).toEqual(engine.listManufacturers());
  });
});
