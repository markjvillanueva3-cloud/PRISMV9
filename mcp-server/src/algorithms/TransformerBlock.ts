/**
 * TransformerBlock — one full Transformer encoder/decoder block (Vaswani et al.
 * 2017), assembled from the primitives already shipped this milestone:
 *
 *   pre-LN  (default, GPT/modern):  a   = x + MHA(LN₁(x))
 *                                   out = a + FFN(LN₂(a))
 *   post-LN (original Vaswani):     a   = LN₁(x + MHA(x))
 *                                   out = LN₂(a + FFN(a))
 *
 * It COMPOSES three shipped algorithms — `MultiHeadAttention` (which itself
 * composes `ScaledDotProductAttention` per head), `LayerNormalization`, and a
 * position-wise feed-forward sublayer FFN(z) = act(z·W₁ + b₁)·W₂ + b₂ — plus
 * residual connections. This is the capstone of the "wire all combinations"
 * doctrine ([[feedback_find_all_wiring_endpoints_and_combinations]]): the block
 * is worth more than the sum of its parts, and none of the math is re-derived.
 *
 * Self-attention only (Q=K=V=the block input); cross-attention is a future input.
 * FFN weights are REQUIRED (a block with no FFN is meaningless); MHA projections
 * and LayerNorm γ/β default to identity so the block is testable with minimal
 * weights and exhibits a clean identity invariant (zero W_v + zero FFN ⇒ out = x).
 *
 * Why NEW (grep 2026-05-29): no transformer block / encoder layer exists in
 * algorithms/ ("transformer block" matched only the LayerNormalization docstring).
 *
 * @module algorithms/TransformerBlock
 * @see ALGO-SYNERGY (slot:tango, 2026-05-29) — deep-learning / transformer stack
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
} from "./types.js";
import { MultiHeadAttention } from "./MultiHeadAttention.js";
import { LayerNormalization } from "./LayerNormalization.js";

export interface TransformerBlockInput {
  /** Block input [L × d_model] (rows = sequence positions). */
  x: number[][];
  /** Attention head count h (divides d_model). */
  numHeads: number;
  /** FFN first weight [d_model × d_ff] (REQUIRED). */
  w1: number[][];
  /** FFN first bias [d_ff] (REQUIRED). */
  b1: number[];
  /** FFN second weight [d_ff × d_model] (REQUIRED). */
  w2: number[][];
  /** FFN second bias [d_model] (REQUIRED). */
  b2: number[];
  /** FFN nonlinearity (default "gelu"). */
  activation?: "relu" | "gelu";
  /** Pre-LayerNorm (default true = modern). false = post-LN (original). */
  preNorm?: boolean;
  /** Optional MHA projections [d_model × d_model] (default identity). */
  wq?: number[][];
  wk?: number[][];
  wv?: number[][];
  wo?: number[][];
  /** Optional LayerNorm scale/shift [d_model] (default ones/zeros). */
  gamma1?: number[]; beta1?: number[];
  gamma2?: number[]; beta2?: number[];
  /** LayerNorm epsilon (default 1e-5). */
  epsilon?: number;
  /** Causal self-attention mask. */
  causal?: boolean;
}

export interface TransformerBlockOutput {
  /** Block output [L × d_model]. */
  output: number[][];
  /** Self-attention output (post-residual contribution) [L × d_model]. */
  attentionOutput: number[][];
  /** FFN output (post-residual contribution) [L × d_model]. */
  ffnOutput: number[][];
  /** Per-head attention weights from the MHA sublayer. */
  headWeights: number[][][];
  seqLen: number;
  dModel: number;
  dFF: number;
  numHeads: number;
  preNorm: boolean;
  activation: "relu" | "gelu";
  warnings: string[];
}

const DEFAULT_EPSILON = 1e-5;
const GELU_C = Math.sqrt(2 / Math.PI);

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}
function isRect(m: unknown): m is number[][] {
  if (!Array.isArray(m) || m.length === 0 || !Array.isArray(m[0])) return false;
  const w = (m[0] as unknown[]).length;
  return w >= 1 && (m as unknown[][]).every((r) => Array.isArray(r) && r.length === w);
}
function isVec(v: unknown, n: number): v is number[] {
  return Array.isArray(v) && v.length === n && v.every(isFiniteNumber);
}
function matmul(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = B.length, p = B[0].length;
  const out: number[][] = Array.from({ length: m }, () => new Array<number>(p).fill(0));
  for (let i = 0; i < m; i++)
    for (let k = 0; k < n; k++) {
      const a = A[i][k];
      if (a === 0) continue;
      const brow = B[k];
      for (let j = 0; j < p; j++) out[i][j] += a * brow[j];
    }
  return out;
}
function addRows(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((v, j) => v + B[i][j]));
}
function act(x: number, kind: "relu" | "gelu"): number {
  if (kind === "relu") return x > 0 ? x : 0;
  // GELU tanh approximation (Hendrycks & Gimpel 2016)
  return 0.5 * x * (1 + Math.tanh(GELU_C * (x + 0.044715 * x * x * x)));
}
/** FFN(z) = act(z·W1 + b1)·W2 + b2. */
function feedForward(z: number[][], w1: number[][], b1: number[], w2: number[][], b2: number[], kind: "relu" | "gelu"): number[][] {
  const h = matmul(z, w1).map((row) => row.map((v, j) => act(v + b1[j], kind)));
  return matmul(h, w2).map((row) => row.map((v, j) => v + b2[j]));
}
/** LayerNorm one matrix via the shipped LayerNormalization algorithm. */
function layerNorm(z: number[][], gamma: number[] | undefined, beta: number[] | undefined, eps: number): number[][] {
  return LayerNormalization.calculate({ data: z, gamma, beta, epsilon: eps }).normalized;
}

export const TransformerBlock: Algorithm<TransformerBlockInput, TransformerBlockOutput> = {
  validate(input: TransformerBlockInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    const { x, numHeads, w1, b1, w2, b2 } = input ?? ({} as TransformerBlockInput);

    if (!isRect(x) || !x.every((r) => r.every(isFiniteNumber))) {
      issues.push({ field: "x", message: "x must be a non-empty finite [L × d_model] matrix.", severity: "error" });
    }
    const dModel = isRect(x) ? x[0].length : 0;

    if (!Number.isInteger(numHeads) || numHeads < 1) {
      issues.push({ field: "numHeads", message: "numHeads must be an integer ≥ 1.", severity: "error" });
    } else if (dModel > 0 && dModel % numHeads !== 0) {
      issues.push({ field: "numHeads", message: `d_model ${dModel} must be divisible by numHeads ${numHeads}.`, severity: "error" });
    }

    // FFN weights are required and define d_ff
    if (!isRect(w1) || (dModel > 0 && w1.length !== dModel) || !w1.every((r) => r.every(isFiniteNumber))) {
      issues.push({ field: "w1", message: `w1 must be a finite [d_model × d_ff] = [${dModel} × d_ff] matrix.`, severity: "error" });
    }
    const dFF = isRect(w1) ? w1[0].length : 0;
    if (dFF > 0 && !isVec(b1, dFF)) issues.push({ field: "b1", message: `b1 must be a finite vector of length d_ff=${dFF}.`, severity: "error" });
    if (!isRect(w2) || (dFF > 0 && w2.length !== dFF) || (dModel > 0 && w2[0].length !== dModel) || !w2.every((r) => r.every(isFiniteNumber))) {
      issues.push({ field: "w2", message: `w2 must be a finite [d_ff × d_model] = [${dFF} × ${dModel}] matrix.`, severity: "error" });
    }
    if (dModel > 0 && !isVec(b2, dModel)) issues.push({ field: "b2", message: `b2 must be a finite vector of length d_model=${dModel}.`, severity: "error" });

    // optional MHA projections [d_model × d_model]
    if (dModel > 0) {
      for (const k of ["wq", "wk", "wv", "wo"] as const) {
        const w = input?.[k];
        if (w === undefined) continue;
        if (!isRect(w) || w.length !== dModel || w[0].length !== dModel || !w.every((r) => r.every(isFiniteNumber))) {
          issues.push({ field: k, message: `${k} must be a finite [${dModel} × ${dModel}] matrix.`, severity: "error" });
        }
      }
      // optional LayerNorm params [d_model]
      for (const k of ["gamma1", "beta1", "gamma2", "beta2"] as const) {
        const v = input?.[k];
        if (v === undefined) continue;
        if (!isVec(v, dModel)) issues.push({ field: k, message: `${k} must be a finite vector of length d_model=${dModel}.`, severity: "error" });
      }
    }
    if (input?.epsilon !== undefined && (!isFiniteNumber(input.epsilon) || input.epsilon <= 0)) {
      issues.push({ field: "epsilon", message: "epsilon must be a positive finite number.", severity: "error" });
    }
    if (input?.activation !== undefined && input.activation !== "relu" && input.activation !== "gelu") {
      issues.push({ field: "activation", message: "activation must be 'relu' or 'gelu'.", severity: "error" });
    }

    const errors = issues.filter((i) => i.severity === "error").map((i) => i.message);
    const warnings = issues.filter((i) => i.severity === "warning").map((i) => i.message);
    return { valid: errors.length === 0, errors, warnings, issues };
  },

  calculate(input: TransformerBlockInput): TransformerBlockOutput {
    const v0 = this.validate(input);
    if (!v0.valid) {
      throw new Error(`TransformerBlock: invalid input — ${(v0.errors ?? []).join("; ")}`);
    }
    const { x, numHeads, w1, b1, w2, b2 } = input;
    const seqLen = x.length;
    const dModel = x[0].length;
    const dFF = w1[0].length;
    const eps = input.epsilon ?? DEFAULT_EPSILON;
    const activation = input.activation ?? "gelu";
    const preNorm = input.preNorm !== false; // default true
    const warnings: string[] = [];

    const runMHA = (q: number[][]) => MultiHeadAttention.calculate({
      query: q, key: q, value: q, numHeads,
      wq: input.wq, wk: input.wk, wv: input.wv, wo: input.wo,
      causal: input.causal,
    });

    let attentionOutput: number[][];
    let ffnOutput: number[][];
    let output: number[][];
    let headWeights: number[][][];

    if (preNorm) {
      const mha = runMHA(layerNorm(x, input.gamma1, input.beta1, eps));
      attentionOutput = mha.output;
      headWeights = mha.headWeights;
      const a = addRows(x, attentionOutput);                       // residual 1
      ffnOutput = feedForward(layerNorm(a, input.gamma2, input.beta2, eps), w1, b1, w2, b2, activation);
      output = addRows(a, ffnOutput);                              // residual 2
    } else {
      const mha = runMHA(x);
      attentionOutput = mha.output;
      headWeights = mha.headWeights;
      const a = layerNorm(addRows(x, attentionOutput), input.gamma1, input.beta1, eps);
      ffnOutput = feedForward(a, w1, b1, w2, b2, activation);
      output = layerNorm(addRows(a, ffnOutput), input.gamma2, input.beta2, eps);
    }

    return {
      output, attentionOutput, ffnOutput, headWeights,
      seqLen, dModel, dFF, numHeads, preNorm, activation, warnings,
    };
  },

  getMetadata(): AlgorithmMeta {
    return {
      id: "transformer_block",
      name: "Transformer Block",
      version: "1.0.0",
      domain: "ml",
      category: "deep-learning",
      description:
        "One full Transformer block composed from MultiHeadAttention + LayerNormalization + a position-wise feed-forward sublayer + residual connections. Pre-LN (default) or post-LN. Self-attention; FFN = act(x·W1+b1)·W2+b2 with relu/gelu.",
      equation_plain: "pre-LN: a = x + MHA(LN1(x)); out = a + FFN(LN2(a))",
      assumptions: [
        "Self-attention (Q=K=V=block input).",
        "d_model divisible by numHeads; FFN weights shaped [d_model×d_ff],[d_ff×d_model].",
      ],
      limitations: [
        "No cross-attention / encoder-decoder wiring (self-attention only).",
        "No dropout (inference-time block); weights supplied, not learned here.",
      ],
      reference: "Vaswani, A. et al. (2017). Attention Is All You Need. NeurIPS 2017; pre-LN: Xiong et al. (2020).",
      inputs: {
        x: { type: "number[][]", description: "[L × d_model] block input" },
        numHeads: { type: "number", description: "attention heads (divides d_model)" },
        w1: { type: "number[][]", description: "[d_model × d_ff] FFN weight 1" },
        w2: { type: "number[][]", description: "[d_ff × d_model] FFN weight 2" },
        activation: { type: "string", description: "'relu' | 'gelu' (default gelu)" },
        preNorm: { type: "boolean", description: "pre-LN (default true) vs post-LN" },
      },
      outputs: {
        output: { type: "number[][]", description: "[L × d_model] block output" },
        attentionOutput: { type: "number[][]", description: "self-attention sublayer output" },
        ffnOutput: { type: "number[][]", description: "feed-forward sublayer output" },
      },
      last_validated: "2026-05-29",
    };
  },
};
