/**
 * StatisticalProcessMonitoringEngine — 9 advanced statistical/quality models
 *
 * Models: Hotelling T2, PCA monitoring, HMM tool condition, Bootstrap CI,
 *         SPRT, Combined SPC, DOE generator, RSM, NBI multi-objective
 * References: Montgomery "Statistical Quality Control", Jackson & Mudholkar (1979),
 *             Rabiner (1989), Efron & Tibshirani (1993), Wald (1947), Box-Behnken (1960)
 */
import { log } from "../utils/Logger.js";
import { EigensolverEngine } from "./EigensolverEngine.js";
import { CholeskyEngine } from "./CholeskyEngine.js";

// ── Interfaces ──────────────────────────────────────────────────────────
export interface HotellingT2Input { data: number[][]; target?: number[]; alpha?: number; }
export interface HotellingT2Result {
  t2_values: number[]; ucl: number; out_of_control: number[];
  decomposition: Array<{ variable: number; contribution: number }>; covariance_matrix: number[][];
}
export interface PCAMonitoringInput { training_data: number[][]; new_observations: number[][]; variance_threshold?: number; }
export interface PCAMonitoringResult {
  n_components: number; explained_variance: number[]; loadings: number[][];
  t2_values: number[]; spe_values: number[]; t2_limit: number; spe_limit: number; anomalies: number[];
}
export interface HMMInput { observations: number[]; n_states: number; n_emissions: number; initial_A?: number[][]; initial_B?: number[][]; }
export interface HMMResult {
  transition_matrix: number[][]; emission_matrix: number[][]; state_sequence: number[];
  current_state_probabilities: number[]; log_likelihood: number;
}
export interface BootstrapCIInput { data: number[]; statistic: "mean"|"median"|"std"|"cpk"; n_bootstrap?: number; confidence?: number; }
export interface BootstrapCIResult {
  point_estimate: number; ci_lower: number; ci_upper: number; bootstrap_se: number; bias: number; distribution: number[];
}
export interface SPRTInput { observations: number[]; h0_mean: number; h1_mean: number; sigma: number; alpha?: number; beta?: number; }
export interface SPRTResult {
  decision: "accept_H0"|"accept_H1"|"continue"; log_likelihood_ratio: number;
  samples_used: number; upper_bound: number; lower_bound: number; asn: number;
}
export interface CombinedSPCInput { data: number[]; target: number; sigma: number; cusum_k?: number; cusum_h?: number; ewma_lambda?: number; }
export interface CombinedSPCResult {
  shewhart_signals: number[]; cusum_signals: number[]; ewma_signals: number[];
  combined_signals: number[]; first_signal_index: number; detection_chart: string; arl_estimate: number;
}
export interface DOEFactor { name: string; levels: number[]; }
export interface DOEInput { factors: DOEFactor[]; design_type: "full_factorial"|"taguchi"|"box_behnken"|"ccd"|"fractional"; }
export interface DOEResult { design_matrix: number[][]; run_table: Array<Record<string, number>>; n_runs: number; resolution: string; aliasing?: string[]; }
export interface RSMInput { factors: string[]; data: Array<{ factors: number[]; response: number }>; }
export interface RSMResult {
  coefficients: Record<string, number>; r_squared: number; adjusted_r_squared: number;
  stationary_point: number[]; stationary_type: "minimum"|"maximum"|"saddle";
  predicted_optimum: number; contour_data: Array<{ x1: number; x2: number; response: number }>;
}
export interface NBIObjective { name: string; values: number[]; direction: "minimize"|"maximize"; }
export interface NBIInput { objectives: NBIObjective[]; n_points?: number; }
export interface NBIResult {
  pareto_front: Array<Record<string, number>>; utopia_point: number[]; nadir_point: number[]; spread: number; hypervolume: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────
function normCdf(z: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1)
    * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}
function normInv(p: number): number {
  if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
  if (p === 0.5) return 0;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
    -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1,
    2.445134137142996e0, 3.754408661907416e0];
  const pL = 0.02425, pH = 1 - pL; let q: number;
  if (p < pL) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
      ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pH) {
    q = p - 0.5; const r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
      (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
    ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
}
function fCrit(alpha: number, d1: number, d2: number): number {
  const z = normInv(1 - alpha);
  const h = 2 / (9 * d1), k = 2 / (9 * d2);
  const x = (1 - k + z * Math.sqrt(k)) / (1 - h);
  return Math.pow(x, 3) * (d2 / d1) > 0 ? Math.pow(x, 3) : 1;
}
function chi2Crit(alpha: number, df: number): number {
  const z = normInv(1 - alpha), k = 2 / (9 * df);
  return df * Math.pow(1 - k + z * Math.sqrt(k), 3);
}
function invertMatrix(m: number[][]): number[][] {
  const n = m.length;
  const aug = m.map((r, i) => [
    ...r, ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
  ]);
  for (let col = 0; col < n; col++) {
    let mx = col;
    for (let r = col + 1; r < n; r++)
      if (Math.abs(aug[r][col]) > Math.abs(aug[mx][col])) mx = r;
    [aug[col], aug[mx]] = [aug[mx], aug[col]];
    const piv = aug[col][col];
    if (Math.abs(piv) < 1e-12) throw new Error("Singular matrix");
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= piv;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = aug[r][col];
      for (let j = 0; j < 2 * n; j++) aug[r][j] -= f * aug[col][j];
    }
  }
  return aug.map(r => r.slice(n));
}
function transpose(m: number[][]): number[][] {
  const R = m.length, C = m[0].length;
  const t: number[][] = Array.from({ length: C }, () => new Array(R));
  for (let i = 0; i < R; i++)
    for (let j = 0; j < C; j++) t[j][i] = m[i][j];
  return t;
}
function matMul(a: number[][], b: number[][]): number[][] {
  const M = a.length, N = b[0].length, K = b.length;
  const c = Array.from({ length: M }, () => new Array(N).fill(0));
  for (let i = 0; i < M; i++)
    for (let j = 0; j < N; j++)
      for (let l = 0; l < K; l++) c[i][j] += a[i][l] * b[l][j];
  return c;
}
function colMeans(data: number[][]): number[] {
  const p = data[0].length, n = data.length;
  const mu = new Array(p).fill(0);
  for (const row of data) for (let j = 0; j < p; j++) mu[j] += row[j];
  return mu.map(v => v / n);
}
function covMatrix(data: number[][], mu: number[]): number[][] {
  const n = data.length, p = mu.length;
  const S = Array.from({ length: p }, () => new Array(p).fill(0));
  for (const row of data)
    for (let i = 0; i < p; i++)
      for (let j = 0; j < p; j++)
        S[i][j] += (row[i] - mu[i]) * (row[j] - mu[j]);
  for (let i = 0; i < p; i++)
    for (let j = 0; j < p; j++) S[i][j] /= (n - 1);
  return S;
}
function makeRng(seed = 42): () => number {
  let s = seed | 0 || 1;
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

// ── Engine ──────────────────────────────────────────────────────────────
class StatisticalProcessMonitoringEngineImpl {

  /** 1. Hotelling T2 — multivariate SPC for p correlated characteristics */
  hotellingT2(input: HotellingT2Input): HotellingT2Result {
    const { data, alpha = 0.05 } = input;
    const n = data.length, p = data[0].length;
    const means = colMeans(data);
    const target = input.target ?? means;
    const S = covMatrix(data, means);
    // Cholesky-backed T²: solve L*L^T*y = diff, then T² = diff·y (avoids explicit inversion)
    let choleskyL: number[][] | null = null;
    let Sinv: number[][] | null = null;
    try {
      choleskyL = CholeskyEngine.factorize(S).L;
    } catch {
      // Fallback for near-singular covariance (e.g. constant features)
      Sinv = invertMatrix(S);
    }
    const t2_values = data.map(obs => {
      const d = obs.map((v, j) => v - target[j]);
      if (choleskyL) {
        // Solve L*L^T*y = d, then T² = d·y (Mahalanobis distance via Cholesky)
        const y = CholeskyEngine.solve(choleskyL, d);
        return d.reduce((s, v, j) => s + v * y[j], 0);
      }
      let t2 = 0;
      for (let i = 0; i < p; i++)
        for (let j = 0; j < p; j++) t2 += d[i] * Sinv![i][j] * d[j];
      return t2;
    });
    // UCL = p(n-1)/(n-p) * F(alpha, p, n-p)
    const ucl = (p * (n - 1)) / (n - p) * fCrit(alpha, p, n - p);
    const ooc = t2_values.reduce<number[]>(
      (a, v, i) => v > ucl ? [...a, i] : a, []);
    // Decomposition at max T2 point (need Sinv for contribution decomposition)
    if (!Sinv) {
      try { Sinv = invertMatrix(S); } catch { Sinv = S.map(r => r.map(() => 0)); }
    }
    const mx = t2_values.indexOf(Math.max(...t2_values));
    const diff = data[mx].map((v, j) => v - target[j]);
    const tot = t2_values[mx] || 1;
    const decomp = diff.map((d, j) => {
      let c = 0;
      for (let k = 0; k < p; k++) c += d * Sinv![j][k] * diff[k];
      return { variable: j, contribution: Math.abs(c) / tot };
    });
    log.info(`[SPM] T2: n=${n} p=${p} UCL=${ucl.toFixed(3)} OOC=${ooc.length}`);
    return { t2_values, ucl, out_of_control: ooc,
      decomposition: decomp, covariance_matrix: S };
  }

  /** 2. PCA Process Monitoring — T2 + SPE anomaly detection */
  pcaProcessMonitoring(input: PCAMonitoringInput): PCAMonitoringResult {
    const { training_data, new_observations,
      variance_threshold = 0.95 } = input;
    const n = training_data.length, p = training_data[0].length;
    const mu = colMeans(training_data);
    const S = covMatrix(training_data, mu);
    // Use EigensolverEngine for numerically stable eigendecomposition (replaces power iteration)
    const eigenResult = EigensolverEngine.symmetricQR(S, { maxIterations: 300, tolerance: 1e-10 });
    // Sort by eigenvalue descending (symmetricQR may return in any order)
    const sortedPairs = eigenResult.eigenvalues
      .map((val, idx) => ({ value: val, vector: eigenResult.eigenvectors[idx] }))
      .sort((a, b) => b.value - a.value);
    const totVar = sortedPairs.reduce((s, e) => s + Math.max(e.value, 0), 0);
    let cum = 0, k = 0;
    const explained: number[] = [];
    for (const e of sortedPairs) {
      const ev = Math.max(e.value, 0);
      cum += ev / totVar; explained.push(ev / totVar);
      k++; if (cum >= variance_threshold) break;
    }
    const loadings = sortedPairs.slice(0, k).map(e => e.vector);
    const lambdas = sortedPairs.slice(0, k).map(e => Math.max(e.value, 0));
    const trScores = training_data.map(obs => {
      const c = obs.map((v, j) => v - mu[j]);
      return loadings.map(pc => pc.reduce((s, w, j) => s + w * c[j], 0));
    });
    const trSPE = training_data.map((obs, idx) => {
      const c = obs.map((v, j) => v - mu[j]);
      const rc = new Array(p).fill(0);
      for (let ci = 0; ci < k; ci++)
        for (let j = 0; j < p; j++) rc[j] += trScores[idx][ci] * loadings[ci][j];
      return c.reduce((s, v, j) => s + (v - rc[j]) ** 2, 0);
    });
    const t2Lim = chi2Crit(0.05, k);
    const speMu = trSPE.reduce((a, b) => a + b, 0) / n;
    const speV = trSPE.reduce((a, b) => a + (b - speMu) ** 2, 0) / (n - 1);
    const g = speV / (2 * speMu);
    const h = (2 * speMu * speMu) / speV;
    const speLim = g * chi2Crit(0.05, Math.max(1, Math.round(h)));
    // Score new observations
    const t2v: number[] = [], spev: number[] = [], anom: number[] = [];
    for (let i = 0; i < new_observations.length; i++) {
      const c = new_observations[i].map((v, j) => v - mu[j]);
      const sc = loadings.map(pc =>
        pc.reduce((s, w, j) => s + w * c[j], 0));
      const t2 = sc.reduce((s, v, ci) => s + (v * v) / lambdas[ci], 0);
      const recon = new Array(p).fill(0);
      for (let ci = 0; ci < k; ci++)
        for (let j = 0; j < p; j++)
          recon[j] += sc[ci] * loadings[ci][j];
      const spe = c.reduce((s, v, j) => s + (v - recon[j]) ** 2, 0);
      t2v.push(t2); spev.push(spe);
      if (t2 > t2Lim || spe > speLim) anom.push(i);
    }
    log.info(`[SPM] PCA: k=${k} anom=${anom.length}/${new_observations.length}`);
    return { n_components: k, explained_variance: explained, loadings,
      t2_values: t2v, spe_values: spev,
      t2_limit: t2Lim, spe_limit: speLim, anomalies: anom };
  }

  /** 3. HMM — Viterbi + Forward for tool condition */
  hiddenMarkovModel(input: HMMInput): HMMResult {
    const { observations, n_states: ns, n_emissions: ne } = input;
    const T = observations.length;
    const normalize = (r: number[]) => {
      const s = r.reduce((a, b) => a + b, 0);
      return r.map(v => v / s);
    };
    const A = input.initial_A ?? Array.from({ length: ns }, (_, i) =>
      normalize(Array.from({ length: ns }, (_, j) =>
        j === i ? 0.7 : j === i + 1 ? 0.25 : 0.05 / Math.max(1, ns - 2)
      )));
    const B = input.initial_B ?? Array.from({ length: ns }, (_, i) =>
      normalize(Array.from({ length: ne }, (_, j) => {
        const ctr = Math.round((j / (ne - 1)) * (ns - 1));
        return Math.exp(-0.5 * ((ctr - i) / Math.max(1, ns / 4)) ** 2);
      })));
    const pi = new Array(ns).fill(0); pi[0] = 1.0;
    // Forward
    const al: number[][] = Array.from({ length: T },
      () => new Array(ns).fill(0));
    for (let i = 0; i < ns; i++) al[0][i] = pi[i] * B[i][observations[0]];
    for (let t = 1; t < T; t++)
      for (let j = 0; j < ns; j++) {
        let s = 0;
        for (let i = 0; i < ns; i++) s += al[t - 1][i] * A[i][j];
        al[t][j] = s * B[j][observations[t]];
      }
    const llSum = al[T - 1].reduce((a, b) => a + b, 0);
    const logLik = Math.log(llSum);
    const curProb = al[T - 1].map(v => v / llSum);
    // Viterbi
    const del: number[][] = Array.from({ length: T },
      () => new Array(ns).fill(0));
    const psi: number[][] = Array.from({ length: T },
      () => new Array(ns).fill(0));
    for (let i = 0; i < ns; i++) del[0][i] = pi[i] * B[i][observations[0]];
    for (let t = 1; t < T; t++)
      for (let j = 0; j < ns; j++) {
        let mxV = -Infinity, mxI = 0;
        for (let i = 0; i < ns; i++) {
          const v = del[t - 1][i] * A[i][j];
          if (v > mxV) { mxV = v; mxI = i; }
        }
        del[t][j] = mxV * B[j][observations[t]]; psi[t][j] = mxI;
      }
    const seq = new Array(T);
    seq[T - 1] = del[T - 1].indexOf(Math.max(...del[T - 1]));
    for (let t = T - 2; t >= 0; t--) seq[t] = psi[t + 1][seq[t + 1]];
    log.info(`[SPM] HMM: T=${T} states=${ns} final=${seq[T - 1]}`);
    return { transition_matrix: A, emission_matrix: B,
      state_sequence: seq, current_state_probabilities: curProb,
      log_likelihood: logLik };
  }

  /** 4. Bootstrap Confidence Intervals — percentile + BCa */
  bootstrapCI(input: BootstrapCIInput): BootstrapCIResult {
    const { data, statistic, n_bootstrap = 10000, confidence = 0.95 } = input;
    const n = data.length;
    const calc = (d: number[]): number => {
      const mu = d.reduce((a, b) => a + b, 0) / d.length;
      if (statistic === "mean") return mu;
      if (statistic === "median") {
        const s = [...d].sort((a, b) => a - b);
        return s.length % 2
          ? s[(s.length - 1) / 2]
          : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
      }
      const v = d.reduce((a, x) => a + (x - mu) ** 2, 0) / (d.length - 1);
      if (statistic === "std") return Math.sqrt(v);
      // NOTE: This computes |μ|/(3σ) — a signal-to-noise proxy, NOT true Cpk.
      // True Cpk = min((USL-μ)/(3σ), (μ-LSL)/(3σ)) requires spec limits.
      return Math.sqrt(v) > 0 ? Math.abs(mu) / (3 * Math.sqrt(v)) : 0;
    };
    const est = calc(data);
    const rng = makeRng(12345);
    const bs: number[] = [];
    for (let b = 0; b < n_bootstrap; b++) {
      const samp = Array.from({ length: n },
        () => data[Math.floor(rng() * n)]);
      bs.push(calc(samp));
    }
    bs.sort((a, b) => a - b);
    const al = 1 - confidence;
    // BCa
    const z0 = normInv(bs.filter(v => v < est).length / n_bootstrap);
    const jack = data.map((_, i) =>
      calc([...data.slice(0, i), ...data.slice(i + 1)]));
    const jm = jack.reduce((a, b) => a + b, 0) / n;
    const num = jack.reduce((a, v) => a + (jm - v) ** 3, 0);
    const den = jack.reduce((a, v) => a + (jm - v) ** 2, 0);
    const acc = den > 0 ? num / (6 * Math.pow(den, 1.5)) : 0;
    const zL = normInv(al / 2), zU = normInv(1 - al / 2);
    const adjL = normCdf(z0 + (z0 + zL) / (1 - acc * (z0 + zL)));
    const adjU = normCdf(z0 + (z0 + zU) / (1 - acc * (z0 + zU)));
    const ci_lower = bs[Math.max(0, Math.floor(adjL * n_bootstrap))];
    const ci_upper = bs[Math.min(n_bootstrap - 1,
      Math.floor(adjU * n_bootstrap))];
    const bsMu = bs.reduce((a, b) => a + b, 0) / n_bootstrap;
    const se = Math.sqrt(
      bs.reduce((a, v) => a + (v - bsMu) ** 2, 0) / (n_bootstrap - 1));
    const bias = bsMu - est;
    const nBins = 20;
    const bMin = bs[0], bMax = bs[n_bootstrap - 1];
    const bw = (bMax - bMin) / nBins || 1;
    const dist = new Array(nBins).fill(0);
    for (const v of bs)
      dist[Math.min(nBins - 1, Math.floor((v - bMin) / bw))]++;
    log.info(`[SPM] Bootstrap: ${statistic} ${est.toFixed(4)} ` +
      `CI=[${ci_lower.toFixed(4)},${ci_upper.toFixed(4)}]`);
    return { point_estimate: est, ci_lower, ci_upper,
      bootstrap_se: se, bias, distribution: dist };
  }

  /** 5. Sequential Probability Ratio Test (Wald) */
  sprt(input: SPRTInput): SPRTResult {
    const { observations, h0_mean, h1_mean, sigma,
      alpha = 0.05, beta = 0.10 } = input;
    const ub = Math.log((1 - beta) / alpha);
    const lb = Math.log(beta / (1 - alpha));
    let llr = 0;
    let decision: SPRTResult["decision"] = "continue";
    let used = observations.length;
    for (let i = 0; i < observations.length; i++) {
      // log(f(x|H1)/f(x|H0)) for normal with known sigma
      llr += ((h1_mean - h0_mean) / (sigma * sigma)) *
        (observations[i] - (h0_mean + h1_mean) / 2);
      if (llr >= ub) { decision = "accept_H1"; used = i + 1; break; }
      if (llr <= lb) { decision = "accept_H0"; used = i + 1; break; }
    }
    const d = (h1_mean - h0_mean) / sigma;
    const asn = d !== 0
      ? (decision === "accept_H1" ? ub
        : decision === "accept_H0" ? Math.abs(lb)
        : (ub + Math.abs(lb)) / 2) / Math.abs(d * d / 2)
      : observations.length;
    log.info(`[SPM] SPRT: ${decision} n=${used} LLR=${llr.toFixed(4)}`);
    return { decision, log_likelihood_ratio: llr, samples_used: used,
      upper_bound: ub, lower_bound: lb, asn };
  }

  /** 6. Combined Shewhart + CUSUM + EWMA */
  combinedSPCScheme(input: CombinedSPCInput): CombinedSPCResult {
    const { data, target, sigma,
      cusum_k = 0.5, cusum_h = 5, ewma_lambda = 0.2 } = input;
    const sS: number[] = [], cS: number[] = [], eS: number[] = [];
    const ucl = target + 3 * sigma, lcl = target - 3 * sigma;
    let cHi = 0, cLo = 0, ew = target;
    const ewL = ewma_lambda;
    // EWMA control limits: time-varying per Montgomery (2019) eq. 9.25-9.26.
    // UCL_i = target + L * sigma * sqrt((lambda/(2-lambda)) * (1 - (1-lambda)^(2i)))
    // LCL_i = target - L * sigma * sqrt((lambda/(2-lambda)) * (1 - (1-lambda)^(2i)))
    // where i is the 1-based observation index and L = 3.
    const ewBaseVar = ewL / (2 - ewL);
    const oneMinusLambda = 1 - ewL;
    for (let i = 0; i < data.length; i++) {
      const z = (data[i] - target) / sigma;
      if (data[i] > ucl || data[i] < lcl) sS.push(i);
      cHi = Math.max(0, cHi + z - cusum_k);
      cLo = Math.max(0, cLo - z - cusum_k);
      if (cHi > cusum_h || cLo > cusum_h) cS.push(i);
      ew = ewL * data[i] + (1 - ewL) * ew;
      // Time-varying EWMA limits: observation index is 1-based (i+1)
      const ewSigma = sigma * Math.sqrt(ewBaseVar * (1 - Math.pow(oneMinusLambda, 2 * (i + 1))));
      const ewUCL = target + 3 * ewSigma;
      const ewLCL = target - 3 * ewSigma;
      if (ew > ewUCL || ew < ewLCL) eS.push(i);
    }
    const combined = [...new Set([...sS, ...cS, ...eS])].sort((a, b) => a - b);
    const first = combined.length > 0 ? combined[0] : -1;
    const chart = first < 0 ? "none"
      : sS.includes(first) ? "shewhart"
      : cS.includes(first) ? "cusum" : "ewma";
    const arl = combined.length > 0 ? first + 1 : data.length;
    log.info(`[SPM] CombSPC: S=${sS.length} C=${cS.length} E=${eS.length}`);
    return { shewhart_signals: sS, cusum_signals: cS, ewma_signals: eS,
      combined_signals: combined, first_signal_index: first,
      detection_chart: chart, arl_estimate: arl };
  }

  /** 7. Design of Experiments generator */
  doeGenerator(input: DOEInput): DOEResult {
    const { factors, design_type } = input;
    const k = factors.length;
    let dm: number[][] = [];
    let resolution = "Full";
    let aliasing: string[] | undefined;
    const midOf = (f: DOEFactor) =>
      (f.levels[0] + f.levels[f.levels.length - 1]) / 2;
    const halfOf = (f: DOEFactor) =>
      (f.levels[f.levels.length - 1] - f.levels[0]) / 2;

    if (design_type === "full_factorial") {
      const nR = factors.reduce((p, f) => p * f.levels.length, 1);
      dm = Array.from({ length: nR }, (_, run) => {
        const row: number[] = []; let div = 1;
        for (const f of factors) {
          row.push(f.levels[Math.floor(run / div) % f.levels.length]);
          div *= f.levels.length;
        }
        return row;
      });
    } else if (design_type === "fractional") {
      const nR = Math.pow(2, k - 1);
      const base = Array.from({ length: nR }, (_, r) =>
        Array.from({ length: k - 1 }, (_, j) => (r >> j) & 1));
      dm = base.map(row => {
        const last = row.reduce((a, b) => a ^ b, 0);
        return [...row, last].map((v, j) =>
          factors[j].levels[v] ??
          (v === 0 ? factors[j].levels[0]
            : factors[j].levels[factors[j].levels.length - 1]));
      });
      resolution = k <= 3 ? "III" : "IV";
      aliasing = [`${factors[k-1].name} = ` +
        `${factors.slice(0,k-1).map(f => f.name).join("*")}`];
    } else if (design_type === "taguchi") {
      const L4 = [[0,0,0],[0,1,1],[1,0,1],[1,1,0]];
      const L8 = "0000000,0001111,0110011,0111100,1010101,1011010,1100110,1101001"
        .split(",").map(s => [...s].map(Number));
      const L9 = "0000,0111,0222,1012,1120,1201,2021,2102,2210"
        .split(",").map(s => [...s].map(Number));
      const three = factors.every(f => f.levels.length === 3);
      const two = factors.every(f => f.levels.length === 2);
      const arr = three && k <= 4 ? L9 : two && k <= 3 ? L4 : L8;
      dm = arr.map(row => row.slice(0, k).map((v, j) =>
        factors[j].levels[v % factors[j].levels.length]));
      resolution = "Taguchi";
    } else if (design_type === "box_behnken") {
      const runs: number[][] = [];
      for (let i = 0; i < k; i++)
        for (let j = i + 1; j < k; j++)
          for (const si of [-1, 1])
            for (const sj of [-1, 1])
              runs.push(factors.map((f, idx) =>
                idx === i ? midOf(f) + si * halfOf(f)
                : idx === j ? midOf(f) + sj * halfOf(f) : midOf(f)));
      for (let c = 0; c < 3; c++) runs.push(factors.map(midOf));
      dm = runs;
      resolution = "Box-Behnken (III)";
    } else if (design_type === "ccd") {
      const alpha = Math.pow(Math.pow(2, k), 0.25);
      const runs: number[][] = [];
      for (let r = 0; r < Math.pow(2, k); r++)
        runs.push(factors.map((f, j) =>
          midOf(f) + ((r >> j) & 1 ? 1 : -1) * halfOf(f)));
      for (let j = 0; j < k; j++)
        for (const dir of [-1, 1])
          runs.push(factors.map((f, idx) =>
            idx === j ? midOf(f) + dir * alpha * halfOf(f) : midOf(f)));
      for (let c = 0; c < 5; c++) runs.push(factors.map(midOf));
      dm = runs;
      resolution = `CCD (rotatable, alpha=${alpha.toFixed(3)})`;
    }
    const runTbl = dm.map(row => {
      const rec: Record<string, number> = {};
      factors.forEach((f, j) => { rec[f.name] = row[j]; });
      return rec;
    });
    log.info(`[SPM] DOE: ${design_type} k=${k} runs=${dm.length}`);
    return { design_matrix: dm, run_table: runTbl,
      n_runs: dm.length, resolution, aliasing };
  }

  /** 8. RSM — quadratic model + stationary point */
  responseSurfaceMethodology(input: RSMInput): RSMResult {
    const { factors, data } = input;
    const k = factors.length, n = data.length;
    const names = ["intercept", ...factors];
    for (let i = 0; i < k; i++) names.push(`${factors[i]}^2`);
    for (let i = 0; i < k; i++)
      for (let j = i + 1; j < k; j++)
        names.push(`${factors[i]}*${factors[j]}`);
    const p = names.length;
    const X = data.map(d => {
      const r = [1, ...d.factors];
      for (let i = 0; i < k; i++) r.push(d.factors[i] ** 2);
      for (let i = 0; i < k; i++)
        for (let j = i + 1; j < k; j++)
          r.push(d.factors[i] * d.factors[j]);
      return r;
    });
    const y = data.map(d => d.response);
    const Xt = transpose(X);
    const beta = matMul(invertMatrix(matMul(Xt, X)),
      matMul(Xt, y.map(v => [v]))).map(r => r[0]);
    const coeff: Record<string, number> = {};
    names.forEach((nm, i) => { coeff[nm] = beta[i]; });
    const yMu = y.reduce((a, b) => a + b, 0) / n;
    const yHat = X.map(r => r.reduce((s, v, j) => s + v * beta[j], 0));
    const ssR = y.reduce((s, v, i) => s + (v - yHat[i]) ** 2, 0);
    const ssT = y.reduce((s, v) => s + (v - yMu) ** 2, 0);
    const r2 = 1 - ssR / ssT;
    const adjR2 = 1 - (ssR / (n - p)) / (ssT / (n - 1));
    // Stationary point: xs = -0.5 * B^-1 * b
    const bLin = beta.slice(1, k + 1);
    const B = Array.from({ length: k }, () => new Array(k).fill(0));
    for (let i = 0; i < k; i++) B[i][i] = 2 * beta[k + 1 + i];
    let ci = k + 1 + k;
    for (let i = 0; i < k; i++)
      for (let j = i + 1; j < k; j++) {
        B[i][j] = beta[ci]; B[j][i] = beta[ci]; ci++;
      }
    let sp: number[], sType: RSMResult["stationary_type"];
    try {
      const Bi = invertMatrix(B);
      sp = Bi.map(r => -0.5 * r.reduce((s, v, j) => s + v * bLin[j], 0));
      const rsmEig = EigensolverEngine.symmetricQR(B, { maxIterations: 300 });
      sType = rsmEig.eigenvalues.every(e => e > 0) ? "minimum"
        : rsmEig.eigenvalues.every(e => e < 0) ? "maximum" : "saddle";
    } catch { sp = new Array(k).fill(0); sType = "saddle"; }
    // Predicted optimum
    const spRow = [1, ...sp, ...sp.map(v => v * v)];
    for (let i = 0; i < k; i++)
      for (let j = i + 1; j < k; j++) spRow.push(sp[i] * sp[j]);
    const predOpt = spRow.reduce((s, v, j) => s + v * (beta[j] ?? 0), 0);
    const contour: RSMResult["contour_data"] = [];
    if (k >= 2) {
      const rng = [0, 1].map(fi => {
        const vs = data.map(d => d.factors[fi]);
        return { mn: Math.min(...vs), mx: Math.max(...vs) };
      });
      for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) {
        const x1 = rng[0].mn + i * (rng[0].mx - rng[0].mn) / 10;
        const x2 = rng[1].mn + j * (rng[1].mx - rng[1].mn) / 10;
        const pt = [x1, x2, ...sp.slice(2)];
        const r = [1, ...pt, ...pt.map(v => v * v)];
        for (let a = 0; a < k; a++)
          for (let b = a + 1; b < k; b++) r.push(pt[a] * pt[b]);
        contour.push({ x1, x2,
          response: r.reduce((s, v, idx) => s + v * (beta[idx]??0), 0) });
      }
    }
    log.info(`[SPM] RSM: R2=${r2.toFixed(4)} type=${sType}`);
    return { coefficients: coeff, r_squared: r2, adjusted_r_squared: adjR2,
      stationary_point: sp, stationary_type: sType,
      predicted_optimum: predOpt, contour_data: contour };
  }

  /** 9. Normal Boundary Intersection — multi-objective Pareto front */
  nbiOptimization(input: NBIInput): NBIResult {
    const { objectives, n_points = 20 } = input;
    const m = objectives.length, n = objectives[0].values.length;
    const norm = objectives.map(o =>
      o.direction === "maximize" ? o.values.map(v => -v) : [...o.values]);
    const utopia = norm.map(v => Math.min(...v));
    const nadir = norm.map(v => Math.max(...v));
    const ranges = utopia.map((u, i) => nadir[i] - u || 1);
    const scaled = norm.map((v, i) =>
      v.map(x => (x - utopia[i]) / ranges[i]));
    const front: Array<Record<string, number>> = [];
    const pScaled: number[][] = [];
    for (let w = 0; w <= n_points; w++) {
      let bestIdx = 0, bestVal = Infinity;
      if (m === 2) {
        const lam = w / n_points;
        for (let i = 0; i < n; i++) {
          const v = lam * scaled[0][i] + (1 - lam) * scaled[1][i];
          if (v < bestVal) { bestVal = v; bestIdx = i; }
        }
      } else {
        const rng = makeRng(w + 1);
        const wt = Array.from({ length: m },
          () => -Math.log(rng() + 1e-10));
        const ws = wt.reduce((a, b) => a + b, 0);
        wt.forEach((_, i) => { wt[i] /= ws; });
        for (let i = 0; i < n; i++) {
          const v = wt.reduce((s, w, j) => s + w * scaled[j][i], 0);
          if (v < bestVal) { bestVal = v; bestIdx = i; }
        }
      }
      const pt: Record<string, number> = {};
      objectives.forEach((o, j) => { pt[o.name] = o.values[bestIdx]; });
      const sc = objectives.map((_, j) => scaled[j][bestIdx]);
      if (!pScaled.some(p =>
        p.every((v, j) => Math.abs(v - sc[j]) < 1e-10))) {
        front.push(pt); pScaled.push(sc);
      }
    }
    // Spread
    let spread = 0;
    if (pScaled.length > 1) {
      pScaled.sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < pScaled.length; i++) {
        const d = Math.sqrt(pScaled[i].reduce(
          (s, v, j) => s + (v - pScaled[i - 1][j]) ** 2, 0));
        spread += d;
      }
      spread /= (pScaled.length - 1);
    }
    // Hypervolume (2D)
    let hv = 0;
    if (m === 2 && pScaled.length > 0) {
      const sorted = [...pScaled].sort((a, b) => a[0] - b[0]);
      for (let i = 0; i < sorted.length; i++) {
        const x2 = i + 1 < sorted.length ? sorted[i + 1][0] : 1.0;
        hv += (x2 - sorted[i][0]) * (1.0 - sorted[i][1]);
      }
    }
    const uOrig = objectives.map((o, i) =>
      o.direction === "maximize" ? -utopia[i] : utopia[i]);
    const nOrig = objectives.map((o, i) =>
      o.direction === "maximize" ? -nadir[i] : nadir[i]);
    log.info(`[SPM] NBI: m=${m} front=${front.length} HV=${hv.toFixed(4)}`);
    return { pareto_front: front, utopia_point: uOrig,
      nadir_point: nOrig, spread, hypervolume: hv };
  }

  // _eigenDecomp removed — replaced by EigensolverEngine.symmetricQR() (SCIMATH-WIRE-MS0 P1-U01)
}

export const statisticalProcessMonitoringEngine =
  new StatisticalProcessMonitoringEngineImpl();
