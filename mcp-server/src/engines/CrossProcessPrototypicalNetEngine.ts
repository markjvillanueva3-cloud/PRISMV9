/**
 * CrossProcessPrototypicalNetEngine — XPROC-NEURAL Tier 7 (T7-02)
 *
 * Few-shot classification and regression via class prototypes, per
 * Snell, Swersky, Zemel 2017, "Prototypical Networks for Few-shot
 * Learning," NeurIPS.
 *
 * ## Why prototypes for PRISM
 *
 * When a new material/machine pair arrives at JM Die we have, at most,
 * a handful of cut samples before the AI has to recommend speed/feed.
 * Full re-training from scratch is impossible (too few examples). MAML
 * (T7-01) gives a fast-adaptation init but still requires gradient
 * descent. Prototypical networks need ZERO gradient steps: embed the
 * few examples, average them per class to form prototypes, classify
 * new queries by nearest prototype.
 *
 * For regression (predicting Vc from material features) we extend the
 * idea via Nadaraya-Watson kernel regression on the same embedded
 * space — query value = weighted average of training values where
 * weights ∝ exp(-||q - p_c||² / τ).
 *
 * ## Algorithm
 *
 * ### Prototype computation (Snell §2.1, Eq. 1)
 *
 *   p_c = (1/|S_c|) Σ_{x ∈ S_c} f_φ(x)
 *
 * where S_c is the support set for class c and f_φ(·) is the embedding
 * network. We do NOT own f_φ — caller embeds outside (T1-02 MLP, BERT,
 * whatever) and passes us the embedding vectors directly.
 *
 * ### Classification (Snell §2.2, Eq. 2)
 *
 *   p(y=c | x) = softmax_c(-d(f_φ(x), p_c))
 *
 * with d = squared Euclidean (paper finds this beats cosine in their
 * benchmarks for the specific class-prototype-as-mean assumption).
 * Argmax over classes gives the prediction.
 *
 * ### Regression (Nadaraya-Watson with squared-Euclidean kernel)
 *
 *   ŷ(q) = Σ_c w_c · y_c   where  w_c = exp(-d²/τ) / Z,  Z = Σ_c exp(-d²/τ)
 *
 * The temperature τ controls smoothness (small τ → nearest-neighbor;
 * large τ → uniform average). Caller picks τ for their problem; we
 * default to τ = median(d²) which is the heuristic Snell suggests for
 * stable convergence.
 *
 * ## Architecture decision — pure aggregator (matches Tier 5/6/7-01)
 *
 * Three pure functions:
 *   1. `prototype({classId, embeddings[][]})` — compute mean prototype.
 *      Returns prototype + #samples + per-dim variance (diagnostic).
 *   2. `classify({queryEmbedding, prototypes[]})` — softmax-of-negative-
 *      distances classification. Returns predicted class + softmax
 *      probabilities + nearest-prototype distance.
 *   3. `regress({queryEmbedding, prototypes[], values[], temperature?})`
 *      — Nadaraya-Watson kernel regression. Returns predicted value +
 *      per-prototype weights + total kernel mass (diagnostic for
 *      out-of-distribution detection: low mass = query is far from
 *      every prototype).
 *
 * Why split into three: classify and regress are independent operations
 * with different output semantics; prototype computation is a separate
 * preparation step that operators may want to run once and cache.
 *
 * ## Acceptance (XPROC-NEURAL-ROADMAP.md Tier 7 R2)
 *
 *   "Classification accuracy ≥90% on 5-shot 5-way."
 *
 * Verified in test suite via deterministic 5-class 5-shot synthetic
 * task: each class has a true center in 8-D embedding space; support
 * embeddings drawn with σ=0.2 noise; query embeddings drawn from each
 * class. Prototypical-net achieves ≥0.90 accuracy when class centers
 * are separated by ≥1.0 in L2.
 *
 * ## Failure modes covered
 *
 *   1. Empty embeddings list                  → invalid_input
 *   2. Mismatched embedding dimensions in batch → invalid_input
 *   3. NaN/Inf in embeddings                  → invalid_input (Zod)
 *   4. Single embedding for prototype         → variance = 0 + warn
 *   5. Empty prototypes for classify          → invalid_input
 *   6. Mismatched prototype dimensions        → invalid_input
 *   7. Mismatched query dimension vs proto    → invalid_input
 *   8. Duplicate classId across prototypes    → keep first + warn
 *   9. Empty values for regress               → invalid_input
 *  10. values.length != prototypes.length     → invalid_input
 *  11. temperature ≤ 0                        → invalid_input (Zod)
 *  12. All distances NaN (degenerate input)   → invalid_state
 *
 * @module CrossProcessPrototypicalNetEngine
 */

import { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

/** Sanity bounds. */
const MAX_EMBEDDING_DIM = 4096;
const MAX_SUPPORT_SAMPLES = 10_000;
const MAX_PROTOTYPES = 1024;

/** Numerical-stability floor for softmax denominator. */
const SOFTMAX_EPS = 1e-30;

// ============================================================================
// Schemas
// ============================================================================

const PrototypeInputSchema = z.object({
  classId: z.string().min(1).max(128),
  /** N support embeddings of identical dimension D. */
  embeddings: z.array(z.array(z.number().finite()).min(1).max(MAX_EMBEDDING_DIM))
    .min(1).max(MAX_SUPPORT_SAMPLES),
});

const PrototypeRefSchema = z.object({
  classId: z.string().min(1).max(128),
  prototype: z.array(z.number().finite()).min(1).max(MAX_EMBEDDING_DIM),
});

const ClassifyInputSchema = z.object({
  queryEmbedding: z.array(z.number().finite()).min(1).max(MAX_EMBEDDING_DIM),
  prototypes: z.array(PrototypeRefSchema).min(1).max(MAX_PROTOTYPES),
});

const RegressInputSchema = z.object({
  queryEmbedding: z.array(z.number().finite()).min(1).max(MAX_EMBEDDING_DIM),
  prototypes: z.array(PrototypeRefSchema).min(1).max(MAX_PROTOTYPES),
  /** Per-prototype known target values. Must match prototypes order. */
  values: z.array(z.number().finite()).min(1).max(MAX_PROTOTYPES),
  /** Kernel bandwidth τ. Defaults to median(d²) when omitted. */
  temperature: z.number().finite().positive().max(1e6).optional(),
});

// ============================================================================
// Public types
// ============================================================================

export interface PrototypeRef {
  classId: string;
  prototype: number[];
}

export interface PrototypeOk {
  ok: true;
  classId: string;
  prototype: number[];
  /** Number of support samples averaged. */
  supportSize: number;
  /** Per-dimension variance — tells caller how tight this cluster is. */
  perDimVariance: number[];
  /** Mean per-dim variance (single scalar summary). */
  meanVariance: number;
  warnings: string[];
}

export interface ClassifyOk {
  ok: true;
  /** Predicted class (argmax over softmax probabilities). */
  predicted: string;
  /** Softmax probabilities per class, in same order as input prototypes. */
  probabilities: { classId: string; probability: number; squaredDistance: number }[];
  /** Distance to nearest prototype (= predicted class's d²). */
  nearestDistance: number;
  warnings: string[];
}

export interface RegressOk {
  ok: true;
  /** Predicted value (weighted average of prototype values). */
  predictedValue: number;
  /** Effective temperature used (input or auto-default). */
  temperature: number;
  /** Per-prototype weights — sum to 1. */
  weights: { classId: string; weight: number; squaredDistance: number }[];
  /** Sum of kernel terms BEFORE normalization. Low value = query far from all
   *  prototypes (potentially out-of-distribution). */
  kernelMass: number;
  warnings: string[];
}

export interface OpErr {
  ok: false;
  error: "invalid_input" | "invalid_state";
  message: string;
}

export type PrototypeResult = PrototypeOk | OpErr;
export type ClassifyResult = ClassifyOk | OpErr;
export type RegressResult = RegressOk | OpErr;

// ============================================================================
// Helpers
// ============================================================================

function squaredEuclidean(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return s;
}

function ensureUniformLength(vectors: number[][]): { ok: true } | { ok: false; expected: number; mismatchAt: number } {
  if (vectors.length === 0) return { ok: true };
  const expected = vectors[0].length;
  for (let i = 1; i < vectors.length; i++) {
    if (vectors[i].length !== expected) {
      return { ok: false, expected, mismatchAt: i };
    }
  }
  return { ok: true };
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length & 1
    ? sorted[mid]
    : 0.5 * (sorted[mid - 1] + sorted[mid]);
}

function dedupePrototypes(prototypes: PrototypeRef[]): { unique: PrototypeRef[]; warnings: string[] } {
  const seen = new Map<string, PrototypeRef>();
  const warnings: string[] = [];
  for (const p of prototypes) {
    if (seen.has(p.classId)) {
      warnings.push(`duplicate classId '${p.classId}' (kept first)`);
      continue;
    }
    seen.set(p.classId, p);
  }
  return { unique: Array.from(seen.values()), warnings };
}

// ============================================================================
// Public API
// ============================================================================

export class CrossProcessPrototypicalNetEngine {
  static readonly tier = "T7-02";

  /**
   * Compute the class prototype as the mean of N support embeddings.
   * Per-dimension variance is also reported (diagnostic for cluster
   * tightness — high variance suggests the embedding space does NOT
   * separate this class cleanly).
   */
  static computePrototype(input: unknown): PrototypeResult {
    const parsed = PrototypeInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { classId, embeddings } = parsed.data;
    const lengthCheck = ensureUniformLength(embeddings);
    if (!lengthCheck.ok) {
      return {
        ok: false, error: "invalid_input",
        message: `embeddings length mismatch: [0]=${lengthCheck.expected}, [${lengthCheck.mismatchAt}] differs`,
      };
    }

    const N = embeddings.length;
    const D = embeddings[0].length;
    const proto = new Array<number>(D).fill(0);
    for (const e of embeddings) {
      for (let i = 0; i < D; i++) proto[i] += e[i] / N;
    }

    const perDimVariance = new Array<number>(D).fill(0);
    if (N > 1) {
      for (const e of embeddings) {
        for (let i = 0; i < D; i++) {
          const diff = e[i] - proto[i];
          perDimVariance[i] += (diff * diff) / (N - 1);
        }
      }
    }

    const warnings: string[] = [];
    if (N === 1) {
      warnings.push(`single support sample for class '${classId}' — variance is 0 (no spread information)`);
    }

    let meanVariance = 0;
    for (let i = 0; i < D; i++) meanVariance += perDimVariance[i] / D;

    return {
      ok: true,
      classId,
      prototype: proto,
      supportSize: N,
      perDimVariance,
      meanVariance,
      warnings,
    };
  }

  /**
   * Classify a query via softmax over negative squared distances to
   * each prototype (Snell §2.2 Eq. 2). Returns argmax + full softmax
   * distribution + nearest-prototype distance.
   */
  static classify(input: unknown): ClassifyResult {
    const parsed = ClassifyInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { queryEmbedding, prototypes } = parsed.data;

    // Verify all prototypes have same dim as query.
    const D = queryEmbedding.length;
    for (let i = 0; i < prototypes.length; i++) {
      if (prototypes[i].prototype.length !== D) {
        return {
          ok: false, error: "invalid_input",
          message: `prototype[${i}] '${prototypes[i].classId}' dim=${prototypes[i].prototype.length} != query dim=${D}`,
        };
      }
    }

    const { unique, warnings } = dedupePrototypes(prototypes as PrototypeRef[]);

    // Compute squared distances + softmax(-d²) with max-subtraction trick.
    const sqDists = unique.map((p) => squaredEuclidean(queryEmbedding, p.prototype));
    const negDists = sqDists.map((d) => -d);
    const maxNeg = Math.max(...negDists);
    const exps = negDists.map((nd) => Math.exp(nd - maxNeg));
    let denom = 0;
    for (const e of exps) denom += e;
    if (!Number.isFinite(denom) || denom < SOFTMAX_EPS) {
      return { ok: false, error: "invalid_state", message: "softmax denominator non-finite or near-zero" };
    }

    const probabilities = unique.map((p, i) => ({
      classId: p.classId,
      probability: exps[i] / denom,
      squaredDistance: sqDists[i],
    }));

    let bestIdx = 0;
    for (let i = 1; i < probabilities.length; i++) {
      if (probabilities[i].probability > probabilities[bestIdx].probability) bestIdx = i;
    }

    return {
      ok: true,
      predicted: probabilities[bestIdx].classId,
      probabilities,
      nearestDistance: sqDists[bestIdx],
      warnings,
    };
  }

  /**
   * Nadaraya-Watson kernel regression with squared-Euclidean RBF kernel
   * over prototypes. Returns the weighted average of prototype values
   * + per-prototype weights + raw kernel mass (used for OOD detection).
   */
  static regress(input: unknown): RegressResult {
    const parsed = RegressInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { queryEmbedding, prototypes, values } = parsed.data;
    if (values.length !== prototypes.length) {
      return {
        ok: false, error: "invalid_input",
        message: `values.length (${values.length}) must equal prototypes.length (${prototypes.length})`,
      };
    }
    const D = queryEmbedding.length;
    for (let i = 0; i < prototypes.length; i++) {
      if (prototypes[i].prototype.length !== D) {
        return {
          ok: false, error: "invalid_input",
          message: `prototype[${i}] '${prototypes[i].classId}' dim=${prototypes[i].prototype.length} != query dim=${D}`,
        };
      }
    }

    const { unique, warnings } = dedupePrototypes(prototypes as PrototypeRef[]);
    // Re-align values with deduped prototypes.
    const idMap = new Map<string, number>();
    for (let i = 0; i < prototypes.length; i++) {
      if (!idMap.has(prototypes[i].classId)) idMap.set(prototypes[i].classId, i);
    }
    const alignedValues = unique.map((p) => values[idMap.get(p.classId)!]);

    const sqDists = unique.map((p) => squaredEuclidean(queryEmbedding, p.prototype));
    const tau = parsed.data.temperature ?? Math.max(median(sqDists), 1e-9);

    const expTerms = sqDists.map((d) => Math.exp(-d / tau));
    let kernelMass = 0;
    for (const e of expTerms) kernelMass += e;
    if (!Number.isFinite(kernelMass) || kernelMass < SOFTMAX_EPS) {
      return { ok: false, error: "invalid_state", message: "kernel mass non-finite or near-zero" };
    }

    const weights = unique.map((p, i) => ({
      classId: p.classId,
      weight: expTerms[i] / kernelMass,
      squaredDistance: sqDists[i],
    }));

    let predictedValue = 0;
    for (let i = 0; i < unique.length; i++) {
      predictedValue += weights[i].weight * alignedValues[i];
    }

    return {
      ok: true,
      predictedValue,
      temperature: tau,
      weights,
      kernelMass,
      warnings,
    };
  }

  /** Read-only constants snapshot. */
  static constants(): {
    MAX_EMBEDDING_DIM: number;
    MAX_SUPPORT_SAMPLES: number;
    MAX_PROTOTYPES: number;
  } {
    return { MAX_EMBEDDING_DIM, MAX_SUPPORT_SAMPLES, MAX_PROTOTYPES };
  }
}

export const crossProcessPrototypicalNetEngine = CrossProcessPrototypicalNetEngine;

/** Dispatcher convenience wrapper. */
export function crossProcessPrototypicalNet(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_proto_compute":
      return CrossProcessPrototypicalNetEngine.computePrototype(params);
    case "xproc_proto_classify":
      return CrossProcessPrototypicalNetEngine.classify(params);
    case "xproc_proto_regress":
      return CrossProcessPrototypicalNetEngine.regress(params);
    case "xproc_proto_constants":
      return CrossProcessPrototypicalNetEngine.constants();
    default:
      throw new Error(`crossProcessPrototypicalNet: unknown action '${action}'`);
  }
}
