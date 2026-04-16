/**
 * EjectorEngine — Ejector / jet pump design
 *
 * Models: Entrainment ratio, compression ratio, mixing chamber,
 *         diffuser recovery, ESDU correlations
 * References: ESDU 86030, Power ejector theory
 */

export type EjectorFluid = "steam" | "air" | "water" | "refrigerant";

export interface EjectorInput {
  motive_pressure_bar: number;
  suction_pressure_bar: number;
  discharge_pressure_bar: number;
  motive_flow_kg_s?: number;           // default auto-sized
  motive_fluid?: EjectorFluid;
  suction_fluid?: EjectorFluid;
  motive_temperature_K?: number;       // default 400
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface EjectorResult {
  entrainment_ratio: AtomicValue;
  compression_ratio: AtomicValue;
  expansion_ratio: AtomicValue;
  suction_flow_kg_s: AtomicValue;
  nozzle_area_mm2: AtomicValue;
  mixing_area_mm2: AtomicValue;
  diffuser_area_mm2: AtomicValue;
  efficiency_pct: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class EjectorEngine {
  calculate(input: EjectorInput): EjectorResult {
    const {
      motive_pressure_bar: Pm,
      suction_pressure_bar: Ps,
      discharge_pressure_bar: Pd,
      motive_flow_kg_s: mm = 0.1,
      motive_fluid = "steam",
      motive_temperature_K: Tm = 400,
    } = input;

    const recs: string[] = [];

    // Expansion ratio and compression ratio
    const expRatio = Pm / Ps;
    const compRatio = Pd / Ps;

    // Entrainment ratio (Keenan-Neumann correlation simplified)
    // Higher expansion ratio → more motive energy → higher entrainment
    // Higher compression ratio → harder to compress → lower entrainment
    const w = Math.sqrt(expRatio) / compRatio * 0.4;
    const entrainment = Math.max(w, 0.05);

    // Suction mass flow
    const ms = mm * entrainment;

    // Nozzle sizing (motive)
    const gamma = motive_fluid === "steam" ? 1.3 : 1.4;
    const R = motive_fluid === "steam" ? 461 : 287;
    const At = mm / (Pm * 1e5) * Math.sqrt(R * Tm / gamma) /
      Math.pow(2 / (gamma + 1), (gamma + 1) / (2 * (gamma - 1)));
    const nozzleArea = Math.abs(At) * 1e6; // mm²

    // Mixing chamber area (typically 4-8× nozzle throat)
    const mixFactor = 3 + compRatio;
    const mixArea = nozzleArea * Math.min(mixFactor, 10);

    // Diffuser area (2-3× mixing)
    const diffArea = mixArea * 2.5;

    // Efficiency (entrainment-based)
    const eta = entrainment * compRatio / expRatio * 100;
    const etaClamped = Math.min(Math.max(eta * 10, 5), 40);

    const isSafe = compRatio < expRatio && Pm > Pd && Pd > Ps;

    if (compRatio > expRatio * 0.8) recs.push(`High compression ratio — entrainment drops, add stages`);
    if (entrainment < 0.1) recs.push(`Low entrainment ${entrainment.toFixed(2)} — insufficient motive energy`);
    if (Pd > Pm * 0.9) recs.push(`Discharge near motive pressure — ejector ineffective`);
    if (expRatio > 20) recs.push(`Very high expansion ratio ${expRatio.toFixed(0)} — multiple stages recommended`);
    if (recs.length === 0) recs.push(`Ejector nominal — ω=${entrainment.toFixed(2)}, CR=${compRatio.toFixed(2)}, η≈${etaClamped.toFixed(0)}%`);

    return {
      entrainment_ratio: mkAv(Math.round(entrainment * 1000) / 1000, "ratio", entrainment * 0.15, "keenan_neumann"),
      compression_ratio: mkAv(Math.round(compRatio * 100) / 100, "ratio", compRatio * 0.02, "definition"),
      expansion_ratio: mkAv(Math.round(expRatio * 100) / 100, "ratio", expRatio * 0.02, "definition"),
      suction_flow_kg_s: mkAv(Math.round(ms * 10000) / 10000, "kg/s", ms * 0.15, "entrainment"),
      nozzle_area_mm2: mkAv(Math.round(nozzleArea * 10) / 10, "mm²", nozzleArea * 0.10, "isentropic"),
      mixing_area_mm2: mkAv(Math.round(mixArea), "mm²", mixArea * 0.15, "empirical"),
      diffuser_area_mm2: mkAv(Math.round(diffArea), "mm²", diffArea * 0.15, "empirical"),
      efficiency_pct: mkAv(Math.round(etaClamped * 10) / 10, "%", etaClamped * 0.20, "esdu"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const ejectorEngine = new EjectorEngine();
