/**
 * OutsourceRecommenderEngine — JM-DIE-QUOTE-TRAINING-MS0 / U-QT04
 *
 * Given an in-house FMV quote + current shop loading + a benchmark outsource
 * rate card, recommend in-house vs outsource with $-savings reasoning.
 *
 * Decision rules (deterministic, no LLM):
 *   1. If shop_loading_pct >= 90 (over-capacity) AND lead_time_days <= 7:
 *      → outsource (capacity-constrained) regardless of price gap
 *   2. Else if material is in unavailable_materials list:
 *      → outsource (we don't stock this material; bring-in cost prohibitive)
 *   3. Else if outsource_price < in_house_price × (1 - margin_threshold):
 *      → outsource (price advantage exceeds threshold, default 8%)
 *   4. Else if outsource_price > in_house_price × (1 + margin_threshold):
 *      → in-house (price advantage; do it ourselves)
 *   5. Else:
 *      → toss-up (within ±margin_threshold band)
 *
 * Benchmark outsource rate is a Xometry-style surrogate: process_base_rate × material_factor × tolerance_factor × lead_factor.
 *
 * @milestone JM-DIE-QUOTE-TRAINING-MS0/U-QT04
 * @author slot:charlie /goal-17 iter1, 2026-05-24
 */

import type { QuoteMaterial, QuoteProcess, ToleranceClass } from "./XometryStyleQuoteInputsEngine.js";

export type OutsourceRecommendation = "in-house" | "outsource" | "toss-up";

export interface OutsourceInputs {
  in_house_total_usd: number;
  in_house_lead_time_days: number;
  process: QuoteProcess;
  material: QuoteMaterial;
  tolerance_class: ToleranceClass;
  quantity: number;
  /** Current shop loading percentage (0-100). >=90 triggers capacity rule. */
  shop_loading_pct: number;
  /** Optional: explicit override of margin threshold (default 0.08 = ±8%). */
  margin_threshold?: number;
  /** Optional: list of materials we don't stock (forces outsource). */
  unavailable_materials?: QuoteMaterial[];
}

export interface OutsourceReport {
  ok: boolean;
  recommendation: OutsourceRecommendation;
  in_house_total_usd: number;
  outsource_estimate_usd: number;
  savings_usd: number;             // positive = outsourcing saves money
  savings_pct: number;
  reason_code: "capacity-constrained" | "material-unavailable" | "outsource-cheaper" | "in-house-cheaper" | "within-band";
  reason_text: string;
  shop_loading_pct: number;
  margin_threshold: number;
}

// Process base rate ($/cm³ for outsource benchmark — Xometry-tier surrogate, 2026)
const OUTSOURCE_BASE_RATE_PER_CM3: Record<QuoteProcess, number> = {
  mill: 0.55,
  lathe: 0.45,
  wedm: 2.20,        // wire-EDM premium
  sinker_edm: 3.40,
};

// Material cost factor multiplier on outsource rate
const OUTSOURCE_MATERIAL_FACTOR: Record<QuoteMaterial, number> = {
  aluminum_6061: 1.0,
  steel_a36: 1.15,
  stainless_304: 1.65,
  copper_c110: 1.40,
};

// Tolerance class factor on outsource rate
const OUTSOURCE_TOLERANCE_FACTOR: Record<ToleranceClass, number> = {
  coarse: 1.0,
  medium: 1.20,
  fine: 1.60,
  very_fine: 2.30,
};

const DEFAULT_MARGIN_THRESHOLD = 0.08;  // ±8% band
const CAPACITY_PRESSURE_PCT = 90;
const RUSH_LEAD_DAYS = 7;

export class OutsourceRecommenderEngine {
  recommend(inputs: OutsourceInputs, estimatedVolumeCm3PerPart: number): OutsourceReport {
    const empty: OutsourceReport = {
      ok: false,
      recommendation: "toss-up",
      in_house_total_usd: 0, outsource_estimate_usd: 0,
      savings_usd: 0, savings_pct: 0,
      reason_code: "within-band", reason_text: "",
      shop_loading_pct: 0, margin_threshold: DEFAULT_MARGIN_THRESHOLD,
    };
    if (!inputs || !inputs.process || !inputs.material) {
      return { ...empty, reason_text: "missing-required:process,material" };
    }
    if (!(inputs.in_house_total_usd > 0) || !(inputs.quantity > 0) || !(estimatedVolumeCm3PerPart > 0)) {
      return { ...empty, reason_text: "non-positive-required-numeric" };
    }

    const baseRate = OUTSOURCE_BASE_RATE_PER_CM3[inputs.process];
    const matFactor = OUTSOURCE_MATERIAL_FACTOR[inputs.material];
    const tolFactor = OUTSOURCE_TOLERANCE_FACTOR[inputs.tolerance_class];
    const leadFactor = inputs.in_house_lead_time_days >= 10 ? 1.0
      : inputs.in_house_lead_time_days >= 5 ? 1.12
      : inputs.in_house_lead_time_days >= 2 ? 1.30
      : 1.65;

    const outsource_per_part = baseRate * estimatedVolumeCm3PerPart * matFactor * tolFactor * leadFactor;
    const outsource_total = outsource_per_part * inputs.quantity;

    const margin = inputs.margin_threshold ?? DEFAULT_MARGIN_THRESHOLD;
    const unavailable = inputs.unavailable_materials ?? [];
    const savings_usd = inputs.in_house_total_usd - outsource_total;
    const savings_pct = savings_usd / inputs.in_house_total_usd;

    // Rule 1: capacity-constrained
    if (inputs.shop_loading_pct >= CAPACITY_PRESSURE_PCT && inputs.in_house_lead_time_days <= RUSH_LEAD_DAYS) {
      return {
        ok: true, recommendation: "outsource",
        in_house_total_usd: inputs.in_house_total_usd, outsource_estimate_usd: round2(outsource_total),
        savings_usd: round2(savings_usd), savings_pct: round4(savings_pct),
        reason_code: "capacity-constrained",
        reason_text: `Shop at ${inputs.shop_loading_pct}% loading with ${inputs.in_house_lead_time_days}-day lead — outsource to protect on-time delivery`,
        shop_loading_pct: inputs.shop_loading_pct, margin_threshold: margin,
      };
    }

    // Rule 2: material unavailable
    if (unavailable.includes(inputs.material)) {
      return {
        ok: true, recommendation: "outsource",
        in_house_total_usd: inputs.in_house_total_usd, outsource_estimate_usd: round2(outsource_total),
        savings_usd: round2(savings_usd), savings_pct: round4(savings_pct),
        reason_code: "material-unavailable",
        reason_text: `${inputs.material} not stocked in-house — outsource to vendor with material on hand`,
        shop_loading_pct: inputs.shop_loading_pct, margin_threshold: margin,
      };
    }

    // Rule 3-5: price comparison
    const lowerBound = inputs.in_house_total_usd * (1 - margin);
    const upperBound = inputs.in_house_total_usd * (1 + margin);
    if (outsource_total < lowerBound) {
      return {
        ok: true, recommendation: "outsource",
        in_house_total_usd: inputs.in_house_total_usd, outsource_estimate_usd: round2(outsource_total),
        savings_usd: round2(savings_usd), savings_pct: round4(savings_pct),
        reason_code: "outsource-cheaper",
        reason_text: `Outsource $${round2(outsource_total)} vs in-house $${round2(inputs.in_house_total_usd)} — saves $${round2(savings_usd)} (${(savings_pct * 100).toFixed(1)}%)`,
        shop_loading_pct: inputs.shop_loading_pct, margin_threshold: margin,
      };
    }
    if (outsource_total > upperBound) {
      return {
        ok: true, recommendation: "in-house",
        in_house_total_usd: inputs.in_house_total_usd, outsource_estimate_usd: round2(outsource_total),
        savings_usd: round2(savings_usd), savings_pct: round4(savings_pct),
        reason_code: "in-house-cheaper",
        reason_text: `In-house $${round2(inputs.in_house_total_usd)} beats outsource $${round2(outsource_total)} — keep in shop`,
        shop_loading_pct: inputs.shop_loading_pct, margin_threshold: margin,
      };
    }
    return {
      ok: true, recommendation: "toss-up",
      in_house_total_usd: inputs.in_house_total_usd, outsource_estimate_usd: round2(outsource_total),
      savings_usd: round2(savings_usd), savings_pct: round4(savings_pct),
      reason_code: "within-band",
      reason_text: `Within ±${(margin * 100).toFixed(0)}% band — operator's call (in-house: $${round2(inputs.in_house_total_usd)} / outsource: $${round2(outsource_total)})`,
      shop_loading_pct: inputs.shop_loading_pct, margin_threshold: margin,
    };
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

export const outsourceRecommenderEngine = new OutsourceRecommenderEngine();
