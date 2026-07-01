/**
 * PRISM MCP Server -- Tool Life Adaptive Engine
 *
 * Real-time tool life prediction and replacement optimization using
 * online Weibull parameter estimation and cost-optimal scheduling.
 *
 * Models: Online Weibull MLE (β, η), hazard rate h(t)=(β/η)·(t/η)^(β−1),
 * reliability R(t)=exp(−(t/η)^β), RUL with CI, cost-optimal replacement,
 * wear trend detection (Taylor's three-region model).
 *
 * References:
 * - Taylor, F.W. (1907). "On the Art of Cutting Metals." Trans. ASME, 28.
 * - Weibull, W. (1951). "A statistical distribution of wide applicability."
 * - Abernethy, R.B. (2006). "The New Weibull Handbook." 5th Ed.
 * - ISO 3685:1993 Tool-life testing with single-point turning tools.
 *
 * @module ToolLifeAdaptiveEngine
 */

import { log } from "../utils/Logger.js";

// --- Types -------------------------------------------------------------------

export interface ToolLifeAdaptiveInput {
  wear_observations: Array<{
    time_min: number;
    vb_mm: number;
    crater_depth_mm?: number;
    force_ratio?: number;
  }>;
  vb_limit_mm?: number;
  prior?: { beta?: number; eta_min?: number };
  costs?: {
    tool_cost?: number;
    replacement_time_min?: number;
    machine_rate_per_min?: number;
    scrap_cost?: number;
  };
  confidence_level?: number;
  current_time_min?: number;
}

export interface ToolLifeAdaptiveResult {
  weibull: { beta: number; eta_min: number; r_squared: number };
  reliability: { current_reliability: number; hazard_rate: number; mtbf_min: number };
  rul: { predicted_min: number; lower_bound_min: number; upper_bound_min: number; confidence: number };
  replacement: { optimal_time_min: number; cost_per_part_at_optimal: number; cost_per_part_at_failure: number; savings_pct: number };
  wear_trend: "normal" | "accelerating" | "decelerating";
  wear_rate_mm_per_min: number;
  tool_change_recommended: boolean;
  urgency: "none" | "plan" | "soon" | "immediate";
  warnings: string[];
  formula: string;
}

// --- Defaults ----------------------------------------------------------------

const DEF_VB = 0.3, DEF_BETA = 2.5, DEF_ETA = 30;
const DEF_TOOL$ = 25, DEF_REPL_T = 5, DEF_MACH_RATE = 2, DEF_SCRAP$ = 500;
const MLE_ITER = 100, MLE_TOL = 1e-8, TREND_THR = 0.001;

// --- Helpers -----------------------------------------------------------------

const r2 = (v: number) => Math.round(v * 100) / 100;
const r4 = (v: number) => Math.round(v * 10000) / 10000;
const r6 = (v: number) => Math.round(v * 1e6) / 1e6;

/** Lanczos Γ(x) approximation (g=7). */
function gamma(x: number): number {
  if (x <= 0) return Infinity;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  const z = x - 1;
  let s = c[0];
  for (let i = 1; i < c.length; i++) s += c[i] / (z + i);
  const t = z + 7.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * s;
}

/** Rational approximation of the standard normal quantile. */
function normQ(p: number): number {
  if (p <= 0 || p >= 1) return p <= 0 ? -Infinity : Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1];
  const eval5 = (c: number[], x: number) =>
    ((((c[0] * x + c[1]) * x + c[2]) * x + c[3]) * x + c[4]) * x + (c.length > 5 ? c[5] : 0);
  const evalB = (x: number) => ((((b[0] * x + b[1]) * x + b[2]) * x + b[3]) * x + b[4] * x + 1);
  if (p < 0.02425) { const q = Math.sqrt(-2 * Math.log(p)); return eval5(a, q) / evalB(q); }
  if (p > 0.97575) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -eval5(a, q) / evalB(q); }
  const q = p - 0.5, rv = q * q;
  return eval5(a, rv) * q / (((((b[0] * rv + b[1]) * rv + b[2]) * rv + b[3]) * rv + b[4]) * rv + 1);
}

// --- Engine ------------------------------------------------------------------

export class ToolLifeAdaptiveEngine {
  /** Weibull reliability R(t) = exp(-(t/η)^β). */
  reliability(t: number, beta: number, eta: number): number {
    return t <= 0 ? 1.0 : Math.exp(-Math.pow(t / eta, beta));
  }

  /** Weibull hazard rate h(t) = (β/η)·(t/η)^(β-1). */
  hazardRate(t: number, beta: number, eta: number): number {
    return t <= 0 ? 0 : (beta / eta) * Math.pow(t / eta, beta - 1);
  }

  /** Weibull MLE via Newton-Raphson for β, then analytic η. Supports censored data. */
  weibullMLE(times: number[], censored?: boolean[]): { beta: number; eta: number } {
    const n = times.length;
    if (n < 2) return { beta: DEF_BETA, eta: times[0] || DEF_ETA };
    const cens = censored ?? times.map(() => false);
    const nF = cens.filter((c) => !c).length;
    if (nF === 0) return { beta: DEF_BETA, eta: Math.max(...times) };

    let beta = DEF_BETA;
    for (let it = 0; it < MLE_ITER; it++) {
      let sTbLn = 0, sTb = 0, sLn = 0, sTbLn2 = 0;
      for (let i = 0; i < n; i++) {
        const t = Math.max(times[i], 1e-10), ln = Math.log(t), tb = Math.pow(t, beta);
        sTbLn += tb * ln; sTb += tb; sTbLn2 += tb * ln * ln;
        if (!cens[i]) sLn += ln;
      }
      const f = nF / beta + sLn - (nF * sTbLn) / sTb;
      const df = -nF / (beta * beta) - nF * (sTbLn2 * sTb - sTbLn * sTbLn) / (sTb * sTb);
      if (Math.abs(df) < 1e-20) break;
      const step = f / df;
      beta = Math.max(0.1, beta - step);
      if (Math.abs(step) < MLE_TOL) break;
    }
    let sTb = 0;
    for (let i = 0; i < n; i++) sTb += Math.pow(Math.max(times[i], 1e-10), beta);
    return { beta, eta: Math.pow(sTb / nF, 1 / beta) };
  }

  /** Cost-optimal replacement via golden-section search on cost rate C(t)/∫R(u)du. */
  optimalReplacement(beta: number, eta: number, C_r: number, C_f: number): number {
    const costRate = (t: number): number => {
      if (t <= 0) return Infinity;
      const Rt = this.reliability(t, beta, eta);
      const num = C_r * Rt + C_f * (1 - Rt);
      const dt = t / 200;
      let integ = 0;
      for (let i = 0; i <= 200; i++) {
        const w = i === 0 || i === 200 ? 0.5 : 1.0;
        integ += w * this.reliability(i * dt, beta, eta);
      }
      return integ * dt > 0 ? num / (integ * dt) : Infinity;
    };
    const phi = (1 + Math.sqrt(5)) / 2;
    let a = 0.01, b = 3 * eta;
    for (let i = 0; i < 100; i++) {
      const x1 = b - (b - a) / phi, x2 = a + (b - a) / phi;
      if (costRate(x1) < costRate(x2)) b = x2; else a = x1;
      if (b - a < 0.01) break;
    }
    return (a + b) / 2;
  }

  /** Extrapolate wear observations to estimate failure times for Weibull fitting. */
  private estimateFailureTimes(obs: ToolLifeAdaptiveInput["wear_observations"], vbLim: number): number[] {
    if (obs.length < 2) {
      return obs.map((o) => o.vb_mm >= vbLim ? o.time_min : o.time_min * (vbLim / Math.max(o.vb_mm, 0.001)));
    }
    const sorted = [...obs].sort((a, b) => a.time_min - b.time_min);
    const rates: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const dt = sorted[i].time_min - sorted[i - 1].time_min;
      if (dt > 0) rates.push((sorted[i].vb_mm - sorted[i - 1].vb_mm) / dt);
    }
    if (rates.length === 0) return [sorted[sorted.length - 1].time_min];
    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    const last = sorted[sorted.length - 1];
    const rem = vbLim - last.vb_mm;
    if (rem <= 0) return [last.time_min];
    if (avgRate <= 0) return [last.time_min * 3];
    const times = [last.time_min + rem / avgRate];
    for (const r of rates) if (r > 0) times.push(last.time_min + rem / r);
    return times;
  }

  /** Linear regression on instantaneous wear rates to detect trend. */
  private detectWearTrend(obs: ToolLifeAdaptiveInput["wear_observations"]) {
    const sorted = [...obs].sort((a, b) => a.time_min - b.time_min);
    const rates: number[] = [], midT: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const dt = sorted[i].time_min - sorted[i - 1].time_min;
      if (dt > 0) { rates.push((sorted[i].vb_mm - sorted[i - 1].vb_mm) / dt); midT.push((sorted[i].time_min + sorted[i - 1].time_min) / 2); }
    }
    const avg = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
    if (rates.length < 2) return { trend: "normal" as const, wearRate: avg };
    const mT = midT.reduce((a, b) => a + b, 0) / rates.length;
    let num = 0, den = 0;
    for (let i = 0; i < rates.length; i++) { num += (midT[i] - mT) * (rates[i] - avg); den += (midT[i] - mT) ** 2; }
    const slope = den > 0 ? num / den : 0;
    const trend = slope > TREND_THR ? "accelerating" as const : slope < -TREND_THR ? "decelerating" as const : "normal" as const;
    return { trend, wearRate: avg };
  }

  /** R² goodness of fit for Weibull CDF vs median-rank empirical CDF. */
  private rSquared(times: number[], beta: number, eta: number): number {
    const s = [...times].sort((a, b) => a - b), n = s.length;
    const emp = s.map((_, i) => (i + 0.5) / n);
    const pred = s.map((t) => 1 - this.reliability(t, beta, eta));
    const mE = emp.reduce((a, b) => a + b, 0) / n;
    let sT = 0, sR = 0;
    for (let i = 0; i < n; i++) { sT += (emp[i] - mE) ** 2; sR += (emp[i] - pred[i]) ** 2; }
    return sT > 0 ? Math.max(0, 1 - sR / sT) : 0;
  }

  /** Main prediction: Weibull estimation, reliability, RUL, cost-optimal replacement, trend. */
  predict(input: ToolLifeAdaptiveInput): ToolLifeAdaptiveResult {
    const warn: string[] = [];
    const vbLim = input.vb_limit_mm ?? DEF_VB;
    const pBeta = input.prior?.beta ?? DEF_BETA, pEta = input.prior?.eta_min ?? DEF_ETA;
    const tool$ = input.costs?.tool_cost ?? DEF_TOOL$, replT = input.costs?.replacement_time_min ?? DEF_REPL_T;
    const machR = input.costs?.machine_rate_per_min ?? DEF_MACH_RATE, scrap$ = input.costs?.scrap_cost ?? DEF_SCRAP$;
    const conf = input.confidence_level ?? 0.95;
    const obs = input.wear_observations;
    if (obs.length === 0) warn.push("No wear observations provided; using prior parameters");

    // Weibull MLE with Bayesian prior blending (prior fades as data grows)
    const ft = obs.length > 0 ? this.estimateFailureTimes(obs, vbLim) : [pEta];
    const mle = this.weibullMLE(ft);
    const pw = Math.max(0, 1 - obs.length / 10);
    const beta = pw * pBeta + (1 - pw) * mle.beta;
    const eta = pw * pEta + (1 - pw) * mle.eta;
    const rSq = ft.length >= 2 ? this.rSquared(ft, beta, eta) : 0;

    // Current state
    const sorted = [...obs].sort((a, b) => a.time_min - b.time_min);
    const tNow = input.current_time_min ?? (sorted.length > 0 ? sorted[sorted.length - 1].time_min : 0);
    const curR = this.reliability(tNow, beta, eta);
    const curH = this.hazardRate(tNow, beta, eta);
    const mtbf = eta * gamma(1 + 1 / beta);

    // RUL with confidence interval
    const rul = Math.max(0, mtbf - tNow);
    const z = normQ((1 + conf) / 2);
    const std = Math.sqrt(Math.max(0, eta * eta * (gamma(1 + 2 / beta) - gamma(1 + 1 / beta) ** 2)));
    const sqN = Math.sqrt(Math.max(1, obs.length));
    const rulLo = Math.max(0, rul - z * std / sqN), rulHi = rul + z * std / sqN;

    // Cost-optimal replacement
    const Cr = tool$ + replT * machR, Cf = Cr + scrap$;
    const optT = this.optimalReplacement(beta, eta, Cr, Cf);
    const cOpt = Cr / optT, cFail = Cf / mtbf;
    const savings = cFail > 0 ? Math.max(0, ((cFail - cOpt) / cFail) * 100) : 0;

    // Wear trend & force check
    const { trend, wearRate } = this.detectWearTrend(obs);
    if (trend === "accelerating") warn.push("Accelerating wear detected — entering Taylor third region");
    const lastForce = sorted.length > 0 ? sorted[sorted.length - 1].force_ratio : undefined;
    if (lastForce !== undefined && lastForce > 1.5) warn.push(`Force ratio ${lastForce.toFixed(2)}× above fresh — significant wear`);

    // Urgency
    const nearLimit = sorted.length > 0 && sorted[sorted.length - 1].vb_mm >= vbLim * 0.95;
    const urgency = curR < 0.5 || nearLimit ? "immediate" : curR < 0.7 ? "soon" : curR < 0.9 || rul < 10 ? "plan" : "none";
    if (urgency === "immediate") warn.push("Tool change recommended immediately");

    log.debug(`[ToolLifeAdaptive] β=${beta.toFixed(3)}, η=${eta.toFixed(1)}, R=${curR.toFixed(4)}, RUL=${rul.toFixed(1)}, opt=${optT.toFixed(1)}, trend=${trend}`);

    return {
      weibull: { beta: r4(beta), eta_min: r2(eta), r_squared: r4(rSq) },
      reliability: { current_reliability: r4(curR), hazard_rate: r6(curH), mtbf_min: r2(mtbf) },
      rul: { predicted_min: r2(rul), lower_bound_min: r2(rulLo), upper_bound_min: r2(rulHi), confidence: conf },
      replacement: { optimal_time_min: r2(optT), cost_per_part_at_optimal: r4(cOpt), cost_per_part_at_failure: r4(cFail), savings_pct: r2(savings) },
      wear_trend: trend,
      wear_rate_mm_per_min: r6(wearRate),
      tool_change_recommended: urgency === "immediate" || urgency === "soon",
      urgency,
      warnings: warn,
      formula: `R(t)=exp(-(t/${r2(eta)})^${r4(beta)}), h(t)=(${r4(beta)}/${r2(eta)})·(t/${r2(eta)})^${r4(beta - 1)}`,
    };
  }
}

export const toolLifeAdaptiveEngine = new ToolLifeAdaptiveEngine();
