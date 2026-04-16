/**
 * WEDMKalmanFusionEngine Tests — WEDM AGI Phase 1 / U-P1-02
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WEDMKalmanFusionEngine,
} from "../../engines/WEDMKalmanFusionEngine.js";
import type { WEDMSensorReading } from "../../engines/WEDMMachineStateEngine.js";

const R = (o: Partial<WEDMSensorReading>): WEDMSensorReading => ({ t_ms: 0, ...o });

// Simple deterministic PRNG (mulberry32) so tests are reproducible.
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noisyConstant(n: number, mean: number, sigma: number, rng: () => number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    // Box-Muller
    const u1 = Math.max(rng(), 1e-10);
    const u2 = rng();
    const g = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    out.push(mean + sigma * g);
  }
  return out;
}

describe("WEDMKalmanFusionEngine.fuse — per-channel update", () => {
  let engine: WEDMKalmanFusionEngine;
  beforeEach(() => {
    engine = new WEDMKalmanFusionEngine();
  });

  it("initialises state on first measurement (gain = 1, innovation = 0)", () => {
    const f = engine.fuse(R({ t_ms: 0, gap_voltage_V: 80 }));
    expect(f.gap_voltage_V).not.toBeNull();
    expect(f.gap_voltage_V!.value).toBe(80);
    expect(f.gap_voltage_V!.measurements).toBe(1);
    expect(f.gap_voltage_V!.gain).toBe(1);
    expect(f.gap_voltage_V!.innovation).toBe(0);
  });

  it("reduces innovation magnitude as more frames accumulate (variance drops)", () => {
    const f1 = engine.fuse(R({ t_ms: 0, gap_voltage_V: 80 }));
    const f2 = engine.fuse(R({ t_ms: 10, gap_voltage_V: 82 }));
    expect(f2.gap_voltage_V!.variance).toBeLessThan(f1.gap_voltage_V!.variance);
    // Kalman K < 1 after first step, so filtered value stays between prev state and new z
    expect(f2.gap_voltage_V!.value).toBeGreaterThan(80);
    expect(f2.gap_voltage_V!.value).toBeLessThan(82);
  });

  it("leaves channel null for a never-seen-before channel, reuses last if seen", () => {
    engine.fuse(R({ t_ms: 0, wire_tension_N: 9 }));
    const f = engine.fuse(R({ t_ms: 10 })); // no fields this frame
    expect(f.wire_tension_N).not.toBeNull();
    expect(f.wire_tension_N!.value).toBe(9);
    expect(f.bath_temperature_C).toBeNull();
  });

  it("ignores non-finite measurements (NaN, Infinity)", () => {
    const f = engine.fuse(R({ t_ms: 0, gap_voltage_V: NaN, wire_tension_N: Infinity }));
    expect(f.gap_voltage_V).toBeNull();
    expect(f.wire_tension_N).toBeNull();
  });

  it("records innovation magnitude for downstream anomaly detection", () => {
    engine.fuse(R({ t_ms: 0, discharge_current_A: 10 }));
    engine.fuse(R({ t_ms: 10, discharge_current_A: 10 }));
    engine.fuse(R({ t_ms: 20, discharge_current_A: 10 }));
    // Now inject a spike
    const spike = engine.fuse(R({ t_ms: 30, discharge_current_A: 40 }));
    expect(Math.abs(spike.discharge_current_A!.innovation)).toBeGreaterThan(20);
  });

  it("tracks measurement count per channel independently", () => {
    engine.fuse(R({ t_ms: 0, gap_voltage_V: 80, wire_tension_N: 9 }));
    engine.fuse(R({ t_ms: 10, gap_voltage_V: 80 }));
    engine.fuse(R({ t_ms: 20, gap_voltage_V: 80 }));
    const snap = engine.snapshot();
    expect(snap.gap_voltage_V!.measurements).toBe(3);
    expect(snap.wire_tension_N!.measurements).toBe(1);
  });
});

describe("WEDMKalmanFusionEngine — snapshot / reset / tune", () => {
  it("snapshot returns last fused state without modifying filter", () => {
    const engine = new WEDMKalmanFusionEngine();
    engine.fuse(R({ t_ms: 5, gap_voltage_V: 80 }));
    const s1 = engine.snapshot();
    const s2 = engine.snapshot();
    expect(s1.t_ms).toBe(5);
    expect(s1.gap_voltage_V!.value).toBeCloseTo(s2.gap_voltage_V!.value, 10);
  });

  it("reset clears all per-channel filters", () => {
    const engine = new WEDMKalmanFusionEngine();
    engine.fuse(R({ t_ms: 0, gap_voltage_V: 80 }));
    engine.reset();
    const snap = engine.snapshot();
    expect(snap.gap_voltage_V).toBeNull();
    expect(snap.t_ms).toBe(0);
  });

  it("tune overrides noise priors for a channel", () => {
    const engine = new WEDMKalmanFusionEngine();
    engine.tune("bath_temperature_C", { r: 0.01, q: 1e-6 }); // trust measurements more
    engine.fuse(R({ t_ms: 0, bath_temperature_C: 22 }));
    const f = engine.fuse(R({ t_ms: 10, bath_temperature_C: 23 }));
    // High trust in measurements → new value close to 23
    expect(f.bath_temperature_C!.value).toBeGreaterThan(22.5);
  });
});

describe("WEDMKalmanFusionEngine — exit gate (≥50% σ reduction)", () => {
  it("reduces standard deviation of noisy gap_voltage by ≥50%", () => {
    const engine = new WEDMKalmanFusionEngine();
    const rng = seeded(12345);
    const series = noisyConstant(200, 80, 5, rng); // σ = 5V, matching prior
    const bench = engine.benchmarkChannel("gap_voltage_V", series);
    expect(bench.rawStd).toBeGreaterThan(4);
    expect(bench.reductionPct).toBeGreaterThanOrEqual(50);
    expect(bench.filteredStd).toBeLessThan(bench.rawStd * 0.5);
  });

  it("reduces standard deviation of noisy wire tension by ≥50%", () => {
    const engine = new WEDMKalmanFusionEngine();
    const rng = seeded(7);
    const series = noisyConstant(200, 9, 0.5, rng);
    const bench = engine.benchmarkChannel("wire_tension_N", series);
    expect(bench.reductionPct).toBeGreaterThanOrEqual(50);
  });

  it("preserves signal mean (filtered mean ≈ raw mean ±10%)", () => {
    const engine = new WEDMKalmanFusionEngine();
    const rng = seeded(42);
    const series = noisyConstant(200, 100, 5, rng);
    const bench = engine.benchmarkChannel("gap_voltage_V", series);
    expect(bench.filteredStd).toBeGreaterThan(0);
    // Raw mean ≈ 100; filtered mean should also be in that range (qualitative check via single-pass)
    // Re-run the engine on the same data and check last filtered value is near mean
    let last = 0;
    for (const z of series) last = engine.fuse(R({ t_ms: 0, gap_voltage_V: z })).gap_voltage_V!.value;
    expect(last).toBeGreaterThan(90);
    expect(last).toBeLessThan(110);
  });

  it("benchmarkChannel returns rawStd = 0 for constant series", () => {
    const engine = new WEDMKalmanFusionEngine();
    const bench = engine.benchmarkChannel("discharge_current_A", [10, 10, 10, 10]);
    expect(bench.rawStd).toBe(0);
    expect(bench.reductionPct).toBe(0);
  });

  it("handles singleton series without error", () => {
    const engine = new WEDMKalmanFusionEngine();
    const bench = engine.benchmarkChannel("flush_pressure_bar", [5]);
    expect(bench.rawStd).toBe(0);
    expect(bench.filteredStd).toBe(0);
  });
});

describe("WEDMKalmanFusionEngine — multi-channel independence", () => {
  it("filters each channel with its own state (cross-contamination check)", () => {
    const engine = new WEDMKalmanFusionEngine();
    // Gap voltage slow drift; wire tension noisy
    const rng = seeded(99);
    for (let i = 0; i < 50; i++) {
      engine.fuse(R({
        t_ms: i * 10,
        gap_voltage_V: 80 + i * 0.1,
        wire_tension_N: 9 + 0.5 * Math.sin(i * 0.3),
      }));
    }
    const snap = engine.snapshot();
    expect(snap.gap_voltage_V!.value).toBeGreaterThan(80);
    expect(snap.gap_voltage_V!.value).toBeLessThan(90);
    expect(Math.abs(snap.wire_tension_N!.value - 9)).toBeLessThan(1);
  });
});
