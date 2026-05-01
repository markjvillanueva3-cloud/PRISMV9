/**
 * BrazingSolderingEngine — Brazing and soldering joint analysis
 *
 * Models: Joint clearance optimization, capillary flow,
 *         shear strength, thermal cycle stress, filler selection
 * References: AWS C3.6, ASM Brazing Handbook
 */

export type JoiningProcess = "brazing" | "soldering" | "braze_welding";
export type FillerType = "BAg" | "BCuP" | "BNi" | "BAl" | "Sn63Pb37" | "SAC305" | "Sn96Ag4";

export interface BrazingSolderingInput {
  process?: JoiningProcess;
  filler?: FillerType;
  joint_area_mm2: number;
  gap_mm?: number;                    // clearance, default 0.05 for brazing
  base_material_strength_MPa?: number; // default 400
  service_temperature_C?: number;    // default 25
  load_N?: number;                   // applied load, default 1000
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface BrazingSolderingResult {
  joint_shear_strength_MPa: AtomicValue;
  applied_shear_stress_MPa: AtomicValue;
  safety_factor: AtomicValue;
  optimal_gap_mm: AtomicValue;
  process_temperature_C: AtomicValue;
  capillary_pressure_kPa: AtomicValue;
  thermal_stress_MPa: AtomicValue;
  joint_efficiency_pct: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Filler data: [shear_strength_MPa, liquidus_C, solidus_C, surface_tension_mN_m, CTE_ppm_C]
const FILLER_DATA: Record<FillerType, [number, number, number, number, number]> = {
  BAg:       [200, 780,  620,  900, 19],
  BCuP:      [180, 860,  645,  800, 17],
  BNi:       [250, 1100, 970, 1200, 13],
  BAl:       [100, 610,  560,  850, 23],
  Sn63Pb37:  [35,  183,  183,  480, 25],
  SAC305:    [45,  220,  217,  520, 22],
  Sn96Ag4:   [40,  221,  221,  500, 23],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class BrazingSolderingEngine {
  calculate(input: BrazingSolderingInput): BrazingSolderingResult {
    const {
      process = "brazing",
      filler = process === "soldering" ? "SAC305" : "BAg",
      joint_area_mm2: A,
      base_material_strength_MPa: sigmaBase = 400,
      service_temperature_C: Tserv = 25,
      load_N: F = 1000,
    } = input;

    const recs: string[] = [];
    const [shearStr, liquidus, solidus, surfTension, cte] = FILLER_DATA[filler];

    // Optimal gap (brazing: 0.025-0.15mm, soldering: 0.05-0.20mm)
    const optGap = process === "soldering" ? 0.10 : 0.05;
    const gap = input.gap_mm ?? optGap;

    // Joint strength (affected by gap — max at optimal gap)
    const gapRatio = gap / optGap;
    const gapFactor = gapRatio < 0.5 ? 0.6 :
      gapRatio < 1.5 ? 1.0 - 0.2 * Math.abs(gapRatio - 1) : 0.5;
    const jointStrength = shearStr * gapFactor;

    // Applied stress
    const appliedStress = F / A;
    const sf = jointStrength / (appliedStress + 0.001);

    // Process temperature (mid-range)
    const processTemp = (liquidus + solidus) / 2 + 30;

    // Capillary pressure: P = 2γcos(θ)/gap
    const theta = 10 * Math.PI / 180; // wetting angle ~10°
    const capPressure = 2 * surfTension / 1000 * Math.cos(theta) / (gap / 1000) / 1000; // kPa

    // Thermal stress from CTE mismatch
    const baseCTE = 12; // steel typical
    const deltaCTE = Math.abs(cte - baseCTE);
    const deltaT = processTemp - Tserv;
    const thermalStress = deltaCTE * 1e-6 * deltaT * 200000; // MPa (E≈200GPa)

    // Joint efficiency
    const jointEff = jointStrength / sigmaBase * 100;

    const isSafe = sf > 1.5 && thermalStress < jointStrength * 0.5;

    if (sf < 2) recs.push(`Safety factor ${sf.toFixed(1)} — increase joint area or use stronger filler`);
    if (gap < 0.02) recs.push(`Gap ${gap}mm too tight — filler won't flow, use ${optGap}mm`);
    if (gap > 0.25) recs.push(`Gap ${gap}mm too wide — weak joint, reduce to ${optGap}mm`);
    if (Tserv > solidus * 0.7) recs.push(`Service temp ${Tserv}°C > 70% of solidus — creep concern`);
    if (thermalStress > jointStrength * 0.3) recs.push(`Thermal stress ${thermalStress.toFixed(0)}MPa — CTE mismatch, consider interlayer`);
    if (recs.length === 0) recs.push(`Joint nominal — SF=${sf.toFixed(1)}, τ=${jointStrength.toFixed(0)}MPa, gap=${gap}mm`);

    return {
      joint_shear_strength_MPa: mkAv(Math.round(jointStrength), "MPa", jointStrength * 0.15, "filler_gap"),
      applied_shear_stress_MPa: mkAv(Math.round(appliedStress * 100) / 100, "MPa", appliedStress * 0.05, "F_A"),
      safety_factor: mkAv(Math.round(sf * 100) / 100, "ratio", sf * 0.15, "strength_stress"),
      optimal_gap_mm: mkAv(optGap, "mm", optGap * 0.20, "process_type"),
      process_temperature_C: mkAv(Math.round(processTemp), "°C", processTemp * 0.05, "liquidus"),
      capillary_pressure_kPa: mkAv(Math.round(capPressure * 10) / 10, "kPa", capPressure * 0.20, "young_laplace"),
      thermal_stress_MPa: mkAv(Math.round(thermalStress), "MPa", thermalStress * 0.25, "CTE_deltaT"),
      joint_efficiency_pct: mkAv(Math.round(jointEff * 10) / 10, "%", jointEff * 0.15, "tau_sigma"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const brazingSolderingEngine = new BrazingSolderingEngine();
