/**
 * Tests for the SFC indexable-insert catalog accessor.
 * R9: reference-value assertions, happy path + >=3 failure modes + >=2 adversarial
 * inputs + curated fail-soft branch + a live round-trip against the real reference DB.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  insertOptionId,
  buildInsertOptionsFromStores,
  buildInsertCatalog,
  getCalculatorInsertCatalog,
  resetInsertCatalogCacheForTest,
} from "../utils/calculatorInsertCatalog.js";

describe("insertOptionId", () => {
  it("slugifies insert designations to stable ids", () => {
    expect(insertOptionId("R245-12", "x")).toBe("r245-12");
    expect(insertOptionId("r245_12_m10", "x")).toBe("r245-12-m10");
    expect(insertOptionId("880-0503", "x")).toBe("880-0503");
  });
  it("falls back when the value slugs to empty", () => {
    expect(insertOptionId("", "fb")).toBe("fb");
    expect(insertOptionId("___", "fb")).toBe("fb");
  });
});

describe("buildInsertOptionsFromStores -- happy path (reference values)", () => {
  const stores = {
    INSERT_DATABASE: {
      "R245-12": [
        { id: "r245_12_m10", name: "R245-12 T3 M-M GC4240", manufacturer: "Sandvik Coromant", grade: "GC4240", coating: "CVD", material: "Steel (P)", chipbreaker: "M-M", edges: 4 },
      ],
      SDMT1204: [
        { id: "sdmt1204_kc730", name: "SDMT 1204AETN KC730", manufacturer: "Kennametal", grade: "KC730", coating: "PVD", material: "Steel (P)", edges: 4 },
      ],
    },
  };

  it("flattens family arrays into options carrying the source fields", () => {
    const opts = buildInsertOptionsFromStores(stores);
    expect(opts).toHaveLength(2);
    const sandvik = opts.find((o) => o.id === "r245-12-m10")!;
    // R9: values must come FROM the input.
    expect(sandvik.label).toBe("R245-12 T3 M-M GC4240");
    expect(sandvik.manufacturer).toBe("Sandvik Coromant");
    expect(sandvik.grade).toBe("GC4240");
    expect(sandvik.coating).toBe("CVD");
    expect(sandvik.material).toBe("Steel (P)");
    expect(sandvik.family).toBe("R245-12");
    expect(sandvik.detail).toContain("Sandvik Coromant");
    expect(sandvik.detail).toContain("GC4240");
    expect(sandvik.detail).toContain("CVD");
    expect(sandvik.detail).toContain("Steel (P)");
    expect(sandvik.detail).toContain("4 edges");
  });
});

describe("buildInsertOptionsFromStores -- failure modes", () => {
  it("returns [] for null / empty / missing INSERT_DATABASE", () => {
    expect(buildInsertOptionsFromStores(null)).toEqual([]);
    expect(buildInsertOptionsFromStores({})).toEqual([]);
    expect(buildInsertOptionsFromStores({ INSERT_DATABASE: {} })).toEqual([]);
  });

  it("skips non-array family values and malformed entries", () => {
    const opts = buildInsertOptionsFromStores({
      INSERT_DATABASE: {
        BadFamily: { not: "an-array" },
        Good: [
          null,
          "string-not-object",
          { id: "g1", name: "Good 1", manufacturer: "ISCAR", grade: "IC830", coating: "PVD", material: "Steel (P)", edges: 2 },
        ],
      },
    });
    expect(opts).toHaveLength(1);
    expect(opts[0].id).toBe("g1");
    expect(opts[0].manufacturer).toBe("ISCAR");
  });

  it("skips an entry with neither id nor name", () => {
    const opts = buildInsertOptionsFromStores({
      INSERT_DATABASE: { F: [{ manufacturer: "X", grade: "Y" }] },
    });
    expect(opts).toEqual([]);
  });

  it("coerces non-numeric edges to 0 (no edges segment in detail)", () => {
    const opts = buildInsertOptionsFromStores({
      INSERT_DATABASE: { F: [{ id: "e1", name: "E1", manufacturer: "M", grade: "G", coating: "PVD", material: "Steel (P)", edges: "lots" }] },
    });
    expect(opts).toHaveLength(1);
    expect(opts[0].detail).not.toContain("edges");
  });

  it("dedupes entries whose id slugs to the same value (first-wins)", () => {
    const opts = buildInsertOptionsFromStores({
      INSERT_DATABASE: {
        A: [{ id: "dup-1", name: "First", manufacturer: "M1" }],
        B: [{ id: "dup_1", name: "Second", manufacturer: "M2" }],
      },
    });
    expect(opts).toHaveLength(1);
    expect(opts[0].manufacturer).toBe("M1"); // first-wins
  });
});

describe("buildInsertOptionsFromStores -- adversarial", () => {
  it("rejects an array passed as stores", () => {
    expect(buildInsertOptionsFromStores([1, 2, 3] as unknown)).toEqual([]);
  });
  it("rejects INSERT_DATABASE being an array rather than an object", () => {
    expect(buildInsertOptionsFromStores({ INSERT_DATABASE: ["R245-12"] })).toEqual([]);
  });
  it("derives the id from name when the id field is absent", () => {
    const opts = buildInsertOptionsFromStores({
      INSERT_DATABASE: { F: [{ name: "CNMG 120408", manufacturer: "Generic" }] },
    });
    expect(opts).toHaveLength(1);
    expect(opts[0].id).toBe("cnmg-120408");
    expect(opts[0].label).toBe("CNMG 120408");
  });
});

describe("buildInsertCatalog -- curated fail-soft branch (R12: degrade honestly)", () => {
  it("returns the curated set with honest source/liveCount when the DB is null", () => {
    const cat = buildInsertCatalog(null);
    expect(cat.source).toBe("curated");
    expect(cat.liveCount).toBe(0);
    expect(cat.options.length).toBe(4);
    expect(cat.total).toBe(4);
    expect(cat.fallbackCount).toBe(4);
    expect(cat.options.length).toBeGreaterThan(0); // never silent-empty
    expect(cat.manufacturers.length).toBeGreaterThan(0);
  });

  it("falls back to curated for an empty / INSERT_DATABASE-less DB", () => {
    expect(buildInsertCatalog({ stores: {} }).source).toBe("curated");
    expect(buildInsertCatalog({ stores: { INSERT_DATABASE: {} } }).liveCount).toBe(0);
    expect(buildInsertCatalog({}).source).toBe("curated");
  });

  it("reports source=database + distinct facets when given a populated DB", () => {
    const cat = buildInsertCatalog({
      stores: {
        INSERT_DATABASE: {
          F1: [{ id: "a", name: "A", manufacturer: "Kennametal", material: "Steel (P)" }],
          F2: [{ id: "b", name: "B", manufacturer: "ISCAR", material: "Cast Iron (K)" }],
        },
      },
    });
    expect(cat.source).toBe("database");
    expect(cat.liveCount).toBe(2);
    expect(cat.manufacturers).toEqual(["ISCAR", "Kennametal"]); // sorted distinct
    expect(cat.materials).toEqual(["Cast Iron (K)", "Steel (P)"]);
  });
});

describe("getCalculatorInsertCatalog -- live round-trip against the real reference DB", () => {
  beforeEach(() => resetInsertCatalogCacheForTest());

  it("loads a populated live catalog with the known canonical inserts", () => {
    const cat = getCalculatorInsertCatalog();
    expect(cat.source).toBe("database");
    expect(cat.liveCount).toBeGreaterThan(25); // INSERT_DATABASE carries ~33 products
    expect(cat.total).toBe(cat.liveCount);
    expect(cat.fallbackCount).toBe(0);

    const sandvik = cat.options.find((o) => o.id === "r245-12-m10")!;
    expect(sandvik.manufacturer).toBe("Sandvik Coromant");
    expect(sandvik.material).toBe("Steel (P)");

    // Facets resolve real manufacturers from the DB.
    expect(cat.manufacturers).toContain("Sandvik Coromant");
    expect(cat.manufacturers).toContain("Kennametal");
    expect(cat.manufacturers).toContain("ISCAR");

    // Every option must be select-renderable (completeness).
    for (const o of cat.options) {
      expect(o.id.length).toBeGreaterThan(0);
      expect(o.label.length).toBeGreaterThan(0);
      expect(o.detail.length).toBeGreaterThan(0);
    }
  });
});
