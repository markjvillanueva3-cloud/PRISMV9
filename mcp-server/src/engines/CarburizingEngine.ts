/**
 * CarburizingEngine — Gas/vacuum carburizing process analysis
 *
 * Models: Fick's second law diffusion, carbon potential control,
 *         case depth prediction (Harris equation), boost-diffuse cycles
 * References: ASM Handbook Vol 4, Harris 1943, ISO 2639
 */

export type CarburizingMethod = "gas" | "vacuum" | "plasma" | "pack" | "liquid_bath";
export type BaseSteelType = "8620" | "9310" | "4320" | "1018" | "5120" | "3310";

export interface CarburizingInput {
  method?: CarburizingMethod;
  base_steel?: BaseSteelType;
  target_case_depth_mm: number;
  carburizing_temp_C?: number;       // default 925
  carbon_potential_pct?: number;     // default 0.9
  initial_carbon_pct?: number;       // default from steel
  quench_after?: boolean;            // default true
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface CarburizingResult {
  total_time_h: AtomicValue;
  surface_carbon_pct: AtomicValue;
  effective_case_depth_mm: AtomicValue;
  diffusion_coefficient_m2_s: AtomicValue;
  surface_hardness_HRC: AtomicValue;
  core_hardness_HRC: AtomicValue;
  carbon_flux_g_m2_h: AtomicValue;
  gas_consumption_m3_h: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Steel: [initial_C_pct, core_hardness_HRC_after_quench]
const BASE_STEEL: Record<BaseSteelType, [number, number]> = {
  "8620": [0.20, 35],
  "9310": [0.10, 30],
  "4320": [0.20, 33],
  "1018": [0.18, 25],
  "5120": [0.20, 32],
  "3310": [0.10, 28],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class CarburizingEngine {
  calculate(input: CarburizingInput): CarburizingResult {
    const {
      method = "gas",
      base_steel = "8620",
      target_case_depth_mm: dTarget,
      carburizing_temp_C: T = 925,
      carbon_potential_pct: Cp = 0.9,
      quench_after = true,
    } = input;

    const recs: string[] = [];
    const [C0, coreHRC] = BASE_STEEL[base_steel];
    const Ci = input.initial_carbon_pct ?? C0;

    // Diffusion coefficient (Arrhenius): D = D0 × exp(-Q/RT)
    const D0 = 2.0e-5; // m²/s pre-exponential
    const Q = 142000;   // J/mol activation energy
    const R = 8.314;
    const TK = T + 273.15;
    const D = D0 * Math.exp(-Q / (R * TK));

    // Method modifier (vacuum is ~30% faster due to boost-diffuse)
    const methodMod = method === "vacuum" ? 0.7 :
      method === "plasma" ? 0.6 : method === "pack" ? 1.3 : 1.0;

    // Harris equation: case depth = K × √t
    // d = 2 × √(D × t) for Fick's 2nd law (erf solution)
    // Solve for time: t = (d/(2))² / D
    const dMeters = dTarget / 1000;
    const tSeconds = Math.pow(dMeters / 2, 2) / D * methodMod;
    const tHours = tSeconds / 3600;

    // Surface carbon (approaches carbon potential)
    const surfaceC = Ci + (Cp - Ci) * (1 - Math.exp(-tHours * 0.5));

    // Effective case depth (at 0.4% C or 50 HRC)
    const effectiveDepth = dTarget * 0.85; // typically 85% of total case

    // Surface hardness after quench
    const surfaceHRC = quench_after ?
      Math.min(20 + 60 * surfaceC, 65) : Math.min(20 + 30 * surfaceC, 45);

    // Carbon flux (mass transfer)
    const beta = method === "gas" ? 5e-6 : 8e-6; // m/s mass transfer coeff
    const flux = beta * (Cp - surfaceC) / 100 * 7850 * 3600; // g/m²/h

    // Gas consumption (natural gas + endothermic)
    const gasRate = method === "gas" ? 2.0 + dTarget * 0.5 :
      method === "vacuum" ? 0.5 : 0;

    const isSafe = surfaceC < 1.2 && tHours < 48 && T < 1050;

    if (T > 980) recs.push(`High temp ${T}°C — grain growth risk, consider vacuum for speed`);
    if (surfaceC > 1.0) recs.push(`Surface carbon ${surfaceC.toFixed(2)}% — retained austenite risk, reduce Cp`);
    if (tHours > 20) recs.push(`Long cycle ${tHours.toFixed(1)}h — consider higher temperature or vacuum`);
    if (Cp > 1.1) recs.push(`High carbon potential ${Cp}% — soot formation in gas carburizing`);
    if (dTarget > 3) recs.push(`Deep case ${dTarget}mm — verify core toughness not compromised`);
    if (recs.length === 0) recs.push(`Carburize nominal — ${tHours.toFixed(1)}h at ${T}°C, case=${effectiveDepth.toFixed(2)}mm, ${surfaceHRC.toFixed(0)}HRC`);

    return {
      total_time_h: mkAv(Math.round(tHours * 10) / 10, "h", tHours * 0.15, "fick_2nd_law"),
      surface_carbon_pct: mkAv(Math.round(surfaceC * 1000) / 1000, "%", surfaceC * 0.05, "erf_solution"),
      effective_case_depth_mm: mkAv(Math.round(effectiveDepth * 100) / 100, "mm", effectiveDepth * 0.10, "0.4pct_C"),
      diffusion_coefficient_m2_s: mkAv(D, "m²/s", D * 0.20, "arrhenius"),
      surface_hardness_HRC: mkAv(Math.round(surfaceHRC * 10) / 10, "HRC", surfaceHRC * 0.05, "carbon_hardness"),
      core_hardness_HRC: mkAv(coreHRC, "HRC", coreHRC * 0.10, "steel_grade"),
      carbon_flux_g_m2_h: mkAv(Math.round(flux * 100) / 100, "g/(m²·h)", flux * 0.25, "mass_transfer"),
      gas_consumption_m3_h: mkAv(Math.round(gasRate * 10) / 10, "m³/h", gasRate * 0.20, "empirical"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const carburizingEngine = new CarburizingEngine();
