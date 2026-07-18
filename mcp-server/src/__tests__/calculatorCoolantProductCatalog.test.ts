/**
 * Tests for the SFC coolant-product catalog accessor.
 * R9: reference-value assertions (vendor->products flatten across two stores),
 * happy path + >=3 failure modes + >=2 adversarial inputs + curated fail-soft branch
 * + a live round-trip against the real reference DB.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  coolantProductOptionId,
  buildCoolantProductOptionsFromStores,
  buildCoolantProductCatalog,
  getCalculatorCoolantProductCatalog,
  resetCoolantProductCatalogCacheForTest,
} from "../utils/calculatorCoolantProductCatalog.js";

describe("coolantProductOptionId", () => {
  it("slugifies product names/keys to stable ids", () => {
    expect(coolantProductOptionId("Blasocut BC 25 MD", "x")).toBe("blasocut-bc-25-md");
    expect(coolantProductOptionId("coolube_2210", "x")).toBe("coolube-2210");
  });
  it("falls back when the value slugs to empty", () => {
    expect(coolantProductOptionId("", "fb")).toBe("fb");
    expect(coolantProductOptionId("___", "fb")).toBe("fb");
  });
});

describe("buildCoolantProductOptionsFromStores -- happy path (two-store flatten, reference values)", () => {
  const stores = {
    COOLANT_DATABASE: {
      blaser: {
        name: "Blaser Swisslube",
        country: "Switzerland",
        products: {
          blasocut_bc25md: { name: "Blasocut BC 25 MD", type: "Semi-synthetic", concentration: "5-8%", bestFor: "Steel, Cast Iron, Aluminum" },
        },
      },
    },
    MQL_DATABASE: {
      hangsterfers: {
        name: "Hangsterfer's",
        country: "USA",
        products: {
          coolube_2210: { name: "Coolube 2210", type: "Vegetable Ester", flowRate: "10-50 ml/hr" },
        },
      },
    },
  };

  it("flattens both stores tagging the coolingType + carrying source fields", () => {
    const opts = buildCoolantProductOptionsFromStores(stores);
    expect(opts).toHaveLength(2);

    const flood = opts.find((o) => o.id === "blasocut-bc-25-md")!;
    expect(flood.label).toBe("Blasocut BC 25 MD");
    expect(flood.vendor).toBe("Blaser Swisslube");
    expect(flood.vendorCountry).toBe("Switzerland");
    expect(flood.type).toBe("Semi-synthetic");
    expect(flood.coolingType).toBe("flood");
    expect(flood.bestFor).toBe("Steel, Cast Iron, Aluminum");
    // flood detail tail = bestFor
    expect(flood.detail).toContain("Blaser Swisslube");
    expect(flood.detail).toContain("Semi-synthetic");
    expect(flood.detail).toContain("Steel, Cast Iron, Aluminum");

    const mql = opts.find((o) => o.id === "coolube-2210")!;
    expect(mql.coolingType).toBe("mql");
    expect(mql.vendor).toBe("Hangsterfer's");
    expect(mql.type).toBe("Vegetable Ester");
    // mql detail tail = flowRate (no bestFor)
    expect(mql.detail).toContain("10-50 ml/hr");
    expect(mql.bestFor).toBe("");
  });
});

describe("buildCoolantProductOptionsFromStores -- failure modes", () => {
  it("returns [] for null / empty / store-less DB", () => {
    expect(buildCoolantProductOptionsFromStores(null)).toEqual([]);
    expect(buildCoolantProductOptionsFromStores({})).toEqual([]);
    expect(buildCoolantProductOptionsFromStores({ COOLANT_DATABASE: {}, MQL_DATABASE: {} })).toEqual([]);
  });

  it("skips a vendor with no products object + a malformed product entry", () => {
    const opts = buildCoolantProductOptionsFromStores({
      COOLANT_DATABASE: {
        novendor: { name: "No Products Co" }, // no products
        good: { name: "Good Co", country: "US", products: { p1: null, p2: "str", p3: { name: "P3", type: "Soluble oil" } } },
      },
    });
    expect(opts).toHaveLength(1);
    expect(opts[0].id).toBe("p3");
    expect(opts[0].vendor).toBe("Good Co");
  });

  it("derives the id from the product key when name is absent", () => {
    const opts = buildCoolantProductOptionsFromStores({
      COOLANT_DATABASE: { v: { name: "V", products: { my_keyed_product: { type: "Soluble oil" } } } },
    });
    expect(opts).toHaveLength(1);
    expect(opts[0].id).toBe("my-keyed-product");
  });

  it("dedupes products whose name slugs to the same id across stores -- MQL-first wins (correct tag for cross-store duplicates)", () => {
    const opts = buildCoolantProductOptionsFromStores({
      COOLANT_DATABASE: { a: { name: "A", products: { x: { name: "Shared Name", type: "Soluble oil" } } } },
      MQL_DATABASE: { b: { name: "B", products: { y: { name: "Shared-Name", type: "Vegetable Ester" } } } },
    });
    expect(opts).toHaveLength(1); // both slug to "shared-name"
    expect(opts[0].coolingType).toBe("mql"); // MQL_DATABASE flattened first -> authoritative tag
  });

  it("real-data case: Coolube 2210 (duplicated into both stores) resolves to mql, not flood", () => {
    // Mirrors the real coolants.json mis-file: an MQL vegetable-ester lubricant also
    // listed under COOLANT_DATABASE with type 'MQL Lubricant'. mql-first tags it correctly.
    const opts = buildCoolantProductOptionsFromStores({
      COOLANT_DATABASE: { hangsterfers: { name: "Hangsterfer's", products: { coolube_2210: { name: "Coolube 2210", type: "MQL Lubricant", bestFor: "MQL systems, Near-dry machining" } } } },
      MQL_DATABASE: { hangsterfers: { name: "Hangsterfer's", products: { coolube_2210: { name: "Coolube 2210", type: "Vegetable Ester", flowRate: "10-50 ml/hr" } } } },
    });
    const coolube = opts.filter((o) => o.id === "coolube-2210");
    expect(coolube).toHaveLength(1); // deduped to a single option
    expect(coolube[0].coolingType).toBe("mql");
    expect(coolube[0].type).toBe("Vegetable Ester"); // the MQL store's (accurate) type wins
  });
});

describe("buildCoolantProductOptionsFromStores -- adversarial", () => {
  it("rejects an array passed as stores", () => {
    expect(buildCoolantProductOptionsFromStores([1, 2] as unknown)).toEqual([]);
  });
  it("ignores a store that is an array rather than a vendor object", () => {
    const opts = buildCoolantProductOptionsFromStores({
      COOLANT_DATABASE: ["blaser"],
      MQL_DATABASE: { v: { name: "V", products: { p: { name: "P", type: "Ester" } } } },
    });
    expect(opts).toHaveLength(1); // COOLANT_DATABASE array ignored, MQL used
    expect(opts[0].coolingType).toBe("mql");
  });
  it("only MQL store present -> all options tagged mql", () => {
    const opts = buildCoolantProductOptionsFromStores({
      MQL_DATABASE: { v: { name: "V", products: { p: { name: "P", type: "Ester" } } } },
    });
    expect(opts).toHaveLength(1);
    expect(opts[0].coolingType).toBe("mql");
  });
});

describe("buildCoolantProductCatalog -- curated fail-soft branch (R12: degrade honestly)", () => {
  it("returns the curated set with honest source/liveCount when the DB is null", () => {
    const cat = buildCoolantProductCatalog(null);
    expect(cat.source).toBe("curated");
    expect(cat.liveCount).toBe(0);
    expect(cat.options.length).toBe(3);
    expect(cat.fallbackCount).toBe(3);
    expect(cat.options.length).toBeGreaterThan(0); // never silent-empty
    expect(cat.coolingTypes).toContain("flood");
    expect(cat.coolingTypes).toContain("mql");
  });

  it("falls back to curated for an empty / store-less DB", () => {
    expect(buildCoolantProductCatalog({ stores: {} }).source).toBe("curated");
    expect(buildCoolantProductCatalog({}).source).toBe("curated");
  });

  it("reports source=database + distinct facets when given a populated DB", () => {
    const cat = buildCoolantProductCatalog({
      stores: {
        COOLANT_DATABASE: { blaser: { name: "Blaser", products: { p: { name: "BC25", type: "Semi-synthetic" } } } },
        MQL_DATABASE: { unist: { name: "Unist", products: { q: { name: "Coolube", type: "Ester" } } } },
      },
    });
    expect(cat.source).toBe("database");
    expect(cat.liveCount).toBe(2);
    expect(cat.vendors).toEqual(["Blaser", "Unist"]); // sorted distinct
    expect(cat.coolingTypes).toEqual(["flood", "mql"]); // canonical order
  });
});

describe("getCalculatorCoolantProductCatalog -- live round-trip against the real reference DB", () => {
  beforeEach(() => resetCoolantProductCatalogCacheForTest());

  it("loads a populated live catalog spanning both flood + MQL products", () => {
    const cat = getCalculatorCoolantProductCatalog();
    expect(cat.source).toBe("database");
    expect(cat.liveCount).toBeGreaterThan(20); // 13 flood vendors + 11 mql vendors, multiple products each
    expect(cat.total).toBe(cat.liveCount);
    expect(cat.fallbackCount).toBe(0);

    // both delivery classes present
    expect(cat.coolingTypes).toEqual(["flood", "mql"]);
    expect(cat.options.some((o) => o.coolingType === "flood")).toBe(true);
    expect(cat.options.some((o) => o.coolingType === "mql")).toBe(true);

    // canonical vendors resolve
    expect(cat.vendors).toContain("Blaser Swisslube");

    // a known flood product is present and correctly tagged
    const blasocut = cat.options.find((o) => o.id === "blasocut-bc-25-md")!;
    expect(blasocut.coolingType).toBe("flood");
    expect(blasocut.vendor).toBe("Blaser Swisslube");

    // Every option must be select-renderable (completeness).
    for (const o of cat.options) {
      expect(o.id.length).toBeGreaterThan(0);
      expect(o.label.length).toBeGreaterThan(0);
      expect(o.detail.length).toBeGreaterThan(0);
    }
  });
});
