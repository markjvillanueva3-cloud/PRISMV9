/**
 * WEDMKalmanFusionEngine — WEDM AGI Phase 1 / U-P1-02
 *
 * Fuses noisy Wire-EDM sensor streams into smoothed estimates using scalar
 * Kalman filters, one per channel. Distinct from SensorFusionEngine (which
 * is a 5-state EKF for milling force/spindle/vibration/temp). This engine
 * targets WEDM-specific channels (gap voltage, discharge current, wire
 * tension, flush, bath temp, spark freq, servo voltage) whose dynamics and
 * measurement-noise priors come from StochasticEDMEngine CVs.
 *
 * Each channel is modelled as a 1-D random-walk process:
 *     x_k   = x_{k-1} + w,    w ~ N(0, Q)
 *     z_k   = x_k + v,        v ~ N(0, R)
 * with the standard scalar Kalman update.
 *
 * Exit gate (P1-MS1): filtered σ must be ≤50% of raw σ on synthetic noise.
 *
 * Actions: wedm_fuse_sensors, wedm_fuse_reset
 *
 * @see StochasticEDMEngine  – noise-CV priors
 * @see WEDMMachineStateEngine – source of WEDMSensorReading
 */

import type { WEDMSensorReading } from "./WEDMMachineStateEngine.js";

// ────────────────────────── Types ──────────────────────────

/** Per-channel noise priors. q = process variance, r = measurement variance. */
export interface ChannelNoise {
  q: number;
  r: number;
}

export interface FusedChannel {
  value: number;
  variance: number; // P — uncertainty of the filtered estimate
  innovation: number; // z - x_predict (for anomaly detection)
  gain: number; // Kalman K applied at this step
  measurements: number;
}

export interface WEDMFusedState {
  t_ms: number;
  gap_voltage_V: FusedChannel | null;
  discharge_current_A: FusedChannel | null;
  wire_tension_N: FusedChannel | null;
  flush_pressure_bar: FusedChannel | null;
  bath_temperature_C: FusedChannel | null;
  spark_frequency_Hz: FusedChannel | null;
  servo_voltage_V: FusedChannel | null;
}

type ChannelKey =
  | "gap_voltage_V"
  | "discharge_current_A"
  | "wire_tension_N"
  | "flush_pressure_bar"
  | "bath_temperature_C"
  | "spark_frequency_Hz"
  | "servo_voltage_V";

const CHANNEL_KEYS: ChannelKey[] = [
  "gap_voltage_V",
  "discharge_current_A",
  "wire_tension_N",
  "flush_pressure_bar",
  "bath_temperature_C",
  "spark_frequency_Hz",
  "servo_voltage_V",
];

/** Canonical priors derived from StochasticEDMEngine CVs translated into
 *  variance at nominal operating points. */
const DEFAULT_NOISE: Record<ChannelKey, ChannelNoise> = {
  gap_voltage_V: { q: 0.25, r: 25 }, // σ ≈ 5V
  discharge_current_A: { q: 0.01, r: 1.0 }, // σ ≈ 1A
  wire_tension_N: { q: 0.005, r: 0.25 }, // σ ≈ 0.5N
  flush_pressure_bar: { q: 0.001, r: 0.04 }, // σ ≈ 0.2bar
  bath_temperature_C: { q: 0.0001, r: 0.04 }, // σ ≈ 0.2°C (slow drift)
  spark_frequency_Hz: { q: 50, r: 2500 }, // σ ≈ 50Hz
  servo_voltage_V: { q: 0.25, r: 25 },
};

// ────────────────────────── Filter ──────────────────────────

interface KalmanState {
  x: number;
  P: number;
  count: number;
}

class ScalarKalman {
  private state: KalmanState | null = null;
  constructor(private noise: ChannelNoise) {}

  setNoise(n: Partial<ChannelNoise>): void {
    this.noise = { ...this.noise, ...n };
  }

  update(z: number): FusedChannel {
    if (this.state === null) {
      this.state = { x: z, P: this.noise.r, count: 1 };
      return {
        value: z,
        variance: this.noise.r,
        innovation: 0,
        gain: 1,
        measurements: 1,
      };
    }
    const { q, r } = this.noise;
    const xPred = this.state.x; // random-walk prediction
    const PPred = this.state.P + q;
    const innovation = z - xPred;
    const K = PPred / (PPred + r);
    const xNew = xPred + K * innovation;
    const PNew = (1 - K) * PPred;
    this.state = { x: xNew, P: PNew, count: this.state.count + 1 };
    return { value: xNew, variance: PNew, innovation, gain: K, measurements: this.state.count };
  }

  get(): FusedChannel | null {
    if (!this.state) return null;
    return {
      value: this.state.x,
      variance: this.state.P,
      innovation: 0,
      gain: 0,
      measurements: this.state.count,
    };
  }

  reset(): void {
    this.state = null;
  }
}

// ────────────────────────── Engine ──────────────────────────

export class WEDMKalmanFusionEngine {
  private filters: Record<ChannelKey, ScalarKalman>;
  private lastT: number | null = null;

  constructor(noiseOverrides: Partial<Record<ChannelKey, ChannelNoise>> = {}) {
    const filters: Record<string, ScalarKalman> = {};
    for (const k of CHANNEL_KEYS) {
      filters[k] = new ScalarKalman({ ...DEFAULT_NOISE[k], ...noiseOverrides[k] });
    }
    this.filters = filters as Record<ChannelKey, ScalarKalman>;
  }

  /** Ingest a noisy sensor reading and return the fused estimates. */
  fuse(reading: WEDMSensorReading): WEDMFusedState {
    const out: WEDMFusedState = {
      t_ms: reading.t_ms,
      gap_voltage_V: null,
      discharge_current_A: null,
      wire_tension_N: null,
      flush_pressure_bar: null,
      bath_temperature_C: null,
      spark_frequency_Hz: null,
      servo_voltage_V: null,
    };
    for (const k of CHANNEL_KEYS) {
      const z = reading[k];
      if (z === undefined || !Number.isFinite(z)) {
        out[k] = this.filters[k].get();
        continue;
      }
      out[k] = this.filters[k].update(z);
    }
    this.lastT = reading.t_ms;
    return out;
  }

  snapshot(): WEDMFusedState {
    return {
      t_ms: this.lastT ?? 0,
      gap_voltage_V: this.filters.gap_voltage_V.get(),
      discharge_current_A: this.filters.discharge_current_A.get(),
      wire_tension_N: this.filters.wire_tension_N.get(),
      flush_pressure_bar: this.filters.flush_pressure_bar.get(),
      bath_temperature_C: this.filters.bath_temperature_C.get(),
      spark_frequency_Hz: this.filters.spark_frequency_Hz.get(),
      servo_voltage_V: this.filters.servo_voltage_V.get(),
    };
  }

  tune(channel: ChannelKey, noise: Partial<ChannelNoise>): void {
    this.filters[channel].setNoise(noise);
  }

  reset(): void {
    for (const k of CHANNEL_KEYS) this.filters[k].reset();
    this.lastT = null;
  }

  /** Benchmark: filter a precomputed series and report σ reduction. */
  benchmarkChannel(
    channel: ChannelKey,
    measurements: number[],
    noiseOverride?: Partial<ChannelNoise>,
  ): { rawStd: number; filteredStd: number; reductionPct: number } {
    const filter = new ScalarKalman({ ...DEFAULT_NOISE[channel], ...noiseOverride });
    const filtered: number[] = [];
    for (const z of measurements) filtered.push(filter.update(z).value);
    const rawStd = std(measurements);
    const filteredStd = std(filtered);
    const reductionPct = rawStd > 0 ? (1 - filteredStd / rawStd) * 100 : 0;
    return { rawStd, filteredStd, reductionPct };
  }
}

// ────────────────────────── Helpers ──────────────────────────

function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

export const wedmKalmanFusionEngine = new WEDMKalmanFusionEngine();
