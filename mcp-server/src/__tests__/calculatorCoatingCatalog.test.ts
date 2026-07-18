/**
 * Tests for the SFC coating catalog accessor.
 * R9: reference-value assertions (the detail/fields must reflect the INPUT numbers),
 * happy path + >=3 failure modes + >=2 adversarial inputs + a live round-trip against
 * the real consolidated reference DB.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  coatingOptionId,
  buildCoatingOptionsFromStores,
  buildRecommendedByMaterial,
  buildCoatingCatalog,
  getCalculatorCoatingCatalog,
  resetCoatingCatalogCacheForTest,
} from "../utils/calculatorCoatingCatalog.js";

describe("coatingOptionId", () => {
  it("slugifies chemical coating names to stable ids", () => {
    expect(coatingOptionId("CVD_TiCN", "x")).toBe("cvd-ticn");
    expect(coatingOptionId("ta-C_DLC", "x")).toBe("ta-c-dlc");
    expect(coatingOptionId("AlTiN", "x")).toBe("altin");
  });
  it("falls back when the name slugs to empty", () => {
    expect(coatingOptionId("", "fb")).toBe("fb");
    expect(coatingOptionId("___", "fb")).toBe("fb");
    expect(coatingOptionId("!!!", "fb")).toBe("fb");
  });
});

describe("buildCoatingOptionsFromStores -- happy path (reference values)", () => {
  const stores = {
    PRISM_COATINGS_COMPLETE: {
      TiAlN: { category: "pvd", hardness_hv: 3300, max_temp_c: 800, friction_coef: 0.35, cost_factor: 1.5 },
      AlCrN: { category: "pvd", hardness_hv: 3200, max_temp_c: 1000, friction_coef: 0.35, cost_factor: 1.55 },
      UNCOATED: { category: "uncoated", hardness_hv: 0, max_temp_c: 500, friction_coef: 0.5, cost_factor: 1 },
    },
  };

  it("maps each coating to an option carrying the source numbers", () => {
    const opts = buildCoatingOptionsFromStores(stores);
    expect(opts).toHaveLength(3);
    const tialn = opts.find((o) => o.id === "tialn")!;
    // R9: these must come FROM the input, not be hardcoded -- change input -> change output.
    expect(tialn.label).toBe("TiAlN");
    expect(tialn.category).toBe("pvd");
    expect(tialn.maxTempC).toBe(800);
    expect(tialn.hardnessHv).toBe(3300);
    expect(tialn.frictionCoef).toBe(0.35);
    expect(tialn.costFactor).toBe(1.5);
    // Detail string must reflect the input magnitudes.
    expect(tialn.detail).toContain("3,300 HV");
    expect(tialn.detail).toContain("800C");
    expect(tialn.detail).toContain("mu0.35");
    expect(tialn.detail).toContain("1.5x cost");
  });

  it("omits zero-valued fields from the detail (uncoated => no cost multiplier)", () => {
    const opts = buildCoatingOptionsFromStores(stores);
    const uncoated = opts.find((o) => o.id === "uncoated")!;
    expect(uncoated.hardnessHv).toBe(0);
    expect(uncoated.detail).not.toContain("HV"); // 0 HV omitted
    expect(uncoated.detail).not.toContain("x cost"); // cost_factor 1 omitted
    expect(uncoated.detail).toContain("500C");
  });
});

describe("buildCoatingOptionsFromStores -- failure modes", () => {
  it("returns [] for null / empty / missing store", () => {
    expect(buildCoatingOptionsFromStores(null)).toEqual([]);
    expect(buildCoatingOptionsFromStores({})).toEqual([]);
    expect(buildCoatingOptionsFromStores({ PRISM_COATINGS_COMPLETE: {} })).toEqual([]);
  });

  it("skips malformed (non-object) entries but keeps valid siblings", () => {
    const opts = buildCoatingOptionsFromStores({
      PRISM_COATINGS_COMPLETE: {
        Bad: null,
        AlsoBad: "not-an-object",
        Good: { category: "pvd", hardness_hv: 1000, max_temp_c: 600, friction_coef: 0.4, cost_factor: 1.2 },
      },
    });
    expect(opts).toHaveLength(1);
    expect(opts[0].id).toBe("good");
    expect(opts[0].hardnessHv).toBe(1000);
  });

  it("coerces non-numeric numeric fields to 0 (no NaN leaks)", () => {
    const opts = buildCoatingOptionsFromStores({
      PRISM_COATINGS_COMPLETE: { X: { category: "pvd", hardness_hv: "abc", max_temp_c: null, friction_coef: undefined, cost_factor: {} } },
    });
    expect(opts).toHaveLength(1);
    expect(opts[0].hardnessHv).toBe(0);
    expect(opts[0].maxTempC).toBe(0);
    expect(opts[0].frictionCoef).toBe(0);
    expect(opts[0].costFactor).toBe(0);
    expect(Number.isNaN(opts[0].hardnessHv)).toBe(false);
  });

  it("dedupes coatings whose names slug to the same id", () => {
    const opts = buildCoatingOptionsFromStores({
      PRISM_COATINGS_COMPLETE: {
        "Ti-AlN": { category: "pvd", hardness_hv: 3300 },
        "Ti_AlN": { category: "pvd", hardness_hv: 9999 },
      },
    });
    expect(opts).toHaveLength(1); // both slug to "ti-aln"
    expect(opts[0].hardnessHv).toBe(3300); // first-wins
  });
});

describe("buildCoatingOptionsFromStores -- adversarial", () => {
  it("rejects an array passed as stores", () => {
    expect(buildCoatingOptionsFromStores([1, 2, 3] as unknown)).toEqual([]);
  });
  it("rejects PRISM_COATINGS_COMPLETE being an array rather than an object", () => {
    expect(buildCoatingOptionsFromStores({ PRISM_COATINGS_COMPLETE: ["TiAlN"] })).toEqual([]);
  });
  it("does not emit a part for negative magnitudes (defensive detail build)", () => {
    const opts = buildCoatingOptionsFromStores({
      PRISM_COATINGS_COMPLETE: { Neg: { category: "pvd", hardness_hv: -100, max_temp_c: -50, friction_coef: -0.1, cost_factor: -2 } },
    });
    expect(opts).toHaveLength(1);
    // category survives; negatives are dropped from the detail (>0 guard)
    expect(opts[0].detail).toBe("PVD");
  });
});

describe("buildRecommendedByMaterial", () => {
  it("extracts the material -> coatings map", () => {
    const map = buildRecommendedByMaterial({ goodCoatings: { steel: ["TiAlN", "AlTiN"], aluminum: ["DLC"] } });
    expect(map.steel).toEqual(["TiAlN", "AlTiN"]);
    expect(map.aluminum).toEqual(["DLC"]);
  });
  it("returns {} when goodCoatings is missing/empty", () => {
    expect(buildRecommendedByMaterial(null)).toEqual({});
    expect(buildRecommendedByMaterial({})).toEqual({});
  });
  it("skips non-array material values", () => {
    const map = buildRecommendedByMaterial({ goodCoatings: { steel: "TiAlN", aluminum: ["DLC"] } });
    expect(map.steel).toBeUndefined();
    expect(map.aluminum).toEqual(["DLC"]);
  });
});

describe("buildCoatingCatalog -- curated fail-soft branch (R12: degrade honestly, never silent-empty)", () => {
  it("returns the curated set with honest source/liveCount when the DB is null", () => {
    const cat = buildCoatingCatalog(null);
    expect(cat.source).toBe("curated");
    expect(cat.liveCount).toBe(0);
    expect(cat.options.length).toBe(7); // CURATED_FALLBACK size
    expect(cat.total).toBe(7);
    expect(cat.fallbackCount).toBe(7);
    expect(cat.note.toLowerCase()).toContain("curated");
    // never a silent empty
    expect(cat.options.length).toBeGreaterThan(0);
    // curated set still carries the canonical families a shop always has
    expect(cat.options.map((o) => o.id)).toContain("tialn");
    expect(cat.options.map((o) => o.id)).toContain("uncoated");
  });

  it("falls back to curated for an empty / PRISM_COATINGS_COMPLETE-less DB", () => {
    expect(buildCoatingCatalog({ stores: {} }).source).toBe("curated");
    expect(buildCoatingCatalog({ stores: { PRISM_COATINGS_COMPLETE: {} } }).liveCount).toBe(0);
    expect(buildCoatingCatalog({}).source).toBe("curated");
  });

  it("reports source=database when given a populated DB object", () => {
    const cat = buildCoatingCatalog({
      stores: { PRISM_COATINGS_COMPLETE: { TiAlN: { category: "pvd", hardness_hv: 3300, max_temp_c: 800, friction_coef: 0.35, cost_factor: 1.5 } } },
    });
    expect(cat.source).toBe("database");
    expect(cat.liveCount).toBe(1);
    expect(cat.fallbackCount).toBe(0);
    expect(cat.options[0].id).toBe("tialn");
  });
});

describe("getCalculatorCoatingCatalog -- live round-trip against the real reference DB", () => {
  beforeEach(() => resetCoatingCatalogCacheForTest());

  it("loads a populated live catalog with the known canonical coatings", () => {
    const cat = getCalculatorCoatingCatalog();
    expect(cat.source).toBe("database");
    expect(cat.liveCount).toBeGreaterThan(40); // PRISM_COATINGS_COMPLETE carries ~60
    expect(cat.total).toBe(cat.liveCount);
    expect(cat.fallbackCount).toBe(0);

    const tialn = cat.options.find((o) => o.id === "tialn")!;
    expect(tialn.maxTempC).toBe(800); // canonical TiAlN thermal limit from the DB
    expect(tialn.category).toBe("pvd");

    // Every option must be select-renderable (no empty id/label/detail) -- completeness.
    for (const o of cat.options) {
      expect(o.id.length).toBeGreaterThan(0);
      expect(o.label.length).toBeGreaterThan(0);
      expect(o.detail.length).toBeGreaterThan(0);
    }
  });

  it("surfaces material-aware recommendations from goodCoatings", () => {
    const cat = getCalculatorCoatingCatalog();
    expect(Object.keys(cat.recommendedByMaterial).length).toBeGreaterThan(0);
    expect(Array.isArray(cat.recommendedByMaterial.steel)).toBe(true);
    expect(cat.recommendedByMaterial.steel.some((c) => /TiAlN/i.test(c))).toBe(true);
  });
});
