/**
 * SinkerEDMFlushingAdvisorEngine — P2P-FULLSTACK-MS0/U-P2PFS55
 *
 * Recommends dielectric flushing strategy + pressure for a sinker EDM
 * cavity based on depth, feature geometry, burn stage, and electrode
 * material. Covers four modes:
 *
 *   - jet        — external side nozzle (default; low-depth cavities)
 *   - pressure   — through-electrode injection (deep narrow cavities)
 *   - suction    — vacuum pull-through-part (through-features or
 *                  cross-drilled workpieces)
 *   - immersion  — static submerged bath (fine finish / super-finish)
 *
 * Inputs: cavity depth + length + width (or diameter) + through-flag +
 *   electrode material + burn stage + optional electrode-flush-hole flag.
 *
 * Outputs: recommended mode, pressure (bar), flow rate hint (L/min),
 *   alternate strategies, and human-readable reasoning.
 *
 * Pressure model (Mitsubishi MV + AGIE D-Series sinker app guides):
 *
 *   P_base_bar = 0.4 + 0.08 * depth_mm       (clamped [0.5, 8.0])
 *   AR = depth / min(length, width)          ← aspect ratio
 *
 *   mode selection:
 *     AR > 5  AND !is_through AND !electrode_flush_hole → needs flush hole
 *                                                       → pressure mode
 *     AR > 3  AND electrode_flush_hole                  → pressure mode
 *     is_through AND depth > 20 mm                       → suction mode
 *     stage in {finish, super_finish}                    → immersion
 *     else                                               → jet mode
 *
 *   mode pressure modifiers:
 *     pressure mode → P_base × 1.5  (higher because flushing through hole)
 *     suction mode  → P_base × 0.7  (gentler pull)
 *     immersion     → P_base × 0.3  (near-static for finish stability)
 *     jet mode      → P_base × 1.0
 *
 *   flow_rate_L_per_min ≈ P_bar × 2.5  (empirical, for 3/8" dielectric line)
 *
 * Warnings:
 *   - Deep cavity (AR > 5) without electrode flush hole → strongly recommend one
 *   - Graphite electrode + pressure mode → flag graphite dust recirculation
 *   - Finish stages with jet mode → suggest immersion for Ra < 0.8 µm
 */

import type { PartFeature } from "./EDMDrawingInterpretationEngine.js";
import type { ElectrodeMaterial } from "./ElectrodeDesignEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type FlushMode = "jet" | "pressure" | "suction" | "immersion";
export type SinkerBurnStage = "rough" | "semi" | "finish" | "super_finish";

export interface SinkerFlushInput {
  feature: PartFeature;
  burn_stage: SinkerBurnStage;
  electrode_material?: ElectrodeMaterial;
  /** Does the electrode have a central flush bore? */
  electrode_flush_hole?: boolean;
  /** Override the base pressure calc (mm → bar) if needed. */
  base_pressure_override_bar?: number;
}

export interface SinkerFlushRecommendation {
  mode: FlushMode;
  pressure_bar: number;
  flow_rate_l_min: number;
  reason: string;
  alternates: Array<{ mode: FlushMode; pressure_bar: number; tradeoff: string }>;
  warnings: string[];
  /** Aspect ratio: depth / min(length, width). */
  aspect_ratio: number;
  /** Whether the cavity is considered "deep" (AR > 3). */
  deep_cavity: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BASE_FACTORS: Record<FlushMode, number> = {
  pressure: 1.5,
  jet: 1.0,
  suction: 0.7,
  immersion: 0.3,
};

const MIN_BASE_PRESSURE_BAR = 0.5;
const MAX_BASE_PRESSURE_BAR = 8.0;
/** Flow rate ≈ P × FLOW_K (empirical — 3/8" dielectric line). */
const FLOW_K = 2.5;

// ============================================================================
// ENGINE
// ============================================================================

export class SinkerEDMFlushingAdvisorEngine {
  recommend(input: SinkerFlushInput): SinkerFlushRecommendation {
    const {
      feature,
      burn_stage,
      electrode_material = "graphite_fine",
      electrode_flush_hole = false,
      base_pressure_override_bar,
    } = input;

    if (!feature || !feature.dimensions_mm) {
      throw new Error("feature.dimensions_mm required");
    }

    const length = feature.dimensions_mm.length ?? feature.dimensions_mm.diameter ?? 0;
    const width = feature.dimensions_mm.width ?? feature.dimensions_mm.diameter ?? length;
    const depth = feature.dimensions_mm.depth ?? 0;

    if (depth <= 0 || length <= 0 || width <= 0) {
      throw new Error(
        `feature must have positive length/width/depth (got L=${length}, W=${width}, D=${depth})`,
      );
    }

    const minXY = Math.min(length, width);
    const aspectRatio = depth / minXY;
    const deepCavity = aspectRatio > 3;

    // Base pressure: 0.4 + 0.08*depth, clamped.
    let basePressure = base_pressure_override_bar
      ?? clamp(0.4 + 0.08 * depth, MIN_BASE_PRESSURE_BAR, MAX_BASE_PRESSURE_BAR);

    // Mode selection.
    let mode: FlushMode;
    let reason: string;
    const warnings: string[] = [];

    if (burn_stage === "finish" || burn_stage === "super_finish") {
      mode = "immersion";
      reason = `${burn_stage} stage: immersion minimizes arc disruption for Ra stability`;
    } else if (feature.is_through && depth > 20) {
      mode = "suction";
      reason = `Through feature ${depth}mm deep: vacuum pull-through evacuates debris cleanly`;
    } else if (aspectRatio > 5 && !electrode_flush_hole) {
      mode = "pressure";
      reason = `Very deep cavity (AR=${aspectRatio.toFixed(1)}): pressure mode required; electrode flush hole strongly recommended`;
      warnings.push(
        `Cavity AR=${aspectRatio.toFixed(1)} > 5 without electrode flush hole — add central Ø2-4 mm flush bore`,
      );
    } else if (aspectRatio > 3 && electrode_flush_hole) {
      mode = "pressure";
      reason = `Deep cavity (AR=${aspectRatio.toFixed(1)}) with electrode flush hole: pressure injection keeps gap clean`;
    } else {
      mode = "jet";
      reason = `Shallow/moderate cavity (AR=${aspectRatio.toFixed(1)}): side-nozzle jet sufficient`;
    }

    // Apply mode pressure modifier.
    const finalPressure = round2(clamp(basePressure * BASE_FACTORS[mode], 0.3, 12));
    const flowRate = round2(finalPressure * FLOW_K);

    // Secondary warnings.
    if (electrode_material.includes("graphite") && mode === "pressure") {
      warnings.push(
        "Graphite + pressure flushing: filter dielectric frequently — graphite dust accelerates filter loading",
      );
    }
    if ((burn_stage === "rough" || burn_stage === "semi") && mode === "jet" && deepCavity) {
      warnings.push(
        `Deep cavity with jet flushing on ${burn_stage} stage — chip stacking possible; consider pressure mode with flush bore`,
      );
    }
    if (mode === "jet" && (burn_stage === "finish" || burn_stage === "super_finish")) {
      warnings.push("Jet on finish stage can disrupt micro-arcs — immersion preferred for Ra < 0.8 µm");
    }

    // Alternates.
    const alternates: SinkerFlushRecommendation["alternates"] = [];
    if (mode !== "pressure" && deepCavity) {
      alternates.push({
        mode: "pressure",
        pressure_bar: round2(basePressure * BASE_FACTORS.pressure),
        tradeoff: "Requires electrode flush hole; better deep-cavity evacuation",
      });
    }
    if (mode !== "immersion" && burn_stage !== "rough") {
      alternates.push({
        mode: "immersion",
        pressure_bar: round2(basePressure * BASE_FACTORS.immersion),
        tradeoff: "Gentler flushing; better Ra but slower MRR",
      });
    }
    if (mode !== "jet") {
      alternates.push({
        mode: "jet",
        pressure_bar: round2(basePressure * BASE_FACTORS.jet),
        tradeoff: "Simplest setup; only suitable for AR ≤ 3",
      });
    }

    return {
      mode,
      pressure_bar: finalPressure,
      flow_rate_l_min: flowRate,
      reason,
      alternates,
      warnings,
      aspect_ratio: round2(aspectRatio),
      deep_cavity: deepCavity,
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

function round2(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100) / 100;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const sinkerEDMFlushingAdvisorEngine = new SinkerEDMFlushingAdvisorEngine();
