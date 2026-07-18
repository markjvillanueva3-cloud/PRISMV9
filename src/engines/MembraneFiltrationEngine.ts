/**
 * MembraneFiltrationEngine — Cross-flow membrane separation
 *
 * Models: Solution-diffusion, concentration polarization,
 *         fouling resistance, transmembrane pressure, flux decline
 * References: Baker 2012, Mulder, ASTM D4189
 */

export type MembraneType = "MF" | "UF" | "NF" | "RO" | "ED";
export type MembraneModule = "spiral_wound" | "hollow_fiber" | "tubular" | "plate_frame";

export interface MembraneFiltrationInput {
  type?: MembraneType;
  module?: MembraneModule;
  feed_flow_m3_h: number;
  feed_concentration_mg_L?: number;   // default 1000
  target_rejection_pct?: number;      // default 95
  membrane_area_m2?: number;          // default auto
  transmembrane_pressure_bar?: number; // default auto by type
  temperature_C?: number;             // default 25
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface MembraneFiltrationResult {
  permeate_flux_LMH: AtomicValue;
  recovery_pct: AtomicValue;
  rejection_pct: AtomicValue;
  membrane_area_m2: AtomicValue;
  energy_kWh_m3: AtomicValue;
  fouling_index: AtomicValue;
  concentration_factor: AtomicValue;
  permeate_quality_mg_L: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Membrane data: [pure_water_permeability_LMH_bar, typical_TMP_bar, MWCO_Da, rejection_base]
const MEMBRANE_PROPS: Record<MembraneType, [number, number, number, number]> = {
  MF:  [500,  1.0, 100000,  0.50],
  UF:  [100,  2.0, 10000,   0.85],
  NF:  [10,   10,  500,     0.90],
  RO:  [5,    15,  100,     0.995],
  ED:  [20,   5,   200,     0.92],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class MembraneFiltrationEngine {
  calculate(input: MembraneFiltrationInput): MembraneFiltrationResult {
    const {
      type = "RO",
      module = "spiral_wound",
      feed_flow_m3_h: Qf,
      feed_concentration_mg_L: Cf = 1000,
      target_rejection_pct: Rtarget = 95,
      temperature_C: T = 25,
    } = input;

    const recs: string[] = [];
    const [Lp0, typicalTMP, _mwco, rejBase] = MEMBRANE_PROPS[type];

    const TMP = input.transmembrane_pressure_bar ?? typicalTMP;

    // Temperature correction (viscosity effect)
    const TCF = Math.exp(0.0239 * (T - 25));

    // Pure water flux
    const Jw0 = Lp0 * TMP * TCF; // LMH

    // Osmotic pressure (Van 't Hoff for dilute solutions)
    const osmPressure = type === "RO" ? Cf / 1000 * 0.7 : 0; // bar, ~0.7 bar per g/L NaCl
    const effectiveTMP = Math.max(TMP - osmPressure, 0.1);

    // Concentration polarization factor
    const cpFactor = 1 + 0.3 * Math.pow(Cf / 10000, 0.5);

    // Actual flux with fouling and CP
    const foulingResistance = 0.7; // 70% of clean flux after fouling
    const Jactual = Lp0 * effectiveTMP * TCF * foulingResistance / cpFactor;

    // Membrane area
    const permeateFlow = Qf * 0.75; // 75% recovery target
    const areaRequired = permeateFlow * 1000 / (Jactual + 0.001); // m²
    const area = input.membrane_area_m2 ?? Math.ceil(areaRequired);

    // Actual permeate flow and recovery
    const actualPermeate = Jactual * area / 1000; // m³/h
    const recovery = Math.min(actualPermeate / Qf * 100, 95);

    // Rejection
    const rejection = Math.min(rejBase * 100 + (TMP - typicalTMP) * 0.5, 99.9);

    // Permeate quality
    const permeateConc = Cf * (1 - rejection / 100);

    // Concentration factor
    const CF = 1 / (1 - recovery / 100 + 0.001);

    // Energy consumption
    const pumpEff = 0.75;
    const energy = TMP * 100 / (36 * pumpEff); // kWh/m³ (1 bar = 100 kPa)

    // Fouling index (SDI-like, 0-6 scale)
    const foulingIdx = Math.min(Cf / 5000 * 3 + (T > 35 ? 1 : 0), 6);

    const isSafe = rejection > Rtarget && recovery > 30 && foulingIdx < 5;

    if (recovery > 85) recs.push(`High recovery ${recovery.toFixed(1)}% — scaling risk, add antiscalant`);
    if (foulingIdx > 3) recs.push(`Fouling index ${foulingIdx.toFixed(1)} — pretreatment needed`);
    if (osmPressure > TMP * 0.5) recs.push(`Osmotic pressure ${osmPressure.toFixed(1)}bar limits flux — increase TMP`);
    if (CF > 5) recs.push(`High concentration factor ${CF.toFixed(1)} — brine disposal concern`);
    if (rejection < Rtarget) recs.push(`Rejection ${rejection.toFixed(1)}% < target ${Rtarget}% — use tighter membrane`);
    if (recs.length === 0) recs.push(`Membrane nominal — J=${Jactual.toFixed(1)}LMH, R=${recovery.toFixed(1)}%, rej=${rejection.toFixed(1)}%`);

    return {
      permeate_flux_LMH: mkAv(Math.round(Jactual * 10) / 10, "LMH", Jactual * 0.15, "darcy_fouling"),
      recovery_pct: mkAv(Math.round(recovery * 10) / 10, "%", recovery * 0.05, "Qp_Qf"),
      rejection_pct: mkAv(Math.round(rejection * 10) / 10, "%", rejection * 0.02, "solution_diffusion"),
      membrane_area_m2: mkAv(area, "m²", area * 0.10, "flux_sizing"),
      energy_kWh_m3: mkAv(Math.round(energy * 100) / 100, "kWh/m³", energy * 0.10, "pump_work"),
      fouling_index: mkAv(Math.round(foulingIdx * 10) / 10, "SDI", foulingIdx * 0.25, "empirical"),
      concentration_factor: mkAv(Math.round(CF * 100) / 100, "ratio", CF * 0.05, "1_1-R"),
      permeate_quality_mg_L: mkAv(Math.round(permeateConc * 10) / 10, "mg/L", permeateConc * 0.10, "Cf_1-rej"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const membraneFiltrationEngine = new MembraneFiltrationEngine();
