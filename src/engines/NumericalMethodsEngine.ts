/**
 * NumericalMethodsEngine — Reverse-engineered from PRISM v8.89 monolith
 *
 * Core numerical methods library: ODE solvers (Euler forward/backward, RK4,
 * RK4 system), linear algebra (LU decomposition, QR least squares),
 * and digital control (Tustin discretization, ZOH, digital PID).
 *
 * Sources: MIT 18.086 (ODE), MIT 2.086 (LinAlg), MIT 2.171 (Digital Control)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ODEResult {
  t: number[];
  y: number[];
  steps: number;
  method: string;
}

export interface ODESystemResult {
  t: number[];
  Y: number[][];
  steps: number;
  dimensions: number;
  method: string;
}

export interface LUResult {
  L: number[][];
  U: number[][];
  P: number[];
  determinant: number;
}

export interface LeastSquaresResult {
  x: number[];
  residualNorm: number;
  rank: number;
}

export interface DiscreteTF {
  num: number[];
  den: number[];
  T: number;
}

export interface DiscreteStateSpace {
  Phi: number[][];
  Gamma: number[];
  C: number[];
  D: number;
  T: number;
}

export interface PIDState {
  integral: number;
  prevError: number;
  output: number;
}

export interface PIDResult {
  output: number;
  proportional: number;
  integral: number;
  derivative: number;
  error: number;
  state: PIDState;
}

// ---------------------------------------------------------------------------
// ODE Solvers
// ---------------------------------------------------------------------------

class NumericalMethodsEngineImpl {

  /**
   * Euler forward (explicit) method for dy/dt = f(t, y).
   */
  eulerForward(
    f: (t: number, y: number) => number,
    y0: number, t0: number, tf: number, n: number
  ): ODEResult {
    if (n <= 0) return { t: [t0], y: [y0], steps: 0, method: "euler_forward" };
    const h = (tf - t0) / n;
    const t = [t0];
    const y = [y0];

    for (let i = 0; i < n; i++) {
      y.push(y[i] + h * f(t[i], y[i]));
      t.push(t[i] + h);
    }

    return { t, y, steps: n, method: "euler_forward" };
  }

  /**
   * Euler backward (implicit) method using Newton iteration.
   */
  eulerBackward(
    f: (t: number, y: number) => number,
    df: (t: number, y: number) => number,
    y0: number, t0: number, tf: number, n: number
  ): ODEResult {
    if (n <= 0) return { t: [t0], y: [y0], steps: 0, method: "euler_backward" };
    const h = (tf - t0) / n;
    const t = [t0];
    const y = [y0];

    for (let i = 0; i < n; i++) {
      const tNext = t[i] + h;
      let yNext = y[i];

      // Newton iteration: solve y_{n+1} = y_n + h*f(t_{n+1}, y_{n+1})
      for (let iter = 0; iter < 10; iter++) {
        const F = yNext - y[i] - h * f(tNext, yNext);
        const dF = 1 - h * df(tNext, yNext);
        if (Math.abs(dF) < 1e-15) break;
        const correction = F / dF;
        yNext -= correction;
        if (Math.abs(correction) < 1e-12) break;
      }

      y.push(yNext);
      t.push(tNext);
    }

    return { t, y, steps: n, method: "euler_backward" };
  }

  /**
   * Classical 4th-order Runge-Kutta method.
   */
  rk4(
    f: (t: number, y: number) => number,
    y0: number, t0: number, tf: number, n: number
  ): ODEResult {
    if (n <= 0) return { t: [t0], y: [y0], steps: 0, method: "rk4" };
    const h = (tf - t0) / n;
    const t = [t0];
    const y = [y0];

    for (let i = 0; i < n; i++) {
      const k1 = f(t[i], y[i]);
      const k2 = f(t[i] + h / 2, y[i] + h * k1 / 2);
      const k3 = f(t[i] + h / 2, y[i] + h * k2 / 2);
      const k4 = f(t[i] + h, y[i] + h * k3);

      y.push(y[i] + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4));
      t.push(t[i] + h);
    }

    return { t, y, steps: n, method: "rk4" };
  }

  /**
   * RK4 for systems of ODEs: dY/dt = F(t, Y).
   */
  rk4System(
    F: (t: number, Y: number[]) => number[],
    Y0: number[], t0: number, tf: number, n: number
  ): ODESystemResult {
    if (n <= 0) return { t: [t0], Y: [Y0.slice()], steps: 0, dimensions: Y0.length, method: "rk4_system" };
    const h = (tf - t0) / n;
    const dim = Y0.length;
    const t = [t0];
    const Y = [Y0.slice()];

    for (let i = 0; i < n; i++) {
      const Yi = Y[i];
      const ti = t[i];

      const k1 = F(ti, Yi);
      const k2 = F(ti + h / 2, Yi.map((y, j) => y + h * k1[j] / 2));
      const k3 = F(ti + h / 2, Yi.map((y, j) => y + h * k2[j] / 2));
      const k4 = F(ti + h, Yi.map((y, j) => y + h * k3[j]));

      const Ynext = Yi.map((y, j) =>
        y + (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])
      );

      Y.push(Ynext);
      t.push(ti + h);
    }

    return { t, Y, steps: n, dimensions: dim, method: "rk4_system" };
  }

  // -------------------------------------------------------------------------
  // Linear Algebra
  // -------------------------------------------------------------------------

  /**
   * LU decomposition with partial pivoting.
   */
  luDecomposition(A: number[][]): LUResult {
    const n = A.length;
    if (n === 0) throw new Error("Empty matrix");
    if (A.some(row => row.length !== n)) throw new Error("Matrix must be square");

    const L = Array.from({ length: n }, () => Array(n).fill(0));
    const U = A.map(row => [...row]);
    const P = Array.from({ length: n }, (_, i) => i);

    for (let k = 0; k < n - 1; k++) {
      // Find pivot
      let maxVal = Math.abs(U[k][k]);
      let maxRow = k;
      for (let i = k + 1; i < n; i++) {
        if (Math.abs(U[i][k]) > maxVal) {
          maxVal = Math.abs(U[i][k]);
          maxRow = i;
        }
      }

      // Swap rows
      if (maxRow !== k) {
        [U[k], U[maxRow]] = [U[maxRow], U[k]];
        [L[k], L[maxRow]] = [L[maxRow], L[k]];
        [P[k], P[maxRow]] = [P[maxRow], P[k]];
      }

      // Elimination
      if (Math.abs(U[k][k]) < 1e-15) continue; // singular
      for (let i = k + 1; i < n; i++) {
        L[i][k] = U[i][k] / U[k][k];
        for (let j = k; j < n; j++) {
          U[i][j] -= L[i][k] * U[k][j];
        }
      }
    }

    // Set diagonal of L to 1
    for (let i = 0; i < n; i++) L[i][i] = 1;

    // Determinant = product of U diagonal × sign of permutation
    let det = 1;
    for (let i = 0; i < n; i++) det *= U[i][i];
    let swaps = 0;
    const pCopy = [...P];
    for (let i = 0; i < n; i++) {
      while (pCopy[i] !== i) {
        const target = pCopy[i];
        [pCopy[i], pCopy[target]] = [pCopy[target], pCopy[i]];
        swaps++;
      }
    }
    if (swaps % 2 !== 0) det = -det;

    return { L, U, P, determinant: det };
  }

  /**
   * Solve Ax = b using LU decomposition.
   */
  solveLU(A: number[][], b: number[]): number[] {
    const { L, U, P } = this.luDecomposition(A);
    const n = A.length;

    // Apply permutation
    const pb = P.map(i => b[i]);

    // Forward substitution: Ly = pb
    const y = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      y[i] = pb[i];
      for (let j = 0; j < i; j++) {
        y[i] -= L[i][j] * y[j];
      }
    }

    // Backward substitution: Ux = y
    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = y[i];
      for (let j = i + 1; j < n; j++) {
        x[i] -= U[i][j] * x[j];
      }
      if (Math.abs(U[i][i]) < 1e-15) throw new Error("Singular matrix");
      x[i] /= U[i][i];
    }

    return x;
  }

  /**
   * Least squares solution via QR factorization (Gram-Schmidt).
   */
  leastSquaresQR(A: number[][], b: number[]): LeastSquaresResult {
    const m = A.length;
    const n = A[0].length;
    if (m < n) throw new Error("Underdetermined system (m < n)");

    const Q = Array.from({ length: m }, () => Array(n).fill(0));
    const R = Array.from({ length: n }, () => Array(n).fill(0));

    for (let j = 0; j < n; j++) {
      // Copy column j
      for (let i = 0; i < m; i++) Q[i][j] = A[i][j];

      // Orthogonalize against previous columns
      for (let k = 0; k < j; k++) {
        let dot = 0;
        for (let i = 0; i < m; i++) dot += Q[i][k] * A[i][j];
        R[k][j] = dot;
        for (let i = 0; i < m; i++) Q[i][j] -= dot * Q[i][k];
      }

      // Normalize
      let norm = 0;
      for (let i = 0; i < m; i++) norm += Q[i][j] * Q[i][j];
      norm = Math.sqrt(norm);
      R[j][j] = norm;
      if (norm > 1e-15) {
        for (let i = 0; i < m; i++) Q[i][j] /= norm;
      }
    }

    // Solve Rx = Q^T b
    const Qtb = Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < m; i++) Qtb[j] += Q[i][j] * b[i];
    }

    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = Qtb[i];
      for (let j = i + 1; j < n; j++) x[i] -= R[i][j] * x[j];
      if (Math.abs(R[i][i]) < 1e-15) throw new Error("Rank-deficient matrix");
      x[i] /= R[i][i];
    }

    // Residual: ||b - Ax||
    let residualSq = 0;
    for (let i = 0; i < m; i++) {
      let ax = 0;
      for (let j = 0; j < n; j++) ax += A[i][j] * x[j];
      residualSq += (b[i] - ax) ** 2;
    }

    return { x, residualNorm: Math.sqrt(residualSq), rank: n };
  }

  // -------------------------------------------------------------------------
  // Digital Control
  // -------------------------------------------------------------------------

  /**
   * Tustin (bilinear) discretization of first-order continuous TF.
   * G(s) = K / (tau*s + 1) → G(z)
   */
  tustinDiscretize(K: number, tau: number, T: number): DiscreteTF {
    if (T <= 0) throw new Error("Sampling period must be positive");
    const a = 2 * tau / T;
    const numZ = [K, K];
    const denZ = [a + 1, 1 - a];

    // Normalize
    const norm = denZ[0];
    return {
      num: numZ.map(x => x / norm),
      den: denZ.map(x => x / norm),
      T,
    };
  }

  /**
   * Zero-order hold discretization of state-space {A, B, C, D}.
   * Simple first-order approximation: Phi ≈ I + AT, Gamma ≈ BT.
   */
  zohDiscretize(
    A: number[][], B: number[], C: number[], D: number, T: number
  ): DiscreteStateSpace {
    if (T <= 0) throw new Error("Sampling period must be positive");
    const n = A.length;

    const Phi = A.map((row, i) =>
      row.map((x, j) => (i === j ? 1 : 0) + x * T)
    );
    const Gamma = B.map(x => x * T);

    return { Phi, Gamma, C, D, T };
  }

  /**
   * Digital PID controller — single step computation.
   * Uses trapezoidal integration and backward-difference derivative.
   */
  computePID(
    setpoint: number, measured: number,
    Kp: number, Ki: number, Kd: number, T: number,
    state: PIDState
  ): PIDResult {
    if (T <= 0) throw new Error("Sampling period must be positive");
    const error = setpoint - measured;

    const P = Kp * error;
    const newIntegral = state.integral + T * (error + state.prevError) / 2;
    const I = Ki * newIntegral;
    const D = Kd * (error - state.prevError) / T;
    const output = P + I + D;

    return {
      output,
      proportional: P,
      integral: I,
      derivative: D,
      error,
      state: { integral: newIntegral, prevError: error, output },
    };
  }

  /**
   * Create initial PID state.
   */
  createPIDState(): PIDState {
    return { integral: 0, prevError: 0, output: 0 };
  }

  /**
   * Simulate a closed-loop PID response over time.
   */
  simulatePID(params: {
    setpoint: number;
    Kp: number;
    Ki: number;
    Kd: number;
    T: number;
    plantGain?: number;
    plantTimeConstant?: number;
    duration: number;
    disturbance?: number;
    disturbanceTime?: number;
  }): {
    time: number[];
    output: number[];
    error: number[];
    control: number[];
    settlingTime: number | null;
    overshoot: number;
    steadyStateError: number;
  } {
    const {
      setpoint, Kp, Ki, Kd, T,
      plantGain = 1, plantTimeConstant = 1,
      duration, disturbance = 0, disturbanceTime = Infinity,
    } = params;

    const steps = Math.ceil(duration / T);
    const time: number[] = [];
    const output: number[] = [];
    const error: number[] = [];
    const control: number[] = [];

    let pidState = this.createPIDState();
    let plantState = 0; // First-order plant state

    for (let i = 0; i <= steps; i++) {
      const t = i * T;
      time.push(t);

      // Disturbance injection
      const dist = t >= disturbanceTime ? disturbance : 0;
      const measured = plantState + dist;
      output.push(measured);
      error.push(setpoint - measured);

      // PID step
      const pid = this.computePID(setpoint, measured, Kp, Ki, Kd, T, pidState);
      pidState = pid.state;
      control.push(pid.output);

      // Plant simulation: first-order G(s) = K / (tau*s + 1)
      const alpha = T / (plantTimeConstant + T);
      plantState = (1 - alpha) * plantState + alpha * plantGain * pid.output;
    }

    // Performance metrics
    const tolerance = 0.02 * Math.abs(setpoint);
    let settlingTime: number | null = null;
    for (let i = output.length - 1; i >= 0; i--) {
      if (Math.abs(output[i] - setpoint) > tolerance) {
        settlingTime = time[Math.min(i + 1, time.length - 1)];
        break;
      }
    }

    const maxOutput = Math.max(...output);
    const overshoot = setpoint > 0
      ? Math.max(0, (maxOutput - setpoint) / setpoint * 100)
      : 0;

    const steadyStateError = Math.abs(setpoint - output[output.length - 1]);

    return { time, output, error, control, settlingTime, overshoot, steadyStateError };
  }

  // -------------------------------------------------------------------------
  // Control Systems (from PRISM_CONTROL_SYSTEMS_MIT)
  // -------------------------------------------------------------------------

  /**
   * Ziegler-Nichols PID tuning from ultimate gain and period.
   */
  zieglerNicholsTuning(
    Ku: number, Tu: number, type: "P" | "PI" | "PID" = "PID"
  ): { Kp: number; Ki: number; Kd: number; method: string } {
    if (Ku <= 0 || Tu <= 0) throw new Error("Ku and Tu must be positive");
    switch (type) {
      case "P":
        return { Kp: 0.5 * Ku, Ki: 0, Kd: 0, method: "Ziegler-Nichols P" };
      case "PI":
        return { Kp: 0.45 * Ku, Ki: 1.2 * Ku / Tu, Kd: 0, method: "Ziegler-Nichols PI" };
      case "PID":
        return { Kp: 0.6 * Ku, Ki: 2 * Ku / Tu, Kd: Ku * Tu / 8, method: "Ziegler-Nichols PID" };
    }
  }

  /**
   * First-order system step response: y(t) = K * (1 - e^(-t/tau))
   */
  firstOrderStep(K: number, tau: number, t: number): number {
    if (tau <= 0) return K;
    return K * (1 - Math.exp(-t / tau));
  }

  /**
   * Second-order system step response (underdamped/critically/overdamped).
   */
  secondOrderStep(K: number, wn: number, zeta: number, t: number): number {
    if (t <= 0) return 0;
    if (zeta < 1) {
      // Underdamped
      const wd = wn * Math.sqrt(1 - zeta * zeta);
      const phi = Math.atan2(zeta, Math.sqrt(1 - zeta * zeta));
      return K * (1 - (Math.exp(-zeta * wn * t) / Math.sqrt(1 - zeta * zeta))
        * Math.sin(wd * t + phi + Math.PI / 2));
    } else if (Math.abs(zeta - 1) < 1e-10) {
      // Critically damped
      return K * (1 - (1 + wn * t) * Math.exp(-wn * t));
    } else {
      // Overdamped
      const s1 = -wn * (zeta - Math.sqrt(zeta * zeta - 1));
      const s2 = -wn * (zeta + Math.sqrt(zeta * zeta - 1));
      return K * (1 + (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t))
        / (s1 - s2));
    }
  }
}

export const numericalMethodsEngine = new NumericalMethodsEngineImpl();
