/**
 * CADPerAdapterFeedbackCollectorEngine — U-CADC-LP02 / CAD-COMPLETE-MS0
 *
 * Closed-loop NN feedback collector. Subscribes to the U-CADC-LP01 CAD
 * execution outcome bus and partitions every outcome into a per-CAD-system
 * ("NN head") rolling buffer, then exposes windowed metrics for each head
 * so the downstream learners can train:
 *   - LP03 (CADHeadReplayBufferEngine)            — pulls per-head samples.
 *   - LP04 (MasterBrainBackpropPropagatorEngine)  — back-props per-head.
 *
 * Why "per NN head": the closed-loop CAD AI keeps one neural head per CAD
 * system (freecad / fusion360 / mastercam / ...). A head only ever learns
 * from outcomes produced by its own adapter — cross-contaminating a
 * fusion360 head with mastercam timing would teach it the wrong latency
 * prior. So routing is keyed strictly on adapterId == headId.
 *
 * Design invariants (per duplication-guard review against existing
 * FeedbackCollectorEngine + ActualVsPredictedCollectorEngine — both are
 * generic LLM/neural collectors with no per-CAD-adapter routing):
 *   1. NEVER throw out of ingest() — it runs inside LP01's subscriber
 *      fan-out. LP01 isolates a throwing handler (counts handlerErrors)
 *      but the sample would still be lost. A malformed outcome is counted
 *      (stats.malformedDropped) and dropped; R12 fail-loud via a stat,
 *      not via an exception.
 *   2. Buffers are bounded — FIFO eviction at maxBufferSize keeps memory
 *      flat under an unbounded outcome stream; evictions are counted.
 *   3. Metrics are windowed — computed over the last `windowSize` samples
 *      so a head's recent behaviour is not drowned by stale history. The
 *      buffer itself still grows (up to the cap) for LP03 replay.
 *   4. getFeedbackBuffer() returns a copy — callers cannot mutate the
 *      live buffer.
 *
 * Composes (per duplication-guard): cadExecutionOutcomeBusEngine (LP01).
 * Consumed by: CADHeadReplayBufferEngine (LP03),
 *              MasterBrainBackpropPropagatorEngine (LP04).
 *
 * @module engines/CADPerAdapterFeedbackCollectorEngine
 * @milestone CAD-COMPLETE-MS0 U-CADC-LP02
 */

import {
  cadExecutionOutcomeBusEngine,
  CADExecutionOutcomeBusEngine,
  type CADExecutionOutcome,
} from "./CADExecutionOutcomeBusEngine.js";

/** Default rolling-metrics window — windowed metrics use the last 50 outcomes. */
const DEFAULT_WINDOW_SIZE = 50;
/** Default per-head buffer cap — 1000 samples; FIFO eviction beyond it. */
const DEFAULT_MAX_BUFFER = 1000;

/**
 * A single feedback sample for one NN head, derived from a CAD execution
 * outcome. Optional outcome fields are coerced to concrete values so
 * downstream learners (LP03/LP04) never branch on undefined.
 */
export interface FeedbackSample {
  /** NN head id — equal to the producing CAD adapter (cadSystem). */
  headId: string;
  /** True iff the CAD operation completed without error. */
  success: boolean;
  /** Wall-clock execution time in ms (non-negative finite). */
  timingMs: number;
  /** True iff a collision was reported (undefined outcome field → false). */
  collision: boolean;
  /** True iff post-execute regeneration validation passed (undefined → false). */
  regenerationOk: boolean;
  /** Brief error message when success=false; omitted otherwise. */
  errorMessage?: string;
  /** Script/program id this outcome belongs to, if the producer supplied one. */
  scriptId?: string;
  /**
   * Lineage id chaining outcome → recommendation. Always populated on the
   * bus path (LP01 publish() stamps the canonical copy every subscriber
   * sees); the "" fallback fires only for a hand-built outcome passed
   * straight to ingest() without going through the bus.
   */
  lineageId: string;
  /**
   * ISO timestamp. Always event-time on the bus path (LP01 publish()
   * stamps the canonical copy); for a hand-built outcome with no timestamp
   * passed straight to ingest(), this is ingest-time, not event-time.
   */
  timestamp: string;
}

/** Windowed metrics for one NN head. All rates are in [0,1]. */
export interface HeadMetrics {
  /** NN head id (== CAD adapter). */
  headId: string;
  /** Total samples currently buffered for this head. */
  bufferSize: number;
  /** Requested window length N. */
  windowSize: number;
  /** Samples actually used = min(bufferSize, windowSize). */
  windowCount: number;
  /** successes / windowCount (0 when windowCount=0). */
  successRate: number;
  /** failures / windowCount (0 when windowCount=0). */
  failureRate: number;
  /** collisions / windowCount (0 when windowCount=0). */
  collisionRate: number;
  /** regenerationOk / windowCount (0 when windowCount=0). */
  regenOkRate: number;
  /** Mean timingMs over the window (0 when windowCount=0). */
  meanTimingMs: number;
  /** Median (p50, nearest-rank) timingMs over the window. */
  p50TimingMs: number;
  /** p95 (nearest-rank) timingMs over the window. */
  p95TimingMs: number;
  /** Timestamp of the most recent sample, or null when the head is empty. */
  lastTimestamp: string | null;
}

/** Per-head bookkeeping in the aggregate stats snapshot. */
export interface PerHeadCounter {
  /** Samples currently buffered. */
  samples: number;
  /** Samples evicted by the FIFO cap over the head's lifetime. */
  evicted: number;
}

/** Aggregate collector stats reported by getStats(). */
export interface CollectorStats {
  /** Outcomes accepted into a head buffer. */
  totalIngested: number;
  /** Outcomes rejected at ingest because they were malformed. */
  malformedDropped: number;
  /** Distinct NN heads seen. */
  headCount: number;
  /** Per-head sample + eviction counts. */
  byHead: Record<string, PerHeadCounter>;
}

/** Coerce a window argument to a positive integer, else fall back to def. */
function normalizeWindow(window: number | undefined, def: number): number {
  return Number.isInteger(window) && (window as number) > 0 ? (window as number) : def;
}

/**
 * Nearest-rank percentile over an ascending-sorted numeric array.
 * Returns 0 for an empty array. p is a fraction in [0,1].
 */
function nearestRankPercentile(sortedAsc: number[], p: number): number {
  const n = sortedAsc.length;
  if (n === 0) return 0;
  const rank = Math.ceil(p * n);
  const idx = Math.min(n - 1, Math.max(0, rank - 1));
  return sortedAsc[idx];
}

/**
 * CADPerAdapterFeedbackCollectorEngine — singleton (also constructible for tests).
 *
 * Production code uses the exported `cadPerAdapterFeedbackCollectorEngine`
 * singleton, which is auto-attached to the LP01 bus at module load. Tests
 * construct isolated instances via `new` — those do NOT auto-attach, so a
 * test can wire a fresh collector to a fresh bus without global bleed-over.
 */
export class CADPerAdapterFeedbackCollectorEngine {
  /** headId → rolling sample buffer (oldest first). */
  private buffers: Map<string, FeedbackSample[]> = new Map();
  /** headId → lifetime FIFO-eviction count. */
  private evicted: Map<string, number> = new Map();
  private readonly windowSize: number;
  private readonly maxBufferSize: number;
  private stats = { totalIngested: 0, malformedDropped: 0 };

  /**
   * @param opts.windowSize    last-N window for metrics (default 50).
   * @param opts.maxBufferSize per-head buffer cap (default 1000).
   */
  constructor(opts?: { windowSize?: number; maxBufferSize?: number }) {
    this.windowSize = normalizeWindow(opts?.windowSize, DEFAULT_WINDOW_SIZE);
    this.maxBufferSize = normalizeWindow(opts?.maxBufferSize, DEFAULT_MAX_BUFFER);
  }

  /**
   * Subscribe this collector to a CAD outcome bus. Every published outcome
   * is fed to ingest(). Returns the bus's unsubscribe function.
   */
  attach(bus: CADExecutionOutcomeBusEngine): () => void {
    if (!bus || typeof bus.subscribe !== "function") {
      throw new TypeError("attach: bus must expose a subscribe(handler) method");
    }
    return bus.subscribe((o) => this.ingest(o));
  }

  /**
   * Ingest one CAD execution outcome — route it to the head buffer for its
   * cadSystem. Returns true if accepted, false if dropped as malformed.
   * NEVER throws (invariant 1).
   */
  ingest(outcome: Readonly<CADExecutionOutcome>): boolean {
    if (
      !outcome ||
      typeof outcome !== "object" ||
      typeof outcome.adapterId !== "string" ||
      outcome.adapterId.length === 0 ||
      typeof outcome.success !== "boolean" ||
      typeof outcome.timingMs !== "number" ||
      !Number.isFinite(outcome.timingMs) ||
      outcome.timingMs < 0
    ) {
      this.stats.malformedDropped++;
      return false;
    }

    const headId = outcome.adapterId;
    const sample: FeedbackSample = {
      headId,
      success: outcome.success,
      timingMs: outcome.timingMs,
      collision: outcome.collision === true,
      regenerationOk: outcome.regenerationOk === true,
      errorMessage: outcome.errorMessage,
      scriptId: outcome.scriptId,
      // LP01 publish() always stamps lineageId + timestamp on the canonical
      // copy seen by bus subscribers; the fallbacks below fire only for a
      // hand-built outcome fed straight to ingest() — "" lineage, ingest-time ts.
      lineageId: typeof outcome.lineageId === "string" ? outcome.lineageId : "",
      timestamp: typeof outcome.timestamp === "string" ? outcome.timestamp : new Date().toISOString(),
    };

    let buf = this.buffers.get(headId);
    if (!buf) {
      buf = [];
      this.buffers.set(headId, buf);
      this.evicted.set(headId, 0);
    }
    buf.push(sample);
    if (buf.length > this.maxBufferSize) {
      buf.shift();
      this.evicted.set(headId, (this.evicted.get(headId) ?? 0) + 1);
    }
    this.stats.totalIngested++;
    return true;
  }

  /**
   * Windowed metrics for one NN head over the last `window` samples.
   * An unknown head returns a zero-filled HeadMetrics (never throws).
   */
  getMetrics(headId: string, window?: number): HeadMetrics {
    const w = normalizeWindow(window, this.windowSize);
    const buf = this.buffers.get(headId) ?? [];
    const slice = buf.slice(-w);
    const windowCount = slice.length;

    if (windowCount === 0) {
      return {
        headId,
        bufferSize: buf.length,
        windowSize: w,
        windowCount: 0,
        successRate: 0,
        failureRate: 0,
        collisionRate: 0,
        regenOkRate: 0,
        meanTimingMs: 0,
        p50TimingMs: 0,
        p95TimingMs: 0,
        lastTimestamp: null,
      };
    }

    let successes = 0;
    let collisions = 0;
    let regenOk = 0;
    let timingSum = 0;
    const timings: number[] = [];
    for (const s of slice) {
      if (s.success) successes++;
      if (s.collision) collisions++;
      if (s.regenerationOk) regenOk++;
      timingSum += s.timingMs;
      timings.push(s.timingMs);
    }
    timings.sort((a, b) => a - b);

    return {
      headId,
      bufferSize: buf.length,
      windowSize: w,
      windowCount,
      successRate: successes / windowCount,
      failureRate: (windowCount - successes) / windowCount,
      collisionRate: collisions / windowCount,
      regenOkRate: regenOk / windowCount,
      meanTimingMs: timingSum / windowCount,
      p50TimingMs: nearestRankPercentile(timings, 0.5),
      p95TimingMs: nearestRankPercentile(timings, 0.95),
      lastTimestamp: slice[slice.length - 1].timestamp,
    };
  }

  /** Windowed metrics for every head seen so far, sorted by headId. */
  getAllMetrics(window?: number): HeadMetrics[] {
    return this.listHeads().map((h) => this.getMetrics(h, window));
  }

  /**
   * A copy of one head's feedback buffer (oldest first). Optionally limited
   * to the last `limit` samples. Returns [] for an unknown head.
   */
  getFeedbackBuffer(headId: string, limit?: number): FeedbackSample[] {
    const buf = this.buffers.get(headId) ?? [];
    const copy = buf.map((s) => ({ ...s }));
    if (Number.isInteger(limit) && (limit as number) > 0) {
      return copy.slice(-(limit as number));
    }
    return copy;
  }

  /** All NN head ids that have received at least one sample, sorted. */
  listHeads(): string[] {
    return [...this.buffers.keys()].sort();
  }

  /** Snapshot of aggregate collector stats. byHead is a fresh object. */
  getStats(): CollectorStats {
    const byHead: Record<string, PerHeadCounter> = {};
    for (const [headId, buf] of this.buffers) {
      byHead[headId] = {
        samples: buf.length,
        evicted: this.evicted.get(headId) ?? 0,
      };
    }
    return {
      totalIngested: this.stats.totalIngested,
      malformedDropped: this.stats.malformedDropped,
      headCount: this.buffers.size,
      byHead,
    };
  }

  /** Test helper — clears all buffers + zeroes stats. Not for production use. */
  reset(): void {
    this.buffers.clear();
    this.evicted.clear();
    this.stats = { totalIngested: 0, malformedDropped: 0 };
  }
}

/**
 * Singleton — auto-subscribed to the LP01 outcome bus at module load so
 * per-adapter feedback is collected for the whole process lifetime. The
 * unsubscribe handle is intentionally discarded: the production collector
 * lives as long as the process.
 */
export const cadPerAdapterFeedbackCollectorEngine = new CADPerAdapterFeedbackCollectorEngine();
cadPerAdapterFeedbackCollectorEngine.attach(cadExecutionOutcomeBusEngine);
