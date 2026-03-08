/**
 * StochasticProcessEngine — Stochastic process models for machining tool life
 *
 * Models: Markov chain (tool state transitions), Wiener process (continuous wear),
 *   Poisson process (random breakage), Hidden Markov Model (Viterbi decoding)
 *
 * References: Ross "Stochastic Processes" Ch. 4-6, Rabiner (1989) HMM tutorial,
 *   Lin & Ghosh (2006) tool wear as diffusion process, Altintas Ch. 10
 */

// ─── Types ─────────────────────────────────────────────────────────

export interface MarkovInput {
  states: string[];
  transition_matrix: number[][];
  initial_state?: number;
  n_steps?: number;
}

export interface WienerInput {
  vb_initial_mm: number;
  drift_mm_per_min: number;
  volatility_mm_per_sqrt_min: number;
  threshold_mm: number;
  dt_min?: number;
  n_simulations?: number;
}

export interface PoissonInput {
  lambda_per_min: number;
  time_window_min: number;
}

export interface HMMInput {
  observations: number[];
  n_hidden_states?: number;
  n_obs_symbols?: number;
  emission_matrix?: number[][];
  transition_matrix?: number[][];
}

export interface StochasticInput {
  model: "markov" | "wiener" | "poisson" | "hmm";
  markov?: MarkovInput;
  wiener?: WienerInput;
  poisson?: PoissonInput;
  hmm?: HMMInput;
}

export interface MarkovResult {
  steady_state: number[];
  expected_steps_to_failure: number;
  state_sequence: number[];
  absorption_probability: number;
}

export interface WienerResult {
  mean_first_passage_min: number;
  std_first_passage_min: number;
  percentile_10_min: number;
  percentile_90_min: number;
  survival_probability_at: Array<{ time_min: number; probability: number }>;
  sample_paths: number[][];
}

export interface PoissonResult {
  expected_events: number;
  probability_zero: number;
  probability_at_least_one: number;
  probabilities: Array<{ n: number; probability: number }>;
}

export interface HMMResult {
  most_likely_states: number[];
  state_probabilities: number[][];
  log_likelihood: number;
}

export interface StochasticResult {
  model: string;
  markov_result?: MarkovResult;
  wiener_result?: WienerResult;
  poisson_result?: PoissonResult;
  hmm_result?: HMMResult;
  warnings: string[];
  formula: string;
}

// ─── Helpers ───────────────────────────────────────────────────────

/** Seed-free Box-Muller normal variate */
function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Factorial for small n (Poisson PMF) */
function factorial(n: number): number {
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/** Log-sum-exp for numerical stability */
function logSumExp(arr: number[]): number {
  const maxVal = Math.max(...arr);
  if (maxVal === -Infinity) return -Infinity;
  let sum = 0;
  for (const v of arr) sum += Math.exp(v - maxVal);
  return maxVal + Math.log(sum);
}

/** Validate a row-stochastic matrix */
function validateStochastic(matrix: number[][], label: string, warnings: string[]): void {
  for (let i = 0; i < matrix.length; i++) {
    const rowSum = matrix[i].reduce((a, b) => a + b, 0);
    if (Math.abs(rowSum - 1.0) > 1e-6) {
      warnings.push(`${label} row ${i} sums to ${rowSum.toFixed(6)}, expected 1.0`);
    }
    for (let j = 0; j < matrix[i].length; j++) {
      if (matrix[i][j] < 0 || matrix[i][j] > 1) {
        warnings.push(`${label}[${i}][${j}] = ${matrix[i][j]} out of [0,1]`);
      }
    }
  }
}

// ─── Engine ────────────────────────────────────────────────────────

export class StochasticProcessEngine {

  /** Dispatch to the appropriate model */
  simulate(input: StochasticInput): StochasticResult {
    const warnings: string[] = [];

    switch (input.model) {
      case "markov": {
        if (!input.markov) throw new Error("markov field required for model='markov'");
        const mr = this.markovChain(input.markov, warnings);
        return {
          model: "markov",
          markov_result: mr,
          warnings,
          formula: "π = πP (steady-state); " +
            "P(absorption) from fundamental matrix N=(I-Q)^{-1}",
        };
      }
      case "wiener": {
        if (!input.wiener) throw new Error("wiener field required for model='wiener'");
        const wr = this.wienerProcess(input.wiener, warnings);
        return {
          model: "wiener",
          wiener_result: wr,
          warnings,
          formula: "VB(t) = VB₀ + μt + σW(t); E[T] = (threshold - VB₀)/μ",
        };
      }
      case "poisson": {
        if (!input.poisson) throw new Error("poisson field required for model='poisson'");
        const pr = this.poissonProcess(input.poisson, warnings);
        return {
          model: "poisson",
          poisson_result: pr,
          warnings,
          formula: "P(N=k) = (λT)^k · e^{-λT} / k!",
        };
      }
      case "hmm": {
        if (!input.hmm) throw new Error("hmm field required for model='hmm'");
        const hr = this.hiddenMarkov(input.hmm, warnings);
        return {
          model: "hmm",
          hmm_result: hr,
          warnings,
          formula: "Viterbi: δ_t(j) = max_i[δ_{t-1}(i)·a_{ij}]·b_j(o_t); " +
            "Forward: α_t(j) = Σ_i α_{t-1}(i)·a_{ij}·b_j(o_t)",
        };
      }
      default:
        throw new Error(`Unknown stochastic model: ${input.model}`);
    }
  }

  // ── Markov Chain ───────────────────────────────────────────────

  markovChain(input: MarkovInput, warnings: string[] = []): MarkovResult {
    const { states, transition_matrix: P, initial_state = 0, n_steps = 100 } = input;
    const n = states.length;

    if (P.length !== n || P.some(row => row.length !== n)) {
      throw new Error(`Transition matrix must be ${n}×${n}, got ${P.length}×${P[0]?.length ?? 0}`);
    }
    validateStochastic(P, "transition_matrix", warnings);

    // Simulate state sequence
    const sequence: number[] = [initial_state];
    let current = initial_state;
    for (let step = 0; step < n_steps; step++) {
      const r = Math.random();
      let cumulative = 0;
      let next = current;
      for (let j = 0; j < n; j++) {
        cumulative += P[current][j];
        if (r <= cumulative) { next = j; break; }
      }
      current = next;
      sequence.push(current);
    }

    // Steady-state via power iteration
    let pi = new Array<number>(n).fill(1.0 / n);
    for (let iter = 0; iter < 1000; iter++) {
      const piNext = new Array<number>(n).fill(0);
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          piNext[j] += pi[i] * P[i][j];
        }
      }
      const diff = piNext.reduce((s, v, idx) => s + Math.abs(v - pi[idx]), 0);
      pi = piNext;
      if (diff < 1e-12) break;
    }

    // Absorption: treat last state as absorbing
    const absorbIdx = n - 1;
    let expectedSteps = 0;
    let absorptionProb = 0;

    if (P[absorbIdx][absorbIdx] >= 0.999) {
      // Last state is absorbing — use fundamental matrix approach
      const transientN = n - 1;
      if (transientN > 0) {
        // Q = transient sub-matrix
        const Q: number[][] = [];
        for (let i = 0; i < transientN; i++) {
          Q.push(P[i].slice(0, transientN));
        }
        // N = (I - Q)^{-1} via Gauss-Jordan for small n
        const fund = this.invertIminusQ(Q, transientN);
        if (fund) {
          // Expected steps from initial state to absorption
          for (let j = 0; j < transientN; j++) {
            expectedSteps += fund[initial_state < transientN ? initial_state : 0][j];
          }
          absorptionProb = 1.0;
        }
      }
    } else {
      // Estimate from simulation
      const failIdx = n - 1;
      const hitIdx = sequence.indexOf(failIdx);
      expectedSteps = hitIdx >= 0 ? hitIdx : n_steps;
      absorptionProb = pi[failIdx];
    }

    return {
      steady_state: pi,
      expected_steps_to_failure: expectedSteps,
      state_sequence: sequence,
      absorption_probability: absorptionProb,
    };
  }

  /** Invert (I - Q) for small transient sub-matrix via Gauss-Jordan */
  private invertIminusQ(Q: number[][], n: number): number[][] | null {
    // Build augmented [I-Q | I]
    const aug: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row = new Array<number>(2 * n).fill(0);
      for (let j = 0; j < n; j++) {
        row[j] = (i === j ? 1 : 0) - Q[i][j];
      }
      row[n + i] = 1;
      aug.push(row);
    }
    // Forward elimination
    for (let col = 0; col < n; col++) {
      let pivotRow = -1;
      let pivotVal = 0;
      for (let row = col; row < n; row++) {
        if (Math.abs(aug[row][col]) > pivotVal) {
          pivotVal = Math.abs(aug[row][col]);
          pivotRow = row;
        }
      }
      if (pivotRow < 0 || pivotVal < 1e-15) return null;
      [aug[col], aug[pivotRow]] = [aug[pivotRow], aug[col]];
      const scale = aug[col][col];
      for (let j = 0; j < 2 * n; j++) aug[col][j] /= scale;
      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const factor = aug[row][col];
        for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
      }
    }
    // Extract inverse from right half
    return aug.map(row => row.slice(n));
  }

  // ── Wiener Process ─────────────────────────────────────────────

  wienerProcess(input: WienerInput, warnings: string[] = []): WienerResult {
    const {
      vb_initial_mm: vb0,
      drift_mm_per_min: mu,
      volatility_mm_per_sqrt_min: sigma,
      threshold_mm: threshold = 0.3,
      dt_min: dt = 0.1,
      n_simulations: nSim = 500,
    } = input;

    if (mu <= 0) warnings.push("Drift μ ≤ 0: wear may never reach threshold");
    if (sigma < 0) throw new Error("Volatility σ must be non-negative");
    if (threshold <= vb0) warnings.push("Threshold ≤ initial wear; already failed");

    const distance = threshold - vb0;
    // Analytical mean first passage for Wiener with drift
    const analyticalMean = mu > 0 ? distance / mu : Infinity;

    const firstPassageTimes: number[] = [];
    const samplePaths: number[][] = [];
    const horizon = analyticalMean > 0 && isFinite(analyticalMean)
      ? analyticalMean * 5 : 1000;
    const maxSteps = Math.ceil(horizon / dt);
    const sqrtDt = Math.sqrt(dt);

    for (let sim = 0; sim < nSim; sim++) {
      let vb = vb0;
      const path: number[] = sim < 5 ? [vb] : [];
      let hit = false;

      for (let step = 0; step < maxSteps; step++) {
        vb += mu * dt + sigma * sqrtDt * randn();
        if (sim < 5) path.push(vb);

        if (vb >= threshold) {
          firstPassageTimes.push((step + 1) * dt);
          hit = true;
          break;
        }
      }
      if (!hit) {
        firstPassageTimes.push(maxSteps * dt);
        warnings.push(`Simulation ${sim} did not reach threshold in ${maxSteps} steps`);
        if (warnings.length > 10) { warnings.length = 10; break; }
      }
      if (sim < 5) samplePaths.push(path);
    }

    firstPassageTimes.sort((a, b) => a - b);
    const nFpt = firstPassageTimes.length;
    const mean = firstPassageTimes.reduce((s, v) => s + v, 0) / nFpt;
    const variance = firstPassageTimes.reduce(
      (s, v) => s + (v - mean) ** 2, 0,
    ) / nFpt;

    // Survival curve at selected time points
    const tMax = firstPassageTimes[nFpt - 1];
    const survivalPoints: Array<{
      time_min: number; probability: number;
    }> = [];
    for (let frac = 0; frac <= 1.0; frac += 0.1) {
      const t = frac * tMax;
      const surviving = firstPassageTimes.filter(fp => fp > t).length;
      survivalPoints.push({
        time_min: +t.toFixed(2),
        probability: +(surviving / nFpt).toFixed(4),
      });
    }

    const p10Idx = Math.floor(0.1 * nFpt);
    const p90Idx = Math.floor(0.9 * nFpt);
    return {
      mean_first_passage_min: +mean.toFixed(4),
      std_first_passage_min: +Math.sqrt(variance).toFixed(4),
      percentile_10_min: +firstPassageTimes[p10Idx].toFixed(4),
      percentile_90_min: +firstPassageTimes[p90Idx].toFixed(4),
      survival_probability_at: survivalPoints,
      sample_paths: samplePaths.map(p => p.map(v => +v.toFixed(5))),
    };
  }

  // ── Poisson Process ────────────────────────────────────────────

  poissonProcess(input: PoissonInput, warnings: string[] = []): PoissonResult {
    const { lambda_per_min: lam, time_window_min: T } = input;

    if (lam < 0) throw new Error("Rate λ must be non-negative");
    if (T <= 0) throw new Error("Time window must be positive");
    if (lam * T > 170) warnings.push("λT very large; factorial overflow possible for high k");

    const lamT = lam * T;
    const expNeg = Math.exp(-lamT);

    // PMF for k = 0..min(20, meaningful)
    const maxK = Math.min(20, Math.ceil(lamT + 5 * Math.sqrt(lamT) + 5));
    const probs: Array<{ n: number; probability: number }> = [];
    for (let k = 0; k <= maxK; k++) {
      // Use log-space for numerical stability
      const logP = k * Math.log(lamT) - lamT - logFactorial(k);
      probs.push({ n: k, probability: +Math.exp(logP).toFixed(10) });
    }

    return {
      expected_events: +lamT.toFixed(6),
      probability_zero: +expNeg.toFixed(10),
      probability_at_least_one: +(1 - expNeg).toFixed(10),
      probabilities: probs,
    };
  }

  // ── Hidden Markov Model (Viterbi + Forward) ────────────────────

  hiddenMarkov(input: HMMInput, warnings: string[] = []): HMMResult {
    const {
      observations: obs,
      n_hidden_states: nStates = 3,
      n_obs_symbols: nObs = 5,
    } = input;

    if (obs.length === 0) throw new Error("Observations array is empty");

    // Default transition: left-to-right bias (tool degradation)
    const A = input.transition_matrix ?? this.defaultTransition(nStates);
    // Default emission: each state peaks at different vibration level
    const B = input.emission_matrix ?? this.defaultEmission(nStates, nObs);

    if (A.length !== nStates || A.some(r => r.length !== nStates)) {
      throw new Error(`Transition matrix must be ${nStates}×${nStates}`);
    }
    if (B.length !== nStates || B.some(r => r.length !== nObs)) {
      throw new Error(`Emission matrix must be ${nStates}×${nObs}`);
    }
    validateStochastic(A, "HMM transition", warnings);
    validateStochastic(B, "HMM emission", warnings);

    // Validate observations within symbol range
    for (const o of obs) {
      if (o < 0 || o >= nObs || !Number.isInteger(o)) {
        throw new Error(`Observation ${o} out of range [0, ${nObs - 1}]`);
      }
    }

    // Initial distribution: uniform
    const logPi = new Array<number>(nStates).fill(Math.log(1.0 / nStates));
    const T = obs.length;

    // Log-space matrices for A and B
    const logA = A.map(row => row.map(v => (v > 0 ? Math.log(v) : -Infinity)));
    const logB = B.map(row => row.map(v => (v > 0 ? Math.log(v) : -Infinity)));

    // ── Viterbi (log-space) ──
    const delta: number[][] = Array.from({ length: T }, () => new Array<number>(nStates));
    const psi: number[][] = Array.from({ length: T }, () => new Array<number>(nStates).fill(0));

    // Init
    for (let j = 0; j < nStates; j++) {
      delta[0][j] = logPi[j] + logB[j][obs[0]];
    }

    // Recursion
    for (let t = 1; t < T; t++) {
      for (let j = 0; j < nStates; j++) {
        let bestVal = -Infinity;
        let bestIdx = 0;
        for (let i = 0; i < nStates; i++) {
          const candidate = delta[t - 1][i] + logA[i][j];
          if (candidate > bestVal) {
            bestVal = candidate;
            bestIdx = i;
          }
        }
        delta[t][j] = bestVal + logB[j][obs[t]];
        psi[t][j] = bestIdx;
      }
    }

    // Backtrack
    const viterbiPath = new Array<number>(T);
    let bestFinal = -Infinity;
    viterbiPath[T - 1] = 0;
    for (let j = 0; j < nStates; j++) {
      if (delta[T - 1][j] > bestFinal) {
        bestFinal = delta[T - 1][j];
        viterbiPath[T - 1] = j;
      }
    }
    for (let t = T - 2; t >= 0; t--) {
      viterbiPath[t] = psi[t + 1][viterbiPath[t + 1]];
    }

    // ── Forward algorithm (log-space) → posterior probabilities ──
    const alpha: number[][] = Array.from({ length: T }, () => new Array<number>(nStates));

    for (let j = 0; j < nStates; j++) {
      alpha[0][j] = logPi[j] + logB[j][obs[0]];
    }
    for (let t = 1; t < T; t++) {
      for (let j = 0; j < nStates; j++) {
        const terms: number[] = [];
        for (let i = 0; i < nStates; i++) {
          terms.push(alpha[t - 1][i] + logA[i][j]);
        }
        alpha[t][j] = logSumExp(terms) + logB[j][obs[t]];
      }
    }

    const logLikelihood = logSumExp(alpha[T - 1]);

    // Posterior: normalize alpha rows (approximate — without backward pass this is filtered, not smoothed)
    const posteriors: number[][] = alpha.map(row => {
      const lse = logSumExp(row);
      return row.map(v => +Math.exp(v - lse).toFixed(6));
    });

    return {
      most_likely_states: viterbiPath,
      state_probabilities: posteriors,
      log_likelihood: +logLikelihood.toFixed(6),
    };
  }

  // ── Default HMM parameters (machining-specific) ───────────────

  /** Left-to-right transition: tool degrades but rarely improves */
  private defaultTransition(n: number): number[][] {
    const A: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row = new Array<number>(n).fill(0);
      if (i < n - 1) {
        row[i] = 0.85;
        row[i + 1] = 0.15;
      } else {
        row[i] = 1.0; // absorbing final state
      }
      A.push(row);
    }
    return A;
  }

  /** Emission: each state peaks at corresponding vibration level */
  private defaultEmission(nStates: number, nObs: number): number[][] {
    const B: number[][] = [];
    for (let i = 0; i < nStates; i++) {
      const row = new Array<number>(nObs).fill(0);
      const peak = Math.round((i / (nStates - 1)) * (nObs - 1));
      // Gaussian-like spread around peak
      let total = 0;
      for (let j = 0; j < nObs; j++) {
        row[j] = Math.exp(-0.5 * ((j - peak) / Math.max(0.8, nObs / (2 * nStates))) ** 2);
        total += row[j];
      }
      for (let j = 0; j < nObs; j++) row[j] /= total;
      B.push(row);
    }
    return B;
  }
}

// ─── Utility ───────────────────────────────────────────────────────

/** Log-factorial using Stirling approximation for large n */
function logFactorial(n: number): number {
  if (n <= 1) return 0;
  if (n <= 20) return Math.log(factorial(n));
  // Stirling: ln(n!) ≈ n·ln(n) - n + 0.5·ln(2πn)
  return n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n);
}

// ─── Singleton ─────────────────────────────────────────────────────

export const stochasticProcessEngine = new StochasticProcessEngine();
