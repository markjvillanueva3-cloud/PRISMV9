/**
 * DiaphragmPumpEngine — Diaphragm pump performance analysis
 *
 * Models: Positive displacement flow, pulsation analysis,
 *         NPSH requirements, diaphragm stress/life
 * References: Hydraulic Institute, Wilden AODD handbook
 */

export type DiaphragmType = "AODD" | "mechanical" | "solenoid" | "hydraulic";
export type DiaphragmMaterial = "PTFE" | "EPDM" | "neoprene" | "buna_N" | "santoprene";

export interface DiaphragmPumpInput {
  diaphragm_type?: DiaphragmType;
  diaphragm_material?: DiaphragmMaterial;
  diaphragm_diameter_mm: number;
  stroke_mm: number;
  speed_spm: number;                  // strokes per minute
  discharge_pressure_bar?: number;    // default 5
  num_diaphragms?: number;           // default 2 (duplex)
  fluid_viscosity_cP?: number;       // default 1 (water)
  fluid_sg?: number;                 // default 1.0
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface DiaphragmPumpResult {
  displacement_cc_stroke: AtomicValue;
  flow_rate_lpm: AtomicValue;
  power_kW: AtomicValue;
  pulsation_pct: AtomicValue;
  diaphragm_stress_MPa: AtomicValue;
  estimated_life_cycles: AtomicValue;
  npsh_required_m: AtomicValue;
  max_solids_pct: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Material data: [max_pressure_bar, max_temp_C, fatigue_limit_MPa, max_solids_%]
const MATERIAL_DATA: Record<DiaphragmMaterial, [number, number, number, number]> = {
  PTFE:       [10, 200, 15, 30],
  EPDM:       [8,  120, 10, 25],
  neoprene:   [7,  100, 8,  20],
  buna_N:     [7,  110, 9,  20],
  santoprene: [8,  135, 12, 35],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class DiaphragmPumpEngine {
  calculate(input: DiaphragmPumpInput): DiaphragmPumpResult {
    const {
      diaphragm_type = "AODD",
      diaphragm_material = "PTFE",
      diaphragm_diameter_mm: D,
      stroke_mm: S,
      speed_spm: N,
      discharge_pressure_bar: P = 5,
      num_diaphragms: nDia = 2,
      fluid_viscosity_cP: visc = 1,
      fluid_sg: sg = 1.0,
    } = input;

    const recs: string[] = [];
    const [maxP, maxT, fatigue, maxSolids] = MATERIAL_DATA[diaphragm_material];

    // Displacement per stroke
    const area_mm2 = Math.PI / 4 * D * D;
    const V_cc = area_mm2 * S / 1000; // cc per stroke

    // Volumetric efficiency (decreases with pressure and viscosity)
    const etaVol = Math.max(0.5, 0.95 - 0.005 * P - 0.001 * visc);

    // Flow rate
    const Q_lpm = V_cc * N * nDia * etaVol / 1000;

    // Power (hydraulic)
    const power = P * 1e5 * Q_lpm / 60000 / 1000 / 0.70; // kW with ~70% efficiency

    // Pulsation (depends on number of diaphragms)
    const pulsation = nDia === 1 ? 85 : nDia === 2 ? 25 : nDia === 3 ? 7 : 3; // %

    // Diaphragm stress (simplified: P × D / (4 × thickness))
    const thickness = D * 0.02; // ~2% of diameter typical
    const stress = P * 0.1 * D / (4 * thickness); // MPa

    // Fatigue life estimate
    const stressRatio = stress / fatigue;
    const lifeCycles = stressRatio < 0.5 ? 1e7 :
      stressRatio < 0.8 ? 5e6 / Math.pow(stressRatio, 3) :
      stressRatio < 1.0 ? 1e6 / Math.pow(stressRatio, 5) : 1e4;

    // NPSH required
    const NPSHr = 0.5 + 0.001 * N * Math.sqrt(V_cc / 1000) * sg;

    const isSafe = P < maxP && stress < fatigue * 0.8 && stressRatio < 1.0;

    if (P > maxP * 0.8) recs.push(`Pressure ${P} bar near ${diaphragm_material} limit ${maxP} bar`);
    if (stressRatio > 0.7) recs.push(`Diaphragm stress ${stress.toFixed(1)}MPa — ${(stressRatio * 100).toFixed(0)}% of fatigue limit`);
    if (N > 200) recs.push(`High stroke rate ${N}spm — reduced diaphragm life`);
    if (visc > 500) recs.push(`High viscosity ${visc}cP — consider larger diaphragm or lower speed`);
    if (pulsation > 20 && nDia < 3) recs.push(`Pulsation ${pulsation}% — add pulsation dampener or use triplex`);
    if (recs.length === 0) recs.push(`Diaphragm pump nominal — ${Q_lpm.toFixed(1)}L/min, life=${(lifeCycles / 1e6).toFixed(1)}M cycles`);

    return {
      displacement_cc_stroke: mkAv(Math.round(V_cc * 100) / 100, "cc", V_cc * 0.03, "area_stroke"),
      flow_rate_lpm: mkAv(Math.round(Q_lpm * 100) / 100, "L/min", Q_lpm * 0.08, "VN_eta"),
      power_kW: mkAv(Math.round(power * 1000) / 1000, "kW", power * 0.10, "PQ_eta"),
      pulsation_pct: mkAv(pulsation, "%", pulsation * 0.15, "num_diaphragms"),
      diaphragm_stress_MPa: mkAv(Math.round(stress * 100) / 100, "MPa", stress * 0.15, "PD_4t"),
      estimated_life_cycles: mkAv(Math.round(lifeCycles), "cycles", lifeCycles * 0.30, "SN_curve"),
      npsh_required_m: mkAv(Math.round(NPSHr * 100) / 100, "m", NPSHr * 0.20, "acceleration"),
      max_solids_pct: mkAv(maxSolids, "%", 0, "material_data"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const diaphragmPumpEngine = new DiaphragmPumpEngine();
