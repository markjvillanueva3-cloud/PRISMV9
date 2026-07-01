/**
 * ReciprocatingCompressorEngine — Reciprocating (piston) compressor analysis
 *
 * Models: Polytropic compression, volumetric efficiency with re-expansion,
 *         rod load, valve losses, multi-stage intercooling
 * References: CAGI, API 618, Hanlon's Compressor Handbook
 */

export type CompressorAction = "single_acting" | "double_acting";
export type ValveType = "plate" | "ring" | "poppet" | "channel";

export interface ReciprocatingCompressorInput {
  bore_mm: number;
  stroke_mm: number;
  speed_rpm: number;
  inlet_pressure_bar?: number;       // default 1.013
  discharge_pressure_bar?: number;   // default 8
  inlet_temperature_C?: number;      // default 25
  clearance_pct?: number;            // volumetric clearance %, default 8
  num_stages?: number;               // default 1 (auto-calc per stage)
  action?: CompressorAction;
  polytropic_index?: number;         // default 1.3
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ReciprocatingCompressorResult {
  swept_volume_L: AtomicValue;
  volumetric_efficiency_pct: AtomicValue;
  actual_flow_m3_min: AtomicValue;
  stage_pressure_ratio: AtomicValue;
  discharge_temperature_C: AtomicValue;
  indicated_power_kW: AtomicValue;
  rod_load_kN: AtomicValue;
  mean_piston_speed_m_s: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ReciprocatingCompressorEngine {
  calculate(input: ReciprocatingCompressorInput): ReciprocatingCompressorResult {
    const {
      bore_mm,
      stroke_mm,
      speed_rpm: N,
      inlet_pressure_bar: P1 = 1.013,
      discharge_pressure_bar: P2 = 8,
      inlet_temperature_C: T1 = 25,
      clearance_pct: cl = 8,
      num_stages = 1,
      action = "single_acting",
      polytropic_index: n = 1.3,
    } = input;

    const recs: string[] = [];

    // Per-stage pressure ratio (equal ratio staging)
    const rp_total = P2 / P1;
    const rp_stage = Math.pow(rp_total, 1 / num_stages);

    // Swept volume
    const bore_m = bore_mm / 1000;
    const stroke_m = stroke_mm / 1000;
    const Vs = Math.PI / 4 * bore_m * bore_m * stroke_m; // m³ per revolution
    const sides = action === "double_acting" ? 2 : 1;
    const Vs_L = Vs * sides * 1000; // liters

    // Volumetric efficiency (with re-expansion)
    const c = cl / 100;
    const etaVol = (1 - c * (Math.pow(rp_stage, 1 / n) - 1)) * 100;

    // Actual flow (FAD)
    const Qact = Vs * sides * N * (etaVol / 100) * 60; // m³/min at inlet

    // Discharge temperature (first stage)
    const T1_K = T1 + 273.15;
    const T2_K = T1_K * Math.pow(rp_stage, (n - 1) / n);
    const T2_C = T2_K - 273.15;

    // Indicated power per stage
    const Q_m3s = Qact / 60;
    const W_stage = P1 * 1e5 * Q_m3s * (n / (n - 1)) * (Math.pow(rp_stage, (n - 1) / n) - 1) / 1000;
    const W_total = W_stage * num_stages;

    // Rod load (compression force)
    const area_m2 = Math.PI / 4 * bore_m * bore_m;
    const rodLoad = (P2 * 1e5 - P1 * 1e5) * area_m2 / 1000; // kN

    // Mean piston speed
    const mps = 2 * stroke_m * N / 60;

    const isSafe = T2_C < 200 && mps < 6 && etaVol > 40 && rp_stage < 6;

    if (rp_stage > 4) recs.push(`Stage ratio ${rp_stage.toFixed(1)} > 4 — add stages for efficiency`);
    if (T2_C > 150) recs.push(`Discharge temp ${T2_C.toFixed(0)}°C — valve/ring concern, add intercooler`);
    if (mps > 5) recs.push(`Piston speed ${mps.toFixed(1)} m/s — valve flutter risk, reduce RPM`);
    if (etaVol < 60) recs.push(`Low volumetric efficiency ${etaVol.toFixed(0)}% — reduce clearance or add stages`);
    if (num_stages === 1 && rp_total > 6) recs.push(`Single stage at ratio ${rp_total.toFixed(1)} — multi-stage recommended`);
    if (recs.length === 0) recs.push(`Recip compressor nominal — ${W_total.toFixed(1)}kW, η_vol=${etaVol.toFixed(0)}%, MPS=${mps.toFixed(1)}m/s`);

    return {
      swept_volume_L: mkAv(Math.round(Vs_L * 1000) / 1000, "L", Vs_L * 0.02, "bore_stroke"),
      volumetric_efficiency_pct: mkAv(Math.round(etaVol * 10) / 10, "%", etaVol * 0.05, "re_expansion"),
      actual_flow_m3_min: mkAv(Math.round(Qact * 1000) / 1000, "m³/min", Qact * 0.05, "swept_etavol"),
      stage_pressure_ratio: mkAv(Math.round(rp_stage * 100) / 100, "ratio", rp_stage * 0.02, "equal_ratio"),
      discharge_temperature_C: mkAv(Math.round(T2_C), "°C", T2_C * 0.05, "polytropic"),
      indicated_power_kW: mkAv(Math.round(W_total * 100) / 100, "kW", W_total * 0.08, "polytropic"),
      rod_load_kN: mkAv(Math.round(rodLoad * 100) / 100, "kN", rodLoad * 0.05, "pressure_area"),
      mean_piston_speed_m_s: mkAv(Math.round(mps * 100) / 100, "m/s", mps * 0.02, "stroke_rpm"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const reciprocatingCompressorEngine = new ReciprocatingCompressorEngine();
