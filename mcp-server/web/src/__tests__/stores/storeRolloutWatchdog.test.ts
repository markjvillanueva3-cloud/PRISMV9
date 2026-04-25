/**
 * Store Rollout Watchdog Tests — U-LPR07 LATHE-PROD-READY-MS0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  StoreRolloutWatchdog,
  SLI_THRESHOLDS,
  type RollbackEvent,
} from '../../stores/storeRolloutWatchdog';
import { StoreRolloutMetrics } from '../../stores/storeRolloutMetrics';
import { featureFlags, setFeatureFlag } from '../../stores/featureFlags';

describe('StoreRolloutWatchdog', () => {
  let metrics: StoreRolloutMetrics;
  let watchdog: StoreRolloutWatchdog;

  beforeEach(() => {
    setFeatureFlag('UNIFIED_STORE', true);
    metrics = new StoreRolloutMetrics();
    watchdog = new StoreRolloutWatchdog(metrics);
  });

  it('does not trip when metrics are healthy', () => {
    for (let i = 0; i < 50; i++) {
      metrics.recordBaselineCalcLatency(10);
      metrics.recordCalcLatency(10.5); // 5% Δ → under 10% threshold
      metrics.recordFps(60);
    }
    const evt = watchdog.evaluate();
    expect(evt).toBeNull();
    expect(watchdog.isTripped()).toBe(false);
    expect(featureFlags.UNIFIED_STORE).toBe(true);
  });

  it('does not trip when sample size is below the floor', () => {
    // Only 5 samples — below minLatencySamples (30). Even huge Δ ignored.
    for (let i = 0; i < 5; i++) {
      metrics.recordBaselineCalcLatency(10);
      metrics.recordCalcLatency(100); // 900% Δ
    }
    const evt = watchdog.evaluate();
    expect(evt).toBeNull();
    expect(watchdog.isTripped()).toBe(false);
  });

  it('trips on calc-latency regression and flips UNIFIED_STORE OFF', () => {
    for (let i = 0; i < 50; i++) {
      metrics.recordBaselineCalcLatency(10);
      metrics.recordCalcLatency(12); // 20% Δ → > 10% threshold
    }
    const evt = watchdog.evaluate();
    expect(evt).not.toBeNull();
    expect(evt!.reason).toBe('calc-latency-regression');
    expect(evt!.threshold).toBe(SLI_THRESHOLDS.calcLatencyDeltaPctMax);
    expect(evt!.observed).toBeCloseTo(20, 5);
    expect(watchdog.isTripped()).toBe(true);
    expect(featureFlags.UNIFIED_STORE).toBe(false);
  });

  it('trips on heap-growth regression', () => {
    const perf = performance as Performance & {
      memory?: { usedJSHeapSize: number };
    };
    const original = perf.memory;
    perf.memory = { usedJSHeapSize: 10_000_000 };
    const localMetrics = new StoreRolloutMetrics();
    perf.memory = { usedJSHeapSize: 12_000_000 }; // 20% growth → > 15% threshold
    const localWatchdog = new StoreRolloutWatchdog(localMetrics);

    const evt = localWatchdog.evaluate();
    expect(evt).not.toBeNull();
    expect(evt!.reason).toBe('heap-growth-regression');
    expect(evt!.observed).toBeCloseTo(20, 5);
    expect(featureFlags.UNIFIED_STORE).toBe(false);

    perf.memory = original;
  });

  it('trips on FPS regression after enough samples', () => {
    for (let i = 0; i < 40; i++) metrics.recordFps(50); // < 55 floor
    const evt = watchdog.evaluate();
    expect(evt).not.toBeNull();
    expect(evt!.reason).toBe('fps-regression');
    expect(evt!.observed).toBe(50);
    expect(evt!.threshold).toBe(SLI_THRESHOLDS.fpsMinFloor);
    expect(featureFlags.UNIFIED_STORE).toBe(false);
  });

  it('does not trip on FPS dip below the sample floor', () => {
    for (let i = 0; i < 10; i++) metrics.recordFps(20); // huge dip but few samples
    const evt = watchdog.evaluate();
    expect(evt).toBeNull();
    expect(watchdog.isTripped()).toBe(false);
  });

  it('is idempotent once tripped (subsequent evaluate() returns null)', () => {
    for (let i = 0; i < 50; i++) {
      metrics.recordBaselineCalcLatency(10);
      metrics.recordCalcLatency(20); // 100% Δ
    }
    const first = watchdog.evaluate();
    expect(first).not.toBeNull();
    setFeatureFlag('UNIFIED_STORE', true); // pretend an admin re-enabled it
    const second = watchdog.evaluate();
    expect(second).toBeNull();
    // Flag is NOT auto-flipped a second time by the watchdog after trip.
    expect(featureFlags.UNIFIED_STORE).toBe(true);
  });

  it('reset() clears tripped state but does not re-enable the flag', () => {
    for (let i = 0; i < 50; i++) {
      metrics.recordBaselineCalcLatency(10);
      metrics.recordCalcLatency(20);
    }
    watchdog.evaluate();
    expect(watchdog.isTripped()).toBe(true);
    expect(featureFlags.UNIFIED_STORE).toBe(false);
    watchdog.reset();
    expect(watchdog.isTripped()).toBe(false);
    expect(featureFlags.UNIFIED_STORE).toBe(false);
  });

  it('notifies subscribed listeners on rollback', () => {
    const events: RollbackEvent[] = [];
    watchdog.onRollback((e) => events.push(e));
    for (let i = 0; i < 50; i++) {
      metrics.recordBaselineCalcLatency(10);
      metrics.recordCalcLatency(15);
    }
    watchdog.evaluate();
    expect(events).toHaveLength(1);
    expect(events[0].reason).toBe('calc-latency-regression');
  });

  it('listener errors do not break rollback', () => {
    watchdog.onRollback(() => {
      throw new Error('listener boom');
    });
    for (let i = 0; i < 50; i++) {
      metrics.recordBaselineCalcLatency(10);
      metrics.recordCalcLatency(15);
    }
    expect(() => watchdog.evaluate()).not.toThrow();
    expect(watchdog.isTripped()).toBe(true);
    expect(featureFlags.UNIFIED_STORE).toBe(false);
  });

  it('unsubscribed listeners do not fire', () => {
    let calls = 0;
    const unsub = watchdog.onRollback(() => calls++);
    unsub();
    for (let i = 0; i < 50; i++) {
      metrics.recordBaselineCalcLatency(10);
      metrics.recordCalcLatency(15);
    }
    watchdog.evaluate();
    expect(calls).toBe(0);
  });

  it('start()/stop() polling lifecycle is idempotent', () => {
    vi.useFakeTimers();
    try {
      watchdog.start(1000);
      watchdog.start(1000); // second call no-ops
      // Trip the metric, then advance to fire the timer.
      for (let i = 0; i < 50; i++) {
        metrics.recordBaselineCalcLatency(10);
        metrics.recordCalcLatency(15);
      }
      vi.advanceTimersByTime(1000);
      expect(watchdog.isTripped()).toBe(true);
      watchdog.stop();
      // Stop again is safe.
      watchdog.stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it('preserves the threshold ordering: latency > heap > fps', () => {
    // Verify enum-style threshold contract is intact.
    expect(SLI_THRESHOLDS.calcLatencyDeltaPctMax).toBe(10);
    expect(SLI_THRESHOLDS.heapGrowthPctMax).toBe(15);
    expect(SLI_THRESHOLDS.fpsMinFloor).toBe(55);
    expect(SLI_THRESHOLDS.minLatencySamples).toBe(30);
    expect(SLI_THRESHOLDS.minFpsSamples).toBe(30);
  });
});
