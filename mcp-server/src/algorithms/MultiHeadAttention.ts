/**
 * MultiHeadAttention — the multi-head wrapper of the Transformer attention
 * mechanism (Vaswani et al. 2017). Composes the single-head
 * `ScaledDotProductAttention` primitive across h parallel heads:
 *
 *   MHA(Q,K,V) = Concat(head_1, …, head_h) · Wᴼ
 *   head_g     = Attention(Q·Wq_g, K·Wk_g, V·Wv_g)
 *
 * with d_model split into h heads of width d_head = d_model / h. Each head runs
 * the SAME numerically-stable scaled-dot-product operator already shipped
 * (`ml_attention`) — this module does NOT re-derive softmax/scaling; it slices
 * the projected Q/K/V into heads, delegates per head, concatenates, and applies
 * the output projection. This is the "wire all combinations" doctrine made
 * concrete ([[feedback_find_all_wiring_endpoints_and_combinations]]).
 *
 * Learned projections (Wq, Wk, Wv, Wo, each [d_model × d_model]) are OPTIONAL —
 * when omitted the identity is used, giving "split-head attention" (the pure
 * operator). With h = 1 and no projections, MHA reduces EXACTLY to
 * ScaledDotProductAttention (a load-bearing test invariant).
 *
 * Shapes (rows = sequence positions):
 *   query [Lq × d_model], key/value [Lk × d_model] → output [Lq × d_model]
 *
 * Why NEW (grep 2026-05-29): no multi-head attention exists in algorithms/;
 * "multihead" matched only the ScaledDotProductAttention docstring.
 *
 * @module algorithms/MultiHeadAttention
 * @see ALGO-SYNERGY (slot:tango, 2026-05-29) — deep-learning / transformer stack
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
} from "./types.js";
import { ScaledDotProductAttention } from "./ScaledDotProductAttention.js";

export interface MultiHeadAttentionInput {
  /** Queries [Lq × d_model]. */
  query: number[][];
  /** Keys [Lk × d_model]. */
  key: number[][];
  /** Values [Lk × d_model] (Lk must match key). */
  value: number[][];
  /** Number of attention heads h (d_model must be divisible by h). */
  numHeads: number;
  /** Query projection [d_model × d_model] (default identity). */
  wq?: number[][];
  /** Key projection [d_model × d_model] (default identity). */
  wk?: number[][];
  /** Value projection [d_model × d_model] (default identity). */
  wv?: number[][];
  /** Output projection [d_model × d_model] (default identity). */
  wo?: number[][];
  /** Lower-triangular causal mask (passed to every head). */
  causal?: boolean;
  /** Additive mask [Lq × Lk] (passed to every head). */
  mask?: number[][];
  /** Override the 1/√d_head scale. */
  scale?: number;
}

export interface MultiHeadAttentionOutput {
  /** Attention output [Lq × d_model]. */
  output: number[][];
  /** Per-head attention weights: h matrices, each [Lq × Lk] row-stochastic. */
  headWeights: number[][][];
  numHeads: number;
  dModel: number;
  dHead: number;
  qLen: number;
  kLen: number;
  warnings: string[];
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}
function isRectangular(m: unknown): m is number[][] {
  if (!Array.isArray(m) || m.length === 0 || !Array.isArray(m[0])) return false;
  const w = (m[0] as unknown[]).length;
  return w >= 1 && (m as unknown[][]).every((r) => Array.isArray(r) && r.length === w);
}
function allFinite(m: number[][]): boolean {
  return m.every((r) => r.every(isFiniteNumber));
}
/** A [m×n] · B [n×p] → [m×p]. Assumes shape-checked. */
function matmul(A: number[][], B: number[][]): number[][] {
  const m = A.length, n = B.length, p = B[0].length;
  const out: number[][] = Array.from({ length: m }, () => new Array<number>(p).fill(0));
  for (let i = 0; i < m; i++) {
    for (let k = 0; k < n; k++) {
      const a = A[i][k];
      if (a === 0) continue;
      const brow = B[k];
      for (let j = 0; j < p; j++) out[i][j] += a * brow[j];
    }
  }
  return out;
}
/** Extract columns [c0, c0+width) of every row. */
function sliceCols(m: number[][], c0: number, width: number): number[][] {
  return m.map((row) => row.slice(c0, c0 + width));
}

const PROJ_KEYS = ["wq", "wk", "wv", "wo"] as const;

export const MultiHeadAttention: Algorithm<MultiHeadAttentionInput, MultiHeadAttentionOutput> = {
  validate(input: MultiHeadAttentionInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    const { query, key, value, numHeads } = input ?? ({} as MultiHeadAttentionInput);

    for (const [name, m] of [["query", query], ["key", key], ["value", value]] as const) {
      if (!isRectangular(m)) {
        issues.push({ field: name, message: `${name} must be a non-empty rectangular matrix.`, severity: "error" });
      } else if (!allFinite(m)) {
        issues.push({ field: name, message: `${name} values must be finite.`, severity: "error" });
      }
    }

    if (isRectangular(query) && isRectangular(key) && query[0].length !== key[0].length) {
      issues.push({ field: "key", message: `d_model mismatch: query cols ${query[0].length} ≠ key cols ${key[0].length}.`, severity: "error" });
    }
    if (isRectangular(query) && isRectangular(value) && query[0].length !== value[0].length) {
      issues.push({ field: "value", message: `d_model mismatch: query cols ${query[0].length} ≠ value cols ${value[0].length}.`, severity: "error" });
    }
    if (isRectangular(key) && isRectangular(value) && key.length !== value.length) {
      issues.push({ field: "value", message: `key/value length mismatch: key rows ${key.length} ≠ value rows ${value.length}.`, severity: "error" });
    }

    const dModel = isRectangular(query) ? query[0].length : 0;
    if (!Number.isInteger(numHeads) || numHeads < 1) {
      issues.push({ field: "numHeads", message: "numHeads must be an integer ≥ 1.", severity: "error" });
    } else if (dModel > 0 && dModel % numHeads !== 0) {
      issues.push({ field: "numHeads", message: `d_model ${dModel} must be divisible by numHeads ${numHeads}.`, severity: "error" });
    }

    // projection matrices, if supplied, must be [d_model × d_model] and finite
    if (dModel > 0) {
      for (const k of PROJ_KEYS) {
        const w = input?.[k];
        if (w === undefined) continue;
        const okShape = Array.isArray(w) && w.length === dModel && w.every((r) => Array.isArray(r) && r.length === dModel && r.every(isFiniteNumber));
        if (!okShape) issues.push({ field: k, message: `${k} must be a finite [d_model × d_model] = [${dModel} × ${dModel}] matrix.`, severity: "error" });
      }
    }

    if (input?.scale !== undefined && (!isFiniteNumber(input.scale) || input.scale <= 0)) {
      issues.push({ field: "scale", message: "scale must be a positive finite number.", severity: "error" });
    }
    if (input?.mask !== undefined) {
      if (!isRectangular(input.mask) || (isRectangular(query) && input.mask.length !== query.length) || (isRectangular(key) && input.mask[0].length !== key.length)) {
        issues.push({ field: "mask", message: "mask must be a [Lq × Lk] matrix matching query/key lengths.", severity: "error" });
      }
    }

    const errors = issues.filter((i) => i.severity === "error").map((i) => i.message);
    const warnings = issues.filter((i) => i.severity === "warning").map((i) => i.message);
    return { valid: errors.length === 0, errors, warnings, issues };
  },

  calculate(input: MultiHeadAttentionInput): MultiHeadAttentionOutput {
    const v0 = this.validate(input);
    if (!v0.valid) {
      throw new Error(`MultiHeadAttention: invalid input — ${(v0.errors ?? []).join("; ")}`);
    }
    const warnings: string[] = [];
    const { query, key, value } = input;
    const h = input.numHeads;
    const dModel = query[0].length;
    const dHead = dModel / h;
    const qLen = query.length;
    const kLen = key.length;

    // 1) linear projections (identity when not supplied)
    const Qp = input.wq ? matmul(query, input.wq) : query;
    const Kp = input.wk ? matmul(key, input.wk) : key;
    const Vp = input.wv ? matmul(value, input.wv) : value;

    // 2) per-head scaled-dot-product attention (DELEGATE to the shipped primitive)
    const headWeights: number[][][] = [];
    const headOutputs: number[][][] = []; // h × [Lq × dHead]
    for (let g = 0; g < h; g++) {
      const c0 = g * dHead;
      const qh = sliceCols(Qp, c0, dHead);
      const kh = sliceCols(Kp, c0, dHead);
      const vh = sliceCols(Vp, c0, dHead);
      const res = ScaledDotProductAttention.calculate({
        query: qh, key: kh, value: vh,
        scale: input.scale,           // undefined → inner uses 1/√dHead
        causal: input.causal,
        mask: input.mask,
      });
      headOutputs.push(res.output);
      headWeights.push(res.attentionWeights);
      if (res.warnings.length) warnings.push(...res.warnings.map((w) => `head ${g}: ${w}`));
    }

    // 3) concat heads along the feature axis → [Lq × d_model]
    const concat: number[][] = Array.from({ length: qLen }, (_, i) => {
      const row = new Array<number>(dModel);
      for (let g = 0; g < h; g++) {
        const hr = headOutputs[g][i];
        for (let d = 0; d < dHead; d++) row[g * dHead + d] = hr[d];
      }
      return row;
    });

    // 4) output projection (identity when not supplied)
    const output = input.wo ? matmul(concat, input.wo) : concat;

    return { output, headWeights, numHeads: h, dModel, dHead, qLen, kLen, warnings };
  },

  getMetadata(): AlgorithmMeta {
    return {
      id: "multi_head_attention",
      name: "Multi-Head Attention",
      version: "1.0.0",
      domain: "ml",
      category: "deep-learning",
      description:
        "Multi-head Transformer attention: splits d_model into h heads, runs scaled-dot-product attention per head (composing the ml_attention primitive), concatenates, and applies an output projection. Optional learned Wq/Wk/Wv/Wo (default identity). h=1, no projections ⇒ exactly ScaledDotProductAttention.",
      equation_plain: "MHA(Q,K,V) = Concat_g( Attention(Q·Wq_g, K·Wk_g, V·Wv_g) ) · Wo",
      assumptions: [
        "d_model divisible by numHeads.",
        "Projections (if supplied) are [d_model × d_model]; query/key/value share d_model.",
      ],
      limitations: [
        "Dense O(h·Lq·Lk·d_head) attention — no flash/blocked kernel.",
        "Single combined head dimension (no per-head d_k≠d_v split).",
      ],
      reference: "Vaswani, A. et al. (2017). Attention Is All You Need. NeurIPS 2017.",
      inputs: {
        query: { type: "number[][]", description: "[Lq × d_model] queries" },
        key: { type: "number[][]", description: "[Lk × d_model] keys" },
        value: { type: "number[][]", description: "[Lk × d_model] values" },
        numHeads: { type: "number", description: "head count h (divides d_model)" },
        wq: { type: "number[][]", description: "[d_model × d_model] query projection (default identity)" },
        wo: { type: "number[][]", description: "[d_model × d_model] output projection (default identity)" },
        causal: { type: "boolean", description: "causal mask (all heads)" },
      },
      outputs: {
        output: { type: "number[][]", description: "[Lq × d_model] attention output" },
        headWeights: { type: "number[][][]", description: "per-head [Lq × Lk] weights" },
      },
      last_validated: "2026-05-29",
    };
  },
};
