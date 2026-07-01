/**
 * OptimalQuoteRecommenderEngine.test.ts -- QUOTING-OPTIMAL-MS0 / U7
 *
 * Verifies the "predict + recommend" composition and -- critically -- the
 * fail-honest suppression of the profit-optimal recommendation when win/loss
 * data is insufficient (the real corpus is won-only). No stubs (R9).
 */
import { describe, it, expect } from "vitest";
import {
  optimalQuoteRecommenderEngine,
  OptimalQuoteRecommenderEngine,
  MIN_BOTH_CLASSES_FOR_OPTIMIZER,
  type MarkupOptimizer,
} from "../engines/OptimalQuoteRecommenderEngine.js";
import { realizedPriceModelEngine, type PricePair } from "../engines/RealizedPriceModelEngine.js";

function fittedModel(markup = 2): ReturnType<typeof realizedPriceModelEngine.fit> {
  // 12 ACME records at the given markup -> per-customer markup_hat ~= markup
  const pairs: PricePair[] = Array.from({ length: 12 }, (_, i) => ({
    customer: "ACME",
    part_id: `p${i}`,
    actual_price_usd: 100 * markup,
    cost_basis_usd: 100,
  }));
  return realizedPriceModelEngine.fit(pairs);
}

/** A test optimizer with controllable win/loss counts + a fixed optimal markup. */
function makeOptimizer(won: number, lost: number, optimalMarkupPct = 0.4): MarkupOptimizer {
  return {
    counts: () => ({ won, lost }),
    optimal: ({ cost_estimate_cents }) => ({
      markup_pct: optimalMarkupPct,
      p_win: 0.6,
      expected_contribution_cents: cost_estimate_cents * optimalMarkupPct * 0.6,
    }),
  };
}

describe("OptimalQuoteRecommenderEngine -- predicted price (always present)", () => {
  it("returns the U6 predicted price + CI band for a known customer", () => {
    const m = fittedModel(2);
    const r = optimalQuoteRecommenderEngine.recommend(m, { cost_floor_usd: 500, customer: "ACME" });
    expect(r.ok).toBe(true);
    expect(r.predicted_price_usd).toBeCloseTo(1000, 0); // 500 * markup 2
    expect(r.markup_source).toBe("per-customer");
    expect(r.ci95_low_usd).toBeLessThanOrEqual(r.predicted_price_usd);
    expect(r.ci95_high_usd).toBeGreaterThanOrEqual(r.predicted_price_usd);
  });

  it("refuses a non-positive cost floor (propagates U6 fail-loud)", () => {
    const m = fittedModel(2);
    const r = optimalQuoteRecommenderEngine.recommend(m, { cost_floor_usd: 0, customer: "ACME" });
    expect(r.ok).toBe(false);
    expect(r.profit_optimal).toBeNull();
  });

  it("refuses an unfitted model", () => {
    const bad = realizedPriceModelEngine.fit([]);
    const r = optimalQuoteRecommenderEngine.recommend(bad, { cost_floor_usd: 500, customer: "ACME" });
    expect(r.ok).toBe(false);
  });
});

describe("OptimalQuoteRecommenderEngine -- profit-optimal SUPPRESSION (fail-honest)", () => {
  it("suppresses the recommendation when NO optimizer is supplied", () => {
    const m = fittedModel(2);
    const r = optimalQuoteRecommenderEngine.recommend(m, { cost_floor_usd: 500, customer: "ACME" });
    expect(r.profit_optimal).toBeNull();
    expect(r.profit_optimal_reason).toBe("insufficient-win-loss-data");
    // but the predicted price is STILL there -- the data we have is used
    expect(r.predicted_price_usd).toBeGreaterThan(0);
  });

  it("suppresses with WON-ONLY data (the real corpus situation)", () => {
    const m = fittedModel(2);
    const wonOnly = makeOptimizer(6718, 0); // every record is a closed/won order
    const r = optimalQuoteRecommenderEngine.recommend(m, { cost_floor_usd: 500, customer: "ACME" }, wonOnly);
    expect(r.profit_optimal).toBeNull();
    expect(r.profit_optimal_reason).toBe("insufficient-win-loss-data");
  });

  it("suppresses when EITHER class is below the threshold", () => {
    const m = fittedModel(2);
    const thinLost = makeOptimizer(50, MIN_BOTH_CLASSES_FOR_OPTIMIZER - 1);
    const thinWon = makeOptimizer(MIN_BOTH_CLASSES_FOR_OPTIMIZER - 1, 50);
    expect(optimalQuoteRecommenderEngine.recommend(m, { cost_floor_usd: 500, customer: "ACME" }, thinLost).profit_optimal).toBeNull();
    expect(optimalQuoteRecommenderEngine.recommend(m, { cost_floor_usd: 500, customer: "ACME" }, thinWon).profit_optimal).toBeNull();
  });
});

describe("OptimalQuoteRecommenderEngine -- profit-optimal ACTIVE (sufficient data)", () => {
  it("surfaces the recommendation when both classes are sufficient", () => {
    const m = fittedModel(2);
    const opt = makeOptimizer(50, 50, 0.4);
    const r = optimalQuoteRecommenderEngine.recommend(m, { cost_floor_usd: 1000, customer: "ACME", tier_score: 0.7, quantity: 5 }, opt);
    expect(r.profit_optimal_reason).toBe("ok");
    expect(r.profit_optimal).not.toBeNull();
    // optimal price = cost_floor * (1 + markup_pct) = 1000 * 1.4
    expect(r.profit_optimal!.price_usd).toBeCloseTo(1400, 0);
    expect(r.profit_optimal!.markup_pct).toBeCloseTo(0.4, 4);
    expect(r.profit_optimal!.p_win).toBeCloseTo(0.6, 4);
    // both numbers are returned: data-grounded prediction AND profit-optimal
    expect(r.predicted_price_usd).toBeGreaterThan(0);
  });

  it("returns optimizer-unfittable when counts pass but optimal() returns null", () => {
    const m = fittedModel(2);
    const unfittable: MarkupOptimizer = { counts: () => ({ won: 50, lost: 50 }), optimal: () => null };
    const r = optimalQuoteRecommenderEngine.recommend(m, { cost_floor_usd: 500, customer: "ACME" }, unfittable);
    expect(r.profit_optimal).toBeNull();
    expect(r.profit_optimal_reason).toBe("optimizer-unfittable");
  });

  it("clamps tier_score and floors quantity before optimizing", () => {
    const m = fittedModel(2);
    let seen: { tier_score: number; quantity: number } | null = null;
    const spy: MarkupOptimizer = {
      counts: () => ({ won: 50, lost: 50 }),
      optimal: (a) => { seen = { tier_score: a.tier_score, quantity: a.quantity }; return { markup_pct: 0.3, p_win: 0.5, expected_contribution_cents: 100 }; },
    };
    optimalQuoteRecommenderEngine.recommend(m, { cost_floor_usd: 500, customer: "ACME", tier_score: 5, quantity: 0.4 }, spy);
    expect(seen!.tier_score).toBe(1); // clamped to [0,1]
    expect(seen!.quantity).toBe(1); // floored to >= 1
  });
});

describe("OptimalQuoteRecommenderEngine -- constants + instance", () => {
  it("MIN_BOTH_CLASSES_FOR_OPTIMIZER is 10", () => {
    expect(MIN_BOTH_CLASSES_FOR_OPTIMIZER).toBe(10);
  });
  it("fresh instance behaves identically", () => {
    const m = fittedModel(3);
    const r = new OptimalQuoteRecommenderEngine().recommend(m, { cost_floor_usd: 200, customer: "ACME" });
    expect(r.predicted_price_usd).toBeCloseTo(600, 0); // 200 * 3
  });
});
