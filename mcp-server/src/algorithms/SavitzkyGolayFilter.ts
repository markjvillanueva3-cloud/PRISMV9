/**
 * SavitzkyGolayFilter — polynomial-least-squares smoothing (and differentiation)
 * of a uniformly-sampled 1-D signal (Savitzky & Golay 1964).
 *
 * Over a sliding odd window of length w, a degree-p polynomial is fit by least
 * squares and evaluated at each point. Unlike a moving average, this PRESERVES
 * peak height/width and higher moments — the standard smoother for instrument /
 * sensor / telemetry traces (spindle load, vibration RMS, probe data) before
 * feature extraction, DTW alignment, or anomaly detection downstream.
 *
 * Key identity (the strongest correctness invariant): a Savitzky-Golay filter of
 * order p reproduces ANY polynomial of degree ≤ p EXACTLY — including at the
 * boundaries, because each output is an exact local polynomial fit.
 *
 * Implementation: the window x-grid is fixed (0..w-1) for every position, so the
 * normal-equations pseudo-inverse M = (VᵀV)⁻¹Vᵀ is computed ONCE; each output is
 * weights·y where weights = basis(t)·M and t is the point's offset within its
 * window (= centre for interior points, asymmetric near the edges → proper
 * boundary handling, no zero-padding artefacts). `deriv` evaluates the d-th
 * derivative of the fitted polynomial (scaled by 1/spacing^d).
 *
 * Why NEW (grep 2026-05-29): no Savitzky-Golay / polynomial-smoothing primitive
 * exists in the 122-file algorithms/ directory; the signal_* dispatcher group has
 * fft/spectral/filter/chatter but no Sav-Gol.
 *
 * @module algorithms/SavitzkyGolayFilter
 * @see ALGO-SYNERGY (slot:tango, 2026-05-29) — signal smoothing for telemetry
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
} from "./types.js";

export interface SavGolInput {
  /** Uniformly-sampled signal. */
  signal: number[];
  /** Window length (odd, ≥3, > polyOrder). */
  windowSize: number;
  /** Polynomial order p (≥0, < windowSize). Default 2. */
  polyOrder?: number;
  /** Derivative order to evaluate (0 = smooth, 1 = 1st derivative…). Default 0. */
  deriv?: number;
  /** Sample spacing for derivative scaling (default 1). */
  delta?: number;
}

export interface SavGolOutput {
  /** Filtered (smoothed or differentiated) signal, same length as input. */
  filtered: number[];
  windowSize: number;
  polyOrder: number;
  deriv: number;
  delta: number;
  warnings: string[];
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

/** Invert a small square matrix via Gauss-Jordan (returns null if singular). */
function invert(A: number[][]): number[][] | null {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    // partial pivot
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-14) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col];
    for (let j = 0; j < 2 * n; j++) M[col][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[col][j];
    }
  }
  return M.map((row) => row.slice(n));
}

function factorialRatio(deriv: number): number {
  // d-th derivative of t^d at any t contributes d! to the t^d coefficient;
  // poly coeff c_d already multiplies t^d, so derivative pulls down d!.
  let f = 1;
  for (let i = 2; i <= deriv; i++) f *= i;
  return f;
}

export const SavitzkyGolayFilter: Algorithm<SavGolInput, SavGolOutput> = {
  validate(input: SavGolInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    const { signal, windowSize } = input ?? ({} as SavGolInput);
    const polyOrder = input?.polyOrder ?? 2;
    const deriv = input?.deriv ?? 0;

    if (!Array.isArray(signal) || signal.length < 1) {
      issues.push({ field: "signal", message: "signal must be a non-empty array.", severity: "error" });
    } else if (!signal.every(isFiniteNumber)) {
      issues.push({ field: "signal", message: "signal values must be finite (no NaN/Infinity).", severity: "error" });
    }
    if (!Number.isInteger(windowSize) || windowSize < 3 || windowSize % 2 === 0) {
      issues.push({ field: "windowSize", message: "windowSize must be an odd integer ≥ 3.", severity: "error" });
    } else if (Array.isArray(signal) && windowSize > signal.length) {
      issues.push({ field: "windowSize", message: `windowSize ${windowSize} > signal length ${signal.length}.`, severity: "error" });
    }
    if (!Number.isInteger(polyOrder) || polyOrder < 0) {
      issues.push({ field: "polyOrder", message: "polyOrder must be an integer ≥ 0.", severity: "error" });
    } else if (Number.isInteger(windowSize) && polyOrder >= windowSize) {
      issues.push({ field: "polyOrder", message: `polyOrder ${polyOrder} must be < windowSize ${windowSize}.`, severity: "error" });
    }
    if (!Number.isInteger(deriv) || deriv < 0) {
      issues.push({ field: "deriv", message: "deriv must be an integer ≥ 0.", severity: "error" });
    } else if (Number.isInteger(polyOrder) && deriv > polyOrder) {
      issues.push({ field: "deriv", message: `deriv ${deriv} > polyOrder ${polyOrder} → result is identically 0.`, severity: "warning" });
    }
    if (input?.delta !== undefined && (!isFiniteNumber(input.delta) || input.delta <= 0)) {
      issues.push({ field: "delta", message: "delta must be a positive finite number.", severity: "error" });
    }

    const errors = issues.filter((i) => i.severity === "error").map((i) => i.message);
    const warnings = issues.filter((i) => i.severity === "warning").map((i) => i.message);
    return { valid: errors.length === 0, errors, warnings, issues };
  },

  calculate(input: SavGolInput): SavGolOutput {
    const v0 = this.validate(input);
    if (!v0.valid) {
      throw new Error(`SavitzkyGolayFilter: invalid input — ${(v0.errors ?? []).join("; ")}`);
    }
    const warnings: string[] = [...(v0.warnings ?? [])];
    const signal = input.signal;
    const n = signal.length;
    const w = input.windowSize;
    const p = input.polyOrder ?? 2;
    const deriv = input.deriv ?? 0;
    const delta = input.delta ?? 1;
    const half = (w - 1) / 2;

    if (deriv > p) {
      // derivative of a degree-p poly above order p is identically zero
      return { filtered: new Array<number>(n).fill(0), windowSize: w, polyOrder: p, deriv, delta, warnings };
    }

    // Vandermonde over local grid x = 0..w-1 ; V[j][q] = j^q
    const V: number[][] = Array.from({ length: w }, (_, j) =>
      Array.from({ length: p + 1 }, (_, q) => Math.pow(j, q)),
    );
    // A = VᵀV  ((p+1)×(p+1))
    const A: number[][] = Array.from({ length: p + 1 }, () => new Array<number>(p + 1).fill(0));
    for (let r = 0; r <= p; r++)
      for (let c = 0; c <= p; c++) {
        let s = 0;
        for (let j = 0; j < w; j++) s += V[j][r] * V[j][c];
        A[r][c] = s;
      }
    const Ainv = invert(A);
    if (!Ainv) {
      // should not happen for valid p<w over a non-degenerate grid; fail loud
      throw new Error("SavitzkyGolayFilter: normal-equations matrix is singular (check window/poly).");
    }
    // M = Ainv · Vᵀ  ((p+1)×w)
    const M: number[][] = Array.from({ length: p + 1 }, () => new Array<number>(w).fill(0));
    for (let r = 0; r <= p; r++)
      for (let j = 0; j < w; j++) {
        let s = 0;
        for (let q = 0; q <= p; q++) s += Ainv[r][q] * V[j][q];
        M[r][j] = s;
      }

    // derivative basis at offset t: d^deriv/dt^deriv of Σ c_q t^q evaluated →
    // contribution of coeff c_q is (q!/(q-deriv)!) · t^(q-deriv) for q≥deriv.
    const derivScale = Math.pow(delta, deriv);
    const basisDeriv = (t: number): number[] => {
      const e = new Array<number>(p + 1).fill(0);
      for (let q = deriv; q <= p; q++) {
        // falling factorial q·(q-1)···(q-deriv+1)
        let ff = 1;
        for (let m = 0; m < deriv; m++) ff *= (q - m);
        e[q] = ff * Math.pow(t, q - deriv);
      }
      return e;
    };

    const filtered = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      // window start clamped so a full window of size w is used; t = offset of i
      const start = Math.min(Math.max(i - half, 0), n - w);
      const t = i - start;
      const e = basisDeriv(t);
      // weights_j = Σ_q e[q] · M[q][j]
      let val = 0;
      for (let j = 0; j < w; j++) {
        let wj = 0;
        for (let q = 0; q <= p; q++) wj += e[q] * M[q][j];
        val += wj * signal[start + j];
      }
      filtered[i] = deriv === 0 ? val : val / derivScale;
    }

    return { filtered, windowSize: w, polyOrder: p, deriv, delta, warnings };
  },

  getMetadata(): AlgorithmMeta {
    return {
      id: "savitzky_golay_filter",
      name: "Savitzky-Golay Filter",
      version: "1.0.0",
      domain: "signal",
      category: "smoothing",
      description:
        "Polynomial-least-squares smoothing / differentiation over a sliding window. Preserves peak shape (unlike moving average); reproduces degree≤p polynomials exactly including at boundaries. Optional derivative order.",
      equation_plain: "y_smooth[i] = Σ_j weights_j · signal[i+j]; weights = basis(t)·(VᵀV)⁻¹Vᵀ over local poly fit",
      assumptions: [
        "Uniformly-sampled 1-D signal (use `delta` for derivative scaling).",
        "windowSize odd; polyOrder < windowSize.",
      ],
      limitations: [
        "1-D only; for ND apply per-axis.",
        "Boundary points use an asymmetric (still exact-fit) window — standard Sav-Gol edge handling.",
      ],
      reference: "Savitzky, A. & Golay, M.J.E. (1964). Smoothing and Differentiation of Data by Simplified Least Squares Procedures. Analytical Chemistry 36(8).",
      inputs: {
        signal: { type: "number[]", description: "uniformly-sampled signal" },
        windowSize: { type: "number", description: "odd window length ≥3" },
        polyOrder: { type: "number", description: "fit polynomial degree (default 2)" },
        deriv: { type: "number", description: "derivative order (0 = smooth)" },
        delta: { type: "number", description: "sample spacing for derivative scaling" },
      },
      outputs: {
        filtered: { type: "number[]", description: "smoothed/differentiated signal" },
      },
      last_validated: "2026-05-29",
    };
  },
};
