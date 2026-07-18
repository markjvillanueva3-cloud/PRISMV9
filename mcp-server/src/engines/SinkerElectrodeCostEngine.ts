/**
 * SinkerElectrodeCostEngine — ARC-MS6 / muS-C25
 *
 * Electrode cost model for sinker (die-sinking) EDM.
 *
 * Estimates the fully-loaded cost of the electrode set for one cavity,
 * decomposed into the four cost components a shop actually quotes against:
 *
 *   1. Material   — blank graphite/copper stock for every electrode in the set
 *   2. Milling    — CNC machine time to cut each electrode from its blank
 *   3. Setup      — fixturing / probing time per electrode
 *   4. Burn       — sinker-EDM machine time to burn the cavity (job total)
 *
 * Electrode WEAR is folded in through `num_electrodes`: a high wear ratio
 * forces additional rough/semi/finish electrodes, and every extra electrode
 * multiplies the per-electrode fabrication cost (material + milling + setup).
 * Burn cost is a job total — the electrode set is consumed during the single
 * cavity burn, so burn time is NOT multiplied by the electrode count.
 *
 * This sits downstream of SinkerEDMElectrodeGeometryEngine (which yields
 * `electrode_volume_mm3` + `total_electrodes_needed`) and ElectrodeDesignEngine
 * (which yields `estimated_burn_time_min` + `wear_ratio_pct`), turning their
 * geometry/process output into a quotable dollar figure.
 *
 * Cost model (all economic — see CONSTANTS for sourcing):
 *   blank_volume      = net_electrode_volume * stock_oversize_factor
 *   material_cost/ea  = blank_volume_cm3 * material_cost_per_cm3
 *   removed_volume    = blank_volume - net_electrode_volume
 *   milling_time/ea   = removed_volume / milling_MRR + finish_overhead
 *   milling_cost/ea   = milling_time_hr * mill_rate_per_hr
 *   setup_cost/ea     = setup_hr * mill_rate_per_hr
 *   fab_cost/ea       = material + milling + setup
 *   total_fab_cost    = fab_cost/ea * num_electrodes        (wear -> count)
 *   burn_cost         = burn_time_hr * edm_rate_per_hr      (job total)
 *   total_cost        = total_fab_cost + burn_cost
 *
 * Cost rates here are ECONOMIC defaults, not physics constants — they are
 * shop/market dependent and every one is overridable per call. They are
 * deliberately NOT placed in src/physics/constants.ts (which holds only
 * canonical Kienzle/Taylor/material-physics values).
 *
 * References:
 *   - POCO Graphite EDM material guide (EDM-1 / EDM-3 grade pricing class)
 *   - GF Agie Charmilles sinker electrode preparation guide (blank oversize)
 *   - Klocke, "Manufacturing Processes 3 — EDM", ch. 6 (electrode wear → set size)
 *   - Shop machine-rate practice (CNC mill ~$75/hr, sinker EDM ~$85/hr)
 */

import { z } from "zod";
import type { ElectrodeMaterial } from "./ElectrodeDesignEngine.js";

// ============================================================================
// CONSTANTS — economic defaults (overridable per call; NOT physics constants)
// ============================================================================

/**
 * Electrode blank material cost (USD / cm³).
 * Vendor list-pricing class (POCO Graphite EDM grades; LME-derived copper).
 * Graphite priced by grade fineness; CuW is the dominant cost outlier.
 */
const MATERIAL_COST_PER_CM3: Record<ElectrodeMaterial, number> = {
  graphite_fine: 1.4, // POCO EDM-3 class, ~5 µm ultrafine grain
  graphite_std: 0.7, // POCO EDM-1 class, ~10 µm grain
  copper: 0.13, // electrolytic Cu (~$9/kg × 8.96 g/cm³)
  copper_tungsten: 3.5, // W75/Cu25 sintered (dense + expensive)
  tellurium_copper: 0.25, // C14500 free-machining copper
};

/**
 * Nominal CNC milling material-removal rate (mm³/min) for electrode blanks.
 * Graphite mills dry and very fast; CuW is hard and slow.
 */
const MILLING_MRR_MM3_PER_MIN: Record<ElectrodeMaterial, number> = {
  graphite_fine: 5000,
  graphite_std: 5500,
  copper: 1200, // gummy — modest MRR
  copper_tungsten: 300, // very hard — slow
  tellurium_copper: 2000, // free-machining
};

const DEFAULT_STOCK_OVERSIZE_FACTOR = 1.5; // blank ≥ 1.5× net solid (shank + grip + stock)
const DEFAULT_MILL_RATE_PER_HR = 75; // USD/hr — shop CNC mill
const DEFAULT_EDM_RATE_PER_HR = 85; // USD/hr — sinker EDM
const DEFAULT_SETUP_MIN_PER_ELECTRODE = 15; // fixture + probe per electrode
const DEFAULT_FINISH_OVERHEAD_MIN = 10; // finishing passes per electrode
const HIGH_WEAR_PCT_THRESHOLD = 40; // wear ratio above this → advisory note
const LARGE_REMOVED_MM3 = 100000; // >100 cm³ milled → milling estimate turns coarse

/**
 * Input sanity ceilings. Absurd values are rejected at the Zod boundary so no
 * intermediate can overflow to Infinity (which round2/round3 would otherwise
 * silently coerce to $0 — a silent-wrong-answer failure).
 */
const MAX_ELECTRODE_VOLUME_MM3 = 1e9; // 1 m³ — far beyond any real die electrode
const MAX_NUM_ELECTRODES = 1000;
const MAX_OVERSIZE_FACTOR = 20;
const MAX_BURN_TIME_MIN = 1e6;
const MAX_WEAR_PCT = 1e4;
const MAX_RATE = 1e5; // ceiling for USD/hr and USD/cm³ rate inputs
const MIN_MILLING_MRR = 1; // mm³/min — below this is a unit error
const MAX_MILLING_MRR = 1e7; // mm³/min
const MAX_OVERHEAD_MIN = 1e5; // ceiling for setup / finish-overhead minutes

// ============================================================================
// SCHEMA
// ============================================================================

const finiteNumber = z
  .number()
  .refine(Number.isFinite, { message: "must be a finite number" });

const electrodeMaterialSchema = z.enum([
  "graphite_fine",
  "graphite_std",
  "copper",
  "copper_tungsten",
  "tellurium_copper",
]);

const sinkerElectrodeCostInputSchema = z
  .object({
    /** Net finished electrode solid volume (mm³) — e.g. from SinkerEDMElectrodeGeometryEngine. */
    electrode_volume_mm3: finiteNumber.positive().max(MAX_ELECTRODE_VOLUME_MM3),
    /** Total electrodes in the set (rough + semi + finish, ×cavities). Wear → more electrodes. */
    num_electrodes: z.number().int().min(1).max(MAX_NUM_ELECTRODES),
    /** Electrode stock material. */
    electrode_material: electrodeMaterialSchema,
    /** Total sinker-EDM burn time for the cavity (min) — job total, not per electrode. */
    burn_time_min: finiteNumber.nonnegative().max(MAX_BURN_TIME_MIN),
    /** Blank-to-net volume ratio. ≥1; default 1.5. Complex 3D electrodes warrant a higher value. */
    stock_oversize_factor: finiteNumber.min(1).max(MAX_OVERSIZE_FACTOR).optional(),
    /** Electrode wear ratio (%) — advisory only; cost impact is already in num_electrodes. */
    wear_ratio_pct: finiteNumber.nonnegative().max(MAX_WEAR_PCT).optional(),
    /** Override material cost (USD/cm³). */
    material_cost_per_cm3: finiteNumber.positive().max(MAX_RATE).optional(),
    /** Override milling MRR (mm³/min). Floored at 1 — below that is a unit error. */
    milling_mrr_mm3_per_min: finiteNumber
      .min(MIN_MILLING_MRR)
      .max(MAX_MILLING_MRR)
      .optional(),
    /** CNC mill rate (USD/hr); default 75. */
    mill_rate_per_hr: finiteNumber.positive().max(MAX_RATE).optional(),
    /** Sinker-EDM rate (USD/hr); default 85. */
    edm_rate_per_hr: finiteNumber.positive().max(MAX_RATE).optional(),
    /** Setup time per electrode (min); default 15. */
    setup_min_per_electrode: finiteNumber
      .nonnegative()
      .max(MAX_OVERHEAD_MIN)
      .optional(),
    /** Finishing-pass overhead per electrode (min); default 10. */
    finish_overhead_min: finiteNumber
      .nonnegative()
      .max(MAX_OVERHEAD_MIN)
      .optional(),
  })
  .strict();

export type SinkerElectrodeCostInput = z.infer<
  typeof sinkerElectrodeCostInputSchema
>;

// ============================================================================
// RESULT TYPES
// ============================================================================

/** Per-electrode fabrication breakdown (one electrode in the set). */
export interface PerElectrodeCost {
  /** Blank stock volume (cm³). */
  blank_volume_cm3: number;
  /** Material removed by milling (mm³). */
  removed_volume_mm3: number;
  /** CNC milling time for one electrode (min). */
  milling_time_min: number;
  /** Material cost for one electrode (USD). */
  material_cost: number;
  /** Milling cost for one electrode (USD). */
  milling_cost: number;
  /** Setup cost for one electrode (USD). */
  setup_cost: number;
  /** Fabrication cost for one electrode = material + milling + setup (USD). */
  fab_cost: number;
}

/** One ranked cost component. */
export interface CostDriver {
  component: "material" | "milling" | "setup" | "burn";
  cost: number;
  /** Share of total_cost (%). */
  pct: number;
}

/**
 * Multi-component cost breakdown. Deliberately NOT a single `AtomicValue` —
 * a four-way cost decomposition (material / milling / setup / burn) cannot
 * collapse to one scalar; the typed result object is the correct shape here.
 */
export interface SinkerElectrodeCostResult {
  electrode_material: ElectrodeMaterial;
  num_electrodes: number;
  currency: "USD";
  /** Per-electrode fabrication breakdown. */
  per_electrode: PerElectrodeCost;
  /** Material cost across the whole set (USD). */
  material_cost: number;
  /** Milling cost across the whole set (USD). */
  milling_cost: number;
  /** Setup cost across the whole set (USD). */
  setup_cost: number;
  /** Cavity burn cost — job total (USD). */
  burn_cost: number;
  /** material + milling + setup across the set (USD). */
  total_fab_cost: number;
  /** total_fab_cost + burn_cost (USD). */
  total_cost: number;
  /** Cost components ranked high → low. */
  cost_drivers: CostDriver[];
  /** Defaults that were applied (vs. caller overrides). */
  assumptions: string[];
  /** Advisory notes + warnings. */
  notes: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * Electrode cost model for sinker EDM. Pure, deterministic, no I/O.
 */
export class SinkerElectrodeCostEngine {
  /**
   * Estimate the fully-loaded cost of an electrode set for one cavity.
   *
   * @param rawInput Electrode geometry/process figures + optional rate overrides.
   * @returns Four-component cost breakdown (material / milling / setup / burn).
   * @throws Error (engine-named, listing the failed fields) when input is invalid.
   */
  estimate(rawInput: unknown): SinkerElectrodeCostResult {
    const parsed = sinkerElectrodeCostInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
      throw new Error(`SinkerElectrodeCostEngine: invalid input — ${issues}`);
    }
    const input = parsed.data;

    const oversize = input.stock_oversize_factor ?? DEFAULT_STOCK_OVERSIZE_FACTOR;
    const millRate = input.mill_rate_per_hr ?? DEFAULT_MILL_RATE_PER_HR;
    const edmRate = input.edm_rate_per_hr ?? DEFAULT_EDM_RATE_PER_HR;
    const setupMin =
      input.setup_min_per_electrode ?? DEFAULT_SETUP_MIN_PER_ELECTRODE;
    const finishMin = input.finish_overhead_min ?? DEFAULT_FINISH_OVERHEAD_MIN;
    const matCostPerCm3 =
      input.material_cost_per_cm3 ??
      MATERIAL_COST_PER_CM3[input.electrode_material];
    const millMrr =
      input.milling_mrr_mm3_per_min ??
      MILLING_MRR_MM3_PER_MIN[input.electrode_material];

    const assumptions: string[] = [];
    if (input.stock_oversize_factor === undefined)
      assumptions.push(`stock_oversize_factor=${oversize} (default)`);
    if (input.mill_rate_per_hr === undefined)
      assumptions.push(`mill_rate_per_hr=$${millRate} (default)`);
    if (input.edm_rate_per_hr === undefined)
      assumptions.push(`edm_rate_per_hr=$${edmRate} (default)`);
    if (input.setup_min_per_electrode === undefined)
      assumptions.push(`setup_min_per_electrode=${setupMin} (default)`);
    if (input.finish_overhead_min === undefined)
      assumptions.push(`finish_overhead_min=${finishMin} (default)`);
    if (input.material_cost_per_cm3 === undefined)
      assumptions.push(
        `material_cost_per_cm3=$${matCostPerCm3}/cm³ (${input.electrode_material} list price)`,
      );
    if (input.milling_mrr_mm3_per_min === undefined)
      assumptions.push(
        `milling_mrr=${millMrr} mm³/min (${input.electrode_material} nominal)`,
      );

    // ── Per-electrode fabrication ──────────────────────────────────────────
    const blankVolumeMm3 = input.electrode_volume_mm3 * oversize;
    const blankVolumeCm3 = blankVolumeMm3 / 1000;
    const removedVolumeMm3 = blankVolumeMm3 - input.electrode_volume_mm3;

    const materialCostEa = blankVolumeCm3 * matCostPerCm3;
    const millingTimeMin = removedVolumeMm3 / millMrr + finishMin;
    const millingCostEa = (millingTimeMin / 60) * millRate;
    const setupCostEa = (setupMin / 60) * millRate;
    const fabCostEa = materialCostEa + millingCostEa + setupCostEa;

    const perElectrode: PerElectrodeCost = {
      blank_volume_cm3: round3(blankVolumeCm3),
      removed_volume_mm3: round3(removedVolumeMm3),
      milling_time_min: round3(millingTimeMin),
      material_cost: round2(materialCostEa),
      milling_cost: round2(millingCostEa),
      setup_cost: round2(setupCostEa),
      fab_cost: round2(fabCostEa),
    };

    // ── Set totals ─────────────────────────────────────────────────────────
    const n = input.num_electrodes;
    const materialCost = materialCostEa * n;
    const millingCost = millingCostEa * n;
    const setupCost = setupCostEa * n;
    const totalFabCost = materialCost + millingCost + setupCost;
    // Burn cost is a job total — the set is consumed in one cavity burn.
    const burnCost = (input.burn_time_min / 60) * edmRate;
    const totalCost = totalFabCost + burnCost;

    // ── Cost drivers (ranked) ──────────────────────────────────────────────
    const driverPairs: Array<[CostDriver["component"], number]> = [
      ["material", materialCost],
      ["milling", millingCost],
      ["setup", setupCost],
      ["burn", burnCost],
    ];
    const costDrivers: CostDriver[] = driverPairs
      .map(([component, cost]) => ({
        component,
        cost: round2(cost),
        // totalCost > 0 always holds — electrode_volume_mm3 is .positive() so
        // material cost is non-zero; the 0 branch is a defensive guard only.
        pct: totalCost > 0 ? round2((cost / totalCost) * 100) : 0,
      }))
      .sort((a, b) => b.cost - a.cost);

    // ── Notes ──────────────────────────────────────────────────────────────
    const notes: string[] = [];
    if (
      input.wear_ratio_pct !== undefined &&
      input.wear_ratio_pct > HIGH_WEAR_PCT_THRESHOLD
    ) {
      notes.push(
        `Electrode wear ratio ${input.wear_ratio_pct}% > ${HIGH_WEAR_PCT_THRESHOLD}% — ` +
          `the ${n}-electrode set reflects that wear; copper-tungsten would cut electrode count.`,
      );
    }
    if (
      input.electrode_material === "copper_tungsten" &&
      removedVolumeMm3 > 50000 &&
      input.milling_mrr_mm3_per_min === undefined
    ) {
      notes.push(
        "Copper-tungsten with a large removed volume is slow and costly to mill — " +
          "consider a near-net pre-form blank to reduce milling time.",
      );
    }
    if (removedVolumeMm3 > LARGE_REMOVED_MM3) {
      notes.push(
        `Large removed volume (${round3(removedVolumeMm3 / 1000)} cm³) — milling_time is a ` +
          "volume/MRR lower-bound estimate; complex 3D roughing will exceed it. Treat as optimistic.",
      );
    }
    if (input.stock_oversize_factor === undefined) {
      notes.push(
        "stock_oversize_factor at default 1.5 — pass a higher value for complex 3D " +
          "electrodes whose blank must be much larger than the net solid.",
      );
    }
    const topDriver = costDrivers[0];
    notes.push(
      `Dominant cost driver: ${topDriver.component} (${topDriver.pct}% of $${round2(totalCost)}).`,
    );

    return {
      electrode_material: input.electrode_material,
      num_electrodes: n,
      currency: "USD",
      per_electrode: perElectrode,
      material_cost: round2(materialCost),
      milling_cost: round2(millingCost),
      setup_cost: round2(setupCost),
      burn_cost: round2(burnCost),
      total_fab_cost: round2(totalFabCost),
      total_cost: round2(totalCost),
      cost_drivers: costDrivers,
      assumptions,
      notes,
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function round2(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100) / 100;
}

function round3(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 1000) / 1000;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const sinkerElectrodeCostEngine = new SinkerElectrodeCostEngine();
