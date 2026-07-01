/**
 * LayerNormalization — per-sample feature normalization (Ba, Kiros & Hinton 2016).
 *
 *   For each row x (a token / sample of d features):
 *     μ   = mean_j x_j
 *     σ²  = mean_j (x_j − μ)²            (population variance, across features)
 *     x̂_j = (x_j − μ) / sqrt(σ² + ε)
 *     y_j = γ_j · x̂_j + β_j             (learned per-feature scale/shift)
 *
 * Unlike batch normalization (which normalizes each feature ACROSS the batch and
 * is batch-statistics-dependent), LayerNorm normalizes ACROSS the features of a
 * SINGLE sample — so it is batch-size-independent and the canonical normalizer
 * inside Transformer blocks and RNNs. It directly pairs with the
 * `ScaledDotProductAttention` primitive shipped this milestone: attention +
 * layer-norm + residual are the two stateless halves of a Transformer block, so
 * having both as composable `prism_algorithm` actions lets the AI/NN/deep-learning
 * galaxies assemble a block without re-deriving the math.
 *
 * Numerically: ε inside the sqrt guarantees a finite result even for a constant
 * row (σ²=0) — the standard LayerNorm stabilizer.
 *
 * Why NEW (grep 2026-05-29): no layer/batch-norm primitive exists in the
 * algorithms/ directory; `ml_activation` covers pointwise nonlinearities, not
 * normalization.
 *
 * @module algorithms/LayerNormalization
 * @see ALGO-SYNERGY (slot:tango, 2026-05-29) — transformer-block normalization
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
} from "./types.js";

export interface LayerNormInput {
  /** Row-major matrix [n × d]: each row is one sample/token of d features. */
  data: number[][];
  /** Per-feature scale γ (length d). Default all-ones (no scaling). */
  gamma?: number[];
  /** Per-feature shift β (length d). Default all-zeros (no shift). */
  beta?: number[];
  /** Stabilizer ε added inside the sqrt (default 1e-5). */
  epsilon?: number;
}

export interface LayerNormOutput {
  /** Normalized (and affine-transformed) matrix [n × d]. */
  normalized: number[][];
  /** Per-row mean μ (length n). */
  means: number[];
  /** Per-row population variance σ² (length n). */
  variances: number[];
  gamma: number[];
  beta: number[];
  epsilon: number;
  nSamples: number;
  nFeatures: number;
  warnings: string[];
}

const DEFAULT_EPSILON = 1e-5;

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}
function isMatrix(m: unknown): m is number[][] {
  if (!Array.isArray(m) || m.length === 0 || !Array.isArray(m[0])) return false;
  const d = (m[0] as unknown[]).length;
  return d >= 1 && (m as unknown[][]).every((r) => Array.isArray(r) && r.length === d);
}

export const LayerNormalization: Algorithm<LayerNormInput, LayerNormOutput> = {
  validate(input: LayerNormInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    const { data } = input ?? ({} as LayerNormInput);

    if (!isMatrix(data)) {
      issues.push({ field: "data", message: "data must be a non-empty [n × d] matrix (all rows same length).", severity: "error" });
    } else {
      const d = data[0].length;
      for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {
          if (!isFiniteNumber(data[i][j])) {
            issues.push({ field: `data[${i}][${j}]`, message: "data values must be finite.", severity: "error" });
            break;
          }
        }
      }
      if (input?.gamma !== undefined) {
        if (!Array.isArray(input.gamma) || input.gamma.length !== d || !input.gamma.every(isFiniteNumber)) {
          issues.push({ field: "gamma", message: `gamma must be a finite array of length ${d} (nFeatures).`, severity: "error" });
        }
      }
      if (input?.beta !== undefined) {
        if (!Array.isArray(input.beta) || input.beta.length !== d || !input.beta.every(isFiniteNumber)) {
          issues.push({ field: "beta", message: `beta must be a finite array of length ${d} (nFeatures).`, severity: "error" });
        }
      }
    }
    if (input?.epsilon !== undefined && (!isFiniteNumber(input.epsilon) || input.epsilon <= 0)) {
      issues.push({ field: "epsilon", message: "epsilon must be a positive finite number.", severity: "error" });
    }

    const errors = issues.filter((i) => i.severity === "error").map((i) => i.message);
    const warnings = issues.filter((i) => i.severity === "warning").map((i) => i.message);
    return { valid: errors.length === 0, errors, warnings, issues };
  },

  calculate(input: LayerNormInput): LayerNormOutput {
    const v0 = this.validate(input);
    if (!v0.valid) {
      throw new Error(`LayerNormalization: invalid input — ${(v0.errors ?? []).join("; ")}`);
    }
    const warnings: string[] = [];
    const data = input.data;
    const n = data.length;
    const d = data[0].length;
    const eps = input.epsilon ?? DEFAULT_EPSILON;
    const gamma = input.gamma ?? new Array<number>(d).fill(1);
    const beta = input.beta ?? new Array<number>(d).fill(0);

    if (d === 1) warnings.push("nFeatures=1: every row normalizes to ~0 (σ²=0) before affine — LayerNorm over a single feature carries no information.");

    const normalized: number[][] = new Array(n);
    const means = new Array<number>(n);
    const variances = new Array<number>(n);

    for (let i = 0; i < n; i++) {
      const row = data[i];
      let mu = 0;
      for (let j = 0; j < d; j++) mu += row[j];
      mu /= d;
      let va = 0;
      for (let j = 0; j < d; j++) { const c = row[j] - mu; va += c * c; }
      va /= d;
      const inv = 1 / Math.sqrt(va + eps);
      const out = new Array<number>(d);
      for (let j = 0; j < d; j++) out[j] = gamma[j] * ((row[j] - mu) * inv) + beta[j];
      normalized[i] = out;
      means[i] = mu;
      variances[i] = va;
    }

    return {
      normalized, means, variances, gamma, beta, epsilon: eps,
      nSamples: n, nFeatures: d, warnings,
    };
  },

  getMetadata(): AlgorithmMeta {
    return {
      id: "layer_normalization",
      name: "Layer Normalization",
      version: "1.0.0",
      domain: "ml",
      category: "normalization",
      description:
        "Per-sample feature normalization for Transformer/RNN blocks: normalizes across the features of each row (batch-independent), then applies a learned per-feature affine (γ, β). Pairs with scaled dot-product attention to form a Transformer block.",
      equation_plain: "y_j = γ_j·(x_j − μ)/sqrt(σ² + ε) + β_j ; μ,σ² over features of one sample",
      assumptions: [
        "Normalization is over the feature axis of each independent row.",
        "γ, β (if supplied) have length = nFeatures.",
      ],
      limitations: [
        "Single-feature rows carry no normalized information (σ²=0).",
        "Not batch-normalization — does not use cross-sample statistics.",
      ],
      reference: "Ba, J.L., Kiros, J.R. & Hinton, G.E. (2016). Layer Normalization. arXiv:1607.06450.",
      inputs: {
        data: { type: "number[][]", description: "[n × d] row-major samples/tokens" },
        gamma: { type: "number[]", description: "per-feature scale (length d, default ones)" },
        beta: { type: "number[]", description: "per-feature shift (length d, default zeros)" },
        epsilon: { type: "number", description: "sqrt stabilizer (default 1e-5)" },
      },
      outputs: {
        normalized: { type: "number[][]", description: "normalized + affine matrix" },
        means: { type: "number[]", description: "per-row mean" },
        variances: { type: "number[]", description: "per-row population variance" },
      },
      last_validated: "2026-05-29",
    };
  },
};
