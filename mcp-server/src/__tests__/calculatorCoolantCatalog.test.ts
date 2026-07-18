/**
 * Tests for the SFC coolant-method catalog accessor.
 * R9: reference-value assertions (key-union of coolantEffectiveness + coolantFactors),
 * happy path + >=3 failure modes + >=2 adversarial inputs + curated fail-soft branch
 * + a live round-trip against the real reference DB.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  coolantOptionId,
  buildCoolantOptionsFromStores,
  buildCoolantRecommendationsFromStores,
  buildCoolantCatalog,
  getCalculatorCoolantCatalog,
  resetCoolantCatalogCacheForTest,
} from "../utils/calculatorCoolantCatalog.js";

describe("coolantOptionId", () => {
  it("slugifies coolant method keys to stable ids", () => {
    expect(coolantOptionId("high_pressure", "x")).toBe("high-pressure");
    expect(coolantOptionId("through_spindle", "x")).toBe("through-spindle");
    expect(coolantOptionId("flood", "x")).toBe("flood");
  });
  it("falls back when the key slugs to empty", () => {
    expect(coolantOptionId("", "fb")).toBe("fb");
    expect(coolantOptionId("__", "fb")).toBe("fb");
  });
});

describe("buildCoolantOptionsFromStores -- happy path (reference values, key-union)", () => {
  const stores = {
    coolantEffectiveness: { none: 0, flood: 0.7, high_pressure: 0.85 },
    coolantFactors: { dry: 1.4, flood: 1.0 },
  };

  it("unions both stores and carries the source numbers", () => {
    const opts = buildCoolantOptionsFromStores(stores);
    // union keys: none, flood, high_pressure, dry => 4 distinct
    expect(opts).toHaveLength(4);

    const flood = opts.find((o) => o.id === "flood")!;
    expect(flood.effectiveness).toBe(0.7);
    expect(flood.factor).toBe(1.0);
    expect(flood.detail).toContain("70% cooling");
    expect(flood.detail).toContain("1x factor");

    const none = opts.find((o) => o.id === "none")!;
    expect(none.effectiveness).toBe(0);
    expect(none.factor).toBeNull();
    expect(none.detail).toBe("No coolant"); // effectiveness<=0 special-cased

    const dry = opts.find((o) => o.id === "dry")!;
    expect(dry.effectiveness).toBeNull(); // absent from coolantEffectiveness
    expect(dry.factor).toBe(1.4);

    const hp = opts.find((o) => o.id === "high-pressure")!;
    expect(hp.label).toBe("High Pressure");
    expect(hp.effectiveness).toBe(0.85);
  });
});

describe("buildCoolantOptionsFromStores -- failure modes", () => {
  it("returns [] when both stores are null/absent/empty", () => {
    expect(buildCoolantOptionsFromStores(null)).toEqual([]);
    expect(buildCoolantOptionsFromStores({})).toEqual([]);
    expect(buildCoolantOptionsFromStores({ coolantEffectiveness: {}, coolantFactors: {} })).toEqual([]);
  });

  it("uses only the present store when the other is absent", () => {
    const opts = buildCoolantOptionsFromStores({ coolantFactors: { dry: 1.4, mist: 1.2 } });
    expect(opts).toHaveLength(2);
    expect(opts.every((o) => o.effectiveness === null)).toBe(true);
    expect(opts.find((o) => o.id === "dry")!.factor).toBe(1.4);
  });

  it("skips a method whose attributes are both non-numeric", () => {
    const opts = buildCoolantOptionsFromStores({
      coolantEffectiveness: { air: "lots", flood: 0.7 },
      coolantFactors: { air: "nope" },
    });
    expect(opts).toHaveLength(1); // air dropped (no numeric attr), flood kept
    expect(opts[0].id).toBe("flood");
  });

  it("dedupes method keys that slug to the same id (e.g. high_pressure / high-pressure)", () => {
    const opts = buildCoolantOptionsFromStores({
      coolantEffectiveness: { high_pressure: 0.85, "high-pressure": 0.99 },
    });
    expect(opts).toHaveLength(1);
    expect(opts[0].effectiveness).toBe(0.85); // first-wins
  });
});

describe("buildCoolantOptionsFromStores -- adversarial", () => {
  it("rejects an array passed as stores", () => {
    expect(buildCoolantOptionsFromStores([0.7] as unknown)).toEqual([]);
  });
  it("ignores a store that is an array rather than an object", () => {
    const opts = buildCoolantOptionsFromStores({ coolantEffectiveness: [0.7], coolantFactors: { flood: 1.0 } });
    expect(opts).toHaveLength(1); // effectiveness array ignored, factor store used
    expect(opts[0].id).toBe("flood");
    expect(opts[0].effectiveness).toBeNull();
  });
  it("preserves effectiveness 0 (none) rather than treating it as absent", () => {
    const opts = buildCoolantOptionsFromStores({ coolantEffectiveness: { none: 0 } });
    expect(opts).toHaveLength(1);
    expect(opts[0].effectiveness).toBe(0);
  });
});

describe("buildCoolantRecommendationsFromStores -- per-material coolant guidance", () => {
  const stores = {
    COOLANT_RECOMMENDATIONS: {
      aluminum_6061: {
        material: "Aluminum 6061-T6",
        challenges: ["Built-up edge", "Chip welding"],
        science: "High thermal conductivity",
        recommendations: [
          { supplier: "castrol", product: "alusol_sl51xbb", score: 98, reason: "Anti-stain" },
          { supplier: "blaser", product: "b_cool_755", score: 91, reason: "Good lubricity" },
        ],
        avoid: ["High-pH coolants"],
        optimalConcentration: "8-10%",
      },
    },
  };

  it("distills the per-material guidance carrying the source fields (R9)", () => {
    const map = buildCoolantRecommendationsFromStores(stores);
    const al = map.aluminum_6061;
    expect(al.material).toBe("Aluminum 6061-T6");
    expect(al.challenges).toEqual(["Built-up edge", "Chip welding"]);
    expect(al.avoid).toEqual(["High-pH coolants"]);
    expect(al.optimalConcentration).toBe("8-10%");
    expect(al.recommended).toHaveLength(2);
    expect(al.recommended[0]).toEqual({ supplier: "castrol", product: "alusol_sl51xbb", score: 98, reason: "Anti-stain" });
  });

  it("returns {} when the recommendations store is absent", () => {
    expect(buildCoolantRecommendationsFromStores(null)).toEqual({});
    expect(buildCoolantRecommendationsFromStores({})).toEqual({});
    expect(buildCoolantRecommendationsFromStores({ COOLANT_RECOMMENDATIONS: {} })).toEqual({});
  });

  it("coerces missing/non-array fields and a non-numeric score safely", () => {
    const map = buildCoolantRecommendationsFromStores({
      COOLANT_RECOMMENDATIONS: {
        steel_1018: {
          // no material -> falls back to title-cased key
          challenges: "not-an-array",
          recommendations: [{ supplier: "x", product: "y", score: "high", reason: "z" }],
          // no avoid / optimalConcentration
        },
      },
    });
    const s = map.steel_1018;
    expect(s.material).toBe("Steel 1018"); // title-cased fallback
    expect(s.challenges).toEqual([]); // non-array -> []
    expect(s.avoid).toEqual([]);
    expect(s.optimalConcentration).toBeNull();
    expect(s.recommended[0].score).toBe(0); // "high" -> 0 (no NaN)
  });

  it("drops a recommendation entry with neither supplier nor product (adversarial)", () => {
    const map = buildCoolantRecommendationsFromStores({
      COOLANT_RECOMMENDATIONS: {
        m: { recommendations: [null, "str", { score: 5, reason: "no ids" }, { supplier: "ok", product: "p", score: 9, reason: "r" }] },
      },
    });
    expect(map.m.recommended).toHaveLength(1);
    expect(map.m.recommended[0].supplier).toBe("ok");
  });

  it("skips a non-object material entry (adversarial)", () => {
    const map = buildCoolantRecommendationsFromStores({
      COOLANT_RECOMMENDATIONS: { good: { material: "Good" }, bad: "not-an-object", arr: [1, 2] },
    });
    expect(Object.keys(map)).toEqual(["good"]);
  });
});

describe("buildCoolantCatalog -- curated fail-soft branch (R12: degrade honestly)", () => {
  it("returns the curated method set with honest source/liveCount when the DB is null", () => {
    const cat = buildCoolantCatalog(null);
    expect(cat.source).toBe("curated");
    expect(cat.liveCount).toBe(0);
    expect(cat.options.length).toBe(5);
    expect(cat.fallbackCount).toBe(5);
    expect(cat.options.map((o) => o.id)).toContain("flood");
    expect(cat.options.map((o) => o.id)).toContain("dry");
  });

  it("falls back to curated for an empty / store-less DB", () => {
    expect(buildCoolantCatalog({ stores: {} }).source).toBe("curated");
    expect(buildCoolantCatalog({}).source).toBe("curated");
  });

  it("reports source=database when given populated stores", () => {
    const cat = buildCoolantCatalog({ stores: { coolantEffectiveness: { flood: 0.7 } } });
    expect(cat.source).toBe("database");
    expect(cat.liveCount).toBe(1);
    expect(cat.fallbackCount).toBe(0);
  });
});

describe("getCalculatorCoolantCatalog -- live round-trip against the real reference DB", () => {
  beforeEach(() => resetCoolantCatalogCacheForTest());

  it("loads a populated live catalog with the canonical coolant methods", () => {
    const cat = getCalculatorCoolantCatalog();
    expect(cat.source).toBe("database");
    expect(cat.liveCount).toBeGreaterThanOrEqual(7); // union of effectiveness(5) + factors(5, overlapping)
    expect(cat.total).toBe(cat.liveCount);
    expect(cat.fallbackCount).toBe(0);

    const flood = cat.options.find((o) => o.id === "flood")!;
    expect(flood.effectiveness).toBe(0.7); // canonical flood effectiveness from the DB
    // flood appears in BOTH stores -> proves the union attaches effectiveness + factor on real data
    expect(flood.factor).toBe(0.8);

    // canonical methods present
    const ids = cat.options.map((o) => o.id);
    expect(ids).toContain("dry");
    expect(ids).toContain("mist");
    expect(ids).toContain("through-spindle");

    // Every option must be select-renderable.
    for (const o of cat.options) {
      expect(o.id.length).toBeGreaterThan(0);
      expect(o.label.length).toBeGreaterThan(0);
      expect(o.detail.length).toBeGreaterThan(0);
    }
  });

  it("surfaces per-material recommendations from the live COOLANT_RECOMMENDATIONS store", () => {
    const cat = getCalculatorCoolantCatalog();
    expect(Object.keys(cat.recommendedByMaterial).length).toBeGreaterThanOrEqual(20); // ~22 materials
    const al = cat.recommendedByMaterial.aluminum_6061;
    expect(al.material).toBe("Aluminum 6061-T6"); // canonical from the DB
    expect(al.recommended.length).toBeGreaterThan(0);
    expect(al.recommended[0].score).toBeGreaterThan(0);
    expect(al.challenges.length).toBeGreaterThan(0);
  });
});
