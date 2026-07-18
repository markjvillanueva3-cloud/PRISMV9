/**
 * ScrapRiskPricingEngine — quote-side scrap-risk markup
 *
 * Closes the iter20 P1 "scrap-risk pricing" gap. For first-article + low-volume +
 * high-complexity jobs, the expected scrap rate is non-zero and the shop must
 * recover scrap loss in the unit price — otherwise a single scrap on a 10-piece
 * job destroys margin. Formula:
 *
 *   scrap_factor      = 1 / (1 - expected_scrap_rate)
 *   parts_required    = ⌈ordered_qty × scrap_factor⌉
 *   scrap_loss_$/good = (material + machining) × (scrap_factor - 1)
 *   markup_pct        = scrap_loss / (material + machining) × 100
 *
 * Risk stratification (auto-rates expected_scrap_rate from drivers):
 *   - First-article (no proven-out yield):        +2-5%
 *   - Tight tolerance (Cpk < 1.33 capability):    +1-3%
 *   - Exotic material (Inconel/Ti, hardened):     +1-2%
 *   - Complex geometry (5-axis multi-setup):      +1-3%
 *   - Operator experience (new operator on job):  +1-2%
 *
 * Reference: AIAG SPC §4 (capability vs scrap); ASME B89.7.5 (scrap policy in MSA);
 *   Modern Machine Shop "Pricing Risk" 2017 series; "Manufacturing Cost Estimation"
 *   (Boothroyd-Dewhurst §11).
 *
 * @version 1.0.0
 * @module ScrapRiskPricingEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type ProcessMaturity = "first_article" | "proven_out" | "mature";
export type ComplexityTier = "simple" | "moderate" | "complex" | "high_complexity";

export interface ScrapRiskPricingInput {
  /** Order quantity (good parts to deliver) */
  ordered_qty: number;
  /** Material cost per part (USD) */
  material_cost_usd: number;
  /** Machining + labor cost per part (USD) */
  machining_cost_usd: number;
  /** If explicit, override auto-rated scrap rate (0-0.5 range) */
  expected_scrap_rate?: number;
  /** Risk drivers for auto-rating */
  process_maturity?: ProcessMaturity;
  complexity?: ComplexityTier;
  /** Cpk capability index for tightest spec */
  cpk?: number;
  /** Exotic material flag (Inconel, Ti-6-4, hardened steel ≥45 HRC) */
  is_exotic_material?: boolean;
  /** Operator-on-this-job experience (years; <1 triggers operator risk) */
  operator_experience_years?: number;
  /** Maximum allowable scrap rate; if expected > max → REJECT */
  max_scrap_rate?: number;
}

export type ScrapRiskVerdict = "acceptable" | "elevated" | "high" | "reject";

export interface ScrapRiskPricingResult {
  expected_scrap_rate: AtomicValue;
  scrap_factor: AtomicValue;
  parts_required: AtomicValue<number>;
  scrap_loss_per_good_part: AtomicValue;
  markup_pct: AtomicValue;
  /** Sell price with scrap markup baked in (per good part) */
  recommended_sell_price_usd: AtomicValue;
  verdict: ScrapRiskVerdict;
  /** Per-driver contribution to total scrap rate */
  risk_contributions: Array<{ driver: string; contribution: number }>;
  warnings: string[];
  source: string;
}

const MAX_SCRAP_DEFAULT = 0.25;  // 25% is the highest practical scrap rate for production work

export class ScrapRiskPricingEngine {
  estimate(input: ScrapRiskPricingInput): ScrapRiskPricingResult {
    if (!input || input.ordered_qty == null || input.material_cost_usd == null || input.machining_cost_usd == null) {
      throw new Error("ScrapRiskPricingEngine.estimate: ordered_qty + material_cost_usd + machining_cost_usd required");
    }
    if (input.ordered_qty <= 0) {
      throw new Error("ScrapRiskPricingEngine.estimate: positive ordered_qty required");
    }
    if (input.material_cost_usd < 0 || input.machining_cost_usd < 0) {
      throw new Error("ScrapRiskPricingEngine.estimate: non-negative material + machining cost required");
    }

    const warnings: string[] = [];
    const maxScrap = input.max_scrap_rate ?? MAX_SCRAP_DEFAULT;
    const riskContribs: ScrapRiskPricingResult["risk_contributions"] = [];

    // ── Auto-rate scrap rate from drivers ─────────────────────────────
    let rate: number;
    if (input.expected_scrap_rate !== undefined) {
      rate = input.expected_scrap_rate;
      riskContribs.push({ driver: "explicit_override", contribution: rate });
    } else {
      // Baseline by process maturity (Boothroyd-Dewhurst §11 typical yields)
      const maturityContrib: Record<ProcessMaturity, number> = {
        first_article: 0.03,
        proven_out: 0.01,
        mature: 0.005,
      };
      const maturity = input.process_maturity ?? "proven_out";
      const mContrib = maturityContrib[maturity];
      riskContribs.push({ driver: `maturity:${maturity}`, contribution: mContrib });
      rate = mContrib;

      // Complexity (Modern Machine Shop 2017)
      const complexityContrib: Record<ComplexityTier, number> = {
        simple: 0,
        moderate: 0.005,
        complex: 0.015,
        high_complexity: 0.025,
      };
      const complexity = input.complexity ?? "moderate";
      const cContrib = complexityContrib[complexity];
      riskContribs.push({ driver: `complexity:${complexity}`, contribution: cContrib });
      rate += cContrib;

      // Cpk shortfall — < 1.33 → +1.5%; < 1.0 → +3%
      if (input.cpk !== undefined) {
        let cpkContrib = 0;
        if (input.cpk < 1.0) cpkContrib = 0.03;
        else if (input.cpk < 1.33) cpkContrib = 0.015;
        if (cpkContrib > 0) {
          riskContribs.push({ driver: `cpk:${input.cpk.toFixed(2)}`, contribution: cpkContrib });
          rate += cpkContrib;
        }
      }

      // Exotic material
      if (input.is_exotic_material === true) {
        riskContribs.push({ driver: "exotic_material", contribution: 0.015 });
        rate += 0.015;
      }

      // Operator experience
      if (input.operator_experience_years !== undefined && input.operator_experience_years < 1) {
        riskContribs.push({ driver: "operator_experience_<1yr", contribution: 0.015 });
        rate += 0.015;
      }
    }

    // ── Math: scrap factor + markup ───────────────────────────────────
    if (rate >= 1.0) {
      throw new Error(`ScrapRiskPricingEngine.estimate: scrap rate ${rate} >= 1.0 — invalid (no parts would yield)`);
    }
    const scrapFactor = 1 / (1 - rate);
    const partsRequired = Math.ceil(input.ordered_qty * scrapFactor);
    const goodPartCost = input.material_cost_usd + input.machining_cost_usd;
    const scrapLoss = goodPartCost * (scrapFactor - 1);
    const markupPct = goodPartCost > 0 ? (scrapLoss / goodPartCost) * 100 : 0;
    const sellPrice = goodPartCost * scrapFactor;

    // ── Verdict ───────────────────────────────────────────────────────
    let verdict: ScrapRiskVerdict;
    if (rate > maxScrap) {
      verdict = "reject";
      warnings.push(`Scrap rate ${(rate * 100).toFixed(1)}% > max ${(maxScrap * 100).toFixed(1)}% — REJECT quote or invest in process improvement first`);
    } else if (rate > 0.10) {
      verdict = "high";
      warnings.push(`Scrap rate ${(rate * 100).toFixed(1)}% > 10% — verify capability before committing pricing`);
    } else if (rate > 0.05) {
      verdict = "elevated";
    } else {
      verdict = "acceptable";
    }

    // First-article low-quantity warning
    if (input.ordered_qty < 5 && input.process_maturity === "first_article") {
      warnings.push(`First-article + qty=${input.ordered_qty} — recommend adding 1+ NCR-allowance part to order`);
    }

    return {
      expected_scrap_rate: {
        value: Number(rate.toFixed(4)),
        unit: "fraction",
        source: input.expected_scrap_rate !== undefined ? "explicit override" : "auto-rated from drivers (maturity+complexity+Cpk+material+operator)",
      },
      scrap_factor: {
        value: Number(scrapFactor.toFixed(4)),
        unit: "multiplier",
        source: "1 / (1 - rate)",
      },
      parts_required: {
        value: partsRequired,
        unit: "parts",
        source: "⌈ordered_qty × scrap_factor⌉",
      },
      scrap_loss_per_good_part: {
        value: Number(scrapLoss.toFixed(4)),
        unit: "USD/part",
        source: "(material + machining) × (scrap_factor - 1)",
      },
      markup_pct: {
        value: Number(markupPct.toFixed(2)),
        unit: "%",
        source: "scrap_loss / good_part_cost × 100",
      },
      recommended_sell_price_usd: {
        value: Number(sellPrice.toFixed(4)),
        unit: "USD/part",
        source: "good_part_cost × scrap_factor (margin-of-safety basis)",
      },
      verdict,
      risk_contributions: riskContribs.map(c => ({ driver: c.driver, contribution: Number(c.contribution.toFixed(4)) })),
      warnings,
      source: "ScrapRiskPricingEngine — AIAG SPC §4 + ASME B89.7.5 + Boothroyd-Dewhurst §11 + Modern Machine Shop 2017",
    };
  }
}

export const scrapRiskPricingEngine = new ScrapRiskPricingEngine();
