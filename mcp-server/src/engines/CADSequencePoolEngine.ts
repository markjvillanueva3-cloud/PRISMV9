/**
 * CADSequencePoolEngine — CAD-DRAW-MAX-MS0/P1-U05
 *
 * Position-aware pooling tier for the CAD encoder stack. NN01
 * (CADFoundationEncoderEngine) today mean-pools per-token embeddings,
 * which loses op order. For a 200-op impeller build the AI can't tell
 * "extrude-then-fillet" from "fillet-then-extrude" — but those produce
 * different parts. This engine introduces 4 position-aware pooling
 * strategies that callers can stack on top of NN01's token rows + the
 * P1-U04 arg rows.
 *
 * **Strategies.** All are deterministic — no learned weights at this
 * layer. LP04 owns learning; the pool is a fixed transform.
 *   - `mean`        — baseline (matches NN01).
 *   - `max`         — per-dim max-pool. Preserves "strongest signal"
 *                     across the sequence; good for catching feature
 *                     presence ("did the AI ever extrude?") but blind to
 *                     count.
 *   - `last`        — return the final row verbatim. Strongest recency.
 *   - `exp-decay`   — exponential-recency weighted mean:
 *                     w_i = exp(-α · (N-1-i)); sums to ≈ 1 after normalize.
 *                     Default α=0.3.
 *   - `attention`   — deterministic similarity attention: query = mean(rows);
 *                     weight_i = softmax(rows_i · query). No learned
 *                     parameters; same input → same output.
 *
 * **Output dim invariant.** Output length always equals input row width.
 * Empty input → zero vector of the dim inferred from `expectedDim` (or 0
 * if not supplied).
 *
 * **R12 fail-loud.** Mismatched row widths in a batch throws TypeError —
 * silently truncating would teach LP04 wrong features. Strategy that
 * doesn't exist throws TypeError.
 *
 * Refs: Attention is All You Need (Vaswani 2017) for similarity-attention
 * intuition; CADFoundationEncoderEngine (NN01) for mean baseline;
 * BERT-style [CLS] pooling pattern.
 */

// ── Constants ────────────────────────────────────────────────────────────────

export const POOL_STRATEGIES = ["mean", "max", "last", "exp-decay", "attention"] as const;
export type PoolStrategy = (typeof POOL_STRATEGIES)[number];

/** Default exp-decay rate. α=0.3 → row[N-3] gets weight exp(-0.6) ≈ 0.55 vs final row weight 1. */
export const DEFAULT_EXP_DECAY_ALPHA = 0.3;

// ── Types ────────────────────────────────────────────────────────────────────

export interface PoolOptions {
  strategy?: PoolStrategy;
  /** Exp-decay rate; ignored unless strategy="exp-decay". α>0; larger → stronger recency. */
  alpha?: number;
  /** Override query vector for attention; otherwise mean(rows) is used. */
  attentionQuery?: ReadonlyArray<number>;
  /** Output dim hint for empty input (avoids returning a zero-length vec). */
  expectedDim?: number;
}

export interface PoolStats {
  totalPools: number;
  byStrategy: Record<PoolStrategy, number>;
  totalEmptyInputs: number;
  totalRejectedWidthMismatch: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function zeros(dim: number): number[] {
  return new Array<number>(dim).fill(0);
}

function assertConsistentWidth(rows: ReadonlyArray<ReadonlyArray<number>>): number {
  if (rows.length === 0) return 0;
  const w = rows[0].length;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].length !== w) {
      throw new TypeError(
        `pool: row width mismatch — row 0 has width ${w}, row ${i} has width ${rows[i].length}`,
      );
    }
  }
  return w;
}

function meanPool(rows: ReadonlyArray<ReadonlyArray<number>>, w: number): number[] {
  const out = zeros(w);
  for (const r of rows) for (let d = 0; d < w; d++) out[d] += r[d];
  const inv = 1 / rows.length;
  for (let d = 0; d < w; d++) out[d] *= inv;
  return out;
}

function maxPool(rows: ReadonlyArray<ReadonlyArray<number>>, w: number): number[] {
  const out = new Array<number>(w).fill(Number.NEGATIVE_INFINITY);
  for (const r of rows) for (let d = 0; d < w; d++) if (r[d] > out[d]) out[d] = r[d];
  // If all rows had -Infinity (impossible normally), reset to 0
  for (let d = 0; d < w; d++) if (!Number.isFinite(out[d])) out[d] = 0;
  return out;
}

function lastPool(rows: ReadonlyArray<ReadonlyArray<number>>): number[] {
  return rows[rows.length - 1].slice();
}

function expDecayPool(rows: ReadonlyArray<ReadonlyArray<number>>, w: number, alpha: number): number[] {
  const N = rows.length;
  let total = 0;
  const weights = new Array<number>(N);
  for (let i = 0; i < N; i++) {
    weights[i] = Math.exp(-alpha * (N - 1 - i));
    total += weights[i];
  }
  const out = zeros(w);
  for (let i = 0; i < N; i++) {
    const wt = weights[i] / total;
    const row = rows[i];
    for (let d = 0; d < w; d++) out[d] += wt * row[d];
  }
  return out;
}

function attentionPool(
  rows: ReadonlyArray<ReadonlyArray<number>>,
  w: number,
  queryOverride?: ReadonlyArray<number>,
): number[] {
  const query = queryOverride ?? meanPool(rows, w);
  if (query.length !== w) {
    throw new TypeError(`pool(attention): queryOverride length ${query.length} != row width ${w}`);
  }
  // Compute raw scores = rows[i] · query
  const scores = new Array<number>(rows.length);
  let maxScore = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < rows.length; i++) {
    let s = 0;
    for (let d = 0; d < w; d++) s += rows[i][d] * query[d];
    scores[i] = s;
    if (s > maxScore) maxScore = s;
  }
  // Numerically stable softmax
  let denom = 0;
  for (let i = 0; i < rows.length; i++) {
    scores[i] = Math.exp(scores[i] - maxScore);
    denom += scores[i];
  }
  const out = zeros(w);
  for (let i = 0; i < rows.length; i++) {
    const wt = scores[i] / denom;
    const row = rows[i];
    for (let d = 0; d < w; d++) out[d] += wt * row[d];
  }
  return out;
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CADSequencePoolEngine {
  private totalPools = 0;
  private byStrategy: Record<PoolStrategy, number> = {
    mean: 0, max: 0, last: 0, "exp-decay": 0, attention: 0,
  };
  private totalEmptyInputs = 0;
  private totalRejectedWidthMismatch = 0;

  pool(rows: ReadonlyArray<ReadonlyArray<number>>, opts: PoolOptions = {}): number[] {
    if (!Array.isArray(rows)) {
      throw new TypeError("pool: rows must be an array");
    }
    const strategy: PoolStrategy = opts.strategy ?? "exp-decay";
    if (!POOL_STRATEGIES.includes(strategy)) {
      throw new TypeError(`pool: unknown strategy '${strategy}'; supported: ${POOL_STRATEGIES.join(", ")}`);
    }
    this.totalPools++;
    this.byStrategy[strategy]++;

    if (rows.length === 0) {
      this.totalEmptyInputs++;
      return zeros(opts.expectedDim ?? 0);
    }

    let w: number;
    try {
      w = assertConsistentWidth(rows);
    } catch (e) {
      this.totalRejectedWidthMismatch++;
      throw e;
    }
    if (w === 0) return [];

    switch (strategy) {
      case "mean": return meanPool(rows, w);
      case "max": return maxPool(rows, w);
      case "last": return lastPool(rows);
      case "exp-decay": {
        const alpha = typeof opts.alpha === "number" && Number.isFinite(opts.alpha) && opts.alpha > 0
          ? opts.alpha
          : DEFAULT_EXP_DECAY_ALPHA;
        return expDecayPool(rows, w, alpha);
      }
      case "attention": return attentionPool(rows, w, opts.attentionQuery);
    }
  }

  /** Convenience: pool with multiple strategies for inspection (debugging / ablation). */
  poolAll(rows: ReadonlyArray<ReadonlyArray<number>>, opts: Omit<PoolOptions, "strategy"> = {}): Record<PoolStrategy, number[]> {
    const out: Record<string, number[]> = {};
    for (const s of POOL_STRATEGIES) out[s] = this.pool(rows, { ...opts, strategy: s });
    return out as Record<PoolStrategy, number[]>;
  }

  getStats(): PoolStats {
    return {
      totalPools: this.totalPools,
      byStrategy: { ...this.byStrategy },
      totalEmptyInputs: this.totalEmptyInputs,
      totalRejectedWidthMismatch: this.totalRejectedWidthMismatch,
    };
  }

  _resetForTests(): void {
    this.totalPools = 0;
    this.byStrategy = { mean: 0, max: 0, last: 0, "exp-decay": 0, attention: 0 };
    this.totalEmptyInputs = 0;
    this.totalRejectedWidthMismatch = 0;
  }
}

export const cadSequencePoolEngine = new CADSequencePoolEngine();
