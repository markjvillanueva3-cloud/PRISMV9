/**
 * PRISM MCP Server — Importance Sampling Reliability Engine
 *
 * Change-of-measure (Radon–Nikodym) importance sampling for RARE-EVENT
 * reliability. Estimates a failure probability
 *
 *     p_f = P( X in F ),   F = { x : failure( g(x) ) }
 *
 * where X ~ N(mu0, diag(sigma0^2)) is the (independent-Gaussian) input vector
 * and g is a user-supplied limit-state / response function.
 *
 * Naive Monte Carlo needs O(1 / p_f) samples to get a single hit in the failure
 * region — for p_f = 3.4e-6 that is millions of samples with the estimate stuck
 * at 0. Importance sampling draws from a SHIFTED proposal density q centred on
 * the "design point" (the most-probable failure point, MPP) and reweights each
 * sample by the likelihood ratio (the Radon–Nikodym derivative)
 *
 *     w(x) = f(x) / q(x)
 *
 * so the estimator  p_f = (1/N) Σ w(x_i) · 1{x_i in F}  is UNBIASED for ANY
 * proposal with common support, while the variance collapses by orders of
 * magnitude when q is centred on the design point.
 *
 * The proposal mean-shift is designed automatically by a HL-RF (Hasofer–Lind /
 * Rackwitz–Fiessler) first-order design-point search in standard-normal space,
 * with a pilot cross-entropy fallback when HL-RF does not converge. When the
 * design point coincides with the origin (failure region carries ≥ half the
 * probability), the proposal equals the nominal density and the estimator
 * reduces exactly to crude Monte Carlo.
 *
 * References:
 *   - Kahn & Marshall (1953) "Methods of reducing sample size in Monte Carlo
 *     computations", J. Oper. Res. Soc. Am. 1(5).
 *   - Hasofer & Lind (1974) "Exact and invariant second-moment code format",
 *     ASCE J. Eng. Mech. 100(1). Rackwitz & Fiessler (1978).
 *   - Melchers (1989) "Importance sampling in structural systems",
 *     Structural Safety 6. Hohenbichler & Rackwitz (1988).
 *   - Rubinstein & Kroese (2017) "Simulation and the Monte Carlo Method", 3rd ed.
 *   - erfc: Numerical Recipes in C (2nd ed.) §6.2 `erfcc` (fractional err < 1.2e-7).
 *   - inverse-normal quantile: Acklam / Beasley-Springer-Moro rational approx.
 *
 * Pure & deterministic — all randomness flows through a seeded mulberry32 PRNG.
 * No physics constants are required (import from src/physics/constants.ts if any
 * are ever added); the numeric coefficients below are cited statistical
 * approximation constants, not manufacturing physics values.
 *
 * @module ImportanceSamplingReliabilityEngine
 */

// ============================================================================
// TYPES
// ============================================================================

/** Independent multivariate-normal input X ~ N(mean, diag(std^2)). */
export interface GaussianInput {
  /** Nominal mean vector mu0 (length d ≥ 1). */
  mean: number[];
  /** Nominal per-dimension standard deviations sigma0 (all > 0, length d). */
  std: number[];
}

export interface ISReliabilityInput {
  /** Limit-state / response function g(x). Must return a finite number. */
  limitState: (x: number[]) => number;
  /** The input random vector distribution. */
  input: GaussianInput;
  /** Threshold value the response is compared against (default 0). */
  failureThreshold?: number;
  /**
   * Failure convention:
   *   "below" → failure when g(x) <= threshold  (structural margin convention)
   *   "above" → failure when g(x) >= threshold  (exceedance / tail convention)
   * Default "below".
   */
  failureMode?: "below" | "above";
  /** Number of importance samples (default 20000, clamped to [1, 5e6]). */
  nSamples?: number;
  /** PRNG seed (default 12345). */
  seed?: number;
  /**
   * Explicit proposal mean (x-space design point). Overrides auto-shift when
   * provided — used for adversarial / bespoke-proposal testing.
   */
  designPoint?: number[];
  /** Proposal per-dimension std (default = input.std, i.e. shift-only). */
  proposalStd?: number[];
  /** Auto-design the mean shift via HL-RF when no designPoint given (default true). */
  autoShift?: boolean;
  /** Max HL-RF iterations for the design-point search (default 60). */
  maxDesignPointIter?: number;
}

export interface ISReliabilityResult {
  /** Estimated failure probability p_f. */
  failureProbability: number;
  /** Generalised reliability index beta = -Phi^{-1}(p_f). */
  reliabilityIndex: number;
  /** Variance of the p_f estimator over the full run (= Var(wI)/N). */
  estimatorVariance: number;
  /** Standard error of p_f (= sqrt(estimatorVariance)). */
  standardError: number;
  /** Coefficient of variation of the estimate (standardError / p_f). */
  coefficientOfVariation: number;
  /** Effective sample size ESS = (Σw)^2 / Σw^2, in (0, N]. */
  effectiveSampleSize: number;
  /** ESS / N in (0, 1]. */
  effectiveSampleSizeFraction: number;
  /** Variance-reduction ratio vs naive MC at the same N (naiveVar / isVar). */
  varianceReductionRatio: number;
  /** Crude Monte-Carlo estimate at the same N (for comparison; ~0 for rare tails). */
  naiveEstimate: number;
  /** Proposal mean actually used (the design point / MPP in x-space). */
  proposalMean: number[];
  /** Proposal std actually used. */
  proposalStd: number[];
  /** FORM reliability index at the located design point (||u*|| in u-space). */
  designPointBeta: number;
  /** Whether the HL-RF design-point search converged. */
  designPointFound: boolean;
  /** Count of proposal samples that landed in the failure region. */
  failureSamples: number;
  /** Number of importance samples used. */
  nSamples: number;
  /** Seed used. */
  seed: number;
  /** Non-fatal diagnostics (low ESS, no hits, non-convergence, ...). */
  warnings: string[];
  /** Method label. */
  source: string;
}

// ============================================================================
// SEEDED PRNG (mulberry32) + Gaussian generator (Box–Muller)
// ============================================================================

/** mulberry32 — fast deterministic 32-bit PRNG, uniform in [0,1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard-normal generator via Box–Muller over a seeded mulberry32 stream. */
class GaussianRNG {
  private readonly u: () => number;
  private spare: number | null = null;

  constructor(seed: number) {
    this.u = mulberry32(seed);
  }

  /** Draw one N(0,1) sample. */
  standardNormal(): number {
    if (this.spare !== null) {
      const s = this.spare;
      this.spare = null;
      return s;
    }
    // Guard u1 away from 0 so log() is finite.
    let u1 = this.u();
    const u2 = this.u();
    if (u1 < 1e-300) u1 = 1e-300;
    const r = Math.sqrt(-2 * Math.log(u1));
    const theta = 2 * Math.PI * u2;
    this.spare = r * Math.sin(theta);
    return r * Math.cos(theta);
  }
}

// ============================================================================
// STANDARD-NORMAL CDF / TAIL / QUANTILE (erf-based)
// ============================================================================

const SQRT2 = Math.SQRT2;
const SQRT_2PI = Math.sqrt(2 * Math.PI);
const LOG_SQRT_2PI = Math.log(SQRT_2PI);

/**
 * Complementary error function erfc(x). Numerical Recipes `erfcc`, fractional
 * error < 1.2e-7 everywhere — accurate enough for far-tail relative precision
 * (e.g. P(Z>4.5) ≈ 3.3977e-6 to ~7 significant figures).
 */
function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  let polynomial = 0.17087277;
  polynomial = -0.82215223 + t * polynomial;
  polynomial = 1.48851587 + t * polynomial;
  polynomial = -1.13520398 + t * polynomial;
  polynomial = 0.27886807 + t * polynomial;
  polynomial = -0.18628806 + t * polynomial;
  polynomial = 0.09678418 + t * polynomial;
  polynomial = 0.37409196 + t * polynomial;
  polynomial = 1.00002368 + t * polynomial;
  const ans = t * Math.exp(-z * z - 1.26551223 + t * polynomial);
  return x >= 0 ? ans : 2 - ans;
}

/** Standard-normal pdf φ(z). */
function stdNormalPdf(z: number): number {
  return Math.exp(-0.5 * z * z) / SQRT_2PI;
}

/** log standard-normal pdf log φ(z) — numerically stable in the tails. */
function logStdNormalPdf(z: number): number {
  return -0.5 * z * z - LOG_SQRT_2PI;
}

// ============================================================================
// ENGINE
// ============================================================================

export class ImportanceSamplingReliabilityEngine {
  private static readonly MIN_SAMPLES = 1;
  private static readonly MAX_SAMPLES = 5_000_000;
  private static readonly DEFAULT_SAMPLES = 20_000;
  private static readonly LOW_ESS_FRACTION = 0.1;

  // ── Public statistical utilities (erf-based) ────────────────────────────

  /**
   * Standard-normal CDF  Φ(z) = 0.5·erfc(-z/√2).
   * @param z standardised value
   * @returns P(Z ≤ z)
   */
  standardNormalCdf(z: number): number {
    return 0.5 * erfc(-z / SQRT2);
  }

  /**
   * Upper-tail probability  P(Z > z) = 0.5·erfc(z/√2). Retains far-tail
   * relative accuracy (unlike 1 − Φ(z), which cancels catastrophically).
   * @param z standardised value
   * @returns P(Z > z)
   */
  standardNormalTail(z: number): number {
    return 0.5 * erfc(z / SQRT2);
  }

  /**
   * Inverse standard-normal CDF  Φ^{-1}(p). Acklam / Beasley-Springer-Moro
   * rational approximation (|abs err| < 1.15e-9 for p in (0,1)).
   * @param p probability in (0,1)
   * @returns z such that Φ(z) = p
   */
  standardNormalQuantile(p: number): number {
    if (!(p > 0) || !(p < 1)) {
      if (p <= 0) return -Infinity;
      if (p >= 1) return Infinity;
      return NaN;
    }
    // Coefficients (Acklam).
    const a = [
      -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
      1.38357751867269e2, -3.066479806614716e1, 2.506628277459239e0,
    ];
    const b = [
      -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
      6.680131188771972e1, -1.328068155288572e1,
    ];
    const c = [
      -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
      -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0,
    ];
    const d = [
      7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
      3.754408661907416e0,
    ];
    const pLow = 0.02425;
    const pHigh = 1 - pLow;
    let q: number;
    let r: number;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (
        (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
      );
    }
    if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (
        ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
          q) /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
      );
    }
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }

  // ── Design point (MPP) search — HL-RF ───────────────────────────────────

  /**
   * Signed failure margin M(x) with the convention M(x) ≤ 0 ⇔ failure, unified
   * across both failure modes.
   */
  private margin(
    g: (x: number[]) => number,
    x: number[],
    threshold: number,
    mode: "below" | "above",
  ): number {
    const gv = g(x);
    if (!Number.isFinite(gv)) {
      throw new Error(
        `ImportanceSamplingReliabilityEngine: limitState returned non-finite value ${gv}`,
      );
    }
    return mode === "below" ? gv - threshold : threshold - gv;
  }

  /**
   * Locate the most-probable failure point (design point) via the HL-RF
   * iteration in standard-normal (u) space, where x = mu0 + sigma0 ∘ u.
   *
   * @returns design point in x-space, its FORM index beta = ||u*||, convergence flag.
   */
  findDesignPoint(
    g: (x: number[]) => number,
    mu0: number[],
    sigma0: number[],
    threshold: number,
    mode: "below" | "above",
    maxIter = 60,
  ): { designPoint: number[]; beta: number; converged: boolean } {
    const d = mu0.length;
    const toX = (u: number[]): number[] => u.map((ui, i) => mu0[i] + sigma0[i] * ui);
    const G = (u: number[]): number => this.margin(g, toX(u), threshold, mode);

    const h = 1e-4; // finite-difference step in u-space
    const numGrad = (u: number[]): number[] => {
      const grad = new Array<number>(d);
      for (let i = 0; i < d; i++) {
        const up = [...u];
        const um = [...u];
        up[i] += h;
        um[i] -= h;
        grad[i] = (G(up) - G(um)) / (2 * h);
      }
      return grad;
    };

    let u = new Array<number>(d).fill(0);
    let converged = false;
    for (let k = 0; k < maxIter; k++) {
      const gVal = G(u);
      const grad = numGrad(u);
      const gnorm2 = grad.reduce((s, gi) => s + gi * gi, 0);
      if (gnorm2 < 1e-30) break; // flat gradient — cannot proceed
      const gdotu = grad.reduce((s, gi, i) => s + gi * u[i], 0);
      const scale = (gdotu - gVal) / gnorm2;
      const uNext = grad.map((gi) => scale * gi);
      const step = Math.sqrt(
        uNext.reduce((s, v, i) => s + (v - u[i]) ** 2, 0),
      );
      const norm = Math.sqrt(uNext.reduce((s, v) => s + v * v, 0));
      if (!Number.isFinite(norm) || norm > 1e6) {
        u = uNext;
        break; // diverged
      }
      u = uNext;
      if (step < 1e-7) {
        converged = true;
        break;
      }
    }
    const beta = Math.sqrt(u.reduce((s, v) => s + v * v, 0));
    return { designPoint: toX(u), beta, converged: converged && Number.isFinite(beta) };
  }

  // ── Crude Monte-Carlo baseline ──────────────────────────────────────────

  /**
   * Crude Monte-Carlo failure-probability estimate (draws from the nominal
   * density). For rare tails this is ~0 at any feasible N — the whole reason
   * importance sampling exists.
   */
  naiveMonteCarlo(input: ISReliabilityInput): { estimate: number; failureSamples: number } {
    const cfg = this.resolveConfig(input);
    const rng = new GaussianRNG(cfg.seed ^ 0x9e3779b9);
    let hits = 0;
    const x = new Array<number>(cfg.d);
    for (let i = 0; i < cfg.nSamples; i++) {
      for (let j = 0; j < cfg.d; j++) {
        x[j] = cfg.mu0[j] + cfg.sigma0[j] * rng.standardNormal();
      }
      if (this.margin(cfg.g, x, cfg.threshold, cfg.mode) <= 0) hits++;
    }
    return { estimate: hits / cfg.nSamples, failureSamples: hits };
  }

  // ── Main estimator ──────────────────────────────────────────────────────

  /**
   * Estimate the failure probability p_f = P(g(X) in failure region) by
   * change-of-measure importance sampling around the (auto-designed) design point.
   *
   * @param input limit-state, Gaussian input, failure convention, sample budget.
   * @returns estimate + variance + ESS + variance-reduction ratio + diagnostics.
   */
  estimateFailureProbability(input: ISReliabilityInput): ISReliabilityResult {
    const cfg = this.resolveConfig(input);
    const warnings: string[] = [];

    // 1) Determine the proposal mean (design point).
    let proposalMean: number[];
    let designPointBeta = 0;
    let designPointFound = false;
    if (cfg.designPoint) {
      proposalMean = cfg.designPoint;
      // Report the FORM index of the supplied point for context.
      designPointBeta = Math.sqrt(
        proposalMean.reduce(
          (s, xi, i) => s + ((xi - cfg.mu0[i]) / cfg.sigma0[i]) ** 2,
          0,
        ),
      );
      designPointFound = true;
    } else if (cfg.autoShift) {
      const dp = this.findDesignPoint(
        cfg.g, cfg.mu0, cfg.sigma0, cfg.threshold, cfg.mode, cfg.maxDesignPointIter,
      );
      designPointBeta = dp.beta;
      designPointFound = dp.converged;
      if (dp.converged) {
        proposalMean = dp.designPoint;
      } else {
        // Pilot cross-entropy fallback: shift toward the mean of failing pilots.
        const pilot = this.pilotShift(cfg);
        if (pilot) {
          proposalMean = pilot;
          warnings.push(
            "HL-RF design-point search did not converge; using pilot cross-entropy shift",
          );
        } else {
          proposalMean = [...cfg.mu0];
          warnings.push(
            "no design point located and no failures observed in pilot; proposal = nominal (probability likely below resolution)",
          );
        }
      }
    } else {
      proposalMean = [...cfg.mu0]; // no shift → reduces to crude MC
    }

    const proposalStd = cfg.proposalStd;

    // 2) Importance sampling with likelihood-ratio weights w = f(x)/q(x).
    const rng = new GaussianRNG(cfg.seed);
    const x = new Array<number>(cfg.d);
    let sumWI = 0; // Σ w·1{fail}
    let sumWI2 = 0; // Σ (w·1{fail})^2
    let sumW = 0; // Σ w   (all samples, for ESS)
    let sumW2 = 0; // Σ w^2 (all samples, for ESS)
    let failureSamples = 0;

    for (let i = 0; i < cfg.nSamples; i++) {
      // Draw x ~ q = N(proposalMean, diag(proposalStd^2)).
      let logW = 0;
      for (let j = 0; j < cfg.d; j++) {
        const z = rng.standardNormal();
        const xj = proposalMean[j] + proposalStd[j] * z;
        x[j] = xj;
        // log w_j = log f_j(x) - log q_j(x); the 1/std Jacobians are inside the pdfs.
        const zf = (xj - cfg.mu0[j]) / cfg.sigma0[j];
        const zq = (xj - proposalMean[j]) / proposalStd[j];
        logW +=
          (logStdNormalPdf(zf) - Math.log(cfg.sigma0[j])) -
          (logStdNormalPdf(zq) - Math.log(proposalStd[j]));
      }
      const w = Math.exp(logW);
      sumW += w;
      sumW2 += w * w;
      if (this.margin(cfg.g, x, cfg.threshold, cfg.mode) <= 0) {
        failureSamples++;
        sumWI += w;
        sumWI2 += w * w;
      }
    }

    const N = cfg.nSamples;
    const pf = sumWI / N;

    // Estimator variance: samples w·I are iid; Var(estimator) = Var(wI)/N.
    // sampleVar(wI) with the (N-1) correction; E[(wI)^2] = sumWI2/N (zeros included).
    const meanWI = sumWI / N;
    const sampleVarWI =
      N > 1 ? (sumWI2 - N * meanWI * meanWI) / (N - 1) : 0;
    const estimatorVariance = Math.max(0, sampleVarWI) / N;
    const standardError = Math.sqrt(estimatorVariance);
    const coefficientOfVariation = pf > 0 ? standardError / pf : Infinity;

    // Effective sample size over the importance weights.
    const effectiveSampleSize = sumW2 > 0 ? (sumW * sumW) / sumW2 : 0;
    const effectiveSampleSizeFraction = effectiveSampleSize / N;

    // Variance-reduction ratio vs naive MC at the same N.
    // naive (Bernoulli) estimator variance = pf(1-pf)/N.
    const naiveVar = (pf * (1 - pf)) / N;
    const varianceReductionRatio =
      estimatorVariance > 0
        ? naiveVar / estimatorVariance
        : naiveVar > 0
          ? Infinity
          : 1;

    // Naive MC estimate at the same budget (independent stream) for reporting.
    const naive = this.naiveMonteCarlo(input);

    // Reliability index beta = -Phi^{-1}(pf).
    const reliabilityIndex =
      pf > 0 && pf < 1 ? -this.standardNormalQuantile(pf) : pf <= 0 ? Infinity : -Infinity;

    // Diagnostics.
    if (failureSamples === 0) {
      warnings.push(
        "no failure samples observed under the proposal; p_f estimate is 0 / below resolution",
      );
    }
    if (effectiveSampleSizeFraction < ImportanceSamplingReliabilityEngine.LOW_ESS_FRACTION) {
      warnings.push(
        `low effective sample size (ESS/N=${effectiveSampleSizeFraction.toFixed(4)}); proposal poorly matched — weight degeneracy`,
      );
    }
    if (failureSamples > 0 && coefficientOfVariation > 0.5) {
      warnings.push(
        `high estimator CoV (${coefficientOfVariation.toFixed(3)}); increase nSamples for a tighter estimate`,
      );
    }

    return {
      failureProbability: pf,
      reliabilityIndex,
      estimatorVariance,
      standardError,
      coefficientOfVariation,
      effectiveSampleSize,
      effectiveSampleSizeFraction,
      varianceReductionRatio,
      naiveEstimate: naive.estimate,
      proposalMean,
      proposalStd,
      designPointBeta,
      designPointFound,
      failureSamples,
      nSamples: N,
      seed: cfg.seed,
      warnings,
      source: "importance_sampling_reliability",
    };
  }

  // ── Internals ───────────────────────────────────────────────────────────

  /** Pilot draw from nominal; if any failures, return their component-wise mean. */
  private pilotShift(cfg: ResolvedConfig): number[] | null {
    const pilotN = Math.min(5000, Math.max(500, Math.floor(cfg.nSamples / 4)));
    const rng = new GaussianRNG(cfg.seed ^ 0x51ed270b);
    const acc = new Array<number>(cfg.d).fill(0);
    const x = new Array<number>(cfg.d);
    let hits = 0;
    for (let i = 0; i < pilotN; i++) {
      for (let j = 0; j < cfg.d; j++) {
        x[j] = cfg.mu0[j] + cfg.sigma0[j] * rng.standardNormal();
      }
      if (this.margin(cfg.g, x, cfg.threshold, cfg.mode) <= 0) {
        hits++;
        for (let j = 0; j < cfg.d; j++) acc[j] += x[j];
      }
    }
    if (hits === 0) return null;
    return acc.map((s) => s / hits);
  }

  /** Validate & normalise input into a fully-resolved config (throws on invalid). */
  private resolveConfig(input: ISReliabilityInput): ResolvedConfig {
    if (!input || typeof input !== "object") {
      throw new Error("ImportanceSamplingReliabilityEngine: input object is required");
    }
    if (typeof input.limitState !== "function") {
      throw new Error(
        "ImportanceSamplingReliabilityEngine: `limitState` must be a function g(x)",
      );
    }
    const gi = input.input;
    if (!gi || !Array.isArray(gi.mean) || !Array.isArray(gi.std)) {
      throw new Error(
        "ImportanceSamplingReliabilityEngine: `input.mean` and `input.std` must be arrays",
      );
    }
    const d = gi.mean.length;
    if (d < 1) {
      throw new Error("ImportanceSamplingReliabilityEngine: input dimension must be ≥ 1");
    }
    if (gi.std.length !== d) {
      throw new Error(
        `ImportanceSamplingReliabilityEngine: input.mean (len ${d}) and input.std (len ${gi.std.length}) length mismatch`,
      );
    }
    for (let j = 0; j < d; j++) {
      if (!Number.isFinite(gi.mean[j])) {
        throw new Error(`ImportanceSamplingReliabilityEngine: input.mean[${j}] is not finite`);
      }
      if (!Number.isFinite(gi.std[j]) || gi.std[j] <= 0) {
        throw new Error(
          `ImportanceSamplingReliabilityEngine: input.std[${j}] must be finite and > 0 (got ${gi.std[j]})`,
        );
      }
    }

    const mode: "below" | "above" = input.failureMode ?? "below";
    if (mode !== "below" && mode !== "above") {
      throw new Error(
        `ImportanceSamplingReliabilityEngine: failureMode must be 'below' or 'above' (got ${String(input.failureMode)})`,
      );
    }
    const threshold = input.failureThreshold ?? 0;
    if (!Number.isFinite(threshold)) {
      throw new Error("ImportanceSamplingReliabilityEngine: failureThreshold must be finite");
    }

    let nSamples = input.nSamples ?? ImportanceSamplingReliabilityEngine.DEFAULT_SAMPLES;
    if (!Number.isFinite(nSamples) || nSamples < ImportanceSamplingReliabilityEngine.MIN_SAMPLES) {
      throw new Error(
        `ImportanceSamplingReliabilityEngine: nSamples must be an integer ≥ ${ImportanceSamplingReliabilityEngine.MIN_SAMPLES} (got ${input.nSamples})`,
      );
    }
    nSamples = Math.min(Math.floor(nSamples), ImportanceSamplingReliabilityEngine.MAX_SAMPLES);

    const seed = Number.isFinite(input.seed as number) ? (input.seed as number) >>> 0 : 12345;

    // Proposal std.
    let proposalStd: number[];
    if (input.proposalStd) {
      if (input.proposalStd.length !== d) {
        throw new Error(
          `ImportanceSamplingReliabilityEngine: proposalStd length ${input.proposalStd.length} ≠ input dimension ${d}`,
        );
      }
      for (let j = 0; j < d; j++) {
        if (!Number.isFinite(input.proposalStd[j]) || input.proposalStd[j] <= 0) {
          throw new Error(
            `ImportanceSamplingReliabilityEngine: proposalStd[${j}] must be finite and > 0 (got ${input.proposalStd[j]})`,
          );
        }
      }
      proposalStd = [...input.proposalStd];
    } else {
      proposalStd = [...gi.std];
    }

    // Explicit design point.
    let designPoint: number[] | undefined;
    if (input.designPoint) {
      if (input.designPoint.length !== d) {
        throw new Error(
          `ImportanceSamplingReliabilityEngine: designPoint length ${input.designPoint.length} ≠ input dimension ${d}`,
        );
      }
      for (let j = 0; j < d; j++) {
        if (!Number.isFinite(input.designPoint[j])) {
          throw new Error(
            `ImportanceSamplingReliabilityEngine: designPoint[${j}] is not finite`,
          );
        }
      }
      designPoint = [...input.designPoint];
    }

    return {
      g: input.limitState,
      mu0: [...gi.mean],
      sigma0: [...gi.std],
      d,
      mode,
      threshold,
      nSamples,
      seed,
      proposalStd,
      designPoint,
      autoShift: input.autoShift ?? true,
      maxDesignPointIter: input.maxDesignPointIter ?? 60,
    };
  }
}

interface ResolvedConfig {
  g: (x: number[]) => number;
  mu0: number[];
  sigma0: number[];
  d: number;
  mode: "below" | "above";
  threshold: number;
  nSamples: number;
  seed: number;
  proposalStd: number[];
  designPoint?: number[];
  autoShift: boolean;
  maxDesignPointIter: number;
}

/** Canonical singleton (matches monteCarloEngine / varianceReductionEngine style). */
export const importanceSamplingReliabilityEngine =
  new ImportanceSamplingReliabilityEngine();

/** Spec-named alias (`importancesamplingEngine`) for wiring convenience. */
export const importancesamplingEngine = importanceSamplingReliabilityEngine;
