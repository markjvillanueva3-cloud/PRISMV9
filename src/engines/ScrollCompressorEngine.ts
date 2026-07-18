/**
 * ScrollCompressorEngine — Scroll compressor design & performance
 *
 * Models: Involute scroll geometry, built-in volume ratio,
 *         isentropic efficiency, capacity modulation
 * References: Copeland, Emerson Climate Technologies
 */

export type RefrigerantType = "R410A" | "R134a" | "R32" | "R290" | "R744" | "air";

export interface ScrollCompressorInput {
  suction_pressure_bar: number;
  discharge_pressure_bar: number;
  displacement_cc: number;            // per revolution
  speed_rpm?: number;                 // default 3500
  refrigerant?: RefrigerantType;      // default R410A
  motor_efficiency?: number;          // default 0.90
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ScrollCompressorResult {
  pressure_ratio: AtomicValue;
  volume_ratio: AtomicValue;
  mass_flow_kg_h: AtomicValue;
  isentropic_efficiency: AtomicValue;
  shaft_power_kW: AtomicValue;
  discharge_temp_C: AtomicValue;
  cooling_capacity_kW: AtomicValue;
  cop: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Simplified refrigerant properties: [gamma, rho_suction kg/m³, latent kJ/kg, Cp kJ/kgK]
const REF_PROPS: Record<RefrigerantType, [number, number, number, number]> = {
  "R410A": [1.18, 18.5, 220, 0.84],
  "R134a": [1.10, 5.3, 200, 0.85],
  "R32":   [1.20, 12.0, 310, 0.82],
  "R290":  [1.13, 10.5, 370, 1.67],
  "R744":  [1.30, 95.0, 230, 0.85],
  "air":   [1.40, 1.2, 0, 1.005],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ScrollCompressorEngine {
  calculate(input: ScrollCompressorInput): ScrollCompressorResult {
    const {
      suction_pressure_bar: Ps,
      discharge_pressure_bar: Pd,
      displacement_cc: Vd,
      speed_rpm: N = 3500,
      refrigerant = "R410A",
      motor_efficiency: etaM = 0.90,
    } = input;

    const recs: string[] = [];
    const [gamma, rhoS, latent, Cp] = REF_PROPS[refrigerant];

    const pr = Pd / Ps; // pressure ratio
    const vr = Math.pow(pr, 1 / gamma); // built-in volume ratio

    // Volumetric flow
    const Vdot = Vd * 1e-6 * N / 60; // m³/s
    const etaVol = 0.95 - 0.02 * (pr - 2); // volumetric efficiency
    const mDot = rhoS * Vdot * Math.max(etaVol, 0.5); // kg/s
    const mDotH = mDot * 3600; // kg/h

    // Isentropic work
    const wIsen = (gamma / (gamma - 1)) * (Ps * 1e5 / rhoS) * (Math.pow(pr, (gamma - 1) / gamma) - 1);
    const etaIsen = 0.80 - 0.015 * (pr - 3); // typical scroll efficiency
    const etaIsenClamped = Math.max(0.55, Math.min(etaIsen, 0.88));

    const shaftPower = mDot * wIsen / etaIsenClamped / 1000; // kW
    const electricPower = shaftPower / etaM;

    // Discharge temperature
    const Ts = 10; // suction superheat °C (assumed)
    const Tsuction = Ts + 273.15;
    const Tdischarge = Tsuction * Math.pow(pr, (gamma - 1) / gamma) - 273.15;

    // Cooling capacity
    const coolingCap = latent > 0 ? mDot * latent : mDot * Cp * 30; // kW
    const cop = coolingCap > 0 ? coolingCap / electricPower : 0;

    const isSafe = pr <= 12 && Tdischarge < 130 && etaVol > 0.6;

    if (pr > 8) recs.push(`High pressure ratio ${pr.toFixed(1)} — consider two-stage or vapor injection`);
    if (Tdischarge > 120) recs.push(`High discharge temp ${Tdischarge.toFixed(0)}°C — risk of oil breakdown`);
    if (etaVol < 0.7) recs.push(`Low volumetric efficiency ${(etaVol * 100).toFixed(0)}% — leakage concern`);
    if (pr < 1.5) recs.push(`Low pressure ratio ${pr.toFixed(1)} — scroll may not seal properly`);
    if (recs.length === 0) recs.push(`Scroll compressor nominal — PR=${pr.toFixed(1)}, COP=${cop.toFixed(2)}, Td=${Tdischarge.toFixed(0)}°C`);

    return {
      pressure_ratio: mkAv(Math.round(pr * 100) / 100, "ratio", pr * 0.02, "definition"),
      volume_ratio: mkAv(Math.round(vr * 100) / 100, "ratio", vr * 0.05, "isentropic"),
      mass_flow_kg_h: mkAv(Math.round(mDotH * 10) / 10, "kg/h", mDotH * 0.05, "volumetric"),
      isentropic_efficiency: mkAv(Math.round(etaIsenClamped * 1000) / 1000, "ratio", 0.03, "empirical"),
      shaft_power_kW: mkAv(Math.round(shaftPower * 100) / 100, "kW", shaftPower * 0.05, "thermodynamic"),
      discharge_temp_C: mkAv(Math.round(Tdischarge), "°C", 5, "isentropic"),
      cooling_capacity_kW: mkAv(Math.round(coolingCap * 100) / 100, "kW", coolingCap * 0.08, "latent_heat"),
      cop: mkAv(Math.round(cop * 100) / 100, "ratio", cop * 0.08, "capacity_power"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const scrollCompressorEngine = new ScrollCompressorEngine();
