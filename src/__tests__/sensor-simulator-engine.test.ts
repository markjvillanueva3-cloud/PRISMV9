/**
 * Tests for SensorSimulatorEngine — SCI-MS0 U02
 * Physics-based synthetic sensor generation: Kienzle, Jaeger, stability lobes
 */
import { describe, it, expect } from "vitest";
import { SensorSimulatorEngine } from "../engines/SensorSimulatorEngine.js";

describe("SensorSimulatorEngine", () => {
  const engine = new SensorSimulatorEngine();

  // ── Force simulation (Kienzle) ────────────────────────────

  describe("force simulation", () => {
    it("generates correct number of samples", () => {
      const result = engine.simulate({
        sensor_type: "force",
        duration_sec: 1,
        sample_rate_hz: 100,
        nominal: { cutting_speed_mpm: 200, feed_mmrev: 0.15, depth_mm: 2, diameter_mm: 20 },
        noise_level: 0,
      });
      expect(result.result.samples.length).toBe(100);
      expect(result.unit).toBe("N");
      expect(result.source).toContain("force");
    });

    it("Kienzle force is physically reasonable for steel", () => {
      const result = engine.simulate({
        sensor_type: "force",
        duration_sec: 0.5,
        sample_rate_hz: 100,
        nominal: { cutting_speed_mpm: 200, feed_mmrev: 0.15, depth_mm: 2, diameter_mm: 20 },
        noise_level: 0,
      });
      // Fc = kc11 * ap * fz^(1-mc) = 2100 * 2 * 0.15^0.74 ≈ 930 N
      const Fc = result.result.samples[0].value;
      expect(Fc).toBeGreaterThan(500);
      expect(Fc).toBeLessThan(2000);
    });

    it("nominal values include Kienzle parameters", () => {
      const result = engine.simulate({
        sensor_type: "force",
        duration_sec: 0.1,
        sample_rate_hz: 10,
        nominal: { feed_mmrev: 0.2, depth_mm: 3 },
        noise_level: 0,
      });
      expect(result.result.nominal_values.kc11).toBe(2100);
      expect(result.result.nominal_values.mc).toBe(0.26);
      expect(result.result.nominal_values.ap_mm).toBe(3);
      expect(result.result.nominal_values.fz_mm).toBe(0.2);
    });
  });

  // ── Spindle load simulation ───────────────────────────────

  describe("spindle load simulation", () => {
    it("produces load percentage 0-150%", () => {
      const result = engine.simulate({
        sensor_type: "spindle_load",
        duration_sec: 1,
        sample_rate_hz: 100,
        nominal: { cutting_speed_mpm: 200, feed_mmrev: 0.15, depth_mm: 2, power_max_kw: 15 },
        noise_level: 0,
      });
      expect(result.unit).toBe("%");
      for (const s of result.result.samples) {
        expect(s.value).toBeGreaterThanOrEqual(0);
        expect(s.value).toBeLessThanOrEqual(200); // with noise margin
      }
    });

    it("load increases with deeper cut", () => {
      const light = engine.simulate({
        sensor_type: "spindle_load", duration_sec: 0.1, sample_rate_hz: 10,
        nominal: { depth_mm: 1, power_max_kw: 15 }, noise_level: 0,
      });
      const heavy = engine.simulate({
        sensor_type: "spindle_load", duration_sec: 0.1, sample_rate_hz: 10,
        nominal: { depth_mm: 5, power_max_kw: 15 }, noise_level: 0,
      });
      expect(heavy.result.samples[0].value).toBeGreaterThan(light.result.samples[0].value);
    });
  });

  // ── Vibration simulation ──────────────────────────────────

  describe("vibration simulation", () => {
    it("produces oscillating signal", () => {
      const result = engine.simulate({
        sensor_type: "vibration",
        duration_sec: 0.1,
        sample_rate_hz: 1000,
        nominal: { cutting_speed_mpm: 200, diameter_mm: 20 },
        noise_level: 0,
      });
      expect(result.unit).toBe("m/s²");
      // Signal should cross zero (oscillating)
      const values = result.result.samples.map((s: any) => s.value);
      const hasPositive = values.some((v: number) => v > 0);
      const hasNegative = values.some((v: number) => v < 0);
      expect(hasPositive).toBe(true);
      expect(hasNegative).toBe(true);
    });

    it("includes tooth-passing frequency in nominals", () => {
      const result = engine.simulate({
        sensor_type: "vibration", duration_sec: 0.01, sample_rate_hz: 100,
        nominal: { diameter_mm: 20, cutting_speed_mpm: 200 }, noise_level: 0,
      });
      expect(result.result.nominal_values.f_tooth_Hz).toBeGreaterThan(0);
      expect(result.result.nominal_values.teeth).toBeGreaterThanOrEqual(2);
    });
  });

  // ── Temperature simulation (Jaeger) ───────────────────────

  describe("temperature simulation", () => {
    it("shows thermal lag (exponential rise)", () => {
      const result = engine.simulate({
        sensor_type: "temperature",
        duration_sec: 10,
        sample_rate_hz: 10,
        nominal: { cutting_speed_mpm: 200, feed_mmrev: 0.15, depth_mm: 2 },
        noise_level: 0,
      });
      expect(result.unit).toBe("°C");
      const values = result.result.samples.map((s: any) => s.value);
      // Temperature should start near ambient (25) and rise
      expect(values[0]).toBeGreaterThanOrEqual(25);
      expect(values[0]).toBeLessThan(30); // near ambient at t≈0
      // Final temp should be higher than initial
      expect(values[values.length - 1]).toBeGreaterThan(values[0]);
    });

    it("Jaeger model produces physical temperatures", () => {
      const result = engine.simulate({
        sensor_type: "temperature", duration_sec: 5, sample_rate_hz: 10,
        nominal: { cutting_speed_mpm: 200, depth_mm: 2 }, noise_level: 0,
      });
      // Temperatures should be reasonable (25-800°C range)
      for (const s of result.result.samples) {
        expect(s.value).toBeGreaterThanOrEqual(0);
        expect(s.value).toBeLessThan(1000);
      }
    });
  });

  // ── Noise and perturbation features ───────────────────────

  describe("noise features", () => {
    it("noise_level adds variance", () => {
      const clean = engine.simulate({
        sensor_type: "force", duration_sec: 1, sample_rate_hz: 100,
        nominal: { depth_mm: 2 }, noise_level: 0, outlier_probability: 0,
      });
      const noisy = engine.simulate({
        sensor_type: "force", duration_sec: 1, sample_rate_hz: 100,
        nominal: { depth_mm: 2 }, noise_level: 0.1, outlier_probability: 0,
      });
      expect(noisy.result.statistics.std).toBeGreaterThan(clean.result.statistics.std);
    });

    it("drift_rate causes increasing trend", () => {
      const result = engine.simulate({
        sensor_type: "force", duration_sec: 5, sample_rate_hz: 10,
        nominal: { depth_mm: 2 }, noise_level: 0, drift_rate: 0.1,
      });
      const values = result.result.samples.map((s: any) => s.value);
      // Last values should be ~50% higher than first (5s * 0.1/s)
      expect(values[values.length - 1]).toBeGreaterThan(values[0] * 1.3);
    });

    it("failure_at_sec causes flatline", () => {
      const result = engine.simulate({
        sensor_type: "spindle_load", duration_sec: 2, sample_rate_hz: 100,
        nominal: { depth_mm: 2 }, noise_level: 0, failure_at_sec: 1,
      });
      expect(result.result.statistics.failure_injected).toBe(true);
      expect(result.warning).toContain("failure");
      // After 1s (sample 100+), values should be constant
      const postFailure = result.result.samples.slice(101);
      if (postFailure.length > 1) {
        const firstPost = postFailure[0].value;
        for (const s of postFailure) {
          expect(s.value).toBe(firstPost);
        }
      }
    });

    it("statistics are computed correctly", () => {
      const result = engine.simulate({
        sensor_type: "force", duration_sec: 1, sample_rate_hz: 100,
        nominal: { depth_mm: 2 }, noise_level: 0,
      });
      expect(result.result.statistics.mean).toBeGreaterThan(0);
      expect(result.result.statistics.min).toBeLessThanOrEqual(result.result.statistics.mean);
      expect(result.result.statistics.max).toBeGreaterThanOrEqual(result.result.statistics.mean);
    });
  });

  // ── Edge cases ────────────────────────────────────────────

  describe("edge cases", () => {
    it("throws on excessive sample count", () => {
      expect(() => engine.simulate({
        sensor_type: "force", duration_sec: 100, sample_rate_hz: 1e6,
        nominal: {}, noise_level: 0,
      })).toThrow("out of range");
    });

    it("throws on zero duration", () => {
      expect(() => engine.simulate({
        sensor_type: "force", duration_sec: 0, sample_rate_hz: 100,
        nominal: {}, noise_level: 0,
      })).toThrow("out of range");
    });

    it("throws on unknown sensor type", () => {
      expect(() => engine.simulate({
        sensor_type: "unknown" as any, duration_sec: 1, sample_rate_hz: 10,
        nominal: {}, noise_level: 0,
      })).toThrow("Unknown sensor type");
    });

    it("uses defaults for all unspecified nominals", () => {
      const result = engine.simulate({
        sensor_type: "force", duration_sec: 0.1, sample_rate_hz: 10,
        nominal: {},
      });
      expect(result.result.samples.length).toBe(1);
      expect(result.result.samples[0].value).toBeGreaterThan(0);
    });
  });
});
