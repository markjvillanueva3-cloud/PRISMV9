/**
 * ScrewCompressorEngine — Rotary screw compressor analysis
 *
 * Models: Polytropic compression, volumetric efficiency,
 *         specific power, oil injection cooling, capacity control
 * References: Stosic et al., CAGI performance standards
 */

export type CompressorCooling = "oil_injected" | "oil_free" | "water_injected";
export type CapacityControl = "slide_valve" | "vfd" | "load_unload" | "modulating";

export interface ScrewCompressorInput {
  flow_rate_m3_min: number;          // free air delivery (FAD)
  inlet_pressure_bar?: number;       // default 1.013
  discharge_pressure_bar?: number;   // default 8
  inlet_temperature_C?: number;      // default 20
  cooling_type?: CompressorCooling;
  capacity_control?: CapacityControl;
  rotor_diameter_mm?: number;        // default 200
  rotor_speed_rpm?: number;          // default 3000
  polytropic_index?: number;         // default 1.35 (oil-injected ≈ 1.15)
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ScrewCompressorResult {
  pressure_ratio: AtomicValue;
  discharge_temperature_C: AtomicValue;
  isothermal_power_kW: AtomicValue;
  actual_power_kW: AtomicValue;
  specific_power_kW_m3min: AtomicValue;
  volumetric_efficiency_pct: AtomicValue;
  isothermal_efficiency_pct: AtomicValue;
  tip_speed_m_s: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ScrewCompressorEngine {
  calculate(input: ScrewCompressorInput): ScrewCompressorResult {
    const {
      flow_rate_m3_min: Qfad,
      inlet_pressure_bar: P1 = 1.013,
      discharge_pressure_bar: P2 = 8,
      inlet_temperature_C: T1 = 20,
      cooling_type = "oil_injected",
      capacity_control = "load_unload",
      rotor_diameter_mm: D = 200,
      rotor_speed_rpm: N = 3000,
    } = input;

    const recs: string[] = [];

    // Polytropic index depends on cooling
    const n = input.polytropic_index ??
      (cooling_type === "oil_injected" ? 1.15 : cooling_type === "water_injected" ? 1.20 : 1.35);

    const rp = P2 / P1; // pressure ratio
    const T1_K = T1 + 273.15;

    // Discharge temperature (polytropic)
    const T2_K = T1_K * Math.pow(rp, (n - 1) / n);
    const T2_C = T2_K - 273.15;

    // Volumetric efficiency
    const clearance = 0.05; // typical clearance ratio
    const etaVol = (1 - clearance * (Math.pow(rp, 1 / n) - 1)) * 100;

    // Isothermal power: P_iso = P1 × Q × ln(rp)
    const Q_m3s = Qfad / 60;
    const P_iso = P1 * 1e5 * Q_m3s * Math.log(rp) / 1000; // kW

    // Actual (polytropic) power
    const P_act = P1 * 1e5 * Q_m3s * (n / (n - 1)) * (Math.pow(rp, (n - 1) / n) - 1) / 1000;

    // Specific power
    const specificPower = P_act / Math.max(Qfad, 0.001);

    // Isothermal efficiency
    const etaIso = P_iso / Math.max(P_act, 0.001) * 100;

    // Tip speed
    const tipSpeed = Math.PI * (D / 1000) * N / 60;

    // Capacity control efficiency penalty
    const controlFactor = capacity_control === "vfd" ? 1.0 :
      capacity_control === "slide_valve" ? 0.95 :
      capacity_control === "modulating" ? 0.90 : 0.85;

    const isSafe = T2_C < 200 && rp < 15 && tipSpeed < 80;

    if (T2_C > 160) recs.push(`Discharge temp ${T2_C.toFixed(0)}°C — oil degradation risk, check cooling`);
    if (rp > 10) recs.push(`Pressure ratio ${rp.toFixed(1)} — consider two-stage compression`);
    if (specificPower > 8) recs.push(`Specific power ${specificPower.toFixed(1)} kW/(m³/min) — above typical range`);
    if (tipSpeed > 60) recs.push(`Tip speed ${tipSpeed.toFixed(0)} m/s — rotor dynamics concern`);
    if (capacity_control === "load_unload") recs.push(`Load/unload control — VFD saves 15-35% at partial load`);
    if (recs.length === 0) recs.push(`Screw compressor nominal — ${P_act.toFixed(1)}kW, rp=${rp.toFixed(1)}, η_iso=${etaIso.toFixed(0)}%`);

    return {
      pressure_ratio: mkAv(Math.round(rp * 100) / 100, "ratio", rp * 0.02, "P2_P1"),
      discharge_temperature_C: mkAv(Math.round(T2_C), "°C", T2_C * 0.05, "polytropic"),
      isothermal_power_kW: mkAv(Math.round(P_iso * 100) / 100, "kW", P_iso * 0.03, "PVlnR"),
      actual_power_kW: mkAv(Math.round(P_act * 100) / 100, "kW", P_act * 0.08, "polytropic"),
      specific_power_kW_m3min: mkAv(Math.round(specificPower * 100) / 100, "kW/(m³/min)", specificPower * 0.08, "ratio"),
      volumetric_efficiency_pct: mkAv(Math.round(etaVol * 10) / 10, "%", etaVol * 0.05, "clearance"),
      isothermal_efficiency_pct: mkAv(Math.round(etaIso * 10) / 10, "%", etaIso * 0.05, "Piso_Pact"),
      tip_speed_m_s: mkAv(Math.round(tipSpeed * 10) / 10, "m/s", tipSpeed * 0.02, "geometry"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const screwCompressorEngine = new ScrewCompressorEngine();
