/**
 * Bayesian Wear Prediction Model
 *
 * Uses conjugate normal-normal Bayesian update to refine tool wear
 * predictions from observed data:
 *   posterior_precision = prior_precision + n / sigma_like^2
 *   posterior_mean = (prior_prec x mu_0 + like_prec x x_bar) / post_prec
 *
 * This progressively narrows uncertainty as more wear observations arrive,
 * enabling predictive maintenance and adaptive tool change scheduling.
 *
 * References:
 * - DeGroot, M.H. (2004). "Optimal Statistical Decisions"
 * - MIT 6.041 Probabilistic Systems Analysis (lecture on conjugate priors)
 * - Yen, Y.C. et al. (2004). "Bayesian Tool Life Estimation" IJMTM
 *
 * @module algorithms/BayesianWearModel
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
  WithWarnings,
} from "./types.js";

// ── Input / Output Types ────────────────────────────────────────────

export interface BayesianWearInput {
  /** Prior mean (expected tool life [min] or expected VB [mm]). */
  prior_mean: number;
  /** Prior standard deviation (uncertainty in prior). */
  prior_std: number;
  /** Array of observed values (actual tool life or VB measurements). */
  observations: number[];
  /** Likelihood standard deviation (measurement noise). Default: prior_std. */
  likelihood_std?: number;
  /** VB threshold for end-of-life [mm]. Default 0.3. */
  vb_threshold?: number;
}

export interface BayesianWearOutput extends WithWarnings {
  /** Posterior mean (updated prediction). */
  posterior_mean: number;
  /** Posterior standard deviation. */
  posterior_std: number;
  /** 95% credible interval [low, high]. */
  credible_interval_95: [number, number];
  /** 80% credible interval [low, high]. */
  credible_interval_80: [number, number];
  /** Number of observations used. */
  num_observations: number;
  /** Shrinkage factor (0 = stayed at prior, 1 = moved fully to data). */
  shrinkage: number;
  /** Uncertainty reduction ratio (posterior_std / prior_std). */
  uncertainty_reduction: number;
  /** Prior mean for reference. */
  prior_mean: number;
  /** Data mean for reference. */
  data_mean: number;
  /** Probability of exceeding threshold (if vb_threshold provided). */
  probability_exceed_threshold: number | null;
  /** Recommendation based on posterior. */
  recommendation: string;
  /** Calculation method tag. */
  calculation_method: string;
}

// ── Algorithm Implementation ────────────────────────────────────────

export class BayesianWearModel implements Algorithm<BayesianWearInput, BayesianWearOutput> {

  validate(input: BayesianWearInput): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (input.prior_mean === undefined) {
      issues.push({ field: "prior_mean", message: "Prior mean is required", severity: "error" });
    }
    if (!input.prior_std || input.prior_std <= 0) {
      issues.push({ field: "prior_std", message: `Prior std must be > 0, got ${input.prior_std}`, severity: "error" });
    }
    if (!input.observations || !Array.isArray(input.observations) || input.observations.length === 0) {
      issues.push({ field: "observations", message: "At least one observation is required", severity: "error" });
    }
    if (input.observations && input.observations.some(v => typeof v !== "number" || isNaN(v))) {
      issues.push({ field: "observations", message: "All observations must be valid numbers", severity: "error" });
    }
    if (input.likelihood_std !== undefined && input.likelihood_std <= 0) {
      issues.push({ field: "likelihood_std", message: `Likelihood std must be > 0, got ${input.likelihood_std}`, severity: "error" });
    }

    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: BayesianWearInput): BayesianWearOutput {
    const warnings: string[] = [];
    const {
      prior_mean, prior_std, observations,
      likelihood_std = prior_std,
      vb_threshold = 0.3,
    } = input;

    const n = observations.length;
    const data_mean = observations.reduce((a, b) => a + b, 0) / n;

    // Conjugate normal-normal Bayesian update
    const prior_prec = 1 / (prior_std * prior_std);
    const like_prec = n / (likelihood_std * likelihood_std);
    const post_prec = prior_prec + like_prec;
    const posterior_mean = (prior_prec * prior_mean + like_prec * data_mean) / post_prec;
    const posterior_std = Math.sqrt(1 / post_prec);

    // Credible intervals
    const credible_interval_95: [number, number] = [
      posterior_mean - 1.96 * posterior_std,
      posterior_mean + 1.96 * posterior_std,
    ];
    const credible_interval_80: [number, number] = [
      posterior_mean - 1.28 * posterior_std,
      posterior_mean + 1.28 * posterior_std,
    ];

    // Shrinkage: how much posterior moved from prior toward data
    const priorDataDist = Math.abs(data_mean - prior_mean);
    const shrinkage = priorDataDist > 1e-10
      ? Math.min(1, Math.abs(posterior_mean - prior_mean) / priorDataDist)
      : 0;

    // Uncertainty reduction
    const uncertainty_reduction = posterior_std / prior_std;

    // Probability of exceeding threshold (using standard normal CDF approximation)
    let probability_exceed_threshold: number | null = null;
    if (vb_threshold !== undefined) {
      const z = (vb_threshold - posterior_mean) / posterior_std;
      probability_exceed_threshold = 1 - this.normalCDF(z);
    }

    // Warnings
    if (shrinkage > 0.8 && Math.abs(data_mean - prior_mean) > 2 * prior_std) {
      warnings.push(`PRIOR_MISMATCH: Data mean (${data_mean.toFixed(3)}) differs significantly from prior (${prior_mean.toFixed(3)}). Prior may be miscalibrated.`);
    }
    if (n < 3) {
      warnings.push("FEW_OBSERVATIONS: < 3 data points. Posterior still heavily influenced by prior.");
    }
    if (probability_exceed_threshold !== null && probability_exceed_threshold > 0.8) {
      warnings.push(`HIGH_EXCEED_PROB: ${(probability_exceed_threshold * 100).toFixed(0)}% probability of exceeding VB threshold ${vb_threshold} mm.`);
    }

    // Recommendation
    let recommendation: string;
    if (probability_exceed_threshold !== null && probability_exceed_threshold > 0.9) {
      recommendation = "REPLACE: Very high probability of threshold exceedance. Replace tool.";
    } else if (probability_exceed_threshold !== null && probability_exceed_threshold > 0.5) {
      recommendation = "MONITOR: Significant probability of threshold exceedance. Monitor closely.";
    } else if (uncertainty_reduction > 0.8) {
      recommendation = "COLLECT_MORE: More observations needed to narrow uncertainty.";
    } else {
      recommendation = "OK: Wear prediction within acceptable bounds.";
    }

    return {
      posterior_mean,
      posterior_std,
      credible_interval_95,
      credible_interval_80,
      num_observations: n,
      shrinkage,
      uncertainty_reduction,
      prior_mean,
      data_mean,
      probability_exceed_threshold,
      recommendation,
      warnings,
      calculation_method: "Conjugate normal-normal Bayesian update",
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "bayesian-wear",
      name: "Bayesian Wear Prediction Model",
      description: "Conjugate normal-normal Bayesian update for progressive wear prediction refinement",
      formula: "post_prec = prior_prec + n/sigma^2; post_mean = (prior_prec*mu0 + like_prec*xbar) / post_prec",
      reference: "DeGroot (2004); MIT 6.041; Yen et al. (2004) IJMTM",
      safety_class: "standard",
      domain: "tool_life",
      inputs: {
        prior_mean: "Prior mean (expected value)",
        prior_std: "Prior standard deviation",
        observations: "Observed values array",
        likelihood_std: "Measurement noise std",
      },
      outputs: {
        posterior_mean: "Updated mean prediction",
        posterior_std: "Updated uncertainty",
        credible_interval_95: "95% credible interval",
        probability_exceed_threshold: "P(exceed VB threshold)",
      },
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────

  /** Standard normal CDF approximation (Abramowitz & Stegun). */
  private normalCDF(z: number): number {
    if (z < -8) return 0;
    if (z > 8) return 1;

    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    const x = Math.abs(z) / Math.sqrt(2);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }
}
