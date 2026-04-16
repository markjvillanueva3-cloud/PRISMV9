/**
 * AccumulatorEngine — Hydraulic accumulator sizing
 *
 * Models: Bladder/piston/diaphragm types, gas law (isothermal/adiabatic),
 *         volume sizing, response time, safety
 * References: Parker, Hydac, ISO 5765
 */

export type AccumulatorType = "bladder" | "piston" | "diaphragm" | "spring";
export type GasProcess = "isothermal" | "adiabatic" | "polytropic";

export interface AccumulatorInput {
  accumulator_type?: AccumulatorType;
  required_volume_L: number;          // fluid volume to deliver
  min_pressure_bar: number;           // minimum working pressure
  max_pressure_bar: number;           // maximum working pressure
  precharge_ratio?: number;           // P0/P1 ratio, default 0.9
  gas_process?: GasProcess;
  response_time_s?: number;           // desired response, default 1
  temperature_C?: number;             // default 40
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface AccumulatorResult {
  total_volume_L: AtomicValue;
  precharge_pressure_bar: AtomicValue;
  gas_volume_max_L: AtomicValue;
  gas_volume_min_L: AtomicValue;
  stored_energy_kJ: AtomicValue;
  flow_rate_lpm: AtomicValue;
  compression_ratio: AtomicValue;
  temperature_rise_C: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class AccumulatorEngine {
  calculate(input: AccumulatorInput): AccumulatorResult {
    const {
      accumulator_type = "bladder",
      required_volume_L: dV,
      min_pressure_bar: P1,
      max_pressure_bar: P2,
      precharge_ratio = 0.9,
      gas_process = "adiabatic",
      response_time_s: tResp = 1,
      temperature_C: T = 40,
    } = input;

    const recs: string[] = [];

    // Precharge pressure
    const P0 = P1 * precharge_ratio;

    // Gas law exponent
    const n = gas_process === "isothermal" ? 1.0 :
      gas_process === "adiabatic" ? 1.4 : 1.2;

    // Sizing: P0×V0^n = P1×V1^n = P2×V2^n
    // V1 - V2 = dV (required fluid volume)
    // V1 = V0 × (P0/P1)^(1/n), V2 = V0 × (P0/P2)^(1/n)
    // dV = V0 × [(P0/P1)^(1/n) - (P0/P2)^(1/n)]
    const factor = Math.pow(P0 / P1, 1 / n) - Math.pow(P0 / P2, 1 / n);
    const V0 = dV / Math.max(factor, 0.001);

    const V1 = V0 * Math.pow(P0 / P1, 1 / n);
    const V2 = V0 * Math.pow(P0 / P2, 1 / n);

    // Stored energy: E = ∫P dV (simplified)
    const storedEnergy = (P1 + P2) / 2 * 1e5 * dV / 1000 / 1000; // kJ

    // Flow rate based on response time
    const flowRate = dV / (tResp / 60); // L/min

    // Compression ratio
    const compressionRatio = P2 / P0;

    // Temperature rise (adiabatic)
    const T_K = T + 273.15;
    const tempRise = T_K * (Math.pow(compressionRatio, (n - 1) / n) - 1);

    const isSafe = compressionRatio < 8 && P2 < 400 && V0 > 0;

    if (compressionRatio > 4) recs.push(`High compression ratio ${compressionRatio.toFixed(1)} — consider larger accumulator`);
    if (P0 < P1 * 0.8) recs.push(`Low precharge ${P0.toFixed(0)} bar — sluggish response, set to ${(P1 * 0.9).toFixed(0)} bar`);
    if (accumulator_type === "bladder" && P2 > 350) recs.push(`Bladder type max ~350 bar — use piston type`);
    if (tempRise > 50) recs.push(`Gas temp rise ${tempRise.toFixed(0)}°C — check thermal limits`);
    if (accumulator_type === "bladder" && compressionRatio > 4) recs.push(`Compression ratio > 4:1 — bladder extrusion risk`);
    if (recs.length === 0) recs.push(`Accumulator nominal — V0=${V0.toFixed(1)}L, P0=${P0.toFixed(0)}bar, E=${storedEnergy.toFixed(1)}kJ`);

    return {
      total_volume_L: mkAv(Math.round(V0 * 100) / 100, "L", V0 * 0.05, "gas_law"),
      precharge_pressure_bar: mkAv(Math.round(P0 * 10) / 10, "bar", P0 * 0.05, "P1_ratio"),
      gas_volume_max_L: mkAv(Math.round(V1 * 100) / 100, "L", V1 * 0.05, "P0V0_P1"),
      gas_volume_min_L: mkAv(Math.round(V2 * 100) / 100, "L", V2 * 0.05, "P0V0_P2"),
      stored_energy_kJ: mkAv(Math.round(storedEnergy * 100) / 100, "kJ", storedEnergy * 0.10, "PdV"),
      flow_rate_lpm: mkAv(Math.round(flowRate * 10) / 10, "L/min", flowRate * 0.10, "dV_t"),
      compression_ratio: mkAv(Math.round(compressionRatio * 100) / 100, "ratio", compressionRatio * 0.05, "P2_P0"),
      temperature_rise_C: mkAv(Math.round(tempRise * 10) / 10, "°C", tempRise * 0.15, "adiabatic"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const accumulatorEngine = new AccumulatorEngine();
