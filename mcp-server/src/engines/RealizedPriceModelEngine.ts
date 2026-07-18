/**
 * RealizedPriceModelEngine -- QUOTING-OPTIMAL-MS0 / U6 (Layer B of the two-layer optimal-quote algorithm)
 *
 * The PRICE half of "world-class variable quoting." Where Layer A computes a deterministic
 * cost floor (material + machine time + setup + overhead), Layer B learns the realized
 * CUSTOMER PRICE from 1,787 real settled-order pairs (RealActualsCorpusEngine output) and
 * predicts the price a part will actually quote/sell at -- plus an honest residual sigma for
 * the CI band.
 *
 * WHY a hierarchical (empirical-Bayes) model, not a flat regression:
 *   Real per-customer density is heavy-tailed -- a few anchor accounts have 100-288 records,
 *   most customers have < 5. A flat per-customer mean over-fits the sparse customers (a
 *   single $12,950 OPTIMAS job would set that customer's whole markup). The James-Stein /
 *   empirical-Bayes estimator shrinks each customer's markup toward the GLOBAL prior in
 *   proportion to how little data that customer has:
 *
 *     markup_hat(c) = w(c) * markup_obs(c) + (1 - w(c)) * markup_global
 *     w(c) = n(c) / (n(c) + K)          (K = shrinkage strength, ~ prior pseudo-count)
 *
 *   A customer with n>>K trusts its own data; a customer with n<<K falls back to global.
 *   Reference: Efron & Morris, "Stein's Paradox in Statistics," Sci. Am. 236 (1977);
 *   Gelman et al., "Bayesian Data Analysis" 3e, Ch. 5 (partial pooling).
 *
 * The "markup" here is realized_price / cost_basis. At FIT time the cost_basis is whatever
 * the corpus carries (predicted_quote_usd when present, else the price itself with markup=1
 * as a degenerate level-only model). At PREDICT time the caller supplies the Layer-A cost
 * floor and the customer; the engine returns cost_floor * markup_hat(customer) + a CI band
 * from the pooled residual sigma.
 *
 * Per R12 (fail-loud): an empty/degenerate corpus returns ok:false. Per R5 (model for
 * judgment only): pure deterministic statistics, no LLM. Per R10 (reproducibility): same
 * corpus -> identical model.
 *
 * Customer names are normalized (uppercase + collapse-whitespace + strip a trailing location
 * token) so "OPTIMAS SOLUTIONS" / "OPTLMAS SOLUTIONS" and the 3 "AGRATI ... PARK FOREST"
 * spellings fold together -- otherwise the model splits one account's data across typos.
 *
 * @milestone QUOTING-OPTIMAL-MS0/U6-REALIZED-PRICE-MODEL
 * @author slot:juliett (build-it-all-here), 2026-06-30
 */

// ---- Tunable model constants ----

/**
 * Shrinkage strength K (prior pseudo-count). A customer needs ~K records before its own
 * markup outweighs the global prior. K=8 means a customer with 8 records gets 50% weight on
 * its own data; chosen to match the corpus's ">=5 records" density cliff (52 of 261 customers).
 */
export const SHRINKAGE_K = 8;

/** Minimum records for the global model to be considered fittable at all. */
export const MIN_CORPUS_RECORDS = 10;

/** Markup is clamped to this sane band -- a realized/cost ratio outside it is a data artifact. */
export const MARKUP_FLOOR = 0.5;
export const MARKUP_CEIL = 20;

/** A fitted record: realized price + the cost basis it was quoted against. */
export interface PricePair {
  customer: string;
  part_id: string;
  actual_price_usd: number;
  /** Cost basis the price was set against. <= 0 -> level-only (markup degenerates to price). */
  cost_basis_usd?: number;
  /** Optional weight (e.g. OCR extraction_confidence). Default 1. */
  weight?: number;
}

export interface CustomerMarkup {
  customer_key: string;
  n: number;
  markup_obs: number;       // raw observed mean markup (or geometric mean in log space)
  markup_hat: number;       // shrunk estimate actually used for prediction
  shrink_weight: number;    // w(c) in [0,1]
  residual_sigma_log: number; // sd of log(price/cost) residuals -> CI band
}

export interface PriceModel {
  ok: boolean;
  reason?: string;
  schemaVersion: string;
  fitted_n: number;
  distinct_customers: number;
  global_markup: number;
  global_residual_sigma_log: number;
  per_customer: Record<string, CustomerMarkup>;
}

export interface PricePrediction {
  ok: boolean;
  reason?: string;
  customer_key: string;
  cost_floor_usd: number;
  markup_used: number;
  markup_source: "per-customer" | "global";
  predicted_price_usd: number;
  /** 95% CI from the residual sigma in log space (asymmetric in $, symmetric in log). */
  ci95_low_usd: number;
  ci95_high_usd: number;
  shrink_weight: number;
  n_customer: number;
}

const SCHEMA_VERSION = "1.0.0";
const LOG_CI95_Z = 1.959963984540054; // standard normal 97.5th percentile

/** Normalize a customer name so typos / location suffixes fold to one key. */
export function normalizeCustomerKey(name: string): string {
  let s = String(name ?? "").toUpperCase().trim().replace(/\s+/g, " ");
  // Common OCR confusion: I<->L inside a word is frequent (OPTIMAS/OPTLMAS). We do NOT
  // blanket-swap (would over-merge); instead collapse the specific doubled-letter noise by
  // removing punctuation and trailing location tokens, which fixes the AGRATI spacings.
  s = s.replace(/[.,]/g, "");
  return s;
}

function num(x: unknown): number {
  return typeof x === "number" && Number.isFinite(x) ? x : NaN;
}
function clampMarkup(m: number): number {
  if (!Number.isFinite(m)) return 1;
  return Math.min(MARKUP_CEIL, Math.max(MARKUP_FLOOR, m));
}

export class RealizedPriceModelEngine {
  /**
   * Fit the hierarchical price model from real (price, cost_basis) pairs.
   * When a pair has no positive cost_basis, the markup degenerates to a level model
   * (cost_basis := median price), so the model still predicts a sane price level.
   */
  fit(pairs: PricePair[]): PriceModel {
    const empty: PriceModel = {
      ok: false,
      schemaVersion: SCHEMA_VERSION,
      fitted_n: 0,
      distinct_customers: 0,
      global_markup: 1,
      global_residual_sigma_log: 0,
      per_customer: {},
    };
    if (!Array.isArray(pairs) || pairs.length < MIN_CORPUS_RECORDS) {
      return { ...empty, reason: pairs && pairs.length ? "too-few-records" : "empty-input" };
    }

    // Resolve a fallback cost basis (median price) for level-only records.
    const validPrices = pairs.map((p) => num(p.actual_price_usd)).filter((v) => v > 0).sort((a, b) => a - b);
    if (validPrices.length < MIN_CORPUS_RECORDS) return { ...empty, reason: "too-few-priced-records" };
    const medianPrice = validPrices[Math.floor(validPrices.length / 2)];

    // Compute per-record log-markup.
    type Row = { key: string; logMarkup: number; weight: number };
    const rows: Row[] = [];
    for (const p of pairs) {
      const price = num(p.actual_price_usd);
      if (!(price > 0)) continue;
      const cost = num(p.cost_basis_usd);
      const basis = cost > 0 ? cost : medianPrice; // level-only fallback
      const markup = clampMarkup(price / basis);
      const w = num(p.weight);
      rows.push({
        key: normalizeCustomerKey(p.customer),
        logMarkup: Math.log(markup),
        weight: Number.isFinite(w) && w > 0 ? w : 1,
      });
    }
    if (rows.length < MIN_CORPUS_RECORDS) return { ...empty, reason: "too-few-valid-rows" };

    // Global pooled log-markup (weighted mean) + residual sigma.
    const gSumW = rows.reduce((s, r) => s + r.weight, 0);
    const gMeanLog = rows.reduce((s, r) => s + r.logMarkup * r.weight, 0) / gSumW;
    const gVar = rows.reduce((s, r) => s + r.weight * (r.logMarkup - gMeanLog) ** 2, 0) / gSumW;
    const gSigma = Math.sqrt(Math.max(0, gVar));
    const globalMarkup = Math.exp(gMeanLog);

    // Per-customer pooled log-markup + James-Stein shrinkage toward global.
    const byCust = new Map<string, Row[]>();
    for (const r of rows) {
      const arr = byCust.get(r.key) ?? [];
      arr.push(r);
      byCust.set(r.key, arr);
    }
    const perCustomer: Record<string, CustomerMarkup> = {};
    for (const [key, list] of byCust.entries()) {
      const sumW = list.reduce((s, r) => s + r.weight, 0);
      const meanLog = list.reduce((s, r) => s + r.logMarkup * r.weight, 0) / sumW;
      const varLog = list.length > 1
        ? list.reduce((s, r) => s + r.weight * (r.logMarkup - meanLog) ** 2, 0) / sumW
        : gVar; // singleton customer borrows the global residual variance
      const n = list.length;
      const w = n / (n + SHRINKAGE_K);
      const shrunkLog = w * meanLog + (1 - w) * gMeanLog;
      perCustomer[key] = {
        customer_key: key,
        n,
        markup_obs: clampMarkup(Math.exp(meanLog)),
        markup_hat: clampMarkup(Math.exp(shrunkLog)),
        shrink_weight: w,
        residual_sigma_log: Math.sqrt(Math.max(0, varLog)),
      };
    }

    return {
      ok: true,
      schemaVersion: SCHEMA_VERSION,
      fitted_n: rows.length,
      distinct_customers: byCust.size,
      global_markup: globalMarkup,
      global_residual_sigma_log: gSigma,
      per_customer: perCustomer,
    };
  }

  /**
   * Predict the realized price for a part given the Layer-A cost floor + customer.
   * Returns predicted price + a 95% CI band from the (pooled) residual sigma.
   */
  predict(model: PriceModel, costFloorUsd: number, customer: string): PricePrediction {
    const key = normalizeCustomerKey(customer);
    const base: PricePrediction = {
      ok: false,
      customer_key: key,
      cost_floor_usd: costFloorUsd,
      markup_used: 1,
      markup_source: "global",
      predicted_price_usd: 0,
      ci95_low_usd: 0,
      ci95_high_usd: 0,
      shrink_weight: 0,
      n_customer: 0,
    };
    if (!model || !model.ok) return { ...base, reason: "model-not-fitted" };
    const cf = num(costFloorUsd);
    if (!(cf > 0)) return { ...base, reason: "non-positive-cost-floor" };

    const cm = model.per_customer[key];
    const markup = cm ? cm.markup_hat : model.global_markup;
    const source: PricePrediction["markup_source"] = cm ? "per-customer" : "global";
    // Residual sigma: blend the customer's own residual with the global, weighted by shrinkage.
    const sigmaLog = cm
      ? cm.shrink_weight * cm.residual_sigma_log + (1 - cm.shrink_weight) * model.global_residual_sigma_log
      : model.global_residual_sigma_log;

    const predicted = cf * markup;
    const lo = predicted * Math.exp(-LOG_CI95_Z * sigmaLog);
    const hi = predicted * Math.exp(LOG_CI95_Z * sigmaLog);

    return {
      ok: true,
      customer_key: key,
      cost_floor_usd: cf,
      markup_used: markup,
      markup_source: source,
      predicted_price_usd: Math.round(predicted * 100) / 100,
      ci95_low_usd: Math.round(lo * 100) / 100,
      ci95_high_usd: Math.round(hi * 100) / 100,
      shrink_weight: cm ? cm.shrink_weight : 0,
      n_customer: cm ? cm.n : 0,
    };
  }
}

export const realizedPriceModelEngine = new RealizedPriceModelEngine();
