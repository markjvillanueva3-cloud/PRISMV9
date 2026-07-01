/**
 * XometryStyleQuoteInputsEngine — JM-DIE-QUOTE-TRAINING-MS0 / U-QT03
 *
 * Xometry-equivalent input form → quote. User specifies material + dimensions +
 * tolerance + finish + qty + lead-time + process; engine computes time-in-cut
 * via process-specific MRR (Material Removal Rate), material spend via
 * material-price × volume × waste-factor, then calls FairMarketValueEngine.
 *
 * MRR sources (canonical, per process):
 *   mill (3-axis):  100 cm³/min for aluminum 6061 baseline, scaled by material factor
 *   lathe:           70 cm³/min for aluminum 6061 baseline
 *   wedm:             8 cm³/min (cut area × thickness)
 *   sinker_edm:       3 cm³/min
 *
 * Material factors (Kc1.1-derived hardness/cuttability scale, dimensionless):
 *   aluminum_6061: 1.0  (baseline)
 *   steel_a36:     0.45 (slower)
 *   stainless_304: 0.28
 *   copper_c110:   0.85
 *
 * Tolerance class → setup_time multiplier (per ISO 2768 + general shop practice):
 *   coarse:  1.0×, medium: 1.4×, fine: 2.1×, very_fine: 3.5×
 *
 * Surface finish (Ra) → extra finish-pass time:
 *   ≥3.2 um:  0   (as-machined OK)
 *   1.6 um:   +30%
 *   0.8 um:   +80%
 *   0.4 um:   +180% (grinding territory)
 *
 * @milestone JM-DIE-QUOTE-TRAINING-MS0/U-QT03
 * @author slot:charlie /goal-17 iter1, 2026-05-24
 */

import { fairMarketValueEngine } from "./FairMarketValueEngine.js";
import { historicalMaterialPriceEngine } from "./HistoricalMaterialPriceEngine.js";

export type QuoteMaterial = "aluminum_6061" | "steel_a36" | "stainless_304" | "copper_c110";
export type QuoteProcess = "mill" | "lathe" | "wedm" | "sinker_edm";
export type ToleranceClass = "coarse" | "medium" | "fine" | "very_fine";

export interface XometryQuoteInputs {
  material: QuoteMaterial;
  length_mm: number;
  width_mm: number;
  height_mm: number;
  tolerance_class: ToleranceClass;
  surface_finish_um: number;     // Ra in micrometers (3.2 / 1.6 / 0.8 / 0.4)
  quantity: number;
  lead_time_days: number;
  process: QuoteProcess;
  machine_rate_usd_per_hr?: number;  // overrides default
  asOfIsoDate?: string;              // for material price lookup, default = today
}

export interface QuoteBreakdown {
  ok: boolean;
  inputs: XometryQuoteInputs;
  volume_cm3: number;
  stock_volume_cm3: number;       // includes waste factor
  material_unit_price_usd: number; // per lb at asOfIsoDate
  material_weight_lb: number;
  material_spend_usd: number;
  base_mrr_cm3_per_min: number;
  effective_mrr_cm3_per_min: number;
  time_in_cut_s_per_part: number;
  setup_time_s_per_lot: number;
  total_time_s_per_lot: number;
  total_time_s_per_part_amortized: number;
  fmv_per_part_usd: number;
  fmv_total_lot_usd: number;
  rush_multiplier: number;
  expedited_total_usd: number;
  reason?: string;
}

// MRR baselines for aluminum_6061 at standard speeds (industry typicals)
const BASE_MRR: Record<QuoteProcess, number> = {
  mill: 100,
  lathe: 70,
  wedm: 8,
  sinker_edm: 3,
};

// Cuttability factor — dimensionless, multiplies MRR (aluminum=1.0)
const MATERIAL_FACTOR: Record<QuoteMaterial, number> = {
  aluminum_6061: 1.0,
  steel_a36: 0.45,
  stainless_304: 0.28,
  copper_c110: 0.85,
};

// Material density g/cm^3 → for weight calc
const MATERIAL_DENSITY_G_CM3: Record<QuoteMaterial, number> = {
  aluminum_6061: 2.70,
  steel_a36: 7.85,
  stainless_304: 8.00,
  copper_c110: 8.96,
};

// Tolerance class → setup-time multiplier (longer setup for tighter tols)
const TOLERANCE_SETUP_MULT: Record<ToleranceClass, number> = {
  coarse: 1.0,
  medium: 1.4,
  fine: 2.1,
  very_fine: 3.5,
};

const G_PER_LB = 453.592;
const SETUP_BASE_S = 1800;            // 30 min baseline setup
const WASTE_FACTOR = 1.15;             // 15% material overage for stock-to-finish
const DEFAULT_MACHINE_RATE_USD_PER_HR = 95;

/** Returns Ra-based extra time multiplier (1.0 = no extra finish-pass time). */
function finishMultiplier(ra_um: number): number {
  if (!isFinite(ra_um) || ra_um <= 0) return 1.0;
  if (ra_um >= 3.2) return 1.0;
  if (ra_um >= 1.6) return 1.30;
  if (ra_um >= 0.8) return 1.80;
  return 2.80;  // ≤0.4 um Ra
}

/** Lead-time rush multiplier on FMV (≥10 days = 1.0, <2 days = 1.5×). */
function rushMultiplier(lead_time_days: number): number {
  if (!isFinite(lead_time_days)) return 1.0;
  if (lead_time_days >= 10) return 1.0;
  if (lead_time_days >= 5) return 1.10;
  if (lead_time_days >= 2) return 1.25;
  return 1.50;
}

export class XometryStyleQuoteInputsEngine {
  /** Convert user-facing inputs into a complete quote with breakdown. */
  quote(inputs: XometryQuoteInputs): QuoteBreakdown {
    const empty: QuoteBreakdown = {
      ok: false, inputs, volume_cm3: 0, stock_volume_cm3: 0, material_unit_price_usd: 0,
      material_weight_lb: 0, material_spend_usd: 0, base_mrr_cm3_per_min: 0, effective_mrr_cm3_per_min: 0,
      time_in_cut_s_per_part: 0, setup_time_s_per_lot: 0, total_time_s_per_lot: 0,
      total_time_s_per_part_amortized: 0, fmv_per_part_usd: 0, fmv_total_lot_usd: 0,
      rush_multiplier: 1, expedited_total_usd: 0,
    };
    if (!inputs || !inputs.material || !inputs.process) return { ...empty, reason: "missing-required:material,process" };
    if (!(inputs.length_mm > 0) || !(inputs.width_mm > 0) || !(inputs.height_mm > 0)) return { ...empty, reason: "non-positive-dimension" };
    if (!(inputs.quantity > 0) || !Number.isInteger(inputs.quantity)) return { ...empty, reason: "quantity-must-be-positive-integer" };
    if (!(inputs.lead_time_days >= 0)) return { ...empty, reason: "lead-time-must-be-non-negative" };

    // Volumes
    const volume_cm3 = (inputs.length_mm * inputs.width_mm * inputs.height_mm) / 1000;
    const stock_volume_cm3 = volume_cm3 * WASTE_FACTOR;

    // Material price + weight
    const asOf = inputs.asOfIsoDate ?? new Date().toISOString().slice(0, 10);
    const priceLookup = historicalMaterialPriceEngine.lookup(inputs.material, asOf);
    const material_unit_price_usd = priceLookup.found && typeof priceLookup.price_per_lb_usd === "number" ? priceLookup.price_per_lb_usd : 0;
    const density = MATERIAL_DENSITY_G_CM3[inputs.material];
    const material_weight_lb = (stock_volume_cm3 * density) / G_PER_LB;
    const material_spend_usd = material_weight_lb * material_unit_price_usd;

    // MRR + time-in-cut
    const base_mrr = BASE_MRR[inputs.process];
    const mat_factor = MATERIAL_FACTOR[inputs.material];
    const finish_mult = finishMultiplier(inputs.surface_finish_um);
    const effective_mrr = base_mrr * mat_factor;
    const time_in_cut_min = (volume_cm3 / effective_mrr) * finish_mult;
    const time_in_cut_s_per_part = time_in_cut_min * 60;

    // Setup amortized over lot
    const setup_time_s_per_lot = SETUP_BASE_S * TOLERANCE_SETUP_MULT[inputs.tolerance_class];
    const total_time_s_per_lot = setup_time_s_per_lot + (time_in_cut_s_per_part * inputs.quantity);
    const total_time_s_per_part_amortized = total_time_s_per_lot / inputs.quantity;

    // FMV per part — material spend amortized similarly
    const rate = inputs.machine_rate_usd_per_hr ?? DEFAULT_MACHINE_RATE_USD_PER_HR;
    const fmv = fairMarketValueEngine.estimate({
      time_in_cut_s: time_in_cut_s_per_part,
      setup_time_s: setup_time_s_per_lot / inputs.quantity,
      machine_rate_usd_per_hr: rate,
      material_spend_usd: material_spend_usd,
    });
    if (!fmv.ok) return { ...empty, reason: fmv.reason ?? "fmv-engine-rejected-inputs" };

    const fmv_per_part = fmv.fmv_usd;
    const fmv_total_lot = fmv_per_part * inputs.quantity;
    const rush_mult = rushMultiplier(inputs.lead_time_days);
    const expedited_total = fmv_total_lot * rush_mult;

    return {
      ok: true,
      inputs,
      volume_cm3: round2(volume_cm3),
      stock_volume_cm3: round2(stock_volume_cm3),
      material_unit_price_usd: round4(material_unit_price_usd),
      material_weight_lb: round4(material_weight_lb),
      material_spend_usd: round2(material_spend_usd),
      base_mrr_cm3_per_min: base_mrr,
      effective_mrr_cm3_per_min: round2(effective_mrr),
      time_in_cut_s_per_part: round2(time_in_cut_s_per_part),
      setup_time_s_per_lot,
      total_time_s_per_lot: round2(total_time_s_per_lot),
      total_time_s_per_part_amortized: round2(total_time_s_per_part_amortized),
      fmv_per_part_usd: round2(fmv_per_part),
      fmv_total_lot_usd: round2(fmv_total_lot),
      rush_multiplier: rush_mult,
      expedited_total_usd: round2(expedited_total),
    };
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

export const xometryStyleQuoteInputsEngine = new XometryStyleQuoteInputsEngine();
