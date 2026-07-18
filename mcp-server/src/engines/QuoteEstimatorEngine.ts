/**
 * QuoteEstimatorEngine — Unified physics-backed manufacturing quote estimation.
 *
 * Replaces the naive vol/MRR cycle time with physics-based calculations,
 * integrates secondary ops, tool costs, feature-based complexity, DfM warnings,
 * NRE charges, learning curve, and historical accuracy feedback.
 *
 * Pulls from: JobCostingEngine (base costs), ManufacturingCalculations (physics),
 * ToolUsageEngine (tool amortization), MaterialRegistry (real prices),
 * SecondaryOpsEngine (outside processing), QuoteAnalyticsEngine (accuracy calibration).
 */

import { jobCostingEngine, type JobSpec, type CostBreakdown } from "./JobCostingEngine.js";
// Shared, unit-agnostic stock-volume resolver (U-QP-STOCK-VOLUME-CORE). Aliased to
// avoid colliding with this engine's private resolveStockVolumeCm3 wrapper, which
// maps the shared "_mm" source tags to the engine's internal vocab.
import { resolveStockVolumeCm3 as sharedResolveStockVolumeCm3 } from "../utils/stockVolume.js";

// ─── Types ───────────────────────────────────────────────────

export interface FeatureSpec {
  type: "hole" | "pocket" | "slot" | "thread" | "chamfer" | "fillet"
    | "boss" | "contour" | "surface" | "groove" | "keyway" | "undercut";
  count: number;
  tolerance_mm?: number;    // tightest tolerance on this feature
  surface_finish_ra?: number; // Ra in microns
  depth_ratio?: number;      // depth/diameter or depth/width
  is_blind?: boolean;
  requires_5axis?: boolean;
}

export interface SecondaryOp {
  type: string;            // "anodize_type_ii", "heat_treat_stress_relief", etc.
  quantity?: number;       // override for partial batch
  vendor_quote?: number;   // actual vendor quote if available
  notes?: string;
}

export interface NREItem {
  type: "programming" | "fixture_design" | "fixture_build" | "custom_tooling"
    | "process_development" | "prove_out" | "prototype_run";
  description: string;
  estimated_hours?: number;
  estimated_cost?: number;
  amortize_over_qty?: number; // amortization denominator; defaults to the quote quantity when unset. ALL NRE folds into per-part price (total_nre is reported but NOT separately billed), so an unset value still amortizes over qty rather than dropping the cost.
}

export interface QuoteEstimateInput {
  // Part info
  part_name?: string;
  part_number?: string;
  quantity: number;
  annual_volume?: number;       // for blanket pricing

  // Material
  material: string;             // e.g. "aluminum_6061", "titanium_gr5"
  stock_dimensions_mm?: { length: number; width: number; height: number };
  // Cylindrical bar stock (turned/lathe parts). Resolves stock volume via V = pi/4 * d^2 * L
  // so a round-bar part gets the SAME material-cost / buy-to-fly / confidence treatment a
  // rectangular block already got (U-QP-ROUND-BAR-STOCK). Was rect-only before -- lathe work
  // (JM's turning bread-and-butter) silently lost buy-to-fly + the stock-confidence credit.
  stock_round_bar_mm?: { diameter: number; length: number };
  part_volume_cm3?: number;     // finished part volume (for buy-to-fly)
  customer_supplied_material?: boolean;

  // Complexity & features
  complexity: "simple" | "medium" | "complex" | "very_complex";
  features?: FeatureSpec[];
  num_setups?: number;
  machine_type?: string;        // "cnc_mill_3axis" | "cnc_mill_5axis" | "cnc_lathe" etc.
  // Per-shop rate overrides (U-QP-RATE-WIRE). When supplied (e.g. InstantQuoteEngine
  // reading ShopConfigurationEngine for the active shop), these replace the inline
  // planning-default rates so the quote reflects THIS shop's actual $/hr -- killing
  // the silent divergence between the quote kernel and the real rate source. Absent
  // -> the documented planning defaults below are used (unchanged behavior).
  machine_rate_hr?: number;
  setup_rate_hr?: number;
  programming_rate_hr?: number;
  // Units-correct per-part material cost from a REAL source (U-QP-DOCUSTRATA-MATERIAL).
  // When supplied (e.g. InstantQuoteEngine: stock_volume_in3 x the JM AP-ledger
  // $/in3 consumable basis), it replaces the density x $/kg x scrap ESTIMATE. The
  // $/in3 basis is density-free + already block-form (scrap inherent in stock vs
  // part), so it is NOT additionally scrap-loaded.
  material_cost_per_part_override?: number;
  tightest_tolerance_mm?: number;
  tightest_surface_finish_ra?: number;

  // Operations (if known from CAM)
  operations?: Array<{
    name: string;
    type: string;
    cycle_time_min?: number;    // CAM-derived or estimated
    setup_time_min?: number;
    mrr_cm3_min?: number;
    volume_to_remove_cm3?: number;
    tool_count?: number;
  }>;

  // Cutting parameters (for physics-based cycle time)
  cutting_speed_mpm?: number;
  feed_per_tooth_mm?: number;
  depth_of_cut_mm?: number;
  tool_diameter_mm?: number;
  num_flutes?: number;

  // Secondary operations
  secondary_ops?: SecondaryOp[];

  // NRE
  nre_items?: NREItem[];

  // Inspection
  inspection_level?: "minimal" | "standard" | "detailed" | "full_cmm";
  first_article_required?: boolean;
  certifications?: string[];   // "AS9100", "ITAR", "NADCAP" etc.

  // Pricing options
  rush?: boolean;
  rush_tier?: "standard" | "3day" | "next_day";
  repeat_order?: boolean;
  customer_tier?: "A" | "B" | "C" | "new";
  target_margin_pct?: number;
  /** Minimum acceptable gross-margin %. A quote whose margin falls below this
   *  (after discount stacking) is FLAGGED (warning + pricing.below_margin_floor),
   *  never silently emitted and never auto-clamped/rejected. Canonical source:
   *  caller supplies from ShopConfigurationEngine; omitted → DEFAULT_MARGIN_FLOOR_PCT. */
  margin_floor_pct?: number;

  // Historical reference
  similar_part_id?: string;    // for lookup from quote history
}

export interface QuoteEstimateResult {
  quote_id: string;
  part_name: string;
  quantity: number;
  date: string;
  valid_until: string;

  // Cost breakdown (detailed)
  costs: {
    material: { raw_cost: number; scrap_pct: number; cert_cost: number; total: number };
    machining: {
      cycle_time_min: number;
      cycle_time_source: "cam_derived" | "physics_calculated" | "parametric_estimate" | "historical";
      machine_rate_hr: number;
      machine_cost: number;
      tool_change_cost: number;
      total: number;
    };
    setup: {
      num_setups: number;
      setup_minutes: number;
      fixture_complexity: string;
      setup_rate_hr: number;
      total: number;
    };
    tooling: {
      estimated_tool_count: number;
      tool_amortization_per_part: number;
      special_tooling_cost: number;
      total: number;
    };
    programming: { hours: number; rate_hr: number; total: number };
    inspection: {
      level: string;
      fai_cost: number;
      per_part_cost: number;
      cert_cost: number;
      total: number;
    };
    secondary_ops: {
      operations: Array<{ type: string; per_part: number; total: number; lead_time_days: number }>;
      total: number;
    };
    nre: {
      items: Array<{ type: string; description: string; cost: number; amortized_per_part: number }>;
      total_nre: number;
      amortized_per_part: number;
    };
    overhead: { rate_pct: number; total: number };
    total_cost_per_part: number;
    total_cost: number;
  };

  // Pricing
  pricing: {
    unit_price: number;
    total_price: number;
    margin_pct: number;
    /** True when margin_pct fell below the (config-sourced) margin floor — review before sending. */
    below_margin_floor: boolean;
    /** The margin floor % this quote was checked against. */
    margin_floor_pct: number;
    adjustments: {
      rush_premium_pct: number | null;
      volume_discount_pct: number | null;
      repeat_discount_pct: number | null;
      tolerance_premium_pct: number;
      complexity_premium_pct: number;
    };
  };

  // Lead time
  lead_time: {
    machining_days: number;
    secondary_ops_days: number;
    inspection_days: number;
    total_standard_days: number;
    total_rush_days: number;
  };

  // DfM warnings
  dfm_warnings: string[];

  // Buy-to-fly ratio
  buy_to_fly?: number;

  // Confidence score (0-100, based on data quality)
  confidence_score: number;
  confidence_factors: string[];

  // Session 5-3 (U-PHYSCOST3): Uncertainty-aware quoting — CI95 bands
  uncertainty?: {
    estimated_cost: number;
    ci95_low: number;
    ci95_high: number;
    confidence: number;
    dominant_uncertainty_source: string;
    cost_cv_pct: number;
    component_uncertainties: {
      machining_cv_pct: number;
      tool_life_cv_pct: number;
      material_cv_pct: number;
    };
  };

  // Price breaks (auto-generated)
  price_breaks: Array<{ qty: number; unit_price: number; total: number; lead_days: number }>;
}

// ─── Constants ───────────────────────────────────────────────

/** Default minimum gross-margin % floor used when the caller supplies none.
 *  20% matches the prior (now-deprecated) QuotingEngine.PRICING.minMargin and sits
 *  BELOW every customer-tier target margin (A 30 / B 35 / C 40 / new 38), so it only
 *  trips on heavily discount-stacked quotes. Authoritative floor is caller-supplied
 *  via QuoteEstimateInput.margin_floor_pct (sourced from ShopConfigurationEngine); this
 *  const is the labeled fallback default, NOT a scattered inline margin literal. The
 *  holistic "all quoting margins → ShopConfigurationEngine" refactor is tracked
 *  separately (reference_quoting_margin_floor_gate_gap_2026_06_09). */
const DEFAULT_MARGIN_FLOOR_PCT = 20;

const MATERIAL_DENSITY_KG_M3: Record<string, number> = {
  aluminum_6061: 2710, aluminum_7075: 2810, aluminum_2024: 2780,
  steel_1018: 7870, steel_4140: 7850, steel_4340: 7850,
  stainless_304: 8000, stainless_316: 8000, "stainless_17-4": 7780,
  titanium_gr2: 4510, titanium_gr5: 4430, inconel_718: 8190,
  brass_360: 8500, bronze_932: 8800, copper_110: 8940,
  plastic_delrin: 1410, plastic_peek: 1300, plastic_nylon: 1140,
};

const MATERIAL_PRICE_PER_KG: Record<string, number> = {
  aluminum_6061: 7.70, aluminum_7075: 11.00, aluminum_2024: 12.50,
  steel_1018: 2.75, steel_4140: 4.40, steel_4340: 5.50,
  stainless_304: 8.80, stainless_316: 12.10, "stainless_17-4": 17.60,
  titanium_gr2: 44.00, titanium_gr5: 55.00, inconel_718: 99.00,
  brass_360: 9.90, bronze_932: 13.20, copper_110: 15.40,
  plastic_delrin: 17.60, plastic_peek: 165.00, plastic_nylon: 11.00,
};

const MACHINABILITY_FACTOR: Record<string, number> = {
  aluminum_6061: 0.6, aluminum_7075: 0.65, aluminum_2024: 0.7,
  steel_1018: 1.0, steel_4140: 1.2, steel_4340: 1.4,
  stainless_304: 1.5, stainless_316: 1.6, "stainless_17-4": 1.8,
  titanium_gr2: 2.2, titanium_gr5: 2.5, inconel_718: 3.5,
  brass_360: 0.5, bronze_932: 0.7, copper_110: 0.6,
  plastic_delrin: 0.4, plastic_peek: 0.8, plastic_nylon: 0.4,
};

const MACHINE_RATE_HR: Record<string, number> = {
  manual_mill: 35, cnc_mill_3axis: 85, cnc_mill_5axis: 150,
  cnc_lathe: 75, swiss_lathe: 125, cnc_lathe_live: 110,
  wire_edm: 95, sinker_edm: 85,
  surface_grinder: 65, cylindrical_grinder: 75, centerless_grinder: 70,
  multi_spindle: 200,
};

const FIXTURE_COMPLEXITY: Record<string, { multiplier: number; label: string }> = {
  simple: { multiplier: 1.0, label: "Vise / collet" },
  moderate: { multiplier: 1.3, label: "Soft jaws / step clamps" },
  complex: { multiplier: 1.8, label: "Custom fixture" },
  very_complex: { multiplier: 2.5, label: "Multi-axis workholding / pallet" },
};

const TOLERANCE_PREMIUM: Record<string, number> = {
  loose: 0,       // > 0.1mm
  standard: 0,    // 0.05-0.1mm
  precision: 0.10, // 0.01-0.05mm — +10%
  tight: 0.25,    // 0.005-0.01mm — +25%
  ultra: 0.50,    // < 0.005mm — +50%
};

const RUSH_MULTIPLIERS: Record<string, number> = {
  standard: 1.0,
  "3day": 1.50,
  next_day: 2.00,
};

const VOLUME_DISCOUNT_TIERS = [
  { minQty: 10, discount: 0.03 },
  { minQty: 50, discount: 0.07 },
  { minQty: 100, discount: 0.12 },
  { minQty: 500, discount: 0.18 },
  { minQty: 1000, discount: 0.22 },
  { minQty: 5000, discount: 0.28 },
];

const LEARNING_CURVE_FACTOR = 0.85; // 85% learning curve

const CERT_COSTS: Record<string, number> = {
  AS9100: 150, ITAR: 200, NADCAP: 250, ISO13485: 175, FAI_AS9102: 350,
};

// ─── Feature Cost Multipliers ────────────────────────────────

const FEATURE_BASE_COST: Record<string, number> = {
  hole: 1.50, pocket: 8.00, slot: 5.00, thread: 3.00,
  chamfer: 0.50, fillet: 0.75, boss: 4.00, contour: 6.00,
  surface: 2.00, groove: 3.50, keyway: 7.00, undercut: 12.00,
};

function featureCost(f: FeatureSpec): number {
  let cost = (FEATURE_BASE_COST[f.type] ?? 5) * f.count;
  if (f.tolerance_mm != null && f.tolerance_mm < 0.025) cost *= 1.5;
  if (f.depth_ratio != null && f.depth_ratio > 4) cost *= 1.3;
  if (f.is_blind) cost *= 1.15;
  if (f.requires_5axis) cost *= 1.8;
  if (f.surface_finish_ra != null && f.surface_finish_ra < 0.8) cost *= 1.4;
  return cost;
}

// ─── Engine ──────────────────────────────────────────────────

let _quoteSeq = 1;

class QuoteEstimatorEngine {
  /**
   * Generate a comprehensive, physics-backed manufacturing quote estimate.
   */
  estimate(input: QuoteEstimateInput): QuoteEstimateResult {
    const qty = input.quantity;
    const mat = input.material.toLowerCase();
    const confidence: string[] = [];
    let confScore = 50; // start neutral

    // ── 1. Material Cost ──
    const materialCost = this.calcMaterialCost(input, confidence);
    // Stock-confidence credit applies to ANY VALID stock source (rect block OR round
    // bar) -- a turned part on bar stock is just as well-specified. Gate on the same
    // guarded resolver the cost driver uses, so a degraded source (NaN/zero/negative
    // dims) does NOT over-credit confidence while the cost falls back to the estimate.
    if (this.resolveStockVolumeCm3(input) != null) confScore += 10;

    // ── 2. Machining Cost (physics-backed) ──
    const machiningCost = this.calcMachiningCost(input, confidence);
    if (machiningCost.cycle_time_source === "cam_derived") confScore += 20;
    else if (machiningCost.cycle_time_source === "physics_calculated") confScore += 10;

    // ── 3. Setup Cost ──
    const setupCost = this.calcSetupCost(input);
    if (input.num_setups) confScore += 5;

    // ── 4. Tooling Cost ──
    const toolingCost = this.calcToolingCost(input);

    // ── 5. Programming Cost ──
    const progCost = this.calcProgrammingCost(input);

    // ── 6. Inspection Cost ──
    const inspCost = this.calcInspectionCost(input);

    // ── 7. Secondary Ops ──
    const secOpsCost = this.calcSecondaryOpsCost(input);

    // ── 8. NRE ──
    const nreCost = this.calcNRECost(input);

    // ── 9. Feature-based adder ──
    let featureAdder = 0;
    if (input.features?.length) {
      featureAdder = input.features.reduce((s, f) => s + featureCost(f), 0);
      confScore += 10;
    }

    // ── 10. Overhead (Session 5-2: from ShopConfigurationEngine, was hardcoded 15%) ──
    let overheadPct = 15;
    try { overheadPct = require("./ShopConfigurationEngine.js").shopConfigurationEngine.getActiveProfile().overhead_pct; } catch { /* fallback */ }
    const directCost = materialCost.total + machiningCost.total + setupCost.total
      + toolingCost.total + progCost.total + inspCost.total
      + secOpsCost.total + featureAdder;
    const overheadCost = round2(directCost * overheadPct / 100);

    const totalCost = round2(directCost + overheadCost + nreCost.amortized_per_part * qty);
    const costPerPart = round2(totalCost / Math.max(qty, 1));

    // ── 11. DfM Warnings ──
    const dfmWarnings = this.generateDfmWarnings(input);

    // ── 12. Pricing ──
    const tolerancePremium = this.calcTolerancePremium(input);
    const complexityPremium = this.calcComplexityPremium(input);
    const rushPremium = input.rush
      ? (RUSH_MULTIPLIERS[input.rush_tier ?? "3day"] ?? 1.5) - 1 : null;
    const volumeDiscount = this.getVolumeDiscount(qty);
    const repeatDiscount = input.repeat_order ? 0.08 : 0;
    const targetMargin = input.target_margin_pct ?? this.getMarginByCustomerTier(input.customer_tier);

    let pricePerPart = costPerPart / (1 - targetMargin / 100);
    pricePerPart *= (1 + tolerancePremium);
    pricePerPart *= (1 + complexityPremium);
    if (rushPremium != null) pricePerPart *= (1 + rushPremium);
    pricePerPart *= (1 - volumeDiscount);
    pricePerPart *= (1 - repeatDiscount);
    pricePerPart = this.roundPrice(pricePerPart);
    const totalPrice = round2(pricePerPart * qty);
    const actualMargin = totalPrice > 0
      ? round2(((totalPrice - totalCost) / totalPrice) * 100) : 0;

    // ── 12b. Margin-floor gate (R12 fail-loud) ──
    // Surface a sub-floor quote; do NOT silently emit it, and do NOT auto-clamp or
    // reject (a quoting tool warns, the operator decides). Floor is caller-supplied
    // (canonical, from ShopConfigurationEngine) or the labeled default.
    // Floor resolution mirrors the overhead_pct precedent (read from ShopConfigurationEngine):
    // explicit caller override -> active shop profile -> labeled default.
    let shopMarginFloor: number | undefined;
    try { shopMarginFloor = require("./ShopConfigurationEngine.js").shopConfigurationEngine.getActiveProfile().margin_floor_pct; } catch { /* fall back to default */ }
    const marginFloorPct = input.margin_floor_pct ?? shopMarginFloor ?? DEFAULT_MARGIN_FLOOR_PCT;
    const belowMarginFloor = actualMargin < marginFloorPct;
    if (belowMarginFloor) {
      dfmWarnings.push(
        `Margin ${actualMargin.toFixed(1)}% is below the ${marginFloorPct}% floor — ` +
        `discount stacking has eroded margin; review before sending this quote.`,
      );
    }

    // ── 13. Lead Time ──
    const leadTime = this.calcLeadTime(input, secOpsCost);

    // ── 14. Buy-to-fly ──
    let buyToFly: number | undefined;
    const stockVolForBtf = this.resolveStockVolumeCm3(input); // rect OR round bar
    if (stockVolForBtf && input.part_volume_cm3 && input.part_volume_cm3 > 0) {
      buyToFly = round2(stockVolForBtf.cm3 / input.part_volume_cm3);
    }

    // ── 15. Price Breaks ──
    const breakQtys = [1, 5, 10, 25, 50, 100, 250, 500, 1000].filter(q => q !== qty);
    const priceBreaks = breakQtys.map(q => {
      const breakInput = { ...input, quantity: q };
      const bCost = this.quickEstimateCostPerPart(breakInput);
      let bPrice = bCost / (1 - targetMargin / 100);
      bPrice *= (1 - this.getVolumeDiscount(q));
      bPrice = this.roundPrice(bPrice);
      return {
        qty: q,
        unit_price: bPrice,
        total: round2(bPrice * q),
        lead_days: this.quickLeadTimeDays(breakInput),
      };
    });

    confScore = Math.min(100, Math.max(10, confScore));

    // Session 5-3 (U-PHYSCOST3): CI95 uncertainty propagation from SpeedFeedOrchestrator
    const uncertainty = this._computeUncertainty(input, costPerPart, machiningCost.total, toolingCost.total, materialCost.total, totalCost);

    return {
      quote_id: `QE${new Date().getFullYear().toString().slice(-2)}-${String(_quoteSeq++).padStart(5, "0")}`,
      part_name: input.part_name ?? "Custom Part",
      quantity: qty,
      date: new Date().toISOString().slice(0, 10),
      valid_until: futureDate(30),
      costs: {
        material: materialCost,
        machining: machiningCost,
        setup: setupCost,
        tooling: toolingCost,
        programming: progCost,
        inspection: inspCost,
        secondary_ops: secOpsCost,
        nre: nreCost,
        overhead: { rate_pct: overheadPct, total: overheadCost },
        total_cost_per_part: costPerPart,
        total_cost: totalCost,
      },
      pricing: {
        unit_price: pricePerPart,
        total_price: totalPrice,
        margin_pct: actualMargin,
        below_margin_floor: belowMarginFloor,
        margin_floor_pct: marginFloorPct,
        adjustments: {
          rush_premium_pct: rushPremium != null ? round2(rushPremium * 100) : null,
          volume_discount_pct: volumeDiscount > 0 ? round2(volumeDiscount * 100) : null,
          repeat_discount_pct: repeatDiscount > 0 ? round2(repeatDiscount * 100) : null,
          tolerance_premium_pct: round2(tolerancePremium * 100),
          complexity_premium_pct: round2(complexityPremium * 100),
        },
      },
      lead_time: leadTime,
      dfm_warnings: dfmWarnings,
      buy_to_fly: buyToFly,
      confidence_score: confScore,
      confidence_factors: confidence,
      uncertainty,
      price_breaks: priceBreaks,
    };
  }

  /**
   * Compare quotes across different materials for the same part.
   */
  compareMaterials(
    baseInput: QuoteEstimateInput,
    materials: string[],
  ): Array<{ material: string; unit_price: number; total: number; lead_days: number; dfm_warnings: string[] }> {
    return materials.map(mat => {
      const est = this.estimate({ ...baseInput, material: mat });
      return {
        material: mat,
        unit_price: est.pricing.unit_price,
        total: est.pricing.total_price,
        lead_days: est.lead_time.total_standard_days,
        dfm_warnings: est.dfm_warnings,
      };
    });
  }

  /**
   * What-if analysis: toggle rush, quantity, tolerance to see price impact.
   */
  whatIf(
    baseInput: QuoteEstimateInput,
    scenarios: Array<Partial<QuoteEstimateInput>>,
  ): Array<{ scenario: string; unit_price: number; delta_pct: number }> {
    const base = this.estimate(baseInput);
    return scenarios.map((s, i) => {
      const est = this.estimate({ ...baseInput, ...s });
      const delta = base.pricing.unit_price > 0
        ? ((est.pricing.unit_price - base.pricing.unit_price) / base.pricing.unit_price) * 100
        : 0;
      return {
        scenario: `Scenario ${i + 1}`,
        unit_price: est.pricing.unit_price,
        delta_pct: round2(delta),
      };
    });
  }

  // ─── Private Calculation Methods ───────────────────────────

  /**
   * Resolve the part's STOCK volume in cm^3 from whichever source is supplied
   * (U-QP-ROUND-BAR-STOCK). Rectangular block bbox OR cylindrical bar stock --
   * before this, only `stock_dimensions_mm` (rect) produced a volume, so a turned
   * part on round bar silently lost buy-to-fly + the stock-confidence credit and
   * fell back to the complexity estimate. Precedence rect > round-bar (a part with
   * BOTH set is over-specified; the rectangular bbox is the tighter bound).
   *
   * mm^3 -> cm^3 is a pure SI factor (/1000); no physics constant. Returns null
   * when neither source is present or the computed volume is non-finite/non-positive,
   * so the caller falls back to the estimate (R12: never fabricate a stock volume).
   *
   * @param input the quote input carrying stock_dimensions_mm and/or stock_round_bar_mm
   * @returns { cm3, source } or null when no usable stock source is present
   */
  private resolveStockVolumeCm3(
    input: QuoteEstimateInput,
  ): { cm3: number; source: "rect_block" | "round_bar" } | null {
    // Delegates to the shared, unit-agnostic resolver (U-QP-STOCK-VOLUME-CORE) so
    // the cylinder geometry + finite/positive guards live in exactly one place.
    // QuoteEstimate inputs carry no stock_volume_in3, so only the rect/round-bar
    // sources resolve here; map the shared "_mm"-suffixed tag back to this engine's
    // internal "rect_block"/"round_bar" vocab so the two cost-driver call sites
    // (which switch on source) are unchanged.
    const r = sharedResolveStockVolumeCm3(input);
    if (!r) return null;
    // Exhaustive tag map (defends a future footgun: if stock_volume_in3 is ever added
    // to QuoteEstimateInput, an explicit_in3 result must NOT silently mislabel as
    // rect_block -- which would mis-apply the rect-kerf allowance in calcMaterialCost).
    // Today QuoteEstimateInput carries no stock_volume_in3, so explicit_in3 is
    // unreachable here and only rect_block_mm/round_bar_mm occur.
    const source =
      r.source === "round_bar_mm" ? "round_bar"
      : r.source === "rect_block_mm" ? "rect_block"
      : null;
    if (source === null) return null; // explicit_in3 unreachable for this input shape
    return { cm3: r.cm3, source };
  }

  private calcMaterialCost(
    input: QuoteEstimateInput,
    confidence: string[],
  ): QuoteEstimateResult["costs"]["material"] {
    if (input.customer_supplied_material) {
      confidence.push("material: customer-supplied (no material cost)");
      return { raw_cost: 0, scrap_pct: 0, cert_cost: 0, total: 0 };
    }

    // Units-correct real-cost override (U-QP-DOCUSTRATA-MATERIAL): a per-part
    // material $ derived from the JM AP-ledger $/in3 consumable basis x stock
    // volume. Already block-form (scrap inherent), density-free -> use as-is,
    // bypassing the density x $/kg x scrap planning estimate below.
    const matLower = input.material.toLowerCase();
    if (input.material_cost_per_part_override !== undefined && input.material_cost_per_part_override > 0) {
      const rawCost = round2(input.material_cost_per_part_override * input.quantity);
      let certCostOv = 0;
      if (input.certifications?.length) {
        certCostOv = 25 * input.quantity;
        if (input.certifications.includes("NADCAP")) certCostOv += 50;
      }
      confidence.push("material: real JM AP-ledger $/in3 basis (units-correct, density-free)");
      return { raw_cost: rawCost, scrap_pct: 0, cert_cost: round2(certCostOv), total: round2(rawCost + certCostOv) };
    }

    const mat = matLower;
    const density = MATERIAL_DENSITY_KG_M3[mat] ?? 7850;
    const priceKg = MATERIAL_PRICE_PER_KG[mat];

    if (!priceKg) {
      confidence.push(`material: unknown material '${mat}', using fallback $5.50/kg`);
    }
    const price = priceKg ?? 5.50;

    // Resolve stock volume through the SINGLE guarded resolver (rect block OR round
    // bar; returns null on a missing/non-finite/non-positive source -> estimate
    // fallback). This is the material-cost driver, so the +kerf/facing allowance is
    // applied on top of the resolved geometry (U-QP-ROUND-BAR-STOCK).
    let volumeMm3: number;
    const resolvedStock = this.resolveStockVolumeCm3(input);
    if (resolvedStock?.source === "rect_block" && input.stock_dimensions_mm) {
      const d = input.stock_dimensions_mm;
      volumeMm3 = (d.length + 3) * (d.width + 3) * (d.height + 2); // kerf allowance
      confidence.push("material: stock dimensions provided");
    } else if (resolvedStock?.source === "round_bar" && input.stock_round_bar_mm) {
      // Round bar: V = pi/4 * d^2 * L. The bar OD is the as-ordered stock diameter
      // (no diameter kerf pad -- you buy the bar at its OD), but the length carries a
      // ~6mm facing+parting allowance, mirroring the rect kerf in spirit. The resolver
      // already proved diameter/length finite + positive, so this cannot be NaN.
      const bar = input.stock_round_bar_mm;
      volumeMm3 = (Math.PI / 4) * bar.diameter * bar.diameter * (bar.length + 6);
      confidence.push("material: round-bar stock provided");
    } else {
      // Estimate from complexity (no usable stock source, or a degraded/non-finite one).
      const baseVol: Record<string, number> = {
        simple: 500000, medium: 1000000, complex: 2000000, very_complex: 4000000,
      };
      volumeMm3 = baseVol[input.complexity] ?? 1000000;
      confidence.push("material: estimated from complexity (low confidence)");
    }

    const weightKg = volumeMm3 * 1e-9 * density;
    const scrapPct = mat.includes("titanium") || mat.includes("inconel") ? 0.20 : 0.12;
    const rawCost = round2(weightKg * price * input.quantity * (1 + scrapPct));

    let certCost = 0;
    if (input.certifications?.length) {
      certCost = 25 * input.quantity; // mill cert cost
      if (input.certifications.includes("NADCAP")) certCost += 50;
    }

    return { raw_cost: rawCost, scrap_pct: round2(scrapPct * 100), cert_cost: certCost, total: round2(rawCost + certCost) };
  }

  private calcMachiningCost(
    input: QuoteEstimateInput,
    confidence: string[],
  ): QuoteEstimateResult["costs"]["machining"] {
    const machType = input.machine_type ?? "cnc_mill_3axis";
    // Per-shop injected rate (ShopConfigurationEngine) > inline planning default.
    const rate = input.machine_rate_hr ?? MACHINE_RATE_HR[machType] ?? 85;
    const qty = input.quantity;
    const machinability = MACHINABILITY_FACTOR[input.material.toLowerCase()] ?? 1.0;

    let cycleTimeMin: number;
    let source: "cam_derived" | "physics_calculated" | "parametric_estimate" | "historical";

    // Priority 1: CAM-derived cycle times from operations
    const ops = input.operations ?? [];
    const camTimes = ops.filter(o => o.cycle_time_min != null);
    if (camTimes.length > 0 && camTimes.length === ops.length) {
      cycleTimeMin = ops.reduce((s, o) => s + (o.cycle_time_min ?? 0), 0);
      source = "cam_derived";
      confidence.push("machining: CAM-derived cycle times (high confidence)");
    }
    // Priority 2: Physics-based from cutting params
    else if (input.cutting_speed_mpm && input.feed_per_tooth_mm && input.tool_diameter_mm) {
      cycleTimeMin = this.physicsCycleTime(input, machinability);
      source = "physics_calculated";
      confidence.push("machining: physics-calculated from cutting params");
    }
    // Priority 3: Parametric from volume + machinability
    else if (ops.some(o => o.volume_to_remove_cm3)) {
      const totalVol = ops.reduce((s, o) => s + (o.volume_to_remove_cm3 ?? 0), 0);
      const baseMrr = ops[0]?.mrr_cm3_min ?? 15;
      cycleTimeMin = (totalVol / baseMrr) * machinability * 1.3; // 30% overhead
      source = "parametric_estimate";
      confidence.push("machining: parametric from volume/MRR");
    }
    // Priority 4: Rough complexity-based estimate
    else {
      const baseTimes: Record<string, number> = {
        simple: 5, medium: 15, complex: 35, very_complex: 75,
      };
      cycleTimeMin = (baseTimes[input.complexity] ?? 15) * machinability;
      source = "parametric_estimate";
      confidence.push("machining: rough complexity estimate (low confidence)");
    }

    cycleTimeMin = Math.max(1, round2(cycleTimeMin));

    // Tool change time
    const toolCount = ops.reduce((s, o) => s + (o.tool_count ?? 1), 0) || 4;
    const toolChangeMin = toolCount * 0.25 * qty;
    const totalMachineMin = cycleTimeMin * qty + toolChangeMin;
    const machineCost = round2((totalMachineMin / 60) * rate);
    const toolChangeCost = round2((toolChangeMin / 60) * rate);

    return {
      cycle_time_min: cycleTimeMin,
      cycle_time_source: source,
      machine_rate_hr: rate,
      machine_cost: machineCost,
      tool_change_cost: toolChangeCost,
      total: machineCost,
    };
  }

  private physicsCycleTime(input: QuoteEstimateInput, machinability: number): number {
    const Vc = input.cutting_speed_mpm!;
    const fz = input.feed_per_tooth_mm!;
    const d = input.tool_diameter_mm!;
    const z = input.num_flutes ?? 4;
    const ap = input.depth_of_cut_mm ?? 2;

    // RPM = (Vc × 1000) / (pi × d)
    const rpm = (Vc * 1000) / (Math.PI * d);
    // Feed rate mm/min = fz × z × RPM
    const feedRate = fz * z * rpm;
    // MRR cm3/min = (ap × ae × feedRate) / 1000 where ae ~ 0.5×d for roughing
    const ae = d * 0.5;
    const mrr = (ap * ae * feedRate) / 1000;

    // Estimate volume to remove from stock dims (rect OR round bar)
    let volToRemove = 50; // cm3 fallback
    const stockVolForMrr = this.resolveStockVolumeCm3(input);
    if (stockVolForMrr && input.part_volume_cm3) {
      // Clamp at >0: a part_volume that exceeds the resolved stock (bad input) must
      // not feed a negative material-to-remove into the MRR/cycle uncertainty.
      volToRemove = Math.max(0, stockVolForMrr.cm3 - input.part_volume_cm3);
    }

    // Roughing (70% of material) at calculated MRR, finishing (30%) at 25% MRR
    const roughTime = (volToRemove * 0.7) / Math.max(mrr, 0.1);
    const finishTime = (volToRemove * 0.3) / Math.max(mrr * 0.25, 0.1);
    return (roughTime + finishTime) * machinability;
  }

  private calcSetupCost(input: QuoteEstimateInput): QuoteEstimateResult["costs"]["setup"] {
    const numSetups = input.num_setups ?? (input.complexity === "simple" ? 1
      : input.complexity === "medium" ? 2 : input.complexity === "complex" ? 3 : 4);

    const fixtureKey = input.complexity === "very_complex" ? "very_complex"
      : input.complexity === "complex" ? "complex"
      : input.complexity === "medium" ? "moderate" : "simple";
    const fixture = FIXTURE_COMPLEXITY[fixtureKey];

    const baseMinPerSetup = 25;
    const setupMin = round2(numSetups * baseMinPerSetup * fixture.multiplier);
    const setupRate = input.setup_rate_hr ?? 55; // per-shop injected > planning default

    return {
      num_setups: numSetups,
      setup_minutes: setupMin,
      fixture_complexity: fixture.label,
      setup_rate_hr: setupRate,
      total: round2((setupMin / 60) * setupRate),
    };
  }

  private calcToolingCost(input: QuoteEstimateInput): QuoteEstimateResult["costs"]["tooling"] {
    const ops = input.operations ?? [];
    const toolCount = ops.reduce((s, o) => s + (o.tool_count ?? 1), 0) || 4;
    const machinability = MACHINABILITY_FACTOR[input.material.toLowerCase()] ?? 1.0;

    // Average tool cost: $35 for standard, more for exotic materials
    const avgToolCost = 35 * Math.max(1, machinability * 0.8);
    // Tool life: ~120 min for carbide in steel, adjusted by machinability
    const toolLifeMin = 120 / machinability;
    // Cycle time estimate
    const cyclePerPart = input.operations?.[0]?.cycle_time_min ?? 15;
    const totalCuttingMin = cyclePerPart * input.quantity;
    const toolChanges = Math.ceil(totalCuttingMin / toolLifeMin);
    const amortPerPart = round2((toolChanges * avgToolCost) / Math.max(input.quantity, 1));

    // Special tooling (form tools, custom reamers)
    let specialCost = 0;
    if (input.features?.some(f => f.type === "keyway" || f.type === "undercut")) {
      specialCost = 150;
    }

    return {
      estimated_tool_count: toolCount,
      tool_amortization_per_part: amortPerPart,
      special_tooling_cost: specialCost,
      total: round2(amortPerPart * input.quantity + specialCost),
    };
  }

  private calcProgrammingCost(input: QuoteEstimateInput): QuoteEstimateResult["costs"]["programming"] {
    const baseHours: Record<string, number> = {
      simple: 0.5, medium: 2, complex: 5, very_complex: 10,
    };
    let hours = baseHours[input.complexity] ?? 2;
    if (input.machine_type?.includes("5axis")) hours *= 1.6;
    const rate = input.programming_rate_hr ?? 75; // per-shop injected > planning default
    // Repeat orders: programming already done
    if (input.repeat_order) hours *= 0.1; // 10% for prove-out only
    return { hours: round2(hours), rate_hr: rate, total: round2(hours * rate) };
  }

  private calcInspectionCost(input: QuoteEstimateInput): QuoteEstimateResult["costs"]["inspection"] {
    const level = input.inspection_level ?? "standard";
    const qty = input.quantity;
    const minPerPart: Record<string, number> = { minimal: 2, standard: 5, detailed: 15, full_cmm: 30 };
    const mpp = minPerPart[level] ?? 5;

    // Sampling
    let inspect = qty;
    if (qty > 50) inspect = Math.ceil(qty * 0.1) + 10;
    else if (qty > 20) inspect = Math.ceil(qty * 0.2) + 5;

    const perPartCost = round2((mpp / 60) * 50);
    const faiCost = input.first_article_required ? round2((45 / 60) * 50) : 0;

    let certCost = 0;
    for (const cert of input.certifications ?? []) {
      certCost += CERT_COSTS[cert] ?? 100;
    }

    const totalInspCost = round2(inspect * perPartCost + faiCost + certCost);
    return { level, fai_cost: faiCost, per_part_cost: perPartCost, cert_cost: certCost, total: totalInspCost };
  }

  private calcSecondaryOpsCost(
    input: QuoteEstimateInput,
  ): QuoteEstimateResult["costs"]["secondary_ops"] {
    const ops = input.secondary_ops ?? [];
    if (ops.length === 0) return { operations: [], total: 0 };

    // Import from SecondaryOpsEngine if available, otherwise use inline catalog
    const catalog: Record<string, { per_part: number; lead_days: number }> = {
      anodize_type_ii: { per_part: 8, lead_days: 5 },
      anodize_type_iii: { per_part: 15, lead_days: 7 },
      hard_coat: { per_part: 18, lead_days: 7 },
      passivate: { per_part: 3, lead_days: 3 },
      black_oxide: { per_part: 2.50, lead_days: 3 },
      zinc_plate: { per_part: 5, lead_days: 5 },
      nickel_plate: { per_part: 10, lead_days: 7 },
      chrome_plate: { per_part: 18, lead_days: 10 },
      powder_coat: { per_part: 12, lead_days: 5 },
      heat_treat_stress_relief: { per_part: 4, lead_days: 3 },
      heat_treat_harden: { per_part: 8, lead_days: 5 },
      heat_treat_case_harden: { per_part: 12, lead_days: 7 },
      nitriding: { per_part: 15, lead_days: 7 },
      carburizing: { per_part: 10, lead_days: 5 },
      cryogenic: { per_part: 8, lead_days: 5 },
      deburr_manual: { per_part: 2, lead_days: 0 },
      deburr_tumble: { per_part: 1.50, lead_days: 1 },
      deburr_thermal: { per_part: 5, lead_days: 3 },
      bead_blast: { per_part: 3, lead_days: 1 },
      laser_engrave: { per_part: 4, lead_days: 1 },
      grinding_surface: { per_part: 10, lead_days: 2 },
      grinding_cylindrical: { per_part: 12, lead_days: 3 },
      honing: { per_part: 15, lead_days: 3 },
      lapping: { per_part: 20, lead_days: 5 },
      edm_wire: { per_part: 25, lead_days: 3 },
      edm_sinker: { per_part: 35, lead_days: 5 },
      balancing: { per_part: 15, lead_days: 3 },
      ndt_dye_penetrant: { per_part: 8, lead_days: 2 },
      ndt_mag_particle: { per_part: 10, lead_days: 2 },
      ndt_xray: { per_part: 50, lead_days: 5 },
    };

    const results = ops.map(op => {
      const entry = catalog[op.type] ?? { per_part: 10, lead_days: 5 };
      const perPart = op.vendor_quote
        ? round2(op.vendor_quote / Math.max(input.quantity, 1))
        : entry.per_part;
      const opQty = op.quantity ?? input.quantity;
      return {
        type: op.type,
        per_part: perPart,
        total: round2(perPart * opQty),
        lead_time_days: entry.lead_days,
      };
    });

    return {
      operations: results,
      total: round2(results.reduce((s, r) => s + r.total, 0)),
    };
  }

  private calcNRECost(input: QuoteEstimateInput): QuoteEstimateResult["costs"]["nre"] {
    const items = input.nre_items ?? [];
    if (items.length === 0) return { items: [], total_nre: 0, amortized_per_part: 0 };

    const NRE_RATES: Record<string, number> = {
      programming: 75, fixture_design: 85, fixture_build: 65,
      custom_tooling: 55, process_development: 90, prove_out: 75, prototype_run: 85,
    };

    const results = items.map(item => {
      const cost = item.estimated_cost ?? (item.estimated_hours ?? 4) * (NRE_RATES[item.type] ?? 75);
      const amortQty = item.amortize_over_qty || input.quantity || 1;
      return {
        type: item.type,
        description: item.description,
        cost: round2(cost),
        amortized_per_part: round2(cost / amortQty),
      };
    });

    const totalNRE = results.reduce((s, r) => s + r.cost, 0);
    const amortPerPart = results.reduce((s, r) => s + r.amortized_per_part, 0);

    return { items: results, total_nre: round2(totalNRE), amortized_per_part: round2(amortPerPart) };
  }

  private calcTolerancePremium(input: QuoteEstimateInput): number {
    const tol = input.tightest_tolerance_mm;
    if (!tol) return 0;
    if (tol < 0.005) return TOLERANCE_PREMIUM.ultra;
    if (tol < 0.01) return TOLERANCE_PREMIUM.tight;
    if (tol < 0.05) return TOLERANCE_PREMIUM.precision;
    return 0;
  }

  private calcComplexityPremium(input: QuoteEstimateInput): number {
    const premiums: Record<string, number> = {
      simple: 0, medium: 0, complex: 0.10, very_complex: 0.25,
    };
    return premiums[input.complexity] ?? 0;
  }

  private getMarginByCustomerTier(tier?: string): number {
    const margins: Record<string, number> = { A: 30, B: 35, C: 40, new: 38 };
    return margins[tier ?? "B"] ?? 35;
  }

  private getVolumeDiscount(qty: number): number {
    for (let i = VOLUME_DISCOUNT_TIERS.length - 1; i >= 0; i--) {
      if (qty >= VOLUME_DISCOUNT_TIERS[i].minQty) return VOLUME_DISCOUNT_TIERS[i].discount;
    }
    return 0;
  }

  private calcLeadTime(
    input: QuoteEstimateInput,
    secOps: QuoteEstimateResult["costs"]["secondary_ops"],
  ): QuoteEstimateResult["lead_time"] {
    const baseDays: Record<string, number> = {
      simple: 5, medium: 8, complex: 12, very_complex: 20,
    };
    const machDays = baseDays[input.complexity] ?? 8;
    const qtyDays = Math.ceil(input.quantity / 100) * 2;
    const secOpDays = secOps.operations.reduce((max, o) =>
      Math.max(max, o.lead_time_days), 0);
    const inspDays = input.first_article_required ? 2 : 1;
    const total = machDays + qtyDays + secOpDays + inspDays;

    return {
      machining_days: machDays + qtyDays,
      secondary_ops_days: secOpDays,
      inspection_days: inspDays,
      total_standard_days: total,
      total_rush_days: Math.ceil(total * 0.5),
    };
  }

  private generateDfmWarnings(input: QuoteEstimateInput): string[] {
    const warnings: string[] = [];
    const mat = input.material.toLowerCase();

    if (input.tightest_tolerance_mm != null && input.tightest_tolerance_mm < 0.005) {
      warnings.push("Tolerance < 0.005mm requires grinding or lapping — significant cost adder");
    }
    if (input.tightest_surface_finish_ra != null && input.tightest_surface_finish_ra < 0.4) {
      warnings.push("Surface finish Ra < 0.4um may require secondary grinding/polishing");
    }
    if (input.features?.some(f => f.depth_ratio != null && f.depth_ratio > 6)) {
      warnings.push("Deep pocket/bore (L/D > 6:1) — special tooling, reduced feeds, possible vibration");
    }
    if (input.features?.some(f => f.type === "undercut")) {
      warnings.push("Undercuts require special tooling or EDM — confirm tool access");
    }
    if (mat.includes("titanium") && input.machine_type?.includes("5axis")) {
      warnings.push("Titanium + 5-axis: ensure flood coolant and rigid setup — fire risk with inadequate cooling");
    }
    if (input.features?.some(f => f.requires_5axis) && !input.machine_type?.includes("5axis")) {
      warnings.push("Part has 5-axis features but 3-axis machine specified — additional setups required");
    }
    if (mat.includes("inconel") || mat.includes("titanium")) {
      warnings.push(`${mat} has high tool wear rate — tooling cost may be 2-3x standard`);
    }
    if (input.quantity === 1) {
      warnings.push("Single-piece order: setup and programming cost dominate — consider qty 5+ for better value");
    }

    return warnings;
  }

  private quickEstimateCostPerPart(input: QuoteEstimateInput): number {
    const mat = input.material.toLowerCase();
    const machinability = MACHINABILITY_FACTOR[mat] ?? 1.0;
    const baseTimes: Record<string, number> = { simple: 5, medium: 15, complex: 35, very_complex: 75 };
    const cycleMin = (baseTimes[input.complexity] ?? 15) * machinability;
    const machRate = input.machine_rate_hr ?? MACHINE_RATE_HR[input.machine_type ?? "cnc_mill_3axis"] ?? 85;
    const machCost = (cycleMin / 60) * machRate;

    // Simplified material + setup + overhead
    const matCost = 10 * machinability;
    const setupAmort = 50 / Math.max(input.quantity, 1);
    const overhead = (machCost + matCost) * 0.15;

    // Learning curve for volume — Wright's law: C(n) = C(1) × n^b, b = log2(learning_rate)
    // Source: Crawford (1944) unit-cost model; NASA CEH 2015 Ch.8
    const learningFactor = input.quantity > 1
      ? Math.pow(input.quantity, Math.log2(LEARNING_CURVE_FACTOR))
      : 1;

    return round2((machCost + matCost + setupAmort + overhead) * Math.max(learningFactor, 0.7));
  }

  private quickLeadTimeDays(input: QuoteEstimateInput): number {
    const base: Record<string, number> = { simple: 5, medium: 8, complex: 12, very_complex: 20 };
    return (base[input.complexity] ?? 8) + Math.ceil(input.quantity / 100) * 2;
  }

  private roundPrice(price: number): number {
    if (price < 10) return Math.ceil(price * 100) / 100;
    if (price < 100) return Math.ceil(price * 10) / 10;
    if (price < 1000) return Math.ceil(price / 5) * 5;
    return Math.ceil(price / 10) * 10;
  }

  /**
   * Session 5-3 (U-PHYSCOST3): Compute CI95 uncertainty bands for the quote.
   *
   * Propagates SpeedFeedOrchestrator's coefficient of variation (CV%) through
   * the cost model using RSS (root-sum-square) for independent cost components.
   * CI95 = estimated ± 1.96 × (CV/100) × estimated.
   *
   * Reference: GUM (Guide to the expression of Uncertainty in Measurement),
   * ISO/IEC 98-3:2008 — RSS propagation for uncorrelated inputs.
   */
  private _computeUncertainty(
    input: QuoteEstimateInput,
    costPerPart: number,
    machiningCost: number,
    toolingCost: number,
    materialCost: number,
    totalCost: number,
  ): QuoteEstimateResult["uncertainty"] {
    // Get physics uncertainty from SpeedFeedOrchestrator
    let machiningCvPct = 15; // default uncertainty if no physics
    let toolLifeCvPct = 25;  // tool life typically more uncertain
    let physicsConfidence = 0.5;

    try {
      const mod = require("./SpeedFeedOrchestratorEngine.js");
      const engine = mod.speedFeedOrchestratorEngine;
      const r = engine.compute({
        material: input.material,
        tool_diameter_mm: input.tool_diameter_mm ?? 12,
        flute_count: input.num_flutes ?? 4,
        axial_depth_mm: input.depth_of_cut_mm ?? 5,
        operation: input.complexity === "simple" ? "finishing" : "roughing",
        output_detail: "minimal",
      }).value;

      machiningCvPct = r.uncertainty?.speed_cv_pct ?? 15;
      toolLifeCvPct = r.uncertainty?.life_cv_pct ?? 25;
      physicsConfidence = r.overall_confidence ?? 0.5;
    } catch { /* use defaults */ }

    // Material cost uncertainty: ±5% for known materials, ±15% for unknown
    const materialCvPct = MATERIAL_DENSITY_KG_M3[input.material.toLowerCase()] ? 5 : 15;

    // RSS propagation: total CV² = Σ (weight_i × CV_i)²
    // where weight_i = cost_component / total_cost
    const total = Math.max(totalCost, 1);
    const wMachining = machiningCost / total;
    const wTooling = toolingCost / total;
    const wMaterial = materialCost / total;
    const wOther = 1 - wMachining - wTooling - wMaterial;

    const otherCvPct = 5; // overhead, programming, inspection — relatively stable
    const totalCvSq =
      Math.pow(wMachining * machiningCvPct, 2)
      + Math.pow(wTooling * toolLifeCvPct, 2)
      + Math.pow(wMaterial * materialCvPct, 2)
      + Math.pow(wOther * otherCvPct, 2);
    const totalCvPct = Math.sqrt(totalCvSq);

    // CI95 = estimate ± 1.96 × σ, where σ = CV/100 × estimate
    const sigma = (totalCvPct / 100) * costPerPart;
    const ci95Low = round2(costPerPart - 1.96 * sigma);
    const ci95High = round2(costPerPart + 1.96 * sigma);

    // Dominant uncertainty source: the component with highest weighted CV
    const componentContributions = [
      { name: "machining_speed_feed", contrib: wMachining * machiningCvPct },
      { name: "tool_life", contrib: wTooling * toolLifeCvPct },
      { name: "material_cost", contrib: wMaterial * materialCvPct },
      { name: "overhead_and_other", contrib: wOther * otherCvPct },
    ];
    componentContributions.sort((a, b) => b.contrib - a.contrib);

    return {
      estimated_cost: costPerPart,
      ci95_low: Math.max(ci95Low, 0),
      ci95_high: ci95High,
      confidence: round2(physicsConfidence),
      dominant_uncertainty_source: componentContributions[0].name,
      cost_cv_pct: round2(totalCvPct),
      component_uncertainties: {
        machining_cv_pct: round2(machiningCvPct),
        tool_life_cv_pct: round2(toolLifeCvPct),
        material_cv_pct: round2(materialCvPct),
      },
    };
  }

  /**
   * U-QP-CALIBRATION-WIRE — calibrated quote estimate.
   *
   * Wraps estimate() with a post-processing step that applies the currently-
   * active calibration factor from QuotingActiveFactorLoaderEngine. This is
   * the runtime end of the U-QT10 → U-COV-QUOTING → U-QAF-RUNTIME loop:
   * every quote emitted via this method gets the systematic over-prediction
   * corrected automatically.
   *
   * Backward compat:
   *   - Sync `.estimate(input)` is unchanged — callers who want raw FMV stay
   *     on it (e.g., training-loop record generation must NOT calibrate or
   *     it would deflate the bias signal that drives the calibration cycle).
   *   - `opts.skipCalibration: true` forces raw FMV from the async path too.
   *
   * Fallback:
   *   - When no active factors loaded → returns base estimate with
   *     `calibration.applied = false` + reason. Pricing unchanged.
   *
   * @milestone DEEP-REASONING-BRIDGE-MS0/U-QP-CALIBRATION-WIRE
   * @author slot:charlie /goal-20 iter2, 2026-05-25
   */
  async estimateCalibrated(
    input: QuoteEstimateInput,
    opts: { skipCalibration?: boolean; customer?: string; maxFactorAgeHours?: number } = {},
  ): Promise<QuoteEstimateResult & { calibration: CalibrationResult }> {
    const base = this.estimate(input);
    if (opts.skipCalibration) {
      return {
        ...base,
        calibration: {
          applied: false,
          factor_used: 1,
          factor_source: "balanced-pass-through",
          reason: "skipCalibration-flag",
        },
      };
    }

    const { quotingActiveFactorLoaderEngine } = await import("./QuotingActiveFactorLoaderEngine.js");
    const customerKey = opts.customer ?? this.deriveCustomerKey(input);
    const applied = await quotingActiveFactorLoaderEngine.applyToQuote(
      base.pricing.unit_price,
      customerKey,
    );

    if (applied.fallback_used || !applied.ok) {
      return {
        ...base,
        calibration: {
          applied: false,
          factor_used: applied.factor_used,
          factor_source: applied.factor_source,
          reason: applied.fallback_reason ?? "no-active-factors",
          metadata: applied.factor_metadata,
        },
      };
    }

    // U-QP-CALIBRATION-FRESHNESS-PREFLIGHT (charlie 2026-06-09): the loader flags a factor
    // older than its 24h staleness threshold as isStale; estimateCalibrated must ACT on it.
    // A stale over-prediction correction applied silently to a live customer quote mis-prices
    // once JM's real costs shift -- the quote-time analog of soul-refuse #4 (no freshness
    // preflight). Soft path: apply but WARN. Hard path (opt-in maxFactorAgeHours): refuse +
    // emit raw FMV, since an uncalibrated FMV is safer to send than a known-too-stale factor.
    const factorMeta = applied.factor_metadata;
    const factorAgeMinutes: number | undefined =
      typeof factorMeta?.ageMinutes === "number" && Number.isFinite(factorMeta.ageMinutes)
        ? factorMeta.ageMinutes
        : undefined;
    const factorIsStale = factorMeta?.isStale === true;
    const maxAgeMinutes =
      typeof opts.maxFactorAgeHours === "number" && opts.maxFactorAgeHours > 0
        ? opts.maxFactorAgeHours * 60
        : null;
    if (maxAgeMinutes !== null && factorAgeMinutes !== undefined && factorAgeMinutes > maxAgeMinutes) {
      const ageH = Math.round(factorAgeMinutes / 60);
      return {
        ...base,
        dfm_warnings: [
          ...base.dfm_warnings,
          `Calibration factor is ${ageH}h old (max ${opts.maxFactorAgeHours}h) -- quote emitted ` +
            `UNCALIBRATED (raw FMV). Re-derive calibration before relying on this quote.`,
        ],
        calibration: {
          applied: false,
          factor_used: 1,
          factor_source: "balanced-pass-through",
          reason: `factor-too-stale-${ageH}h`,
          is_stale: true,
          factor_age_minutes: factorAgeMinutes,
          metadata: factorMeta,
        },
      };
    }

    // Re-derive total + margin against the calibrated per-part price.
    const newUnitPrice = applied.corrected_usd;
    const newTotalPrice = round2(newUnitPrice * input.quantity);
    const newMargin = newTotalPrice > 0
      ? round2(((newTotalPrice - base.costs.total_cost) / newTotalPrice) * 100)
      : 0;

    // Re-evaluate the margin-floor gate against the CALIBRATED margin (not base's),
    // so a calibration that erodes margin across the floor is still flagged (R12/R15 —
    // the gate must cover every quote-emitting path, not only the uncalibrated one).
    const calBelowFloor = newMargin < base.pricing.margin_floor_pct;
    const calWarnings = (calBelowFloor && !base.pricing.below_margin_floor)
      ? [...base.dfm_warnings,
         `Margin ${newMargin.toFixed(1)}% is below the ${base.pricing.margin_floor_pct}% floor ` +
         `after calibration — review before sending this quote.`]
      : base.dfm_warnings;

    return {
      ...base,
      dfm_warnings: factorIsStale
        ? [
            ...calWarnings,
            `Calibration factor is ${factorAgeMinutes !== undefined ? Math.round(factorAgeMinutes / 60) + "h" : "24h+"} old -- ` +
              `re-derive before relying on this quote (the calibration distribution may have drifted).`,
          ]
        : calWarnings,
      pricing: {
        ...base.pricing,
        unit_price: newUnitPrice,
        total_price: newTotalPrice,
        margin_pct: newMargin,
        below_margin_floor: calBelowFloor,
      },
      calibration: {
        applied: true,
        factor_used: applied.factor_used,
        factor_source: applied.factor_source,
        pre_calibration_unit_price: base.pricing.unit_price,
        pre_calibration_total_price: base.pricing.total_price,
        pre_calibration_margin_pct: base.pricing.margin_pct,
        is_stale: factorIsStale,
        factor_age_minutes: factorAgeMinutes,
        metadata: applied.factor_metadata,
      },
    };
  }

  /** Derive a customer key from QuoteEstimateInput for per-customer factor lookup. */
  private deriveCustomerKey(input: QuoteEstimateInput): string | undefined {
    // The QuoteEstimateInput shape doesn't currently carry an explicit customer
    // string (only customer_tier). When calibration grows per-customer factors
    // — which require ≥3 records per customer (DEFAULT_MIN_RECORDS) — the
    // caller will need to pass customer explicitly via opts.customer. Until
    // then we map the tier to a stable key so global fallback applies.
    if (input.customer_tier) return undefined; // explicit-only: don't smuggle tier into customer namespace
    return undefined;
  }
}

/** U-QP-CALIBRATION-WIRE — calibration metadata block attached to a calibrated quote. */
export interface CalibrationResult {
  applied: boolean;
  factor_used: number;
  factor_source: "per-customer" | "global" | "balanced-pass-through";
  reason?: string;
  pre_calibration_unit_price?: number;
  pre_calibration_total_price?: number;
  pre_calibration_margin_pct?: number;
  /** U-QP-CALIBRATION-FRESHNESS-PREFLIGHT: true when the applied (or refused) factor exceeded the loader 24h staleness threshold or the opt-in maxFactorAgeHours cutoff. */
  is_stale?: boolean;
  /** Age of the applied (or refused) calibration factor in minutes, when derivable from generated_at. */
  factor_age_minutes?: number;
  metadata?: unknown;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const quoteEstimatorEngine = new QuoteEstimatorEngine();
export { QuoteEstimatorEngine };
