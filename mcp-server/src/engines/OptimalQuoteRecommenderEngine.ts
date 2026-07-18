/**
 * OptimalQuoteRecommenderEngine -- QUOTING-OPTIMAL-MS0 / U7 (Layer B "predict + recommend")
 *
 * The composing head of the two-layer optimal-quote algorithm. Given a Layer-A cost floor
 * and a customer, it returns BOTH:
 *
 *   1. PREDICTED PRICE -- what the part will realistically quote/sell at, from
 *      RealizedPriceModelEngine (U6, fit on 1,787 real settled prices), with an honest
 *      log-normal CI band. ALWAYS returned (we have won-order data for this).
 *
 *   2. PROFIT-OPTIMAL PRICE -- the price that maximizes margin x P(win), from
 *      BidWinCalibratorEngine's logistic win-probability curve. Returned ONLY when the
 *      win/loss training data is SUFFICIENT (both won AND lost bids, >= minBothClasses each).
 *      Otherwise suppressed with reason "insufficient-win-loss-data" -- a logistic curve fit
 *      on won-only data is meaningless (P(win) -> 1 everywhere). This is the operator's
 *      decision: "Both: predict + recommend ... ship the predictor first, the optimizer when
 *      win-data is sufficient." (2026-06-30 AskUserQuestion.)
 *
 * WHY suppression matters (measured): orders-closed-actuals.jsonl is 6,718 records, ALL
 * actual_source=closed_order (WON). There are ZERO lost bids. Fabricating a win-probability
 * curve from won-only data would recommend an arbitrarily high markup (the model would never
 * see a loss). Fail-honest until lost-bid capture lands (a quote-status producer, separate unit).
 *
 * Per R5 (model-for-judgment): pure deterministic composition, no LLM. Per R12 (fail-loud):
 * the recommendation is null+reason'd when data is thin, never faked. Injectable deps for tests.
 *
 * @milestone QUOTING-OPTIMAL-MS0/U7-OPTIMAL-QUOTE-RECOMMENDER
 * @author slot:juliett (build-it-all-here), 2026-06-30
 */

import {
  realizedPriceModelEngine,
  type PriceModel,
  type PricePrediction,
} from "./RealizedPriceModelEngine.js";

// ---- Win-data sufficiency gate ----

/** Minimum records of EACH class (won + lost) before the win-prob curve is trusted. */
export const MIN_BOTH_CLASSES_FOR_OPTIMIZER = 10;

/** Win/loss class counts from whatever feeds BidWinCalibratorEngine. */
export interface WinLossCounts {
  won: number;
  lost: number;
}

/** The profit-optimal markup result shape (mirrors BidWinCalibratorEngine.optimalMarkup). */
export interface ProfitOptimalResult {
  markup_pct: number;
  p_win: number;
  expected_contribution_cents: number;
}

/**
 * Injectable optimizer dep -- the live impl wraps BidWinCalibratorEngine.optimalMarkup().
 * Returns null when the calibrator is not fittable (keeps this engine test-pure).
 */
export interface MarkupOptimizer {
  /** Current win/loss training counts (drives the sufficiency gate). */
  counts(): WinLossCounts;
  /** argmax margin x P(win) for the given cost + customer tier + qty, or null if unfittable. */
  optimal(args: { cost_estimate_cents: number; tier_score: number; quantity: number }): ProfitOptimalResult | null;
}

export interface RecommendInput {
  cost_floor_usd: number;
  customer: string;
  /** Customer relationship strength 0..1 (cold lead -> anchor account). Default 0.5. */
  tier_score?: number;
  quantity?: number;
}

export interface OptimalQuoteRecommendation {
  ok: boolean;
  reason?: string;
  customer_key: string;
  cost_floor_usd: number;
  // Layer B (1): the data-grounded realized-price prediction (ALWAYS present when ok).
  predicted_price_usd: number;
  ci95_low_usd: number;
  ci95_high_usd: number;
  markup_used: number;
  markup_source: PricePrediction["markup_source"];
  n_customer: number;
  // Layer B (2): the profit-optimal recommendation -- null when win-data is insufficient.
  profit_optimal: {
    price_usd: number;
    markup_pct: number;
    p_win: number;
    expected_contribution_usd: number;
  } | null;
  profit_optimal_reason: string; // "ok" | "insufficient-win-loss-data" | "optimizer-unfittable"
}

export class OptimalQuoteRecommenderEngine {
  /**
   * Compose the realized-price prediction (U6) + the profit-optimal recommendation (BidWin),
   * with the win-data-sufficiency gate.
   *
   * @param model  a fitted RealizedPriceModel (U6 output)
   * @param input  cost floor + customer + tier + qty
   * @param optimizer optional markup optimizer (live: wraps BidWinCalibratorEngine). When
   *                  omitted or counts are thin, profit_optimal is suppressed (fail-honest).
   */
  recommend(model: PriceModel, input: RecommendInput, optimizer?: MarkupOptimizer): OptimalQuoteRecommendation {
    const pred: PricePrediction = realizedPriceModelEngine.predict(
      model,
      input?.cost_floor_usd,
      input?.customer ?? "",
    );

    const base: OptimalQuoteRecommendation = {
      ok: pred.ok,
      reason: pred.reason,
      customer_key: pred.customer_key,
      cost_floor_usd: pred.cost_floor_usd,
      predicted_price_usd: pred.predicted_price_usd,
      ci95_low_usd: pred.ci95_low_usd,
      ci95_high_usd: pred.ci95_high_usd,
      markup_used: pred.markup_used,
      markup_source: pred.markup_source,
      n_customer: pred.n_customer,
      profit_optimal: null,
      profit_optimal_reason: "insufficient-win-loss-data",
    };

    if (!pred.ok) return base;

    // ---- Profit-optimal half: gated on win/loss data sufficiency ----
    if (!optimizer) {
      return { ...base, profit_optimal_reason: "insufficient-win-loss-data" };
    }
    const counts = optimizer.counts();
    const sufficient =
      counts &&
      counts.won >= MIN_BOTH_CLASSES_FOR_OPTIMIZER &&
      counts.lost >= MIN_BOTH_CLASSES_FOR_OPTIMIZER;
    if (!sufficient) {
      return { ...base, profit_optimal_reason: "insufficient-win-loss-data" };
    }

    const tier = clamp01(input.tier_score ?? 0.5);
    const qty = Math.max(1, Math.floor(input.quantity ?? 1));
    const costCents = Math.max(1, Math.round(input.cost_floor_usd * 100));

    const opt = optimizer.optimal({ cost_estimate_cents: costCents, tier_score: tier, quantity: qty });
    if (!opt) {
      return { ...base, profit_optimal_reason: "optimizer-unfittable" };
    }

    const optimalPrice = (input.cost_floor_usd) * (1 + opt.markup_pct);
    return {
      ...base,
      profit_optimal: {
        price_usd: Math.round(optimalPrice * 100) / 100,
        markup_pct: opt.markup_pct,
        p_win: opt.p_win,
        expected_contribution_usd: Math.round(opt.expected_contribution_cents) / 100,
      },
      profit_optimal_reason: "ok",
    };
  }
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0.5;
  return Math.min(1, Math.max(0, x));
}

export const optimalQuoteRecommenderEngine = new OptimalQuoteRecommenderEngine();
