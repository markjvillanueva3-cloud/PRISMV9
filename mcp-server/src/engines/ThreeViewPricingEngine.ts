/**
 * ThreeViewPricingEngine -- QUOTING-JM-GROUND-MS0 / U-3VIEW01
 *
 * Produces THREE side-by-side price views for one quote request, so a JM Die
 * estimator sees what they charge today, what the market/optimal price is, and
 * the true cost floor -- all at once, with honest confidence:
 *
 *   1. CURRENT    (headline)  what JM's current pricing structure yields:
 *                             cost-build from canonical ShopConfigurationEngine
 *                             rates + current material markup + current margin.
 *                             This is the customer-facing number (operator-locked
 *                             decision: "current structure is headline").
 *   2. OPTIMAL    (advisory)  market-aware target: current material cost re-priced
 *                             at live MarketMaterialPricing, plus an adaptive shop
 *                             rate signal. NON-BINDING -- shown to advise, never to
 *                             auto-emit.
 *   3. COST_FLOOR (advisory)  the JobProfitabilityWaterfall cost stack: the price
 *                             below which the job loses money. The margin-floor
 *                             gate is measured against this.
 *
 * Plus an IMPROVEMENT ADVISOR: ranked, plain-language levers ("your shop rate is
 * $X below the market-implied rate"; "material markup Y% vs market Z%") so the
 * operator sees WHERE there's room and HOW to address it.
 *
 * COMPOSES (never re-derives -- R8/dedup):
 *   - ShopConfigurationEngine         canonical JM rates (labor/overhead/admin/
 *                                      setup/programming/machine $/hr) + markup +
 *                                      margin floor. NEVER inline a rate (soul).
 *   - JobProfitabilityWaterfallEngine  cost_floor view (analyzeFromAmounts).
 *   - MarketMaterialPricingEngine      optimal material re-price.
 *   - AdaptiveShopRateEngine           market-implied rate signal (improvement).
 *
 * HONESTY (R12 + charlie soul):
 *   - Every view carries a `confidence` band. When the verified-comparable count
 *     for the (material x process) cell is thin, the band WIDENS and `basis` says
 *     so -- never a bare point estimate (soul: "report a quote with its confidence").
 *   - The current/headline view runs the margin-floor gate; below floor it is
 *     flagged `belowMarginFloor: true` and the caller MUST NOT emit it as a
 *     customer quote without operator override (soul refuse-list:
 *     "emitting-customer-quote-without-margin-floor-gate").
 *   - Advisory views are tagged `advisory: true`. The headline is `advisory: false`.
 *
 * @milestone QUOTING-JM-GROUND-MS0/U-3VIEW01
 * @author slot:charlie, 2026-06-23
 */

import { z } from "zod";
import { shopConfigurationEngine } from "./ShopConfigurationEngine.js";
import { jobProfitabilityWaterfallEngine } from "./JobProfitabilityWaterfallEngine.js";
import { marketMaterialPricingEngine } from "./MarketMaterialPricingEngine.js";
import { adaptiveShopRateEngine } from "./AdaptiveShopRateEngine.js";
import type { JobAnalysisResult } from "./JobProfitabilityWaterfallEngine.js";

// ============================================================================
// CONSTANTS -- confidence + advisory thresholds (NOT shop rates; rates come from
// ShopConfigurationEngine only). Sourced from charlie quoting-pipeline calibration
// state (jm-sold-orders.json: 240 verified-line-item orders is the real data floor).
// ============================================================================

/** Verified-comparable count at/above which the CI is "tight". Below -> widens.
 *  Anchored on the real JM verified-order yield (240 across all cells -> cells are
 *  thin; treat <8 per cell as low-confidence). */
const TIGHT_CI_MIN_COMPARABLES = 8;
const MEDIUM_CI_MIN_COMPARABLES = 3;

/** CI half-width as a fraction of the headline, by confidence tier. Wider when
 *  data is thin so we never imply false precision (R12). */
const CI_HALF_WIDTH_FRACTION: Record<ConfidenceTier, number> = {
  tight: 0.08,   // +/-8%   many verified comparables
  medium: 0.18,  // +/-18%  a few comparables
  wide: 0.35,    // +/-35%  cost-build only, no verified comparables
};

/** Fallback margin floor when a profile omits margin_floor_pct. Conservative --
 *  a real tool & die shop rarely sustains below this gross. */
const DEFAULT_MARGIN_FLOOR_PCT = 20;

/** A market-implied rate this far (fraction) above the current shop rate is worth
 *  surfacing as an improvement lever. */
const RATE_GAP_SURFACE_FRACTION = 0.05;

/** A current-vs-market price gap (fraction, either direction) beyond this is worth
 *  surfacing as a data-free improvement lever (no learned prior required). */
const MARKET_GAP_SURFACE_FRACTION = 0.05;

/** Material markup below this (%) is flagged thin for a tool & die shop. */
const THIN_MATERIAL_MARKUP_PCT = 15;

/** Margin-floor gate tolerance (pct-points). A headline whose gross over the true
 *  break-even is within this of the floor is treated as at-floor (not below) -- so
 *  float noise on a clean cost-build does not spuriously trip the gate. Only a
 *  genuine sub-floor price flags belowMarginFloor. */
const GATE_TOLERANCE_PCT = 0.5;

// ============================================================================
// TYPES
// ============================================================================

export type ConfidenceTier = "tight" | "medium" | "wide";

export const ThreeViewPricingInputSchema = z.object({
  /** Material name/grade (e.g. "aluminum_6061", "A2", "D2"). */
  material: z.string().min(1),
  /** Process -- drives which machine rate is used. */
  process: z.enum(["mill", "lathe", "wedm", "sinker_edm", "grind", "other"]).default("mill"),
  /** Estimated cycle/run time at the machine, hours per part. */
  machine_hours_per_part: z.number().nonnegative(),
  /** Estimated hands-on labor, hours per part (load/unload/inspect). */
  labor_hours_per_part: z.number().nonnegative().default(0),
  /** One-time setup hours for the lot. */
  setup_hours: z.number().nonnegative().default(0),
  /** One-time programming hours for the lot. */
  programming_hours: z.number().nonnegative().default(0),
  /** Raw material weight per part (lb). Used with market $/lb. */
  material_lb_per_part: z.number().nonnegative().default(0),
  /** Perishable tooling cost per part (inserts, wire). */
  tooling_cost_per_part: z.number().nonnegative().default(0),
  /** Lot size. */
  quantity: z.number().int().positive(),
  /** Optional explicit material $/lb override (skips market lookup). */
  material_cost_per_lb_override: z.number().nonnegative().optional(),
  /** Optional count of verified historical comparables for this (material x process)
   *  cell -- drives the confidence band. Caller supplies from the calibration
   *  corpus; 0 -> wide CI (cost-build only). */
  verified_comparables: z.number().int().nonnegative().default(0),
  /** Shop profile id (default jm-die). */
  profile_id: z.string().default("jm-die"),
  /** Region for market material lookup. */
  region: z.string().optional(),
});

export type ThreeViewPricingInput = z.infer<typeof ThreeViewPricingInputSchema>;

export interface PriceConfidence {
  tier: ConfidenceTier;
  /** +/- dollars around the per-lot total. */
  half_width_usd: number;
  low_usd: number;
  high_usd: number;
  /** Number of verified historical comparables that fed the band. */
  comparables: number;
  basis: string;
}

export interface PriceView {
  key: "current" | "optimal" | "cost_floor";
  label: string;
  /** Whether this view is advisory-only (true) or the customer-facing headline (false). */
  advisory: boolean;
  /** Per-part price. */
  unit_price_usd: number;
  /** Lot total. */
  total_usd: number;
  /** Gross margin % implied by this price over the cost floor. */
  margin_pct: number;
  confidence: PriceConfidence;
  /** How this view was derived, in one honest sentence. */
  derivation: string;
}

export interface ImprovementLever {
  /** Stable id for the lever. */
  id: string;
  /** Plain-language headline the operator reads. */
  headline: string;
  /** Estimated $/lot upside if applied. */
  upside_usd_per_lot: number;
  /** What to actually do. */
  action: string;
  severity: "info" | "opportunity" | "warning";
}

export interface ThreeViewPricingResult {
  ok: boolean;
  reason?: string;
  input: ThreeViewPricingInput;
  /** The customer-facing view (== views.current). Convenience pointer. */
  headline: PriceView;
  views: PriceView[];
  /** The cost floor in dollars per lot -- the price below which the job loses money. */
  cost_floor_usd: number;
  /** True if the headline price is below the shop's margin floor (gate). Caller MUST
   *  NOT emit a customer quote when true without operator override. */
  belowMarginFloor: boolean;
  margin_floor_pct: number;
  improvement: ImprovementLever[];
  /** Provenance -- exactly which engines + rates produced this, for audit. */
  provenance: {
    rates_source: string;
    material_price_source: string;
    cost_floor_source: string;
    rate_advisor_source: string;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function round2(n: number): number { return Math.round(n * 100) / 100; }

function confidenceTier(comparables: number): ConfidenceTier {
  if (comparables >= TIGHT_CI_MIN_COMPARABLES) return "tight";
  if (comparables >= MEDIUM_CI_MIN_COMPARABLES) return "medium";
  return "wide";
}

function buildConfidence(total_usd: number, comparables: number): PriceConfidence {
  const tier = confidenceTier(comparables);
  const frac = CI_HALF_WIDTH_FRACTION[tier];
  const half = round2(total_usd * frac);
  const basis =
    tier === "tight"
      ? `${comparables} verified comparable orders -- tight band`
      : tier === "medium"
        ? `${comparables} verified comparable orders -- moderate band`
        : comparables > 0
          ? `${comparables} comparable order(s) -- too few to tighten; cost-build dominated`
          : "no verified comparables for this material x process cell -- cost-build only, wide band";
  return {
    tier,
    half_width_usd: half,
    low_usd: round2(Math.max(0, total_usd - half)),
    high_usd: round2(total_usd + half),
    comparables,
    basis,
  };
}

/**
 * Map a quoting process to the canonical ShopConfigurationEngine machine TYPE.
 * The profile stores proper-noun types ("Lathe", "VMC", "Wire EDM", "EDM",
 * "Grinder") -- a bare process string like "mill" does NOT match and would fall
 * to the engine's generic 85/hr fallback. This map keeps each process on its own
 * machine rate. Verified against jm-die profile machine types 2026-06-23.
 */
const PROCESS_TO_MACHINE_TYPE: Record<string, string> = {
  mill: "VMC",
  lathe: "Lathe",
  wedm: "Wire EDM",
  sinker_edm: "EDM",
  grind: "Grinder",
  other: "VMC",
};

/**
 * Resolve the canonical machine rate for a process. Maps process -> machine type,
 * then asks ShopConfigurationEngine for that type's rate. NEVER inlines a number --
 * all rates flow from ShopConfigurationEngine.
 */
function machineRateForProcess(profileId: string, process: string): { rate: number; source: string } {
  const machineType = PROCESS_TO_MACHINE_TYPE[process] ?? process;
  const rate = shopConfigurationEngine.getMachineRate(profileId, machineType);
  return {
    rate,
    source: `ShopConfigurationEngine.getMachineRate("${profileId}","${machineType}" <- process "${process}")`,
  };
}

// ============================================================================
// ENGINE
// ============================================================================

export class ThreeViewPricingEngine {
  /**
   * Compute the three priced views + improvement advisor for one quote request.
   * Pure: no I/O, deterministic given input + current shop config.
   *
   * @param rawInput  ThreeViewPricingInput (Zod-validated)
   * @returns ThreeViewPricingResult with headline + 3 views + improvement levers
   */
  price(rawInput: ThreeViewPricingInput): ThreeViewPricingResult {
    const parsed = ThreeViewPricingInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false,
        reason: "invalid-input: " + parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; "),
        input: rawInput,
        headline: emptyView("current"),
        views: [],
        cost_floor_usd: 0,
        belowMarginFloor: false,
        margin_floor_pct: 0,
        improvement: [],
        provenance: emptyProvenance(),
      };
    }
    const inp = parsed.data;

    const profile = shopConfigurationEngine.getProfile(inp.profile_id);
    const rates = shopConfigurationEngine.getRates(inp.profile_id);
    const marginFloorPct = profile.margin_floor_pct ?? DEFAULT_MARGIN_FLOOR_PCT;
    const overheadPct = profile.overhead_pct;
    const materialMarkupPct = profile.material_markup_pct;

    const { rate: machineRate } = machineRateForProcess(inp.profile_id, inp.process);

    // ----- Per-lot labor/machine/setup/programming cost (canonical rates) -----
    const qty = inp.quantity;
    const machineCost = round2(inp.machine_hours_per_part * machineRate * qty);
    const laborCost = round2(inp.labor_hours_per_part * rates.labor_per_hr * qty);
    const setupCost = round2(inp.setup_hours * rates.setup_per_hr); // one-time
    const programmingCost = round2(inp.programming_hours * rates.programming_per_hr); // one-time
    const toolingCost = round2(inp.tooling_cost_per_part * qty);

    // ----- Material cost: CURRENT (profile markup) vs OPTIMAL (market) --------
    const matBasis = resolveMaterialBasis(inp, profile);
    const rawMaterialPerPart = matBasis.rawPerPart;
    const currentMaterialCost = round2(rawMaterialPerPart * (1 + materialMarkupPct / 100) * qty);
    const optimalMaterialCost = round2(rawMaterialPerPart * qty);

    // ----- COST FLOOR via JobProfitabilityWaterfall (true money-losing line) --
    const directSubtotal =
      machineCost + laborCost + setupCost + programmingCost + toolingCost + optimalMaterialCost;
    const overhead = round2(directSubtotal * (overheadPct / 100));
    const floorAnalysis: JobAnalysisResult = jobProfitabilityWaterfallEngine.analyzeFromAmounts({
      revenue: 0,
      material: optimalMaterialCost,
      tooling: toolingCost,
      labor: laborCost,
      machine: machineCost,
      setup: setupCost + programmingCost,
      overhead,
    });
    const costFloorUsd = round2(floorAnalysis.costs.total);

    // ----- CURRENT (headline): cost-build at current rates + markup + margin ---
    const currentCostBase =
      machineCost + laborCost + setupCost + programmingCost + toolingCost + currentMaterialCost;
    const currentOverhead = round2(currentCostBase * (overheadPct / 100));
    const currentFullCost = round2(currentCostBase + currentOverhead);
    const currentTotal = round2(currentFullCost / (1 - marginFloorPct / 100));
    const currentUnit = round2(currentTotal / qty);
    // Gross margin over the price's OWN full cost (the basis it was priced on).
    // A clean cost-build to the target floor reads exactly at the floor here --
    // this is the honest "what margin am I pricing at" number.
    const currentMargin = currentTotal > 0 ? round2(((currentTotal - currentFullCost) / currentTotal) * 100) : 0;

    const currentView: PriceView = {
      key: "current",
      label: "Current JM pricing (headline)",
      advisory: false,
      unit_price_usd: currentUnit,
      total_usd: currentTotal,
      margin_pct: currentMargin,
      confidence: buildConfidence(currentTotal, inp.verified_comparables),
      derivation:
        `Cost-build at canonical JM rates (machine $${machineRate}/hr, labor $${rates.labor_per_hr}/hr, ` +
        `setup $${rates.setup_per_hr}/hr), material marked up ${materialMarkupPct}%, ` +
        `overhead ${overheadPct}%, target margin ${marginFloorPct}%.`,
    };

    // ----- OPTIMAL (advisory): market material + market-implied rate ----------
    const rateAdvisor = computeRateGap(inp.process, machineRate);
    const optimalMachineRate = rateAdvisor.marketImpliedRate ?? machineRate;
    const optimalMachineCost = round2(inp.machine_hours_per_part * optimalMachineRate * qty);
    const optimalCostBase =
      optimalMachineCost + laborCost + setupCost + programmingCost + toolingCost + optimalMaterialCost;
    const optimalOverhead = round2(optimalCostBase * (overheadPct / 100));
    const optimalFullCost = round2(optimalCostBase + optimalOverhead);
    const optimalTotal = round2(optimalFullCost / (1 - marginFloorPct / 100));
    const optimalUnit = round2(optimalTotal / qty);
    const optimalMargin = optimalTotal > 0 ? round2(((optimalTotal - costFloorUsd) / optimalTotal) * 100) : 0;

    const optimalView: PriceView = {
      key: "optimal",
      label: "Optimal vs market (advisory)",
      advisory: true,
      unit_price_usd: optimalUnit,
      total_usd: optimalTotal,
      margin_pct: optimalMargin,
      confidence: buildConfidence(optimalTotal, inp.verified_comparables),
      derivation:
        `Material re-priced at live market $/lb (${matBasis.source}); machine rate at ` +
        `market-implied $${round2(optimalMachineRate)}/hr (${rateAdvisor.source}); same target margin.`,
    };

    // ----- COST FLOOR (advisory): the money-losing line. ----------------------
    const costFloorView: PriceView = {
      key: "cost_floor",
      label: "Cost floor (advisory -- break-even)",
      advisory: true,
      unit_price_usd: round2(costFloorUsd / qty),
      total_usd: costFloorUsd,
      margin_pct: 0,
      confidence: buildConfidence(costFloorUsd, inp.verified_comparables),
      derivation:
        `JobProfitabilityWaterfall cost stack: material $${optimalMaterialCost} + machine $${machineCost} + ` +
        `labor $${laborCost} + setup/programming $${round2(setupCost + programmingCost)} + tooling $${toolingCost} + ` +
        `overhead $${overhead}. Below this the lot loses money.`,
    };

    // ----- Margin-floor gate on the headline (soul: never emit below floor) ---
    // Measured over the TRUE break-even (costFloorUsd, raw material) -- the gate
    // protects against pricing below what the job actually costs. A clean cost-build
    // to the target floor sits at-or-above; we allow a small tolerance so float noise
    // at exactly-floor (e.g. $0 material -> currentFullCost == costFloorUsd) does not
    // spuriously trip the gate. Only a genuine sub-floor price (> GATE_TOLERANCE_PCT
    // under the floor) flags belowMarginFloor.
    const headlineMarginOverFloor =
      currentTotal > 0 ? ((currentTotal - costFloorUsd) / currentTotal) * 100 : -100;
    const belowMarginFloor = headlineMarginOverFloor < marginFloorPct - GATE_TOLERANCE_PCT;

    const improvement = buildImprovementLevers({
      rateAdvisor,
      machineRate,
      materialMarkupPct,
      marketPerLb: matBasis.marketPerLb,
      rawMaterialPerPart,
      qty,
      currentTotal,
      optimalTotal,
      costFloorUsd,
      marginFloorPct,
      headlineMarginOverFloor,
      process: inp.process,
    });

    return {
      ok: true,
      input: inp,
      headline: currentView,
      views: [currentView, optimalView, costFloorView],
      cost_floor_usd: costFloorUsd,
      belowMarginFloor,
      margin_floor_pct: marginFloorPct,
      improvement,
      provenance: {
        rates_source: `ShopConfigurationEngine.getRates("${inp.profile_id}")`,
        material_price_source: matBasis.source,
        cost_floor_source: "JobProfitabilityWaterfallEngine.analyzeFromAmounts",
        rate_advisor_source: rateAdvisor.source,
      },
    };
  }
}

// ============================================================================
// MATERIAL BASIS RESOLUTION
// ============================================================================

interface MaterialBasis {
  /** Raw (un-marked-up) material cost per part, $. */
  rawPerPart: number;
  /** Live market $/lb if a lookup succeeded, else null. */
  marketPerLb: number | null;
  source: string;
}

/**
 * Resolve the raw material cost per part: explicit override -> market lookup x weight
 * -> profile per-part default. Mirrors the cost-stack convention; never inlines a price.
 */
function resolveMaterialBasis(
  inp: ThreeViewPricingInput,
  profile: { material_cost_per_part_default: number },
): MaterialBasis {
  if (inp.material_cost_per_lb_override != null) {
    const perPart =
      inp.material_lb_per_part > 0
        ? inp.material_cost_per_lb_override * inp.material_lb_per_part
        : inp.material_cost_per_lb_override;
    return { rawPerPart: round2(perPart), marketPerLb: inp.material_cost_per_lb_override, source: "operator override $/lb" };
  }
  // MarketMaterialPricingEngine.lookup THROWS on an unknown material grade (it only
  // knows a fixed catalog). Treat a throw as a market miss (R12 -- external call can
  // fail) and fall back to the profile default rather than crashing the quote.
  let look: unknown = null;
  try {
    look = marketMaterialPricingEngine.lookup({ material: inp.material, region: inp.region });
  } catch {
    look = null;
  }
  const marketPerLb = extractPerLb(look);
  if (marketPerLb != null && inp.material_lb_per_part > 0) {
    return {
      rawPerPart: round2(marketPerLb * inp.material_lb_per_part),
      marketPerLb,
      source: "MarketMaterialPricingEngine.lookup ($/lb x weight)",
    };
  }
  // Market miss OR no part weight -> fall back to the profile per-part default.
  return {
    rawPerPart: round2(profile.material_cost_per_part_default),
    marketPerLb: null,
    source: "ShopConfigurationEngine.material_cost_per_part_default (market miss / no weight)",
  };
}

// ============================================================================
// IMPROVEMENT ADVISOR + RATE GAP
// ============================================================================

interface RateGap {
  currentRate: number;
  marketImpliedRate: number | null;
  gapFraction: number | null; // (market - current) / current
  source: string;
}

/**
 * Ask AdaptiveShopRateEngine for a market-implied rate for this process. It learns
 * a Bayesian rate prior from recorded job outcomes (keyed by machine/process); if
 * there's no prior yet (cold start) we return null and the optimal view falls back
 * to the current rate. The engine surface (getPrior) is shape-tolerant here because
 * the ShopRatePrior interface may evolve; we read defensively (R12).
 */
function computeRateGap(process: string, currentRate: number): RateGap {
  const prior = safeGetPrior(process);
  const mean = priorMean(prior);
  if (mean != null && mean > 0) {
    return {
      currentRate,
      marketImpliedRate: round2(mean),
      gapFraction: (mean - currentRate) / currentRate,
      source: `AdaptiveShopRateEngine.getPrior("${process}")`,
    };
  }
  return {
    currentRate,
    marketImpliedRate: null,
    gapFraction: null,
    source: "AdaptiveShopRateEngine (no prior -- cold start)",
  };
}

function safeGetPrior(process: string): unknown {
  try {
    return adaptiveShopRateEngine.getPrior(process);
  } catch {
    return null;
  }
}

/** Read a positive mean rate out of a ShopRatePrior without assuming the exact field. */
function priorMean(prior: unknown): number | null {
  if (!prior || typeof prior !== "object") return null;
  const o = prior as Record<string, unknown>;
  for (const k of ["mean", "rate_mean", "mean_rate", "rate"]) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function buildImprovementLevers(ctx: {
  rateAdvisor: RateGap;
  machineRate: number;
  materialMarkupPct: number;
  marketPerLb: number | null;
  rawMaterialPerPart: number;
  qty: number;
  currentTotal: number;
  optimalTotal: number;
  costFloorUsd: number;
  marginFloorPct: number;
  headlineMarginOverFloor: number;
  process: string;
}): ImprovementLever[] {
  const levers: ImprovementLever[] = [];

  // 1. Shop-rate gap (the biggest structural lever).
  if (
    ctx.rateAdvisor.marketImpliedRate != null &&
    ctx.rateAdvisor.gapFraction != null &&
    ctx.rateAdvisor.gapFraction > RATE_GAP_SURFACE_FRACTION
  ) {
    const upside = round2(ctx.optimalTotal - ctx.currentTotal);
    levers.push({
      id: "shop-rate-gap",
      headline:
        `Your ${ctx.process} rate $${round2(ctx.machineRate)}/hr is ` +
        `${Math.round(ctx.rateAdvisor.gapFraction * 100)}% below the market-implied ` +
        `$${ctx.rateAdvisor.marketImpliedRate}/hr learned from your own job outcomes.`,
      upside_usd_per_lot: Math.max(0, upside),
      action:
        `Raise the ${ctx.process} machine rate toward $${ctx.rateAdvisor.marketImpliedRate}/hr ` +
        `in ShopConfigurationEngine -- your historical jobs already support it.`,
      severity: "opportunity",
    });
  }

  // 2. Headline below margin floor -- warning, not opportunity.
  if (ctx.headlineMarginOverFloor < ctx.marginFloorPct - 1e-9) {
    const needed = round2(ctx.costFloorUsd / (1 - ctx.marginFloorPct / 100) - ctx.currentTotal);
    levers.push({
      id: "below-margin-floor",
      headline:
        `Headline price clears only ${Math.round(ctx.headlineMarginOverFloor)}% margin over the ` +
        `cost floor -- below your ${ctx.marginFloorPct}% floor.`,
      upside_usd_per_lot: Math.max(0, needed),
      action:
        `Raise the price by ~$${Math.max(0, needed)}/lot to clear the margin floor, ` +
        `or reduce cycle/setup time. Do not emit this quote as-is without override.`,
      severity: "warning",
    });
  }

  // 3. Material markup vs market spread.
  if (ctx.marketPerLb != null && ctx.materialMarkupPct < THIN_MATERIAL_MARKUP_PCT && ctx.rawMaterialPerPart > 0) {
    levers.push({
      id: "material-markup-thin",
      headline:
        `Material markup is ${ctx.materialMarkupPct}% -- thin for a tool & die shop; ` +
        `market-priced raw material leaves room to recover handling + carrying cost.`,
      upside_usd_per_lot: round2(ctx.rawMaterialPerPart * 0.1 * ctx.qty),
      action: `Consider a 15-25% material markup to cover procurement + inventory carry.`,
      severity: "info",
    });
  }

  // 4. Current-vs-market gap (DATA-FREE -- always available from the computed views,
  //    no learned prior required). This is the directive's "where is there room to
  //    improve" lever that fires on every quote, not just when AdaptiveShopRate has
  //    a prior. A meaningful gap either way is actionable.
  const marketGap = ctx.optimalTotal - ctx.currentTotal;
  const marketGapFraction = ctx.currentTotal > 0 ? marketGap / ctx.currentTotal : 0;
  if (marketGapFraction > MARKET_GAP_SURFACE_FRACTION) {
    // Optimal (market) price is ABOVE current -> the shop is under-pricing vs market;
    // there is margin headroom to capture.
    levers.push({
      id: "underpriced-vs-market",
      headline:
        `Your current price is ${Math.round(marketGapFraction * 100)}% below the ` +
        `market/optimal price for this job -- you are leaving margin on the table.`,
      upside_usd_per_lot: round2(Math.max(0, marketGap)),
      action:
        `Market conditions support pricing up toward the optimal view ` +
        `($${round2(ctx.optimalTotal)}/lot). Test a higher price on the next similar quote.`,
      severity: "opportunity",
    });
  } else if (marketGapFraction < -MARKET_GAP_SURFACE_FRACTION) {
    // Optimal (market) price is BELOW current -> the shop is priced above market; a
    // competitiveness risk on price-sensitive work (still clears the floor, so info).
    levers.push({
      id: "above-market",
      headline:
        `Your current price is ${Math.round(-marketGapFraction * 100)}% above the ` +
        `market/optimal price -- competitive on quality, but watch price-sensitive bids.`,
      upside_usd_per_lot: 0,
      action:
        `On price-driven work, the optimal view ($${round2(ctx.optimalTotal)}/lot) is the ` +
        `more competitive number while still clearing the margin floor.`,
      severity: "info",
    });
  }

  if (levers.length === 0) {
    levers.push({
      id: "structure-healthy",
      headline: "Current pricing structure is at or above market and clears the margin floor.",
      upside_usd_per_lot: 0,
      action: "No rate or markup change indicated for this quote.",
      severity: "info",
    });
  }

  return levers;
}

// ============================================================================
// SHAPE-TOLERANT EXTRACTORS (R12 -- never fabricate a field; probe for it)
// ============================================================================

/** Pull a $/lb-ish number out of a MarketMaterialPricing lookup result without
 *  assuming an exact field name. Returns null if none present (-> caller falls back). */
function extractPerLb(look: unknown): number | null {
  if (!look || typeof look !== "object") return null;
  const o = look as Record<string, unknown>;
  const nested = o.result && typeof o.result === "object" ? (o.result as Record<string, unknown>) : undefined;
  const candidates: unknown[] = [
    o.price_per_lb, o.usd_per_lb, o.unit_price_usd, o.price,
    nested?.price_per_lb, nested?.usd_per_lb, nested?.price,
  ];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c) && c > 0) return c;
  }
  return null;
}

function emptyView(key: PriceView["key"]): PriceView {
  return {
    key,
    label: "",
    advisory: key !== "current",
    unit_price_usd: 0,
    total_usd: 0,
    margin_pct: 0,
    confidence: { tier: "wide", half_width_usd: 0, low_usd: 0, high_usd: 0, comparables: 0, basis: "invalid input" },
    derivation: "",
  };
}

function emptyProvenance(): ThreeViewPricingResult["provenance"] {
  return { rates_source: "", material_price_source: "", cost_floor_source: "", rate_advisor_source: "" };
}

export const threeViewPricingEngine = new ThreeViewPricingEngine();
