/**
 * Tests for SpindleSpeedVariationEngine
 */
import { describe, it, expect } from "vitest";
import {
  SpindleSpeedVariationEngine,
} from "../engines/SpindleSpeedVariationEngine.js";

describe("SpindleSpeedVariationEngine", () => {
  const engine = new SpindleSpeedVariationEngine();

  it("calculates SSV for 4-flute at 8000 RPM", () => {
    const r = engine.calculate({
      nominal_rpm: 8000,
      num_flutes: 4,
    });
    expect(r.nominal_rpm.value).toBe(8000);
    expect(r.rpm_min.value).toBeLessThan(8000);
    expect(r.rpm_max.value).toBeGreaterThan(8000);
    expect(r.variation_amplitude.value).toBe(10);
    expect(r.tooth_passing_freq.value).toBeGreaterThan(0);
    expect(r.frequency_spread.value).toBeGreaterThan(0);
    expect(r.chatter_suppression_index.value).toBeGreaterThan(0);
  });

  it("RPM range symmetric around nominal", () => {
    const r = engine.calculate({
      nominal_rpm: 6000,
      num_flutes: 3,
      variation_amplitude_pct: 10,
    });
    expect(r.rpm_min.value).toBe(5400);
    expect(r.rpm_max.value).toBe(6600);
  });

  it("larger amplitude = wider RPM range", () => {
    const small = engine.calculate({
      nominal_rpm: 8000,
      num_flutes: 4,
      variation_amplitude_pct: 5,
    });
    const large = engine.calculate({
      nominal_rpm: 8000,
      num_flutes: 4,
      variation_amplitude_pct: 15,
    });
    const smallRange = small.rpm_max.value - small.rpm_min.value;
    const largeRange = large.rpm_max.value - large.rpm_min.value;
    expect(largeRange).toBeGreaterThan(smallRange);
  });

  it("larger amplitude = higher suppression index", () => {
    const small = engine.calculate({
      nominal_rpm: 8000,
      num_flutes: 4,
      variation_amplitude_pct: 5,
    });
    const large = engine.calculate({
      nominal_rpm: 8000,
      num_flutes: 4,
      variation_amplitude_pct: 15,
    });
    expect(large.chatter_suppression_index.value).toBeGreaterThan(
      small.chatter_suppression_index.value
    );
  });

  it("tooth passing frequency = N×z/60", () => {
    const r = engine.calculate({
      nominal_rpm: 6000,
      num_flutes: 4,
    });
    // 6000 × 4 / 60 = 400 Hz
    expect(r.tooth_passing_freq.value).toBeCloseTo(400, 0);
  });

  it("frequency spread proportional to amplitude", () => {
    const r = engine.calculate({
      nominal_rpm: 6000,
      num_flutes: 4,
      variation_amplitude_pct: 10,
    });
    // TPF range: (6600×4/60) - (5400×4/60) = 440-360 = 80 Hz
    expect(r.frequency_spread.value).toBeCloseTo(80, 0);
  });

  it("warns on low amplitude", () => {
    const r = engine.calculate({
      nominal_rpm: 8000,
      num_flutes: 4,
      variation_amplitude_pct: 2,
    });
    expect(
      r.warnings.some(w => w.includes("insufficient"))
    ).toBe(true);
  });

  it("warns on high amplitude", () => {
    const r = engine.calculate({
      nominal_rpm: 8000,
      num_flutes: 4,
      variation_amplitude_pct: 25,
    });
    expect(
      r.warnings.some(w => w.includes("thermal"))
    ).toBe(true);
  });

  it("warns when TPF near natural frequency", () => {
    const r = engine.calculate({
      nominal_rpm: 12000,
      num_flutes: 4,
      natural_frequency_hz: 800,
    });
    // TPF = 12000 × 4 / 60 = 800 Hz = fn
    expect(
      r.warnings.some(w => w.includes("natural frequency"))
    ).toBe(true);
  });

  it("waveform is sinusoidal", () => {
    const r = engine.calculate({
      nominal_rpm: 8000,
      num_flutes: 4,
    });
    expect(r.waveform).toBe("sinusoidal");
  });

  // ── AtomicValue Format ────────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      nominal_rpm: 8000,
      num_flutes: 4,
    });
    for (const key of [
      "nominal_rpm", "rpm_min", "rpm_max",
      "variation_amplitude", "tooth_passing_freq",
      "frequency_spread", "chatter_suppression_index",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { spindleSpeedVariationEngine } = await import(
      "../engines/SpindleSpeedVariationEngine.js"
    );
    expect(spindleSpeedVariationEngine).toBeInstanceOf(
      SpindleSpeedVariationEngine
    );
  });
});
