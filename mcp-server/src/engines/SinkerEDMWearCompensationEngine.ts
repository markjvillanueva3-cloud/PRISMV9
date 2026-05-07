/**
 * SinkerEDMWearCompensationEngine — P2P-FULLSTACK-MS0/U-P2PFS56
 *
 * Translates wear ratio + cavity geometry + stage plan into concrete
 * electrode-oversize numbers and a multi-electrode burn-down strategy.
 *
 * Two concerns:
 *
 *   1. **End-wear oversize.** An electrode burning a deep cavity loses
 *      length from the tip; without compensation the cavity ends up
 *      shallower than programmed. We oversize the electrode's Z by:
 *        ΔZ = wear_ratio_pct/100 × cavity_depth × safety_factor
 *
 *   2. **Multi-electrode burn-down strategy.** At high wear ratios (>20%),
 *      one electrode can't reach the final depth at spec; we split work
 *      across multiple electrodes. Three strategies:
 *        - "single_sacrificial" — 1 electrode, accept the wear, oversize
 *          length and rely on Z-replenishment moves.
 *        - "rough_and_finish" — 1 rough + 1 finish electrode; rough eats
 *          90% of the work and is allowed high wear; finish keeps spec.
 *        - "sacrificial_stack" — 3+ electrodes burned in sequence from
 *          the same side; used for AR > 5 or wear > 40%.
 *
 * Also emits per-electrode wear budget in mm (i.e. allowable length lost
 * before swap) and a simple redress interval in burn minutes.
 *
 * References:
 *   - Klocke, "EDM — Manufacturing Processes 3", §6.4 electrode wear
 *   - GF AgieCharmilles Form 20/30 application guide (multi-electrode
 *     sinker strategy for deep cavities)
 *   - Makino D-Series orbital strategy manual (wear-aware planetary)
 */

import type { ElectrodeMaterial } from "./ElectrodeDesignEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type WearStrategy =
  | "single_sacrificial"
  | "rough_and_finish"
  | "sacrificial_stack";

export interface WearCompensationInput {
  wear_ratio_pct: number; // electrode volume / workpiece volume, percent
  cavity_depth_mm: number;
  cavity_area_mm2: number; // rough electrode face area (for volumetric calc)
  electrode_material?: ElectrodeMaterial;
  /** Aspect ratio depth / min(L,W). High AR drives multi-electrode. */
  aspect_ratio?: number;
  /** Target tolerance on depth (mm). Tighter → more comp. */
  depth_tolerance_mm?: number;
  /** Safety factor on end-wear oversize. Default 1.3. */
  safety_factor?: number;
}

export interface PerElectrodePlan {
  role: "rough" | "finish" | "sacrificial";
  /** Extra Z length added to electrode tip (mm). */
  end_wear_oversize_mm: number;
  /** Maximum wear allowed before electrode is swapped (mm tip loss). */
  wear_budget_mm: number;
  /** Expected burn duration until redress/swap (minutes, rough estimate). */
  redress_interval_min: number;
  /** Fraction of total cavity depth this electrode removes. */
  depth_fraction: number;
}

export interface WearCompensationResult {
  strategy: WearStrategy;
  strategy_reason: string;
  total_electrodes: number;
  per_electrode: PerElectrodePlan[];
  /** Minimum oversize applied to the rough electrode (mm). */
  rough_oversize_mm: number;
  /** Cumulative wear loss budget over the full cavity (mm). */
  total_wear_budget_mm: number;
  notes: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_SAFETY_FACTOR = 1.3;

/** Material-dependent redress rates (mm tip wear per burn minute, rough). */
const WEAR_RATE_MM_PER_MIN: Record<ElectrodeMaterial, number> = {
  graphite_fine: 0.012,
  graphite_std: 0.020,
  copper: 0.030,
  tellurium_copper: 0.025,
  copper_tungsten: 0.006,
};

// ============================================================================
// ENGINE
// ============================================================================

export class SinkerEDMWearCompensationEngine {
  plan(input: WearCompensationInput): WearCompensationResult {
    const {
      wear_ratio_pct,
      cavity_depth_mm,
      cavity_area_mm2,
      electrode_material = "graphite_fine",
      aspect_ratio = 1,
      depth_tolerance_mm = 0.01,
      safety_factor = DEFAULT_SAFETY_FACTOR,
    } = input;

    if (!Number.isFinite(wear_ratio_pct) || wear_ratio_pct < 0) {
      throw new Error(`wear_ratio_pct must be a non-negative finite number (got ${wear_ratio_pct})`);
    }
    if (!(cavity_depth_mm > 0)) {
      throw new Error(`cavity_depth_mm must be > 0 (got ${cavity_depth_mm})`);
    }
    if (!(cavity_area_mm2 > 0)) {
      throw new Error(`cavity_area_mm2 must be > 0 (got ${cavity_area_mm2})`);
    }

    // Strategy selection.
    let strategy: WearStrategy;
    let reason: string;
    if (wear_ratio_pct > 40 || aspect_ratio > 5) {
      strategy = "sacrificial_stack";
      reason = `High wear (${wear_ratio_pct}%) or deep aspect (${aspect_ratio.toFixed(1)}) — use 3-electrode stack`;
    } else if (wear_ratio_pct > 20 || depth_tolerance_mm < 0.02) {
      strategy = "rough_and_finish";
      reason = `Moderate wear (${wear_ratio_pct}%) or tight tolerance (${depth_tolerance_mm} mm) — split rough + finish`;
    } else {
      strategy = "single_sacrificial";
      reason = `Low wear (${wear_ratio_pct}%) — single electrode with end oversize is sufficient`;
    }

    // End-wear oversize = wear_ratio × depth × safety_factor.
    const roughOversize = round3(
      (wear_ratio_pct / 100) * cavity_depth_mm * safety_factor,
    );

    // Wear rate from material.
    const wearRate = WEAR_RATE_MM_PER_MIN[electrode_material] ?? 0.015;

    // Per-electrode plan.
    const perElectrode: PerElectrodePlan[] = [];

    if (strategy === "single_sacrificial") {
      perElectrode.push({
        role: "rough",
        end_wear_oversize_mm: roughOversize,
        wear_budget_mm: roughOversize,
        redress_interval_min: round1(roughOversize / wearRate),
        depth_fraction: 1.0,
      });
    } else if (strategy === "rough_and_finish") {
      // Rough does 90% of depth with higher wear budget, finish does 10%.
      const roughDepth = cavity_depth_mm * 0.9;
      const finishDepth = cavity_depth_mm * 0.1;
      const roughComp = round3((wear_ratio_pct / 100) * roughDepth * safety_factor);
      // Finish electrode wear is much lower (stage gap smaller) — comp 1/3 of rough rate.
      const finishComp = round3((wear_ratio_pct / 100) * finishDepth * (safety_factor * 0.4));
      perElectrode.push({
        role: "rough",
        end_wear_oversize_mm: roughComp,
        wear_budget_mm: roughComp,
        redress_interval_min: round1(roughComp / wearRate),
        depth_fraction: 0.9,
      });
      perElectrode.push({
        role: "finish",
        end_wear_oversize_mm: finishComp,
        wear_budget_mm: finishComp,
        redress_interval_min: round1(finishComp / (wearRate * 0.5)),
        depth_fraction: 0.1,
      });
    } else {
      // sacrificial_stack — 3 electrodes, each removing ~33% of depth.
      const third = cavity_depth_mm / 3;
      const compPerElec = round3((wear_ratio_pct / 100) * third * safety_factor);
      for (let i = 0; i < 3; i++) {
        perElectrode.push({
          role: i === 2 ? "finish" : "sacrificial",
          end_wear_oversize_mm: compPerElec,
          wear_budget_mm: compPerElec,
          redress_interval_min: round1(compPerElec / wearRate),
          depth_fraction: 1 / 3,
        });
      }
    }

    const totalBudget = round3(
      perElectrode.reduce((acc, p) => acc + p.wear_budget_mm, 0),
    );

    // Notes.
    const notes: string[] = [];
    if (wear_ratio_pct > 50) {
      notes.push(
        `Extreme wear ratio ${wear_ratio_pct}% — consider switching electrode material to copper-tungsten (wear ~8% on steel)`,
      );
    }
    if (depth_tolerance_mm < 0.005) {
      notes.push(
        `Depth tolerance ${depth_tolerance_mm} mm < 0.005 mm — recommend dedicated finish electrode + orbital sweep`,
      );
    }
    if (cavity_area_mm2 < 50) {
      notes.push(
        `Small electrode face (<50 mm²) — wear rate will be 2-3× nominal; shorten redress interval accordingly`,
      );
    }

    return {
      strategy,
      strategy_reason: reason,
      total_electrodes: perElectrode.length,
      per_electrode: perElectrode,
      rough_oversize_mm: roughOversize,
      total_wear_budget_mm: totalBudget,
      notes,
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function round3(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 1000) / 1000;
}

function round1(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 10) / 10;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const sinkerEDMWearCompensationEngine = new SinkerEDMWearCompensationEngine();
