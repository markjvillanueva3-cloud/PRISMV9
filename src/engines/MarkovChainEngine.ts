/**
 * MarkovChainEngine — Markov Chain Modeling & Analysis
 *
 * Implements discrete-time Markov chain operations:
 * - Transition matrix operations
 * - Steady-state distribution
 * - Absorbing chain analysis (MTTF)
 * - State probability evolution
 * - First passage time
 * - Classification (recurrent, transient, absorbing)
 *
 * Manufacturing use: machine reliability modeling (up/degraded/down),
 * tool wear state progression, quality state transitions,
 * maintenance scheduling, production line availability.
 *
 * @module MarkovChainEngine
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarkovChain {
  states: string[];
  transitionMatrix: number[][];
}

export interface SteadyStateResult {
  distribution: number[];
  converged: boolean;
  iterations: number;
}

export interface AbsorbingResult {
  fundamentalMatrix: number[][];        // N = (I - Q)^{-1}
  absorptionProbabilities: number[][];  // B = NR
  expectedSteps: number[];             // t = N * 1
  transientStates: number[];
  absorbingStates: number[];
}

export interface StateEvolution {
  time: number[];
  probabilities: number[][];  // probabilities[t][state]
}

export interface FirstPassageResult {
  meanTime: number;
  distribution: number[];  // P(first passage at step k)
  cdf: number[];
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class MarkovChainEngineImpl {

  /**
   * Validate transition matrix (rows sum to 1).
   */
  validate(P: number[][]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const n = P.length;

    for (let i = 0; i < n; i++) {
      if (P[i].length !== n) {
        errors.push(`Row ${i}: expected ${n} columns, got ${P[i].length}`);
        continue;
      }
      const sum = P[i].reduce((s, v) => s + v, 0);
      if (Math.abs(sum - 1) > 1e-6) {
        errors.push(`Row ${i}: sum = ${sum.toFixed(6)}, expected 1.0`);
      }
      for (let j = 0; j < n; j++) {
        if (P[i][j] < -1e-10) {
          errors.push(`P[${i}][${j}] = ${P[i][j]} is negative`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Compute steady-state distribution via power iteration.
   */
  steadyState(P: number[][], maxIter: number = 1000, tol: number = 1e-10): SteadyStateResult {
    const n = P.length;
    let pi = new Array(n).fill(1 / n);
    let converged = false;
    let iter = 0;

    for (; iter < maxIter; iter++) {
      const piNew = new Array(n).fill(0);
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          piNew[j] += pi[i] * P[i][j];
        }
      }

      // Check convergence
      const maxDiff = Math.max(...piNew.map((v, i) => Math.abs(v - pi[i])));
      pi = piNew;

      if (maxDiff < tol) {
        converged = true;
        break;
      }
    }

    // Normalize
    const sum = pi.reduce((s, v) => s + v, 0);
    if (sum > 0) pi = pi.map(v => v / sum);

    return { distribution: pi, converged, iterations: iter };
  }

  /**
   * Evolve state probabilities over time steps.
   */
  evolve(P: number[][], initial: number[], steps: number): StateEvolution {
    const n = P.length;
    const time: number[] = [0];
    const probabilities: number[][] = [[...initial]];
    let current = [...initial];

    for (let t = 1; t <= steps; t++) {
      const next = new Array(n).fill(0);
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          next[j] += current[i] * P[i][j];
        }
      }
      current = next;
      time.push(t);
      probabilities.push([...current]);
    }

    return { time, probabilities };
  }

  /**
   * Analyze absorbing Markov chain.
   * Returns fundamental matrix, absorption probabilities, expected steps to absorption.
   */
  absorbingAnalysis(P: number[][]): AbsorbingResult {
    const n = P.length;

    // Identify absorbing states (P[i][i] = 1)
    const absorbingStates: number[] = [];
    const transientStates: number[] = [];
    for (let i = 0; i < n; i++) {
      if (Math.abs(P[i][i] - 1) < 1e-10) {
        absorbingStates.push(i);
      } else {
        transientStates.push(i);
      }
    }

    const t = transientStates.length;
    const a = absorbingStates.length;

    if (a === 0) {
      return {
        fundamentalMatrix: [],
        absorptionProbabilities: [],
        expectedSteps: [],
        transientStates,
        absorbingStates,
      };
    }

    // Extract Q (transient-to-transient) and R (transient-to-absorbing)
    const Q: number[][] = transientStates.map(i =>
      transientStates.map(j => P[i][j])
    );
    const R: number[][] = transientStates.map(i =>
      absorbingStates.map(j => P[i][j])
    );

    // N = (I - Q)^{-1}
    const IminusQ = Q.map((row, i) =>
      row.map((v, j) => (i === j ? 1 : 0) - v)
    );
    const N = this._invertMatrix(IminusQ);

    // B = N * R (absorption probabilities)
    const B = N.map(row =>
      Array.from({ length: a }, (_, j) =>
        row.reduce((s, nij, k) => s + nij * R[k][j], 0)
      )
    );

    // Expected steps: t = N * 1
    const expectedSteps = N.map(row => row.reduce((s, v) => s + v, 0));

    return {
      fundamentalMatrix: N,
      absorptionProbabilities: B,
      expectedSteps,
      transientStates,
      absorbingStates,
    };
  }

  /**
   * Compute mean first passage time from state i to state j.
   */
  firstPassageTime(
    P: number[][], from: number, to: number,
    maxSteps: number = 1000
  ): FirstPassageResult {
    const n = P.length;
    const distribution: number[] = [];
    const cdf: number[] = [];

    // State probability vector (start in 'from')
    let current = new Array(n).fill(0);
    current[from] = 1;
    let cumProb = 0;

    for (let step = 1; step <= maxSteps; step++) {
      const next = new Array(n).fill(0);
      for (let j = 0; j < n; j++) {
        if (j === to && step > 1) continue; // Absorb at target
        for (let i = 0; i < n; i++) {
          next[j] += current[i] * P[i][j];
        }
      }

      // Probability of first arrival at 'to' at this step
      let arrivalProb = 0;
      for (let i = 0; i < n; i++) {
        arrivalProb += current[i] * P[i][to];
      }

      distribution.push(arrivalProb);
      cumProb += arrivalProb;
      cdf.push(cumProb);

      // Zero out target state for next iteration
      next[to] = 0;
      current = next;

      if (1 - cumProb < 1e-10) break;
    }

    const meanTime = distribution.reduce(
      (s, p, k) => s + (k + 1) * p, 0
    );

    return { meanTime, distribution, cdf };
  }

  /**
   * Classify states: recurrent, transient, absorbing.
   */
  classifyStates(P: number[][]): {
    absorbing: number[];
    recurrent: number[];
    transient: number[];
  } {
    const n = P.length;
    const absorbing: number[] = [];
    const recurrent: number[] = [];
    const transient: number[] = [];

    // Compute P^k for large k to check recurrence
    let Pk = P.map(row => [...row]);
    for (let k = 0; k < Math.min(100, n * 10); k++) {
      Pk = this._matMul(Pk, P);
    }

    for (let i = 0; i < n; i++) {
      if (Math.abs(P[i][i] - 1) < 1e-10) {
        absorbing.push(i);
      } else if (Pk[i][i] > 1e-6) {
        recurrent.push(i);
      } else {
        transient.push(i);
      }
    }

    return { absorbing, recurrent, transient };
  }

  /**
   * Create a reliability Markov model with states: operational, degraded, failed.
   */
  reliabilityModel(
    failRate: number,        // λ: operational → failed (per time unit)
    degradeRate: number,     // α: operational → degraded
    degradedFailRate: number, // β: degraded → failed
    repairRate: number       // μ: failed → operational
  ): {
    chain: MarkovChain;
    availability: number;
    mttf: number;
  } {
    // States: 0=operational, 1=degraded, 2=failed
    const P: number[][] = [
      [1 - failRate - degradeRate, degradeRate, failRate],
      [0, 1 - degradedFailRate, degradedFailRate],
      [repairRate, 0, 1 - repairRate],
    ];

    // Clamp to valid probabilities
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        P[i][j] = Math.max(0, Math.min(1, P[i][j]));
      }
      const sum = P[i].reduce((s, v) => s + v, 0);
      if (sum > 0) P[i] = P[i].map(v => v / sum);
    }

    const ss = this.steadyState(P);
    const availability = ss.distribution[0] + ss.distribution[1]; // Not failed

    // MTTF: expected steps from operational to failed
    const fpt = this.firstPassageTime(P, 0, 2);

    return {
      chain: { states: ["operational", "degraded", "failed"], transitionMatrix: P },
      availability,
      mttf: fpt.meanTime,
    };
  }

  // -------------------------------------------------------------------------
  // Matrix helpers
  // -------------------------------------------------------------------------

  private _matMul(A: number[][], B: number[][]): number[][] {
    const n = A.length;
    return A.map((row, i) =>
      Array.from({ length: n }, (_, j) =>
        row.reduce((s, aik, k) => s + aik * B[k][j], 0)
      )
    );
  }

  private _invertMatrix(M: number[][]): number[][] {
    const n = M.length;
    const aug = M.map((row, i) => [
      ...row,
      ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0),
    ]);

    for (let col = 0; col < n; col++) {
      let maxVal = Math.abs(aug[col][col]);
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > maxVal) {
          maxVal = Math.abs(aug[row][col]);
          maxRow = row;
        }
      }
      if (maxRow !== col) [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

      const pivot = aug[col][col];
      if (Math.abs(pivot) < 1e-14) continue;

      for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;

      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const factor = aug[row][col];
        for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
      }
    }

    return aug.map(row => row.slice(n));
  }
}

export const markovChainEngine = new MarkovChainEngineImpl();
