/**
 * PRISM MCP Server — Stochastic Tool Life Engine
 *
 * Comprehensive stochastic tool life prediction combining:
 * - Extended Taylor equation with scatter (Monte Carlo)
 * - Weibull life distribution fitting (MLE on MC samples)
 * - Wiener process wear model (drift-diffusion first-passage)
 * - Bayesian updating with observed wear data (conjugate Gamma)
 * - Optimal age replacement policy (cost minimization)
 *
 * References:
 *   Taylor (1907) tool life equation
 *   Weibull (1951) fatigue life distribution
 *   Kannatey-Asibu (1985) stochastic tool life
 *   Lin & Ghosh (2006) Wiener process wear modeling
 *   Jardine & Tsang (2013) maintenance optimization Ch. 5
 *
 * @module StochasticToolLifeEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// INTERFACES
// ============================================================================

/** Standard PRISM atomic return wrapper */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

/** Observed wear measurement for Bayesian updating */
export interface WearObservation {
  time_min: number;
  vb_mm: number;
}

/** Engine input */
export interface StochasticToolLifeInput {
  material: string;
  cutting_speed_mpm: number;
  feed_mm: number;
  depth_mm: number;
  tool_material?: "carbide" | "ceramic" | "cbn" | "hss";
  coating?: "TiAlN" | "TiN" | "AlCrN" | "uncoated" | "diamond";
  wear_limit_mm?: number;
  n_trials?: number;
  observed_wear?: WearObservation[];
  target_time_min?: number;
  method?: "weibull" | "wiener" | "bayesian" | "all";
}

/** Weibull distribution result */
export interface WeibullResult {
  beta: number;
  eta_min: number;
  mean_min: number;
  std_dev_min: number;
  median_min: number;
}

/** Wiener process result */
export interface WienerResult {
  mean_life_min: number;
  std_dev_min: number;
  ci_95: [number, number];
}

/** Bayesian update result */
export interface BayesianResult {
  prior_mean: number;
  posterior_mean: number;
  posterior_std: number;
  ci_95: [number, number];
  remaining_life_min: number;
}

/** Reliability at a given time */
export interface ReliabilityPoint {
  time_min: number;
  p_survive: number;
}

/** Full engine output */
export interface StochasticToolLifeResult {
  taylor_life_min: number;
  weibull: WeibullResult | null;
  wiener: WienerResult | null;
  bayesian: BayesianResult | null;
  reliability: ReliabilityPoint[];
  p_survive_target: number | null;
  optimal_replacement_min: number;
  cost_ratio: number;
  hazard_at_taylor: number;
  dominant_uncertainty: string;
}

// ============================================================================
// TAYLOR CONSTANTS DATABASE
// ============================================================================

/**
 * Taylor constant database: C (m/min), n (exponent), feed exponent p,
 * depth exponent q, Weibull shape β, CV% for C and n.
 */
interface TaylorEntry {
  C: number;
  n: number;
  p: number;
  q: number;
  beta: number;
  cv_C: number;
  cv_n: number;
}

type CoatingKey = "TiAlN" | "TiN" | "AlCrN" | "uncoated" | "diamond";
type ToolKey = "carbide" | "ceramic" | "cbn" | "hss";

/** Coating multipliers on Taylor C */
const COATING_MULT: Record<CoatingKey, number> = {
  TiAlN: 1.0,
  TiN: 0.85,
  AlCrN: 1.05,
  uncoated: 0.65,
  diamond: 1.40,
};

/** Base Taylor constants per material × tool material */
const TAYLOR_DB: Record<string, Partial<Record<ToolKey, TaylorEntry>>> = {
  "Ti-6Al-4V": {
    carbide:  { C: 120, n: 0.20, p: 0.30, q: 0.15, beta: 2.5, cv_C: 0.22, cv_n: 0.12 },
    ceramic:  { C: 180, n: 0.25, p: 0.28, q: 0.12, beta: 2.2, cv_C: 0.25, cv_n: 0.14 },
    cbn:      { C: 250, n: 0.30, p: 0.25, q: 0.10, beta: 2.8, cv_C: 0.20, cv_n: 0.11 },
    hss:      { C:  45, n: 0.12, p: 0.35, q: 0.18, beta: 2.0, cv_C: 0.22, cv_n: 0.13 },
  },
  "AISI 4140": {
    carbide:  { C: 250, n: 0.25, p: 0.28, q: 0.12, beta: 3.0, cv_C: 0.18, cv_n: 0.10 },
    ceramic:  { C: 400, n: 0.30, p: 0.25, q: 0.10, beta: 2.8, cv_C: 0.20, cv_n: 0.12 },
    cbn:      { C: 550, n: 0.35, p: 0.22, q: 0.08, beta: 3.2, cv_C: 0.17, cv_n: 0.10 },
    hss:      { C:  80, n: 0.15, p: 0.32, q: 0.15, beta: 2.5, cv_C: 0.20, cv_n: 0.12 },
  },
  "Al 7075-T6": {
    carbide:  { C: 900, n: 0.40, p: 0.20, q: 0.08, beta: 3.5, cv_C: 0.15, cv_n: 0.10 },
    ceramic:  { C: 600, n: 0.35, p: 0.22, q: 0.10, beta: 3.0, cv_C: 0.18, cv_n: 0.11 },
    cbn:      { C: 450, n: 0.30, p: 0.25, q: 0.12, beta: 3.2, cv_C: 0.16, cv_n: 0.10 },
    hss:      { C: 350, n: 0.30, p: 0.25, q: 0.10, beta: 3.0, cv_C: 0.17, cv_n: 0.11 },
  },
  "Inconel 718": {
    carbide:  { C:  80, n: 0.18, p: 0.32, q: 0.18, beta: 2.2, cv_C: 0.25, cv_n: 0.14 },
    ceramic:  { C: 150, n: 0.22, p: 0.30, q: 0.15, beta: 2.0, cv_C: 0.25, cv_n: 0.15 },
    cbn:      { C: 200, n: 0.28, p: 0.27, q: 0.12, beta: 2.5, cv_C: 0.22, cv_n: 0.13 },
    hss:      { C:  30, n: 0.10, p: 0.38, q: 0.20, beta: 1.8, cv_C: 0.25, cv_n: 0.15 },
  },
  "AISI 316L": {
    carbide:  { C: 200, n: 0.22, p: 0.28, q: 0.14, beta: 2.8, cv_C: 0.20, cv_n: 0.11 },
    ceramic:  { C: 320, n: 0.28, p: 0.25, q: 0.12, beta: 2.5, cv_C: 0.22, cv_n: 0.12 },
    cbn:      { C: 420, n: 0.32, p: 0.23, q: 0.10, beta: 3.0, cv_C: 0.18, cv_n: 0.10 },
    hss:      { C:  65, n: 0.14, p: 0.33, q: 0.16, beta: 2.3, cv_C: 0.22, cv_n: 0.13 },
  },
  "AISI 1045": {
    carbide:  { C: 300, n: 0.28, p: 0.26, q: 0.11, beta: 3.2, cv_C: 0.16, cv_n: 0.10 },
    ceramic:  { C: 480, n: 0.32, p: 0.23, q: 0.09, beta: 3.0, cv_C: 0.18, cv_n: 0.11 },
    cbn:      { C: 600, n: 0.38, p: 0.20, q: 0.08, beta: 3.5, cv_C: 0.15, cv_n: 0.09 },
    hss:      { C: 100, n: 0.18, p: 0.30, q: 0.14, beta: 2.8, cv_C: 0.18, cv_n: 0.11 },
  },
};

// Alias mappings for material name normalization
const MATERIAL_ALIASES: Record<string, string> = {
  "ti64": "Ti-6Al-4V", "ti-6al-4v": "Ti-6Al-4V", "ti6al4v": "Ti-6Al-4V",
  "4140": "AISI 4140", "aisi4140": "AISI 4140", "aisi 4140": "AISI 4140",
  "7075": "Al 7075-T6", "al7075": "Al 7075-T6", "al 7075-t6": "Al 7075-T6",
  "inconel": "Inconel 718", "in718": "Inconel 718", "inconel718": "Inconel 718", "inconel 718": "Inconel 718",
  "316l": "AISI 316L", "aisi316l": "AISI 316L", "aisi 316l": "AISI 316L",
  "1045": "AISI 1045", "aisi1045": "AISI 1045", "aisi 1045": "AISI 1045",
};

// ============================================================================
// MATH UTILITIES
// ============================================================================

/** Box-Muller transform: two uniform → one standard normal */
function randn(): number {
  let u1 = 0, u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/** Gamma function via Lanczos approximation (for Weibull mean/variance) */
function gammaFn(z: number): number {
  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gammaFn(1 - z));
  }
  z -= 1;
  const g = 7;
  const coef = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  let x = coef[0];
  for (let i = 1; i < g + 2; i++) {
    x += coef[i] / (z + i);
  }
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

/** Percentile from sorted array (linear interpolation) */
function percentile(sorted: number[], p: number): number {
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Mean of numeric array */
function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/** Standard deviation (sample) */
function stdDev(arr: number[]): number {
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

// ============================================================================
// CORE ENGINE
// ============================================================================

/**
 * StochasticToolLifeEngine — Weibull + Wiener + Bayesian tool life prediction.
 *
 * Combines Monte Carlo sampling of Taylor constants, Wiener process wear
 * simulation, and Bayesian updating from observed flank wear measurements
 * to produce probabilistic tool life estimates and optimal replacement times.
 *
 * @example
 * ```ts
 * const result = stochasticToolLifeEngine.compute({
 *   material: "Ti-6Al-4V",
 *   cutting_speed_mpm: 60,
 *   feed_mm: 0.15,
 *   depth_mm: 2.0,
 *   method: "all",
 * });
 * console.log(result.value.taylor_life_min);
 * console.log(result.value.weibull?.beta);
 * ```
 */
export class StochasticToolLifeEngine {
  /**
   * Resolve material name to database key, handling aliases and case.
   */
  private resolveMaterial(mat: string): string {
    const key = mat.trim().toLowerCase();
    if (MATERIAL_ALIASES[key]) return MATERIAL_ALIASES[key];
    // Try direct match (case-insensitive)
    for (const dbKey of Object.keys(TAYLOR_DB)) {
      if (dbKey.toLowerCase() === key) return dbKey;
    }
    // Partial match
    for (const dbKey of Object.keys(TAYLOR_DB)) {
      if (dbKey.toLowerCase().includes(key) || key.includes(dbKey.toLowerCase())) return dbKey;
    }
    return "AISI 4140"; // fallback
  }

  /**
   * Get Taylor constants for a material + tool combination.
   */
  private getTaylor(material: string, tool: ToolKey, coating: CoatingKey): TaylorEntry {
    const matKey = this.resolveMaterial(material);
    const matDB = TAYLOR_DB[matKey];
    const entry = matDB?.[tool] ?? TAYLOR_DB["AISI 4140"]!.carbide!;
    const coatMult = COATING_MULT[coating];
    return { ...entry, C: entry.C * coatMult };
  }

  /**
   * Extended Taylor life: T = (C / V^(1/n)) * (f_ref/f)^p * (ap_ref/ap)^q
   *
   * Reference conditions: f_ref = 0.2 mm/rev, ap_ref = 2.0 mm.
   */
  private taylorLife(C: number, n: number, V: number, f: number, ap: number, p: number, q: number): number {
    const f_ref = 0.20;
    const ap_ref = 2.0;
    const baseLife = Math.pow(C / V, 1 / n);
    const feedCorr = Math.pow(f_ref / Math.max(f, 0.01), p);
    const depthCorr = Math.pow(ap_ref / Math.max(ap, 0.1), q);
    return Math.max(baseLife * feedCorr * depthCorr, 0.1);
  }

  /**
   * Monte Carlo Taylor life sampling with scatter on C and n.
   * Returns array of sampled lives in minutes.
   */
  private monteCarloTaylorLives(
    taylor: TaylorEntry, V: number, f: number, ap: number, coating: CoatingKey, N: number
  ): number[] {
    const lives: number[] = [];
    for (let i = 0; i < N; i++) {
      // Sample C and n from lognormal distributions (always positive)
      const C_sample = taylor.C * Math.exp(taylor.cv_C * randn());
      const n_sample = taylor.n * Math.exp(taylor.cv_n * randn());
      const clampedN = Math.max(n_sample, 0.05);
      const life = this.taylorLife(C_sample, clampedN, V, f, ap, taylor.p, taylor.q);
      lives.push(life);
    }
    return lives;
  }

  /**
   * Fit Weibull(β, η) to life samples via MLE (Newton-Raphson on β).
   *
   * MLE equation for shape β:
   *   1/β + (1/N)Σln(t_i) - [Σ(t_i^β ln(t_i))] / [Σ(t_i^β)] = 0
   * Scale: η = (Σ(t_i^β)/N)^(1/β)
   */
  private fitWeibull(lives: number[]): WeibullResult {
    const N = lives.length;
    const lnT = lives.map((t) => Math.log(Math.max(t, 1e-10)));
    const meanLnT = mean(lnT);

    // Newton-Raphson for β
    let beta = 3.0; // initial guess
    for (let iter = 0; iter < 50; iter++) {
      let sumTb = 0, sumTbLn = 0, sumTbLn2 = 0;
      for (let i = 0; i < N; i++) {
        const tb = Math.pow(lives[i], beta);
        sumTb += tb;
        sumTbLn += tb * lnT[i];
        sumTbLn2 += tb * lnT[i] * lnT[i];
      }
      const A = sumTbLn / sumTb;
      const f_val = 1 / beta + meanLnT - A;
      const f_deriv = -1 / (beta * beta) - (sumTbLn2 * sumTb - sumTbLn * sumTbLn) / (sumTb * sumTb);
      const delta = f_val / f_deriv;
      beta -= delta;
      beta = Math.max(beta, 0.3);
      if (Math.abs(delta) < 1e-8) break;
    }

    // Scale parameter
    let sumTb = 0;
    for (let i = 0; i < N; i++) sumTb += Math.pow(lives[i], beta);
    const eta = Math.pow(sumTb / N, 1 / beta);

    // Weibull moments
    const meanLife = eta * gammaFn(1 + 1 / beta);
    const meanSqLife = eta * eta * gammaFn(1 + 2 / beta);
    const stdLife = Math.sqrt(Math.max(meanSqLife - meanLife * meanLife, 0));
    const medianLife = eta * Math.pow(Math.log(2), 1 / beta);

    return {
      beta: Math.round(beta * 1000) / 1000,
      eta_min: Math.round(eta * 100) / 100,
      mean_min: Math.round(meanLife * 100) / 100,
      std_dev_min: Math.round(stdLife * 100) / 100,
      median_min: Math.round(medianLife * 100) / 100,
    };
  }

  /**
   * Wiener process wear simulation.
   *
   * dVB = μ·dt + σ·dW
   * μ = VB_limit / T_taylor (base wear rate)
   * σ = μ * noise_factor
   *
   * Simulates N paths, records first-passage time to VB_limit.
   */
  private wienerProcess(
    taylorLife: number, wearLimit: number, N: number, noiseFactor: number = 0.22
  ): WienerResult {
    const mu = wearLimit / taylorLife; // mm/min drift
    const sigma = mu * noiseFactor;   // mm/sqrt(min) diffusion
    const dt = taylorLife / 500;      // time step (~500 steps per expected life)
    const maxSteps = 2000;            // safety cap

    const fptTimes: number[] = [];

    for (let trial = 0; trial < N; trial++) {
      let vb = 0;
      let t = 0;
      for (let step = 0; step < maxSteps; step++) {
        vb += mu * dt + sigma * Math.sqrt(dt) * randn();
        vb = Math.max(vb, 0); // VB cannot go negative
        t += dt;
        if (vb >= wearLimit) {
          fptTimes.push(t);
          break;
        }
      }
      // If not reached, record max time (censored)
      if (vb < wearLimit) {
        fptTimes.push(t);
      }
    }

    fptTimes.sort((a, b) => a - b);
    const m = mean(fptTimes);
    const s = stdDev(fptTimes);
    const lo = percentile(fptTimes, 0.025);
    const hi = percentile(fptTimes, 0.975);

    return {
      mean_life_min: Math.round(m * 100) / 100,
      std_dev_min: Math.round(s * 100) / 100,
      ci_95: [Math.round(lo * 100) / 100, Math.round(hi * 100) / 100],
    };
  }

  /**
   * Bayesian updating of wear rate with observed VB measurements.
   *
   * Model: VB(t) = μ·t + noise → observed VB_i at time t_i
   * Prior on μ: Gamma(α₀, β₀) with α₀=2, β₀ = 2/μ_prior
   *   so E[μ] = α₀/β₀ = μ_prior
   *
   * Likelihood: VB_i ~ N(μ·t_i, σ²·t_i)
   * For conjugate update on μ (known σ²):
   *   posterior α = α₀ + n/2
   *   posterior β = β₀ + (1/2)·Σ(VB_i/t_i - μ_hat)²·t_i  (simplified)
   *
   * We use a simpler conjugate: treat VB_i/t_i as noisy observations of μ.
   *   μ_obs_i = VB_i / t_i
   *   Prior: μ ~ Gamma(α₀, β₀)
   *   Posterior: Gamma(α₀ + n, β₀ + Σt_i) with rate parametrization adjusted
   */
  private bayesianUpdate(
    taylorLife: number, wearLimit: number, observations: WearObservation[]
  ): BayesianResult {
    const priorMu = wearLimit / taylorLife; // prior mean wear rate mm/min

    // Gamma prior: shape α₀, rate β₀ → E[μ] = α₀/β₀
    const alpha0 = 4.0;
    const beta0 = alpha0 / priorMu;

    // Observed wear rates
    const wearRates = observations.map((o) => o.vb_mm / Math.max(o.time_min, 0.01));
    const n = wearRates.length;
    const sumRates = wearRates.reduce((s, r) => s + r, 0);

    // Conjugate Gamma posterior: α_post = α₀ + n, β_post = β₀ + Σ(vb_i/t_i)
    // This treats each wear-rate observation as a Poisson-like count
    // Posterior mean: α_post / β_post
    const alphaPost = alpha0 + n;
    const betaPost = beta0 + sumRates;

    const posteriorMu = alphaPost / betaPost;
    const posteriorVar = alphaPost / (betaPost * betaPost);
    const posteriorStd = Math.sqrt(posteriorVar);

    // Posterior life = VB_limit / μ_post
    const posteriorLife = wearLimit / posteriorMu;

    // Remaining life from last observation
    const lastObs = observations[observations.length - 1];
    const remainingVB = Math.max(wearLimit - lastObs.vb_mm, 0);
    const remainingLife = remainingVB / posteriorMu;

    // 95% CI on life via CI on μ (inverse relationship)
    // μ_lo = posteriorMu - 1.96*posteriorStd, μ_hi = posteriorMu + 1.96*posteriorStd
    const muLo = Math.max(posteriorMu - 1.96 * posteriorStd, posteriorMu * 0.1);
    const muHi = posteriorMu + 1.96 * posteriorStd;
    const lifeLo = wearLimit / muHi;
    const lifeHi = wearLimit / muLo;

    return {
      prior_mean: Math.round((wearLimit / priorMu) * 100) / 100,
      posterior_mean: Math.round(posteriorLife * 100) / 100,
      posterior_std: Math.round((posteriorLife * posteriorStd / posteriorMu) * 100) / 100,
      ci_95: [Math.round(lifeLo * 100) / 100, Math.round(lifeHi * 100) / 100],
      remaining_life_min: Math.round(remainingLife * 100) / 100,
    };
  }

  /**
   * Weibull reliability at time t: R(t) = exp(-(t/η)^β)
   */
  private weibullReliability(t: number, beta: number, eta: number): number {
    return Math.exp(-Math.pow(t / eta, beta));
  }

  /**
   * Weibull hazard rate at time t: h(t) = (β/η)·(t/η)^(β-1)
   */
  private weibullHazard(t: number, beta: number, eta: number): number {
    return (beta / eta) * Math.pow(t / eta, beta - 1);
  }

  /**
   * Compute reliability curve at standard percentages of Taylor life.
   */
  private computeReliability(taylorLife: number, beta: number, eta: number): ReliabilityPoint[] {
    const fractions = [0.25, 0.50, 0.75, 0.90, 0.95, 0.99];
    return fractions.map((frac) => {
      const t = taylorLife * frac;
      const pSurvive = this.weibullReliability(t, beta, eta);
      return {
        time_min: Math.round(t * 100) / 100,
        p_survive: Math.round(pSurvive * 10000) / 10000,
      };
    });
  }

  /**
   * Optimal age replacement policy.
   *
   * Minimize expected cost per unit time:
   *   EC(T) = [C_p·R(T) + C_f·F(T)] / ∫₀ᵀ R(u)du
   *
   * where C_p = planned replacement cost, C_f = failure cost (= ratio × C_p),
   * R(T) = Weibull reliability, F(T) = 1 - R(T).
   *
   * Search over T in [0.1·η, 2·η] to find minimum.
   */
  private optimalReplacement(beta: number, eta: number, costRatio: number): number {
    const Cp = 1.0; // normalized
    const Cf = costRatio;
    const steps = 500;
    const tMin = 0.05 * eta;
    const tMax = 2.0 * eta;
    const dt = (tMax - tMin) / steps;

    let bestT = eta;
    let bestCost = Infinity;

    for (let i = 1; i <= steps; i++) {
      const T = tMin + i * dt;
      const R_T = this.weibullReliability(T, beta, eta);
      const F_T = 1 - R_T;

      // Numerical integration of R(u) from 0 to T (trapezoidal)
      const nInt = 100;
      const du = T / nInt;
      let integral = 0;
      for (let j = 0; j <= nInt; j++) {
        const u = j * du;
        const w = j === 0 || j === nInt ? 0.5 : 1.0;
        integral += w * this.weibullReliability(u, beta, eta) * du;
      }

      const ecr = (Cp * R_T + Cf * F_T) / Math.max(integral, 1e-10);
      if (ecr < bestCost) {
        bestCost = ecr;
        bestT = T;
      }
    }

    return Math.round(bestT * 100) / 100;
  }

  /**
   * Identify the dominant source of uncertainty.
   */
  private identifyDominantUncertainty(
    taylor: TaylorEntry,
    weibull: WeibullResult | null,
    wiener: WienerResult | null,
    taylorLife: number
  ): string {
    // Compare CV of C vs CV of n scaled by sensitivity
    const cvC_contrib = taylor.cv_C;
    const cvN_contrib = taylor.cv_n * (1 / taylor.n) * Math.log(taylor.C); // sensitivity amplification

    if (cvN_contrib > cvC_contrib * 1.2) {
      return "Taylor exponent n scatter (high sensitivity to exponent uncertainty)";
    }

    if (weibull && weibull.beta < 2.0) {
      return "Low Weibull shape (β < 2): high infant mortality risk — tool batch quality";
    }

    if (wiener && wiener.std_dev_min > 0.4 * wiener.mean_life_min) {
      return "Wiener process volatility: stochastic wear fluctuations dominate";
    }

    if (cvC_contrib > 0.20) {
      return "Taylor constant C scatter (workpiece material variability)";
    }

    return "Combined scatter in Taylor C and n (typical machining variability)";
  }

  /**
   * Main compute method — runs selected stochastic analyses.
   *
   * @param input - Cutting conditions, material, and analysis options
   * @returns AtomicValue wrapping StochasticToolLifeResult
   *
   * @example
   * ```ts
   * const r = stochasticToolLifeEngine.compute({
   *   material: "Ti-6Al-4V",
   *   cutting_speed_mpm: 60,
   *   feed_mm: 0.15,
   *   depth_mm: 2.0,
   *   target_time_min: 20,
   * });
   * console.log(`P(survive ${r.value.p_survive_target}) at 20 min`);
   * ```
   */
  compute(input: StochasticToolLifeInput): AtomicValue<StochasticToolLifeResult> {
    const toolMat = input.tool_material ?? "carbide";
    const coating = input.coating ?? "TiAlN";
    const wearLimit = input.wear_limit_mm ?? 0.3;
    const MAX_TRIALS = 100_000;
    const N = Math.min(input.n_trials ?? 2000, MAX_TRIALS);
    const method = input.method ?? "all";
    const costRatio = 7.0; // C_failure / C_replace

    log.info(`[StochasticToolLife] material=${input.material} V=${input.cutting_speed_mpm} f=${input.feed_mm} ap=${input.depth_mm} method=${method}`);

    // 1. Get Taylor constants
    const taylor = this.getTaylor(input.material, toolMat, coating);

    // 2. Deterministic Taylor life
    const detLife = this.taylorLife(
      taylor.C, taylor.n, input.cutting_speed_mpm, input.feed_mm, input.depth_mm, taylor.p, taylor.q
    );

    // 3. Weibull analysis (Monte Carlo Taylor → Weibull fit)
    let weibullResult: WeibullResult | null = null;
    if (method === "weibull" || method === "all") {
      const mcLives = this.monteCarloTaylorLives(taylor, input.cutting_speed_mpm, input.feed_mm, input.depth_mm, coating, N);
      weibullResult = this.fitWeibull(mcLives);
    }

    // 4. Wiener process
    let wienerResult: WienerResult | null = null;
    if (method === "wiener" || method === "all") {
      wienerResult = this.wienerProcess(detLife, wearLimit, Math.min(N, 3000));
    }

    // 5. Bayesian updating
    let bayesianResult: BayesianResult | null = null;
    if ((method === "bayesian" || method === "all") && input.observed_wear && input.observed_wear.length > 0) {
      bayesianResult = this.bayesianUpdate(detLife, wearLimit, input.observed_wear);
    }

    // 6. Reliability curve — use Weibull params if available, else use Taylor-derived shape
    const beta = weibullResult?.beta ?? taylor.beta;
    const eta = weibullResult?.eta_min ?? detLife;
    const reliability = this.computeReliability(detLife, beta, eta);

    // 7. P(survive) at target time
    let pSurviveTarget: number | null = null;
    if (input.target_time_min != null) {
      pSurviveTarget = Math.round(this.weibullReliability(input.target_time_min, beta, eta) * 10000) / 10000;
    }

    // 8. Optimal replacement
    const optReplace = this.optimalReplacement(beta, eta, costRatio);

    // 9. Hazard at deterministic Taylor life
    const hazardAtTaylor = Math.round(this.weibullHazard(detLife, beta, eta) * 10000) / 10000;

    // 10. Dominant uncertainty
    const dominantUncertainty = this.identifyDominantUncertainty(taylor, weibullResult, wienerResult, detLife);

    const result: StochasticToolLifeResult = {
      taylor_life_min: Math.round(detLife * 100) / 100,
      weibull: weibullResult,
      wiener: wienerResult,
      bayesian: bayesianResult,
      reliability,
      p_survive_target: pSurviveTarget,
      optimal_replacement_min: optReplace,
      cost_ratio: costRatio,
      hazard_at_taylor: hazardAtTaylor,
      dominant_uncertainty: dominantUncertainty,
    };

    const formulaStr = method === "all"
      ? "T=C/V^(1/n)·(f_ref/f)^p·(ap_ref/ap)^q + Weibull(β,η) MLE + Wiener dVB=μdt+σdW"
      : method === "weibull"
        ? "Weibull(β,η) MLE on MC Taylor samples"
        : method === "wiener"
          ? "Wiener dVB=μdt+σdW first-passage"
          : "Bayesian Gamma conjugate update on wear rate";

    // Confidence based on data availability and method
    let confidence = 0.75;
    if (weibullResult && wienerResult) confidence = 0.82;
    if (bayesianResult) confidence = 0.88;
    if (bayesianResult && input.observed_wear && input.observed_wear.length >= 5) confidence = 0.92;

    return {
      value: result,
      unit: "stochastic_tool_life_analysis",
      formula: formulaStr,
      confidence,
    };
  }

  /**
   * Update tool life prediction from real-world observed tool lives using
   * BayesianWearModel algorithm (conjugate normal-normal update).
   *
   * Complements the existing Gamma-conjugate bayesianUpdate() (which updates
   * wear RATE from VB measurements) with a direct tool-life posterior from
   * observed actual tool lives — answering "how long will the NEXT tool last?"
   *
   * Learning loop: shop runs 5 tools → records actual lives → this method
   * narrows the prediction interval → next program uses tighter estimates.
   *
   * Lazy-requires BayesianWearModel; falls back to compute() if unavailable.
   *
   * Reference: Conjugate normal-normal Bayesian update;
   *            ISO 3685 VB=0.3mm end-of-life criterion
   */
  updateFromMeasurements(input: {
    material: string;
    cutting_speed_mpm: number;
    feed_mm: number;
    depth_mm: number;
    tool_material?: "carbide" | "ceramic" | "cbn" | "hss";
    coating?: CoatingKey;
    observed_lives: number[];
    vb_threshold?: number;
  }): AtomicValue<StochasticToolLifeResult> & {
    bayesian_model_used: boolean;
    posterior_mean_life: number;
    posterior_std_life: number;
    credible_interval_95: [number, number];
    probability_exceed_threshold: number | null;
    recommendation: string;
    shrinkage: number;
    uncertainty_reduction: number;
  } {
    const toolMat = input.tool_material ?? "carbide";
    const coating = input.coating ?? "TiAlN";
    const vbThresh = input.vb_threshold ?? 0.3;

    // Get deterministic Taylor life as prior
    const taylor = this.getTaylor(input.material, toolMat, coating);
    const priorLife = this.taylorLife(
      taylor.C, taylor.n, input.cutting_speed_mpm,
      input.feed_mm, input.depth_mm, taylor.p, taylor.q
    );

    // Run the full stochastic compute for the base result
    const baseResult = this.compute({
      material: input.material,
      cutting_speed_mpm: input.cutting_speed_mpm,
      feed_mm: input.feed_mm,
      depth_mm: input.depth_mm,
      tool_material: toolMat,
      coating,
      wear_limit_mm: vbThresh,
      method: "all",
    });

    // Guard: need observations
    if (!input.observed_lives || input.observed_lives.length === 0) {
      return {
        ...baseResult,
        bayesian_model_used: false,
        posterior_mean_life: priorLife,
        posterior_std_life: priorLife * taylor.cv_C,
        credible_interval_95: [
          priorLife * (1 - 1.96 * taylor.cv_C),
          priorLife * (1 + 1.96 * taylor.cv_C),
        ],
        probability_exceed_threshold: null,
        recommendation: "COLLECT_MORE: No observations — using Taylor prior only.",
        shrinkage: 0,
        uncertainty_reduction: 1,
      };
    }

    let bayesianUsed = false;
    let posteriorMean = priorLife;
    let posteriorStd = priorLife * taylor.cv_C;
    let ci95: [number, number] = [
      priorLife * (1 - 1.96 * taylor.cv_C),
      priorLife * (1 + 1.96 * taylor.cv_C),
    ];
    let probExceed: number | null = null;
    let recommendation = "OK: Wear prediction within acceptable bounds.";
    let shrinkage = 0;
    let uncertaintyReduction = 1;

    try {
      const { BayesianWearModel } = require("../algorithms/BayesianWearModel.js");
      const model = new BayesianWearModel();

      // Prior: Taylor life ± scatter (CV from database)
      const priorStd = priorLife * taylor.cv_C;

      const bmResult = model.calculate({
        prior_mean: priorLife,
        prior_std: priorStd,
        observations: input.observed_lives,
        likelihood_std: priorStd,
        vb_threshold: priorLife * 0.5, // flag if posterior < 50% of expected
      });

      bayesianUsed = true;
      posteriorMean = bmResult.posterior_mean;
      posteriorStd = bmResult.posterior_std;
      ci95 = bmResult.credible_interval_95;
      probExceed = bmResult.probability_exceed_threshold;
      recommendation = bmResult.recommendation;
      shrinkage = bmResult.shrinkage;
      uncertaintyReduction = bmResult.uncertainty_reduction;
    } catch {
      // Fallback: simple mean of observations weighted with prior
      const obsMean = input.observed_lives.reduce((s, v) => s + v, 0) / input.observed_lives.length;
      const n = input.observed_lives.length;
      const priorPrec = 1 / (priorLife * taylor.cv_C) ** 2;
      const likePrec = n / (priorLife * taylor.cv_C) ** 2;
      const postPrec = priorPrec + likePrec;
      posteriorMean = (priorPrec * priorLife + likePrec * obsMean) / postPrec;
      posteriorStd = Math.sqrt(1 / postPrec);
      ci95 = [posteriorMean - 1.96 * posteriorStd, posteriorMean + 1.96 * posteriorStd];
      shrinkage = Math.abs(posteriorMean - priorLife) / Math.max(Math.abs(obsMean - priorLife), 0.01);
      shrinkage = Math.min(1, shrinkage);
      uncertaintyReduction = posteriorStd / (priorLife * taylor.cv_C);
      recommendation = n < 3
        ? "COLLECT_MORE: Fewer than 3 observations — uncertainty still high."
        : "OK: Bayesian fallback applied.";
    }

    return {
      ...baseResult,
      bayesian_model_used: bayesianUsed,
      posterior_mean_life: Math.round(posteriorMean * 100) / 100,
      posterior_std_life: Math.round(posteriorStd * 100) / 100,
      credible_interval_95: [
        Math.round(ci95[0] * 100) / 100,
        Math.round(ci95[1] * 100) / 100,
      ],
      probability_exceed_threshold: probExceed,
      recommendation,
      shrinkage: Math.round(shrinkage * 1000) / 1000,
      uncertainty_reduction: Math.round(uncertaintyReduction * 1000) / 1000,
    };
  }
}

/** Singleton engine instance */
export const stochasticToolLifeEngine = new StochasticToolLifeEngine();
