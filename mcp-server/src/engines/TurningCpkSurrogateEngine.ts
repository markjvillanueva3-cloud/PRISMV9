/**
 * TurningCpkSurrogateEngine — LATHE-PRO-MS5.4 ML surrogate.
 *
 * Learns a closed-form polynomial regression surrogate for
 *   Cpk ≈ f(Vc, f, ap, vb_failure, approach_deg, probe_interval)
 * from cascade evaluations (MS1 insert life + MS2 offset compensation).
 *
 * Purpose:
 *   - Replace the expensive MC-in-grid inner loop of the robust optimizer
 *     at probe points with a O(k²) regression forward pass.
 *   - Provide a fast first-guess for UI "what-if" queries.
 *   - Serve as a sanity check: if the surrogate's R² is low, the cascade
 *     response surface is non-smooth / contains phase transitions, which
 *     is itself actionable (narrow the search, add samples).
 *
 * Math:
 *   Feature vector φ(x) = [1, x₁, x₂, …, xₖ, x₁², x₂², …, xₖ²,
 *                          x₁x₂, x₁x₃, …, xₖ₋₁xₖ]  (degree ≤ 2)
 *   Fit β = (ΦᵀΦ + λI)⁻¹ Φᵀy    (ridge-regularised normal equations)
 *   Predict ŷ = φ(x_new) · β
 *
 * Why degree-2 + small ridge:
 *   Cpk curvature vs Vc / f is dominated by tool-life × offset-coupling
 *   terms that are locally smooth. Degree 2 captures sign + curvature
 *   without overfitting the noisy MC draws. Ridge λ=1e-6 guarantees
 *   positive-definite Gram even when predictors are near-collinear.
 *
 * This engine is the shipped source of truth — dispatcher actions
 * `turning_cpk_surrogate_fit` and `turning_cpk_surrogate_predict`
 * delegate here. Tests import directly AND go through the dispatcher.
 */

export type SurrogateFeatureName =
  | "Vc_m_min"
  | "f_mm_rev"
  | "ap_mm"
  | "vb_failure_um"
  | "approach_angle_deg"
  | "probe_interval";

export interface SurrogateSample {
  /** Feature map keyed by SurrogateFeatureName. Missing keys get 0. */
  features: Partial<Record<SurrogateFeatureName, number>>;
  /** Observed Cpk for this sample. Must be finite. */
  cpk: number;
}

export interface FitInput {
  samples: SurrogateSample[];
  /** Ridge regularisation. Default 1e-6 for numerical stability. */
  ridge?: number;
  /** Polynomial degree (1 or 2). Default 2. */
  degree?: 1 | 2;
  /** If true, center + unit-scale features before fit (improves conditioning). */
  standardize?: boolean;
}

export interface FitResult {
  coefficients: number[];
  feature_names: string[];
  degree: 1 | 2;
  ridge: number;
  standardize: boolean;
  /** Per-feature mean (when standardized) else zeros. */
  means: number[];
  /** Per-feature std (when standardized) else ones. Never < eps. */
  stds: number[];
  /** Coefficient of determination on training data. */
  r_squared: number;
  /** Mean squared error on training data. */
  mse_train: number;
  /** Sample count used for fit. */
  n_samples: number;
  /** Feature count in φ(x) (1 + k + k(k+1)/2 for degree 2). */
  n_features: number;
  source: string;
}

export interface PredictInput {
  model: FitResult;
  features: Partial<Record<SurrogateFeatureName, number>>;
}

export interface PredictResult {
  cpk_pred: number;
  /** Optional 1σ uncertainty from residual variance (rough). */
  cpk_std: number;
  source: string;
}

export interface CrossValidateInput {
  samples: SurrogateSample[];
  k?: number;
  ridge?: number;
  degree?: 1 | 2;
  standardize?: boolean;
  /** PRNG seed for fold shuffling. */
  seed?: number;
}

export interface CrossValidateResult {
  k: number;
  mse_folds: number[];
  mse_mean: number;
  mse_std: number;
  r2_folds: number[];
  r2_mean: number;
  n_samples: number;
  source: string;
}

const FEATURE_ORDER: SurrogateFeatureName[] = [
  "Vc_m_min",
  "f_mm_rev",
  "ap_mm",
  "vb_failure_um",
  "approach_angle_deg",
  "probe_interval",
];

const EPS = 1e-12;

class TurningCpkSurrogateEngine {
  /** Extract raw feature vector in canonical order. */
  private rawVector(features: Partial<Record<SurrogateFeatureName, number>>): number[] {
    return FEATURE_ORDER.map((n) => features[n] ?? 0);
  }

  /** Expand to polynomial feature vector φ(x). */
  private expand(x: number[], degree: 1 | 2): number[] {
    const phi: number[] = [1]; // intercept
    for (const v of x) phi.push(v);
    if (degree === 2) {
      for (const v of x) phi.push(v * v);
      for (let i = 0; i < x.length; i++) {
        for (let j = i + 1; j < x.length; j++) {
          phi.push(x[i] * x[j]);
        }
      }
    }
    return phi;
  }

  /** Name each expanded feature (for introspection / debug). */
  private expandedNames(degree: 1 | 2): string[] {
    const names = ["1"];
    for (const n of FEATURE_ORDER) names.push(n);
    if (degree === 2) {
      for (const n of FEATURE_ORDER) names.push(`${n}^2`);
      for (let i = 0; i < FEATURE_ORDER.length; i++) {
        for (let j = i + 1; j < FEATURE_ORDER.length; j++) {
          names.push(`${FEATURE_ORDER[i]}*${FEATURE_ORDER[j]}`);
        }
      }
    }
    return names;
  }

  /** Solve (A + λI) β = b via Cholesky-less Gauss-Jordan with pivoting.
   *  A must be symmetric; λ is pre-added to the diagonal by caller. */
  private solveLinear(A: number[][], b: number[]): number[] {
    const n = A.length;
    if (n === 0) return [];
    // Build augmented matrix
    const M = A.map((row, i) => [...row, b[i]]);
    for (let i = 0; i < n; i++) {
      // Partial pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
      }
      if (maxRow !== i) {
        [M[i], M[maxRow]] = [M[maxRow], M[i]];
      }
      const pivot = M[i][i];
      if (Math.abs(pivot) < EPS) {
        // Singular column — leave zero (regularization should prevent this)
        continue;
      }
      // Normalize row
      for (let j = i; j <= n; j++) M[i][j] /= pivot;
      // Eliminate other rows
      for (let k = 0; k < n; k++) {
        if (k === i) continue;
        const factor = M[k][i];
        if (factor === 0) continue;
        for (let j = i; j <= n; j++) M[k][j] -= factor * M[i][j];
      }
    }
    return M.map((row) => row[n]);
  }

  private validateSamples(samples: SurrogateSample[]): void {
    if (!Array.isArray(samples) || samples.length === 0) {
      throw new Error("TurningCpkSurrogateEngine.fit: samples must be a non-empty array");
    }
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      if (!Number.isFinite(s.cpk)) {
        throw new Error(`sample[${i}].cpk is not finite: ${s.cpk}`);
      }
      for (const name of FEATURE_ORDER) {
        const v = s.features[name];
        if (v !== undefined && !Number.isFinite(v)) {
          throw new Error(`sample[${i}].features.${name} is not finite: ${v}`);
        }
      }
    }
  }

  fit(input: FitInput): FitResult {
    this.validateSamples(input.samples);
    const degree: 1 | 2 = input.degree ?? 2;
    const ridge = input.ridge ?? 1e-6;
    const standardize = input.standardize ?? false;

    const X = input.samples.map((s) => this.rawVector(s.features));
    const y = input.samples.map((s) => s.cpk);
    const n = X.length;
    const k = FEATURE_ORDER.length;

    // Compute means/stds for standardization
    const means = new Array(k).fill(0);
    const stds = new Array(k).fill(1);
    if (standardize) {
      for (let j = 0; j < k; j++) {
        let sum = 0;
        for (let i = 0; i < n; i++) sum += X[i][j];
        means[j] = sum / n;
      }
      for (let j = 0; j < k; j++) {
        let s2 = 0;
        for (let i = 0; i < n; i++) s2 += (X[i][j] - means[j]) ** 2;
        stds[j] = n > 1 ? Math.sqrt(s2 / (n - 1)) : 1;
        if (stds[j] < EPS) stds[j] = 1; // constant column
      }
    }

    const standardize1 = (row: number[]) =>
      standardize ? row.map((v, j) => (v - means[j]) / stds[j]) : row;

    const Phi = X.map((row) => this.expand(standardize1(row), degree));
    const p = Phi[0].length;

    // Normal equations: (ΦᵀΦ + λI) β = Φᵀy
    const A: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
    const rhs: number[] = new Array(p).fill(0);
    for (let i = 0; i < n; i++) {
      for (let a = 0; a < p; a++) {
        rhs[a] += Phi[i][a] * y[i];
        for (let b = a; b < p; b++) {
          A[a][b] += Phi[i][a] * Phi[i][b];
        }
      }
    }
    // Mirror upper → lower and add ridge (not on intercept)
    for (let a = 0; a < p; a++) {
      for (let b = a + 1; b < p; b++) A[b][a] = A[a][b];
      if (a > 0) A[a][a] += ridge;
    }

    const beta = this.solveLinear(A, rhs);

    // Compute training metrics
    let sseTrain = 0;
    const yMean = y.reduce((s, v) => s + v, 0) / n;
    let sst = 0;
    for (let i = 0; i < n; i++) {
      let pred = 0;
      for (let a = 0; a < p; a++) pred += Phi[i][a] * beta[a];
      const e = y[i] - pred;
      sseTrain += e * e;
      sst += (y[i] - yMean) ** 2;
    }
    const mseTrain = sseTrain / n;
    const r2 = sst > 0 ? 1 - sseTrain / sst : 1.0;

    return {
      coefficients: beta,
      feature_names: this.expandedNames(degree),
      degree,
      ridge,
      standardize,
      means,
      stds,
      r_squared: Math.round(r2 * 100000) / 100000,
      mse_train: Math.round(mseTrain * 100000) / 100000,
      n_samples: n,
      n_features: p,
      source: "TurningCpkSurrogateEngine.fit (degree≤2 polynomial + ridge)",
    };
  }

  predict(input: PredictInput): PredictResult {
    const { model, features } = input;
    for (const name of FEATURE_ORDER) {
      const v = features[name];
      if (v !== undefined && !Number.isFinite(v)) {
        throw new Error(`predict: features.${name} is not finite: ${v}`);
      }
    }
    const raw = this.rawVector(features);
    const scaled = model.standardize
      ? raw.map((v, j) => (v - model.means[j]) / model.stds[j])
      : raw;
    const phi = this.expand(scaled, model.degree);
    if (phi.length !== model.coefficients.length) {
      throw new Error(
        `predict: feature dim mismatch phi=${phi.length} vs beta=${model.coefficients.length}`,
      );
    }
    let pred = 0;
    for (let i = 0; i < phi.length; i++) pred += phi[i] * model.coefficients[i];
    // Rough 1σ: sqrt(MSE) on training residuals
    const std = Math.sqrt(Math.max(model.mse_train, 0));
    return {
      cpk_pred: Math.round(pred * 100000) / 100000,
      cpk_std: Math.round(std * 100000) / 100000,
      source: "TurningCpkSurrogateEngine.predict",
    };
  }

  /** Mulberry32 PRNG. */
  private makeRandom(seed: number): () => number {
    let state = seed;
    return () => {
      let t = (state += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  crossValidate(input: CrossValidateInput): CrossValidateResult {
    this.validateSamples(input.samples);
    const n = input.samples.length;
    const k = Math.min(Math.max(input.k ?? 5, 2), n);
    const seed = input.seed ?? 42;

    // Shuffle indices
    const idx = input.samples.map((_, i) => i);
    const rand = this.makeRandom(seed);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }

    const foldSize = Math.floor(n / k);
    const mseFolds: number[] = [];
    const r2Folds: number[] = [];
    for (let f = 0; f < k; f++) {
      const start = f * foldSize;
      const end = f === k - 1 ? n : start + foldSize;
      const testIdx = new Set(idx.slice(start, end));
      const train = input.samples.filter((_, i) => !testIdx.has(i));
      const test = input.samples.filter((_, i) => testIdx.has(i));
      if (train.length < 3 || test.length < 1) continue;
      const model = this.fit({
        samples: train,
        ridge: input.ridge,
        degree: input.degree,
        standardize: input.standardize,
      });
      let sse = 0;
      const yTest = test.map((s) => s.cpk);
      const yMean = yTest.reduce((s, v) => s + v, 0) / yTest.length;
      let sst = 0;
      for (let i = 0; i < test.length; i++) {
        const p = this.predict({ model, features: test[i].features });
        const e = test[i].cpk - p.cpk_pred;
        sse += e * e;
        sst += (yTest[i] - yMean) ** 2;
      }
      mseFolds.push(sse / test.length);
      r2Folds.push(sst > 0 ? 1 - sse / sst : 1);
    }

    const mseMean = mseFolds.length
      ? mseFolds.reduce((s, v) => s + v, 0) / mseFolds.length
      : 0;
    const mseVar = mseFolds.length > 1
      ? mseFolds.reduce((s, v) => s + (v - mseMean) ** 2, 0) / (mseFolds.length - 1)
      : 0;
    const r2Mean = r2Folds.length
      ? r2Folds.reduce((s, v) => s + v, 0) / r2Folds.length
      : 0;

    return {
      k: mseFolds.length, // actual folds used
      mse_folds: mseFolds.map((v) => Math.round(v * 100000) / 100000),
      mse_mean: Math.round(mseMean * 100000) / 100000,
      mse_std: Math.round(Math.sqrt(mseVar) * 100000) / 100000,
      r2_folds: r2Folds.map((v) => Math.round(v * 100000) / 100000),
      r2_mean: Math.round(r2Mean * 100000) / 100000,
      n_samples: n,
      source: "TurningCpkSurrogateEngine.crossValidate",
    };
  }

  /** Canonical feature order (for dispatcher params). */
  featureOrder(): SurrogateFeatureName[] {
    return [...FEATURE_ORDER];
  }
}

export const turningCpkSurrogateEngine = new TurningCpkSurrogateEngine();
export { TurningCpkSurrogateEngine };
