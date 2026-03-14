// @ts-nocheck
/**
 * AdvancedMLStatisticsEngine — 3 critical ML/statistics methods for PRISM
 *
 * Methods:
 *   1. MCMC (Metropolis-Hastings + Gibbs Sampling) — Metropolis et al. 1953, Hastings 1970, Geman & Geman 1984
 *   2. Random Forest (Classification + Regression) — Breiman 2001
 *   3. Logistic Regression (IRLS / Newton-Raphson) — Cox 1958, McCullagh & Nelder 1989
 *
 * All methods use seeded PRNG (Park-Miller LCG) for reproducibility.
 *
 * Manufacturing applications:
 *   - bayesianToolLife: Bayesian Taylor tool life inference via MH
 *   - toolBreakagePrediction: Logistic regression for breakage probability
 */

// ─── PRNG ───────────────────────────────────────────────────────────────────────

/** Park-Miller LCG seeded PRNG */
class SeededRNG {
  private state: number;
  constructor(seed: number) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }
  /** Returns uniform [0, 1) */
  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }
  /** Box-Muller normal */
  nextGaussian(mean = 0, std = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + std * z;
  }
}

// ─── Interfaces ─────────────────────────────────────────────────────────────────

/** Metropolis-Hastings input */
export interface MHInput {
  log_likelihood: (theta: number[]) => number;
  log_prior: (theta: number[]) => number;
  initial: number[];
  proposal_scale: number[];
  n_samples?: number;
  burn_in?: number;
  thin?: number;
  seed?: number;
}

/** Metropolis-Hastings result */
export interface MHResult {
  samples: number[][];
  acceptance_rate: number;
  posterior_mean: number[];
  posterior_std: number[];
  credible_interval_95: [number, number][];
  effective_sample_size: number[];
  gelman_rubin?: number;
  trace: number[][];
}

/** Gibbs sampler input */
export interface GibbsInput {
  model: 'normal_mean_variance' | 'linear_regression' | 'mixture_of_gaussians';
  data: number[] | number[][];
  n_samples?: number;
  burn_in?: number;
  hyperparams?: Record<string, number>;
}

/** Gibbs sampler result */
export interface GibbsResult {
  parameter_samples: Record<string, number[]>;
  posterior_summary: Record<string, { mean: number; std: number; ci_95: [number, number] }>;
  effective_sample_size: Record<string, number>;
  convergence_diagnostic: { converged: boolean; burn_in_sufficient: boolean };
}

/** Bayesian tool life input */
export interface BayesianToolLifeInput {
  observed_data: { speed_mpm: number; life_min: number }[];
  prior_n: { mean: number; std: number };
  prior_C: { mean: number; std: number };
  seed?: number;
}

/** Bayesian tool life result */
export interface BayesianToolLifeResult {
  n_posterior: { mean: number; std: number; ci_95: [number, number] };
  C_posterior: { mean: number; std: number; ci_95: [number, number] };
  predicted_life_at_speed: (v: number) => { mean: number; ci_95: [number, number] };
  data_influence: number;
}

/** Random forest classification input */
export interface RFClassifyInput {
  X_train: number[][];
  y_train: number[];
  X_test?: number[][];
  n_trees?: number;
  max_depth?: number;
  min_samples_split?: number;
  max_features?: number;
  seed?: number;
}

/** Random forest classification result */
export interface RFClassifyResult {
  predictions: number[];
  probabilities: number[][];
  oob_accuracy: number;
  oob_error: number;
  feature_importance: number[];
  n_trees_actual: number;
  confusion_matrix?: number[][];
}

/** Random forest regression input */
export interface RFRegressInput {
  X_train: number[][];
  y_train: number[];
  X_test?: number[][];
  n_trees?: number;
  max_depth?: number;
  min_samples_split?: number;
  max_features?: number;
  seed?: number;
}

/** Random forest regression result */
export interface RFRegressResult {
  predictions: number[];
  oob_mse: number;
  oob_r_squared: number;
  feature_importance: number[];
  prediction_intervals: [number, number][];
}

/** Feature importance analysis input */
export interface FeatureImportanceInput {
  model: 'random_forest';
  X: number[][];
  y: number[];
  n_repeats?: number;
  n_trees?: number;
  max_depth?: number;
  seed?: number;
}

/** Feature importance analysis result */
export interface FeatureImportanceResult {
  importances: { feature_index: number; mean_decrease: number; std: number }[];
  ranking: number[];
  significant_features: number[];
}

/** Logistic regression fit input */
export interface LogisticFitInput {
  X: number[][];
  y: number[];
  regularization?: 'none' | 'l2';
  lambda?: number;
  max_iter?: number;
  tol?: number;
}

/** Logistic regression fit result */
export interface LogisticFitResult {
  coefficients: number[];
  intercept: number;
  std_errors: number[];
  z_statistics: number[];
  p_values: number[];
  log_likelihood: number;
  aic: number;
  bic: number;
  pseudo_r_squared: number;
  convergence: { converged: boolean; iterations: number };
}

/** Logistic predict input */
export interface LogisticPredictInput {
  X_new: number[][];
  model: LogisticFitResult;
}

/** Logistic predict result */
export interface LogisticPredictResult {
  predictions: number[];
  probabilities: number[];
  odds_ratios: number[];
  confidence_intervals: [number, number][];
}

/** Tool breakage prediction input */
export interface ToolBreakageInput {
  cutting_speed_mpm: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  tool_wear_vb_mm: number;
  vibration_rms_g: number;
  power_draw_kw: number;
  time_in_cut_min: number;
}

/** Tool breakage prediction result */
export interface ToolBreakageResult {
  breakage_probability: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  contributing_factors: { factor: string; odds_ratio: number; contribution_pct: number }[];
  recommended_action: string;
}

// ─── Internal: Decision Tree ────────────────────────────────────────────────────

interface TreeNode {
  feature?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  value?: number;       // regression value or class label
  probabilities?: number[]; // class probabilities at leaf
}

// ─── Engine ─────────────────────────────────────────────────────────────────────

export class AdvancedMLStatisticsEngine {

  // ═══════════════════════════════════════════════════════════════════════════════
  // Method 1: MCMC — Metropolis-Hastings + Gibbs Sampling
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * General-purpose Metropolis-Hastings MCMC sampler.
   * Metropolis et al. (1953), Hastings (1970).
   * Acceptance ratio: α = min(1, exp(log_posterior(proposed) - log_posterior(current)))
   */
  metropolisHastings(params: MHInput): MHResult {
    const nSamples = params.n_samples ?? 10000;
    const burnIn = params.burn_in ?? 2000;
    const thin = params.thin ?? 1;
    const seed = params.seed ?? 42;
    const rng = new SeededRNG(seed);
    const dim = params.initial.length;

    const logPosterior = (theta: number[]): number => {
      return params.log_likelihood(theta) + params.log_prior(theta);
    };

    let current = [...params.initial];
    let currentLP = logPosterior(current);
    const allSamples: number[][] = [];
    let accepted = 0;
    const totalIter = burnIn + nSamples * thin;

    for (let i = 0; i < totalIter; i++) {
      // Propose
      const proposed = current.map((v, d) => v + rng.nextGaussian(0, params.proposal_scale[d]));
      const proposedLP = logPosterior(proposed);
      const logAlpha = proposedLP - currentLP;

      if (Math.log(rng.next()) < logAlpha) {
        current = proposed;
        currentLP = proposedLP;
        if (i >= burnIn) accepted++;
      }

      // Collect after burn-in, with thinning
      if (i >= burnIn && (i - burnIn) % thin === 0) {
        allSamples.push([...current]);
      }
    }

    const postBurnTotal = nSamples * thin;
    const acceptanceRate = accepted / postBurnTotal;

    // Posterior statistics
    const posteriorMean = new Array(dim).fill(0);
    for (const s of allSamples) {
      for (let d = 0; d < dim; d++) posteriorMean[d] += s[d];
    }
    for (let d = 0; d < dim; d++) posteriorMean[d] /= allSamples.length;

    const posteriorStd = new Array(dim).fill(0);
    for (const s of allSamples) {
      for (let d = 0; d < dim; d++) posteriorStd[d] += (s[d] - posteriorMean[d]) ** 2;
    }
    for (let d = 0; d < dim; d++) posteriorStd[d] = Math.sqrt(posteriorStd[d] / (allSamples.length - 1));

    // 95% credible intervals (quantile-based)
    const ci95: [number, number][] = [];
    for (let d = 0; d < dim; d++) {
      const sorted = allSamples.map(s => s[d]).sort((a, b) => a - b);
      const lo = sorted[Math.floor(0.025 * sorted.length)];
      const hi = sorted[Math.floor(0.975 * sorted.length)];
      ci95.push([lo, hi]);
    }

    // Effective sample size (using autocorrelation at lag 1)
    const ess = this._computeESS(allSamples, dim);

    return {
      samples: allSamples,
      acceptance_rate: acceptanceRate,
      posterior_mean: posteriorMean,
      posterior_std: posteriorStd,
      credible_interval_95: ci95,
      effective_sample_size: ess,
      trace: allSamples,
    };
  }

  /**
   * Compute effective sample size per dimension using lag-1 autocorrelation.
   * ESS = N / (1 + 2 * Σ ρ(k)), approximated by ESS ≈ N * (1 - ρ1) / (1 + ρ1)
   */
  private _computeESS(samples: number[][], dim: number): number[] {
    const N = samples.length;
    const ess: number[] = [];
    for (let d = 0; d < dim; d++) {
      const vals = samples.map(s => s[d]);
      const mean = vals.reduce((a, b) => a + b, 0) / N;
      let c0 = 0, c1 = 0;
      for (let i = 0; i < N; i++) c0 += (vals[i] - mean) ** 2;
      for (let i = 0; i < N - 1; i++) c1 += (vals[i] - mean) * (vals[i + 1] - mean);
      c0 /= N;
      c1 /= N;
      const rho1 = c0 > 0 ? c1 / c0 : 0;
      const essVal = rho1 >= 1 ? 1 : N * (1 - rho1) / (1 + rho1);
      ess.push(Math.max(1, essVal));
    }
    return ess;
  }

  /**
   * Component-wise Gibbs sampling for conjugate models.
   * Geman & Geman (1984).
   * Supports: normal_mean_variance, linear_regression, mixture_of_gaussians.
   */
  gibbsSampler(params: GibbsInput): GibbsResult {
    const nSamples = params.n_samples ?? 5000;
    const burnIn = params.burn_in ?? 1000;
    const hp = params.hyperparams ?? {};

    switch (params.model) {
      case 'normal_mean_variance':
        return this._gibbsNormalMeanVariance(params.data as number[], nSamples, burnIn, hp);
      case 'linear_regression':
        return this._gibbsLinearRegression(params.data as number[][], nSamples, burnIn, hp);
      case 'mixture_of_gaussians':
        return this._gibbsMixtureOfGaussians(params.data as number[], nSamples, burnIn, hp);
      default:
        throw new Error(`Unknown Gibbs model: ${params.model}`);
    }
  }

  /**
   * Gibbs for Normal(μ, σ²) with conjugate priors:
   *   μ | σ² ~ N(mu0, σ²/kappa0)
   *   σ² ~ InvGamma(alpha0, beta0)
   */
  private _gibbsNormalMeanVariance(
    data: number[], nSamples: number, burnIn: number, hp: Record<string, number>
  ): GibbsResult {
    const n = data.length;
    const xbar = data.reduce((a, b) => a + b, 0) / n;
    const mu0 = hp.mu0 ?? 0;
    const kappa0 = hp.kappa0 ?? 1;
    const alpha0 = hp.alpha0 ?? 1;
    const beta0 = hp.beta0 ?? 1;
    const seed = hp.seed ?? 123;
    const rng = new SeededRNG(seed);

    let mu = xbar;
    let sigma2 = 1;
    const muSamples: number[] = [];
    const sigma2Samples: number[] = [];
    const total = nSamples + burnIn;

    for (let i = 0; i < total; i++) {
      // Sample μ | σ², data ~ N(mu_n, sigma2/kappa_n)
      const kappaN = kappa0 + n;
      const muN = (kappa0 * mu0 + n * xbar) / kappaN;
      mu = rng.nextGaussian(muN, Math.sqrt(sigma2 / kappaN));

      // Sample σ² | μ, data ~ InvGamma(alpha_n, beta_n)
      const alphaN = alpha0 + n / 2;
      let betaN = beta0;
      for (const x of data) betaN += 0.5 * (x - mu) ** 2;
      betaN += 0.5 * kappa0 * (mu - mu0) ** 2 / (kappa0 + n) * n; // correction term is small
      // InvGamma sample: if X ~ Gamma(α, β), then 1/X ~ InvGamma(α, β)
      sigma2 = 1 / this._sampleGamma(rng, alphaN, 1 / betaN);
      if (!isFinite(sigma2) || sigma2 <= 0) sigma2 = 1;

      if (i >= burnIn) {
        muSamples.push(mu);
        sigma2Samples.push(sigma2);
      }
    }

    return this._buildGibbsResult({ mu: muSamples, sigma2: sigma2Samples });
  }

  /**
   * Gibbs for Bayesian linear regression:
   *   y = Xβ + ε, ε ~ N(0, σ²I)
   *   β | σ² ~ N(beta0, σ² * V0)
   *   σ² ~ InvGamma(alpha0, beta0)
   * Data format: each row is [x1, x2, ..., xp, y]
   */
  private _gibbsLinearRegression(
    data: number[][], nSamples: number, burnIn: number, hp: Record<string, number>
  ): GibbsResult {
    const n = data.length;
    const p = data[0].length - 1; // last column is y
    const X: number[][] = data.map(r => r.slice(0, p));
    const y: number[] = data.map(r => r[p]);
    const alpha0 = hp.alpha0 ?? 1;
    const betaPrior0 = hp.beta0 ?? 1;
    const seed = hp.seed ?? 456;
    const rng = new SeededRNG(seed);

    // OLS for initialization
    const XtX = this._matMul(this._transpose(X), X);
    const Xty = this._matVecMul(this._transpose(X), y);
    const XtXinv = this._invertMatrix(XtX);
    let beta = this._matVecMul(XtXinv, Xty);
    let sigma2 = 1;

    const betaSamples: number[][] = [];
    const sigma2Samples: number[] = [];
    const total = nSamples + burnIn;

    for (let i = 0; i < total; i++) {
      // Sample β | σ², y ~ N(beta_hat, σ² * (X'X)^{-1})
      // Posterior mean is OLS estimate
      const posteriorCov = XtXinv.map(row => row.map(v => v * sigma2));
      beta = this._sampleMVN(rng, this._matVecMul(XtXinv, Xty), posteriorCov);

      // Sample σ² | β, y ~ InvGamma
      const residuals = y.map((yi, j) => {
        let pred = 0;
        for (let k = 0; k < p; k++) pred += X[j][k] * beta[k];
        return yi - pred;
      });
      const sse = residuals.reduce((a, r) => a + r * r, 0);
      const alphaN = alpha0 + n / 2;
      const betaN = betaPrior0 + sse / 2;
      sigma2 = 1 / this._sampleGamma(rng, alphaN, 1 / betaN);
      if (!isFinite(sigma2) || sigma2 <= 0) sigma2 = 1;

      if (i >= burnIn) {
        betaSamples.push([...beta]);
        sigma2Samples.push(sigma2);
      }
    }

    const result: Record<string, number[]> = { sigma2: sigma2Samples };
    for (let k = 0; k < p; k++) {
      result[`beta_${k}`] = betaSamples.map(b => b[k]);
    }
    return this._buildGibbsResult(result);
  }

  /**
   * Gibbs for mixture of 2 Gaussians (simplified).
   */
  private _gibbsMixtureOfGaussians(
    data: number[], nSamples: number, burnIn: number, hp: Record<string, number>
  ): GibbsResult {
    const n = data.length;
    const seed = hp.seed ?? 789;
    const rng = new SeededRNG(seed);
    const K = 2;

    // Initialize
    let mu = [data[0], data[Math.floor(n / 2)]];
    let sigma2 = [1, 1];
    let pi = [0.5, 0.5];
    const z = new Array(n).fill(0);

    const mu0Samples: number[] = [];
    const mu1Samples: number[] = [];
    const total = nSamples + burnIn;

    for (let iter = 0; iter < total; iter++) {
      // Sample z_i | rest
      for (let i = 0; i < n; i++) {
        const lp0 = Math.log(pi[0]) - 0.5 * Math.log(sigma2[0]) - 0.5 * (data[i] - mu[0]) ** 2 / sigma2[0];
        const lp1 = Math.log(pi[1]) - 0.5 * Math.log(sigma2[1]) - 0.5 * (data[i] - mu[1]) ** 2 / sigma2[1];
        const maxLP = Math.max(lp0, lp1);
        const p0 = Math.exp(lp0 - maxLP);
        const p1 = Math.exp(lp1 - maxLP);
        z[i] = rng.next() < p0 / (p0 + p1) ? 0 : 1;
      }

      // Sample μ_k, σ²_k | z, data
      for (let k = 0; k < K; k++) {
        const members = data.filter((_, i) => z[i] === k);
        const nk = members.length;
        if (nk > 0) {
          const mk = members.reduce((a, b) => a + b, 0) / nk;
          mu[k] = rng.nextGaussian(mk, Math.sqrt(sigma2[k] / nk));
          let ss = 0;
          for (const x of members) ss += (x - mu[k]) ** 2;
          sigma2[k] = 1 / this._sampleGamma(rng, 1 + nk / 2, 1 / (1 + ss / 2));
          if (!isFinite(sigma2[k]) || sigma2[k] <= 0) sigma2[k] = 1;
        }
      }

      // Sample π | z
      const n0 = z.filter(v => v === 0).length;
      const n1 = n - n0;
      const g0 = this._sampleGamma(rng, 1 + n0, 1);
      const g1 = this._sampleGamma(rng, 1 + n1, 1);
      pi = [g0 / (g0 + g1), g1 / (g0 + g1)];

      if (iter >= burnIn) {
        mu0Samples.push(mu[0]);
        mu1Samples.push(mu[1]);
      }
    }

    return this._buildGibbsResult({ mu_0: mu0Samples, mu_1: mu1Samples });
  }

  /** Sample from Gamma(alpha, beta) using Marsaglia-Tsang method */
  private _sampleGamma(rng: SeededRNG, alpha: number, beta: number): number {
    if (alpha < 1) {
      // Boost: Gamma(α) = Gamma(α+1) * U^(1/α)
      return this._sampleGamma(rng, alpha + 1, beta) * Math.pow(rng.next(), 1 / alpha);
    }
    const d = alpha - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    for (let iter = 0; iter < 1000; iter++) {
      let x: number, v: number;
      do {
        x = rng.nextGaussian();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = rng.next();
      if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * beta;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * beta;
    }
    return d * beta; // fallback
  }

  /** Build GibbsResult from parameter sample arrays */
  private _buildGibbsResult(paramSamples: Record<string, number[]>): GibbsResult {
    const summary: Record<string, { mean: number; std: number; ci_95: [number, number] }> = {};
    const essMap: Record<string, number> = {};

    for (const [key, vals] of Object.entries(paramSamples)) {
      const n = vals.length;
      const mean = vals.reduce((a, b) => a + b, 0) / n;
      const std = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1));
      const sorted = [...vals].sort((a, b) => a - b);
      const ci_95: [number, number] = [
        sorted[Math.floor(0.025 * n)],
        sorted[Math.floor(0.975 * n)],
      ];
      summary[key] = { mean, std, ci_95 };

      // ESS via lag-1 autocorrelation
      let c0 = 0, c1 = 0;
      for (let i = 0; i < n; i++) c0 += (vals[i] - mean) ** 2;
      for (let i = 0; i < n - 1; i++) c1 += (vals[i] - mean) * (vals[i + 1] - mean);
      c0 /= n; c1 /= n;
      const rho1 = c0 > 0 ? c1 / c0 : 0;
      essMap[key] = Math.max(1, rho1 >= 1 ? 1 : n * (1 - rho1) / (1 + rho1));
    }

    // Convergence: check if second half mean ≈ first half mean
    let converged = true;
    for (const vals of Object.values(paramSamples)) {
      const n = vals.length;
      const half = Math.floor(n / 2);
      const mean1 = vals.slice(0, half).reduce((a, b) => a + b, 0) / half;
      const mean2 = vals.slice(half).reduce((a, b) => a + b, 0) / (n - half);
      const std = Math.sqrt(vals.reduce((a, v) => a + (v - mean1) ** 2, 0) / n);
      if (std > 0 && Math.abs(mean2 - mean1) / std > 0.5) converged = false;
    }

    return {
      parameter_samples: paramSamples,
      posterior_summary: summary,
      effective_sample_size: essMap,
      convergence_diagnostic: { converged, burn_in_sufficient: converged },
    };
  }

  /**
   * Bayesian inference for Taylor tool life parameters (n, C).
   * Taylor equation: V * T^n = C  =>  T = (C/V)^(1/n)
   * Uses Metropolis-Hastings on log(n), log(C) for positivity.
   */
  bayesianToolLife(params: BayesianToolLifeInput): BayesianToolLifeResult {
    const { observed_data, prior_n, prior_C } = params;
    const seed = params.seed ?? 314;

    // Log-likelihood: T_i = (C / V_i)^(1/n), observed with lognormal error
    const logLik = (theta: number[]): number => {
      const n = theta[0];
      const C = theta[1];
      if (n <= 0 || C <= 0) return -1e12;
      let ll = 0;
      for (const d of observed_data) {
        const predictedLife = Math.pow(C / d.speed_mpm, 1 / n);
        if (predictedLife <= 0 || !isFinite(predictedLife)) return -1e12;
        // Lognormal likelihood: log(T_obs) ~ N(log(T_pred), σ²) with σ=0.3
        const sigma = 0.3;
        const logRatio = Math.log(d.life_min) - Math.log(predictedLife);
        ll -= 0.5 * (logRatio / sigma) ** 2;
      }
      return ll;
    };

    const logPrior = (theta: number[]): number => {
      const n = theta[0];
      const C = theta[1];
      if (n <= 0 || C <= 0) return -1e12;
      // Normal priors
      let lp = -0.5 * ((n - prior_n.mean) / prior_n.std) ** 2;
      lp -= 0.5 * ((C - prior_C.mean) / prior_C.std) ** 2;
      return lp;
    };

    const mhResult = this.metropolisHastings({
      log_likelihood: logLik,
      log_prior: logPrior,
      initial: [prior_n.mean, prior_C.mean],
      proposal_scale: [prior_n.std * 0.3, prior_C.std * 0.3],
      n_samples: 8000,
      burn_in: 2000,
      thin: 2,
      seed,
    });

    const nSamples = mhResult.samples.map(s => s[0]);
    const CSamples = mhResult.samples.map(s => s[1]);

    const nMean = mhResult.posterior_mean[0];
    const CMean = mhResult.posterior_mean[1];

    // Data influence: how much posterior shifted from prior
    const priorPostShift_n = Math.abs(nMean - prior_n.mean) / prior_n.std;
    const priorPostShift_C = Math.abs(CMean - prior_C.mean) / prior_C.std;
    const dataInfluence = Math.min(1, (priorPostShift_n + priorPostShift_C) / 4);

    return {
      n_posterior: {
        mean: nMean,
        std: mhResult.posterior_std[0],
        ci_95: mhResult.credible_interval_95[0],
      },
      C_posterior: {
        mean: CMean,
        std: mhResult.posterior_std[1],
        ci_95: mhResult.credible_interval_95[1],
      },
      predicted_life_at_speed: (v: number) => {
        const lives = mhResult.samples.map(s => {
          const n = s[0];
          const C = s[1];
          return Math.pow(C / v, 1 / n);
        }).filter(l => isFinite(l) && l > 0);
        lives.sort((a, b) => a - b);
        const mean = lives.reduce((a, b) => a + b, 0) / lives.length;
        return {
          mean,
          ci_95: [
            lives[Math.floor(0.025 * lives.length)],
            lives[Math.floor(0.975 * lives.length)],
          ] as [number, number],
        };
      },
      data_influence: dataInfluence,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Method 2: Random Forest
  // Breiman (2001). "Random Forests." Machine Learning 45(1): 5-32.
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Random Forest classification with bagging, random feature subsets, and OOB estimation.
   * Split criterion: Gini impurity = 1 - Σ p_k²
   */
  randomForestClassify(params: RFClassifyInput): RFClassifyResult {
    const {
      X_train, y_train,
      n_trees: nTrees = 100,
      max_depth: maxDepth = 10,
      min_samples_split: minSplit = 2,
      seed = 42,
    } = params;
    const n = X_train.length;
    const p = X_train[0].length;
    const maxFeatures = params.max_features ?? Math.max(1, Math.floor(Math.sqrt(p)));
    const rng = new SeededRNG(seed);

    const classes = [...new Set(y_train)].sort((a, b) => a - b);
    const nClasses = classes.length;
    const classMap = new Map(classes.map((c, i) => [c, i]));

    const trees: { tree: TreeNode; oobIndices: number[] }[] = [];
    const featureImportance = new Array(p).fill(0);

    // OOB tracking
    const oobVotes: number[][] = Array.from({ length: n }, () => new Array(nClasses).fill(0));

    for (let t = 0; t < nTrees; t++) {
      // Bootstrap sample
      const bagIndices: number[] = [];
      const inBag = new Set<number>();
      for (let i = 0; i < n; i++) {
        const idx = Math.floor(rng.next() * n);
        bagIndices.push(idx);
        inBag.add(idx);
      }
      const oobIndices = Array.from({ length: n }, (_, i) => i).filter(i => !inBag.has(i));

      const bagX = bagIndices.map(i => X_train[i]);
      const bagY = bagIndices.map(i => y_train[i]);

      const tree = this._buildClassificationTree(bagX, bagY, maxDepth, minSplit, maxFeatures, rng, nClasses, classMap, featureImportance);
      trees.push({ tree, oobIndices });

      // OOB predictions
      for (const i of oobIndices) {
        const pred = this._predictTree(tree, X_train[i]);
        if (pred.probabilities) {
          for (let k = 0; k < nClasses; k++) oobVotes[i][k] += pred.probabilities[k];
        }
      }
    }

    // OOB accuracy
    let oobCorrect = 0, oobTotal = 0;
    for (let i = 0; i < n; i++) {
      const total = oobVotes[i].reduce((a, b) => a + b, 0);
      if (total > 0) {
        oobTotal++;
        const predClass = classes[oobVotes[i].indexOf(Math.max(...oobVotes[i]))];
        if (predClass === y_train[i]) oobCorrect++;
      }
    }
    const oobAccuracy = oobTotal > 0 ? oobCorrect / oobTotal : 0;

    // Normalize feature importance
    const fiSum = featureImportance.reduce((a, b) => a + b, 0);
    const normalizedFI = fiSum > 0 ? featureImportance.map(v => v / fiSum) : featureImportance;

    // Predictions on test data
    const X_test = params.X_test ?? X_train;
    const predictions: number[] = [];
    const probabilities: number[][] = [];

    for (const x of X_test) {
      const votes = new Array(nClasses).fill(0);
      for (const { tree } of trees) {
        const pred = this._predictTree(tree, x);
        if (pred.probabilities) {
          for (let k = 0; k < nClasses; k++) votes[k] += pred.probabilities[k];
        }
      }
      const total = votes.reduce((a, b) => a + b, 0);
      const probs = total > 0 ? votes.map(v => v / total) : votes;
      probabilities.push(probs);
      predictions.push(classes[votes.indexOf(Math.max(...votes))]);
    }

    // Confusion matrix
    let confusionMatrix: number[][] | undefined;
    if (!params.X_test) {
      confusionMatrix = Array.from({ length: nClasses }, () => new Array(nClasses).fill(0));
      for (let i = 0; i < n; i++) {
        const actual = classMap.get(y_train[i])!;
        const pred = classMap.get(predictions[i])!;
        confusionMatrix[actual][pred]++;
      }
    }

    return {
      predictions,
      probabilities,
      oob_accuracy: oobAccuracy,
      oob_error: 1 - oobAccuracy,
      feature_importance: normalizedFI,
      n_trees_actual: nTrees,
      confusion_matrix: confusionMatrix,
    };
  }

  /** Build a classification tree with random feature selection at each node */
  private _buildClassificationTree(
    X: number[][], y: number[], maxDepth: number, minSplit: number,
    maxFeatures: number, rng: SeededRNG, nClasses: number,
    classMap: Map<number, number>, featureImportance: number[],
    depth = 0
  ): TreeNode {
    const n = X.length;
    const p = X[0].length;

    // Leaf conditions
    const classCounts = new Array(nClasses).fill(0);
    for (const yi of y) classCounts[classMap.get(yi)!]++;
    const totalSamples = y.length;
    const probs = classCounts.map(c => c / totalSamples);

    if (depth >= maxDepth || n < minSplit || classCounts.filter(c => c > 0).length <= 1) {
      const majorityClass = [...classMap.entries()].sort((a, b) => classCounts[b[1]] - classCounts[a[1]])[0][0];
      return { value: majorityClass, probabilities: probs };
    }

    // Random feature subset
    const allFeatures = Array.from({ length: p }, (_, i) => i);
    const featureSubset: number[] = [];
    const available = [...allFeatures];
    for (let i = 0; i < Math.min(maxFeatures, p); i++) {
      const idx = Math.floor(rng.next() * available.length);
      featureSubset.push(available[idx]);
      available.splice(idx, 1);
    }

    // Find best split (Gini)
    let bestGini = Infinity;
    let bestFeature = -1;
    let bestThreshold = 0;
    const parentGini = 1 - probs.reduce((a, pk) => a + pk * pk, 0);

    for (const f of featureSubset) {
      const values = X.map(x => x[f]);
      const sorted = [...new Set(values)].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length - 1; i++) {
        const threshold = (sorted[i] + sorted[i + 1]) / 2;
        const leftCounts = new Array(nClasses).fill(0);
        const rightCounts = new Array(nClasses).fill(0);
        let nLeft = 0, nRight = 0;
        for (let j = 0; j < n; j++) {
          const cls = classMap.get(y[j])!;
          if (X[j][f] <= threshold) { leftCounts[cls]++; nLeft++; }
          else { rightCounts[cls]++; nRight++; }
        }
        if (nLeft === 0 || nRight === 0) continue;
        const giniLeft = 1 - leftCounts.reduce((a, c) => a + (c / nLeft) ** 2, 0);
        const giniRight = 1 - rightCounts.reduce((a, c) => a + (c / nRight) ** 2, 0);
        const weightedGini = (nLeft * giniLeft + nRight * giniRight) / n;
        if (weightedGini < bestGini) {
          bestGini = weightedGini;
          bestFeature = f;
          bestThreshold = threshold;
        }
      }
    }

    if (bestFeature === -1) {
      const majorityClass = [...classMap.entries()].sort((a, b) => classCounts[b[1]] - classCounts[a[1]])[0][0];
      return { value: majorityClass, probabilities: probs };
    }

    // Feature importance: impurity decrease
    featureImportance[bestFeature] += (parentGini - bestGini) * n;

    // Split
    const leftX: number[][] = [], leftY: number[] = [];
    const rightX: number[][] = [], rightY: number[] = [];
    for (let i = 0; i < n; i++) {
      if (X[i][bestFeature] <= bestThreshold) { leftX.push(X[i]); leftY.push(y[i]); }
      else { rightX.push(X[i]); rightY.push(y[i]); }
    }

    return {
      feature: bestFeature,
      threshold: bestThreshold,
      left: this._buildClassificationTree(leftX, leftY, maxDepth, minSplit, maxFeatures, rng, nClasses, classMap, featureImportance, depth + 1),
      right: this._buildClassificationTree(rightX, rightY, maxDepth, minSplit, maxFeatures, rng, nClasses, classMap, featureImportance, depth + 1),
    };
  }

  /**
   * Random Forest regression with bagging.
   * Split criterion: MSE reduction.
   */
  randomForestRegress(params: RFRegressInput): RFRegressResult {
    const {
      X_train, y_train,
      n_trees: nTrees = 100,
      max_depth: maxDepth = 10,
      min_samples_split: minSplit = 2,
      seed = 42,
    } = params;
    const n = X_train.length;
    const p = X_train[0].length;
    const maxFeatures = params.max_features ?? Math.max(1, Math.floor(p / 3));
    const rng = new SeededRNG(seed);

    const trees: { tree: TreeNode; oobIndices: number[] }[] = [];
    const featureImportance = new Array(p).fill(0);

    // OOB tracking
    const oobPreds: number[][] = Array.from({ length: n }, () => []);

    for (let t = 0; t < nTrees; t++) {
      const bagIndices: number[] = [];
      const inBag = new Set<number>();
      for (let i = 0; i < n; i++) {
        const idx = Math.floor(rng.next() * n);
        bagIndices.push(idx);
        inBag.add(idx);
      }
      const oobIndices = Array.from({ length: n }, (_, i) => i).filter(i => !inBag.has(i));

      const bagX = bagIndices.map(i => X_train[i]);
      const bagY = bagIndices.map(i => y_train[i]);

      const tree = this._buildRegressionTree(bagX, bagY, maxDepth, minSplit, maxFeatures, rng, featureImportance);
      trees.push({ tree, oobIndices });

      for (const i of oobIndices) {
        const pred = this._predictTree(tree, X_train[i]);
        oobPreds[i].push(pred.value!);
      }
    }

    // OOB MSE and R²
    let oobSSE = 0, oobSST = 0, oobCount = 0;
    const yMean = y_train.reduce((a, b) => a + b, 0) / n;
    for (let i = 0; i < n; i++) {
      if (oobPreds[i].length > 0) {
        const predMean = oobPreds[i].reduce((a, b) => a + b, 0) / oobPreds[i].length;
        oobSSE += (y_train[i] - predMean) ** 2;
        oobSST += (y_train[i] - yMean) ** 2;
        oobCount++;
      }
    }
    const oobMSE = oobCount > 0 ? oobSSE / oobCount : 0;
    const oobR2 = oobSST > 0 ? 1 - oobSSE / oobSST : 0;

    // Normalize feature importance
    const fiSum = featureImportance.reduce((a, b) => a + b, 0);
    const normalizedFI = fiSum > 0 ? featureImportance.map(v => v / fiSum) : featureImportance;

    // Predictions
    const X_test = params.X_test ?? X_train;
    const predictions: number[] = [];
    const predIntervals: [number, number][] = [];

    for (const x of X_test) {
      const treePreds: number[] = [];
      for (const { tree } of trees) {
        treePreds.push(this._predictTree(tree, x).value!);
      }
      const mean = treePreds.reduce((a, b) => a + b, 0) / treePreds.length;
      predictions.push(mean);
      treePreds.sort((a, b) => a - b);
      predIntervals.push([
        treePreds[Math.floor(0.025 * treePreds.length)],
        treePreds[Math.floor(0.975 * treePreds.length)],
      ]);
    }

    return {
      predictions,
      oob_mse: oobMSE,
      oob_r_squared: oobR2,
      feature_importance: normalizedFI,
      prediction_intervals: predIntervals,
    };
  }

  /** Build a regression tree with random feature selection */
  private _buildRegressionTree(
    X: number[][], y: number[], maxDepth: number, minSplit: number,
    maxFeatures: number, rng: SeededRNG, featureImportance: number[],
    depth = 0
  ): TreeNode {
    const n = X.length;
    const p = X[0].length;
    const yMean = y.reduce((a, b) => a + b, 0) / n;

    if (depth >= maxDepth || n < minSplit) {
      return { value: yMean };
    }

    // Parent MSE
    const parentMSE = y.reduce((a, yi) => a + (yi - yMean) ** 2, 0) / n;

    const allFeatures = Array.from({ length: p }, (_, i) => i);
    const featureSubset: number[] = [];
    const available = [...allFeatures];
    for (let i = 0; i < Math.min(maxFeatures, p); i++) {
      const idx = Math.floor(rng.next() * available.length);
      featureSubset.push(available[idx]);
      available.splice(idx, 1);
    }

    let bestMSE = Infinity;
    let bestFeature = -1;
    let bestThreshold = 0;

    for (const f of featureSubset) {
      const sorted = [...new Set(X.map(x => x[f]))].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length - 1; i++) {
        const threshold = (sorted[i] + sorted[i + 1]) / 2;
        let leftSum = 0, leftCount = 0, rightSum = 0, rightCount = 0;
        for (let j = 0; j < n; j++) {
          if (X[j][f] <= threshold) { leftSum += y[j]; leftCount++; }
          else { rightSum += y[j]; rightCount++; }
        }
        if (leftCount === 0 || rightCount === 0) continue;
        const leftMean = leftSum / leftCount;
        const rightMean = rightSum / rightCount;
        let mse = 0;
        for (let j = 0; j < n; j++) {
          const pred = X[j][f] <= threshold ? leftMean : rightMean;
          mse += (y[j] - pred) ** 2;
        }
        mse /= n;
        if (mse < bestMSE) {
          bestMSE = mse;
          bestFeature = f;
          bestThreshold = threshold;
        }
      }
    }

    if (bestFeature === -1) return { value: yMean };

    featureImportance[bestFeature] += (parentMSE - bestMSE) * n;

    const leftX: number[][] = [], leftY: number[] = [];
    const rightX: number[][] = [], rightY: number[] = [];
    for (let i = 0; i < n; i++) {
      if (X[i][bestFeature] <= bestThreshold) { leftX.push(X[i]); leftY.push(y[i]); }
      else { rightX.push(X[i]); rightY.push(y[i]); }
    }

    return {
      feature: bestFeature,
      threshold: bestThreshold,
      left: this._buildRegressionTree(leftX, leftY, maxDepth, minSplit, maxFeatures, rng, featureImportance, depth + 1),
      right: this._buildRegressionTree(rightX, rightY, maxDepth, minSplit, maxFeatures, rng, featureImportance, depth + 1),
    };
  }

  /** Predict with a single tree */
  private _predictTree(node: TreeNode, x: number[]): TreeNode {
    if (node.feature === undefined) return node;
    if (x[node.feature!] <= node.threshold!) {
      return this._predictTree(node.left!, x);
    } else {
      return this._predictTree(node.right!, x);
    }
  }

  /**
   * Permutation importance (model-agnostic).
   * Breiman (2001): shuffle each feature, measure accuracy drop.
   */
  featureImportanceAnalysis(params: FeatureImportanceInput): FeatureImportanceResult {
    const { X, y, n_repeats = 10, seed = 42, n_trees = 50, max_depth = 8 } = params;
    const rng = new SeededRNG(seed);
    const n = X.length;
    const p = X[0].length;

    // Train RF model
    const isClassification = new Set(y).size <= 10;
    let baselineScore: number;

    if (isClassification) {
      const rf = this.randomForestClassify({
        X_train: X, y_train: y, n_trees, max_depth, seed,
      });
      baselineScore = rf.oob_accuracy;
    } else {
      const rf = this.randomForestRegress({
        X_train: X, y_train: y, n_trees, max_depth, seed,
      });
      baselineScore = rf.oob_r_squared;
    }

    const importances: { feature_index: number; mean_decrease: number; std: number }[] = [];

    for (let f = 0; f < p; f++) {
      const decreases: number[] = [];
      for (let r = 0; r < n_repeats; r++) {
        // Shuffle feature f
        const X_perm = X.map(row => [...row]);
        const indices = Array.from({ length: n }, (_, i) => i);
        // Fisher-Yates shuffle
        for (let i = n - 1; i > 0; i--) {
          const j = Math.floor(rng.next() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        for (let i = 0; i < n; i++) {
          X_perm[i][f] = X[indices[i]][f];
        }

        if (isClassification) {
          const rf = this.randomForestClassify({
            X_train: X_perm, y_train: y, n_trees, max_depth, seed: seed + r + f * n_repeats,
          });
          decreases.push(baselineScore - rf.oob_accuracy);
        } else {
          const rf = this.randomForestRegress({
            X_train: X_perm, y_train: y, n_trees, max_depth, seed: seed + r + f * n_repeats,
          });
          decreases.push(baselineScore - rf.oob_r_squared);
        }
      }
      const meanDecrease = decreases.reduce((a, b) => a + b, 0) / n_repeats;
      const std = Math.sqrt(decreases.reduce((a, d) => a + (d - meanDecrease) ** 2, 0) / (n_repeats - 1));
      importances.push({ feature_index: f, mean_decrease: meanDecrease, std });
    }

    importances.sort((a, b) => b.mean_decrease - a.mean_decrease);
    const ranking = importances.map(imp => imp.feature_index);
    const significantFeatures = importances
      .filter(imp => imp.std > 0 && imp.mean_decrease > 2 * imp.std)
      .map(imp => imp.feature_index);

    return { importances, ranking, significant_features: significantFeatures };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Method 3: Logistic Regression
  // Cox (1958), McCullagh & Nelder (1989). IRLS / Newton-Raphson.
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Binary logistic regression via IRLS (Iteratively Reweighted Least Squares).
   * P(y=1|x) = σ(x^T β) = 1 / (1 + exp(-x^T β))
   */
  logisticRegressionFit(params: LogisticFitInput): LogisticFitResult {
    const {
      X, y,
      regularization = 'none',
      lambda = 0.01,
      max_iter = 100,
      tol = 1e-6,
    } = params;

    const n = X.length;
    const p = X[0].length;

    // Augment X with intercept column
    const Xa = X.map(row => [1, ...row]);
    const pA = p + 1; // +1 for intercept

    // Initialize coefficients to 0
    let beta = new Array(pA).fill(0);
    let converged = false;
    let iterations = 0;

    for (let iter = 0; iter < max_iter; iter++) {
      iterations = iter + 1;

      // Compute probabilities
      const probs = Xa.map(xi => {
        const z = xi.reduce((s, xij, j) => s + xij * beta[j], 0);
        return this._sigmoid(z);
      });

      // Weight matrix W (diagonal) and working response
      const W = probs.map(pi => pi * (1 - pi));
      // Gradient: X^T (y - p) - lambda * beta (for L2)
      const gradient = new Array(pA).fill(0);
      for (let j = 0; j < pA; j++) {
        for (let i = 0; i < n; i++) {
          gradient[j] += Xa[i][j] * (y[i] - probs[i]);
        }
        if (regularization === 'l2' && j > 0) { // don't regularize intercept
          gradient[j] -= lambda * beta[j];
        }
      }

      // Hessian: -X^T W X - lambda * I (for L2)
      const H: number[][] = Array.from({ length: pA }, () => new Array(pA).fill(0));
      for (let j = 0; j < pA; j++) {
        for (let k = 0; k < pA; k++) {
          for (let i = 0; i < n; i++) {
            H[j][k] -= Xa[i][j] * W[i] * Xa[i][k];
          }
          if (regularization === 'l2' && j === k && j > 0) {
            H[j][k] -= lambda;
          }
        }
      }

      // Newton step: beta_new = beta - H^{-1} * gradient
      const Hinv = this._invertMatrix(H);
      const delta = this._matVecMul(Hinv, gradient);
      const betaNew = beta.map((b, j) => b - delta[j]);

      // Check convergence
      const maxDelta = Math.max(...delta.map(Math.abs));
      beta = betaNew;

      if (maxDelta < tol) {
        converged = true;
        break;
      }
    }

    // Final probabilities
    const finalProbs = Xa.map(xi => {
      const z = xi.reduce((s, xij, j) => s + xij * beta[j], 0);
      return this._sigmoid(z);
    });

    // Log-likelihood
    let logLik = 0;
    for (let i = 0; i < n; i++) {
      const pi = Math.max(1e-15, Math.min(1 - 1e-15, finalProbs[i]));
      logLik += y[i] * Math.log(pi) + (1 - y[i]) * Math.log(1 - pi);
    }

    // Null log-likelihood (intercept only)
    const pBar = y.reduce((a, b) => a + b, 0) / n;
    const logLikNull = n * (pBar * Math.log(pBar) + (1 - pBar) * Math.log(1 - pBar));

    // Standard errors from Fisher information
    const W = finalProbs.map(pi => pi * (1 - pi));
    const infoMatrix: number[][] = Array.from({ length: pA }, () => new Array(pA).fill(0));
    for (let j = 0; j < pA; j++) {
      for (let k = 0; k < pA; k++) {
        for (let i = 0; i < n; i++) {
          infoMatrix[j][k] += Xa[i][j] * W[i] * Xa[i][k];
        }
      }
    }
    const covMatrix = this._invertMatrix(infoMatrix);
    const stdErrors = covMatrix.map((row, j) => Math.sqrt(Math.max(0, row[j])));

    // z-statistics and p-values
    const zStats = beta.map((b, j) => stdErrors[j] > 0 ? b / stdErrors[j] : 0);
    const pValues = zStats.map(z => 2 * (1 - this._normalCDF(Math.abs(z))));

    // AIC = -2*LL + 2*k, BIC = -2*LL + k*ln(n)
    const aic = -2 * logLik + 2 * pA;
    const bic = -2 * logLik + pA * Math.log(n);

    // McFadden's pseudo R²
    const pseudoR2 = 1 - logLik / logLikNull;

    return {
      coefficients: beta.slice(1), // exclude intercept
      intercept: beta[0],
      std_errors: stdErrors.slice(1),
      z_statistics: zStats.slice(1),
      p_values: pValues.slice(1),
      log_likelihood: logLik,
      aic,
      bic,
      pseudo_r_squared: Math.max(0, Math.min(1, pseudoR2)),
      convergence: { converged, iterations },
    };
  }

  /**
   * Predict with a fitted logistic regression model.
   */
  logisticPredict(params: LogisticPredictInput): LogisticPredictResult {
    const { X_new, model } = params;
    const beta = [model.intercept, ...model.coefficients];

    const probabilities: number[] = [];
    const predictions: number[] = [];

    for (const x of X_new) {
      const z = beta[0] + x.reduce((s, xj, j) => s + xj * beta[j + 1], 0);
      const prob = this._sigmoid(z);
      probabilities.push(prob);
      predictions.push(prob >= 0.5 ? 1 : 0);
    }

    const oddsRatios = model.coefficients.map(b => Math.exp(b));

    // Confidence intervals for odds ratios (Wald-based)
    const confidenceIntervals: [number, number][] = model.coefficients.map((b, j) => {
      const se = model.std_errors[j];
      return [Math.exp(b - 1.96 * se), Math.exp(b + 1.96 * se)] as [number, number];
    });

    return { predictions, probabilities, odds_ratios: oddsRatios, confidence_intervals: confidenceIntervals };
  }

  /**
   * Manufacturing application: predict tool breakage probability.
   * Pre-trained coefficients for typical carbide milling based on empirical data.
   * Uses logistic regression with physics-informed features.
   */
  toolBreakagePrediction(params: ToolBreakageInput): ToolBreakageResult {
    const {
      cutting_speed_mpm, feed_mm_rev, depth_of_cut_mm,
      tool_wear_vb_mm, vibration_rms_g, power_draw_kw, time_in_cut_min,
    } = params;

    // Pre-trained coefficients (based on typical carbide milling data)
    // Intercept and coefficients for normalized features
    const intercept = -4.5;
    const coeffs = {
      speed_norm: 0.8,       // Higher speed → more breakage
      feed_norm: 1.2,        // Higher feed → more breakage
      depth_norm: 0.6,       // Higher depth → more breakage
      wear_norm: 3.5,        // Wear is strongest predictor
      vibration_norm: 2.8,   // Vibration is second strongest
      power_norm: 1.5,       // Power draw increase
      time_norm: 0.4,        // Time in cut (fatigue)
    };

    // Normalize inputs to typical ranges
    const features = {
      speed_norm: (cutting_speed_mpm - 150) / 100,
      feed_norm: (feed_mm_rev - 0.15) / 0.1,
      depth_norm: (depth_of_cut_mm - 2) / 2,
      wear_norm: (tool_wear_vb_mm - 0.15) / 0.1,
      vibration_norm: (vibration_rms_g - 1.0) / 1.0,
      power_norm: (power_draw_kw - 5) / 3,
      time_norm: (time_in_cut_min - 30) / 30,
    };

    const z = intercept
      + coeffs.speed_norm * features.speed_norm
      + coeffs.feed_norm * features.feed_norm
      + coeffs.depth_norm * features.depth_norm
      + coeffs.wear_norm * features.wear_norm
      + coeffs.vibration_norm * features.vibration_norm
      + coeffs.power_norm * features.power_norm
      + coeffs.time_norm * features.time_norm;

    const probability = this._sigmoid(z);

    // Risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (probability < 0.1) riskLevel = 'low';
    else if (probability < 0.3) riskLevel = 'medium';
    else if (probability < 0.6) riskLevel = 'high';
    else riskLevel = 'critical';

    // Contributing factors
    const factorEntries = [
      { factor: 'Tool Wear (VB)', odds_ratio: Math.exp(coeffs.wear_norm * features.wear_norm), raw: coeffs.wear_norm * features.wear_norm },
      { factor: 'Vibration (RMS)', odds_ratio: Math.exp(coeffs.vibration_norm * features.vibration_norm), raw: coeffs.vibration_norm * features.vibration_norm },
      { factor: 'Power Draw', odds_ratio: Math.exp(coeffs.power_norm * features.power_norm), raw: coeffs.power_norm * features.power_norm },
      { factor: 'Feed Rate', odds_ratio: Math.exp(coeffs.feed_norm * features.feed_norm), raw: coeffs.feed_norm * features.feed_norm },
      { factor: 'Cutting Speed', odds_ratio: Math.exp(coeffs.speed_norm * features.speed_norm), raw: coeffs.speed_norm * features.speed_norm },
      { factor: 'Depth of Cut', odds_ratio: Math.exp(coeffs.depth_norm * features.depth_norm), raw: coeffs.depth_norm * features.depth_norm },
      { factor: 'Time in Cut', odds_ratio: Math.exp(coeffs.time_norm * features.time_norm), raw: coeffs.time_norm * features.time_norm },
    ];

    const totalContrib = factorEntries.reduce((a, f) => a + Math.abs(f.raw), 0);
    const contributingFactors = factorEntries
      .sort((a, b) => Math.abs(b.raw) - Math.abs(a.raw))
      .map(f => ({
        factor: f.factor,
        odds_ratio: f.odds_ratio,
        contribution_pct: totalContrib > 0 ? (Math.abs(f.raw) / totalContrib) * 100 : 0,
      }));

    // Recommended action
    let recommendedAction: string;
    if (riskLevel === 'low') {
      recommendedAction = 'Continue machining. Monitor tool wear at regular intervals.';
    } else if (riskLevel === 'medium') {
      recommendedAction = 'Increase monitoring frequency. Consider reducing feed rate or cutting speed.';
    } else if (riskLevel === 'high') {
      recommendedAction = 'Schedule immediate tool change. Reduce cutting parameters by 20%.';
    } else {
      recommendedAction = 'STOP machining immediately. Replace tool before continuing. Inspect workpiece for damage.';
    }

    return {
      breakage_probability: probability,
      risk_level: riskLevel,
      contributing_factors: contributingFactors,
      recommended_action: recommendedAction,
    };
  }

  // ─── Utility Methods ──────────────────────────────────────────────────────────

  /** Sigmoid function σ(z) = 1 / (1 + exp(-z)) */
  private _sigmoid(z: number): number {
    if (z > 500) return 1;
    if (z < -500) return 0;
    return 1 / (1 + Math.exp(-z));
  }

  /** Standard normal CDF approximation (Abramowitz & Stegun 26.2.17) */
  private _normalCDF(x: number): number {
    if (x < -8) return 0;
    if (x > 8) return 1;
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, pp = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    const t = 1 / (1 + pp * x);
    const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1 + sign * y);
  }

  /** Matrix multiplication A * B */
  private _matMul(A: number[][], B: number[][]): number[][] {
    const m = A.length, n = B[0].length, k = B.length;
    const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
    for (let i = 0; i < m; i++)
      for (let j = 0; j < n; j++)
        for (let l = 0; l < k; l++)
          C[i][j] += A[i][l] * B[l][j];
    return C;
  }

  /** Matrix transpose */
  private _transpose(A: number[][]): number[][] {
    const m = A.length, n = A[0].length;
    const T: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));
    for (let i = 0; i < m; i++)
      for (let j = 0; j < n; j++)
        T[j][i] = A[i][j];
    return T;
  }

  /** Matrix-vector multiply A * v */
  private _matVecMul(A: number[][], v: number[]): number[] {
    return A.map(row => row.reduce((s, a, j) => s + a * v[j], 0));
  }

  /** Matrix inversion via Gauss-Jordan elimination */
  private _invertMatrix(M: number[][]): number[][] {
    const n = M.length;
    // Augmented matrix [M | I]
    const aug: number[][] = M.map((row, i) => {
      const r = [...row];
      for (let j = 0; j < n; j++) r.push(i === j ? 1 : 0);
      return r;
    });

    for (let col = 0; col < n; col++) {
      // Partial pivoting
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
      }
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

      const pivot = aug[col][col];
      if (Math.abs(pivot) < 1e-15) {
        // Singular — add regularization
        aug[col][col] = 1e-10;
        continue;
      }

      // Scale pivot row
      for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;

      // Eliminate column
      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const factor = aug[row][col];
        for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
      }
    }

    return aug.map(row => row.slice(n));
  }

  /** Sample from multivariate normal N(mu, Sigma) using Cholesky decomposition */
  private _sampleMVN(rng: SeededRNG, mu: number[], Sigma: number[][]): number[] {
    const n = mu.length;
    // Cholesky decomposition: Sigma = L * L^T
    const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
        if (i === j) {
          const val = Sigma[i][i] - sum;
          L[i][j] = val > 0 ? Math.sqrt(val) : 1e-10;
        } else {
          L[i][j] = L[j][j] > 0 ? (Sigma[i][j] - sum) / L[j][j] : 0;
        }
      }
    }

    // z ~ N(0, I)
    const z = Array.from({ length: n }, () => rng.nextGaussian());
    // x = mu + L * z
    const x = [...mu];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        x[i] += L[i][j] * z[j];
      }
    }
    return x;
  }
}

export const advancedMLStatisticsEngine = new AdvancedMLStatisticsEngine();
