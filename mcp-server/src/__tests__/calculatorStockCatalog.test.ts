/**
 * Tests for the SFC raw-material stock catalog accessor.
 * R9: reference-value assertions, happy path + >=3 failure modes + >=2 adversarial
 * inputs + curated fail-soft branch + a live round-trip against the persisted store.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  stockOptionId,
  buildStockOptionsFromStore,
  buildStockCatalog,
  getCalculatorStockCatalog,
  resetStockCatalogCacheForTest,
} from "../utils/calculatorStockCatalog.js";

describe("stockOptionId", () => {
  it("slugifies stock ids/specs to stable ids", () => {
    expect(stockOptionId("STK-D2-PLATE-1.0", "x")).toBe("stk-d2-plate-1-0");
    expect(stockOptionId("AISI 4140", "x")).toBe("aisi-4140");
  });
  it("falls back when the value slugs to empty", () => {
    expect(stockOptionId("", "fb")).toBe("fb");
    expect(stockOptionId("___", "fb")).toBe("fb");
  });
});

describe("buildStockOptionsFromStore -- happy path (reference values)", () => {
  const items = [
    { id: "STK-D2-PLATE-1.0", material_spec: "AISI D2", common_name: "D2 tool steel plate", iso_group: "H", form: "plate", size_label: "12 x 8 x 1.0 in", hardness_hrc: 60, quantity_on_hand: 6, location: "Rack-A-01", unit_cost: 250 },
    { id: "STK-4140-RND-2", material_spec: "AISI 4140", common_name: "4140 round bar", iso_group: "P", form: "round", size_label: "2.0 in dia", hardness_hrc: 28 },
  ];

  it("accepts the raw array and maps items carrying cut-relevant fields", () => {
    const opts = buildStockOptionsFromStore(items);
    expect(opts).toHaveLength(2);
    const d2 = opts.find((o) => o.id === "stk-d2-plate-1-0")!;
    // R9: values from input.
    expect(d2.label).toBe("D2 tool steel plate"); // common_name preferred
    expect(d2.materialSpec).toBe("AISI D2");
    expect(d2.isoGroup).toBe("H");
    expect(d2.form).toBe("plate");
    expect(d2.sizeLabel).toBe("12 x 8 x 1.0 in");
    expect(d2.hardnessHrc).toBe(60);
    expect(d2.detail).toContain("Plate");
    expect(d2.detail).toContain("AISI D2");
    expect(d2.detail).toContain("ISO H");
    expect(d2.detail).toContain("12 x 8 x 1.0 in");
    expect(d2.detail).toContain("60 HRC");
    // inventory fields are NOT surfaced as option props
    expect((d2 as Record<string, unknown>).quantity_on_hand).toBeUndefined();
    expect((d2 as Record<string, unknown>).location).toBeUndefined();
  });

  it("accepts the wrapping {materials_stock: [...]} store object", () => {
    const opts = buildStockOptionsFromStore({ schemaVersion: 1, materials_stock: items });
    expect(opts).toHaveLength(2);
    expect(opts.map((o) => o.id)).toContain("stk-4140-rnd-2");
  });
});

describe("buildStockOptionsFromStore -- failure modes", () => {
  it("returns [] for null / empty / non-stock object", () => {
    expect(buildStockOptionsFromStore(null)).toEqual([]);
    expect(buildStockOptionsFromStore({})).toEqual([]);
    expect(buildStockOptionsFromStore({ materials_stock: [] })).toEqual([]);
    expect(buildStockOptionsFromStore([])).toEqual([]);
  });

  it("skips malformed (non-object) items but keeps valid siblings", () => {
    const opts = buildStockOptionsFromStore([null, "str", 42, { id: "ok", material_spec: "AISI 1018", form: "plate" }]);
    expect(opts).toHaveLength(1);
    expect(opts[0].id).toBe("ok");
  });

  it("coerces a non-numeric hardness to null (no NaN, no HRC segment)", () => {
    const opts = buildStockOptionsFromStore([{ id: "x", material_spec: "AISI 1018", form: "plate", hardness_hrc: "soft" }]);
    expect(opts).toHaveLength(1);
    expect(opts[0].hardnessHrc).toBeNull();
    expect(opts[0].detail).not.toContain("HRC");
  });

  it("derives id from material_spec or common_name when id is absent", () => {
    const fromSpec = buildStockOptionsFromStore([{ material_spec: "AISI 4340", form: "round" }]);
    expect(fromSpec[0].id).toBe("aisi-4340");
    const fromName = buildStockOptionsFromStore([{ common_name: "Brass plate", form: "plate" }]);
    expect(fromName[0].id).toBe("brass-plate");
    expect(fromName[0].label).toBe("Brass plate");
  });

  it("skips an item with neither id nor spec nor name", () => {
    expect(buildStockOptionsFromStore([{ form: "plate", iso_group: "P" }])).toEqual([]);
  });
});

describe("buildStockOptionsFromStore -- adversarial", () => {
  it("ignores a store whose materials_stock is not an array", () => {
    expect(buildStockOptionsFromStore({ materials_stock: { not: "array" } })).toEqual([]);
  });
  it("dedupes items whose id slugs to the same value (first-wins)", () => {
    const opts = buildStockOptionsFromStore([
      { id: "STK-1", material_spec: "First", form: "plate" },
      { id: "stk_1", material_spec: "Second", form: "round" },
    ]);
    expect(opts).toHaveLength(1);
    expect(opts[0].materialSpec).toBe("First");
  });
  it("preserves a hardness of 0 as a value but omits it from the detail (>0 guard)", () => {
    const opts = buildStockOptionsFromStore([{ id: "x", material_spec: "Annealed", form: "plate", hardness_hrc: 0 }]);
    expect(opts[0].hardnessHrc).toBe(0); // 0 preserved (finiteOrNull), not null
    expect(opts[0].detail).not.toContain("HRC"); // 0 omitted from display
  });
});

describe("buildStockCatalog -- curated fail-soft branch (R12: degrade honestly)", () => {
  it("returns the curated set with honest source/liveCount when the store is null", () => {
    const cat = buildStockCatalog(null);
    expect(cat.source).toBe("curated");
    expect(cat.liveCount).toBe(0);
    expect(cat.options.length).toBe(4);
    expect(cat.fallbackCount).toBe(4);
    expect(cat.options.length).toBeGreaterThan(0); // never silent-empty
    expect(cat.forms.length).toBeGreaterThan(0);
    expect(cat.isoGroups.length).toBeGreaterThan(0);
  });

  it("falls back to curated for an empty store", () => {
    expect(buildStockCatalog({ materials_stock: [] }).source).toBe("curated");
    expect(buildStockCatalog({}).source).toBe("curated");
  });

  it("reports source=database + distinct facets when given a populated store", () => {
    const cat = buildStockCatalog({
      materials_stock: [
        { id: "a", material_spec: "AISI 1018", form: "plate", iso_group: "P" },
        { id: "b", material_spec: "Aluminum 6061", form: "round", iso_group: "N" },
      ],
    });
    expect(cat.source).toBe("database");
    expect(cat.liveCount).toBe(2);
    expect(cat.forms).toEqual(["plate", "round"]); // sorted distinct
    expect(cat.isoGroups).toEqual(["N", "P"]);
  });
});

describe("getCalculatorStockCatalog -- live round-trip against the persisted store", () => {
  beforeEach(() => resetStockCatalogCacheForTest());

  it("loads the populated live stock catalog (or honest curated fallback if the store is absent)", () => {
    const cat = getCalculatorStockCatalog();
    // The persisted store ships with JM-Die stock; if present we get database, else honest curated.
    expect(["database", "curated"]).toContain(cat.source);
    expect(cat.total).toBe(cat.options.length);
    expect(cat.options.length).toBeGreaterThan(0);

    if (cat.source === "database") {
      expect(cat.liveCount).toBeGreaterThan(0);
      expect(cat.fallbackCount).toBe(0);
      // facets resolve
      expect(cat.forms.length).toBeGreaterThan(0);
      // a known JM stock item (D2 plate) is present and correctly mapped
      const d2 = cat.options.find((o) => /d2/i.test(o.id) || /D2/.test(o.materialSpec));
      if (d2) {
        expect(d2.isoGroup).toBe("H"); // D2 is ISO H (hardened)
        expect(d2.form).toBe("plate");
      }
    } else {
      expect(cat.liveCount).toBe(0);
      expect(cat.fallbackCount).toBeGreaterThan(0);
    }

    // Every option must be select-renderable (completeness).
    for (const o of cat.options) {
      expect(o.id.length).toBeGreaterThan(0);
      expect(o.label.length).toBeGreaterThan(0);
      expect(o.detail.length).toBeGreaterThan(0);
    }
  });
});
