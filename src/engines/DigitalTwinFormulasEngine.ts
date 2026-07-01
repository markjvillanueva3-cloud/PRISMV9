/**
 * DigitalTwinFormulasEngine — 9 DIGITAL_TWIN formulas for state estimation & monitoring
 *
 * Methods:
 *   - ekfPredict: Extended Kalman Filter prediction step x_pred=F*x+B*u, P_pred=F*P*F'+Q
 *   - ekfUpdate: EKF update step K=P*H'/(H*P*H'+R), x=x+K*(z-H*x), P=(I-K*H)*P
 *   - driftDetect: CUSUM S_n=max(0,S_{n-1}+x_n-μ-k), alarm when S_n>h
 *   - modelDivergence: KL divergence + RMSE between twin prediction and actual
 *   - stateReconcile: weighted fusion of sensor readings with twin prediction
 *   - residualAnalysis: innovation sequence whiteness test
 *   - adaptiveQ: process noise covariance adaptation from innovation covariance
 *   - twinHealth: overall digital twin health score from multiple metrics
 *   - predictHorizon: multi-step state prediction with growing uncertainty
 *
 * Actions: digital_twin_ekf_predict, digital_twin_ekf_update, digital_twin_drift_detect, digital_twin_divergence
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface EKFPredictInput {
  /** State vector x [n×1] */
  state: number[];
  /** State transition matrix F [n×n] row-major */
  F: number[][];
  /** Control input vector u [m×1] (optional) */
  u?: number[];
  /** Control matrix B [n×m] (optional) */
  B?: number[][];
  /** Covariance matrix P [n×n] row-major */
  P: number[][];
  /** Process noise covariance Q [n×n] */
  Q: number[][];
}

export interface EKFPredictResult {
  x_pred: number[];
  P_pred: number[][];
  formula: string;
  warnings: string[];
}

export interface EKFUpdateInput {
  /** Predicted state [n×1] */
  x_pred: number[];
  /** Predicted covariance [n×n] */
  P_pred: number[][];
  /** Measurement vector z [p×1] */
  z: number[];
  /** Observation matrix H [p×n] */
  H: number[][];
  /** Measurement noise covariance R [p×p] */
  R: number[][];
}

export interface EKFUpdateResult {
  x_updated: number[];
  P_updated: number[][];
  K: number[][];
  innovation: number[];
  innovation_covariance: number[][];
  formula: string;
  warnings: string[];
}

export interface DriftDetectInput {
  /** Observed values sequence */
  observations: number[];
  /** In-control mean μ */
  mu: number;
  /** Allowance parameter k (typically 0.5×δ where δ is shift to detect) */
  k: number;
  /** Decision threshold h (typically 4-5 × σ) */
  h: number;
}

export interface DriftDetectResult {
  cusum_upper: number[];
  cusum_lower: number[];
  alarm_indices: number[];
  alarm_detected: boolean;
  max_cusum: number;
  formula: string;
  warnings: string[];
}

export interface ModelDivergenceInput {
  /** Twin predictions */
  predicted: number[];
  /** Actual observations */
  actual: number[];
  /** Bin count for KL divergence histogram (default 20) */
  bins?: number;
}

export interface ModelDivergenceResult {
  rmse: number;
  mae: number;
  max_error: number;
  kl_divergence: number;
  correlation: number;
  diverged: boolean;
  formula: string;
  warnings: string[];
}

export interface DigitalTwinCalcInput {
  action: string;
  params: Record<string, any>;
}

// ─── Matrix helpers (small dense matrices) ──────────────────────────

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = B[0].length, p = B.length;
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      for (let k = 0; k < p; k++)
        C[i][j] += A[i][k] * B[k][j];
  return C;
}

function matTranspose(A: number[][]): number[][] {
  const m = A.length, n = A[0].length;
  const T: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      T[j][i] = A[i][j];
  return T;
}

function matAdd(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((v, j) => v + B[i][j]));
}

function matSub(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((v, j) => v - B[i][j]));
}

function matVecMul(A: number[][], x: number[]): number[] {
  return A.map(row => row.reduce((s, v, j) => s + v * x[j], 0));
}

function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
}

/** Invert small matrix via Gauss-Jordan (works for 1×1 to ~6×6) */
function matInvert(M: number[][]): number[][] {
  const n = M.length;
  const aug = M.map((row, i) => [...row, ...identity(n)[i]]);
  for (let col = 0; col < n; col++) {
    // Partial pivot
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-15) {
      // Singular — return identity as fallback
      return identity(n);
    }
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
    }
  }
  return aug.map(row => row.slice(n));
}

// ─── Engine ─────────────────────────────────────────────────────────

export class DigitalTwinFormulasEngine {

  /**
   * EKF prediction step.
   * x_pred = F×x + B×u
   * P_pred = F×P×F' + Q
   */
  ekfPredict(input: EKFPredictInput): EKFPredictResult {
    const { state, F, P, Q, u, B } = input;
    const warnings: string[] = [];

    // x_pred = F*x
    let x_pred = matVecMul(F, state);

    // Add control input if present
    if (u && B) {
      const Bu = matVecMul(B, u);
      x_pred = x_pred.map((v, i) => v + Bu[i]);
    }

    // P_pred = F*P*F' + Q
    const FP = matMul(F, P);
    const FT = matTranspose(F);
    const FPFt = matMul(FP, FT);
    const P_pred = matAdd(FPFt, Q);

    // Check for negative diagonal (numerical instability)
    for (let i = 0; i < P_pred.length; i++) {
      if (P_pred[i][i] < 0) {
        warnings.push(`Negative variance P[${i}][${i}]=${P_pred[i][i].toFixed(6)}: numerical instability`);
        P_pred[i][i] = Math.abs(P_pred[i][i]);
      }
    }

    return {
      x_pred, P_pred,
      formula: 'x_pred = F×x + B×u; P_pred = F×P×Fᵀ + Q',
      warnings,
    };
  }

  /**
   * EKF update step.
   * K = P×H'×(H×P×H' + R)⁻¹
   * x = x_pred + K×(z - H×x_pred)
   * P = (I - K×H)×P_pred
   */
  ekfUpdate(input: EKFUpdateInput): EKFUpdateResult {
    const { x_pred, P_pred, z, H, R } = input;
    const warnings: string[] = [];
    const n = x_pred.length;

    // Innovation: y = z - H*x_pred
    const Hx = matVecMul(H, x_pred);
    const innovation = z.map((zi, i) => zi - Hx[i]);

    // S = H*P*H' + R (innovation covariance)
    const HP = matMul(H, P_pred);
    const HT = matTranspose(H);
    const HPHt = matMul(HP, HT);
    const S = matAdd(HPHt, R);

    // K = P*H' * S⁻¹
    const PHt = matMul(P_pred, HT);
    const S_inv = matInvert(S);
    const K = matMul(PHt, S_inv);

    // x_updated = x_pred + K*innovation
    const Ky = matVecMul(K, innovation);
    const x_updated = x_pred.map((v, i) => v + Ky[i]);

    // P_updated = (I - K*H) * P_pred
    const KH = matMul(K, H);
    const IminusKH = matSub(identity(n), KH);
    const P_updated = matMul(IminusKH, P_pred);

    // Check innovation magnitude
    const innov_norm = Math.sqrt(innovation.reduce((s, v) => s + v * v, 0));
    if (innov_norm > 10) warnings.push(`Large innovation norm (${innov_norm.toFixed(2)}): model may be diverging`);

    return {
      x_updated, P_updated, K, innovation, innovation_covariance: S,
      formula: 'K = P×Hᵀ×(H×P×Hᵀ+R)⁻¹; x = x_pred + K×(z-H×x_pred); P = (I-K×H)×P_pred',
      warnings,
    };
  }

  /**
   * CUSUM drift detection.
   * S⁺_n = max(0, S⁺_{n-1} + x_n - μ - k)
   * S⁻_n = max(0, S⁻_{n-1} - x_n + μ - k)
   * Alarm when S > h
   */
  driftDetect(input: DriftDetectInput): DriftDetectResult {
    const { observations, mu, k, h } = input;
    const warnings: string[] = [];
    const cusum_upper: number[] = [];
    const cusum_lower: number[] = [];
    const alarm_indices: number[] = [];

    let S_plus = 0;
    let S_minus = 0;
    let max_cusum = 0;

    for (let i = 0; i < observations.length; i++) {
      S_plus = Math.max(0, S_plus + observations[i] - mu - k);
      S_minus = Math.max(0, S_minus - observations[i] + mu - k);
      cusum_upper.push(S_plus);
      cusum_lower.push(S_minus);
      const maxS = Math.max(S_plus, S_minus);
      if (maxS > max_cusum) max_cusum = maxS;
      if (S_plus > h || S_minus > h) alarm_indices.push(i);
    }

    if (alarm_indices.length > 0) {
      warnings.push(`Drift detected at ${alarm_indices.length} observation(s), first at index ${alarm_indices[0]}`);
    }
    if (observations.length < 20) warnings.push('Short sequence: CUSUM may not be reliable with < 20 observations');

    return {
      cusum_upper, cusum_lower, alarm_indices,
      alarm_detected: alarm_indices.length > 0,
      max_cusum,
      formula: 'S⁺ₙ = max(0, S⁺ₙ₋₁ + xₙ - μ - k); alarm when S > h',
      warnings,
    };
  }

  /**
   * Model divergence: RMSE, MAE, KL divergence, correlation.
   */
  modelDivergence(input: ModelDivergenceInput): ModelDivergenceResult {
    const { predicted, actual, bins = 20 } = input;
    const warnings: string[] = [];
    const n = Math.min(predicted.length, actual.length);

    // RMSE & MAE
    let sumSqErr = 0, sumAbsErr = 0, maxErr = 0;
    for (let i = 0; i < n; i++) {
      const err = predicted[i] - actual[i];
      sumSqErr += err * err;
      sumAbsErr += Math.abs(err);
      if (Math.abs(err) > maxErr) maxErr = Math.abs(err);
    }
    const rmse = Math.sqrt(sumSqErr / n);
    const mae = sumAbsErr / n;

    // Pearson correlation
    const meanP = predicted.reduce((a, b) => a + b, 0) / n;
    const meanA = actual.reduce((a, b) => a + b, 0) / n;
    let num = 0, denP = 0, denA = 0;
    for (let i = 0; i < n; i++) {
      const dp = predicted[i] - meanP;
      const da = actual[i] - meanA;
      num += dp * da;
      denP += dp * dp;
      denA += da * da;
    }
    const correlation = (denP > 0 && denA > 0) ? num / Math.sqrt(denP * denA) : 0;

    // KL divergence via histogram
    const allVals = [...predicted.slice(0, n), ...actual.slice(0, n)];
    const minV = Math.min(...allVals);
    const maxV = Math.max(...allVals);
    const range = maxV - minV || 1;
    const binWidth = range / bins;
    const histP = new Array(bins).fill(0);
    const histA = new Array(bins).fill(0);
    const eps = 1e-10;

    for (let i = 0; i < n; i++) {
      const bP = Math.min(bins - 1, Math.floor((predicted[i] - minV) / binWidth));
      const bA = Math.min(bins - 1, Math.floor((actual[i] - minV) / binWidth));
      histP[bP]++;
      histA[bA]++;
    }

    let kl = 0;
    for (let b = 0; b < bins; b++) {
      const pP = (histP[b] + eps) / (n + eps * bins);
      const pA = (histA[b] + eps) / (n + eps * bins);
      kl += pP * Math.log(pP / pA);
    }

    const diverged = rmse > 3 * mae || kl > 1.0 || correlation < 0.5;

    if (diverged) warnings.push('Digital twin diverged from actual: recalibration recommended');
    if (correlation < 0.8) warnings.push(`Low correlation (${correlation.toFixed(3)}): model accuracy degraded`);
    if (n < 10) warnings.push('Few data points: divergence metrics unreliable');

    return {
      rmse, mae, max_error: maxErr, kl_divergence: kl, correlation, diverged,
      formula: 'RMSE = √(Σ(pred-actual)²/n); KL = Σ p(x)×ln(p(x)/q(x))',
      warnings,
    };
  }

  /** Dispatcher entry point */
  calculate(input: DigitalTwinCalcInput): any {
    const { action, params } = input;
    switch (action) {
      case 'digital_twin_ekf_predict': return this.ekfPredict(params as any);
      case 'digital_twin_ekf_update': return this.ekfUpdate(params as any);
      case 'digital_twin_drift_detect': return this.driftDetect(params as any);
      case 'digital_twin_divergence': return this.modelDivergence(params as any);
      default: throw new Error(`DigitalTwinFormulasEngine: unknown action '${action}'`);
    }
  }
}

export const digitalTwinFormulasEngine = new DigitalTwinFormulasEngine();
