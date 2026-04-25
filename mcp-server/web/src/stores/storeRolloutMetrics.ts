/**
 * Store Rollout Metrics — U-LPR07 LATHE-PROD-READY-MS0
 *
 * Captures the three SLIs that gate the UNIFIED_STORE 7-day staging A/B:
 *
 *   1. calc-latency:  per-event ms (p95 reported)
 *   2. heap-growth:   delta of performance.memory.usedJSHeapSize over the window
 *   3. fps-on-scroll: rAF-sampled FPS (min reported)
 *
 * Rollback thresholds (per LATHE-PROD-READY-MS0-PLAN.md U-LPR07):
 *   p95 calc-latency Δ ≤ 10%   (Δ relative to baseline)
 *   heap growth      ≤ 15%
 *   FPS on scroll    ≥ 55
 *
 * @milestone LATHE-PROD-READY-MS0 U-LPR07
 */

export interface MetricsSnapshot {
  calcLatencyP95Ms: number;
  calcLatencyBaselineP95Ms: number;
  calcLatencyDeltaPct: number;
  heapStartBytes: number;
  heapCurrentBytes: number;
  heapGrowthPct: number;
  fpsMin: number;
  fpsAvg: number;
  sampleCount: {
    latency: number;
    fps: number;
  };
}

/** Ring-buffer cap per metric — bounded memory under sustained scroll. */
const MAX_SAMPLES = 1000;
/** ms per second — converts inter-frame delta to FPS. */
const MS_PER_SECOND = 1000;
/** Display refresh assumption when no FPS samples have arrived yet. */
const DEFAULT_FPS_HZ = 60;
/** p95 percentile constant. */
const P95 = 95;
/** Percent-of-whole multiplier (ratio → percent). */
const PCT = 100;

/**
 * Compute pth-percentile (0..100) on a numeric array.
 * Linear interpolation between the two nearest ranks.
 */
export function percentile(values: ReadonlyArray<number>, p: number): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p / PCT) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  const frac = rank - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

/**
 * Read JS heap size (Chromium only — undefined elsewhere). Returned as bytes,
 * or 0 when the API is unavailable so callers degrade safely.
 */
function readHeapBytes(): number {
  const perf = (typeof performance !== 'undefined' ? performance : undefined) as
    | (Performance & { memory?: { usedJSHeapSize: number } })
    | undefined;
  return perf?.memory?.usedJSHeapSize ?? 0;
}

export class StoreRolloutMetrics {
  private latencySamples: number[] = [];
  private baselineLatencySamples: number[] = [];
  private fpsSamples: number[] = [];
  private heapStartBytes: number = readHeapBytes();
  private rafHandle: number | null = null;
  private lastRafTs: number | null = null;

  /** Mark a calc event for the *experiment* group (UNIFIED_STORE=on). */
  recordCalcLatency(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) return;
    this.latencySamples.push(ms);
    if (this.latencySamples.length > MAX_SAMPLES) this.latencySamples.shift();
  }

  /** Mark a calc event for the *baseline* group (UNIFIED_STORE=off). */
  recordBaselineCalcLatency(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) return;
    this.baselineLatencySamples.push(ms);
    if (this.baselineLatencySamples.length > MAX_SAMPLES) this.baselineLatencySamples.shift();
  }

  /** Push an FPS sample (typically from rAF loop). */
  recordFps(fps: number): void {
    if (!Number.isFinite(fps) || fps <= 0) return;
    this.fpsSamples.push(fps);
    if (this.fpsSamples.length > MAX_SAMPLES) this.fpsSamples.shift();
  }

  /** Reset the heap baseline (call once when flag flips ON). */
  markHeapBaseline(): void {
    this.heapStartBytes = readHeapBytes();
  }

  /** Begin rAF-driven FPS sampling. Idempotent. */
  startFpsSampling(): void {
    if (this.rafHandle !== null) return;
    if (typeof requestAnimationFrame !== 'function') return;
    const tick = (ts: number) => {
      if (this.lastRafTs !== null) {
        const dt = ts - this.lastRafTs;
        if (dt > 0) this.recordFps(MS_PER_SECOND / dt);
      }
      this.lastRafTs = ts;
      this.rafHandle = requestAnimationFrame(tick);
    };
    this.rafHandle = requestAnimationFrame(tick);
  }

  /** Stop the rAF sampling loop. */
  stopFpsSampling(): void {
    if (this.rafHandle !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.rafHandle);
    }
    this.rafHandle = null;
    this.lastRafTs = null;
  }

  snapshot(): MetricsSnapshot {
    const calcP95 = percentile(this.latencySamples, P95);
    const baselineP95 = percentile(this.baselineLatencySamples, P95);
    const deltaPct = baselineP95 > 0 ? ((calcP95 - baselineP95) / baselineP95) * PCT : 0;
    const heapNow = readHeapBytes();
    const heapGrowthPct = this.heapStartBytes > 0
      ? ((heapNow - this.heapStartBytes) / this.heapStartBytes) * PCT
      : 0;
    const fpsMin = this.fpsSamples.length > 0 ? Math.min(...this.fpsSamples) : DEFAULT_FPS_HZ;
    const fpsAvg = this.fpsSamples.length > 0
      ? this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length
      : DEFAULT_FPS_HZ;
    return {
      calcLatencyP95Ms: calcP95,
      calcLatencyBaselineP95Ms: baselineP95,
      calcLatencyDeltaPct: deltaPct,
      heapStartBytes: this.heapStartBytes,
      heapCurrentBytes: heapNow,
      heapGrowthPct,
      fpsMin,
      fpsAvg,
      sampleCount: {
        latency: this.latencySamples.length,
        fps: this.fpsSamples.length,
      },
    };
  }

  reset(): void {
    this.latencySamples = [];
    this.baselineLatencySamples = [];
    this.fpsSamples = [];
    this.heapStartBytes = readHeapBytes();
    this.stopFpsSampling();
  }
}

export const storeRolloutMetrics = new StoreRolloutMetrics();

/**
 * Convenience timer: measures wall-clock between start and end calls,
 * routes the sample to the correct bucket based on `experiment` flag.
 *
 * Usage:
 *   const stop = startCalcTimer(useUnifiedStore());
 *   doWork();
 *   stop();
 */
export function startCalcTimer(experiment: boolean): () => void {
  const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
  return () => {
    const dt = ((typeof performance !== 'undefined' ? performance : Date).now()) - t0;
    if (experiment) storeRolloutMetrics.recordCalcLatency(dt);
    else storeRolloutMetrics.recordBaselineCalcLatency(dt);
  };
}
