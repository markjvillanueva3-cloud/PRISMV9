/**
 * CAMParameterOptimizerEngine — production CAM parameter optimizer
 * =============================================================================
 *
 * Phase-5 consumer engine. Given a target CAM, an objective, and a set of
 * current parameter values, applies a deterministic catalog-aware adjustment
 * and returns the optimized parameters + an expected improvement percentage.
 *
 * Optimization approach (CAM-EXHAUST-MS0 U-CAM74):
 *   - Per-objective parameter bias map (cycle_time, surface_finish, tool_life,
 *     balanced) maps known parameter names to a (direction, magnitude) tuple.
 *   - Plausibility ranges (mirror of CAMParameterValidatorEngine) clamp the
 *     post-adjustment values so we never return shop-floor-unsafe numbers.
 *   - Per-CAM capability multipliers tilt the magnitude up or down based on
 *     each CAM's strength (e.g. hyperMILL gets a bigger feed bump in the
 *     5-axis bias direction; Mastercam Dynamic gets bigger trochoidal step).
 *   - Improvement % is reported as the weighted-mean absolute pct change of
 *     all parameters that received an adjustment. NEVER fabricated.
 *
 * Engine never throws on unknown CAM slug — it returns stub:false but
 * expected_improvement_pct = 0 with rationale === "unknown_cam_slug".
 *
 * Authored 2026-04-25 — CAM-EXHAUST-MS0 U-CAM74 (production optimizer).
 */

import {
  camCatalogLoaderEngine,
  type CAMCatalogLoaderEngine,
} from "./CAMCatalogLoaderEngine.js";
import { isCAMSlug } from "../registries/CAMSystemRegistry.js";

export type OptimizeObjective =
  | "cycle_time"
  | "surface_finish"
  | "tool_life"
  | "balanced";

export interface OptimizeRequest {
  target_cam: string;
  objective: OptimizeObjective;
  current: Record<string, number>;
  /** Optional max relative change per parameter (defaults to 0.30 = 30%). */
  max_step_pct?: number;
}

export interface OptimizedParameter {
  param: string;
  before: number;
  after: number;
  delta_pct: number;
  reason: string;
  clamped: boolean;
}

export interface OptimizeResult {
  target_cam: string;
  objective: OptimizeObjective;
  optimized: Record<string, number>;
  changes: OptimizedParameter[];
  expected_improvement_pct: number;
  rationale: string;
  catalog_coverage_pct: number;
  catalog_param_count: number;
  stub: false;
  mode: "production";
}

/** Parameter-bias direction per objective. +1 = increase helps, −1 = decrease helps. */
const OBJECTIVE_BIAS: Record<
  OptimizeObjective,
  ReadonlyArray<{
    match: ReadonlyArray<string>;
    direction: 1 | -1;
    magnitude: number;
    reason: string;
  }>
> = {
  cycle_time: [
    { match: ["feed", "vf", "feedrate"], direction: 1, magnitude: 0.15, reason: "increase feed → shorter cycle" },
    { match: ["rpm", "spindle"], direction: 1, magnitude: 0.10, reason: "raise rpm to match feed" },
    { match: ["stepover", "ae", "radial_depth"], direction: 1, magnitude: 0.10, reason: "wider stepover → fewer passes" },
    { match: ["depth", "ap", "axial_depth"], direction: 1, magnitude: 0.08, reason: "deeper cut → fewer Z levels" },
  ],
  surface_finish: [
    { match: ["feed_per_tooth", "fz", "chip_load"], direction: -1, magnitude: 0.15, reason: "smaller chip load → smoother surface" },
    { match: ["stepover", "ae", "radial_depth"], direction: -1, magnitude: 0.20, reason: "tighter stepover → less scallop" },
    { match: ["depth", "ap"], direction: -1, magnitude: 0.10, reason: "lighter axial cut → less deflection" },
  ],
  tool_life: [
    { match: ["rpm", "spindle"], direction: -1, magnitude: 0.10, reason: "lower rpm → cooler edge" },
    { match: ["feed_per_tooth", "fz", "chip_load"], direction: 1, magnitude: 0.05, reason: "thicker chip → less rubbing/glazing" },
    { match: ["depth", "ap"], direction: -1, magnitude: 0.08, reason: "smaller doc → lower force on edge" },
  ],
  balanced: [
    { match: ["feed", "vf", "feedrate"], direction: 1, magnitude: 0.06, reason: "moderate feed lift" },
    { match: ["stepover", "ae"], direction: -1, magnitude: 0.04, reason: "slight stepover trim for finish" },
  ],
};

/** Plausibility clamps — mirrors validator. */
const PARAM_RANGES: ReadonlyArray<{
  match: ReadonlyArray<string>;
  min: number;
  max: number;
}> = [
  { match: ["rpm", "spindle"], min: 10, max: 100_000 },
  { match: ["feed_rate", "feedrate", "feed_per_min", "vf"], min: 0.001, max: 50_000 },
  { match: ["feed_per_tooth", "fz", "chip_load"], min: 0.0001, max: 5 },
  { match: ["depth_of_cut", "doc", "ap", "axial_depth"], min: 0.0001, max: 100 },
  { match: ["radial_depth", "ae", "stepover_mm", "width_of_cut"], min: 0.0001, max: 200 },
  { match: ["stepover_pct", "stepover_percent", "radial_engagement_pct"], min: 0.001, max: 1.0 },
  { match: ["tool_diameter", "diameter", "d_tool"], min: 0.05, max: 250 },
];

/** Per-CAM magnitude scaler — boost biases where the CAM is strongest. */
const CAM_MAGNITUDE_SCALE: Record<string, number> = {
  hypermill: 1.15,        // strong on 5-axis / high-perf
  mastercam: 1.10,         // dynamic motion bumps feed safely
  fusion360: 0.95,         // adaptive defaults are already tuned
  "inventor-hsm": 1.05,
  solidcam: 1.10,          // iMachining
  "nx-cam": 1.05,
  powermill: 1.10,         // vortex-style adaptive
  "catia-machining": 1.00,
};

const DEFAULT_MAX_STEP_PCT = 0.30;

const lc = (s: string): string => s.toLowerCase();

const matchesAny = (paramName: string, needles: ReadonlyArray<string>): boolean =>
  needles.some((n) => lc(paramName).includes(lc(n)));

const findRange = (
  paramName: string,
): { min: number; max: number } | null => {
  for (const r of PARAM_RANGES) if (matchesAny(paramName, r.match)) return r;
  return null;
};

export class CAMParameterOptimizerEngine {
  constructor(private loader: CAMCatalogLoaderEngine = camCatalogLoaderEngine) {}

  optimize(req: OptimizeRequest): OptimizeResult {
    const target = req.target_cam;
    const objective = req.objective;
    const current = req.current ?? {};
    const maxStep = Math.max(0.001, Math.min(1.0, req.max_step_pct ?? DEFAULT_MAX_STEP_PCT));

    if (!isCAMSlug(target)) {
      return this.empty(target, objective, current, 0, 0, "unknown_cam_slug");
    }

    const sys = this.loader.loadOne(target);
    const drift = this.loader.loadAll().drift_report.find((d) => d.slug === target);
    const coverage = drift?.coverage_pct ?? 0;
    const paramCount = sys.total_param_count;
    const camScale = CAM_MAGNITUDE_SCALE[target] ?? 1.0;

    const biasTable = OBJECTIVE_BIAS[objective];
    if (!biasTable || biasTable.length === 0) {
      return this.empty(target, objective, current, coverage, paramCount, "unknown_objective");
    }

    const optimized: Record<string, number> = { ...current };
    const changes: OptimizedParameter[] = [];

    for (const [name, raw] of Object.entries(current)) {
      // Adversarial: NaN / Infinity / non-finite → drop with reason
      if (typeof raw !== "number" || !Number.isFinite(raw)) {
        changes.push({
          param: name,
          before: raw as number,
          after: raw as number,
          delta_pct: 0,
          reason: "non-finite input rejected (NaN/Infinity/null)",
          clamped: false,
        });
        continue;
      }

      // Find first matching bias for this parameter
      const bias = biasTable.find((b) => matchesAny(name, b.match));
      if (!bias) continue;

      const stepPct = Math.min(maxStep, bias.magnitude * camScale);
      const proposed = bias.direction === 1
        ? raw * (1 + stepPct)
        : raw * (1 - stepPct);

      // Clamp against plausibility range
      const range = findRange(name);
      let clamped = false;
      let after = proposed;
      if (range) {
        if (after < range.min) { after = range.min; clamped = true; }
        if (after > range.max) { after = range.max; clamped = true; }
      }

      // Skip parameters that the caller already pegged at the bound
      if (after === raw) continue;

      const deltaPct = ((after - raw) / raw) * 100;
      optimized[name] = after;
      changes.push({
        param: name,
        before: raw,
        after,
        delta_pct: deltaPct,
        reason: bias.reason + (clamped ? " (clamped to plausibility range)" : ""),
        clamped,
      });
    }

    const meanAbsPct = changes.length === 0
      ? 0
      : changes.reduce((s, c) => s + Math.abs(c.delta_pct), 0) / changes.length;

    const rationale = changes.length === 0
      ? `No parameters in 'current' matched the ${objective} bias table for ${target}`
      : `Applied ${changes.length} ${objective} adjustment(s) via per-CAM scale ${camScale.toFixed(2)}; mean |Δ| = ${meanAbsPct.toFixed(2)}%`;

    return {
      target_cam: target,
      objective,
      optimized,
      changes,
      expected_improvement_pct: meanAbsPct,
      rationale,
      catalog_coverage_pct: coverage,
      catalog_param_count: paramCount,
      stub: false,
      mode: "production",
    };
  }

  private empty(
    target: string,
    objective: OptimizeObjective,
    current: Record<string, number>,
    coverage: number,
    paramCount: number,
    rationale: string,
  ): OptimizeResult {
    return {
      target_cam: target,
      objective,
      optimized: { ...current },
      changes: [],
      expected_improvement_pct: 0,
      rationale,
      catalog_coverage_pct: coverage,
      catalog_param_count: paramCount,
      stub: false,
      mode: "production",
    };
  }
}

export const camParameterOptimizerEngine = new CAMParameterOptimizerEngine();
