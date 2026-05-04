/**
 * HyperMillCycleCatalogEngine tests — CAM-EXHAUST-MS0 / U-CAM-HM-CYCCAT-TESTS-01
 *
 * Coverage:
 *   1. listAll: 100+ cycles loaded
 *   2. byCategory: each of 9 categories returns expected non-empty subset
 *   3. search: matches by displayName, code, OR alias
 *   4. lookupByCode: exact code lookup + null on miss
 *   5. stats: per-category counts + total
 *   6. Spot checks for canonical cycles (DR:Drilling, 5X:Blade Roughing, etc.)
 *   7. Adversarial: empty query, unknown code, case-sensitivity check on code
 *
 * Strict legitimacy: concrete assertions, named constants.
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillCycleCatalogEngine,
  hyperMillCycleCatalogEngine,
  type CycleCategory,
} from "../engines/HyperMillCycleCatalogEngine.js";

const ALL_CATEGORIES: CycleCategory[] = [
  "drilling", "2d", "tapping", "3d", "5axis",
  "millturn", "apt", "probing", "grinding",
];
const MIN_TOTAL_CYCLES = 100;

describe("HyperMillCycleCatalogEngine — class shape", () => {
  it("exports class + singleton", () => {
    expect(typeof HyperMillCycleCatalogEngine).toBe("function");
    expect(hyperMillCycleCatalogEngine instanceof HyperMillCycleCatalogEngine).toBe(true);
  });
});

describe("HyperMillCycleCatalogEngine — listAll()", () => {
  it("returns 100+ cycles", () => {
    const list = hyperMillCycleCatalogEngine.listAll();
    expect(list.length).toBeGreaterThanOrEqual(MIN_TOTAL_CYCLES);
  });

  it("every cycle has displayName, code, category, aliases array", () => {
    const list = hyperMillCycleCatalogEngine.listAll();
    list.forEach((c) => {
      expect(typeof c.displayName).toBe("string");
      expect(typeof c.code).toBe("string");
      expect(typeof c.category).toBe("string");
      expect(Array.isArray(c.aliases)).toBe(true);
    });
  });
});

describe("HyperMillCycleCatalogEngine — byCategory() coverage", () => {
  it("each of 9 categories returns at least 1 cycle", () => {
    ALL_CATEGORIES.forEach((cat) => {
      const r = hyperMillCycleCatalogEngine.byCategory(cat);
      expect(r.length).toBeGreaterThan(0);
      r.forEach((c) => expect(c.category).toBe(cat));
    });
  });

  it("5axis category is the largest (40+ cycles)", () => {
    const r = hyperMillCycleCatalogEngine.byCategory("5axis");
    expect(r.length).toBeGreaterThanOrEqual(40);
  });

  it("drilling category returns 3 base drilling cycles", () => {
    const r = hyperMillCycleCatalogEngine.byCategory("drilling");
    expect(r.length).toBe(3);
    const names = r.map((c) => c.displayName);
    expect(names).toContain("Drilling");
    expect(names).toContain("Drill with Pecking");
  });

  it("tapping category returns 2 cycles (Thread Milling + Tapping)", () => {
    const r = hyperMillCycleCatalogEngine.byCategory("tapping");
    expect(r.length).toBe(2);
  });

  it("millturn category returns 18 turning cycles", () => {
    const r = hyperMillCycleCatalogEngine.byCategory("millturn");
    expect(r.length).toBe(18);
  });
});

describe("HyperMillCycleCatalogEngine — search()", () => {
  it("matches by displayName substring (case-insensitive)", () => {
    const r = hyperMillCycleCatalogEngine.search("ROUGHING");
    expect(r.length).toBeGreaterThan(0);
    r.forEach((c) => {
      const m =
        c.displayName.toLowerCase().includes("roughing") ||
        c.code.toLowerCase().includes("roughing") ||
        c.aliases.some((a) => a.toLowerCase().includes("roughing"));
      expect(m).toBe(true);
    });
  });

  it("matches by code substring", () => {
    const r = hyperMillCycleCatalogEngine.search("DR:");
    expect(r.length).toBeGreaterThan(0);
    r.forEach((c) => expect(c.code).toMatch(/^DR:|DR:/));
  });

  it("matches by alias", () => {
    // Pocket Milling has alias "Contour Parallel Pocket"
    const r = hyperMillCycleCatalogEngine.search("Contour Parallel Pocket");
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((c) => c.code === "2D:Pocket Milling")).toBe(true);
  });

  it("returns empty for nonsense query", () => {
    expect(hyperMillCycleCatalogEngine.search("xyzzy_unobtainium")).toEqual([]);
  });
});

describe("HyperMillCycleCatalogEngine — lookupByCode() spot checks", () => {
  it("finds DR:Drilling", () => {
    const c = hyperMillCycleCatalogEngine.lookupByCode("DR:Drilling");
    expect(c!.displayName).toBe("Drilling");
    expect(c!.category).toBe("drilling");
  });

  it("finds 5X:5 AXIS Blade Roughing", () => {
    const c = hyperMillCycleCatalogEngine.lookupByCode("5X:5 AXIS Blade Roughing");
    expect(c!.displayName).toBe("5X Blade Roughing");
    expect(c!.category).toBe("5axis");
  });

  it("finds MT:Thread Turning", () => {
    const c = hyperMillCycleCatalogEngine.lookupByCode("MT:Thread Turning");
    expect(c!.category).toBe("millturn");
    expect(c!.aliases).toContain("openMIND Thread Turning");
  });

  it("returns null on unknown code", () => {
    expect(hyperMillCycleCatalogEngine.lookupByCode("XX:Nonexistent")).toBe(null);
  });

  it("is case-sensitive on code (does NOT lowercase)", () => {
    expect(hyperMillCycleCatalogEngine.lookupByCode("dr:drilling")).toBe(null);
  });
});

describe("HyperMillCycleCatalogEngine — stats()", () => {
  it("returns total + per-category counts", () => {
    const s = hyperMillCycleCatalogEngine.stats();
    expect(s.total).toBeGreaterThanOrEqual(MIN_TOTAL_CYCLES);
    ALL_CATEGORIES.forEach((cat) => {
      expect(typeof s[cat]).toBe("number");
      expect(s[cat]).toBeGreaterThan(0);
    });
  });

  it("sum of per-category counts == total", () => {
    const s = hyperMillCycleCatalogEngine.stats();
    const sum = ALL_CATEGORIES.reduce((acc, cat) => acc + s[cat], 0);
    expect(sum).toBe(s.total);
  });

  it("5axis count is largest", () => {
    const s = hyperMillCycleCatalogEngine.stats();
    ALL_CATEGORIES.filter((c) => c !== "5axis").forEach((cat) => {
      expect(s["5axis"]).toBeGreaterThanOrEqual(s[cat]);
    });
  });
});

describe("HyperMillCycleCatalogEngine — adversarial inputs", () => {
  it("search('') returns all (empty substring matches everything)", () => {
    const r = hyperMillCycleCatalogEngine.search("");
    expect(r.length).toBe(hyperMillCycleCatalogEngine.listAll().length);
  });

  it("lookupByCode('') returns null", () => {
    expect(hyperMillCycleCatalogEngine.lookupByCode("")).toBe(null);
  });
});
