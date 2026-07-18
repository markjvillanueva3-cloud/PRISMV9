/**
 * Tests for the SFC turning (lathe) insert catalog accessor.
 * R9: reference-value assertions (turningInserts + insertShapes join), happy path
 * + >=3 failure modes + >=2 adversarial inputs + curated fail-soft branch + a live
 * round-trip against the real reference DB.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  turningInsertOptionId,
  buildTurningInsertOptionsFromStores,
  buildTurningInsertCatalog,
  getCalculatorTurningInsertCatalog,
  resetTurningInsertCatalogCacheForTest,
} from "../utils/calculatorLatheInsertCatalog.js";

describe("turningInsertOptionId", () => {
  it("slugifies ISO designations to stable ids", () => {
    expect(turningInsertOptionId("CNMG 120408", "x")).toBe("cnmg-120408");
    expect(turningInsertOptionId("WNMG 080408", "x")).toBe("wnmg-080408");
  });
  it("falls back when the value slugs to empty", () => {
    expect(turningInsertOptionId("", "fb")).toBe("fb");
    expect(turningInsertOptionId("___", "fb")).toBe("fb");
  });
});

describe("buildTurningInsertOptionsFromStores -- happy path (turningInserts + insertShapes join)", () => {
  const stores = {
    LATHE_INSERT_DATABASE: {
      insertShapes: {
        C: { name: "Diamond 80", angle: 80 },
        W: { name: "Trigon 80", angle: 80 },
      },
      turningInserts: {
        cnmg_432: { iso: "CNMG 120408", ansi: "CNMG 432", shape: "C", noseRadius: 0.031, edges: 4, type: "negative", chipbreaker: "medium", application: "General roughing" },
        wnmg_432: { iso: "WNMG 080408", ansi: "WNMG 432", shape: "W", noseRadius: 0.031, edges: 6, type: "negative", application: "Copy turning, contouring" },
      },
    },
  };

  it("maps each turning insert to an option carrying source fields + resolved shape name", () => {
    const opts = buildTurningInsertOptionsFromStores(stores);
    expect(opts).toHaveLength(2);

    const cnmg = opts.find((o) => o.id === "cnmg-120408")!;
    // R9: values from input.
    expect(cnmg.label).toBe("CNMG 120408");
    expect(cnmg.iso).toBe("CNMG 120408");
    expect(cnmg.ansi).toBe("CNMG 432");
    expect(cnmg.shapeCode).toBe("C");
    expect(cnmg.shapeName).toBe("Diamond 80"); // joined from insertShapes
    expect(cnmg.noseRadius).toBe(0.031);
    expect(cnmg.edges).toBe(4);
    expect(cnmg.type).toBe("negative");
    expect(cnmg.application).toBe("General roughing");
    expect(cnmg.detail).toContain("CNMG 432");
    expect(cnmg.detail).toContain("Diamond 80");
    expect(cnmg.detail).toContain("General roughing");
    expect(cnmg.detail).toContain("4 edges");
  });

  it("leaves shapeName empty when insertShapes is absent entirely", () => {
    const opts = buildTurningInsertOptionsFromStores({
      LATHE_INSERT_DATABASE: { turningInserts: { x: { iso: "ISO X", shape: "Z", edges: 2 } } },
    });
    expect(opts).toHaveLength(1);
    expect(opts[0].shapeName).toBe(""); // no insertShapes map at all
    expect(opts[0].shapeCode).toBe("Z");
  });

  it("leaves shapeName empty when insertShapes is PRESENT but the code is unmapped", () => {
    // Distinct branch from "absent entirely": map exists, this code isn't in it.
    const opts = buildTurningInsertOptionsFromStores({
      LATHE_INSERT_DATABASE: {
        insertShapes: { C: { name: "Diamond 80" } }, // present, but no "Z"
        turningInserts: { x: { iso: "ISO X", shape: "Z", edges: 2 } },
      },
    });
    expect(opts).toHaveLength(1);
    expect(opts[0].shapeName).toBe(""); // C is mapped, Z is not -> ""
    expect(opts[0].detail).not.toContain("Diamond"); // must NOT borrow another code's name
  });
});

describe("buildTurningInsertOptionsFromStores -- failure modes", () => {
  it("returns [] for null / empty / missing turningInserts", () => {
    expect(buildTurningInsertOptionsFromStores(null)).toEqual([]);
    expect(buildTurningInsertOptionsFromStores({})).toEqual([]);
    expect(buildTurningInsertOptionsFromStores({ LATHE_INSERT_DATABASE: {} })).toEqual([]);
    expect(buildTurningInsertOptionsFromStores({ LATHE_INSERT_DATABASE: { turningInserts: {} } })).toEqual([]);
  });

  it("skips a malformed (non-object) turning-insert entry", () => {
    const opts = buildTurningInsertOptionsFromStores({
      LATHE_INSERT_DATABASE: { turningInserts: { bad: null, alsoBad: "str", good: { iso: "CNMG 120408", shape: "C", edges: 4 } } },
    });
    expect(opts).toHaveLength(1);
    expect(opts[0].id).toBe("cnmg-120408");
  });

  it("coerces non-numeric noseRadius/edges to 0 (no NaN, no edges segment)", () => {
    const opts = buildTurningInsertOptionsFromStores({
      LATHE_INSERT_DATABASE: { turningInserts: { x: { iso: "ISO X", shape: "C", noseRadius: "abc", edges: "lots" } } },
    });
    expect(opts).toHaveLength(1);
    expect(opts[0].noseRadius).toBe(0);
    expect(opts[0].edges).toBe(0);
    expect(opts[0].detail).not.toContain("edges");
  });

  it("derives id from ansi or key when iso is absent", () => {
    const fromAnsi = buildTurningInsertOptionsFromStores({
      LATHE_INSERT_DATABASE: { turningInserts: { k: { ansi: "CCMT 32.51", shape: "C", edges: 2 } } },
    });
    expect(fromAnsi[0].id).toBe("ccmt-32-51");
    expect(fromAnsi[0].label).toBe("CCMT 32.51");

    const fromKey = buildTurningInsertOptionsFromStores({
      LATHE_INSERT_DATABASE: { turningInserts: { my_insert_key: { shape: "C", edges: 2 } } },
    });
    expect(fromKey[0].id).toBe("my-insert-key");
  });
});

describe("buildTurningInsertOptionsFromStores -- adversarial", () => {
  it("rejects an array passed as stores", () => {
    expect(buildTurningInsertOptionsFromStores([1, 2] as unknown)).toEqual([]);
  });
  it("rejects turningInserts being an array rather than an object", () => {
    expect(buildTurningInsertOptionsFromStores({ LATHE_INSERT_DATABASE: { turningInserts: ["cnmg"] } })).toEqual([]);
  });
  it("dedupes inserts whose iso slugs to the same id (first-wins)", () => {
    const opts = buildTurningInsertOptionsFromStores({
      LATHE_INSERT_DATABASE: {
        turningInserts: {
          a: { iso: "CNMG 120408", shape: "C", edges: 4, application: "first" },
          b: { iso: "CNMG-120408", shape: "C", edges: 4, application: "second" },
        },
      },
    });
    expect(opts).toHaveLength(1);
    expect(opts[0].application).toBe("first");
  });
});

describe("buildTurningInsertCatalog -- curated fail-soft branch (R12: degrade honestly)", () => {
  it("returns the curated set with honest source/liveCount when the DB is null", () => {
    const cat = buildTurningInsertCatalog(null);
    expect(cat.source).toBe("curated");
    expect(cat.liveCount).toBe(0);
    expect(cat.options.length).toBe(4);
    expect(cat.fallbackCount).toBe(4);
    expect(cat.options.length).toBeGreaterThan(0); // never silent-empty
    expect(cat.shapes.length).toBeGreaterThan(0);
    expect(cat.options.map((o) => o.id)).toContain("cnmg-120408");
  });

  it("falls back to curated for an empty / turningInserts-less DB", () => {
    expect(buildTurningInsertCatalog({ stores: {} }).source).toBe("curated");
    expect(buildTurningInsertCatalog({ stores: { LATHE_INSERT_DATABASE: {} } }).liveCount).toBe(0);
    expect(buildTurningInsertCatalog({}).source).toBe("curated");
  });

  it("reports source=database + distinct shape facets when given a populated DB", () => {
    const cat = buildTurningInsertCatalog({
      stores: {
        LATHE_INSERT_DATABASE: {
          insertShapes: { C: { name: "Diamond 80" }, R: { name: "Round" } },
          turningInserts: {
            a: { iso: "CNMG 120408", shape: "C", edges: 4 },
            b: { iso: "RCMT 1003M0", shape: "R", edges: 1 },
          },
        },
      },
    });
    expect(cat.source).toBe("database");
    expect(cat.liveCount).toBe(2);
    expect(cat.shapes).toEqual(["Diamond 80", "Round"]); // sorted distinct
  });
});

describe("getCalculatorTurningInsertCatalog -- live round-trip against the real reference DB", () => {
  beforeEach(() => resetTurningInsertCatalogCacheForTest());

  it("loads a populated live catalog with the canonical turning inserts", () => {
    const cat = getCalculatorTurningInsertCatalog();
    expect(cat.source).toBe("database");
    expect(cat.liveCount).toBeGreaterThanOrEqual(8); // turningInserts carries ~10
    expect(cat.total).toBe(cat.liveCount);
    expect(cat.fallbackCount).toBe(0);

    const cnmg = cat.options.find((o) => o.id === "cnmg-120408")!;
    expect(cnmg.ansi).toBe("CNMG 432"); // canonical ANSI from the DB
    expect(cnmg.shapeCode).toBe("C");
    expect(cnmg.shapeName).toContain("Diamond"); // joined from insertShapes (may carry a degree sign)
    expect(cnmg.edges).toBe(4);

    // shape facet resolves real shapes
    expect(cat.shapes.some((s) => /Diamond/.test(s))).toBe(true);

    // Every option must be select-renderable (completeness).
    for (const o of cat.options) {
      expect(o.id.length).toBeGreaterThan(0);
      expect(o.label.length).toBeGreaterThan(0);
      expect(o.detail.length).toBeGreaterThan(0);
    }
  });
});
