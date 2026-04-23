/**
 * AdaptiveRefinementEngine — Error-driven toolpath densification.
 *
 * Refines toolpaths by inserting midpoints where predicted error exceeds
 * tolerance. Supports four criteria:
 *   1. Curvature-based — chord error between consecutive segments
 *   2. Force-based (PTDC) — steep deflection / force gradient
 *   3. Thermal (TGAR) — high temperature gradient near zone boundaries
 *   4. Engagement (VCMR) — MRR deviation exceeds target threshold
 *
 * Iterates until max error < tolerance or max iterations reached.
 *
 * References:
 * - Zienkiewicz & Zhu (1987): Simple Error Estimator for Adaptive Mesh Refinement
 * - Altintas (2012): Manufacturing Automation, Ch. 3 — Interpolation error
 *
 * @module AdaptiveRefinementEngine
 */

// ── Types ─────────────────────────────────────────────────────────────────

/** A point on the refined toolpath. */
export interface RefinementPoint {
  x: number;
  y: number;
  z: number;
  feed_mmmin?: number;
  rpm?: number;
  ae_mm?: number;
  ap_mm?: number;
  /** true if from original path, false if inserted during refinement */
  original: boolean;
  refinement_reason?: string;
}

/** Input point with optional physics annotations. */
export interface InputPoint {
  x: number;
  y: number;
  z: number;
  feed_mmmin?: number;
  rpm?: number;
  ae_mm?: number;
  ap_mm?: number;
  force_N?: number;
  temperature_C?: number;
  mrr_mm3_min?: number;
}

export type RefinementCriterion = "curvature" | "force" | "thermal" | "engagement";

export interface RefinementTolerances {
  /** Maximum allowable chord error in mm (default 0.01). */
  chord_error_mm?: number;
  /** Maximum force gradient in N/mm (default 50). */
  max_force_gradient_N_mm?: number;
  /** Maximum temperature gradient in C/mm (default 10). */
  max_temp_gradient_C_mm?: number;
  /** Maximum MRR deviation percentage (default 10). */
  mrr_deviation_pct?: number;
}

export interface RefinementInput {
  points: InputPoint[];
  criteria: RefinementCriterion[];
  tolerances?: RefinementTolerances;
  /** Maximum refinement iterations (default 5). */
  max_iterations?: number;
  /** Hard cap on total point count (default 10000). */
  max_points?: number;
  /** Originating algorithm context, e.g. PTDC, TGAR, VCMR. */
  algorithm_context?: string;
}

export interface RefinementStats {
  curvature_inserts: number;
  force_inserts: number;
  thermal_inserts: number;
  engagement_inserts: number;
}

export interface RefinementResult {
  refined_points: RefinementPoint[];
  original_count: number;
  refined_count: number;
  points_added: number;
  iterations: number;
  converged: boolean;
  /** Largest remaining error across all criteria after refinement. */
  max_error: number;
  refinement_stats: RefinementStats;
  /** Percentage increase in path point density. */
  density_improvement_pct: number;
  warnings: string[];
  formula: string;
}

interface NeedsResult {
  needs: boolean;
  reason: string;
  error: number;
  criterion: RefinementCriterion;
}

/** Internal working point: InputPoint + tracking fields. */
interface WorkPoint extends InputPoint {
  original: boolean;
  refinement_reason?: string;
}

// ── Defaults ──────────────────────────────────────────────────────────────

const DEF_CHORD_ERR = 0.01;        // mm
const DEF_FORCE_GRAD = 50;         // N/mm
const DEF_TEMP_GRAD = 10;          // C/mm
const DEF_MRR_DEV = 10;            // %
const DEF_MAX_ITER = 5;
const DEF_MAX_PTS = 10_000;

// ── Helpers ───────────────────────────────────────────────────────────────

function dist3(a: InputPoint, b: InputPoint): number {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function lerpOpt(a: number | undefined, b: number | undefined, t: number): number | undefined {
  if (a === undefined && b === undefined) return undefined;
  const va = a ?? (b as number);
  const vb = b ?? (a as number);
  return va + (vb - va) * t;
}

type ResolvedTol = { chord: number; force: number; temp: number; mrr: number };

function resolveTol(t?: RefinementTolerances): ResolvedTol {
  return {
    chord: t?.chord_error_mm ?? DEF_CHORD_ERR,
    force: t?.max_force_gradient_N_mm ?? DEF_FORCE_GRAD,
    temp: t?.max_temp_gradient_C_mm ?? DEF_TEMP_GRAD,
    mrr: t?.mrr_deviation_pct ?? DEF_MRR_DEV,
  };
}

// ── Engine ────────────────────────────────────────────────────────────────

export class AdaptiveRefinementEngine {
  /**
   * Perpendicular distance from point B to the chord AC.
   * Uses cross-product formula: |AB x AC| / |AC|.
   */
  chordError(
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number },
    c: { x: number; y: number; z: number },
  ): number {
    const acx = c.x - a.x, acy = c.y - a.y, acz = c.z - a.z;
    const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
    const cx = aby * acz - abz * acy;
    const cy = abz * acx - abx * acz;
    const cz = abx * acy - aby * acx;
    const acLen = Math.sqrt(acx * acx + acy * acy + acz * acz);
    if (acLen < 1e-12) return 0;
    return Math.sqrt(cx * cx + cy * cy + cz * cz) / acLen;
  }

  /** Interpolate all properties at the midpoint of two input points. */
  insertMidpoint(a: InputPoint, b: InputPoint): RefinementPoint {
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      z: (a.z + b.z) / 2,
      feed_mmmin: lerpOpt(a.feed_mmmin, b.feed_mmmin, 0.5),
      rpm: lerpOpt(a.rpm, b.rpm, 0.5),
      ae_mm: lerpOpt(a.ae_mm, b.ae_mm, 0.5),
      ap_mm: lerpOpt(a.ap_mm, b.ap_mm, 0.5),
      original: false,
    };
  }

  /**
   * Check whether segment at index `idx` (points[idx]→points[idx+1])
   * requires further refinement under any of the active criteria.
   */
  needsRefinement(
    points: InputPoint[],
    idx: number,
    criteria: RefinementCriterion[],
    tolerances: ResolvedTol,
  ): NeedsResult {
    const none: NeedsResult = { needs: false, reason: "", error: 0, criterion: "curvature" };
    if (idx < 0 || idx + 1 >= points.length) return none;

    const a = points[idx];
    const b = points[idx + 1];
    const segLen = dist3(a, b);
    if (segLen < 1e-9) return none;

    let worst = 0;
    let worstReason = "";
    let worstCrit: RefinementCriterion = "curvature";

    for (const crit of criteria) {
      let err = 0;
      let reason = "";

      switch (crit) {
        case "curvature": {
          if (idx + 2 < points.length) {
            err = this.chordError(a, b, points[idx + 2]);
          } else if (idx > 0) {
            err = this.chordError(points[idx - 1], a, b);
          }
          if (err > tolerances.chord) {
            reason = `chord_error=${err.toFixed(4)}mm > ${tolerances.chord}mm`;
          }
          break;
        }
        case "force": {
          const fa = a.force_N ?? 0;
          const fb = b.force_N ?? 0;
          err = Math.abs(fb - fa) / segLen;
          if (err > tolerances.force) {
            reason = `force_gradient=${err.toFixed(1)}N/mm > ${tolerances.force}N/mm`;
          }
          break;
        }
        case "thermal": {
          const ta = a.temperature_C ?? 0;
          const tb = b.temperature_C ?? 0;
          err = Math.abs(tb - ta) / segLen;
          if (err > tolerances.temp) {
            reason = `temp_gradient=${err.toFixed(1)}C/mm > ${tolerances.temp}C/mm`;
          }
          break;
        }
        case "engagement": {
          const ma = a.mrr_mm3_min;
          const mb = b.mrr_mm3_min;
          if (ma !== undefined && mb !== undefined) {
            const avg = (ma + mb) / 2;
            if (avg > 1e-6) {
              err = (Math.abs(mb - ma) / avg) * 100;
              if (err > tolerances.mrr) {
                reason = `mrr_deviation=${err.toFixed(1)}% > ${tolerances.mrr}%`;
              }
            }
          }
          break;
        }
      }

      if (reason && err > worst) {
        worst = err;
        worstReason = reason;
        worstCrit = crit;
      }
    }

    if (worstReason) return { needs: true, reason: worstReason, error: worst, criterion: worstCrit };
    return none;
  }

  /**
   * Iteratively refine the toolpath until all segment errors fall within
   * tolerance, or the iteration / point-count cap is reached.
   */
  refine(input: RefinementInput): RefinementResult {
    const warnings: string[] = [];
    const tol = resolveTol(input.tolerances);
    const maxIter = input.max_iterations ?? DEF_MAX_ITER;
    const maxPts = input.max_points ?? DEF_MAX_PTS;
    const criteria = input.criteria.length > 0 ? input.criteria : (["curvature"] as RefinementCriterion[]);
    const originalCount = input.points.length;

    if (originalCount < 2) {
      warnings.push("Need at least 2 points for refinement");
      return this.buildResult(input.points.map(p => this.toWork(p, true)), originalCount, 0, true, 0, this.emptyStats(), warnings, input);
    }

    const stats: RefinementStats = { curvature_inserts: 0, force_inserts: 0, thermal_inserts: 0, engagement_inserts: 0 };
    let working: WorkPoint[] = input.points.map(p => this.toWork(p, true));
    let converged = false;
    let iterations = 0;
    let maxError = Infinity;

    for (iterations = 1; iterations <= maxIter; iterations++) {
      const next: WorkPoint[] = [];
      let inserted = 0;
      maxError = 0;

      for (let i = 0; i < working.length; i++) {
        next.push(working[i]);
        if (i + 1 >= working.length) continue;
        if (next.length + (working.length - i) >= maxPts) continue;

        const check = this.needsRefinement(working, i, criteria, tol);
        if (check.error > maxError) maxError = check.error;

        if (check.needs) {
          const mid = this.insertMidpoint(working[i], working[i + 1]);
          const midWork: WorkPoint = {
            ...mid,
            force_N: lerpOpt(working[i].force_N, working[i + 1].force_N, 0.5),
            temperature_C: lerpOpt(working[i].temperature_C, working[i + 1].temperature_C, 0.5),
            mrr_mm3_min: lerpOpt(working[i].mrr_mm3_min, working[i + 1].mrr_mm3_min, 0.5),
            original: false,
            refinement_reason: check.reason,
          };
          next.push(midWork);
          inserted++;

          if (check.criterion === "curvature") stats.curvature_inserts++;
          else if (check.criterion === "force") stats.force_inserts++;
          else if (check.criterion === "thermal") stats.thermal_inserts++;
          else if (check.criterion === "engagement") stats.engagement_inserts++;
        }
      }

      working = next;
      if (inserted === 0) { converged = true; break; }
      if (working.length >= maxPts) {
        warnings.push(`Point cap reached (${maxPts}) at iteration ${iterations}`);
        break;
      }
    }

    // Final max-error scan
    maxError = 0;
    for (let i = 0; i + 1 < working.length; i++) {
      const check = this.needsRefinement(working, i, criteria, tol);
      if (check.error > maxError) maxError = check.error;
    }
    if (!converged && maxError <= Math.max(tol.chord, tol.force, tol.temp, tol.mrr)) {
      converged = true;
    }

    const iters = Math.min(iterations, maxIter);
    return this.buildResult(working, originalCount, iters, converged, maxError, stats, warnings, input);
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private toWork(p: InputPoint, original: boolean): WorkPoint {
    return { ...p, original, refinement_reason: undefined };
  }

  private emptyStats(): RefinementStats {
    return { curvature_inserts: 0, force_inserts: 0, thermal_inserts: 0, engagement_inserts: 0 };
  }

  private buildResult(
    working: WorkPoint[],
    originalCount: number,
    iterations: number,
    converged: boolean,
    maxError: number,
    stats: RefinementStats,
    warnings: string[],
    input: RefinementInput,
  ): RefinementResult {
    const refined: RefinementPoint[] = working.map(p => ({
      x: p.x, y: p.y, z: p.z,
      feed_mmmin: p.feed_mmmin,
      rpm: p.rpm,
      ae_mm: p.ae_mm,
      ap_mm: p.ap_mm,
      original: p.original,
      refinement_reason: p.refinement_reason,
    }));

    const added = refined.length - originalCount;
    const density = originalCount > 0 ? (added / originalCount) * 100 : 0;
    const ctx = input.algorithm_context ? ` [${input.algorithm_context}]` : "";
    const critStr = (input.criteria.length > 0 ? input.criteria : ["curvature"]).join("+");

    return {
      refined_points: refined,
      original_count: originalCount,
      refined_count: refined.length,
      points_added: added,
      iterations,
      converged,
      max_error: parseFloat(maxError.toFixed(6)),
      refinement_stats: stats,
      density_improvement_pct: parseFloat(density.toFixed(1)),
      warnings,
      formula: `AdaptiveRefinement${ctx}: ${critStr} | ${originalCount}\u2192${refined.length} pts `
        + `(${iterations} iters, maxErr=${maxError.toFixed(4)}, converged=${converged})`,
    };
  }
}

export const adaptiveRefinementEngine = new AdaptiveRefinementEngine();
