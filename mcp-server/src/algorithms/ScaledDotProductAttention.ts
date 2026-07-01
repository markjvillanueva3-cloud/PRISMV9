/**
 * ScaledDotProductAttention — the core attention primitive of the Transformer
 * (Vaswani et al. 2017, "Attention Is All You Need").
 *
 *     Attention(Q, K, V) = softmax( (Q · Kᵀ) / √d_k + mask ) · V
 *
 * Pure, deterministic, numerically-stable (row-wise max-shift softmax). NO
 * learned weights — this is the attention *operator*; the learned Q/K/V
 * projections are applied upstream. A foundational deep-learning building block
 * that PRISM's CAM/CAD/CNC deep-learning + cross-process attention engines can
 * compose, and which pairs with the `ml_activation` softmax shipped alongside it.
 *
 * Shapes (rows = sequence positions):
 *   Q : [Lq × d_k]   (queries)
 *   K : [Lk × d_k]   (keys)
 *   V : [Lk × d_v]   (values)        — K and V share the key-length Lk
 *   → output           [Lq × d_v]
 *   → attentionWeights [Lq × Lk]     (each row sums to 1)
 *
 * Options:
 *   • scale     — override 1/√d_k (default) with a custom temperature.
 *   • causal    — apply a lower-triangular mask (position i attends only to ≤ i),
 *                 the decoder self-attention pattern.
 *   • mask      — explicit additive [Lq × Lk] mask (−Infinity = disallowed);
 *                 combined with `causal` if both supplied.
 *
 * Why NEW (grep 2026-05-29): no scaled-dot-product / attention primitive exists
 * in the 116-file algorithms/ directory ("attention" matched engines only).
 *
 * @module algorithms/ScaledDotProductAttention
 * @see ALGO-SYNERGY (slot:tango, 2026-05-29) — deep-learning priority
 */

import type {
  Algorithm,
  AlgorithmMeta,
  ValidationResult,
  ValidationIssue,
} from "./types.js";

export interface AttentionInput {
  /** Queries [Lq × d_k]. */
  query: number[][];
  /** Keys [Lk × d_k] (d_k must match query). */
  key: number[][];
  /** Values [Lk × d_v] (Lk must match key row count). */
  value: number[][];
  /** Override the 1/√d_k scale (temperature). */
  scale?: number;
  /** Lower-triangular causal mask (decoder self-attention). */
  causal?: boolean;
  /** Explicit additive mask [Lq × Lk]; −Infinity disallows a position. */
  mask?: number[][];
}

export interface AttentionOutput {
  /** Attention output [Lq × d_v]. */
  output: number[][];
  /** Row-stochastic attention weights [Lq × Lk] (each row sums to 1). */
  attentionWeights: number[][];
  /** Effective scale applied to the raw scores. */
  scale: number;
  qLen: number;
  kLen: number;
  dK: number;
  dV: number;
  warnings: string[];
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function isRectangular(m: unknown): m is number[][] {
  if (!Array.isArray(m) || m.length === 0 || !Array.isArray(m[0])) return false;
  const w = m[0].length;
  return w >= 1 && m.every((r) => Array.isArray(r) && r.length === w);
}

/** Numerically-stable softmax over one row (max-shift). All-masked → uniform-zero handled by caller. */
function softmaxRow(scores: number[]): number[] {
  let max = -Infinity;
  for (const s of scores) if (s > max) max = s;
  if (!Number.isFinite(max)) {
    // Entire row masked to -Infinity → degenerate; return uniform to keep row-stochastic.
    const n = scores.length;
    return new Array<number>(n).fill(1 / n);
  }
  let sum = 0;
  const exps = scores.map((s) => {
    const e = Math.exp(s - max);
    sum += e;
    return e;
  });
  return exps.map((e) => e / sum);
}

export const ScaledDotProductAttention: Algorithm<AttentionInput, AttentionOutput> = {
  validate(input: AttentionInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    const { query, key, value } = input ?? ({} as AttentionInput);

    for (const [name, m] of [["query", query], ["key", key], ["value", value]] as const) {
      if (!isRectangular(m)) {
        issues.push({ field: name, message: `${name} must be a non-empty rectangular matrix.`, severity: "error" });
      } else {
        for (let i = 0; i < m.length; i++) {
          for (let j = 0; j < m[i].length; j++) {
            if (!isFiniteNumber(m[i][j])) {
              issues.push({ field: `${name}[${i}][${j}]`, message: `${name} values must be finite.`, severity: "error" });
              break;
            }
          }
        }
      }
    }

    if (isRectangular(query) && isRectangular(key) && query[0].length !== key[0].length) {
      issues.push({ field: "key", message: `d_k mismatch: query cols ${query[0].length} ≠ key cols ${key[0].length}.`, severity: "error" });
    }
    if (isRectangular(key) && isRectangular(value) && key.length !== value.length) {
      issues.push({ field: "value", message: `key/value length mismatch: key rows ${key.length} ≠ value rows ${value.length}.`, severity: "error" });
    }
    if (input?.scale !== undefined && (!isFiniteNumber(input.scale) || input.scale <= 0)) {
      issues.push({ field: "scale", message: "scale must be a positive finite number.", severity: "error" });
    }
    if (input?.mask !== undefined) {
      if (!Array.isArray(input.mask) || (isRectangular(query) && input.mask.length !== query.length)) {
        issues.push({ field: "mask", message: "mask must be [Lq × Lk] matching query/key lengths.", severity: "error" });
      } else if (isRectangular(query) && isRectangular(key)) {
        for (const row of input.mask) {
          if (!Array.isArray(row) || row.length !== key.length) {
            issues.push({ field: "mask", message: `mask row width must equal key length ${key.length}.`, severity: "error" });
            break;
          }
        }
      }
    }

    const errors = issues.filter((i) => i.severity === "error").map((i) => i.message);
    const warnings = issues.filter((i) => i.severity === "warning").map((i) => i.message);
    return { valid: errors.length === 0, errors, warnings, issues };
  },

  calculate(input: AttentionInput): AttentionOutput {
    const v = this.validate(input);
    if (!v.valid) {
      throw new Error(`ScaledDotProductAttention: invalid input — ${(v.errors ?? []).join("; ")}`);
    }
    const warnings: string[] = [];
    const { query, key, value } = input;
    const qLen = query.length;
    const kLen = key.length;
    const dK = query[0].length;
    const dV = value[0].length;
    const scale = input.scale ?? 1 / Math.sqrt(dK);
    const causal = input.causal === true;
    const mask = input.mask;

    const output: number[][] = [];
    const attentionWeights: number[][] = [];

    for (let i = 0; i < qLen; i++) {
      // raw scaled scores for query i against all keys
      const scores = new Array<number>(kLen);
      for (let j = 0; j < kLen; j++) {
        let dot = 0;
        for (let d = 0; d < dK; d++) dot += query[i][d] * key[j][d];
        let s = dot * scale;
        if (causal && j > i) s = -Infinity;       // position i cannot attend to future j>i
        if (mask) s += mask[i][j];                 // additive mask (−Infinity disallows)
        scores[j] = s;
      }
      const weights = softmaxRow(scores);
      attentionWeights.push(weights);

      // weighted sum of value rows → output row [d_v]
      const outRow = new Array<number>(dV).fill(0);
      for (let j = 0; j < kLen; j++) {
        const w = weights[j];
        if (w === 0) continue;
        const vr = value[j];
        for (let d = 0; d < dV; d++) outRow[d] += w * vr[d];
      }
      output.push(outRow);
    }

    if (causal && qLen !== kLen) {
      warnings.push(`causal mask requested with Lq=${qLen} ≠ Lk=${kLen}; lower-triangular applied on the min diagonal.`);
    }

    return { output, attentionWeights, scale, qLen, kLen, dK, dV, warnings };
  },

  getMetadata(): AlgorithmMeta {
    return {
      id: "scaled_dot_product_attention",
      name: "Scaled Dot-Product Attention",
      version: "1.0.0",
      domain: "ml",
      category: "deep-learning",
      description:
        "Transformer scaled dot-product attention: softmax((Q·Kᵀ)/√d_k + mask)·V. Pure deterministic operator (no learned weights), numerically-stable row-wise softmax, optional causal + additive masking.",
      equation_plain: "Attention(Q,K,V) = softmax((Q·K^T)/sqrt(d_k) + mask) · V",
      assumptions: [
        "Q/K share key dimension d_k; K/V share sequence length L_k.",
        "Learned Q/K/V projections are applied upstream (this is the operator).",
      ],
      limitations: [
        "O(Lq·Lk·max(d_k,d_v)) dense attention — no flash/blocked kernel; batch or chunk long sequences.",
        "Single head — multi-head composes this per head + concatenates upstream.",
      ],
      reference: "Vaswani, A. et al. (2017). Attention Is All You Need. NeurIPS 2017.",
      inputs: {
        query: { type: "number[][]", description: "[Lq × d_k] queries" },
        key: { type: "number[][]", description: "[Lk × d_k] keys" },
        value: { type: "number[][]", description: "[Lk × d_v] values" },
        scale: { type: "number", description: "override 1/√d_k" },
        causal: { type: "boolean", description: "lower-triangular causal mask" },
        mask: { type: "number[][]", description: "[Lq × Lk] additive mask (−Inf disallows)" },
      },
      outputs: {
        output: { type: "number[][]", description: "[Lq × d_v] attention output" },
        attentionWeights: { type: "number[][]", description: "[Lq × Lk] row-stochastic weights" },
      },
      last_validated: "2026-05-29",
    };
  },
};
