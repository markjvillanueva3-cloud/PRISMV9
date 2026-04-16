/**
 * ProgressiveCavityPumpEngine — Progressing cavity (Moineau) pump analysis
 *
 * Models: Geometric displacement, slip flow, rotor/stator fit,
 *         viscosity effects, abrasive wear, suction capability
 * References: Moineau 1930, API 676, Hydraulic Institute
 */

export type StatorMaterial = "NBR" | "EPDM" | "FKM" | "PTFE" | "metal";
export type FluidType = "water" | "slurry" | "sludge" | "oil" | "polymer" | "food";

export interface ProgressiveCavityPumpInput {
  stator_material?: StatorMaterial;
  fluid?: FluidType;
  rotor_diameter_mm: number;
  eccentricity_mm?: number;          // default D/8
  pitch_length_mm?: number;          // default 4×D
  num_stages?: number;               // default 2
  rpm?: number;                      // default 300
  discharge_pressure_bar?: number;   // default 6
  fluid_viscosity_mPa_s?: number;   // default 100
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ProgressiveCavityPumpResult {
  flow_rate_m3_h: AtomicValue;
  displacement_L_rev: AtomicValue;
  volumetric_efficiency_pct: AtomicValue;
  max_pressure_bar: AtomicValue;
  power_kW: AtomicValue;
  torque_Nm: AtomicValue;
  slip_flow_L_min: AtomicValue;
  rotor_orbit_speed_m_s: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Stator: [max_temp_C, max_pressure_per_stage_bar, wear_factor]
const STATOR_DATA: Record<StatorMaterial, [number, number, number]> = {
  NBR:   [90,  6, 1.0],
  EPDM:  [150, 5, 1.2],
  FKM:   [200, 6, 0.8],
  PTFE:  [260, 8, 0.5],
  metal: [350, 12, 0.3],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ProgressiveCavityPumpEngine {
  calculate(input: ProgressiveCavityPumpInput): ProgressiveCavityPumpResult {
    const {
      stator_material = "NBR",
      fluid = "slurry",
      rotor_diameter_mm: D,
      num_stages: nStages = 2,
      rpm: N = 300,
      discharge_pressure_bar: Pd = 6,
      fluid_viscosity_mPa_s: mu = 100,
    } = input;

    const recs: string[] = [];
    const e = input.eccentricity_mm ?? D / 8;
    const pitch = input.pitch_length_mm ?? D * 4;
    const [maxTemp, Pstage, wearFactor] = STATOR_DATA[stator_material];

    // Displacement per revolution: V = 4 × e × D × pitch_length
    const Vrev = 4 * (e / 1000) * (D / 1000) * (pitch / 1000) * 1000; // L

    // Flow rate
    const theoreticalFlow = Vrev * N * 60 / 1000; // m³/h

    // Slip flow (pressure-driven backflow through clearance)
    const clearance = 0.1; // mm typical fit
    const slipCoeff = Math.pow(clearance / 1000, 3) / (12 * mu / 1000 * pitch / 1000);
    const slipFlow = slipCoeff * Pd * 1e5 * 1000 * 60; // L/min
    const slipPerRev = slipFlow / N;

    // Volumetric efficiency
    const volEff = Math.max((1 - slipPerRev / (Vrev + 0.001)) * 100, 50);
    const actualFlow = theoreticalFlow * volEff / 100;

    // Maximum pressure
    const maxPressure = nStages * Pstage;

    // Power
    const hydraulicPower = actualFlow / 3600 * Pd * 1e5 / 1000; // kW
    const mechEff = 0.85;
    const totalPower = hydraulicPower / mechEff;

    // Torque
    const torque = totalPower * 1000 / (2 * Math.PI * N / 60);

    // Rotor orbital speed
    const orbitSpeed = Math.PI * 2 * e / 1000 * N / 60; // m/s

    const isSafe = Pd <= maxPressure && N < 500 && orbitSpeed < 3;

    if (Pd > maxPressure * 0.8) recs.push(`Pressure ${Pd}bar near max ${maxPressure}bar — add stages`);
    if (N > 400) recs.push(`High RPM ${N} — accelerated stator wear, reduce speed`);
    if (orbitSpeed > 2) recs.push(`High orbit speed ${orbitSpeed.toFixed(1)}m/s — stator wear risk`);
    if (volEff < 70) recs.push(`Low volumetric efficiency ${volEff.toFixed(0)}% — tighten rotor/stator fit`);
    if (fluid === "slurry" && stator_material === "NBR") recs.push(`Abrasive slurry with NBR — consider metal stator`);
    if (recs.length === 0) recs.push(`PCP nominal — ${actualFlow.toFixed(2)}m³/h, ηv=${volEff.toFixed(0)}%, ${totalPower.toFixed(1)}kW`);

    return {
      flow_rate_m3_h: mkAv(Math.round(actualFlow * 100) / 100, "m³/h", actualFlow * 0.05, "displacement_slip"),
      displacement_L_rev: mkAv(Math.round(Vrev * 10000) / 10000, "L/rev", Vrev * 0.03, "4eDL"),
      volumetric_efficiency_pct: mkAv(Math.round(volEff * 10) / 10, "%", volEff * 0.05, "slip_ratio"),
      max_pressure_bar: mkAv(maxPressure, "bar", maxPressure * 0.05, "stages_Pstage"),
      power_kW: mkAv(Math.round(totalPower * 100) / 100, "kW", totalPower * 0.10, "hydraulic_mech"),
      torque_Nm: mkAv(Math.round(torque * 10) / 10, "N·m", torque * 0.10, "P_omega"),
      slip_flow_L_min: mkAv(Math.round(slipFlow * 100) / 100, "L/min", slipFlow * 0.25, "clearance_Pd"),
      rotor_orbit_speed_m_s: mkAv(Math.round(orbitSpeed * 1000) / 1000, "m/s", orbitSpeed * 0.05, "2pi_e_N"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const progressiveCavityPumpEngine = new ProgressiveCavityPumpEngine();
