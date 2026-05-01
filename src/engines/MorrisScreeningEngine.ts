// @ts-nocheck
/**
 * MorrisScreeningEngine — Morris Elementary Effects for Global Sensitivity Screening
 *
 * Implements the Morris (1991) One-At-a-Time (OAT) method for identifying
 * which input parameters have negligible, linear, or nonlinear/interactive
 * effects on model output. Efficient screening for high-dimensional models.
 *
 * Reference: Morris, M.D. (1991). "Factorial Sampling Plans for Preliminary
 * Computational Experiments", Technometrics, 33(2), 161-174.
 *
 * @module MorrisScreeningEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MorrisInput {
  /** Model function mapping named parameters to scalar output */
  model_fn: (x: Record<string, number>) => number;
  /** Parameter ranges: { name: [min, max] } */
  parameter_ranges: Record<string, [number, number]>;
  /** Number of trajectories (default 10) */
  n_trajectories?: number;
  /** Number of levels in the grid (default 4) */
  n_levels?: number;
  /** Step size in [0,1] space (default = n_levels / (2*(n_levels-1))) */
  delta?: number;
  /** Random seed for reproducibility */
  seed?: number;
}

export interface ElementaryEffectResult {
  parameter: string;
  /** Mean of elementary effects (signed) */
  mean_ee: number;
  /** Mean of absolute elementary effects (μ*) — primary screening metric */
  mean_abs_ee: number;
  /** Standard deviation of elementary effects — indicates interaction/nonlinearity */
  std_ee: number;
  /** Fraction of EEs with same sign — 1.0 = perfectly monotone */
  monotonicity: number;
  /** All individual elementary effects */
  elementary_effects: number[];
}

export interface MorrisResult {
  parameters: ElementaryEffectResult[];
  /** Parameters ranked by μ* descending */
  ranking: string[];
  n_trajectories: number;
  n_levels: number;
  delta: number;
  n_model_evaluations: number;
}

export interface MorrisDesign {
  /** Design matrix: each row is a point in [0,1]^k space */
  matrix: number[][];
  /** Trajectory indices: which rows belong to which trajectory */
  trajectory_indices: number[][];
  /** Parameter names in column order */
  parameter_names: string[];
  n_trajectories: number;
  n_parameters: number;
}

export interface ParameterClassification {
  parameter: string;
  classification: 'negligible' | 'linear' | 'nonlinear_interactive';
  mean_abs_ee: number;
  std_ee: number;
  recommended_uq_method: string;
  reason: string;
}

export interface ClassificationResult {
  classifications: ParameterClassification[];
  negligible: string[];
  linear: string[];
  nonlinear_interactive: string[];
  /** Recommended reduced parameter set for full UQ */
  reduced_parameter_set: string[];
}

// ============================================================================
// SEEDED PRNG (Mulberry32)
// ============================================================================

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededNormal(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-15))) * Math.cos(2 * Math.PI * u2);
}

// ============================================================================
// ENGINE
// ============================================================================

class MorrisScreeningEngine {

  /**
   * Calculate elementary effects for all parameters using Morris OAT design.
   *
   * For each trajectory, one parameter is perturbed at a time by ±delta in
   * the normalized [0,1] space. The elementary effect for parameter i is:
   *   EE_i = [f(x + delta*e_i) - f(x)] / delta
   *
   * μ* (mean |EE|) indicates overall influence; σ(EE) indicates
   * nonlinearity or interaction with other parameters.
   */
  calculateElementaryEffects(params: MorrisInput): MorrisResult {
    const {
      model_fn,
      parameter_ranges,
      n_trajectories = 10,
      n_levels = 4,
      seed = 42,
    } = params;

    const paramNames = Object.keys(parameter_ranges);
    const k = paramNames.length;

    if (k === 0) {
      return {
        parameters: [],
        ranking: [],
        n_trajectories,
        n_levels,
        delta: 0,
        n_model_evaluations: 0,
      };
    }

    const delta = params.delta ?? n_levels / (2 * (n_levels - 1));
    const rng = mulberry32(seed);

    // Storage for elementary effects per parameter
    const eeMap: Record<string, number[]> = {};
    for (const name of paramNames) {
      eeMap[name] = [];
    }

    let nEvals = 0;

    for (let t = 0; t < n_trajectories; t++) {
      // Generate random base point on the level grid
      const x0: number[] = new Array(k);
      for (let i = 0; i < k; i++) {
        const levelIdx = Math.floor(rng() * (n_levels - 1));
        x0[i] = levelIdx / (n_levels - 1);
      }

      // Random permutation of parameter indices for this trajectory
      const order = Array.from({ length: k }, (_, i) => i);
      for (let i = k - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }

      // Walk through the trajectory, perturbing one parameter at a time
      const current = [...x0];

      // Evaluate at starting point
      const startParams = this._toNamedParams(current, paramNames, parameter_ranges);
      let prevValue = model_fn(startParams);
      nEvals++;

      for (let step = 0; step < k; step++) {
        const idx = order[step];
        const direction = (rng() < 0.5 ? -1 : 1);
        let newVal = current[idx] + direction * delta;

        // Reflect if out of bounds
        if (newVal > 1) newVal = current[idx] - delta;
        if (newVal < 0) newVal = current[idx] + delta;
        // Clamp to [0, 1]
        newVal = Math.max(0, Math.min(1, newVal));

        const actualDelta = newVal - current[idx];
        current[idx] = newVal;

        const namedParams = this._toNamedParams(current, paramNames, parameter_ranges);
        const newValue = model_fn(namedParams);
        nEvals++;

        if (Math.abs(actualDelta) > 1e-15) {
          const ee = (newValue - prevValue) / actualDelta;
          eeMap[paramNames[idx]].push(ee);
        }

        prevValue = newValue;
      }
    }

    // Compute statistics
    const results: ElementaryEffectResult[] = paramNames.map((name) => {
      const ees = eeMap[name];
      if (ees.length === 0) {
        return {
          parameter: name,
          mean_ee: 0,
          mean_abs_ee: 0,
          std_ee: 0,
          monotonicity: 1,
          elementary_effects: [],
        };
      }
      const n = ees.length;
      const mean = ees.reduce((a, b) => a + b, 0) / n;
      const meanAbs = ees.reduce((a, b) => a + Math.abs(b), 0) / n;
      const variance = ees.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(n - 1, 1);
      const std = Math.sqrt(variance);

      // Monotonicity: fraction with same sign as mean
      const posCount = ees.filter((e) => e > 0).length;
      const negCount = ees.filter((e) => e < 0).length;
      const monotonicity = Math.max(posCount, negCount) / n;

      return {
        parameter: name,
        mean_ee: mean,
        mean_abs_ee: meanAbs,
        std_ee: std,
        monotonicity,
        elementary_effects: ees,
      };
    });

    // Rank by μ* descending
    const ranking = [...results]
      .sort((a, b) => b.mean_abs_ee - a.mean_abs_ee)
      .map((r) => r.parameter);

    return {
      parameters: results,
      ranking,
      n_trajectories,
      n_levels,
      delta,
      n_model_evaluations: nEvals,
    };
  }

  /**
   * Generate optimized Morris trajectory design matrix.
   *
   * Creates r trajectories through k-dimensional parameter space,
   * each consisting of (k+1) points. Applies space-filling criterion
   * by generating extra candidate trajectories and selecting the subset
   * with maximum spread.
   */
  generateMorrisDesign(params: {
    parameter_names: string[];
    n_trajectories?: number;
    n_levels?: number;
    delta?: number;
    seed?: number;
    n_candidates?: number;
  }): MorrisDesign {
    const {
      parameter_names,
      n_trajectories = 10,
      n_levels = 4,
      seed = 42,
      n_candidates = Math.max(n_trajectories * 5, 50),
    } = params;
    const delta = params.delta ?? n_levels / (2 * (n_levels - 1));
    const k = parameter_names.length;
    const rng = mulberry32(seed);

    if (k === 0) {
      return {
        matrix: [],
        trajectory_indices: [],
        parameter_names: [],
        n_trajectories: 0,
        n_parameters: 0,
      };
    }

    // Generate candidate trajectories
    const candidates: number[][][] = [];
    for (let c = 0; c < n_candidates; c++) {
      const trajectory: number[][] = [];
      const x0: number[] = new Array(k);
      for (let i = 0; i < k; i++) {
        const levelIdx = Math.floor(rng() * (n_levels - 1));
        x0[i] = levelIdx / (n_levels - 1);
      }
      trajectory.push([...x0]);

      const order = Array.from({ length: k }, (_, i) => i);
      for (let i = k - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }

      const current = [...x0];
      for (let step = 0; step < k; step++) {
        const idx = order[step];
        const dir = rng() < 0.5 ? -1 : 1;
        let nv = current[idx] + dir * delta;
        if (nv > 1) nv = current[idx] - delta;
        if (nv < 0) nv = current[idx] + delta;
        nv = Math.max(0, Math.min(1, nv));
        current[idx] = nv;
        trajectory.push([...current]);
      }
      candidates.push(trajectory);
    }

    // Select trajectories with maximum spread (greedy)
    const selected: number[] = [0];
    const trajCentroids = candidates.map((traj) => {
      const centroid = new Array(k).fill(0);
      for (const pt of traj) {
        for (let i = 0; i < k; i++) centroid[i] += pt[i];
      }
      for (let i = 0; i < k; i++) centroid[i] /= traj.length;
      return centroid;
    });

    while (selected.length < Math.min(n_trajectories, candidates.length)) {
      let bestIdx = -1;
      let bestMinDist = -1;
      for (let c = 0; c < candidates.length; c++) {
        if (selected.includes(c)) continue;
        let minDist = Infinity;
        for (const s of selected) {
          let d = 0;
          for (let i = 0; i < k; i++) d += (trajCentroids[c][i] - trajCentroids[s][i]) ** 2;
          minDist = Math.min(minDist, Math.sqrt(d));
        }
        if (minDist > bestMinDist) {
          bestMinDist = minDist;
          bestIdx = c;
        }
      }
      if (bestIdx >= 0) selected.push(bestIdx);
      else break;
    }

    // Flatten selected trajectories into design matrix
    const matrix: number[][] = [];
    const trajectory_indices: number[][] = [];
    for (const s of selected) {
      const startIdx = matrix.length;
      for (const pt of candidates[s]) {
        matrix.push(pt);
      }
      trajectory_indices.push(
        Array.from({ length: candidates[s].length }, (_, i) => startIdx + i)
      );
    }

    return {
      matrix,
      trajectory_indices,
      parameter_names,
      n_trajectories: selected.length,
      n_parameters: k,
    };
  }

  /**
   * Classify parameters based on Morris screening results.
   *
   * - Negligible: μ* ≈ 0 → can be fixed at nominal
   * - Linear: μ* large, σ ≈ 0 → additive effect, simple UQ sufficient
   * - Nonlinear/Interactive: μ* > 0, σ > 0 → needs full UQ treatment
   */
  classifyParameters(
    results: MorrisResult,
    options?: {
      /** Threshold for μ* to be considered non-negligible (fraction of max μ*) */
      mu_star_threshold?: number;
      /** Threshold for σ/μ* ratio to distinguish linear from nonlinear */
      sigma_ratio_threshold?: number;
    }
  ): ClassificationResult {
    const muStarThresh = options?.mu_star_threshold ?? 0.1;
    const sigmaRatioThresh = options?.sigma_ratio_threshold ?? 0.5;

    const maxMuStar = Math.max(
      ...results.parameters.map((p) => p.mean_abs_ee),
      1e-15
    );
    const threshold = muStarThresh * maxMuStar;

    const classifications: ParameterClassification[] = results.parameters.map((p) => {
      const muStar = p.mean_abs_ee;
      const sigma = p.std_ee;

      if (muStar < threshold) {
        return {
          parameter: p.parameter,
          classification: 'negligible' as const,
          mean_abs_ee: muStar,
          std_ee: sigma,
          recommended_uq_method: 'none — fix at nominal value',
          reason: `μ* = ${muStar.toFixed(4)} < threshold ${threshold.toFixed(4)}`,
        };
      }

      const ratio = sigma / Math.max(muStar, 1e-15);
      if (ratio < sigmaRatioThresh) {
        return {
          parameter: p.parameter,
          classification: 'linear' as const,
          mean_abs_ee: muStar,
          std_ee: sigma,
          recommended_uq_method: 'FOSM or simple Monte Carlo',
          reason: `σ/μ* = ${ratio.toFixed(4)} < ${sigmaRatioThresh} → additive effect`,
        };
      }

      return {
        parameter: p.parameter,
        classification: 'nonlinear_interactive' as const,
        mean_abs_ee: muStar,
        std_ee: sigma,
        recommended_uq_method: 'Full Monte Carlo, PCE, or Sobol analysis',
        reason: `σ/μ* = ${ratio.toFixed(4)} ≥ ${sigmaRatioThresh} → interaction/nonlinearity`,
      };
    });

    const negligible = classifications
      .filter((c) => c.classification === 'negligible')
      .map((c) => c.parameter);
    const linear = classifications
      .filter((c) => c.classification === 'linear')
      .map((c) => c.parameter);
    const nonlinear_interactive = classifications
      .filter((c) => c.classification === 'nonlinear_interactive')
      .map((c) => c.parameter);

    return {
      classifications,
      negligible,
      linear,
      nonlinear_interactive,
      reduced_parameter_set: [...linear, ...nonlinear_interactive],
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────

  /** Map normalized [0,1] vector to named parameter space */
  private _toNamedParams(
    normalized: number[],
    names: string[],
    ranges: Record<string, [number, number]>
  ): Record<string, number> {
    const result: Record<string, number> = {};
    for (let i = 0; i < names.length; i++) {
      const [lo, hi] = ranges[names[i]];
      result[names[i]] = lo + normalized[i] * (hi - lo);
    }
    return result;
  }
}

export const morrisScreeningEngine = new MorrisScreeningEngine();
