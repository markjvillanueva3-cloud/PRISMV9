/**
 * WassersteinDriftEngine — Optimal-transport distribution-drift distance.
 *
 * Manufacturing intelligence compares empirical distributions constantly:
 * surface-finish samples vs a spec baseline, sensor readings drifting across
 * machines/shifts, GNN feature domain-shift between training and live corpora.
 * The Kullback–Leibler divergence (see {@link InformationTheoryEngine.klDivergence})
 * is undefined / diverges the instant the two supports become disjoint or the
 * reference bin has zero mass — exactly the case a real drift alarm must catch.
 * The Wasserstein (earth-mover / optimal-transport) distance stays finite on
 * disjoint support and returns a physically-meaningful number expressed in the
 * quantity's own units (µm, N, °C, …), so a tolerance can be set directly in
 * data units.
 *
 * Implements:
 *   1. Exact 1-D Wasserstein-p (p = 1, 2) via the quantile-function integral —
 *      reduces to the sorted-sample closed form for equal sample sizes and
 *      handles unequal sizes exactly (no binning, no approximation).
 *   2. Entropic-regularised Sinkhorn for the general discrete OT case with an
 *      explicit cost matrix (log-domain stabilised; converges to the true OT
 *      cost as the regularisation → 0).
 *   3. A drift-flag helper that compares a distance against a tolerance stated
 *      in data units and grades severity.
 *
 * Pure, deterministic, dependency-free math (Zod only for input validation).
 * No RNG is used anywhere, so results are bit-reproducible across runs.
 *
 * References:
 *   - Villani, "Optimal Transport: Old and New" (2009) — W_p definition.
 *   - Peyré & Cuturi, "Computational Optimal Transport" (2019), §2–4 (1-D
 *     quantile formula) and §4.2 (log-domain Sinkhorn, Remark 4.23).
 *   - Cuturi, "Sinkhorn Distances" (NeurIPS 2013) — entropic regularisation.
 *   - SciPy `stats.wasserstein_distance` — 1-D CDF/quantile reference impl.
 *
 * @module WassersteinDriftEngine
 */

import { z } from "zod";

// ── Constants ───────────────────────────────────────────────────────────────

/** Numerical floor used to guard divisions and log-domain underflow. */
const EPSILON = 1e-12;
/** Default entropic regularisation strength for Sinkhorn (data-unit scale). */
const DEFAULT_SINKHORN_REG = 0.05;
/** Default maximum Sinkhorn iterations. */
const DEFAULT_SINKHORN_MAX_ITER = 1000;
/** Default marginal-error tolerance that stops Sinkhorn early. */
const DEFAULT_SINKHORN_TOL = 1e-9;

// ── Types ───────────────────────────────────────────────────────────────────

/** Which optimal-transport metric to use for 1-D drift. */
export type DriftMetric = "w1" | "w2";

/** Severity grade of a drift, derived from distance / tolerance ratio. */
export type DriftSeverity = "none" | "mild" | "moderate" | "severe";

/** Result of the drift-flag helper — all quantities in the data's own units. */
export interface DriftFlag {
  /** True iff distance strictly exceeds the tolerance. */
  drifted: boolean;
  /** The optimal-transport distance, in data units. */
  distance: number;
  /** The tolerance it was compared against, in data units. */
  tolerance: number;
  /** distance / tolerance (Infinity if tolerance === 0 and distance > 0). */
  ratio: number;
  /** Bucketed severity: none (<=1x) · mild (<=2x) · moderate (<=4x) · severe (>4x). */
  severity: DriftSeverity;
}

/** Full drift-detection result over two empirical samples. */
export interface DriftResult extends DriftFlag {
  /** Metric used to compute the distance. */
  metric: DriftMetric;
  /** Optional physical unit label echoed from the request. */
  unit?: string;
  /** Sample sizes of (baseline, current). */
  sampleSizes: { baseline: number; current: number };
  /** Human-readable formula reference. */
  formula: string;
}

/** Options for the Sinkhorn solver. */
export interface SinkhornOptions {
  /** Entropic regularisation strength (must be > 0). Default 0.05. */
  reg?: number;
  /** Maximum iterations. Default 1000. */
  maxIter?: number;
  /** Marginal-error tolerance for early stop. Default 1e-9. */
  tol?: number;
}

/** Result of the entropic-regularised Sinkhorn OT solve. */
export interface SinkhornResult {
  /** Regularised transport cost <P, C> = Σ P_ij C_ij (→ true OT as reg→0). */
  cost: number;
  /** The n×m optimal transport plan (coupling) P. */
  plan: number[][];
  /** Iterations actually run. */
  iterations: number;
  /** True iff the marginal error fell below `tol` before `maxIter`. */
  converged: boolean;
  /** Final marginal error Σ|rowSum − a| + Σ|colSum − b| at termination. */
  marginalError: number;
  /** Regularisation strength used. */
  reg: number;
}

// ── Input validation schema (Zod) ────────────────────────────────────────────

const finiteNumber = z
  .number()
  .refine((v) => Number.isFinite(v), { message: "value must be a finite number (no NaN/Infinity)" });

/** Public `detectDrift` input contract. */
export const WassersteinDriftInputSchema = z.object({
  /** Baseline / reference empirical sample. */
  baseline: z.array(finiteNumber).min(1, "baseline must have at least 1 sample"),
  /** Current / observed empirical sample. */
  current: z.array(finiteNumber).min(1, "current must have at least 1 sample"),
  /** Drift tolerance in the data's own units (non-negative). */
  tolerance: z.number().nonnegative("tolerance must be >= 0"),
  /** Metric: 1-D Wasserstein-1 (default) or Wasserstein-2. */
  metric: z.enum(["w1", "w2"]).default("w1"),
  /** Optional unit label (e.g. "um", "N", "degC"). */
  unit: z.string().optional(),
});

export type WassersteinDriftInput = z.input<typeof WassersteinDriftInputSchema>;

// ── Engine ──────────────────────────────────────────────────────────────────

export class WassersteinDriftEngine {
  /**
   * Exact 1-D Wasserstein-p distance between two empirical samples with uniform
   * per-sample weights, computed via the quantile-function integral
   *
   *   W_p(a,b) = ( ∫_0^1 |Q_a(t) − Q_b(t)|^p dt )^(1/p)
   *
   * where Q is the (right-continuous) empirical quantile function. The unit
   * interval is partitioned at the union of the quantile jump points {i/n_a}
   * and {j/n_b}; both quantile functions are constant on each sub-interval, so
   * the integral is a finite exact sum. For equal sizes this reduces to the
   * sorted-sample closed form (1/n) Σ |a_(i) − b_(i)|^p. No binning, exact.
   *
   * @param a First empirical sample (finite numbers, length >= 1).
   * @param b Second empirical sample (finite numbers, length >= 1).
   * @param p Transport order (1 or 2).
   * @returns The Wasserstein-p distance in the data's own units.
   * @throws If either sample is empty or contains a non-finite value, or p is
   *         not 1 or 2.
   */
  wassersteinP(a: number[], b: number[], p: 1 | 2): number {
    this.validateSamples(a, "a");
    this.validateSamples(b, "b");
    if (p !== 1 && p !== 2) {
      throw new Error(`WassersteinDriftEngine.wassersteinP: p must be 1 or 2, got ${p}`);
    }

    const sa = this.sortedCopy(a);
    const sb = this.sortedCopy(b);
    const na = sa.length;
    const nb = sb.length;

    // Union of quantile breakpoints i/na and j/nb across [0, 1], de-duplicated
    // and sorted. Merge-style to keep it O(na + nb).
    const breaks = this.mergeBreakpoints(na, nb);

    let acc = 0;
    for (let k = 0; k < breaks.length - 1; k++) {
      const t0 = breaks[k];
      const t1 = breaks[k + 1];
      const width = t1 - t0;
      if (width <= EPSILON) continue;
      // Midpoint lies strictly inside (t0, t1); both quantile functions are
      // constant there. Q(t) = s[ floor(t*n) ] on [k/n, (k+1)/n).
      const tm = 0.5 * (t0 + t1);
      const qa = sa[Math.min(Math.floor(tm * na), na - 1)];
      const qb = sb[Math.min(Math.floor(tm * nb), nb - 1)];
      const d = Math.abs(qa - qb);
      acc += (p === 1 ? d : d * d) * width;
    }

    return p === 1 ? acc : Math.sqrt(acc);
  }

  /**
   * Exact 1-D Wasserstein-1 (earth-mover) distance between two empirical
   * samples. Equal sizes → mean of |sorted diffs|; unequal sizes exact via the
   * quantile integral.
   *
   * @param a First empirical sample.
   * @param b Second empirical sample.
   * @returns W1 in the data's own units.
   */
  wasserstein1(a: number[], b: number[]): number {
    return this.wassersteinP(a, b, 1);
  }

  /**
   * Exact 1-D Wasserstein-2 distance between two empirical samples. Equal sizes
   * → sqrt(mean of squared sorted diffs); unequal sizes exact via the quantile
   * integral. Always W2 >= W1 (power-mean / Hölder inequality).
   *
   * @param a First empirical sample.
   * @param b Second empirical sample.
   * @returns W2 in the data's own units.
   */
  wasserstein2(a: number[], b: number[]): number {
    return this.wassersteinP(a, b, 2);
  }

  /**
   * Entropic-regularised optimal transport (Sinkhorn) for the general discrete
   * case: given source weights `a` (length n), target weights `b` (length m)
   * and an n×m cost matrix `C`, returns the transport plan and its cost. Solved
   * in the log domain (dual potentials) so small regularisation does not
   * underflow. The returned cost <P,C> converges to the true (un-regularised)
   * OT cost as `reg` → 0.
   *
   * `a` and `b` are internally normalised to sum to 1 (they are treated as
   * probability masses). Deterministic: potentials start at 0, no RNG.
   *
   * @param a Source masses (non-negative, not all zero).
   * @param b Target masses (non-negative, not all zero).
   * @param cost n×m cost matrix (finite, non-negative recommended).
   * @param opts Solver options (reg, maxIter, tol).
   * @returns The transport plan, its cost, and convergence diagnostics.
   * @throws On dimension mismatch, non-finite entries, reg <= 0, or zero-mass
   *         input.
   */
  sinkhorn(a: number[], b: number[], cost: number[][], opts: SinkhornOptions = {}): SinkhornResult {
    const reg = opts.reg ?? DEFAULT_SINKHORN_REG;
    const maxIter = opts.maxIter ?? DEFAULT_SINKHORN_MAX_ITER;
    const tol = opts.tol ?? DEFAULT_SINKHORN_TOL;

    if (!(reg > 0) || !Number.isFinite(reg)) {
      throw new Error(`WassersteinDriftEngine.sinkhorn: reg must be a finite positive number, got ${reg}`);
    }
    this.validateSamples(a, "a");
    this.validateSamples(b, "b");
    const n = a.length;
    const m = b.length;
    if (cost.length !== n) {
      throw new Error(`WassersteinDriftEngine.sinkhorn: cost has ${cost.length} rows, expected ${n} (length of a)`);
    }
    for (let i = 0; i < n; i++) {
      if (!Array.isArray(cost[i]) || cost[i].length !== m) {
        throw new Error(
          `WassersteinDriftEngine.sinkhorn: cost row ${i} has length ${cost[i]?.length}, expected ${m} (length of b)`,
        );
      }
      for (let j = 0; j < m; j++) {
        if (!Number.isFinite(cost[i][j])) {
          throw new Error(`WassersteinDriftEngine.sinkhorn: cost[${i}][${j}] is not finite`);
        }
      }
    }
    if (a.some((x) => x < 0) || b.some((x) => x < 0)) {
      throw new Error("WassersteinDriftEngine.sinkhorn: a and b masses must be non-negative");
    }

    // Normalise to probability masses.
    const sumA = a.reduce((s, x) => s + x, 0);
    const sumB = b.reduce((s, x) => s + x, 0);
    if (sumA <= EPSILON || sumB <= EPSILON) {
      throw new Error("WassersteinDriftEngine.sinkhorn: a and b must each carry positive total mass");
    }
    const pa = a.map((x) => x / sumA);
    const pb = b.map((x) => x / sumB);
    const logA = pa.map((x) => (x > 0 ? Math.log(x) : -Infinity));
    const logB = pb.map((x) => (x > 0 ? Math.log(x) : -Infinity));

    // Log-domain Sinkhorn: dual potentials f (n), g (m). Plan is
    //   P_ij = exp((f_i + g_j − C_ij) / reg).
    const f = new Array<number>(n).fill(0);
    const g = new Array<number>(m).fill(0);

    let iterations = 0;
    let marginalError = Infinity;
    let converged = false;

    for (let it = 0; it < maxIter; it++) {
      iterations = it + 1;

      // Row update: f_i = reg * ( logA_i − logsumexp_j( (g_j − C_ij)/reg ) )
      for (let i = 0; i < n; i++) {
        const row = cost[i];
        let terms = new Array<number>(m);
        for (let j = 0; j < m; j++) terms[j] = (g[j] - row[j]) / reg;
        f[i] = reg * (logA[i] - this.logSumExp(terms));
      }
      // Column update: g_j = reg * ( logB_j − logsumexp_i( (f_i − C_ij)/reg ) )
      for (let j = 0; j < m; j++) {
        let terms = new Array<number>(n);
        for (let i = 0; i < n; i++) terms[i] = (f[i] - cost[i][j]) / reg;
        g[j] = reg * (logB[j] - this.logSumExp(terms));
      }

      // Convergence: check marginal error of the current plan.
      marginalError = 0;
      for (let i = 0; i < n; i++) {
        let rowSum = 0;
        for (let j = 0; j < m; j++) {
          rowSum += Math.exp((f[i] + g[j] - cost[i][j]) / reg);
        }
        marginalError += Math.abs(rowSum - pa[i]);
      }
      for (let j = 0; j < m; j++) {
        let colSum = 0;
        for (let i = 0; i < n; i++) {
          colSum += Math.exp((f[i] + g[j] - cost[i][j]) / reg);
        }
        marginalError += Math.abs(colSum - pb[j]);
      }
      if (marginalError < tol) {
        converged = true;
        break;
      }
    }

    // Materialise the plan and its cost.
    const plan: number[][] = [];
    let cst = 0;
    for (let i = 0; i < n; i++) {
      const prow = new Array<number>(m);
      for (let j = 0; j < m; j++) {
        const pij = Math.exp((f[i] + g[j] - cost[i][j]) / reg);
        prow[j] = pij;
        cst += pij * cost[i][j];
      }
      plan.push(prow);
    }

    return { cost: cst, plan, iterations, converged, marginalError, reg };
  }

  /**
   * Grade a precomputed optimal-transport distance against a tolerance stated
   * in the data's own units. Pure comparison — no distribution math.
   *
   * @param distance A non-negative OT distance (data units).
   * @param tolerance The allowed distance before flagging drift (data units).
   * @returns A {@link DriftFlag} with boolean, ratio and severity.
   * @throws If distance is negative/non-finite or tolerance is negative.
   */
  driftFlag(distance: number, tolerance: number): DriftFlag {
    if (!Number.isFinite(distance) || distance < 0) {
      throw new Error(`WassersteinDriftEngine.driftFlag: distance must be finite and >= 0, got ${distance}`);
    }
    if (!Number.isFinite(tolerance) || tolerance < 0) {
      throw new Error(`WassersteinDriftEngine.driftFlag: tolerance must be finite and >= 0, got ${tolerance}`);
    }
    const drifted = distance > tolerance;
    const ratio = tolerance > 0 ? distance / tolerance : distance > 0 ? Infinity : 0;
    let severity: DriftSeverity;
    if (!drifted) severity = "none";
    else if (ratio <= 2) severity = "mild";
    else if (ratio <= 4) severity = "moderate";
    else severity = "severe";
    return { drifted, distance, tolerance, ratio, severity };
  }

  /**
   * End-to-end drift detection over two empirical samples: validates input,
   * computes the chosen 1-D Wasserstein metric, and grades it against the
   * tolerance. This is the composite entry point a dispatcher wires to.
   *
   * @param input {@link WassersteinDriftInput} (Zod-validated).
   * @returns A {@link DriftResult}.
   */
  detectDrift(input: WassersteinDriftInput): DriftResult {
    const parsed = WassersteinDriftInputSchema.parse(input);
    const metric = parsed.metric;
    const distance =
      metric === "w1"
        ? this.wasserstein1(parsed.baseline, parsed.current)
        : this.wasserstein2(parsed.baseline, parsed.current);
    const flag = this.driftFlag(distance, parsed.tolerance);
    return {
      ...flag,
      metric,
      unit: parsed.unit,
      sampleSizes: { baseline: parsed.baseline.length, current: parsed.current.length },
      formula:
        metric === "w1"
          ? "W1(a,b) = ∫_0^1 |Q_a(t) − Q_b(t)| dt"
          : "W2(a,b) = ( ∫_0^1 |Q_a(t) − Q_b(t)|^2 dt )^(1/2)",
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /** Validate a sample array is non-empty and all-finite; throw otherwise. */
  private validateSamples(x: number[], name: string): void {
    if (!Array.isArray(x) || x.length === 0) {
      throw new Error(`WassersteinDriftEngine: sample '${name}' must be a non-empty array`);
    }
    for (let i = 0; i < x.length; i++) {
      if (!Number.isFinite(x[i])) {
        throw new Error(`WassersteinDriftEngine: sample '${name}'[${i}] is not finite (NaN/Infinity)`);
      }
    }
  }

  /** Ascending numeric sort into a fresh array (does not mutate the input). */
  private sortedCopy(x: number[]): number[] {
    return x.slice().sort((p, q) => p - q);
  }

  /**
   * Merge the quantile breakpoints {i/na : i=0..na} ∪ {j/nb : j=0..nb} into one
   * ascending, de-duplicated array in [0, 1]. O(na + nb) two-pointer merge.
   */
  private mergeBreakpoints(na: number, nb: number): number[] {
    const out: number[] = [];
    let i = 0;
    let j = 0;
    let last = Number.NEGATIVE_INFINITY;
    while (i <= na || j <= nb) {
      const va = i <= na ? i / na : Number.POSITIVE_INFINITY;
      const vb = j <= nb ? j / nb : Number.POSITIVE_INFINITY;
      let v: number;
      if (va < vb) {
        v = va;
        i++;
      } else if (vb < va) {
        v = vb;
        j++;
      } else {
        v = va;
        i++;
        j++;
      }
      if (v - last > EPSILON) {
        out.push(v);
        last = v;
      }
    }
    return out;
  }

  /**
   * Numerically stable log-sum-exp of an array: max + log Σ exp(x − max).
   * Returns −Infinity when every entry is −Infinity (all-zero-mass row).
   */
  private logSumExp(values: number[]): number {
    let max = Number.NEGATIVE_INFINITY;
    for (const v of values) if (v > max) max = v;
    if (max === Number.NEGATIVE_INFINITY) return Number.NEGATIVE_INFINITY;
    let sum = 0;
    for (const v of values) sum += Math.exp(v - max);
    return max + Math.log(sum);
  }
}

/** Singleton instance — import and use directly. */
export const wassersteinEngine = new WassersteinDriftEngine();
