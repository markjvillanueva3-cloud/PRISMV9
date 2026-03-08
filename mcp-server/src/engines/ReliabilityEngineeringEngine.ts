/**
 * PRISM MCP Server — Reliability Engineering Engine
 *
 * Eight reliability/maintenance models for CNC manufacturing:
 * Cox PH, competing risks, Wiener/Gamma degradation, Bayesian RUL,
 * optimal replacement, delay-time inspection, and renewal theory.
 *
 * @module ReliabilityEngineeringEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface CoxObservation { time: number; event: boolean; covariates: number[]; }
export interface CoxPHResult { coefficients: number[]; hazard_ratios: number[]; log_likelihood: number; concordance_index: number; }
export interface CompetingRisksFailure { time: number; mode: string; }
export interface ModeResult { hazard_rate: number; cumulative_incidence: number[]; probability_at_time: (t: number) => number; }
export interface CompetingRisksResult { modes: Record<string, ModeResult>; overall_survival: number[]; time_points: number[]; }
export interface WienerDegradationResult { drift_rate: number; diffusion: number; current_state: number; rul_mean: number; rul_std: number; rul_percentiles: { p10: number; p50: number; p90: number }; }
export interface GammaDegradationResult { shape_rate: number; scale: number; current_degradation: number; rul_mean: number; rul_percentiles: { p10: number; p50: number; p90: number }; }
export interface BayesianRULResult { posterior_drift: number; posterior_drift_var: number; rul_distribution: { mean: number; std: number; p10: number; p50: number; p90: number }; confidence: number; }
export interface OptimalReplacementResult { optimal_interval: number; expected_cost_rate: number; availability: number; cost_savings_vs_runToFailure_pct: number; }
export interface DelayTimeResult { optimal_inspection_interval_hours: number; expected_downtime_pct: number; expected_cost_rate: number; }
export interface RenewalTheoryResult { long_run_cost_rate: number; expected_replacements_per_1000h: number; preventive_pct: number; failure_pct: number; optimal_interval: number; }

// ============================================================================
// MATH HELPERS
// ============================================================================

/** Gamma function (Lanczos approximation). */
function gammaFn(z: number): number {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gammaFn(1 - z));
  z -= 1;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  let x = c[0];
  for (let i = 1; i < 9; i++) x += c[i] / (z + i);
  const t = z + 7.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

/** Lower regularized incomplete gamma P(s,x). */
function gammaCDF(s: number, x: number): number {
  if (x <= 0) return 0;
  let sum = 0, term = 1 / s;
  for (let n = 0; n < 200; n++) { sum += term; term *= x / (s + n + 1); if (Math.abs(term) < 1e-14) break; }
  return Math.pow(x, s) * Math.exp(-x) * sum / gammaFn(s);
}

/** Standard normal CDF (Abramowitz & Stegun). */
function normCDF(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
}

/** Inverse normal CDF (rational approximation). */
function normInv(p: number): number {
  if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
  if (p < 0.5) return -normInv(1 - p);
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  if (p < 0.02425) {
    const q = Math.sqrt(-2 * Math.log(p));
    const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
    const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  const q = p - 0.5, r = q * q;
  return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}

/** Inverse Gaussian CDF for RUL distributions. */
function invGaussianCDF(x: number, mu: number, lam: number): number {
  if (x <= 0) return 0;
  const sq = Math.sqrt(lam / x);
  return normCDF(sq * (x / mu - 1)) + Math.exp(2 * lam / mu) * normCDF(-sq * (x / mu + 1));
}

/** Weibull CDF, reliability, hazard. */
const wCDF = (t: number, b: number, e: number) => t <= 0 ? 0 : 1 - Math.exp(-Math.pow(t / e, b));
const wR = (t: number, b: number, e: number) => t <= 0 ? 1 : Math.exp(-Math.pow(t / e, b));

/** Simpson's rule for integral of f from 0 to T. */
function simpson(f: (t: number) => number, T: number, n = 200): number {
  const h = T / n;
  let s = f(0) + f(T);
  for (let i = 1; i < n; i++) s += (i % 2 === 0 ? 2 : 4) * f(i * h);
  return s * h / 3;
}

/** Golden section search for minimum of f on [a,b]. */
function goldenMin(f: (x: number) => number, a: number, b: number): number {
  const phi = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < 80; i++) {
    const c = b - (b - a) / phi, d = a + (b - a) / phi;
    if (f(c) < f(d)) b = d; else a = c;
  }
  return (a + b) / 2;
}

/** Gaussian elimination for small linear systems Ax=b. */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const aug = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let mr = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(aug[r][col]) > Math.abs(aug[mr][col])) mr = r;
    [aug[col], aug[mr]] = [aug[mr], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-14) continue;
    for (let r = col + 1; r < n; r++) { const f = aug[r][col] / aug[col][col]; for (let j = col; j <= n; j++) aug[r][j] -= f * aug[col][j]; }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = aug[i][n]; for (let j = i + 1; j < n; j++) s -= aug[i][j] * x[j]; x[i] = Math.abs(aug[i][i]) > 1e-14 ? s / aug[i][i] : 0; }
  return x;
}

/** Bisection to invert a monotone CDF. */
function cdfQuantile(cdf: (t: number) => number, p: number, hi: number): number {
  let lo = 0;
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (cdf(m) < p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

// ============================================================================
// ENGINE
// ============================================================================

class ReliabilityEngineeringEngineImpl {

  /**
   * Cox Proportional Hazards model: h(t|X) = h0(t) * exp(B'X).
   * Estimates how cutting parameters (speed, feed, DOC) affect tool failure hazard.
   * Uses partial likelihood estimation with Newton-Raphson iteration.
   */
  coxProportionalHazards(input: { observations: CoxObservation[] }): CoxPHResult {
    const obs = [...input.observations].sort((a, b) => a.time - b.time);
    const n = obs.length, p = obs[0].covariates.length;
    const beta = new Array(p).fill(0);

    for (let iter = 0; iter < 50; iter++) {
      const grad = new Array(p).fill(0);
      const hess = Array.from({ length: p }, () => new Array(p).fill(0));
      for (let i = 0; i < n; i++) {
        if (!obs[i].event) continue;
        let s0 = 0; const s1 = new Array(p).fill(0);
        const s2 = Array.from({ length: p }, () => new Array(p).fill(0));
        for (let j = 0; j < n; j++) {
          if (obs[j].time < obs[i].time) continue;
          let lp = 0; for (let k = 0; k < p; k++) lp += beta[k] * obs[j].covariates[k];
          const w = Math.exp(lp); s0 += w;
          for (let k = 0; k < p; k++) { s1[k] += w * obs[j].covariates[k]; for (let l = 0; l < p; l++) s2[k][l] += w * obs[j].covariates[k] * obs[j].covariates[l]; }
        }
        for (let k = 0; k < p; k++) { grad[k] += obs[i].covariates[k] - s1[k] / s0; for (let l = 0; l < p; l++) hess[k][l] -= s2[k][l] / s0 - (s1[k] * s1[l]) / (s0 * s0); }
      }
      const delta = solveLinear(hess, grad);
      let mx = 0; for (let k = 0; k < p; k++) { beta[k] -= delta[k]; mx = Math.max(mx, Math.abs(delta[k])); }
      if (mx < 1e-8) break;
    }

    // Log partial likelihood
    let logLik = 0;
    for (let i = 0; i < n; i++) {
      if (!obs[i].event) continue;
      let lpi = 0; for (let k = 0; k < p; k++) lpi += beta[k] * obs[i].covariates[k];
      let rs = 0; for (let j = 0; j < n; j++) { if (obs[j].time < obs[i].time) continue; let lpj = 0; for (let k = 0; k < p; k++) lpj += beta[k] * obs[j].covariates[k]; rs += Math.exp(lpj); }
      logLik += lpi - Math.log(rs);
    }

    // Concordance index
    let conc = 0, comp = 0;
    for (let i = 0; i < n; i++) { if (!obs[i].event) continue; for (let j = 0; j < n; j++) { if (obs[j].time <= obs[i].time) continue; comp++; let a = 0, b = 0; for (let k = 0; k < p; k++) { a += beta[k] * obs[i].covariates[k]; b += beta[k] * obs[j].covariates[k]; } if (a > b) conc++; else if (a === b) conc += 0.5; } }

    log.info("[ReliabilityEng] " + `Cox PH: ${p} covariates, logLik=${logLik.toFixed(3)}`);
    return { coefficients: beta, hazard_ratios: beta.map(b => Math.exp(b)), log_likelihood: logLik, concordance_index: comp > 0 ? conc / comp : 0.5 };
  }

  /**
   * Competing failure modes analysis.
   * Cause-specific hazard h_k(t) per mode; CIF_k(t) = integral_0^t h_k(u)*S(u) du.
   * Common CNC modes: flank wear, crater wear, chipping, fracture.
   */
  competingRisks(input: { failures: CompetingRisksFailure[]; modes: string[] }): CompetingRisksResult {
    const { failures, modes } = input;
    const sorted = [...failures].sort((a, b) => a.time - b.time);
    const N = sorted.length, tMax = sorted[N - 1].time, nPts = 50, dt = tMax / nPts;
    const timePoints = Array.from({ length: nPts + 1 }, (_, i) => i * dt);

    const modeCounts: Record<string, number> = {};
    for (const m of modes) modeCounts[m] = 0;
    for (const f of sorted) modeCounts[f.mode] = (modeCounts[f.mode] || 0) + 1;

    // Kaplan-Meier overall survival
    const survival = [1.0];
    let atRisk = N, sIdx = 0;
    for (let i = 1; i <= nPts; i++) {
      let ev = 0; while (sIdx < N && sorted[sIdx].time <= timePoints[i]) { ev++; sIdx++; }
      survival.push(survival[i - 1] * (atRisk - ev) / Math.max(atRisk, 1)); atRisk -= ev;
    }

    const result: Record<string, ModeResult> = {};
    for (const m of modes) {
      const mf = sorted.filter(f => f.mode === m);
      const hz = modeCounts[m] / (N * tMax);
      const cif: number[] = [0]; let mIdx = 0, cum = 0;
      for (let i = 1; i <= nPts; i++) {
        let me = 0; while (mIdx < mf.length && mf[mIdx].time <= timePoints[i]) { me++; mIdx++; }
        const nr = Math.max(N - sorted.filter(s => s.time < timePoints[i - 1]).length, 1);
        cum += (me / nr) * survival[i - 1]; cif.push(cum);
      }
      result[m] = { hazard_rate: hz, cumulative_incidence: cif, probability_at_time: (t: number) => cif[Math.min(Math.floor(t / dt), nPts)] };
    }
    log.info("[ReliabilityEng] " + `Competing risks: ${modes.length} modes, ${N} obs`);
    return { modes: result, overall_survival: survival, time_points: timePoints };
  }

  /**
   * Wiener process degradation for RUL estimation.
   * X(t) = X(0) + mu*t + sigma*W(t). First passage to threshold D ~ Inverse Gaussian.
   * RUL PDF: f(t) = (D-x)/sqrt(2*pi*sigma^2*t^3) * exp(-(D-x-mu*t)^2/(2*sigma^2*t))
   */
  wienerDegradation(input: { observations: number[]; threshold: number; time_interval: number }): WienerDegradationResult {
    const { observations: obs, threshold: D, time_interval: dt } = input;
    const n = obs.length, cur = obs[n - 1], rem = D - cur;
    const inc: number[] = []; for (let i = 1; i < n; i++) inc.push(obs[i] - obs[i - 1]);
    const mu = inc.reduce((s, v) => s + v, 0) / (inc.length * dt);
    const sigma = Math.sqrt(inc.reduce((s, v) => s + (v - mu * dt) ** 2, 0) / (inc.length * dt));

    // Inverse Gaussian params: mu_ig = rem/mu, lambda_ig = rem^2/sigma^2
    const muIG = rem / Math.max(mu, 1e-12), lamIG = rem ** 2 / Math.max(sigma ** 2, 1e-12);
    const rulMean = Math.max(muIG, 0), rulStd = Math.sqrt(Math.max(muIG ** 3 / lamIG, 0));
    const q = (p: number) => cdfQuantile(t => invGaussianCDF(t, muIG, lamIG), p, muIG * 5);

    log.info("[ReliabilityEng] " + `Wiener RUL: drift=${mu.toFixed(5)}, mean=${rulMean.toFixed(1)}`);
    return { drift_rate: mu, diffusion: sigma, current_state: cur, rul_mean: rulMean, rul_std: rulStd, rul_percentiles: { p10: q(0.1), p50: q(0.5), p90: q(0.9) } };
  }

  /**
   * Gamma process degradation for RUL (monotonically increasing, e.g. flank wear VB).
   * X(t) ~ Gamma(alpha*t, beta). RUL CDF: P(RUL<=t) = 1 - P(s=alpha*t, x=rem/beta).
   */
  gammaDegradation(input: { observations: number[]; threshold_mm: number; time_interval: number }): GammaDegradationResult {
    const { observations: obs, threshold_mm: D, time_interval: dt } = input;
    const n = obs.length, cur = obs[n - 1], rem = D - cur;
    const inc: number[] = []; for (let i = 1; i < n; i++) inc.push(Math.max(obs[i] - obs[i - 1], 1e-12));
    const meanI = inc.reduce((s, v) => s + v, 0) / inc.length;
    const varI = inc.reduce((s, v) => s + (v - meanI) ** 2, 0) / Math.max(inc.length - 1, 1);
    const beta = varI / Math.max(meanI, 1e-12), alpha = meanI / (dt * Math.max(beta, 1e-12));
    const rulCDF = (t: number) => t <= 0 || rem <= 0 ? (rem <= 0 ? 1 : 0) : 1 - gammaCDF(alpha * t, rem / beta);
    const q = (p: number) => cdfQuantile(rulCDF, p, (rem / (alpha * beta)) * 5);

    log.info("[ReliabilityEng] " + `Gamma RUL: alpha=${alpha.toFixed(4)}, beta=${beta.toFixed(4)}, VB=${cur.toFixed(3)}mm`);
    return { shape_rate: alpha, scale: beta, current_degradation: cur, rul_mean: Math.max(rem / (alpha * beta), 0), rul_percentiles: { p10: q(0.1), p50: q(0.5), p90: q(0.9) } };
  }

  /**
   * Bayesian RUL with conjugate normal updating.
   * Prior: drift ~ N(mu0, v0). Updates with new degradation increments.
   * Posterior predictive RUL via updated inverse Gaussian parameters.
   */
  bayesianRUL(input: { prior_drift: number; prior_drift_var: number; diffusion: number; threshold: number; new_observations: number[] }): BayesianRULResult {
    const { prior_drift: mu0, prior_drift_var: v0, diffusion: sigma, threshold: D, new_observations: obs } = input;
    if (obs.length < 2) return { posterior_drift: mu0, posterior_drift_var: v0, rul_distribution: { mean: D / mu0, std: 0, p10: 0, p50: D / mu0, p90: 0 }, confidence: 0 };

    const inc: number[] = []; for (let i = 1; i < obs.length; i++) inc.push(obs[i] - obs[i - 1]);
    const sumInc = inc.reduce((s, v) => s + v, 0), nI = inc.length;
    const tau0 = 1 / v0, tauD = nI / (sigma * sigma), tauN = tau0 + tauD;
    const vN = 1 / tauN, muN = vN * (tau0 * mu0 + sumInc / (sigma * sigma));
    const rem = D - obs[obs.length - 1];
    const rulMean = rem > 0 && muN > 0 ? rem / muN : 0;
    const rulVar = rem > 0 && muN > 0 ? (rem * sigma * sigma) / (muN ** 3) + (rem * rem * vN) / (muN ** 4) : 0;
    const rulStd = Math.sqrt(Math.max(rulVar, 0));
    const confidence = Math.max(Math.min(1 - vN / v0, 1), 0);

    log.info("[ReliabilityEng] " + `Bayesian RUL: posterior=${muN.toFixed(5)}, mean=${rulMean.toFixed(1)}, conf=${confidence.toFixed(3)}`);
    return { posterior_drift: muN, posterior_drift_var: vN,
      rul_distribution: { mean: rulMean, std: rulStd, p10: Math.max(rulMean + normInv(0.1) * rulStd, 0), p50: Math.max(rulMean, 0), p90: Math.max(rulMean + normInv(0.9) * rulStd, 0) }, confidence };
  }

  /**
   * Optimal age-based replacement policy.
   * Minimize C(T) = [Cp + (Cf-Cp)*F(T)] / integral_0^T R(t)dt
   * where F = Weibull CDF, R = Weibull reliability.
   */
  optimalReplacement(input: { preventive_cost: number; failure_cost: number; weibull_shape: number; weibull_scale: number }): OptimalReplacementResult {
    const { preventive_cost: Cp, failure_cost: Cf, weibull_shape: b, weibull_scale: e } = input;
    const cr = (T: number) => (Cp + (Cf - Cp) * wCDF(T, b, e)) / Math.max(simpson(t => wR(t, b, e), T), 1e-12);
    const optT = goldenMin(cr, e * 0.01, e * 3);
    const optCost = cr(optT);
    const meanLife = e * gammaFn(1 + 1 / b);
    const rtfRate = Cf / meanLife;
    const savings = Math.max(((rtfRate - optCost) / rtfRate) * 100, 0);
    const avail = simpson(t => wR(t, b, e), optT) / optT;

    log.info("[ReliabilityEng] " + `Replacement: T*=${optT.toFixed(1)}, savings=${savings.toFixed(1)}%`);
    return { optimal_interval: optT, expected_cost_rate: optCost, availability: avail, cost_savings_vs_runToFailure_pct: savings };
  }

  /**
   * Delay-time maintenance model (two-stage defect-to-failure).
   * Defects arrive ~ Poisson(lambda), delay h ~ Exp(1/meanH).
   * Optimal inspection interval T minimizes (Ci + failure_cost) / T.
   */
  delayTimeModel(input: { defect_rate_per_hour: number; mean_delay_hours: number; inspection_cost: number; downtime_cost_per_hour: number; repair_time_hours: number }): DelayTimeResult {
    const { defect_rate_per_hour: lam, mean_delay_hours: meanH, inspection_cost: Ci, downtime_cost_per_hour: Cd, repair_time_hours: Tr } = input;
    const mu = 1 / meanH;
    // Expected failures per interval: lam * [T - (1-exp(-mu*T))/mu]
    const cr = (T: number) => { const ef = lam * (T - (1 - Math.exp(-mu * T)) / mu); return (Ci + ef * Cd * Tr) / T; };
    const optT = goldenMin(cr, 0.1, meanH * 10);
    const ef = lam * (optT - (1 - Math.exp(-mu * optT)) / mu);
    const downtimePct = (ef * Tr / optT) * 100;

    log.info("[ReliabilityEng] " + `Delay-time: T*=${optT.toFixed(1)}h, downtime=${downtimePct.toFixed(2)}%`);
    return { optimal_inspection_interval_hours: optT, expected_downtime_pct: downtimePct, expected_cost_rate: cr(optT) };
  }

  /**
   * Renewal theory for long-run replacement costs.
   * Cost rate = E[cycle cost] / E[cycle length].
   * E[cost] = Cp*R(T) + Cf*F(T), E[length] = integral_0^T R(t)dt.
   */
  renewalTheory(input: { weibull_shape: number; weibull_scale: number; preventive_cost: number; failure_cost: number; planned_interval: number }): RenewalTheoryResult {
    const { weibull_shape: b, weibull_scale: e, preventive_cost: Cp, failure_cost: Cf, planned_interval: T } = input;
    const RT = wR(T, b, e), FT = wCDF(T, b, e);
    const eCost = Cp * RT + Cf * FT;
    const eLen = simpson(t => wR(t, b, e), T, 500);
    const rate = eCost / Math.max(eLen, 1e-12);
    const cr = (t: number) => (Cp * wR(t, b, e) + Cf * wCDF(t, b, e)) / Math.max(simpson(u => wR(u, b, e), t), 1e-12);
    const optT = goldenMin(cr, e * 0.01, e * 3);

    log.info("[ReliabilityEng] " + `Renewal: rate=${rate.toFixed(4)}, optimal=${optT.toFixed(1)}`);
    return { long_run_cost_rate: rate, expected_replacements_per_1000h: 1000 / Math.max(eLen, 1e-12), preventive_pct: RT * 100, failure_pct: FT * 100, optimal_interval: optT };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const reliabilityEngineeringEngine = new ReliabilityEngineeringEngineImpl();
