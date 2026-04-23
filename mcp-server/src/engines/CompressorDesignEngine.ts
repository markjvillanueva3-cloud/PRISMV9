/**
 * CompressorDesignEngine — Reciprocating/screw compressor sizing
 *
 * Models: Ideal gas compression (PV^γ = const), volumetric efficiency,
 *         multi-stage intercooling, power consumption, discharge temperature
 * References: Compressed Air & Gas Handbook (CAGI), ISO 1217
 * Safety: Discharge temperature limits, pressure ratio per stage
 */

// ─── Types ─────────────────────────────────────────────────────────

export type CompressorType = "reciprocating" | "screw" | "centrifugal" | "scroll" | "vane";
export type GasType = "air" | "nitrogen" | "oxygen" | "natural_gas" | "refrigerant";

export interface CompressorDesignInput {
  flow_rate_m3_min: number;                 // FAD (free air delivery)
  inlet_pressure_bar: number;               // absolute
  outlet_pressure_bar: number;              // absolute
  compressor_type?: CompressorType;         // default reciprocating
  gas?: GasType;                            // default air
  inlet_temp_C?: number;                    // default 20
  stages?: number;                          // auto-calculated if not given
  intercooler_approach_C?: number;          // default 10°C above inlet
  mechanical_efficiency?: number;           // default 0.90
  motor_efficiency?: number;                // default 0.93
}

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

export interface CompressorDesignResult {
  total_power_kW: AtomicValue;
  isothermal_power_kW: AtomicValue;
  adiabatic_power_kW: AtomicValue;
  isothermal_efficiency_pct: AtomicValue;
  discharge_temp_C: AtomicValue;
  pressure_ratio: AtomicValue;
  pressure_ratio_per_stage: AtomicValue;
  number_of_stages: AtomicValue;
  volumetric_efficiency_pct: AtomicValue;
  specific_power_kW_per_m3_min: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Reference Data ────────────────────────────────────────────────

const GAS_PROPS: Record<GasType, { gamma: number; R: number; name: string }> = {
  air:          { gamma: 1.4, R: 287, name: "Air" },
  nitrogen:     { gamma: 1.4, R: 297, name: "Nitrogen" },
  oxygen:       { gamma: 1.4, R: 260, name: "Oxygen" },
  natural_gas:  { gamma: 1.3, R: 518, name: "Natural Gas" },
  refrigerant:  { gamma: 1.15, R: 81, name: "Refrigerant" },
};

const VOL_EFF_BASE: Record<CompressorType, number> = {
  reciprocating: 0.82,
  screw: 0.90,
  centrifugal: 0.95,
  scroll: 0.85,
  vane: 0.78,
};

// ─── Engine ────────────────────────────────────────────────────────

function mkAv(value: number, unit: string, unc: number, source: string, warning?: string): AtomicValue {
  return { value, unit, uncertainty: unc, source, warning };
}

export class CompressorDesignEngine {
  calculate(input: CompressorDesignInput): CompressorDesignResult {
    const {
      flow_rate_m3_min: Q,
      inlet_pressure_bar: P1,
      outlet_pressure_bar: P2,
      compressor_type: ctype = "reciprocating",
      gas = "air",
      inlet_temp_C: T1_C = 20,
      intercooler_approach_C: icApproach = 10,
      mechanical_efficiency: etaMech = 0.90,
      motor_efficiency: etaMotor = 0.93,
    } = input;

    const recs: string[] = [];
    const gp = GAS_PROPS[gas];
    const gamma = gp.gamma;
    const T1 = T1_C + 273.15;
    const totalPR = P2 / P1;

    // Auto-calculate stages: rule of thumb — PR per stage ≤ 4 for reciprocating
    const maxPRperStage = ctype === "reciprocating" ? 4 : ctype === "screw" ? 5 : 6;
    let nStages = input.stages ?? Math.max(1, Math.ceil(Math.log(totalPR) / Math.log(maxPRperStage)));
    const prPerStage = Math.pow(totalPR, 1 / nStages);

    // Volumetric efficiency: ηv = 1 - c × (r^(1/γ) - 1), c = clearance ratio
    const c = ctype === "reciprocating" ? 0.05 : 0.02;
    const etaVol = VOL_EFF_BASE[ctype] * (1 - c * (Math.pow(prPerStage, 1 / gamma) - 1));

    // Isothermal power: P_iso = P1 × Q × ln(P2/P1) / 60 (kW)
    // P1 in bar = 1e5 Pa, Q in m³/min
    const P_iso = P1 * 1e5 * (Q / 60) * Math.log(totalPR) / 1000;

    // Adiabatic power per stage (polytropic):
    // P_ad = n/(n-1) × P1 × Q × [(P2/P1)^((n-1)/n) - 1] / 60
    // For multi-stage with intercooling:
    const n = gamma; // ideal adiabatic
    const exp = (n - 1) / n;
    const P_ad_per_stage = (n / (n - 1)) * P1 * 1e5 * (Q / 60) * (Math.pow(prPerStage, exp) - 1) / 1000;
    const P_ad_total = P_ad_per_stage * nStages;

    // Actual power with efficiencies
    const P_actual = P_ad_total / (etaMech * etaMotor);

    // Discharge temperature per stage (adiabatic): T2 = T1 × r^((γ-1)/γ)
    // With intercooling, each stage starts at T1 + approach
    const T_interstage = T1 + icApproach;
    const T_discharge = T_interstage * Math.pow(prPerStage, exp);
    const T_discharge_C = T_discharge - 273.15;

    // Isothermal efficiency
    const etaIso = P_iso / P_ad_total * 100;

    // Specific power
    const specificPower = P_actual / Q;

    const isSafe = T_discharge_C < 200 && prPerStage < 6 && etaVol > 0.50;

    if (T_discharge_C > 180) {
      recs.push(`High discharge temp ${T_discharge_C.toFixed(0)}°C — add intercooling stage or aftercooler`);
    }
    if (prPerStage > 4 && ctype === "reciprocating") {
      recs.push(`High pressure ratio per stage ${prPerStage.toFixed(1)} — add another stage`);
    }
    if (etaVol < 0.65) {
      recs.push(`Low volumetric efficiency ${(etaVol * 100).toFixed(1)}% — excessive re-expansion losses`);
    }
    if (specificPower > 8) {
      recs.push(`High specific power ${specificPower.toFixed(1)} kW/(m³/min) — review compressor selection`);
    }
    if (recs.length === 0) {
      recs.push(`Compressor sizing nominal — ${nStages} stage(s), PR ${prPerStage.toFixed(1)}/stage, ${P_actual.toFixed(1)}kW`);
    }

    return {
      total_power_kW: mkAv(Math.round(P_actual * 10) / 10, "kW", P_actual * 0.08, "polytropic_model"),
      isothermal_power_kW: mkAv(Math.round(P_iso * 10) / 10, "kW", P_iso * 0.03, "isothermal_model"),
      adiabatic_power_kW: mkAv(Math.round(P_ad_total * 10) / 10, "kW", P_ad_total * 0.05, "adiabatic_model"),
      isothermal_efficiency_pct: mkAv(Math.round(etaIso * 10) / 10, "%", etaIso * 0.05, "power_ratio"),
      discharge_temp_C: mkAv(Math.round(T_discharge_C), "°C", T_discharge_C * 0.05, "adiabatic_temp"),
      pressure_ratio: mkAv(Math.round(totalPR * 100) / 100, "ratio", 0, "input"),
      pressure_ratio_per_stage: mkAv(Math.round(prPerStage * 100) / 100, "ratio", 0, "geometric_mean"),
      number_of_stages: mkAv(nStages, "stages", 0, "rule_of_thumb"),
      volumetric_efficiency_pct: mkAv(Math.round(etaVol * 1000) / 10, "%", etaVol * 5, "clearance_model"),
      specific_power_kW_per_m3_min: mkAv(Math.round(specificPower * 100) / 100, "kW/(m³/min)", specificPower * 0.08, "power_flow_ratio"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const compressorDesignEngine = new CompressorDesignEngine();
