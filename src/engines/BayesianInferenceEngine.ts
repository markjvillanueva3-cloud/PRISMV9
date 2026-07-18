/**
 * BayesianInferenceEngine — Bayesian statistical inference
 *
 * Models: Beta-binomial conjugate, Normal-Normal conjugate,
 *         posterior updates, credible intervals, Bayes factor
 * References: Gelman BDA, Kruschke DBDA
 */

export type PriorType = "beta_binomial" | "normal_normal" | "gamma_poisson";

export interface BayesianInferenceInput {
  prior_type?: PriorType;
  // Beta-binomial
  prior_alpha?: number;               // default 1 (uniform)
  prior_beta?: number;                // default 1
  successes?: number;                 // observed
  trials?: number;
  // Normal-Normal
  prior_mean?: number;                // default 0
  prior_variance?: number;            // default 100
  data_mean?: number;
  data_variance?: number;
  sample_size?: number;
  // Gamma-Poisson
  prior_shape?: number;               // default 1
  prior_rate?: number;                // default 0.1
  observed_count?: number;
  observation_time?: number;          // default 1
  credible_level?: number;            // default 0.95
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface BayesianInferenceResult {
  posterior_mean: AtomicValue;
  posterior_variance: AtomicValue;
  credible_lower: AtomicValue;
  credible_upper: AtomicValue;
  prior_mean: AtomicValue;
  bayes_factor: AtomicValue;
  effective_sample_size: AtomicValue;
  posterior_mode: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

// Approximate normal quantile
function normInv(p: number): number {
  const a = [0, -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [0, -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [0, -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [0, 7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
  const pLow = 0.02425;
  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[1]*q+c[2])*q+c[3])*q+c[4])*q+c[5])*q+c[6]) / ((((d[1]*q+d[2])*q+d[3])*q+d[4])*q+1);
  } else if (p <= 1 - pLow) {
    q = p - 0.5; r = q*q;
    return (((((a[1]*r+a[2])*r+a[3])*r+a[4])*r+a[5])*r+a[6])*q / (((((b[1]*r+b[2])*r+b[3])*r+b[4])*r+b[5])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[1]*q+c[2])*q+c[3])*q+c[4])*q+c[5])*q+c[6]) / ((((d[1]*q+d[2])*q+d[3])*q+d[4])*q+1);
  }
}

export class BayesianInferenceEngine {
  calculate(input: BayesianInferenceInput): BayesianInferenceResult {
    const {
      prior_type = "beta_binomial",
      credible_level = 0.95,
    } = input;

    const recs: string[] = [];
    const alpha2 = (1 - credible_level) / 2;
    const z = normInv(1 - alpha2);

    let postMean: number, postVar: number, postMode: number;
    let priorMean: number, ess: number, bf: number;

    if (prior_type === "beta_binomial") {
      const a0 = input.prior_alpha ?? 1;
      const b0 = input.prior_beta ?? 1;
      const k = input.successes ?? 5;
      const n = input.trials ?? 10;
      const a1 = a0 + k;
      const b1 = b0 + (n - k);
      postMean = a1 / (a1 + b1);
      postVar = (a1 * b1) / ((a1 + b1) ** 2 * (a1 + b1 + 1));
      postMode = (a1 > 1 && b1 > 1) ? (a1 - 1) / (a1 + b1 - 2) : postMean;
      priorMean = a0 / (a0 + b0);
      ess = a1 + b1;
      bf = 1 + n / (a0 + b0); // simplified
    } else if (prior_type === "normal_normal") {
      const mu0 = input.prior_mean ?? 0;
      const s0sq = input.prior_variance ?? 100;
      const xbar = input.data_mean ?? 5;
      const sSq = input.data_variance ?? 10;
      const n = input.sample_size ?? 10;
      const postPrec = 1 / s0sq + n / sSq;
      postVar = 1 / postPrec;
      postMean = postVar * (mu0 / s0sq + n * xbar / sSq);
      postMode = postMean;
      priorMean = mu0;
      ess = n + s0sq > 0 ? sSq / s0sq : 0;
      bf = Math.exp(-0.5 * (xbar - mu0) ** 2 / (sSq / n + s0sq));
    } else {
      // gamma_poisson
      const a0 = input.prior_shape ?? 1;
      const b0 = input.prior_rate ?? 0.1;
      const k = input.observed_count ?? 10;
      const t = input.observation_time ?? 1;
      const a1 = a0 + k;
      const b1 = b0 + t;
      postMean = a1 / b1;
      postVar = a1 / (b1 * b1);
      postMode = a1 > 1 ? (a1 - 1) / b1 : 0;
      priorMean = a0 / b0;
      ess = a1;
      bf = 1 + k / a0;
    }

    const postSd = Math.sqrt(postVar);
    const ciLow = postMean - z * postSd;
    const ciHigh = postMean + z * postSd;

    const isSafe = postVar > 0 && ess > 2;

    if (ess < 5) recs.push(`Low effective sample size ${ess.toFixed(0)} — posterior dominated by prior`);
    if (postSd > Math.abs(postMean) * 0.5 && postMean !== 0) recs.push(`Wide posterior — collect more data`);
    if (bf > 10) recs.push(`Strong evidence — Bayes factor ${bf.toFixed(1)} favors update`);
    if (bf < 0.1) recs.push(`Evidence against — Bayes factor ${bf.toFixed(3)} favors prior`);
    if (recs.length === 0) recs.push(`Posterior nominal — mean=${postMean.toFixed(4)}, CI=[${ciLow.toFixed(4)}, ${ciHigh.toFixed(4)}]`);

    return {
      posterior_mean: mkAv(Math.round(postMean * 10000) / 10000, "value", postSd, "conjugate"),
      posterior_variance: mkAv(Math.round(postVar * 100000) / 100000, "value²", postVar * 0.10, "conjugate"),
      credible_lower: mkAv(Math.round(ciLow * 10000) / 10000, "value", 0, `${(credible_level * 100)}%_CI`),
      credible_upper: mkAv(Math.round(ciHigh * 10000) / 10000, "value", 0, `${(credible_level * 100)}%_CI`),
      prior_mean: mkAv(Math.round(priorMean * 10000) / 10000, "value", 0, "prior"),
      bayes_factor: mkAv(Math.round(bf * 100) / 100, "ratio", bf * 0.15, "evidence"),
      effective_sample_size: mkAv(Math.round(ess * 10) / 10, "count", ess * 0.05, "posterior_precision"),
      posterior_mode: mkAv(Math.round(postMode * 10000) / 10000, "value", postSd, "MAP"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const bayesianInferenceEngine = new BayesianInferenceEngine();
