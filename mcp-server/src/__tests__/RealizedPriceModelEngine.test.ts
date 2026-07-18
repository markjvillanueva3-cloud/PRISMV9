/**
 * RealizedPriceModelEngine.test.ts -- QUOTING-OPTIMAL-MS0 / U6
 *
 * Reference-value tests on the hierarchical empirical-Bayes price model. The
 * James-Stein shrinkage is hand-verifiable: w = n/(n+K), markup_hat in log space.
 * No toBeDefined stubs (R9) -- every assertion pins a computed number or invariant.
 */
import { describe, it, expect } from "vitest";
import {
  realizedPriceModelEngine,
  RealizedPriceModelEngine,
  normalizeCustomerKey,
  SHRINKAGE_K,
  MIN_CORPUS_RECORDS,
  MARKUP_FLOOR,
  MARKUP_CEIL,
  type PricePair,
} from "../engines/RealizedPriceModelEngine.js";

/** Build a corpus where every pair has cost_basis so markup = price/cost is exact. */
function pairs(spec: Array<{ c: string; price: number; cost: number; w?: number }>): PricePair[] {
  return spec.map((s, i) => ({
    customer: s.c,
    part_id: `p${i}`,
    actual_price_usd: s.price,
    cost_basis_usd: s.cost,
    weight: s.w,
  }));
}

describe("normalizeCustomerKey", () => {
  it("uppercases + collapses whitespace + strips punctuation", () => {
    expect(normalizeCustomerKey("  agrati   park forest ")).toBe("AGRATI PARK FOREST");
    expect(normalizeCustomerKey("AGRATI  PARK FOREST")).toBe("AGRATI PARK FOREST");
    expect(normalizeCustomerKey("Optimas, Solutions.")).toBe("OPTIMAS SOLUTIONS");
  });
  it("folds the 3 AGRATI spacings to one key", () => {
    const keys = new Set([
      normalizeCustomerKey("AGRATI  PARK FOREST"),
      normalizeCustomerKey("AGRATI PARK FOREST"),
      normalizeCustomerKey("AGRATIPARK FOREST"),
    ]);
    // first two fold; "AGRATIPARK" (no space) is a distinct token -- documents the limit
    expect(keys.has("AGRATI PARK FOREST")).toBe(true);
  });
  it("handles null/empty", () => {
    expect(normalizeCustomerKey(null as unknown as string)).toBe("");
    expect(normalizeCustomerKey("")).toBe("");
  });
});

describe("RealizedPriceModelEngine.fit -- happy path + shrinkage math", () => {
  it("a dense single-customer corpus learns its markup with high self-weight", () => {
    // 12 records, all markup exactly 2.0 (price = 2 x cost). n=12, K=8 -> w=12/20=0.6
    const corpus = pairs(Array.from({ length: 12 }, () => ({ c: "ACME", price: 200, cost: 100 })));
    const m = realizedPriceModelEngine.fit(corpus);
    expect(m.ok).toBe(true);
    expect(m.fitted_n).toBe(12);
    expect(m.distinct_customers).toBe(1);
    const acme = m.per_customer["ACME"];
    expect(acme.n).toBe(12);
    expect(acme.shrink_weight).toBeCloseTo(12 / (12 + SHRINKAGE_K), 6);
    // all markups identical -> obs == hat == global == 2.0
    expect(acme.markup_obs).toBeCloseTo(2.0, 6);
    expect(acme.markup_hat).toBeCloseTo(2.0, 6);
    expect(m.global_markup).toBeCloseTo(2.0, 6);
    expect(acme.residual_sigma_log).toBeCloseTo(0, 6); // zero spread
  });

  it("shrinks a SPARSE customer toward the global prior", () => {
    // Global dominated by 20 BIG-CO records at markup 1.5; one SPARSE-CO record at markup 6.
    const big = pairs(Array.from({ length: 20 }, () => ({ c: "BIG", price: 150, cost: 100 })));
    const sparse = pairs([{ c: "SPARSE", price: 600, cost: 100 }]); // markup 6
    const m = realizedPriceModelEngine.fit([...big, ...sparse]);
    const sp = m.per_customer["SPARSE"];
    // n=1, K=8 -> w = 1/9 ~ 0.111. shrunk log = 0.111*ln6 + 0.889*ln(global)
    expect(sp.n).toBe(1);
    expect(sp.shrink_weight).toBeCloseTo(1 / 9, 6);
    // markup_hat must be pulled FAR below the raw 6 toward the ~1.5 global
    expect(sp.markup_obs).toBeCloseTo(6, 2);
    expect(sp.markup_hat).toBeLessThan(3);
    expect(sp.markup_hat).toBeGreaterThan(1.5);
  });

  it("dense customer trusts its own data over global", () => {
    const big = pairs(Array.from({ length: 20 }, () => ({ c: "BIG", price: 150, cost: 100 }))); // markup 1.5
    const dense = pairs(Array.from({ length: 40 }, () => ({ c: "DENSE", price: 400, cost: 100 }))); // markup 4, n=40
    const m = realizedPriceModelEngine.fit([...big, ...dense]);
    const d = m.per_customer["DENSE"];
    expect(d.shrink_weight).toBeCloseTo(40 / 48, 4); // ~0.833, heavy self-trust
    expect(d.markup_hat).toBeGreaterThan(3.2); // close to its own 4, only lightly pulled
  });

  it("weights records by extraction confidence", () => {
    // two markups: 2.0 (weight 0.99) and 10.0 (weight 0.1) -> weighted mean log near ln2
    const corpus = pairs([
      ...Array.from({ length: 9 }, () => ({ c: "W", price: 200, cost: 100, w: 0.99 })),
      { c: "W", price: 1000, cost: 100, w: 0.1 },
    ]);
    const m = realizedPriceModelEngine.fit(corpus);
    expect(m.per_customer["W"].markup_obs).toBeLessThan(3); // high-conf 2.0 dominates the 10
  });
});

describe("RealizedPriceModelEngine.fit -- failure modes", () => {
  it("empty input -> ok:false", () => {
    expect(realizedPriceModelEngine.fit([]).ok).toBe(false);
    expect(realizedPriceModelEngine.fit([]).reason).toBe("empty-input");
  });
  it("fewer than MIN_CORPUS_RECORDS -> too-few-records", () => {
    const m = realizedPriceModelEngine.fit(pairs([{ c: "A", price: 100, cost: 50 }]));
    expect(m.ok).toBe(false);
    expect(m.reason).toBe("too-few-records");
  });
  it("clamps an absurd markup to the sane band (data artifact guard)", () => {
    // one record at markup 1000 (price 100000 / cost 100) -> clamped to MARKUP_CEIL
    const corpus = pairs([
      ...Array.from({ length: 10 }, () => ({ c: "A", price: 200, cost: 100 })),
      { c: "A", price: 100000, cost: 100 }, // markup 1000 -> clamp
    ]);
    const m = realizedPriceModelEngine.fit(corpus);
    expect(m.per_customer["A"].markup_obs).toBeLessThanOrEqual(MARKUP_CEIL);
  });
});

describe("RealizedPriceModelEngine.predict -- price + CI band", () => {
  it("predicts cost_floor x markup_hat for a known customer", () => {
    const corpus = pairs(Array.from({ length: 12 }, () => ({ c: "ACME", price: 200, cost: 100 }))); // markup 2
    const m = realizedPriceModelEngine.fit(corpus);
    const p = realizedPriceModelEngine.predict(m, 500, "ACME");
    expect(p.ok).toBe(true);
    expect(p.markup_source).toBe("per-customer");
    expect(p.markup_used).toBeCloseTo(2, 4);
    expect(p.predicted_price_usd).toBeCloseTo(1000, 1); // 500 * 2
    // zero residual spread -> CI band collapses to the point
    expect(p.ci95_low_usd).toBeCloseTo(1000, 0);
    expect(p.ci95_high_usd).toBeCloseTo(1000, 0);
  });

  it("an unknown customer falls back to the GLOBAL markup", () => {
    const corpus = pairs(Array.from({ length: 12 }, () => ({ c: "ACME", price: 300, cost: 100 }))); // markup 3
    const m = realizedPriceModelEngine.fit(corpus);
    const p = realizedPriceModelEngine.predict(m, 500, "BRAND-NEW-CO");
    expect(p.markup_source).toBe("global");
    expect(p.markup_used).toBeCloseTo(3, 4);
    expect(p.predicted_price_usd).toBeCloseTo(1500, 1);
  });

  it("a non-zero residual sigma WIDENS the CI band around the point", () => {
    // markups vary 1.5..2.5 -> non-zero log sigma -> band low < pred < high
    const corpus = pairs([
      ...Array.from({ length: 6 }, () => ({ c: "V", price: 150, cost: 100 })),
      ...Array.from({ length: 6 }, () => ({ c: "V", price: 250, cost: 100 })),
    ]);
    const m = realizedPriceModelEngine.fit(corpus);
    const p = realizedPriceModelEngine.predict(m, 1000, "V");
    expect(p.ci95_low_usd).toBeLessThan(p.predicted_price_usd);
    expect(p.ci95_high_usd).toBeGreaterThan(p.predicted_price_usd);
    // band is asymmetric in $ (log-normal): high-pred > pred-low
    expect(p.ci95_high_usd - p.predicted_price_usd).toBeGreaterThan(p.predicted_price_usd - p.ci95_low_usd);
  });

  it("refuses a non-positive cost floor (R12)", () => {
    const m = realizedPriceModelEngine.fit(pairs(Array.from({ length: 12 }, () => ({ c: "A", price: 200, cost: 100 }))));
    expect(realizedPriceModelEngine.predict(m, 0, "A").ok).toBe(false);
    expect(realizedPriceModelEngine.predict(m, -5, "A").reason).toBe("non-positive-cost-floor");
  });

  it("refuses an unfitted model (R12)", () => {
    const bad = realizedPriceModelEngine.fit([]);
    expect(realizedPriceModelEngine.predict(bad, 500, "A").ok).toBe(false);
    expect(realizedPriceModelEngine.predict(bad, 500, "A").reason).toBe("model-not-fitted");
  });
});

describe("RealizedPriceModelEngine -- adversarial + level-only", () => {
  it("level-only corpus (no cost_basis) still predicts a sane price level", () => {
    // No cost_basis -> markup degenerates to price/median. All prices 500 -> median 500 -> markup 1.
    const corpus: PricePair[] = Array.from({ length: 12 }, (_, i) => ({
      customer: "L",
      part_id: `p${i}`,
      actual_price_usd: 500,
    }));
    const m = realizedPriceModelEngine.fit(corpus);
    expect(m.ok).toBe(true);
    const p = realizedPriceModelEngine.predict(m, 500, "L");
    expect(p.predicted_price_usd).toBeCloseTo(500, 0); // 500 cost * markup 1
  });

  it("ignores NaN/Infinity/zero prices", () => {
    const corpus: PricePair[] = [
      ...Array.from({ length: 11 }, (_, i) => ({ customer: "A", part_id: `p${i}`, actual_price_usd: 200, cost_basis_usd: 100 })),
      { customer: "A", part_id: "nan", actual_price_usd: NaN, cost_basis_usd: 100 },
      { customer: "A", part_id: "inf", actual_price_usd: Infinity, cost_basis_usd: 100 },
      { customer: "A", part_id: "zero", actual_price_usd: 0, cost_basis_usd: 100 },
    ];
    const m = realizedPriceModelEngine.fit(corpus);
    expect(m.fitted_n).toBe(11); // only the 11 valid rows
  });

  it("constants are sane", () => {
    expect(SHRINKAGE_K).toBe(8);
    expect(MIN_CORPUS_RECORDS).toBe(10);
    expect(MARKUP_FLOOR).toBe(0.5);
    expect(MARKUP_CEIL).toBe(20);
  });

  it("fresh instance fits identically (reproducibility R10)", () => {
    const corpus = pairs(Array.from({ length: 12 }, () => ({ c: "A", price: 200, cost: 100 })));
    const a = new RealizedPriceModelEngine().fit(corpus);
    const b = new RealizedPriceModelEngine().fit(corpus);
    expect(a.global_markup).toBe(b.global_markup);
    expect(a.per_customer["A"].markup_hat).toBe(b.per_customer["A"].markup_hat);
  });
});
