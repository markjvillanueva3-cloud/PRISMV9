/**
 * SensorSimulatorEngine — Synthetic sensor data from physics models
 *
 * Generates realistic time-series sensor data for testing adaptive control,
 * SPC monitoring, and anomaly-detection algorithms without requiring live
 * machine connectivity.
 *
 * Physics models:
 *   Force      – Kienzle specific cutting force (kc1.1, mc per material group)
 *   Spindle    – Power-based load % from Kienzle force × cutting speed
 *   Vibration  – Tooth-pass frequency sine + stability-lobe proximity amplitude
 *   Temperature – Jaeger moving heat-source model with first-order thermal lag
 *
 * @version 1.0.0
 * @module SensorSimulatorEngine
 */

// ============================================================================
// Types
// ============================================================================

export type SensorType = "spindle_load" | "vibration" | "force" | "temperature";

export interface SensorSimNominal {
  cutting_speed_mpm?: number;
  feed_mmrev?: number;
  depth_mm?: number;
  width_mm?: number;
  diameter_mm?: number;
  power_max_kw?: number;
}

export interface SensorSimConfig {
  sensor_type: SensorType;
  duration_sec: number;
  sample_rate_hz: number;
  nominal: SensorSimNominal;
  noise_level?: number;          // 0-1, default 0.05
  drift_rate?: number;           // per-second drift factor (tool wear)
  outlier_probability?: number;  // 0-1, default 0.001
  failure_at_sec?: number;       // inject flatline after this time
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface SensorSimStatistics {
  mean: number;
  std: number;
  min: number;
  max: number;
  outlier_count: number;
  failure_injected: boolean;
}

export interface SensorSimResult {
  samples: any[];
  nominal_values: Record<string, number>;
  statistics: SensorSimStatistics;
}

// ============================================================================
// Kienzle material defaults — kc1.1 [N/mm²] and mc exponent
// ============================================================================

interface KienzleParams { kc11: number; mc: number; label: string }

const KIENZLE_DEFAULTS: Record<string, KienzleParams> = {
  steel_low_carbon:    { kc11: 1780, mc: 0.26, label: "C15/1018" },
  steel_medium_carbon: { kc11: 2100, mc: 0.26, label: "C45/1045" },
  steel_alloy:         { kc11: 2500, mc: 0.25, label: "4140/42CrMo4" },
  stainless_austenitic:{ kc11: 2450, mc: 0.21, label: "304/316" },
  cast_iron_grey:      { kc11: 1150, mc: 0.28, label: "GG25/FC250" },
  cast_iron_ductile:   { kc11: 1450, mc: 0.24, label: "GGG40/FCD450" },
  aluminum_wrought:    { kc11:  790, mc: 0.23, label: "6061/7075" },
  aluminum_cast:       { kc11:  650, mc: 0.25, label: "A356/AlSi7Mg" },
  titanium:            { kc11: 2800, mc: 0.28, label: "Ti-6Al-4V" },
  inconel:             { kc11: 2800, mc: 0.28, label: "IN718" },
  copper:              { kc11:  780, mc: 0.22, label: "Cu/CuZn39Pb3" },
  tool_steel:          { kc11: 2800, mc: 0.27, label: "H13/D2" },
};

const DEFAULT_MATERIAL = KIENZLE_DEFAULTS.steel_medium_carbon;

// ============================================================================
// Thermal material defaults for Jaeger model
// ============================================================================

interface ThermalProps { k_wm: number; alpha_m2s: number; label: string }

const THERMAL_DEFAULTS: ThermalProps = {
  k_wm: 50,           // thermal conductivity W/(m·K) — steel
  alpha_m2s: 1.2e-5,  // thermal diffusivity m²/s — steel
  label: "generic steel",
};

// ============================================================================
// Helpers
// ============================================================================

function gaussRandom(): number {
  // Box-Muller transform
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

// ============================================================================
// Engine
// ============================================================================

export class SensorSimulatorEngine {

  /**
   * Generate synthetic sensor data from physics models.
   */
  simulate(config: SensorSimConfig): AtomicValue & { result: SensorSimResult } {
    const {
      sensor_type,
      duration_sec,
      sample_rate_hz,
      nominal,
      noise_level = 0.05,
      drift_rate = 0,
      outlier_probability = 0.001,
      failure_at_sec,
    } = config;

    const n = Math.round(duration_sec * sample_rate_hz);
    if (n < 1 || n > 1e7) {
      throw new Error(`Sample count ${n} out of range [1, 10 000 000]`);
    }

    const dt = 1 / sample_rate_hz;
    const samples: any[] = [];
    let sum = 0, sumSq = 0, minVal = Infinity, maxVal = -Infinity;
    let outlierCount = 0;
    const failureInjected = failure_at_sec != null && failure_at_sec < duration_sec;

    // Pre-compute physics baseline per sensor type
    const baseline = this._computeBaseline(sensor_type, nominal);
    const nominalValues: Record<string, number> = { ...baseline.nominals };

    for (let i = 0; i < n; i++) {
      const t = i * dt;

      // Drift: linear increase simulating progressive tool wear
      const driftFactor = 1 + drift_rate * t;

      // Base physics value
      let value = baseline.fn(t, i) * driftFactor;

      // Gaussian noise
      value += value * noise_level * gaussRandom();

      // Outlier injection
      if (Math.random() < outlier_probability) {
        const spike = (2 + 3 * Math.random()) * (Math.random() > 0.5 ? 1 : -1);
        value += Math.abs(baseline.nominal) * spike;
        outlierCount++;
      }

      // Failure injection: flatline at last valid reading
      if (failureInjected && t >= failure_at_sec!) {
        value = samples.length > 0 ? samples[samples.length - 1].value : 0;
      }

      // Clamp negative for sensors that can't go negative
      if (sensor_type === "spindle_load" || sensor_type === "temperature") {
        value = Math.max(0, value);
      }

      samples.push({ t: Math.round(t * 1e6) / 1e6, value: Math.round(value * 1e4) / 1e4 });

      sum += value;
      sumSq += value * value;
      if (value < minVal) minVal = value;
      if (value > maxVal) maxVal = value;
    }

    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    const std = Math.sqrt(Math.max(0, variance));

    const statistics: SensorSimStatistics = {
      mean: Math.round(mean * 1e4) / 1e4,
      std: Math.round(std * 1e4) / 1e4,
      min: Math.round(minVal * 1e4) / 1e4,
      max: Math.round(maxVal * 1e4) / 1e4,
      outlier_count: outlierCount,
      failure_injected: failureInjected,
    };

    const result: SensorSimResult = { samples, nominal_values: nominalValues, statistics };

    return {
      value: statistics.mean,
      unit: baseline.unit,
      uncertainty: statistics.std,
      source: `SensorSimulatorEngine.${sensor_type}`,
      warning: failureInjected ? `Sensor failure injected at t=${failure_at_sec}s` : undefined,
      result,
    };
  }

  // --------------------------------------------------------------------------
  // Physics baselines
  // --------------------------------------------------------------------------

  private _computeBaseline(
    type: SensorType,
    nom: SensorSimNominal,
  ): { fn: (t: number, i: number) => number; nominal: number; unit: string; nominals: Record<string, number> } {

    const vc = nom.cutting_speed_mpm ?? 200;   // m/min
    const fz = nom.feed_mmrev ?? 0.15;         // mm/rev (≈ per tooth for single insert)
    const ap = nom.depth_mm ?? 2;              // mm
    const ae = nom.width_mm ?? ap;             // mm
    const dia = nom.diameter_mm ?? 20;         // mm
    const pMax = nom.power_max_kw ?? 15;       // kW
    const mat = DEFAULT_MATERIAL;

    // RPM from cutting speed
    const rpm = (vc * 1000) / (Math.PI * dia);
    const teeth = Math.max(1, Math.round(dia <= 6 ? 2 : dia <= 16 ? 3 : 4));

    switch (type) {
      // ---- FORCE (Kienzle) ----
      case "force": {
        // Fc = kc1.1 * ap * fz^(1-mc)   [N]
        const Fc = mat.kc11 * ap * Math.pow(fz, 1 - mat.mc);
        return {
          fn: () => Fc,
          nominal: Fc,
          unit: "N",
          nominals: { Fc_N: r4(Fc), kc11: mat.kc11, mc: mat.mc, ap_mm: ap, fz_mm: fz },
        };
      }

      // ---- SPINDLE LOAD ----
      case "spindle_load": {
        const Fc = mat.kc11 * ap * Math.pow(fz, 1 - mat.mc);
        const Pc = (Fc * vc) / 60000;  // kW
        const loadPct = clamp((Pc / pMax) * 100, 0, 150);
        return {
          fn: () => loadPct,
          nominal: loadPct,
          unit: "%",
          nominals: { load_pct: r4(loadPct), Pc_kW: r4(Pc), P_max_kW: pMax, Fc_N: r4(Fc) },
        };
      }

      // ---- VIBRATION ----
      case "vibration": {
        // Tooth-pass frequency
        const fTooth = (rpm * teeth) / 60;  // Hz
        // Base amplitude: simplified stability lobe proximity (0.5-5 m/s²)
        const baseAmp = 0.5 + 4.5 * (0.3 + 0.2 * Math.sin(rpm / 800));
        // Acceleration = amplitude × (2πf)²  scaled to reasonable range
        const omega = 2 * Math.PI * fTooth;
        const peakAccel = baseAmp * (omega * omega) / (omega * omega + 1e6); // normalised

        return {
          fn: (t: number) => {
            // Dominant tooth-pass sine + half-harmonic
            return peakAccel * (
              Math.sin(2 * Math.PI * fTooth * t) +
              0.3 * Math.sin(2 * Math.PI * 2 * fTooth * t + 0.7) +
              0.1 * Math.sin(2 * Math.PI * 0.5 * fTooth * t + 1.2)
            );
          },
          nominal: peakAccel,
          unit: "m/s²",
          nominals: {
            peak_accel_ms2: r4(peakAccel), f_tooth_Hz: r4(fTooth),
            rpm: r4(rpm), teeth, base_amplitude: r4(baseAmp),
          },
        };
      }

      // ---- TEMPERATURE (Jaeger) ----
      case "temperature": {
        const Fc = mat.kc11 * ap * Math.pow(fz, 1 - mat.mc);
        const Pc = (Fc * vc) / 60000; // kW → W
        const PcW = Pc * 1000;
        const contactLen = fz;         // approximate contact length mm
        const contactArea = ap * contactLen * 1e-6; // m²
        const heatFlux = contactArea > 0 ? (PcW * 0.7) / contactArea : 0; // 70% to workpiece

        const { k_wm, alpha_m2s } = THERMAL_DEFAULTS;
        const tau = 3; // thermal lag time constant [s]

        // Jaeger steady-state rise: T = q * sqrt(4*alpha*t_contact) / (k*sqrt(pi))
        // t_contact ≈ contactLen / Vc
        const tContact = (contactLen * 1e-3) / (vc / 60);
        const T_jaeger = (heatFlux * Math.sqrt(4 * alpha_m2s * tContact)) / (k_wm * Math.sqrt(Math.PI));
        const T_steady = clamp(T_jaeger, 5, 800);
        const T_ambient = 25;

        return {
          fn: (t: number) => {
            // First-order lag: T(t) = T_ambient + T_steady * (1 - e^(-t/tau))
            return T_ambient + T_steady * (1 - Math.exp(-t / tau));
          },
          nominal: T_steady + T_ambient,
          unit: "°C",
          nominals: {
            T_steady_C: r4(T_steady), T_ambient_C: T_ambient,
            heat_flux_Wm2: r4(heatFlux), tau_s: tau, Pc_W: r4(PcW),
          },
        };
      }

      default:
        throw new Error(`Unknown sensor type: ${type}`);
    }
  }
}

// Round to 4 decimal places
function r4(v: number): number { return Math.round(v * 1e4) / 1e4; }

// ============================================================================
// Singleton export
// ============================================================================

export const sensorSimulatorEngine = new SensorSimulatorEngine();
