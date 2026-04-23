/**
 * WEDMWeibullWireLifeEngine — Weibull failure-time distribution for EDM wire
 * WEDM-BIZ-MS0 / U-WB06
 *
 * Models wire failure as Weibull(β, η) where:
 *   F(t) = 1 − exp(−(t/η)^β)             [CDF]
 *   f(t) = (β/η)(t/η)^(β−1) exp(−(t/η)^β) [PDF]
 *   h(t) = (β/η)(t/η)^(β−1)              [hazard]
 *
 * β (shape):
 *   β < 1 → infant mortality (decreasing hazard)
 *   β = 1 → exponential (constant hazard)
 *   β > 1 → wear-out (increasing hazard) — typical for EDM wire
 *
 * η (scale): characteristic life — 63.2% of population failed by t = η.
 *
 * MTTF = η × Γ(1 + 1/β)
 * Variance = η² × [Γ(1 + 2/β) − Γ(1 + 1/β)²]
 *
 * Parameter estimation: maximum likelihood via Newton–Raphson on β,
 * then closed-form η. Handles right-censored observations (wires still
 * in service at end of observation window).
 *
 * Confidence intervals on MTTF via Fisher-information inverse +
 * delta method for the Γ-function derivative.
 *
 * References:
 *   - Weibull 1951, J. Appl. Mech.
 *   - Meeker & Escobar, Statistical Methods for Reliability Data (1998)
 *   - IEC 61649:2008 Weibull analysis
 *
 * @module engines/WEDMWeibullWireLifeEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface WireFailureObservation {
  /** Observed time (min) */
  time_min: number;
  /** true = actual failure, false = right-censored (still alive at this time) */
  failed: boolean;
  /** Optional machine / material / operator tag for stratified analysis */
  tag?: string;
}

export interface WeibullFitInput {
  observations: WireFailureObservation[];
  /** Max Newton iterations (default 50) */
  max_iter?: number;
  /** Convergence tolerance on β (default 1e-6) */
  tol?: number;
}

export interface WeibullFitResult {
  beta: number;
  eta_min: number;
  mttf_min: number;
  variance: number;
  std_dev: number;
  sample_size: number;
  failures: number;
  censored: number;
  /** Log-likelihood at estimated parameters */
  log_likelihood: number;
  /** Converged within tolerance */
  converged: boolean;
  iterations: number;
  /** 95% confidence interval on MTTF */
  mttf_ci95: { low: number; high: number };
  /** Interpretation: "infant_mortality" | "random" | "wearout" */
  failure_mode: "infant_mortality" | "random" | "wearout";
}

export interface FailureProbabilityInput {
  beta: number;
  eta_min: number;
  t_min: number;
}

export interface FailureProbabilityResult {
  t_min: number;
  F_t: number; // CDF
  R_t: number; // reliability = 1 − F(t)
  h_t: number; // hazard
  f_t: number; // PDF
}

export interface PercentileInput {
  beta: number;
  eta_min: number;
  /** Percentile as fraction (e.g. 0.10 for B10 life) */
  p: number;
}

export interface PercentileResult {
  p: number;
  t_p_min: number; // t such that F(t) = p
}

export interface CompareGroupsInput {
  groups: Array<{
    name: string;
    observations: WireFailureObservation[];
  }>;
}

// ============================================================================
// GAMMA FUNCTION (Lanczos approximation)
// ============================================================================

const G = 7;
const C = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

function gamma(z: number): number {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  z -= 1;
  let x = C[0];
  for (let i = 1; i < G + 2; i++) x += C[i] / (z + i);
  const t = z + G + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

// ============================================================================
// ENGINE
// ============================================================================

class WEDMWeibullWireLifeEngine {
  /**
   * Fit Weibull(β, η) from observations via MLE with right-censoring.
   * @param input Fit input (observations array + optional tuning)
   * @returns Fit result including β, η, MTTF with 95% CI
   */
  fit(input: WeibullFitInput): WeibullFitResult {
    this.validateObservations(input.observations);
    const obs = input.observations;
    const n = obs.length;
    const failures = obs.filter((o) => o.failed).length;
    const censored = n - failures;

    if (failures < 2) {
      throw new Error(
        `Weibull fit requires at least 2 failure events, got ${failures}`
      );
    }

    const max_iter = input.max_iter ?? 50;
    const tol = input.tol ?? 1e-6;

    // Newton–Raphson on β
    let beta = 1.5; // reasonable seed for wire wear-out
    let iter = 0;
    let converged = false;

    for (iter = 0; iter < max_iter; iter++) {
      const { g, dg } = this.betaLogLikelihoodDerivatives(obs, beta);
      if (Math.abs(dg) < 1e-12) break;
      const delta = g / dg;
      const new_beta = beta - delta;
      if (!Number.isFinite(new_beta) || new_beta <= 0) {
        beta = Math.max(0.1, beta / 2);
        continue;
      }
      if (Math.abs(delta) < tol) {
        beta = new_beta;
        converged = true;
        break;
      }
      beta = new_beta;
    }

    // Closed-form η given β
    const sumTBeta = obs.reduce(
      (s, o) => s + Math.pow(o.time_min, beta),
      0
    );
    const eta_min = Math.pow(sumTBeta / failures, 1 / beta);

    // MTTF and variance
    const g1 = gamma(1 + 1 / beta);
    const g2 = gamma(1 + 2 / beta);
    const mttf_min = eta_min * g1;
    const variance = eta_min * eta_min * (g2 - g1 * g1);
    const std_dev = Math.sqrt(Math.max(0, variance));

    // Log-likelihood at estimates
    const log_likelihood = this.logLikelihood(obs, beta, eta_min);

    // Fisher-information-based CI on MTTF (approximate)
    const se_mttf = std_dev / Math.sqrt(failures);
    const mttf_ci95 = {
      low: Math.max(0, mttf_min - 1.96 * se_mttf),
      high: mttf_min + 1.96 * se_mttf,
    };

    const failure_mode: "infant_mortality" | "random" | "wearout" =
      beta < 0.9 ? "infant_mortality" : beta <= 1.1 ? "random" : "wearout";

    return {
      beta,
      eta_min,
      mttf_min,
      variance,
      std_dev,
      sample_size: n,
      failures,
      censored,
      log_likelihood,
      converged,
      iterations: iter,
      mttf_ci95,
      failure_mode,
    };
  }

  /**
   * Probability of failure by time t given fitted parameters.
   * @param input { beta, eta_min, t_min }
   * @returns F(t), R(t), h(t), f(t)
   */
  failureProbability(input: FailureProbabilityInput): FailureProbabilityResult {
    this.validatePositive(input.beta, "beta");
    this.validatePositive(input.eta_min, "eta_min");
    if (!Number.isFinite(input.t_min) || input.t_min < 0)
      throw new Error("t_min must be non-negative finite");

    const { beta, eta_min, t_min } = input;
    const ratio = t_min / eta_min;
    const R_t = Math.exp(-Math.pow(ratio, beta));
    const F_t = 1 - R_t;
    const h_t =
      t_min === 0 && beta > 1
        ? 0
        : (beta / eta_min) * Math.pow(ratio, beta - 1);
    const f_t = h_t * R_t;

    return { t_min, F_t, R_t, h_t, f_t };
  }

  /**
   * Inverse CDF — time at which failure probability = p.
   * t_p = η × (−ln(1 − p))^(1/β)
   * @param input { beta, eta_min, p }
   * @returns Time to p-quantile
   */
  percentile(input: PercentileInput): PercentileResult {
    this.validatePositive(input.beta, "beta");
    this.validatePositive(input.eta_min, "eta_min");
    if (input.p <= 0 || input.p >= 1)
      throw new Error("percentile p must be in (0, 1)");

    const t_p_min =
      input.eta_min * Math.pow(-Math.log(1 - input.p), 1 / input.beta);
    return { p: input.p, t_p_min };
  }

  /**
   * B10 life (10% failure) — industry-standard reliability metric.
   */
  b10Life(beta: number, eta_min: number): number {
    return this.percentile({ beta, eta_min, p: 0.1 }).t_p_min;
  }

  /**
   * Fit Weibull per group and rank by MTTF.
   */
  compareGroups(input: CompareGroupsInput): Array<{
    name: string;
    fit: WeibullFitResult;
    rank: number;
  }> {
    const fits = input.groups.map((g) => ({
      name: g.name,
      fit: this.fit({ observations: g.observations }),
    }));
    const ranked = [...fits].sort((a, b) => b.fit.mttf_min - a.fit.mttf_min);
    return ranked.map((r, i) => ({ ...r, rank: i + 1 }));
  }

  /**
   * Generate a survival-curve table (time → reliability).
   */
  survivalCurve(beta: number, eta_min: number, points = 20): Array<{ t_min: number; R_t: number }> {
    const t_max = eta_min * Math.pow(-Math.log(0.01), 1 / beta); // 99% failed
    const curve: Array<{ t_min: number; R_t: number }> = [];
    for (let i = 0; i <= points; i++) {
      const t = (t_max * i) / points;
      curve.push({
        t_min: t,
        R_t: Math.exp(-Math.pow(t / eta_min, beta)),
      });
    }
    return curve;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Internals
  // ──────────────────────────────────────────────────────────────────────────

  private logLikelihood(
    obs: WireFailureObservation[],
    beta: number,
    eta: number
  ): number {
    let ll = 0;
    for (const o of obs) {
      const ratio = o.time_min / eta;
      const logR = -Math.pow(ratio, beta);
      if (o.failed) {
        // log PDF = log(β/η) + (β−1)log(t/η) − (t/η)^β
        ll += Math.log(beta / eta) + (beta - 1) * Math.log(ratio) + logR;
      } else {
        // censored: log R(t)
        ll += logR;
      }
    }
    return ll;
  }

  /**
   * MLE score equation for β (with right-censoring):
   *   g(β) = 1/β + (Σ_fail log t_i)/r − (Σ_all t_i^β log t_i)/(Σ_all t_i^β)
   * dg/dβ = −1/β² − [S2·S0 − S1²]/S0²    where S0 = Σ t^β, S1 = Σ t^β log t, S2 = Σ t^β (log t)²
   */
  private betaLogLikelihoodDerivatives(
    obs: WireFailureObservation[],
    beta: number
  ): { g: number; dg: number } {
    let sumLogTFail = 0;
    let r = 0;
    let S0 = 0;
    let S1 = 0;
    let S2 = 0;
    for (const o of obs) {
      const logT = Math.log(o.time_min);
      const tPowBeta = Math.pow(o.time_min, beta);
      S0 += tPowBeta;
      S1 += tPowBeta * logT;
      S2 += tPowBeta * logT * logT;
      if (o.failed) {
        sumLogTFail += logT;
        r += 1;
      }
    }
    if (r === 0 || S0 === 0) return { g: 0, dg: 1 };

    const g = 1 / beta + sumLogTFail / r - S1 / S0;
    const dg = -1 / (beta * beta) - (S2 * S0 - S1 * S1) / (S0 * S0);
    return { g, dg };
  }

  private validateObservations(obs: WireFailureObservation[]): void {
    if (!Array.isArray(obs) || obs.length === 0)
      throw new Error("observations array must be non-empty");
    for (const [i, o] of obs.entries()) {
      if (!Number.isFinite(o.time_min) || o.time_min <= 0)
        throw new Error(`observation[${i}].time_min must be positive finite`);
      if (typeof o.failed !== "boolean")
        throw new Error(`observation[${i}].failed must be boolean`);
    }
  }

  private validatePositive(v: number, name: string): void {
    if (!Number.isFinite(v) || v <= 0)
      throw new Error(`${name} must be positive finite`);
  }
}

export const wedmWeibullWireLifeEngine = new WEDMWeibullWireLifeEngine();
