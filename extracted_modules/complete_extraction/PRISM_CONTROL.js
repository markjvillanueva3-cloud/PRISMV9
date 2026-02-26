const PRISM_CONTROL = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PID CONTROL
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Create PID controller instance
   */
  createPID: function(config = {}) {
    const { Kp = 1.0, Ki = 0.0, Kd = 0.0, dt = 0.01, 
            outputMin = -Infinity, outputMax = Infinity,
            antiWindup = true } = config;
    
    return {
      Kp, Ki, Kd, dt,
      outputMin, outputMax, antiWindup,
      integral: 0,
      prevError: 0,
      prevOutput: 0,
      
      reset: function() {
        this.integral = 0;
        this.prevError = 0;
      }
    };
  },
  
  /**
   * Compute PID output
   */
  pidCompute: function(pid, setpoint, measured) {
    const error = setpoint - measured;
    
    // Proportional term
    const P = pid.Kp * error;
    
    // Integral term with anti-windup
    pid.integral += error * pid.dt;
    const I = pid.Ki * pid.integral;
    
    // Derivative term (on measurement to avoid derivative kick)
    const derivative = (error - pid.prevError) / pid.dt;
    const D = pid.Kd * derivative;
    
    // Total output
    let output = P + I + D;
    
    // Saturation and anti-windup
    const saturatedOutput = Math.max(pid.outputMin, Math.min(pid.outputMax, output));
    
    if (pid.antiWindup && output !== saturatedOutput) {
      // Back-calculate integral to prevent windup
      pid.integral -= (output - saturatedOutput) / pid.Ki;
    }
    
    pid.prevError = error;
    pid.prevOutput = saturatedOutput;
    
    return {
      output: saturatedOutput,
      error,
      P, I, D,
      saturated: output !== saturatedOutput
    };
  },
  
  /**
   * Ziegler-Nichols tuning
   */
  zieglerNichols: function(Ku, Tu, type = 'PID') {
    switch (type.toUpperCase()) {
      case 'P':
        return { Kp: 0.5 * Ku, Ki: 0, Kd: 0 };
      case 'PI':
        return { Kp: 0.45 * Ku, Ki: 0.54 * Ku / Tu, Kd: 0 };
      case 'PID':
        return { Kp: 0.6 * Ku, Ki: 1.2 * Ku / Tu, Kd: 0.075 * Ku * Tu };
      case 'PESSEN':
        return { Kp: 0.7 * Ku, Ki: 1.75 * Ku / Tu, Kd: 0.105 * Ku * Tu };
      case 'SOME_OVERSHOOT':
        return { Kp: 0.33 * Ku, Ki: 0.66 * Ku / Tu, Kd: 0.11 * Ku * Tu };
      case 'NO_OVERSHOOT':
        return { Kp: 0.2 * Ku, Ki: 0.4 * Ku / Tu, Kd: 0.066 * Ku * Tu };
      default:
        return { Kp: 0.6 * Ku, Ki: 1.2 * Ku / Tu, Kd: 0.075 * Ku * Tu };
    }
  },
  
  /**
   * Anti-windup with back-calculation
   */
  antiWindup: function(pid, output, saturatedOutput, Kb = null) {
    if (Kb === null) Kb = 1 / pid.Ki;
    const correction = Kb * (saturatedOutput - output);
    pid.integral += correction * pid.dt;
    return pid.integral;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE SPACE
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Create state space system
   */
  createStateSpace: function(A, B, C, D = null) {
    const n = A.length;
    const m = B[0] ? B[0].length : 1;
    const p = C.length;
    
    if (!D) {
      D = Array(p).fill(null).map(() => Array(m).fill(0));
    }
    
    return { A, B, C, D, n, m, p };
  },
  
  /**
   * Simulate state space system one step
   */
  stateSpaceSimulate: function(sys, x, u, dt = null) {
    // x_next = A*x + B*u
    // y = C*x + D*u
    
    const A = dt ? this._discretizeA(sys.A, dt) : sys.A;
    const B = dt ? this._discretizeB(sys.A, sys.B, dt) : sys.B;
    
    const xNext = this._matVecMul(A, x);
    const Bu = this._matVecMul(B, Array.isArray(u) ? u : [u]);
    for (let i = 0; i < xNext.length; i++) {
      xNext[i] += Bu[i];
    }
    
    const y = this._matVecMul(sys.C, xNext);
    const Du = this._matVecMul(sys.D, Array.isArray(u) ? u : [u]);
    for (let i = 0; i < y.length; i++) {
      y[i] += Du[i];
    }
    
    return { x: xNext, y };
  },
  
  /**
   * Discretize continuous system
   */
  discretize: function(sys, dt) {
    const Ad = this._discretizeA(sys.A, dt);
    const Bd = this._discretizeB(sys.A, sys.B, dt);
    return this.createStateSpace(Ad, Bd, sys.C, sys.D);
  },
  
  /**
   * Check controllability
   */
  checkControllability: function(sys) {
    // Build controllability matrix [B, AB, A²B, ...]
    const n = sys.n;
    const C = [];
    
    let AiB = sys.B;
    for (let i = 0; i < n; i++) {
      C.push(...AiB.map(row => [...row]));
      AiB = this._matMul(sys.A, AiB);
    }
    
    // Check rank (simplified - check if determinant is non-zero for square systems)
    const rank = this._approximateRank(C);
    
    return {
      controllable: rank >= n,
      rank,
      requiredRank: n
    };
  },
  
  /**
   * Check observability
   */
  checkObservability: function(sys) {
    const n = sys.n;
    const O = [];
    
    let CAi = sys.C;
    for (let i = 0; i < n; i++) {
      O.push(...CAi);
      CAi = this._matMul(CAi, sys.A);
    }
    
    const rank = this._approximateRank(O);
    
    return {
      observable: rank >= n,
      rank,
      requiredRank: n
    };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIMAL CONTROL (LQR)
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Solve discrete LQR
   */
  solveLQR: function(A, B, Q, R, maxIter = 100, tol = 1e-6) {
    const n = A.length;
    let P = JSON.parse(JSON.stringify(Q)); // Initialize P = Q
    
    for (let iter = 0; iter < maxIter; iter++) {
      const Pold = JSON.parse(JSON.stringify(P));
      
      // P = Q + A'PA - A'PB(R + B'PB)^(-1)B'PA
      const ATP = this._matMul(this._transpose(A), P);
      const ATPA = this._matMul(ATP, A);
      const ATPB = this._matMul(ATP, B);
      const BTPB = this._matMul(this._matMul(this._transpose(B), P), B);
      
      // For single input, simplify
      const RplusBTPB = R[0][0] + BTPB[0][0];
      const K_scalar = ATPB[0][0] / RplusBTPB;
      
      // Update P
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          P[i][j] = Q[i][j] + ATPA[i][j] - ATPB[i][0] * K_scalar * ATPB[j][0];
        }
      }
      
      // Check convergence
      let maxDiff = 0;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          maxDiff = Math.max(maxDiff, Math.abs(P[i][j] - Pold[i][j]));
        }
      }
      
      if (maxDiff < tol) {
        break;
      }
    }
    
    return { P, converged: true };
  },
  
  /**
   * Compute LQR gain
   */
  computeLQRGain: function(A, B, Q, R) {
    const { P } = this.solveLQR(A, B, Q, R);
    
    // K = (R + B'PB)^(-1) B'PA
    const BTP = this._matMul(this._transpose(B), P);
    const BTPB = this._matMul(BTP, B);
    const BTPA = this._matMul(BTP, A);
    
    // For SISO: K = BTPA / (R + BTPB)
    const n = A.length;
    const K = [];
    const denom = R[0][0] + BTPB[0][0];
    
    for (let j = 0; j < n; j++) {
      K.push(BTPA[0][j] / denom);
    }
    
    return { K, P };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MODEL PREDICTIVE CONTROL
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Simple MPC step (unconstrained, for demonstration)
   */
  mpcStep: function(config) {
    const { A, B, x, xRef, Q, R, N = 10 } = config;
    
    // Build prediction matrices
    const n = A.length;
    const predictions = [];
    let Ai = A;
    
    // Predict future states
    for (let i = 0; i < N; i++) {
      predictions.push({
        A: JSON.parse(JSON.stringify(Ai)),
        error: xRef ? xRef.map((r, j) => r - x[j]) : x.map(v => -v)
      });
      Ai = this._matMul(Ai, A);
    }
    
    // For unconstrained case, use LQR as approximation
    const { K } = this.computeLQRGain(A, B, Q, R);
    
    // u = -K * x
    let u = 0;
    for (let j = 0; j < n; j++) {
      u -= K[j] * (x[j] - (xRef ? xRef[j] : 0));
    }
    
    return {
      u: [u],
      K,
      predictions
    };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // KALMAN FILTER
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Create Kalman filter
   */
  createKalman: function(config) {
    const { A, B, C, Q, R, x0 = null, P0 = null } = config;
    const n = A.length;
    
    return {
      A, B, C, Q, R,
      x: x0 || Array(n).fill(0),
      P: P0 || Array(n).fill(null).map(() => Array(n).fill(0).map((_, i, arr) => i === arr.length ? 1 : 0))
    };
  },
  
  /**
   * Kalman filter predict step
   */
  kalmanPredict: function(kf, u = null) {
    const n = kf.A.length;
    
    // x_pred = A * x + B * u
    const xPred = this._matVecMul(kf.A, kf.x);
    if (u && kf.B) {
      const Bu = this._matVecMul(kf.B, Array.isArray(u) ? u : [u]);
      for (let i = 0; i < n; i++) xPred[i] += Bu[i];
    }
    
    // P_pred = A * P * A' + Q
    const AP = this._matMul(kf.A, kf.P);
    const APAt = this._matMul(AP, this._transpose(kf.A));
    const PPred = APAt.map((row, i) => row.map((v, j) => v + kf.Q[i][j]));
    
    return { xPred, PPred };
  },
  
  /**
   * Kalman filter update step
   */
  kalmanUpdate: function(kf, y, xPred, PPred) {
    const n = kf.A.length;
    const p = kf.C.length;
    
    // Innovation: y_tilde = y - C * x_pred
    const Cx = this._matVecMul(kf.C, xPred);
    const yTilde = Array.isArray(y) ? y.map((yi, i) => yi - Cx[i]) : [y - Cx[0]];
    
    // S = C * P_pred * C' + R
    const CP = this._matMul(kf.C, PPred);
    const CPCt = this._matMul(CP, this._transpose(kf.C));
    const S = CPCt.map((row, i) => row.map((v, j) => v + kf.R[i][j]));
    
    // K = P_pred * C' * S^(-1)
    const PCtT = this._matMul(PPred, this._transpose(kf.C));
    const SInv = this._invert2x2(S); // Simplified for small matrices
    const K = this._matMul(PCtT, SInv || [[1/S[0][0]]]);
    
    // x = x_pred + K * y_tilde
    const Ky = this._matVecMul(K, yTilde);
    const xNew = xPred.map((xi, i) => xi + Ky[i]);
    
    // P = (I - K*C) * P_pred
    const KC = this._matMul(K, kf.C);
    const IminusKC = KC.map((row, i) => row.map((v, j) => (i === j ? 1 : 0) - v));
    const PNew = this._matMul(IminusKC, PPred);
    
    // Update filter state
    kf.x = xNew;
    kf.P = PNew;
    
    return { x: xNew, P: PNew, K, innovation: yTilde };
  },
  
  /**
   * Extended Kalman Filter step
   */
  ekfStep: function(config) {
    const { f, h, Fx, Hx, x, P, u, y, Q, R } = config;
    
    // Predict
    const xPred = f(x, u);
    const F = Fx(x, u); // Jacobian of f
    const PPred = this._matMul(this._matMul(F, P), this._transpose(F));
    for (let i = 0; i < Q.length; i++) {
      for (let j = 0; j < Q[i].length; j++) {
        PPred[i][j] += Q[i][j];
      }
    }
    
    // Update
    const H = Hx(xPred); // Jacobian of h
    const yPred = h(xPred);
    const innovation = Array.isArray(y) ? y.map((yi, i) => yi - yPred[i]) : [y - yPred];
    
    // S = H*P*H' + R
    const HP = this._matMul(H, PPred);
    const HPHt = this._matMul(HP, this._transpose(H));
    const S = HPHt.map((row, i) => row.map((v, j) => v + R[i][j]));
    
    // K = P*H'*S^(-1)
    const PHt = this._matMul(PPred, this._transpose(H));
    const SInv = S.length === 1 ? [[1/S[0][0]]] : this._invert2x2(S);
    const K = this._matMul(PHt, SInv);
    
    // x = xPred + K*innovation
    const Kinno = this._matVecMul(K, innovation);
    const xNew = xPred.map((xi, i) => xi + Kinno[i]);
    
    // P = (I - K*H)*PPred
    const KH = this._matMul(K, H);
    const ImKH = KH.map((row, i) => row.map((v, j) => (i === j ? 1 : 0) - v));
    const PNew = this._matMul(ImKH, PPred);
    
    return { x: xNew, P: PNew, K, innovation };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ADAPTIVE CONTROL
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Model Reference Adaptive Control update
   */
  mracUpdate: function(config) {
    const { theta, phi, e, gamma, dt } = config;
    
    // θ_dot = -Γ * φ * e
    const thetaNew = theta.map((t, i) => t - gamma * phi[i] * e * dt);
    
    return { theta: thetaNew };
  },
  
  /**
   * Gain scheduling
   */
  gainSchedule: function(config) {
    const { schedulePoints, currentValue } = config;
    
    // Find surrounding schedule points
    const sorted = [...schedulePoints].sort((a, b) => a.value - b.value);
    
    let lower = sorted[0];
    let upper = sorted[sorted.length - 1];
    
    for (let i = 0; i < sorted.length - 1; i++) {
      if (currentValue >= sorted[i].value && currentValue <= sorted[i+1].value) {
        lower = sorted[i];
        upper = sorted[i+1];
        break;
      }
    }
    
    // Linear interpolation
    const t = (currentValue - lower.value) / (upper.value - lower.value + 1e-10);
    
    const gains = {};
    for (const key of Object.keys(lower.gains)) {
      gains[key] = lower.gains[key] + t * (upper.gains[key] - lower.gains[key]);
    }
    
    return gains;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MACHINING SPECIFIC CONTROL
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Adaptive feed rate control
   */
  adaptiveFeed: function(config) {
    const { 
      currentFeed, targetForce, measuredForce,
      minFeed = 10, maxFeed = 5000,
      maxChange = 100,
      Kp = 0.5, Ki = 0.1
    } = config;
    
    const error = targetForce - measuredForce;
    
    // PI control on force error
    this._adaptiveFeedIntegral = (this._adaptiveFeedIntegral || 0) + error;
    
    let feedChange = Kp * error + Ki * this._adaptiveFeedIntegral;
    
    // Rate limit
    feedChange = Math.max(-maxChange, Math.min(maxChange, feedChange));
    
    // Calculate new feed
    let newFeed = currentFeed + feedChange;
    newFeed = Math.max(minFeed, Math.min(maxFeed, newFeed));
    
    // Anti-windup
    if (newFeed === minFeed || newFeed === maxFeed) {
      this._adaptiveFeedIntegral -= error;
    }
    
    return {
      feed: newFeed,
      error,
      feedChange,
      limited: newFeed === minFeed || newFeed === maxFeed
    };
  },
  
  /**
   * Constant chip load control
   */
  constantChipLoad: function(config) {
    const { 
      nominalFeed, targetPower, measuredPower,
      minFeed = 10, maxFeed = 5000,
      smoothing = 0.8
    } = config;
    
    // Feed proportional to power ratio
    const ratio = measuredPower > 0 ? targetPower / measuredPower : 1;
    let newFeed = nominalFeed * ratio;
    
    // Smooth the response
    const prevFeed = this._prevChipLoadFeed || nominalFeed;
    newFeed = smoothing * prevFeed + (1 - smoothing) * newFeed;
    
    // Apply limits
    newFeed = Math.max(minFeed, Math.min(maxFeed, newFeed));
    
    this._prevChipLoadFeed = newFeed;
    
    return {
      feed: newFeed,