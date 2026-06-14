/**
 * CADHeadReplayBufferEngine — U-CADC-LP03 / CAD-COMPLETE-MS0
 *
 * Per-NN-head Prioritized Experience Replay (PER) buffer for the CAD
 * closed-loop learner. Each CAD system ("NN head") gets its own bounded,
 * priority-weighted buffer of FeedbackSamples (produced by LP02). LP04
 * draws prioritized minibatches from here to back-propagate.
 *
 * Reference: Schaul et al. 2015, "Prioritized Experience Replay" (ICLR 2016).
 *   - sampling probability  P(i) = p_i^α / Σ_k p_k^α
 *   - importance weight     w_i = (N · P(i))^(−β),  normalised by max_j w_j
 * Priorities are stored RAW (p_i = |TD-error| + ε); the α exponent is
 * applied at sample() time so α stays tunable without rescoring the buffer.
 *
 * Duplication-guard note (checked against PrioritizedReplayBufferEngine,
 * U-LEARN-10): that engine implements generic PER but (a) samples with
 * Math.random() — it CANNOT produce the reproducible seeded replay that is
 * this unit's stated acceptance ("deterministic replay mode for
 * reproducible training"); (b) is typed on the generic PrioritizedExperience
 * schema, not the CAD-cluster FeedbackSample. CADHeadReplayBufferEngine is
 * the CAD-closed-loop-specific buffer: seeded-deterministic (mulberry32),
 * FeedbackSample-typed, per-NN-head, and wired into prism_cad. The only
 * overlap is the published Schaul-2015 sampling math.
 *
 * Design invariants:
 *   1. Deterministic — given the same construction seed, the same add()
 *      sequence and the same sample() calls produce byte-identical batches.
 *      The seed is always readable via getSeed() for reproduction.
 *   2. Bounded — each head's buffer is FIFO-capped at capacityPerHead;
 *      evictions are counted.
 *   3. No entry is unreachable — every stored priority is clamped to
 *      ≥ MIN_PRIORITY so P(i) > 0 for all i (Schaul's ε floor).
 *   4. New entries get the head's high-water priority so a fresh sample is
 *      guaranteed to be eligible for replay at least once.
 *   5. sample()/getEntries() return copies — callers cannot mutate live state.
 *
 * Composes (per duplication-guard): the FeedbackSample type from LP02.
 * Consumed by: MasterBrainBackpropPropagatorEngine (LP04).
 *
 * @module engines/CADHeadReplayBufferEngine
 * @milestone CAD-COMPLETE-MS0 U-CADC-LP03
 */

import type { FeedbackSample } from "./CADPerAdapterFeedbackCollectorEngine.js";

/** Per-head buffer capacity — FIFO eviction beyond this many entries. */
const DEFAULT_CAPACITY_PER_HEAD = 256;
/** PER priority exponent α (Schaul 2015 §3.3 — 0.6 is the paper's value). */
const DEFAULT_ALPHA = 0.6;
/** PER importance-sampling exponent β (Schaul 2015 §3.4 — 0.4 is the paper's value). */
const DEFAULT_BETA = 0.4;
/** Priority floor ε — keeps every entry's sampling probability strictly > 0. */
const MIN_PRIORITY = 1e-6;
/** Fixed default seed for the production singleton — reproducible by default. */
const DEFAULT_SEED = 0x5cadc103;

/**
 * mulberry32 — a tiny, well-distributed, seedable 32-bit PRNG (public domain,
 * Tommy Ettinger). Chosen over Math.random() precisely so replay is
 * reproducible. Returns a float in [0, 1).
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One replay entry — a feedback sample with a raw training priority. */
export interface ReplayEntry {
  /** Monotonic per-head id — stable across eviction (an evicted id is simply absent). */
  id: number;
  /** NN head id (== CAD adapter) this entry belongs to. */
  headId: string;
  /** The buffered training sample. */
  sample: FeedbackSample;
  /** Raw priority p_i = |TD-error| + ε (α applied at sample time, not here). */
  priority: number;
}

/** Result of a sample() draw. */
export interface ReplayBatch {
  /** NN head the batch was drawn from. */
  headId: string;
  /** The drawn entries (copies). */
  entries: ReplayEntry[];
  /** Entry ids — pass these to updatePriorities() after computing TD-errors. */
  ids: number[];
  /** Importance-sampling weights, normalised so max weight == 1. */
  weights: number[];
}

/** Per-head bookkeeping in the stats snapshot. */
export interface PerHeadReplayCounter {
  /** Entries currently buffered. */
  size: number;
  /** Entries added over the head's lifetime. */
  added: number;
  /** Entries evicted by the FIFO cap. */
  evicted: number;
  /** High-water raw priority seen for this head. */
  maxPriority: number;
}

/** Aggregate replay-buffer stats reported by getStats(). */
export interface ReplayBufferStats {
  /** Distinct NN heads with a buffer. */
  headCount: number;
  /** Entries added across all heads. */
  totalAdded: number;
  /** Entries evicted across all heads. */
  totalEvicted: number;
  /** sample() draws served across all heads. */
  totalSampled: number;
  /** Per-head counters. */
  byHead: Record<string, PerHeadReplayCounter>;
}

/** Internal per-head buffer state. */
interface HeadBuffer {
  entries: ReplayEntry[];
  nextId: number;
  added: number;
  evicted: number;
  /** Monotonic high-water priority — new entries inherit it (Schaul convention). */
  maxPriority: number;
}

/** Coerce an option to a positive number, else fall back to def. */
function positiveOr(value: number | undefined, def: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : def;
}

/** Coerce an option to a non-negative number, else fall back to def. */
function nonNegativeOr(value: number | undefined, def: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : def;
}

/**
 * CADHeadReplayBufferEngine — singleton (also constructible for tests).
 *
 * Production code uses the exported `cadHeadReplayBufferEngine` singleton
 * (fixed seed → reproducible). Tests construct isolated instances via `new`,
 * passing an explicit seed to assert deterministic replay.
 */
export class CADHeadReplayBufferEngine {
  private buffers: Map<string, HeadBuffer> = new Map();
  private readonly capacityPerHead: number;
  private readonly alpha: number;
  private readonly beta: number;
  private readonly seed: number;
  private rng: () => number;
  private totalSampled = 0;

  /**
   * @param opts.capacityPerHead per-head FIFO cap (default 256).
   * @param opts.alpha           PER priority exponent (default 0.6).
   * @param opts.beta            PER importance-sampling exponent (default 0.4).
   * @param opts.seed            PRNG seed — pass a fixed value for reproducible
   *                             replay; omitted → entropy seed (still readable
   *                             via getSeed()).
   */
  constructor(opts?: { capacityPerHead?: number; alpha?: number; beta?: number; seed?: number }) {
    this.capacityPerHead = Math.max(1, Math.floor(positiveOr(opts?.capacityPerHead, DEFAULT_CAPACITY_PER_HEAD)));
    this.alpha = nonNegativeOr(opts?.alpha, DEFAULT_ALPHA);
    this.beta = nonNegativeOr(opts?.beta, DEFAULT_BETA);
    this.seed =
      typeof opts?.seed === "number" && Number.isFinite(opts.seed)
        ? opts.seed >>> 0
        : (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    this.rng = mulberry32(this.seed);
  }

  /** The PRNG seed in use — pass this to a new instance to reproduce a run. */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Add a feedback sample to its head's replay buffer. New entries inherit
   * the head's high-water priority (Schaul convention — guarantees the
   * fresh sample is eligible for replay). Returns the new entry id.
   */
  add(headId: string, sample: FeedbackSample, priority?: number): number {
    if (typeof headId !== "string" || headId.length === 0) {
      throw new TypeError("add: headId must be a non-empty string");
    }
    if (!sample || typeof sample !== "object") {
      throw new TypeError("add: sample must be a FeedbackSample object");
    }
    const buf = this.getOrCreate(headId);
    const rawPriority =
      typeof priority === "number" && Number.isFinite(priority)
        ? Math.max(MIN_PRIORITY, priority)
        : buf.maxPriority;
    if (rawPriority > buf.maxPriority) buf.maxPriority = rawPriority;

    const entry: ReplayEntry = { id: buf.nextId++, headId, sample, priority: rawPriority };
    buf.entries.push(entry);
    buf.added++;
    if (buf.entries.length > this.capacityPerHead) {
      buf.entries.shift();
      buf.evicted++;
    }
    return entry.id;
  }

  /**
   * Draw a prioritized minibatch from one head, WITHOUT replacement.
   * Deterministic for a given seed + call sequence. An empty/unknown head
   * or batchSize ≤ 0 yields an empty batch (never throws).
   */
  sample(headId: string, batchSize: number): ReplayBatch {
    const buf = this.buffers.get(headId);
    const n = buf ? buf.entries.length : 0;
    const k = n === 0 || !Number.isFinite(batchSize) ? 0 : Math.min(Math.max(0, Math.floor(batchSize)), n);
    if (k === 0 || !buf) {
      return { headId, entries: [], ids: [], weights: [] };
    }

    // α-weighted priorities → full-distribution probabilities P(i). At extreme
    // α/priority, Math.pow can underflow to 0 or overflow to Infinity; when the
    // weighting is numerically unusable, degrade to uniform sampling (the safe
    // unbiased fallback) so probs + IS-weights can never become NaN/Infinity.
    const alphaWeightsRaw = buf.entries.map((e) => Math.pow(e.priority, this.alpha));
    const totalRaw = alphaWeightsRaw.reduce((a, b) => a + b, 0);
    const usableWeighting =
      Number.isFinite(totalRaw) && totalRaw > 0 && alphaWeightsRaw.every((w) => Number.isFinite(w) && w > 0);
    const alphaWeights = usableWeighting ? alphaWeightsRaw : buf.entries.map(() => 1);
    const totalAlpha = usableWeighting ? totalRaw : buf.entries.length;
    const probs = alphaWeights.map((w) => w / totalAlpha);

    // Weighted draw without replacement: pool of indices + their α-weights.
    const poolIdx: number[] = buf.entries.map((_, i) => i);
    const poolW: number[] = alphaWeights.slice();
    const chosen: number[] = [];
    for (let d = 0; d < k; d++) {
      const poolTotal = poolW.reduce((a, b) => a + b, 0);
      let target = this.rng() * poolTotal;
      let pick = poolIdx.length - 1;
      for (let i = 0; i < poolIdx.length; i++) {
        target -= poolW[i];
        if (target <= 0) {
          pick = i;
          break;
        }
      }
      chosen.push(poolIdx[pick]);
      poolIdx.splice(pick, 1);
      poolW.splice(pick, 1);
    }

    // Importance-sampling weights w_i = (N·P(i))^(−β), normalised by max.
    // reduce-max (not Math.max spread) so a large capacityPerHead cannot
    // overflow the call stack; rawWeights is non-empty here (k >= 1).
    const rawWeights = chosen.map((i) => Math.pow(n * probs[i], -this.beta));
    const maxW = rawWeights.reduce((m, w) => (w > m ? w : m), rawWeights[0]);
    const weights = rawWeights.map((w) => w / maxW);

    this.totalSampled += k;
    return {
      headId,
      entries: chosen.map((i) => ({ ...buf.entries[i], sample: buf.entries[i].sample })),
      ids: chosen.map((i) => buf.entries[i].id),
      weights,
    };
  }

  /**
   * Update raw priorities after LP04 computes TD-errors. ids absent from the
   * head's buffer (e.g. evicted) are skipped. Returns the count actually
   * updated. Each priority is clamped to ≥ MIN_PRIORITY.
   */
  updatePriorities(headId: string, ids: number[], priorities: number[]): number {
    const buf = this.buffers.get(headId);
    if (!buf || !Array.isArray(ids) || !Array.isArray(priorities)) return 0;
    const byId = new Map(buf.entries.map((e) => [e.id, e]));
    let updated = 0;
    const count = Math.min(ids.length, priorities.length);
    for (let i = 0; i < count; i++) {
      const entry = byId.get(ids[i]);
      const p = priorities[i];
      if (!entry || typeof p !== "number" || !Number.isFinite(p)) continue;
      const clamped = Math.max(MIN_PRIORITY, p);
      entry.priority = clamped;
      if (clamped > buf.maxPriority) buf.maxPriority = clamped;
      updated++;
    }
    return updated;
  }

  /** A copy of one head's buffered entries (oldest first), optionally last N. */
  getEntries(headId: string, limit?: number): ReplayEntry[] {
    const buf = this.buffers.get(headId);
    if (!buf) return [];
    const copy = buf.entries.map((e) => ({ ...e, sample: e.sample }));
    if (Number.isInteger(limit) && (limit as number) > 0) {
      return copy.slice(-(limit as number));
    }
    return copy;
  }

  /** Number of entries currently buffered for a head. */
  size(headId: string): number {
    return this.buffers.get(headId)?.entries.length ?? 0;
  }

  /** All NN head ids with a buffer, sorted. */
  listHeads(): string[] {
    return [...this.buffers.keys()].sort();
  }

  /** Snapshot of aggregate replay-buffer stats. byHead is a fresh object. */
  getStats(): ReplayBufferStats {
    const byHead: Record<string, PerHeadReplayCounter> = {};
    let totalAdded = 0;
    let totalEvicted = 0;
    for (const [headId, buf] of this.buffers) {
      byHead[headId] = {
        size: buf.entries.length,
        added: buf.added,
        evicted: buf.evicted,
        maxPriority: buf.maxPriority,
      };
      totalAdded += buf.added;
      totalEvicted += buf.evicted;
    }
    return {
      headCount: this.buffers.size,
      totalAdded,
      totalEvicted,
      totalSampled: this.totalSampled,
      byHead,
    };
  }

  /** Test helper — clears all buffers, zeroes counters, re-seeds the PRNG. */
  reset(): void {
    this.buffers.clear();
    this.totalSampled = 0;
    this.rng = mulberry32(this.seed);
  }

  private getOrCreate(headId: string): HeadBuffer {
    let buf = this.buffers.get(headId);
    if (!buf) {
      buf = { entries: [], nextId: 0, added: 0, evicted: 0, maxPriority: 1.0 };
      this.buffers.set(headId, buf);
    }
    return buf;
  }
}

/**
 * Singleton — fixed-seeded so production replay is reproducible by default.
 * LP04 adds samples + draws batches from this instance.
 */
export const cadHeadReplayBufferEngine = new CADHeadReplayBufferEngine({ seed: DEFAULT_SEED });
