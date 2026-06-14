/**
 * ViterbiDecoder — exact maximum-a-posteriori (MAP) decoding of the most likely
 * hidden state sequence of a Hidden Markov Model (Viterbi 1967).
 *
 * Given a sequence of observations o₁..o_T and an HMM (π start probs, A state
 * transitions, B state→observation emissions), returns argmax over state paths
 * s₁..s_T of P(s, o):
 *
 *   δ₁(j)  = π_j · B_j(o₁)
 *   δ_t(j) = max_i [ δ_{t-1}(i) · A_{ij} ] · B_j(o_t)
 *   path   = backtrace of the argmax pointers from δ_T
 *
 * The whole recursion runs in LOG SPACE (sums of logs, max instead of product)
 * so it cannot underflow on long sequences — the standard numerically-stable
 * formulation. log(0) = −Infinity cleanly encodes impossible transitions.
 *
 * Exact dynamic program — O(T·N²), no iteration / convergence / precision
 * tolerance (unlike SVD or attention). It is the canonical "deep reasoning"
 * primitive for probabilistic sequence inference: alarm-state decoding from
 * sensor streams, operation-phase recovery from machine telemetry, tool-wear
 * regime sequencing, OCR/token disambiguation, etc.
 *
 * Why NEW (grep 2026-05-29): no Viterbi / HMM / sequence-decoding primitive
 * exists in the 118-file algorithms/ directory.
 *
 * @module algorithms/ViterbiDecoder
 * @see ALGO-SYNERGY (slot:tango, 2026-05-29) — deep-reasoning priority
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
} from "./types.js";

export interface ViterbiInput {
  /** Observation symbol indices o₁..o_T (each in [0, nObs)). */
  observations: number[];
  /** Start probabilities π (length nStates). */
  startProb: number[];
  /** State transition matrix A [nStates × nStates] (rows = from-state). */
  transitionProb: number[][];
  /** Emission matrix B [nStates × nObs] (rows = state). */
  emissionProb: number[][];
  /** If true, the three matrices are already given in log space (default false). */
  logInput?: boolean;
}

export interface ViterbiOutput {
  /** Most likely hidden state sequence (length T). */
  path: number[];
  /** Log-probability of the best path (−Infinity if no path is possible). */
  logProb: number;
  /** P(best path) = exp(logProb) (may underflow to 0 for long sequences). */
  prob: number;
  nStates: number;
  nObs: number;
  /** Sequence length T. */
  length: number;
  warnings: string[];
}

const SUM_TOL = 1e-6;

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** log that maps 0 → −Infinity and rejects negatives via NaN (caught upstream by validate). */
function safeLog(p: number): number {
  return p === 0 ? -Infinity : Math.log(p);
}

function isProbMatrix(m: unknown, rows: number, cols: number): m is number[][] {
  if (!Array.isArray(m) || m.length !== rows) return false;
  return m.every((r) => Array.isArray(r) && r.length === cols);
}

export const ViterbiDecoder: Algorithm<ViterbiInput, ViterbiOutput> = {
  validate(input: ViterbiInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    const { observations, startProb, transitionProb, emissionProb } = input ?? ({} as ViterbiInput);
    const logInput = input?.logInput === true;

    if (!Array.isArray(startProb) || startProb.length < 1) {
      issues.push({ field: "startProb", message: "startProb must be a non-empty array (length = nStates).", severity: "error" });
    }
    const nStates = Array.isArray(startProb) ? startProb.length : 0;

    if (!isProbMatrix(transitionProb, nStates, nStates)) {
      issues.push({ field: "transitionProb", message: `transitionProb must be [${nStates} × ${nStates}].`, severity: "error" });
    }
    if (!Array.isArray(emissionProb) || emissionProb.length !== nStates || !Array.isArray(emissionProb[0])) {
      issues.push({ field: "emissionProb", message: `emissionProb must be [${nStates} × nObs].`, severity: "error" });
    }
    const nObs = Array.isArray(emissionProb) && Array.isArray(emissionProb[0]) ? emissionProb[0].length : 0;
    if (nObs > 0 && !isProbMatrix(emissionProb, nStates, nObs)) {
      issues.push({ field: "emissionProb", message: "emissionProb rows must all have the same width (nObs).", severity: "error" });
    }

    if (!Array.isArray(observations)) {
      issues.push({ field: "observations", message: "observations must be an array of symbol indices.", severity: "error" });
    } else {
      for (let t = 0; t < observations.length; t++) {
        const o = observations[t];
        if (!Number.isInteger(o) || o < 0 || (nObs > 0 && o >= nObs)) {
          issues.push({ field: `observations[${t}]`, message: `observation index ${o} out of range [0, ${nObs}).`, severity: "error" });
          break;
        }
      }
    }

    // value checks: finite; probabilities in [0,1] unless logInput
    const checkVals = (name: string, arr: number[] | number[][]) => {
      const flat = (Array.isArray(arr[0]) ? (arr as number[][]).flat() : (arr as number[]));
      for (const v of flat) {
        if (!isFiniteNumber(v) && !(logInput && v === -Infinity)) {
          issues.push({ field: name, message: `${name} values must be finite${logInput ? " (or −Infinity in log space)" : ""}.`, severity: "error" });
          return;
        }
        if (!logInput && (v < 0 || v > 1)) {
          issues.push({ field: name, message: `${name} must be probabilities in [0,1] (or set logInput:true).`, severity: "error" });
          return;
        }
      }
    };
    if (Array.isArray(startProb)) checkVals("startProb", startProb);
    if (Array.isArray(transitionProb)) checkVals("transitionProb", transitionProb);
    if (Array.isArray(emissionProb)) checkVals("emissionProb", emissionProb);

    const errors = issues.filter((i) => i.severity === "error").map((i) => i.message);
    const warnings = issues.filter((i) => i.severity === "warning").map((i) => i.message);
    return { valid: errors.length === 0, errors, warnings, issues };
  },

  calculate(input: ViterbiInput): ViterbiOutput {
    const v0 = this.validate(input);
    if (!v0.valid) {
      throw new Error(`ViterbiDecoder: invalid input — ${(v0.errors ?? []).join("; ")}`);
    }
    const warnings: string[] = [];
    const { observations } = input;
    const logInput = input.logInput === true;
    const nStates = input.startProb.length;
    const nObs = input.emissionProb[0].length;
    const T = observations.length;

    const toLog = (p: number) => (logInput ? p : safeLog(p));
    const logStart = input.startProb.map(toLog);
    const logTrans = input.transitionProb.map((r) => r.map(toLog));
    const logEmit = input.emissionProb.map((r) => r.map(toLog));

    // row-stochastic sanity (probability input only) → advisory
    if (!logInput) {
      const rowSum = (r: number[]) => r.reduce((a, b) => a + b, 0);
      const startSum = rowSum(input.startProb);
      if (Math.abs(startSum - 1) > SUM_TOL) warnings.push(`startProb sums to ${startSum.toFixed(4)} (not 1) — decoding proceeds but is not a proper distribution.`);
      if (input.transitionProb.some((r) => Math.abs(rowSum(r) - 1) > SUM_TOL)) warnings.push("a transitionProb row does not sum to 1.");
      if (input.emissionProb.some((r) => Math.abs(rowSum(r) - 1) > SUM_TOL)) warnings.push("an emissionProb row does not sum to 1.");
    }

    if (T === 0) {
      warnings.push("empty observation sequence — returning empty path.");
      return { path: [], logProb: 0, prob: 1, nStates, nObs, length: 0, warnings };
    }

    // δ[t][j], backpointer ψ[t][j]
    const delta: number[][] = Array.from({ length: T }, () => new Array<number>(nStates).fill(-Infinity));
    const psi: number[][] = Array.from({ length: T }, () => new Array<number>(nStates).fill(0));

    // init t = 0
    const o0 = observations[0];
    for (let j = 0; j < nStates; j++) delta[0][j] = logStart[j] + logEmit[j][o0];

    // recursion
    for (let t = 1; t < T; t++) {
      const ot = observations[t];
      for (let j = 0; j < nStates; j++) {
        let bestVal = -Infinity;
        let bestArg = 0;
        for (let i = 0; i < nStates; i++) {
          const cand = delta[t - 1][i] + logTrans[i][j];
          if (cand > bestVal) { bestVal = cand; bestArg = i; }
        }
        delta[t][j] = bestVal + logEmit[j][ot];
        psi[t][j] = bestArg;
      }
    }

    // termination — best final state
    let bestLog = -Infinity;
    let bestState = 0;
    for (let j = 0; j < nStates; j++) {
      if (delta[T - 1][j] > bestLog) { bestLog = delta[T - 1][j]; bestState = j; }
    }

    // backtrace
    const path = new Array<number>(T);
    path[T - 1] = bestState;
    for (let t = T - 2; t >= 0; t--) path[t] = psi[t + 1][path[t + 1]];

    if (!Number.isFinite(bestLog)) {
      warnings.push("no path has non-zero probability for this observation sequence (logProb = −Infinity).");
    }

    return {
      path,
      logProb: bestLog,
      prob: Number.isFinite(bestLog) ? Math.exp(bestLog) : 0,
      nStates,
      nObs,
      length: T,
      warnings,
    };
  },

  getMetadata(): AlgorithmMeta {
    return {
      id: "viterbi_decoder",
      name: "Viterbi Decoder (HMM MAP decoding)",
      version: "1.0.0",
      domain: "ml",
      category: "sequence-inference",
      description:
        "Exact maximum-a-posteriori decoding of the most likely hidden state sequence of an HMM via the Viterbi dynamic program, in log space for numerical stability. O(T·N²).",
      equation_plain: "delta_t(j) = max_i[delta_{t-1}(i) + log A_ij] + log B_j(o_t); path = argmax backtrace",
      assumptions: [
        "First-order HMM (Markov state transitions; observations conditionally independent given state).",
        "Probabilities are proper distributions (advisory warning if rows don't sum to 1).",
      ],
      limitations: [
        "Discrete observation symbols (index into emission columns); continuous emissions need a density adapter upstream.",
        "Returns the single best path — not the full posterior (use forward-backward for marginals).",
      ],
      reference: "Viterbi, A. (1967). Error bounds for convolutional codes and an asymptotically optimum decoding algorithm. IEEE Trans. Information Theory.",
      inputs: {
        observations: { type: "number[]", description: "observation symbol indices" },
        startProb: { type: "number[]", description: "π start probabilities (nStates)" },
        transitionProb: { type: "number[][]", description: "A [nStates × nStates]" },
        emissionProb: { type: "number[][]", description: "B [nStates × nObs]" },
        logInput: { type: "boolean", description: "inputs already in log space" },
      },
      outputs: {
        path: { type: "number[]", description: "most likely state sequence" },
        logProb: { type: "number", description: "log-probability of the best path" },
      },
      last_validated: "2026-05-29",
    };
  },
};
