/**
 * Store Rollout Watchdog — U-LPR07 LATHE-PROD-READY-MS0
 *
 * Polls storeRolloutMetrics on an interval; when any SLI breaches its threshold,
 * flips UNIFIED_STORE OFF and emits a rollback event. Idempotent — once tripped,
 * subsequent ticks are no-ops until reset() is called.
 *
 * Thresholds (from LATHE-PROD-READY-MS0-PLAN.md U-LPR07):
 *   p95 calc-latency Δ ≤ 10%   (relative to baseline)
 *   heap growth      ≤ 15%
 *   FPS on scroll    ≥ 55
 *
 * @milestone LATHE-PROD-READY-MS0 U-LPR07
 */

import {
  storeRolloutMetrics,
  type MetricsSnapshot,
  StoreRolloutMetrics,
} from './storeRolloutMetrics';
import { setFeatureFlag } from './featureFlags';

/** Acceptance bounds. Crossing any of these trips a rollback. */
export const SLI_THRESHOLDS = {
  /** p95 calc-latency Δ in percent, relative to UNIFIED_STORE=off baseline. */
  calcLatencyDeltaPctMax: 10,
  /** Heap growth in percent, relative to flag-flip-on heap snapshot. */
  heapGrowthPctMax: 15,
  /** Minimum FPS observed during scroll sampling. */
  fpsMinFloor: 55,
  /** Min latency samples required before delta is considered (avoid noise). */
  minLatencySamples: 30,
  /** Min FPS samples required before fps floor is enforced. */
  minFpsSamples: 30,
} as const;

export type RollbackReason =
  | 'calc-latency-regression'
  | 'heap-growth-regression'
  | 'fps-regression';

export interface RollbackEvent {
  reason: RollbackReason;
  snapshot: MetricsSnapshot;
  threshold: number;
  observed: number;
  triggeredAt: number;
}

export type RollbackListener = (event: RollbackEvent) => void;

const DEFAULT_TICK_MS = 30_000;

export class StoreRolloutWatchdog {
  private timer: ReturnType<typeof setInterval> | null = null;
  private tripped = false;
  private listeners = new Set<RollbackListener>();
  private metrics: StoreRolloutMetrics;

  constructor(metrics: StoreRolloutMetrics = storeRolloutMetrics) {
    this.metrics = metrics;
  }

  onRollback(fn: RollbackListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Run a single evaluation against the current snapshot. Returns the event if tripped. */
  evaluate(): RollbackEvent | null {
    if (this.tripped) return null;
    const snap = this.metrics.snapshot();

    if (
      snap.sampleCount.latency >= SLI_THRESHOLDS.minLatencySamples &&
      snap.calcLatencyBaselineP95Ms > 0 &&
      snap.calcLatencyDeltaPct > SLI_THRESHOLDS.calcLatencyDeltaPctMax
    ) {
      return this.trip({
        reason: 'calc-latency-regression',
        snapshot: snap,
        threshold: SLI_THRESHOLDS.calcLatencyDeltaPctMax,
        observed: snap.calcLatencyDeltaPct,
        triggeredAt: Date.now(),
      });
    }

    if (snap.heapGrowthPct > SLI_THRESHOLDS.heapGrowthPctMax) {
      return this.trip({
        reason: 'heap-growth-regression',
        snapshot: snap,
        threshold: SLI_THRESHOLDS.heapGrowthPctMax,
        observed: snap.heapGrowthPct,
        triggeredAt: Date.now(),
      });
    }

    if (
      snap.sampleCount.fps >= SLI_THRESHOLDS.minFpsSamples &&
      snap.fpsMin < SLI_THRESHOLDS.fpsMinFloor
    ) {
      return this.trip({
        reason: 'fps-regression',
        snapshot: snap,
        threshold: SLI_THRESHOLDS.fpsMinFloor,
        observed: snap.fpsMin,
        triggeredAt: Date.now(),
      });
    }

    return null;
  }

  /** Begin polling. Idempotent. */
  start(intervalMs: number = DEFAULT_TICK_MS): void {
    if (this.timer !== null) return;
    if (typeof setInterval !== 'function') return;
    this.timer = setInterval(() => this.evaluate(), intervalMs);
  }

  stop(): void {
    if (this.timer !== null && typeof clearInterval === 'function') {
      clearInterval(this.timer);
    }
    this.timer = null;
  }

  /** Has the watchdog already tripped? */
  isTripped(): boolean {
    return this.tripped;
  }

  /** Clear tripped flag for the next bake cycle. Does not re-enable the flag. */
  reset(): void {
    this.tripped = false;
  }

  private trip(event: RollbackEvent): RollbackEvent {
    this.tripped = true;
    setFeatureFlag('UNIFIED_STORE', false);
    for (const fn of this.listeners) {
      try {
        fn(event);
      } catch {
        // Listener errors must not propagate — rollback always wins.
      }
    }
    return event;
  }
}

export const storeRolloutWatchdog = new StoreRolloutWatchdog();
