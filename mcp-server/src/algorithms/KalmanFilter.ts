/**
 * Kalman Filter — Linear State Estimator
 *
 * Optimal recursive state estimator for linear systems with Gaussian noise.
 * Fuses noisy sensor measurements with dynamic model predictions for
 * real-time manufacturing process state tracking.
 *
 * Manufacturing uses: spindle position estimation, tool wear tracking,
 * thermal drift compensation, vibration state estimation, sensor fusion.
 *
 * References:
 * - Kalman, R.E. (1960). "A New Approach to Linear Filtering"
 * - Welch, G. & Bishop, G. (2006). "An Introduction to the Kalman Filter"
 *
 * @module algorithms/KalmanFilter
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export interface KalmanFilterInput {
  /** State dimension. */
  n_states: number;
  /** Measurement dimension. */
  n_measurements: number;
  /** State transition matrix (n×n, row-major flat). */
  F: number[];
  /** Measurement matrix (m×n, row-major flat). */
  H: number[];
  /** Process noise covariance (n×n, row-major flat). */
  Q: number[];
  /** Measurement noise covariance (m×m, row-major flat). */
  R: number[];
  /** Initial state estimate. */
  x0: number[];
  /** Initial state covariance (n×n, row-major flat). */
  P0: number[];
  /** Sequence of measurements (each row = one timestep). */
  measurements: number[][];
  /** Control input matrix B (n×k, optional). */
  B?: number[];
  /** Control inputs (each row = one timestep, optional). */
  u?: number[][];
}

export interface KalmanState {
  x: number[];
  P_diag: number[];
  innovation: number[];
  gain_trace: number;
}

export interface KalmanFilterOutput extends WithWarnings {
  states: KalmanState[];
  final_state: number[];
  final_covariance_diag: number[];
  innovations: number[][];
  normalized_innovation_squared: number[];
  filter_consistent: boolean;
  calculation_method: string;
}

export class KalmanFilter implements Algorithm<KalmanFilterInput, KalmanFilterOutput> {

  validate(input: KalmanFilterInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    const n = input.n_states, m = input.n_measurements;
    if (!n || n < 1) issues.push({ field: "n_states", message: "Must be >= 1", severity: "error" });
    if (!m || m < 1) issues.push({ field: "n_measurements", message: "Must be >= 1", severity: "error" });
    if (input.F?.length !== n * n) issues.push({ field: "F", message: `Expected ${n * n} elements`, severity: "error" });
    if (input.H?.length !== m * n) issues.push({ field: "H", message: `Expected ${m * n} elements`, severity: "error" });
    if (input.Q?.length !== n * n) issues.push({ field: "Q", message: `Expected ${n * n} elements`, severity: "error" });
    if (input.R?.length !== m * m) issues.push({ field: "R", message: `Expected ${m * m} elements`, severity: "error" });
    if (input.x0?.length !== n) issues.push({ field: "x0", message: `Expected ${n} elements`, severity: "error" });
    if (input.P0?.length !== n * n) issues.push({ field: "P0", message: `Expected ${n * n} elements`, severity: "error" });
    if (!input.measurements?.length) issues.push({ field: "measurements", message: "Required", severity: "error" });
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: KalmanFilterInput): KalmanFilterOutput {
    const warnings: string[] = [];
    const { n_states: n, n_measurements: m, measurements } = input;

    // Matrix helpers (flat row-major)
    const mat = (flat: number[], rows: number, cols: number) => ({ flat, rows, cols });
    const get = (M: { flat: number[]; cols: number }, r: number, c: number) => M.flat[r * M.cols + c];
    const set = (M: { flat: number[]; cols: number }, r: number, c: number, v: number) => { M.flat[r * M.cols + c] = v; };

    const matMul = (A: { flat: number[]; rows: number; cols: number }, B: { flat: number[]; rows: number; cols: number }) => {
      const C = mat(new Array(A.rows * B.cols).fill(0), A.rows, B.cols);
      for (let i = 0; i < A.rows; i++)
        for (let j = 0; j < B.cols; j++)
          for (let k = 0; k < A.cols; k++)
            C.flat[i * B.cols + j] += get(A, i, k) * get(B, k, j);
      return C;
    };

    const matAdd = (A: { flat: number[] }, B: { flat: number[] }, rows: number, cols: number) =>
      mat(A.flat.map((v, i) => v + B.flat[i]), rows, cols);

    const matSub = (A: { flat: number[] }, B: { flat: number[] }, rows: number, cols: number) =>
      mat(A.flat.map((v, i) => v - B.flat[i]), rows, cols);

    const transpose = (M: { flat: number[]; rows: number; cols: number }) => {
      const T = mat(new Array(M.rows * M.cols).fill(0), M.cols, M.rows);
      for (let i = 0; i < M.rows; i++)
        for (let j = 0; j < M.cols; j++)
          T.flat[j * M.rows + i] = M.flat[i * M.cols + j];
      return T;
    };

    const invertSmall = (M: { flat: number[]; rows: number; cols: number }) => {
      const sz = M.rows;
      const aug = Array.from({ length: sz }, (_, i) =>
        [...Array.from({ length: sz }, (_, j) => get(M, i, j)), ...Array(sz).fill(0).map((_, j) => i === j ? 1 : 0)]);
      for (let col = 0; col < sz; col++) {
        let maxRow = col;
        for (let row = col + 1; row < sz; row++) if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
        [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
        const pivot = aug[col][col];
        if (Math.abs(pivot) < 1e-15) { aug[col][col] = 1e-15; continue; }
        for (let j = 0; j < 2 * sz; j++) aug[col][j] /= pivot;
        for (let row = 0; row < sz; row++) {
          if (row === col) continue;
          const f = aug[row][col];
          for (let j = 0; j < 2 * sz; j++) aug[row][j] -= f * aug[col][j];
        }
      }
      return mat(aug.flatMap(row => row.slice(sz)), sz, sz);
    };

    const F = mat([...input.F], n, n);
    const H = mat([...input.H], m, n);
    const Q = mat([...input.Q], n, n);
    const R = mat([...input.R], m, m);
    const Ht = transpose(H);
    const Ft = transpose(F);

    let x = mat([...input.x0], n, 1);
    let P = mat([...input.P0], n, n);

    const states: KalmanState[] = [];
    const innovations: number[][] = [];
    const nis: number[] = [];

    for (let t = 0; t < measurements.length; t++) {
      const z = mat([...measurements[t]], m, 1);

      // Predict
      let xPred = matMul(F, x);
      if (input.B && input.u?.[t]) {
        const B = mat([...input.B], n, input.u[t].length);
        const u = mat([...input.u[t]], input.u[t].length, 1);
        xPred = matAdd(xPred, matMul(B, u), n, 1);
      }
      const PPred = matAdd(matMul(matMul(F, P), Ft), Q, n, n);

      // Update
      const innov = matSub(z, matMul(H, xPred), m, 1);
      const S = matAdd(matMul(matMul(H, PPred), Ht), R, m, m);
      const Sinv = invertSmall(S);
      const K = matMul(matMul(PPred, Ht), Sinv);

      x = matAdd(xPred, matMul(K, innov), n, 1);
      const I_KH = mat(Array(n * n).fill(0).map((_, i) => (Math.floor(i / n) === i % n ? 1 : 0) - K.flat[Math.floor(i / n) * m] * H.flat[(i % n)]), n, n);
      // Simplified: P = (I - KH) P_pred
      P = mat(new Array(n * n).fill(0), n, n);
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          let sum = 0;
          for (let k = 0; k < n; k++) sum += I_KH.flat[i * n + k] * PPred.flat[k * n + j];
          P.flat[i * n + j] = sum;
        }

      const gainTrace = Array.from({ length: Math.min(n, m) }, (_, i) => get(K, i, i)).reduce((s, v) => s + Math.abs(v), 0);
      const nisVal = innov.flat.reduce((s, v, i) => s + v * Sinv.flat[i * m + i] * v, 0);

      states.push({
        x: [...x.flat],
        P_diag: Array.from({ length: n }, (_, i) => P.flat[i * n + i]),
        innovation: [...innov.flat],
        gain_trace: gainTrace,
      });
      innovations.push([...innov.flat]);
      nis.push(nisVal);
    }

    const avgNis = nis.reduce((s, v) => s + v, 0) / nis.length;
    const consistent = avgNis < m * 2; // chi-squared threshold approximation

    return {
      states,
      final_state: [...x.flat],
      final_covariance_diag: Array.from({ length: n }, (_, i) => P.flat[i * n + i]),
      innovations,
      normalized_innovation_squared: nis,
      filter_consistent: consistent,
      warnings,
      calculation_method: `Kalman filter (${n} states, ${m} measurements, ${measurements.length} steps)`,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "kalman-filter",
      name: "Kalman Filter",
      description: "Optimal linear state estimator for sensor fusion and process tracking",
      formula: "x̂ = F×x + K×(z - H×F×x); K = P×H'×(H×P×H' + R)^(-1)",
      reference: "Kalman (1960); Welch & Bishop (2006)",
      safety_class: "standard",
      domain: "signal",
      inputs: { F: "State transition", H: "Measurement model", measurements: "Sensor data sequence" },
      outputs: { states: "Estimated states per step", filter_consistent: "Innovation consistency check" },
    };
  }
}
