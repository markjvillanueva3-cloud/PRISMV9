/**
 * LatheAutoQuoteFromPrintEngine — U-LTH48 (LATHE-MASTER P5 ERP)
 *
 * Bridge from P4 print-to-program pipeline output to a shop-floor-grade
 * instant quote. Consumes the SequencePlan + ToolpathProgram (+ optional
 * SignoffPackage) and produces a 6-bucket cost breakdown:
 *
 *   1. Material cost   — stock volume × density × $/kg × (1 + scrap)
 *   2. Tool wear cost  — Σ (cycle_min_op / T_taylor) × $_per_insert
 *   3. Cycle cost      — (cycle_min + rapid_min) × $/machine_hr
 *   4. Setup cost      — setup_count × setup_min_per_setup × $/setup_hr
 *   5. Overhead        — direct_cost × overhead_rate
 *   6. Margin          — (direct + overhead) × margin_rate × rush_multiplier
 *
 * Physics:
 *   - Stock volume:   V = π/4 · (OD² − ID²) · L  [mm³] → cm³
 *   - Taylor life:    T = (C / Vc)^(1/n)  [min]
 *   - Feed rate:      Fmm_min = fz · N  [mm/min]
 *   - Rapid time:     L_rapid / RAPID_FEED  [min]
 *
 * Citations:
 *   - Machinery's Handbook 31st (shop rate baselines, setup times)
 *   - CANONICAL_MATERIAL_DB / CANONICAL_TAYLOR (src/physics/constants.ts)
 *   - JM Die 2026 shop-floor rate card ($85/hr machine, $95/hr setup, 35% margin)
 *
 * Exit gate (U-LTH48):
 *   - Quote produced in ≤ 90 seconds wall clock
 *   - Quote variance band ≤ ±10% vs manual quote on 10 JM Die fixtures
 *   - All 6 cost buckets > 0 and sum = total
 *
 * @milestone LATHE-MASTER U-LTH48
 * @version 1.0.0
 */

import { z } from "zod";
import { CANONICAL_MATERIAL_DB, CANONICAL_TAYLOR, type ISOGroup } from "../physics/constants.js";
import type { SequencePlan } from "./LathePrintSequencePlannerEngine.js";
import type { ToolpathProgram, ToolpathOperation } from "./LathePrintToolpathGeneratorEngine.js";
import type { MaterialInput } from "./LathePrintFeatureStrategySelectorEngine.js";
import type { SignoffPackage } from "./LathePrintProgramSignoffEngine.js";

// ============================================================================
// RATE TABLES (JM Die 2026 baselines)
// ============================================================================

/** Material $/kg by ISO group. Reflects JM Die midwest-US spot pricing 2026 Q2. */
const MATERIAL_PRICE_USD_PER_KG: Record<ISOGroup, number> = {
  P: 2.50,   // Carbon/alloy steel bar stock
  M: 6.00,   // 304/316 stainless
  K: 1.50,   // Gray iron bar
  N: 3.50,   // 6061/7075 aluminum
  S: 45.00,  // Inconel 718, Ti-6Al-4V (averaged)
  H: 4.00,   // D2/A2 hardened tool steel (pre-hardened stock)
};

/** Scrap allowance factor (unitless). Bar ends, facing stock, workholding. */
const SCRAP_FACTOR_BY_ISO: Record<ISOGroup, number> = {
  P: 0.20, M: 0.20, K: 0.20, N: 0.15, S: 0.25, H: 0.25,
};

/** Machine rate $/hour (lathe cutting time). */
const MACHINE_RATE_USD_HR = 85;
/** Setup rate $/hour (senior machinist, spindle idle). */
const SETUP_RATE_USD_HR = 95;
/** Overhead burden (fraction of direct cost). */
const OVERHEAD_RATE = 0.15;
/** Default margin (fraction applied to direct + overhead). */
const DEFAULT_MARGIN_RATE = 0.35;
/** Setup minutes per unique setup (OP10/OP20/...). Machinery's Handbook 31st typical. */
const SETUP_MIN_PER_SETUP = 45;
/** Programming amortization: one-time programming cost per job, split across quantity. */
const PROGRAMMING_COST_USD = 180;

/** Tool cost $/insert (or whole tool for bore bars) by toolpath category. */
const TOOL_COST_USD: Record<string, number> = {
  rough: 12,
  finish: 18,
  drill: 40,
  bore: 150,
  thread: 25,
  groove: 22,
};

/** Rapid feed rate mm/min (matches toolpath engine RAPID_FEED_MM_MIN). */
const RAPID_FEED_MM_MIN = 20000;
/** Conservative non-cut rapid distance per op (tool approach + retract) in mm. */
const RAPID_DISTANCE_PER_OP_MM = 200;

// ============================================================================
// SCHEMAS
// ============================================================================

/** Input for quote generation. */
export const QuoteInputSchema = z.object({
  quantity: z.number().int().min(1).max(100000),
  rush_multiplier: z.number().min(1).max(3).optional(),
  margin_rate_override: z.number().min(0).max(2).optional(),
  customer: z.string().optional(),
  part_number: z.string().optional(),
  material_price_usd_per_kg_override: z.number().min(0).optional(),
  machine_rate_usd_hr_override: z.number().min(0).optional(),
});
export type QuoteInput = z.infer<typeof QuoteInputSchema>;

/** Per-op tool wear breakdown. */
export const ToolWearLineSchema = z.object({
  op_number: z.number().int(),
  category: z.string(),
  cycle_min: z.number(),
  taylor_life_min: z.number(),
  life_consumed_fraction: z.number(),
  tool_cost_usd: z.number(),
  contribution_usd: z.number(),
});
export type ToolWearLine = z.infer<typeof ToolWearLineSchema>;

/** Cost bucket breakdown. */
export const CostBreakdownSchema = z.object({
  material_usd: z.number(),
  tool_wear_usd: z.number(),
  cycle_usd: z.number(),
  setup_usd: z.number(),
  programming_usd: z.number(),
  overhead_usd: z.number(),
  margin_usd: z.number(),
  total_direct_usd: z.number(),
  total_unit_price_usd: z.number(),
  total_lot_price_usd: z.number(),
});
export type CostBreakdown = z.infer<typeof CostBreakdownSchema>;

/** Evidence trail for the quote. */
export const QuoteEvidenceSchema = z.object({
  material_name: z.string(),
  iso_group: z.string(),
  stock_od_mm: z.number(),
  stock_id_mm: z.number(),
  stock_length_mm: z.number(),
  stock_volume_cm3: z.number(),
  stock_mass_kg: z.number(),
  total_cycle_min: z.number(),
  total_rapid_min: z.number(),
  setup_count: z.number().int(),
  operation_count: z.number().int(),
  material_price_usd_per_kg: z.number(),
  machine_rate_usd_hr: z.number(),
  setup_rate_usd_hr: z.number(),
  overhead_rate: z.number(),
  margin_rate: z.number(),
  scrap_factor: z.number(),
});
export type QuoteEvidence = z.infer<typeof QuoteEvidenceSchema>;

/** Variance band (±%). Widens with risk count. */
export const VarianceBandSchema = z.object({
  low_usd: z.number(),
  high_usd: z.number(),
  band_pct: z.number(),
  confidence: z.enum(["high", "moderate", "low"]),
  basis: z.string(),
});
export type VarianceBand = z.infer<typeof VarianceBandSchema>;

/** Full quote package. */
export const QuotePackageSchema = z.object({
  quote_id: z.string(),
  generated_at: z.string(),
  generation_ms: z.number(),
  customer: z.string().optional(),
  part_number: z.string().optional(),
  quantity: z.number().int(),
  cost: CostBreakdownSchema,
  tool_wear_lines: z.array(ToolWearLineSchema),
  evidence: QuoteEvidenceSchema,
  variance_band: VarianceBandSchema,
  meets_sla: z.boolean(),
  sla_limit_sec: z.number(),
});
export type QuotePackage = z.infer<typeof QuotePackageSchema>;

/** Engine input aggregate. */
export const AutoQuoteInputSchema = z.object({
  sequence_plan: z.any(),   // SequencePlan — structural check in-code
  toolpath: z.any(),        // ToolpathProgram
  material: z.any(),        // MaterialInput
  signoff: z.any().optional(),
  quote: QuoteInputSchema,
});
export type AutoQuoteInput = z.infer<typeof AutoQuoteInputSchema>;

// ============================================================================
// ENGINE
// ============================================================================

class LatheAutoQuoteFromPrintEngine {
  /** SLA: max wall-clock ms to produce a quote (from U-LTH48 exit gate: 90s). */
  static readonly SLA_LIMIT_MS = 90_000;

  /**
   * Produce an instant quote from a P4 pipeline artifact.
   * @param input sequence_plan + toolpath + material + optional signoff + quote inputs
   * @returns QuotePackage with 6 cost buckets, per-op tool wear, evidence, variance band
   */
  generateQuote(input: AutoQuoteInput): QuotePackage {
    const t0 = Date.now();

    const seq = input.sequence_plan as SequencePlan;
    const tp = input.toolpath as ToolpathProgram;
    const mat = input.material as MaterialInput;
    const signoff = input.signoff as SignoffPackage | undefined;
    const q = QuoteInputSchema.parse(input.quote);

    this.structuralCheck(seq, tp, mat);

    const isoGroup = mat.iso_group as ISOGroup;
    const density = this.resolveDensity(mat);
    const materialPricePerKg = q.material_price_usd_per_kg_override ?? MATERIAL_PRICE_USD_PER_KG[isoGroup];
    const machineRateHr = q.machine_rate_usd_hr_override ?? MACHINE_RATE_USD_HR;
    const marginRate = q.margin_rate_override ?? DEFAULT_MARGIN_RATE;
    const rushMult = q.rush_multiplier ?? 1;
    const scrapFactor = SCRAP_FACTOR_BY_ISO[isoGroup];

    // --- 1. Material cost ---
    const { od_mm, id_mm, length_mm } = seq.initial_stock;
    const stockVolumeMm3 = (Math.PI / 4) * (od_mm * od_mm - id_mm * id_mm) * length_mm;
    const stockVolumeCm3 = stockVolumeMm3 / 1000;
    const stockMassKg = (stockVolumeMm3 / 1_000_000_000) * density; // mm³→m³ then ×kg/m³
    const materialCostUsd = stockMassKg * materialPricePerKg * (1 + scrapFactor);

    // --- 2. Tool wear cost ---
    const toolWearLines: ToolWearLine[] = [];
    let toolWearUsd = 0;
    for (const op of tp.operations) {
      const line = this.computeToolWear(op, isoGroup);
      toolWearLines.push(line);
      toolWearUsd += line.contribution_usd;
    }

    // --- 3. Cycle cost ---
    const cycleMin = tp.total_cycle_time_sec / 60;
    const rapidDistanceMm = tp.operations.length * RAPID_DISTANCE_PER_OP_MM;
    const rapidMin = rapidDistanceMm / RAPID_FEED_MM_MIN;
    const cycleCostUsd = (cycleMin + rapidMin) * (machineRateHr / 60);

    // --- 4. Setup cost ---
    const setupCount = Math.max(1, seq.setup_count);
    const setupCostUsd = setupCount * SETUP_MIN_PER_SETUP * (SETUP_RATE_USD_HR / 60);

    // --- Programming (amortized across quantity) ---
    const programmingCostUsd = PROGRAMMING_COST_USD / q.quantity;

    // --- Direct cost ---
    const directCostUsd = materialCostUsd + toolWearUsd + cycleCostUsd + setupCostUsd + programmingCostUsd;

    // --- 5. Overhead ---
    const overheadUsd = directCostUsd * OVERHEAD_RATE;

    // --- 6. Margin (rush multiplier compounds margin, not overhead) ---
    const marginableBase = directCostUsd + overheadUsd;
    const effectiveMarginRate = marginRate * rushMult;
    const marginUsd = marginableBase * effectiveMarginRate;

    const unitPriceUsd = marginableBase + marginUsd;
    // Round unit price to cents first so lot = roundedUnit × qty has no drift.
    const unitPriceRounded = round2(unitPriceUsd);
    const lotPriceRounded = round2(unitPriceRounded * q.quantity);

    const cost: CostBreakdown = {
      material_usd: round2(materialCostUsd),
      tool_wear_usd: round2(toolWearUsd),
      cycle_usd: round2(cycleCostUsd),
      setup_usd: round2(setupCostUsd),
      programming_usd: round2(programmingCostUsd),
      overhead_usd: round2(overheadUsd),
      margin_usd: round2(marginUsd),
      total_direct_usd: round2(directCostUsd),
      total_unit_price_usd: unitPriceRounded,
      total_lot_price_usd: lotPriceRounded,
    };

    const evidence: QuoteEvidence = {
      material_name: mat.name,
      iso_group: isoGroup,
      stock_od_mm: od_mm,
      stock_id_mm: id_mm,
      stock_length_mm: length_mm,
      stock_volume_cm3: round2(stockVolumeCm3),
      stock_mass_kg: round3(stockMassKg),
      total_cycle_min: round2(cycleMin),
      total_rapid_min: round3(rapidMin),
      setup_count: setupCount,
      operation_count: tp.operations.length,
      material_price_usd_per_kg: materialPricePerKg,
      machine_rate_usd_hr: machineRateHr,
      setup_rate_usd_hr: SETUP_RATE_USD_HR,
      overhead_rate: OVERHEAD_RATE,
      margin_rate: effectiveMarginRate,
      scrap_factor: scrapFactor,
    };

    const variance = this.computeVarianceBand(unitPriceUsd, signoff);

    const generationMs = Date.now() - t0;

    return {
      quote_id: `QUOTE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      generated_at: new Date().toISOString(),
      generation_ms: generationMs,
      customer: q.customer,
      part_number: q.part_number,
      quantity: q.quantity,
      cost,
      tool_wear_lines: toolWearLines,
      evidence,
      variance_band: variance,
      meets_sla: generationMs <= LatheAutoQuoteFromPrintEngine.SLA_LIMIT_MS,
      sla_limit_sec: LatheAutoQuoteFromPrintEngine.SLA_LIMIT_MS / 1000,
    };
  }

  /**
   * Reconcile a quote against actuals. Returns the variance delta and whether
   * the actual price fell inside the predicted variance band.
   */
  reconcileAgainstActual(quote: QuotePackage, actualCostUsd: number): {
    actual_usd: number;
    quoted_usd: number;
    delta_usd: number;
    delta_pct: number;
    within_band: boolean;
    adjustment_suggested_pct: number;
  } {
    const quoted = quote.cost.total_unit_price_usd;
    const delta = actualCostUsd - quoted;
    const deltaPct = quoted > 0 ? (delta / quoted) * 100 : 0;
    const withinBand =
      actualCostUsd >= quote.variance_band.low_usd &&
      actualCostUsd <= quote.variance_band.high_usd;
    // If actual exceeds band, suggest raising next quote by half the delta (anchored tuning).
    const adjustmentSuggested = withinBand ? 0 : deltaPct / 2;
    return {
      actual_usd: round2(actualCostUsd),
      quoted_usd: round2(quoted),
      delta_usd: round2(delta),
      delta_pct: round2(deltaPct),
      within_band: withinBand,
      adjustment_suggested_pct: round2(adjustmentSuggested),
    };
  }

  // ==========================================================================
  // INTERNALS
  // ==========================================================================

  private structuralCheck(seq: SequencePlan, tp: ToolpathProgram, mat: MaterialInput): void {
    if (!seq || !seq.operations || !seq.initial_stock) {
      throw new Error("LatheAutoQuoteFromPrintEngine: sequence_plan missing required fields (operations, initial_stock)");
    }
    if (!tp || !tp.operations || typeof tp.total_cycle_time_sec !== "number") {
      throw new Error("LatheAutoQuoteFromPrintEngine: toolpath missing required fields (operations, total_cycle_time_sec)");
    }
    if (!mat || !mat.iso_group) {
      throw new Error("LatheAutoQuoteFromPrintEngine: material.iso_group required");
    }
    if (!["P", "M", "K", "N", "S", "H"].includes(mat.iso_group)) {
      throw new Error(`LatheAutoQuoteFromPrintEngine: invalid iso_group '${mat.iso_group}'`);
    }
    if (seq.initial_stock.od_mm <= 0 || seq.initial_stock.length_mm <= 0) {
      throw new Error("LatheAutoQuoteFromPrintEngine: stock od_mm and length_mm must be positive");
    }
    if (!Number.isFinite(tp.total_cycle_time_sec) || tp.total_cycle_time_sec < 0) {
      throw new Error("LatheAutoQuoteFromPrintEngine: total_cycle_time_sec must be finite and non-negative");
    }
  }

  /** Lookup canonical density by material name or fall back to ISO-group default. */
  private resolveDensity(mat: MaterialInput): number {
    const entry = CANONICAL_MATERIAL_DB[mat.name];
    if (entry) return entry.density_kg_m3;
    // Fall back by ISO-group median
    const isoDefaults: Record<ISOGroup, number> = {
      P: 7850, M: 8000, K: 7200, N: 2700, S: 4430, H: 7800,
    };
    return isoDefaults[mat.iso_group as ISOGroup];
  }

  /** Category → tool cost resolver (rough/finish/drill/bore/thread/groove) via featureType. */
  private categoryFor(op: ToolpathOperation): string {
    const ft = op.featureType.toLowerCase();
    if (ft.includes("thread")) return "thread";
    if (ft === "drill" || ft === "center_drill" || ft === "ream" || ft === "tap") return "drill";
    if (ft.includes("bore")) return "bore";
    if (ft.includes("groove") || ft === "undercut") return "groove";
    // Default to rough unless strategy_id hints finish
    if (op.strategy_id.toLowerCase().includes("finish")) return "finish";
    return "rough";
  }

  /** Per-op tool-wear contribution using Taylor life. */
  private computeToolWear(op: ToolpathOperation, isoGroup: ISOGroup): ToolWearLine {
    const category = this.categoryFor(op);
    const cycleMin = op.cycle_time_sec / 60;

    const taylor = CANONICAL_TAYLOR[isoGroup];
    const vc = op.cutting_speed_m_min > 0 ? op.cutting_speed_m_min : 1;
    // T = (C / Vc)^(1/n). Clamp to floor/ceiling to avoid absurd extrapolations.
    const rawLife = Math.pow(taylor.C / vc, 1 / taylor.n);
    const taylorLife = Math.max(1, Math.min(rawLife, 240)); // [1min, 240min]

    // Non-cutting categories (thread canned cycles, pure rapid etc) don't consume life.
    const effectiveLife = (category === "thread" || category === "groove")
      ? Math.max(taylorLife, 60) // threading/grooving tools last longer per minute
      : taylorLife;

    const lifeConsumedFraction = cycleMin / effectiveLife;
    const toolCostUsd = TOOL_COST_USD[category] ?? TOOL_COST_USD.rough;
    const contributionUsd = lifeConsumedFraction * toolCostUsd;

    return {
      op_number: op.op_number,
      category,
      cycle_min: round3(cycleMin),
      taylor_life_min: round2(effectiveLife),
      life_consumed_fraction: round3(lifeConsumedFraction),
      tool_cost_usd: toolCostUsd,
      contribution_usd: round2(contributionUsd),
    };
  }

  /**
   * Variance band driven by signoff risk count + Cpk gap. Defaults to ±10%
   * when no signoff provided (matches exit-gate SLA). Widens to ±20% when
   * critical checks fail or ≥3 risks flagged.
   */
  private computeVarianceBand(unitPriceUsd: number, signoff?: SignoffPackage): VarianceBand {
    let pct = 10;
    let confidence: "high" | "moderate" | "low" = "moderate";
    let basis = "Default ±10% band (no signoff provided)";

    if (signoff) {
      const riskCount = signoff.risks?.length ?? 0;
      const criticalFails = signoff.critical_fail_count ?? 0;
      const minCpk = signoff.cpk_summary?.min_predicted_cpk ?? 1.33;

      if (criticalFails > 0) {
        pct = 25;
        confidence = "low";
        basis = `Widened to ±25%: ${criticalFails} critical signoff failure(s)`;
      } else if (riskCount >= 3 || minCpk < 1.0) {
        pct = 18;
        confidence = "low";
        basis = `±18%: ${riskCount} risk(s), min Cpk ${minCpk.toFixed(2)}`;
      } else if (riskCount >= 1 || minCpk < 1.33) {
        pct = 12;
        confidence = "moderate";
        basis = `±12%: ${riskCount} risk(s), min Cpk ${minCpk.toFixed(2)}`;
      } else {
        pct = 8;
        confidence = "high";
        basis = `±8%: clean signoff, min Cpk ${minCpk.toFixed(2)}`;
      }
    }

    const fraction = pct / 100;
    return {
      low_usd: round2(unitPriceUsd * (1 - fraction)),
      high_usd: round2(unitPriceUsd * (1 + fraction)),
      band_pct: pct,
      confidence,
      basis,
    };
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }

export const latheAutoQuoteFromPrintEngine = new LatheAutoQuoteFromPrintEngine();
export { LatheAutoQuoteFromPrintEngine };
