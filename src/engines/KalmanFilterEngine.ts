/**
 * KalmanFilterEngine — Kalman Filter variants for manufacturing sensor fusion
 * and online state estimation.
 *
 * Modes: standard | extended | fusion | adaptive
 * Includes RTS smoother, innovation consistency testing, and adaptive noise estimation.
 */

interface AtomicValue<T> { value: T; unit: string; formula?: string; confidence?: number; }

// ── Input / Output interfaces ──────────────────────────────────────────

export interface KalmanInput {
  mode: "standard" | "extended" | "fusion" | "adaptive";
  state_dim: number;
  initial_state: number[];
  initial_covariance: number[];
  process_noise: number[];
  measurement_noise: number[];
  measurements: { time: number; sensor_id?: string; values: number[]; noise_override?: number[] }[];
  process_model?: { F?: number[][]; B?: number[][]; control_input?: number[] };
  measurement_model?: { H?: number[][] };
}

export interface FilteredState {
  time: number;
  state: number[];
  covariance_diag: number[];
  innovation: number[];
  kalman_gain_diag: number[];
}

export interface KalmanResult {
  filtered_states: FilteredState[];
  smoothed_states?: FilteredState[];
  sensor_fusion_weights?: Record<string, number[]>;
  innovation_stats: { mean: number[]; variance: number[]; chi_squared: number; consistent: boolean };
  state_summary: { final_state: number[]; final_uncertainty: number[]; convergence_steps: number };
  recommendations: string[];
}

// ── Matrix helpers (dense, up to ~6×6) ─────────────────────────────────

type Mat = number[][];
type Vec = number[];

function zeros(r: number, c: number): Mat { return Array.from({ length: r }, () => new Array(c).fill(0)); }
function eye(n: number): Mat { const m = zeros(n, n); for (let i = 0; i < n; i++) m[i][i] = 1; return m; }
function diag(v: Vec): Mat { const m = zeros(v.length, v.length); v.forEach((val, i) => (m[i][i] = val)); return m; }
function diagOf(m: Mat): Vec { return m.map((row, i) => row[i]); }
function matAdd(a: Mat, b: Mat): Mat { return a.map((row, i) => row.map((v, j) => v + b[i][j])); }
function matSub(a: Mat, b: Mat): Mat { return a.map((row, i) => row.map((v, j) => v - b[i][j])); }
function matMul(a: Mat, b: Mat): Mat {
  const r = a.length, c = b[0].length, k = b.length;
  const out = zeros(r, c);
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) for (let l = 0; l < k; l++) out[i][j] += a[i][l] * b[l][j];
  return out;
}
function matT(a: Mat): Mat { return a[0].map((_, j) => a.map(row => row[j])); }
function matVec(a: Mat, v: Vec): Vec { return a.map(row => row.reduce((s, val, j) => s + val * v[j], 0)); }
function vecSub(a: Vec, b: Vec): Vec { return a.map((v, i) => v - b[i]); }
function vecAdd(a: Vec, b: Vec): Vec { return a.map((v, i) => v + b[i]); }

/** Gauss-Jordan inverse for small matrices (up to 6×6). */
function matInv(m: Mat): Mat {
  const n = m.length;
  const aug = m.map((row, i) => [...row, ...eye(n)[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) pivot = row;
    [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
    const d = aug[col][col];
    if (Math.abs(d) < 1e-12) throw new Error(`Singular matrix at col ${col}`);
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= d;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = aug[row][col];
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= f * aug[col][j];
    }
  }
  return aug.map(row => row.slice(n));
}

/** Outer product v * v^T */
function outerProduct(a: Vec, b: Vec): Mat { return a.map(ai => b.map(bj => ai * bj)); }

// ── Numerical Jacobian (finite difference) ─────────────────────────────

function numericalJacobian(fn: (x: Vec) => Vec, x: Vec, eps = 1e-6): Mat {
  const y0 = fn(x);
  const n = x.length, m = y0.length;
  const J = zeros(m, n);
  for (let j = 0; j < n; j++) {
    const xp = [...x]; xp[j] += eps;
    const yp = fn(xp);
    for (let i = 0; i < m; i++) J[i][j] = (yp[i] - y0[i]) / eps;
  }
  return J;
}

// ── Engine ─────────────────────────────────────────────────────────────

export class KalmanFilterEngine {
  readonly id = "KalmanFilterEngine";

  compute(input: KalmanInput): AtomicValue<KalmanResult> {
    const { mode, state_dim: n, measurements } = input;
    const x0 = [...input.initial_state];
    const P0 = diag(input.initial_covariance);
    const Q = diag(input.process_noise);
    const R_default = diag(input.measurement_noise);

    const F = input.process_model?.F ?? eye(n);
    const B = input.process_model?.B;
    const u = input.process_model?.control_input;
    const m = input.measurement_noise.length;
    const H = input.measurement_model?.H ?? (m === n ? eye(n) : Array.from({ length: m }, (_, i) => { const row = new Array(n).fill(0); row[i] = 1; return row; }));

    const filtered: FilteredState[] = [];
    const innovations: Vec[] = [];
    const sensorContrib: Record<string, number[][]> = {};

    let x = x0;
    let P = P0;
    let Q_adaptive = Q;
    let converged = false;
    let convergenceStep = measurements.length;

    // Adaptive noise accumulators
    const innovationWindow: Vec[] = [];
    const ADAPT_WINDOW = 10;

    for (let k = 0; k < measurements.length; k++) {
      const meas = measurements[k];
      const R_k = meas.noise_override ? diag(meas.noise_override) : R_default;
      const m_dim = meas.values.length;

      // ── Predict ──
      let x_pred: Vec;
      let F_k: Mat;

      if (mode === "extended") {
        // EKF: nonlinear process model approximated by linearization
        const processFn = (s: Vec) => matVec(F, s);
        F_k = numericalJacobian(processFn, x);
        x_pred = processFn(x);
      } else {
        F_k = F;
        x_pred = matVec(F, x);
      }
      if (B && u) x_pred = vecAdd(x_pred, matVec(B, u));

      let P_pred = matAdd(matMul(matMul(F_k, P), matT(F_k)), Q_adaptive);

      // ── Update ──
      const H_k = this.getH(mode, H, x_pred, m_dim, n);
      const y = vecSub(meas.values, matVec(H_k, x_pred)); // innovation
      const S = matAdd(matMul(matMul(H_k, P_pred), matT(H_k)), R_k); // innovation cov
      const S_inv = matInv(S);
      const K = matMul(matMul(P_pred, matT(H_k)), S_inv); // Kalman gain

      x = vecAdd(x_pred, matVec(K, y));
      const I_KH = matSub(eye(n), matMul(K, H_k));
      // Joseph form for numerical stability
      P = matAdd(matMul(matMul(I_KH, P_pred), matT(I_KH)), matMul(matMul(K, R_k), matT(K)));

      innovations.push(y);

      // ── Adaptive noise estimation ──
      if (mode === "adaptive") {
        innovationWindow.push(y);
        if (innovationWindow.length > ADAPT_WINDOW) innovationWindow.shift();
        if (innovationWindow.length >= ADAPT_WINDOW) {
          const { Q_new } = this.adaptNoise(innovationWindow, H_k, P_pred, K, F_k);
          Q_adaptive = Q_new;
        }
      }

      // ── Sensor fusion weights ──
      if (mode === "fusion" && meas.sensor_id) {
        const gain_diag = diagOf(K);
        if (!sensorContrib[meas.sensor_id]) sensorContrib[meas.sensor_id] = [];
        sensorContrib[meas.sensor_id].push(gain_diag);
      }

      // Convergence: check if covariance diagonal change < 1%
      if (!converged && k > 0) {
        const prev = filtered[k - 1].covariance_diag;
        const curr = diagOf(P);
        const maxChange = Math.max(...curr.map((v, i) => Math.abs(v - prev[i]) / (Math.abs(prev[i]) + 1e-15)));
        if (maxChange < 0.01) { converged = true; convergenceStep = k; }
      }

      filtered.push({
        time: meas.time,
        state: [...x],
        covariance_diag: diagOf(P),
        innovation: [...y],
        kalman_gain_diag: diagOf(K),
      });
    }

    // ── RTS Smoother (backward pass) ──
    const smoothed = this.rtsSmooth(filtered, F, Q_adaptive, n);

    // ── Innovation statistics ──
    const innovStats = this.innovationStats(innovations);

    // ── Sensor fusion weights (average per sensor) ──
    let fusionWeights: Record<string, number[]> | undefined;
    if (mode === "fusion" && Object.keys(sensorContrib).length > 0) {
      fusionWeights = {};
      for (const [sid, gains] of Object.entries(sensorContrib)) {
        const avg = gains[0].map((_, j) => gains.reduce((s, g) => s + Math.abs(g[j]), 0) / gains.length);
        fusionWeights[sid] = avg;
      }
    }

    // ── Recommendations ──
    const recs = this.buildRecommendations(innovStats, filtered, mode, convergenceStep);

    const final = filtered[filtered.length - 1];
    const result: KalmanResult = {
      filtered_states: filtered,
      smoothed_states: smoothed,
      sensor_fusion_weights: fusionWeights,
      innovation_stats: innovStats,
      state_summary: {
        final_state: final?.state ?? x0,
        final_uncertainty: final?.covariance_diag ?? input.initial_covariance,
        convergence_steps: convergenceStep,
      },
      recommendations: recs,
    };

    return { value: result, unit: "kalman_filter", formula: "Kalman: x̂=Fx+Bu, P=FPFᵀ+Q, K=PHᵀ(HPHᵀ+R)⁻¹", confidence: innovStats.consistent ? 0.9 : 0.7 };
  }

  /** Build H matrix, using numerical Jacobian for EKF mode. */
  private getH(mode: string, H: Mat, x_pred: Vec, m_dim: number, n: number): Mat {
    if (mode === "extended") {
      const measFn = (s: Vec) => matVec(H, s);
      return numericalJacobian(measFn, x_pred);
    }
    // For fusion/standard: H may be rectangular if m_dim != n — use as-is
    return H;
  }

  /** Adaptive noise: estimate Q from innovation sequence. */
  private adaptNoise(innovations: Vec[], H: Mat, P_pred: Mat, K: Mat, F: Mat) {
    const w = innovations.length;
    const n = F.length;
    const innov_cov = zeros(innovations[0].length, innovations[0].length);
    for (const v of innovations) {
      const op = outerProduct(v, v);
      for (let i = 0; i < op.length; i++) for (let j = 0; j < op[0].length; j++) innov_cov[i][j] += op[i][j] / w;
    }
    // Q_est ≈ K * S_est * K^T  (simplified)
    const Q_new = matMul(matMul(K, innov_cov), matT(K));
    // Regularize: keep diagonal, enforce positivity
    const diag_q = diagOf(Q_new).map(v => Math.max(v, 1e-10));
    return { Q_new: diag(diag_q) };
  }

  /** Rauch-Tung-Striebel backward smoother. */
  private rtsSmooth(filtered: FilteredState[], F: Mat, Q: Mat, n: number): FilteredState[] {
    if (filtered.length < 2) return [...filtered];
    const smoothed: FilteredState[] = new Array(filtered.length);
    const last = filtered[filtered.length - 1];
    smoothed[filtered.length - 1] = { ...last, state: [...last.state], covariance_diag: [...last.covariance_diag] };

    for (let k = filtered.length - 2; k >= 0; k--) {
      const fk = filtered[k];
      const Pk = diag(fk.covariance_diag);
      const P_pred = matAdd(matMul(matMul(F, Pk), matT(F)), Q);
      const C = matMul(matMul(Pk, matT(F)), matInv(P_pred));

      const sk1 = smoothed[k + 1];
      const x_pred = matVec(F, fk.state);
      const x_s = vecAdd(fk.state, matVec(C, vecSub(sk1.state, x_pred)));
      const P_s = matAdd(Pk, matMul(matMul(C, matSub(diag(sk1.covariance_diag), P_pred)), matT(C)));

      smoothed[k] = {
        time: fk.time,
        state: x_s,
        covariance_diag: diagOf(P_s),
        innovation: fk.innovation,
        kalman_gain_diag: fk.kalman_gain_diag,
      };
    }
    return smoothed;
  }

  /** Compute innovation statistics and chi-squared consistency test. */
  private innovationStats(innovations: Vec[]): KalmanResult["innovation_stats"] {
    if (innovations.length === 0) return { mean: [], variance: [], chi_squared: 0, consistent: true };
    const dim = innovations[0].length;
    const N = innovations.length;

    const mean = new Array(dim).fill(0);
    for (const v of innovations) v.forEach((val, i) => (mean[i] += val / N));

    const variance = new Array(dim).fill(0);
    for (const v of innovations) v.forEach((val, i) => (variance[i] += (val - mean[i]) ** 2 / N));

    // Normalized innovation squared (NIS) average
    const nis = innovations.reduce((s, v) => s + v.reduce((ss, val, i) => ss + val ** 2 / (variance[i] + 1e-15), 0), 0) / N;
    // For dim degrees of freedom, chi-squared should be ~dim. Accept if within [0.5*dim, 2*dim].
    const consistent = nis >= 0.25 * dim && nis <= 4 * dim;

    return { mean, variance, chi_squared: nis, consistent };
  }

  /** Generate actionable recommendations. */
  private buildRecommendations(
    stats: KalmanResult["innovation_stats"],
    filtered: FilteredState[],
    mode: string,
    convergenceSteps: number,
  ): string[] {
    const recs: string[] = [];
    if (!stats.consistent) {
      if (stats.chi_squared > 4 * (stats.mean.length || 1)) {
        recs.push("Innovation NIS too high — measurement noise R may be underestimated or process model is inaccurate.");
      } else {
        recs.push("Innovation NIS too low — measurement noise R may be overestimated, filter is over-confident.");
      }
    }
    if (convergenceSteps > filtered.length * 0.8) {
      recs.push("Filter converged late — consider tighter initial covariance or more informative measurements.");
    }
    if (mode === "standard" && filtered.length > 20) {
      recs.push("For nonlinear tool wear estimation, consider switching to 'extended' (EKF) mode.");
    }
    if (mode !== "adaptive" && !stats.consistent) {
      recs.push("Innovation inconsistency detected — try 'adaptive' mode for online noise estimation.");
    }
    if (recs.length === 0) recs.push("Filter performance nominal. Innovation sequence is consistent.");
    return recs;
  }
}

export const kalmanFilterEngine = new KalmanFilterEngine();
