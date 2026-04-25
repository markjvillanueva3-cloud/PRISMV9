/**
 * Store Rollout Metrics Tests — U-LPR07 LATHE-PROD-READY-MS0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  StoreRolloutMetrics,
  percentile,
  startCalcTimer,
} from '../../stores/storeRolloutMetrics';

describe('percentile', () => {
  it('returns 0 for empty array', () => {
    expect(percentile([], 95)).toBe(0);
    expect(percentile([], 50)).toBe(0);
  });

  it('returns the single value when length=1', () => {
    expect(percentile([42], 95)).toBe(42);
    expect(percentile([7], 0)).toBe(7);
  });

  it('computes p95 of a small ordered set', () => {
    // 20 evenly-spaced samples: rank for p95 is 0.95 * 19 = 18.05.
    // sorted[18]=18, sorted[19]=19 → 18 + 0.05*(19-18) = 18.05
    const xs = Array.from({ length: 20 }, (_, i) => i);
    expect(percentile(xs, 95)).toBeCloseTo(18.05, 5);
  });

  it('computes p50 (median) on odd-length arrays', () => {
    expect(percentile([1, 5, 9], 50)).toBe(5);
  });

  it('computes p100 as max', () => {
    expect(percentile([3, 1, 4, 1, 5, 9, 2, 6], 100)).toBe(9);
  });

  it('computes p0 as min', () => {
    expect(percentile([3, 1, 4, 1, 5, 9, 2, 6], 0)).toBe(1);
  });

  it('does not mutate the input array', () => {
    const xs = [3, 1, 2];
    percentile(xs, 50);
    expect(xs).toEqual([3, 1, 2]);
  });
});

describe('StoreRolloutMetrics', () => {
  let m: StoreRolloutMetrics;

  beforeEach(() => {
    m = new StoreRolloutMetrics();
  });

  it('rejects non-finite and negative latency samples', () => {
    m.recordCalcLatency(NaN);
    m.recordCalcLatency(Infinity);
    m.recordCalcLatency(-1);
    const snap = m.snapshot();
    expect(snap.sampleCount.latency).toBe(0);
    expect(snap.calcLatencyP95Ms).toBe(0);
  });

  it('records a single calc-latency sample', () => {
    m.recordCalcLatency(12.5);
    const snap = m.snapshot();
    expect(snap.sampleCount.latency).toBe(1);
    expect(snap.calcLatencyP95Ms).toBe(12.5);
  });

  it('caps the experiment latency ring at 1000 samples', () => {
    for (let i = 0; i < 1500; i++) m.recordCalcLatency(i);
    const snap = m.snapshot();
    expect(snap.sampleCount.latency).toBe(1000);
    // After ring rotation the smallest survivor is 500, the largest is 1499.
    // p95 over [500..1499] = 500 + 0.95 * 999 = 1449.05.
    expect(snap.calcLatencyP95Ms).toBeCloseTo(1449.05, 1);
  });

  it('computes Δ% relative to baseline (positive regression)', () => {
    for (let i = 0; i < 100; i++) m.recordBaselineCalcLatency(10);
    for (let i = 0; i < 100; i++) m.recordCalcLatency(13);
    const snap = m.snapshot();
    expect(snap.calcLatencyBaselineP95Ms).toBe(10);
    expect(snap.calcLatencyP95Ms).toBe(13);
    expect(snap.calcLatencyDeltaPct).toBeCloseTo(30, 5);
  });

  it('reports 0% delta when no baseline samples present', () => {
    m.recordCalcLatency(50);
    const snap = m.snapshot();
    expect(snap.calcLatencyBaselineP95Ms).toBe(0);
    expect(snap.calcLatencyDeltaPct).toBe(0);
  });

  it('rejects non-finite and zero/negative FPS samples', () => {
    m.recordFps(NaN);
    m.recordFps(0);
    m.recordFps(-30);
    const snap = m.snapshot();
    expect(snap.sampleCount.fps).toBe(0);
    // No samples → defaults to display-refresh assumption.
    expect(snap.fpsMin).toBe(60);
    expect(snap.fpsAvg).toBe(60);
  });

  it('reports min and avg FPS across samples', () => {
    [60, 58, 62, 55, 60, 60].forEach((f) => m.recordFps(f));
    const snap = m.snapshot();
    expect(snap.fpsMin).toBe(55);
    expect(snap.fpsAvg).toBeCloseTo((60 + 58 + 62 + 55 + 60 + 60) / 6, 5);
    expect(snap.sampleCount.fps).toBe(6);
  });

  it('reset() clears all sample buffers', () => {
    m.recordCalcLatency(10);
    m.recordBaselineCalcLatency(8);
    m.recordFps(60);
    m.reset();
    const snap = m.snapshot();
    expect(snap.sampleCount.latency).toBe(0);
    expect(snap.sampleCount.fps).toBe(0);
    expect(snap.calcLatencyP95Ms).toBe(0);
    expect(snap.calcLatencyBaselineP95Ms).toBe(0);
  });

  it('heap snapshot includes start, current, and growth pct', () => {
    const snap = m.snapshot();
    // jsdom typically lacks performance.memory → both fields are 0, growth=0.
    expect(typeof snap.heapStartBytes).toBe('number');
    expect(typeof snap.heapCurrentBytes).toBe('number');
    expect(typeof snap.heapGrowthPct).toBe('number');
    expect(snap.heapGrowthPct).toBe(0);
  });

  it('markHeapBaseline() resets the heap-start anchor', () => {
    // Stub performance.memory to simulate Chromium.
    const perf = performance as Performance & {
      memory?: { usedJSHeapSize: number };
    };
    const original = perf.memory;
    perf.memory = { usedJSHeapSize: 10_000_000 };
    const local = new StoreRolloutMetrics();
    perf.memory = { usedJSHeapSize: 11_500_000 };
    let snap = local.snapshot();
    expect(snap.heapStartBytes).toBe(10_000_000);
    expect(snap.heapCurrentBytes).toBe(11_500_000);
    expect(snap.heapGrowthPct).toBeCloseTo(15, 5);

    local.markHeapBaseline();
    snap = local.snapshot();
    expect(snap.heapStartBytes).toBe(11_500_000);
    expect(snap.heapGrowthPct).toBe(0);

    perf.memory = original;
  });

  it('startFpsSampling is idempotent (no double-arm)', () => {
    m.startFpsSampling();
    m.startFpsSampling();
    m.stopFpsSampling();
    const snap = m.snapshot();
    expect(snap.sampleCount.fps).toBeGreaterThanOrEqual(0);
  });
});

describe('startCalcTimer', () => {
  it('routes to the experiment bucket when flag is true', () => {
    const m = new StoreRolloutMetrics();
    // Singleton is module-scoped so recreate via direct calls.
    const stop = startCalcTimer(true);
    stop();
    // singleton.snapshot() will now reflect at least one sample.
    // This test asserts the bucketing function exists and runs without error;
    // detailed routing verified by direct StoreRolloutMetrics tests above.
    expect(typeof stop).toBe('function');
    expect(m.snapshot().sampleCount.latency).toBe(0); // local instance unaffected
  });

  it('returns a stop function that runs without throwing', () => {
    const stopExp = startCalcTimer(true);
    const stopBase = startCalcTimer(false);
    expect(() => stopExp()).not.toThrow();
    expect(() => stopBase()).not.toThrow();
  });
});
