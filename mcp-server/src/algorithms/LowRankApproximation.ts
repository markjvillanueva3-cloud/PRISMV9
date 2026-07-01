/**
 * LowRankApproximation — truncated SVD (rank-k) via power iteration + deflation.
 *
 * Computes the best rank-k approximation A_k ≈ U · diag(S) · Vᵀ of an m×n matrix
 * A by extracting the top-k singular triplets one at a time:
 *
 *   for c = 1..k:
 *     v ← dominant eigenvector of AᵀA   (power iteration: v ← normalize(AᵀA v))
 *     σ ← ‖A v‖ ,  u ← A v / σ          (Rayleigh estimate — valid even pre-convergence)
 *     A ← A − σ u vᵀ                    (deflation removes this component)
 *
 * By Eckart–Young, A_k = Σ σᵢ uᵢ vᵢᵀ is the optimal rank-k approximation in both
 * Frobenius and spectral norm. The reconstruction error ‖A − A_k‖_F is read
 * directly off the deflated residual matrix, so it is EXACT regardless of how
 * well each power iteration converged.
 *
 * This is the math core under PRISM's ~95 LoRA engines (low-rank adaptation =
 * approximating a weight update ΔW by a rank-k product B·A): rank selection,
 * weight compression, and adapter initialization all need a truncated SVD, and
 * none existed in the 117-file algorithms/ directory ("svd"/"low-rank" matched
 * only PersonalizedPageRank's doc-comment mention of power iteration).
 *
 * Numerical notes (math-expert discipline):
 *   • Deterministic seeded LCG init → reproducible results (optional `seed`).
 *   • Well-separated spectra converge in O(log(1/tol)/log(σ₁/σ₂)) iterations.
 *   • Clustered/degenerate spectra (e.g., identity) converge slowly — capped at
 *     maxIter and reported via `converged[]`; σ stays a valid Rayleigh estimate.
 *   • Zero / rank-deficient matrices yield σ = 0 components without NaN.
 *
 * @module algorithms/LowRankApproximation
 * @see ALGO-SYNERGY (slot:tango, 2026-05-29) — lora priority (#2)
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
} from "./types.js";

export interface LowRankInput {
  /** m × n matrix to approximate. */
  matrix: number[][];
  /** Target rank k (clamped to min(m,n)). */
  rank: number;
  /** Power-iteration cap per component (default 200). */
  maxIter?: number;
  /** Convergence tolerance on the singular vector (default 1e-10). */
  tol?: number;
  /** Deterministic init seed (default 1). */
  seed?: number;
}

export interface LowRankOutput {
  /** Left singular vectors as columns: m × k. */
  U: number[][];
  /** Singular values, descending: length k. */
  S: number[];
  /** Right singular vectors as columns: n × k. */
  V: number[][];
  /** Effective rank used (after clamping). */
  rank: number;
  /** Rank-k reconstruction U·diag(S)·Vᵀ: m × n. */
  approximation: number[][];
  /** Exact Frobenius reconstruction error ‖A − A_k‖_F (from the residual). */
  reconstructionError: number;
  /** reconstructionError / ‖A‖_F (0 if A is the zero matrix). */
  relativeError: number;
  /** Power-iteration count per component. */
  iterations: number[];
  /** Convergence flag per component. */
  converged: boolean[];
  warnings: string[];
}

const DEFAULT_MAX_ITER = 200;
const DEFAULT_TOL = 1e-10;

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function isRectangular(m: unknown): m is number[][] {
  if (!Array.isArray(m) || m.length === 0 || !Array.isArray(m[0])) return false;
  const w = (m[0] as unknown[]).length;
  return w >= 1 && (m as unknown[][]).every((r) => Array.isArray(r) && r.length === w);
}

/** Deterministic LCG → unit vector of length n (avoids Math.random for reproducibility). */
function seededUnitVector(n: number, seed: number): number[] {
  let s = (seed * 2654435761 + 1) & 0x7fffffff;
  const v = new Array<number>(n);
  let norm = 0;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const x = s / 0x7fffffff - 0.5;
    v[i] = x;
    norm += x * x;
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < n; i++) v[i] /= norm;
  return v;
}

function frobenius(A: number[][]): number {
  let s = 0;
  for (const row of A) for (const x of row) s += x * x;
  return Math.sqrt(s);
}

export const LowRankApproximation: Algorithm<LowRankInput, LowRankOutput> = {
  validate(input: LowRankInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    const { matrix, rank } = input ?? ({} as LowRankInput);

    if (!isRectangular(matrix)) {
      issues.push({ field: "matrix", message: "matrix must be a non-empty rectangular m×n matrix.", severity: "error" });
    } else {
      for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[i].length; j++) {
          if (!isFiniteNumber(matrix[i][j])) {
            issues.push({ field: `matrix[${i}][${j}]`, message: "matrix values must be finite (no NaN/Infinity).", severity: "error" });
            break;
          }
        }
      }
    }

    if (!Number.isInteger(rank) || rank < 1) {
      issues.push({ field: "rank", message: "rank must be an integer ≥ 1.", severity: "error" });
    } else if (isRectangular(matrix)) {
      const maxRank = Math.min(matrix.length, matrix[0].length);
      if (rank > maxRank) {
        issues.push({ field: "rank", message: `rank ${rank} > min(m,n)=${maxRank}; will be clamped.`, severity: "warning" });
      }
    }
    if (input?.maxIter !== undefined && (!Number.isInteger(input.maxIter) || input.maxIter < 1)) {
      issues.push({ field: "maxIter", message: "maxIter must be an integer ≥ 1.", severity: "error" });
    }
    if (input?.tol !== undefined && (!isFiniteNumber(input.tol) || input.tol <= 0)) {
      issues.push({ field: "tol", message: "tol must be a positive finite number.", severity: "error" });
    }

    const errors = issues.filter((i) => i.severity === "error").map((i) => i.message);
    const warnings = issues.filter((i) => i.severity === "warning").map((i) => i.message);
    return { valid: errors.length === 0, errors, warnings, issues };
  },

  calculate(input: LowRankInput): LowRankOutput {
    const v0 = this.validate(input);
    if (!v0.valid) {
      throw new Error(`LowRankApproximation: invalid input — ${(v0.errors ?? []).join("; ")}`);
    }
    const warnings: string[] = [...(v0.warnings ?? [])];
    const m = input.matrix.length;
    const n = input.matrix[0].length;
    const maxRank = Math.min(m, n);
    const k = Math.min(input.rank, maxRank);
    const maxIter = input.maxIter ?? DEFAULT_MAX_ITER;
    const tol = input.tol ?? DEFAULT_TOL;
    const seed = input.seed ?? 1;

    const aNorm = frobenius(input.matrix);
    // working residual copy (deflated in place)
    const A = input.matrix.map((row) => row.slice());

    const U: number[][] = []; // k columns, each length m
    const S: number[] = [];
    const V: number[][] = []; // k columns, each length n
    const iterations: number[] = [];
    const converged: boolean[] = [];

    const Av = new Array<number>(m);
    const AtAv = new Array<number>(n);

    for (let c = 0; c < k; c++) {
      let v = seededUnitVector(n, seed + c);
      let iter = 0;
      let conv = false;
      for (; iter < maxIter; iter++) {
        // Av = A v  (m-vector)
        for (let i = 0; i < m; i++) {
          let acc = 0;
          const row = A[i];
          for (let j = 0; j < n; j++) acc += row[j] * v[j];
          Av[i] = acc;
        }
        // AtAv = Aᵀ (Av)  (n-vector)
        for (let j = 0; j < n; j++) AtAv[j] = 0;
        for (let i = 0; i < m; i++) {
          const av = Av[i];
          if (av === 0) continue;
          const row = A[i];
          for (let j = 0; j < n; j++) AtAv[j] += row[j] * av;
        }
        let norm = 0;
        for (let j = 0; j < n; j++) norm += AtAv[j] * AtAv[j];
        norm = Math.sqrt(norm);
        if (norm === 0) {
          // residual is zero in this direction → remaining singular values are 0
          conv = true;
          break;
        }
        // convergence: 1 − |<v_new, v>|  (subspace angle)
        let dot = 0;
        for (let j = 0; j < n; j++) dot += (AtAv[j] / norm) * v[j];
        const vNew = new Array<number>(n);
        for (let j = 0; j < n; j++) vNew[j] = AtAv[j] / norm;
        v = vNew;
        if (1 - Math.abs(dot) < tol) { conv = true; iter++; break; }
      }

      // σ = ‖A v‖ (Rayleigh), u = A v / σ
      for (let i = 0; i < m; i++) {
        let acc = 0;
        const row = A[i];
        for (let j = 0; j < n; j++) acc += row[j] * v[j];
        Av[i] = acc;
      }
      let sigma = 0;
      for (let i = 0; i < m; i++) sigma += Av[i] * Av[i];
      sigma = Math.sqrt(sigma);
      const u = new Array<number>(m);
      if (sigma === 0) {
        for (let i = 0; i < m; i++) u[i] = 0;
      } else {
        for (let i = 0; i < m; i++) u[i] = Av[i] / sigma;
      }

      S.push(sigma);
      U.push(u);
      V.push(v.slice());
      iterations.push(iter);
      converged.push(conv);

      // deflate: A ← A − σ u vᵀ
      if (sigma > 0) {
        for (let i = 0; i < m; i++) {
          const su = sigma * u[i];
          if (su === 0) continue;
          const row = A[i];
          for (let j = 0; j < n; j++) row[j] -= su * v[j];
        }
      }
    }

    // reconstruction A_k = Σ σ u vᵀ
    const approximation: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(0));
    for (let c = 0; c < k; c++) {
      const sigma = S[c];
      if (sigma === 0) continue;
      const u = U[c];
      const vc = V[c];
      for (let i = 0; i < m; i++) {
        const su = sigma * u[i];
        if (su === 0) continue;
        const arow = approximation[i];
        for (let j = 0; j < n; j++) arow[j] += su * vc[j];
      }
    }

    // exact ‖A − A_k‖_F = ‖residual‖_F (A now holds the residual)
    const reconstructionError = frobenius(A);
    const relativeError = aNorm === 0 ? 0 : reconstructionError / aNorm;

    if (converged.some((c) => !c)) {
      warnings.push("One or more components did not reach tol within maxIter (clustered/degenerate spectrum); σ is a valid Rayleigh estimate and reconstructionError is exact.");
    }

    return {
      U, S, V, rank: k, approximation,
      reconstructionError, relativeError,
      iterations, converged, warnings,
    };
  },

  getMetadata(): AlgorithmMeta {
    return {
      id: "low_rank_approximation",
      name: "Low-Rank Approximation (Truncated SVD)",
      version: "1.0.0",
      domain: "ml",
      category: "matrix-factorization",
      description:
        "Rank-k truncated SVD via power iteration + deflation. Optimal rank-k approximation (Eckart–Young) with exact residual-based reconstruction error. Math core for LoRA rank selection / weight compression / adapter init.",
      equation_plain: "A_k = U·diag(S)·V^T = sum_{i=1..k} sigma_i u_i v_i^T  (Eckart-Young optimal)",
      assumptions: [
        "Dense real matrix; spectra reasonably separated for fast convergence.",
        "Power iteration recovers dominant singular triplet; deflation peels successive ones.",
      ],
      limitations: [
        "Clustered/degenerate singular values converge slowly (capped at maxIter) — flagged in converged[].",
        "Per-component O(maxIter·m·n); for very large matrices use a randomized range finder upstream.",
        "Returns top-k only — not a full SVD.",
      ],
      reference: "Eckart, C. & Young, G. (1936). The approximation of one matrix by another of lower rank. Psychometrika; Golub & Van Loan, Matrix Computations (power iteration).",
      inputs: {
        matrix: { type: "number[][]", description: "m×n matrix" },
        rank: { type: "number", description: "target rank k (clamped to min(m,n))" },
        maxIter: { type: "number", description: "power-iteration cap per component" },
        tol: { type: "number", description: "singular-vector convergence tolerance" },
        seed: { type: "number", description: "deterministic init seed" },
      },
      outputs: {
        U: { type: "number[][]", description: "m×k left singular vectors (columns)" },
        S: { type: "number[]", description: "k singular values (descending)" },
        V: { type: "number[][]", description: "n×k right singular vectors (columns)" },
        relativeError: { type: "number", description: "‖A−A_k‖_F / ‖A‖_F" },
      },
      last_validated: "2026-05-29",
    };
  },
};
