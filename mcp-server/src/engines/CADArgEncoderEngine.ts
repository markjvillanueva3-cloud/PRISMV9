/**
 * CADArgEncoderEngine — CAD-DRAW-MAX-MS0/P1-U04
 *
 * Encodes the **args** of a CADOperation into a fixed-dimensional vector.
 * NN01 (CADFoundationEncoderEngine) tokenizes only the `kind` field —
 * `sketch_create` vs `feature_extrude` — and is blind to `radius=5mm`,
 * `depth=10mm`, `draft=2deg`. For "draw any part" the AI must learn
 * across argument variations, not just op kinds. This adapter is the
 * missing arg-encoding tier between NN01's tokenizer and LP04's heads.
 *
 * **Output shape.** A fixed `ARG_EMBED_DIM`-length number[] per
 * CADOperation. Concatenating NN01's `OP_EMBED_DIM` (8) + this
 * `ARG_EMBED_DIM` (8) gives a per-op feature vector with arg awareness;
 * pooling over a sequence then feeds LP04's value head.
 *
 * **Encoding strategy.**
 *   - **Numeric args** (radius, depth, distance, angle, x/y/z): pulled
 *     into 5 canonical slots (`size`, `position`, `angle`, `count`,
 *     `tolerance`). Multi-field detection: keys matching `/radius|depth|
 *     distance|thickness|height/i` → size; `/^x$|^y$|^z$|position/i` →
 *     position; `/angle|deg|tilt/i` → angle; `/count|num|n_/i` → count;
 *     `/tol|grade|fit/i` → tolerance. Each is `log1p(|v|) / log1p(1024)`
 *     clipped to [-1, 1].
 *   - **Categorical args** (operation, plane, type, op): hash-bucketed
 *     into 3 small dims via a deterministic LCG (same seed family as
 *     NN01).
 *
 * **Determinism.** Same args → same vector across restarts. No learned
 * weights at this layer (LP04 owns learning).
 *
 * **Why fixed slots vs free hash.** A hash-only encoding loses the
 * physical meaning of "size vs angle" — LP04 would have to relearn
 * which slot is size. Canonical slots make the value head's first
 * layer interpretable: an "extrude depth weight" naturally lives in
 * the same slot as a "fillet radius weight."
 *
 * Refs: CADFoundationEncoderEngine (NN01); BERT positional-embedding
 * pattern (Devlin 2018); feature-engineering best practices for
 * categorical+continuous mixed input.
 */

import type { CADOperation, CADOperationArgs } from "../interfaces/ICADCodeGenerator.js";

// ── Constants ────────────────────────────────────────────────────────────────

/** Total per-op arg embedding dimensionality. */
export const ARG_EMBED_DIM = 8;
/** Slot count for canonical numeric args (size/position/angle/count/tolerance). */
export const NUMERIC_SLOT_COUNT = 5;
/** Slot count for hash-bucketed categorical args. */
export const CATEGORICAL_SLOT_COUNT = 3;
/** Log-normalize ceiling (same as NN01). */
const LOG_NORM_CEIL = 1024;
/** LCG seed prime for categorical hashing (NN01-compatible). */
const CATEGORICAL_SEED_PRIME = 2_654_435_761;
const LCG_M = 0x7fff_ffff;
const LCG_A = 1_103_515_245;
const LCG_C = 12_345;

// ── Types ────────────────────────────────────────────────────────────────────

export interface ArgEncoderStats {
  totalEncodings: number;
  totalBatchEncodings: number;
  totalNonFiniteValues: number;
  totalEmptyArgs: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** log1p(|x|) / log1p(1024), clipped to [-1, 1]. NaN/Infinity → 0. */
function logNormalizeSigned(v: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  const sign = v < 0 ? -1 : 1;
  const mag = Math.log1p(Math.abs(v)) / Math.log1p(LOG_NORM_CEIL);
  return sign * Math.min(1, mag);
}

/** LCG-style hash of a string → real in [-1, 1]. */
function hashString(s: string, dim: number): number {
  let state = 0;
  for (let i = 0; i < s.length; i++) {
    state = (state * 31 + s.charCodeAt(i)) & LCG_M;
  }
  state = (state + dim * CATEGORICAL_SEED_PRIME) & LCG_M;
  state = (LCG_A * state + LCG_C) & LCG_M;
  return (state / LCG_M) * 2 - 1;
}

/** First numeric value matching a key-regex; undefined when none found. */
function firstNumericMatch(args: CADOperationArgs, pattern: RegExp): number | undefined {
  for (const [k, v] of Object.entries(args)) {
    if (pattern.test(k) && typeof v === "number") return v;
  }
  return undefined;
}

/** First string/boolean value matching a key-regex; undefined when none. */
function firstCategoricalMatch(args: CADOperationArgs, pattern: RegExp): string | undefined {
  for (const [k, v] of Object.entries(args)) {
    if (pattern.test(k)) {
      if (typeof v === "string") return v;
      if (typeof v === "boolean") return v ? "true" : "false";
    }
  }
  return undefined;
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CADArgEncoderEngine {
  private totalEncodings = 0;
  private totalBatchEncodings = 0;
  private totalNonFiniteValues = 0;
  private totalEmptyArgs = 0;

  /** Encode the args of one CADOperation into an ARG_EMBED_DIM-length vector. */
  encodeArgs(args: CADOperationArgs | undefined): number[] {
    this.totalEncodings++;
    const v = new Array<number>(ARG_EMBED_DIM).fill(0);
    if (!args || typeof args !== "object" || Object.keys(args).length === 0) {
      this.totalEmptyArgs++;
      return v;
    }

    // Numeric slots
    const size = firstNumericMatch(args, /radius|depth|distance|thickness|height/i);
    const position = firstNumericMatch(args, /^x$|^y$|^z$|position/i);
    const angle = firstNumericMatch(args, /angle|deg|tilt/i);
    const count = firstNumericMatch(args, /count|num|n_/i);
    const tolerance = firstNumericMatch(args, /tol|grade|fit/i);

    // Count NaN/Infinity occurrences for telemetry
    for (const raw of [size, position, angle, count, tolerance]) {
      if (typeof raw === "number" && !Number.isFinite(raw)) this.totalNonFiniteValues++;
    }

    v[0] = logNormalizeSigned(size ?? 0);
    v[1] = logNormalizeSigned(position ?? 0);
    v[2] = logNormalizeSigned(angle ?? 0);
    v[3] = logNormalizeSigned(count ?? 0);
    v[4] = logNormalizeSigned(tolerance ?? 0);

    // Categorical slots
    const operation = firstCategoricalMatch(args, /operation|^op$|method|strategy/i);
    const plane = firstCategoricalMatch(args, /plane|axis|datum/i);
    const type = firstCategoricalMatch(args, /type|kind|shape/i);

    if (operation !== undefined) v[5] = hashString(operation, 0);
    if (plane !== undefined) v[6] = hashString(plane, 1);
    if (type !== undefined) v[7] = hashString(type, 2);

    return v;
  }

  /** Encode an op stream: returns one ARG_EMBED_DIM vector per op (parallel to NN01 tokens). */
  encodeOpArgs(ops: ReadonlyArray<CADOperation>): number[][] {
    if (!Array.isArray(ops)) {
      throw new TypeError("encodeOpArgs: ops must be an array");
    }
    this.totalBatchEncodings++;
    return ops.map(o => this.encodeArgs(o?.args));
  }

  /** Mean-pool an op-stream's arg encodings into a single ARG_EMBED_DIM vector. */
  encodeOpArgsPooled(ops: ReadonlyArray<CADOperation>): number[] {
    const rows = this.encodeOpArgs(ops);
    const out = new Array<number>(ARG_EMBED_DIM).fill(0);
    if (rows.length === 0) return out;
    for (const row of rows) for (let d = 0; d < ARG_EMBED_DIM; d++) out[d] += row[d];
    const inv = 1 / rows.length;
    for (let d = 0; d < ARG_EMBED_DIM; d++) out[d] *= inv;
    return out;
  }

  getStats(): ArgEncoderStats {
    return {
      totalEncodings: this.totalEncodings,
      totalBatchEncodings: this.totalBatchEncodings,
      totalNonFiniteValues: this.totalNonFiniteValues,
      totalEmptyArgs: this.totalEmptyArgs,
    };
  }

  _resetForTests(): void {
    this.totalEncodings = 0;
    this.totalBatchEncodings = 0;
    this.totalNonFiniteValues = 0;
    this.totalEmptyArgs = 0;
  }
}

export const cadArgEncoderEngine = new CADArgEncoderEngine();
