/**
 * HypervolumeIndicator — quality measure for a set of points on a Pareto front.
 *
 * Given a set P ⊆ ℝ^d of objective vectors (assumed minimization) and a reference
 * point r ∈ ℝ^d with r_i ≥ max_{p∈P} p_i for every objective i, the hypervolume
 * indicator HV(P, r) is the d-dimensional Lebesgue measure of the union of
 * axis-aligned boxes [p_i, r_i] across all points p ∈ P. Geometrically: the
 * volume of objective space dominated by P, bounded above by r.
 *
 * Properties (Zitzler & Thiele 1999, Fonseca et al. 2006):
 *   • Strictly Pareto-compliant — HV(A) > HV(B) if A dominates B in the
 *     Pareto sense, monotone otherwise. The ONLY known unary indicator with
 *     this property without requiring a known optimum.
 *   • Reference-point dependent — HV grows linearly with reference distance.
 *     Bad-faith reference choice can mask quality differences; this implementation
 *     auto-adapts the reference when not provided (componentwise max + ε·range).
 *   • Complexity:
 *       d=2 : O(n log n)   sweep-line. Exact, deterministic.
 *       d=3 : O(n² log n)  slice-and-2D. Exact, deterministic.
 *       d≥4 : O(n^(d-1))   inclusion-exclusion (warning issued — slow).
 *
 * Why PRISM needs it (per PSN-ALGORITHM-SCOPING-2026-05-24 §3.5 ALGO-MAT-10):
 *   7 existing multi-objective solvers (`MultiObjectiveParetoEngine`,
 *   `WEDMParetoFrontierSearchEngine`, `LatheGeneticAlgorithmEngine`,
 *   `WEDMParetoCacheEngine`, etc.) currently use ad-hoc fixed-generation
 *   stopping. Hypervolume gives them a principled, problem-agnostic stopping
 *   criterion (stop when ΔHV/HV < ε over k iterations).
 *
 * Why a *new* algorithm and not an EXTEND:
 *   No standalone hypervolume primitive in the 90-file algorithms/ directory.
 *   The MultiObjectiveParetoEngine has embedded dominance logic but no
 *   volumetric indicator. Confirmed via prism_session:master_index_query
 *   for "hypervolume indicator Pareto multi-objective" (zero hits 2026-05-24).
 *
 * References:
 *   - Zitzler & Thiele (1999) "Multiobjective Evolutionary Algorithms: A
 *     Comparative Case Study and the Strength Pareto Approach." IEEE TEVC 3(4).
 *   - Fonseca, Paquete, López-Ibáñez (2006) "An improved dimension-sweep
 *     algorithm for the hypervolume indicator." CEC 2006.
 *   - Bringmann & Friedrich (2010) "Approximating the volume of unions and
 *     intersections of high-dimensional geometric objects."
 *
 * @module algorithms/HypervolumeIndicator
 * @since ALGO-SYNERGY-MS0 Phase 3 (2026-05-24, slot:tango)
 */

import type { Algorithm, AlgorithmMeta, ValidationResult } from "./types.js";
import { createValidationResult } from "./types.js";

// ─── Input / Output Types ──────────────────────────────────────────────

/**
 * A single objective vector. All entries are minimization-direction values
 * (lower is better). For maximization objectives, negate before passing in.
 */
export type Point = readonly number[];

export interface HypervolumeInput {
  /** Set of objective vectors (one per Pareto-front candidate solution). */
  points: ReadonlyArray<Point>;
  /**
   * Reference point — componentwise upper bound dominated by no point.
   * If omitted, auto-adapted to componentwise max(points) × (1 + epsilon).
   * Required when comparing HV across different point sets (otherwise the
   * adaptive reference shifts and HV values are not comparable).
   */
  reference?: Point;
  /**
   * Relative inflation factor for the adaptive reference (default 0.1 = 10%).
   * Only used when `reference` is omitted.
   */
  reference_inflation?: number;
  /**
   * If true, the input is assumed to be a Pareto front (already non-dominated).
   * Skips the O(n²) dominance filter. Default false.
   */
  assume_non_dominated?: boolean;
}

export interface HypervolumeOutput {
  /** The hypervolume value in objective-space units^d. */
  hypervolume: number;
  /** Number of points contributing to the dominated region (post-filter). */
  non_dominated_count: number;
  /** Number of input points discarded by the dominance filter. */
  dominated_count: number;
  /** The reference point used (echoed for traceability). */
  reference: Point;
  /** Whether the reference was operator-supplied (false = adaptive). */
  reference_was_supplied: boolean;
  /** Dimensionality of the objective space. */
  dimensions: number;
  /**
   * Algorithm path taken: "2d_sweep" | "3d_slice" | "dge4_inclusion_exclusion".
   * Drives the complexity bound — useful for downstream stopping-criterion
   * scheduling (don't re-evaluate HV every generation in dge4).
   */
  algorithm: "2d_sweep" | "3d_slice" | "dge4_inclusion_exclusion";
  /** Computation timestamp (ISO 8601). */
  computed_at: string;
  /** Warnings (e.g., adaptive reference used, high-dimensional slowness). */
  warnings: string[];
}

// ─── Implementation ────────────────────────────────────────────────────

/**
 * Strict Pareto dominance: a strictly dominates b iff a_i ≤ b_i for all i and
 * a_i < b_i for at least one i.
 * Local to this file by design — no standalone `paretoDominates` exists in
 * mcp-server/src/algorithms/ (confirmed 2026-05-24 via grep + master-index).
 * If a future ALGO-SYNERGY-MS0 unit exports a canonical primitive, this should
 * delegate to it — but composition law would be unchanged.
 */
function strictlyDominates(a: Point, b: Point): boolean {
  let strictlyLess = false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] > b[i]) return false;
    if (a[i] < b[i]) strictlyLess = true;
  }
  return strictlyLess;
}

/**
 * Filter to the non-dominated subset (Pareto front).
 * O(n²) — adequate up to ~1000 points; for larger inputs a kd-tree filter
 * would be needed.
 */
function paretoFilter(points: ReadonlyArray<Point>): Point[] {
  const survivors: Point[] = [];
  for (const candidate of points) {
    let dominated = false;
    for (const other of points) {
      if (other === candidate) continue;
      if (strictlyDominates(other, candidate)) {
        dominated = true;
        break;
      }
    }
    if (!dominated) survivors.push(candidate);
  }
  // De-duplicate identical points (which trivially "dominate" each other,
  // both surviving — but should count once).
  const seen = new Set<string>();
  const unique: Point[] = [];
  for (const p of survivors) {
    const key = p.join(",");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
  }
  return unique;
}

/**
 * 2D hypervolume via dimension-sweep.
 * Points are sorted ascending by x. After Pareto filtering the y values
 * are strictly decreasing (which we exploit for an O(n) sweep after the
 * O(n log n) sort).
 */
function hv2d(front: Point[], ref: Point): number {
  if (front.length === 0) return 0;
  const sorted = front.slice().sort((a, b) => a[0] - b[0]);
  let hv = 0;
  let prevY = ref[1];
  for (const p of sorted) {
    const width = ref[0] - p[0];
    const height = prevY - p[1];
    if (width > 0 && height > 0) hv += width * height;
    prevY = Math.min(prevY, p[1]);
  }
  return hv;
}

/**
 * 3D hypervolume via slice-and-sweep.
 * Sort points by z ascending. For each adjacent pair, the slice from z_k to
 * z_{k+1} contributes a 2D area (computed in xy-plane) × (z_{k+1} - z_k).
 * Final slice extends to ref_z.
 */
function hv3d(front: Point[], ref: Point): number {
  if (front.length === 0) return 0;
  const sortedZ = front.slice().sort((a, b) => a[2] - b[2]);
  let hv = 0;
  for (let k = 0; k < sortedZ.length; k++) {
    const zSliceBottom = sortedZ[k][2];
    const zSliceTop = k + 1 < sortedZ.length ? sortedZ[k + 1][2] : ref[2];
    const dz = zSliceTop - zSliceBottom;
    if (dz <= 0) continue;
    // Active set: all points with z ≤ zSliceBottom (those dominate this slice).
    const active2d: Point[] = sortedZ.slice(0, k + 1).map((p) => [p[0], p[1]]);
    const active2dFront = paretoFilter(active2d);
    const sliceArea = hv2d(active2dFront, [ref[0], ref[1]]);
    hv += sliceArea * dz;
  }
  return hv;
}

/**
 * High-d hypervolume via inclusion-exclusion over the 2^n box-union.
 * Exact but exponential — used only as a fallback for d ≥ 4 with small n.
 * Warning is issued in the calling caller when this branch is taken.
 */
function hvInclusionExclusion(front: Point[], ref: Point): number {
  const n = front.length;
  if (n === 0) return 0;
  if (n > 22) {
    // 2^22 ≈ 4M subset enumerations — past this the algorithm is unusable.
    // Caller should have warned; we still compute but cap at this safety bound.
    throw new Error(
      `HypervolumeIndicator: dge4_inclusion_exclusion requires n ≤ 22 (got ${n}). ` +
      `For larger fronts, supply 2D or 3D projections or use the WFG algorithm ` +
      `(not yet implemented in PRISM — tracked as ALGO-SYNERGY-MS0 Phase-7 candidate).`,
    );
  }
  const d = ref.length;
  let hv = 0;
  // Subset enumeration: subset S of front, contribution = (-1)^(|S|+1) × vol(∩_{p∈S} [p, r]).
  for (let mask = 1; mask < (1 << n); mask++) {
    let vol = 1;
    const sign = bitCount(mask) % 2 === 1 ? 1 : -1;
    for (let dim = 0; dim < d; dim++) {
      // For dimension dim, the intersection lower-bound is max over selected points.
      let lower = -Infinity;
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) {
          if (front[i][dim] > lower) lower = front[i][dim];
        }
      }
      const extent = ref[dim] - lower;
      if (extent <= 0) {
        vol = 0;
        break;
      }
      vol *= extent;
    }
    hv += sign * vol;
  }
  return hv;
}

function bitCount(x: number): number {
  let c = 0;
  while (x) {
    c += x & 1;
    x >>>= 1;
  }
  return c;
}

/**
 * Adapt reference point when the operator did not supply one.
 * Reference = componentwise max(points) × (1 + inflation).
 * Inflation default 0.1 — enough to keep all points strictly inside the
 * dominated region, small enough to avoid masking HV differences.
 */
function adaptReference(points: ReadonlyArray<Point>, inflation: number): Point {
  if (points.length === 0) return [];
  const d = points[0].length;
  const ref: number[] = new Array(d).fill(-Infinity);
  for (const p of points) {
    for (let i = 0; i < d; i++) {
      if (p[i] > ref[i]) ref[i] = p[i];
    }
  }
  // Inflate, but handle the case where max is 0 or negative (use absolute
  // inflation offset of 1 unit so the reference is strictly above the point).
  for (let i = 0; i < d; i++) {
    const m = ref[i];
    if (m > 0) ref[i] = m * (1 + inflation);
    else if (m < 0) ref[i] = m * (1 - inflation); // moves further from 0
    else ref[i] = 1.0;
  }
  return ref;
}

// ─── Algorithm Object ─────────────────────────────────────────────────

export const HypervolumeIndicator: Algorithm<HypervolumeInput, HypervolumeOutput> = {
  validate(input: HypervolumeInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!input || !Array.isArray(input.points)) {
      errors.push("input.points must be an array");
      return createValidationResult(errors, warnings);
    }
    if (input.points.length === 0) {
      warnings.push("empty point set — hypervolume = 0 by definition");
    }

    let d: number | null = null;
    for (let i = 0; i < input.points.length; i++) {
      const p = input.points[i];
      if (!Array.isArray(p)) {
        errors.push(`points[${i}] is not an array`);
        continue;
      }
      if (d === null) d = p.length;
      else if (p.length !== d) {
        errors.push(`points[${i}] has dimension ${p.length}, expected ${d}`);
      }
      for (let k = 0; k < p.length; k++) {
        if (!Number.isFinite(p[k])) {
          errors.push(`points[${i}][${k}] is not finite (got ${p[k]})`);
        }
      }
    }

    if (input.reference !== undefined) {
      if (!Array.isArray(input.reference)) {
        errors.push("reference must be an array");
      } else if (d !== null && input.reference.length !== d) {
        errors.push(
          `reference dimension ${input.reference.length} ≠ point dimension ${d}`,
        );
      } else {
        for (let k = 0; k < input.reference.length; k++) {
          if (!Number.isFinite(input.reference[k])) {
            errors.push(`reference[${k}] not finite (got ${input.reference[k]})`);
          }
        }
        // Reference must dominate (be at-or-above) every point in every objective.
        for (let i = 0; i < input.points.length; i++) {
          for (let k = 0; k < input.reference.length; k++) {
            if (input.reference[k] < input.points[i][k]) {
              errors.push(
                `reference[${k}]=${input.reference[k]} < points[${i}][${k}]=${input.points[i][k]} ` +
                `— reference must be componentwise ≥ every point for hypervolume to be defined`,
              );
            }
          }
        }
      }
    }

    if (input.reference_inflation !== undefined) {
      if (!Number.isFinite(input.reference_inflation) || input.reference_inflation < 0) {
        errors.push(
          `reference_inflation must be a non-negative finite number (got ${input.reference_inflation})`,
        );
      }
    }

    return createValidationResult(errors, warnings);
  },

  calculate(input: HypervolumeInput): HypervolumeOutput {
    const validation = this.validate(input);
    if (!validation.valid) {
      throw new Error(
        "HypervolumeIndicator: input validation failed: " +
          (validation.errors ?? []).join("; "),
      );
    }

    const warnings: string[] = [];
    const inflation =
      typeof input.reference_inflation === "number" ? input.reference_inflation : 0.1;

    // Adapt reference if not provided.
    const referenceWasSupplied = input.reference !== undefined;
    const reference: Point = referenceWasSupplied
      ? (input.reference as Point)
      : adaptReference(input.points, inflation);
    if (!referenceWasSupplied) {
      warnings.push(
        "reference point was auto-adapted (componentwise max × (1+inflation)) — " +
          "hypervolume values are NOT comparable across different point sets unless " +
          "the same reference is used; supply `reference` explicitly when comparing.",
      );
    }

    // Pareto filter.
    const filtered =
      input.points.length === 0
        ? []
        : input.assume_non_dominated
          ? Array.from(input.points)
          : paretoFilter(input.points);
    const dominatedCount = input.points.length - filtered.length;

    const dim = filtered.length > 0 ? filtered[0].length : reference.length;

    // Dispatch to dimension-specific kernel.
    let algorithm: HypervolumeOutput["algorithm"];
    let hv: number;
    if (filtered.length === 0) {
      algorithm = dim === 2 ? "2d_sweep" : dim === 3 ? "3d_slice" : "dge4_inclusion_exclusion";
      hv = 0;
    } else if (dim === 2) {
      algorithm = "2d_sweep";
      hv = hv2d(filtered, reference);
    } else if (dim === 3) {
      algorithm = "3d_slice";
      hv = hv3d(filtered, reference);
    } else {
      algorithm = "dge4_inclusion_exclusion";
      warnings.push(
        `dimension d=${dim} uses inclusion-exclusion (O(2^n × d)) — ` +
          `slow for n > 18, capped at n ≤ 22. For routine use at d ≥ 4 ` +
          `implement the WFG algorithm (Phase-7 candidate U-ALGO-WFG-HV).`,
      );
      hv = hvInclusionExclusion(filtered, reference);
    }

    return {
      hypervolume: hv,
      non_dominated_count: filtered.length,
      dominated_count: dominatedCount,
      reference: Array.from(reference),
      reference_was_supplied: referenceWasSupplied,
      dimensions: dim,
      algorithm,
      computed_at: new Date().toISOString(),
      warnings,
    };
  },

  getMetadata(): AlgorithmMeta {
    return {
      id: "hypervolume_indicator",
      name: "Hypervolume Indicator",
      version: "1.0.0",
      domain: "optimization",
      category: "multi_objective_quality_measure",
      description:
        "Strictly Pareto-compliant quality measure for the union of axis-aligned " +
        "boxes dominated by a point set up to a reference point. Used as a stopping " +
        "criterion for multi-objective solvers (NSGA-II, MOEA/D, WEDM Pareto front, " +
        "Lathe GA) and as a comparative metric between approximate Pareto fronts.",
      equation_plain:
        "HV(P, r) = Lebesgue_measure(union_{p in P} [p_1, r_1] x ... x [p_d, r_d])",
      formula: "hypervolume",
      references: [
        {
          authors: "Zitzler, E. and Thiele, L.",
          title:
            "Multiobjective Evolutionary Algorithms: A Comparative Case Study and the Strength Pareto Approach",
          publication: "IEEE Transactions on Evolutionary Computation",
          year: 1999,
          pages: "3(4) 257-271",
        },
        {
          authors: "Fonseca, C. M., Paquete, L., and López-Ibáñez, M.",
          title: "An improved dimension-sweep algorithm for the hypervolume indicator",
          publication: "Proc. IEEE Congress on Evolutionary Computation",
          year: 2006,
        },
      ],
      assumptions: [
        "All objectives are minimization (negate maximization objectives at input)",
        "Reference point dominates (is componentwise ≥) every input point",
        "When reference is auto-adapted, HV values across different point sets are NOT comparable",
      ],
      limitations: [
        "d=2 and d=3: exact and fast (O(n log n), O(n² log n))",
        "d ≥ 4: inclusion-exclusion is exponential — capped at n ≤ 22",
        "For d ≥ 4 with n > 22, implement WFG algorithm (not yet in PRISM)",
        "Sensitive to reference-point choice — bad references can mask quality differences",
      ],
      inputs: {
        points: "array of objective vectors (one per Pareto-front candidate)",
        reference: "componentwise upper-bound point (optional; adaptive default)",
        reference_inflation: "relative inflation for adaptive reference (default 0.1)",
        assume_non_dominated: "skip O(n²) Pareto filter if input is already a front",
      },
      outputs: {
        hypervolume: "the HV value in objective-space units^d",
        non_dominated_count: "size of the Pareto-filtered front used in the calculation",
        dominated_count: "input points discarded by the Pareto filter",
        reference: "the reference point actually used (echoed for traceability)",
        algorithm: "which kernel ran (2d_sweep, 3d_slice, dge4_inclusion_exclusion)",
      },
      last_validated: "2026-05-24",
    };
  },
};

export default HypervolumeIndicator;
