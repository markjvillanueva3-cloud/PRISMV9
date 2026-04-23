/**
 * GranulationProcessEngine — Wet/dry granulation process analysis
 *
 * Models: Stokes deformation number, granule growth regime,
 *         binder spray rate, impeller tip speed, scale-up
 * References: Iveson et al., Litster "Granulation", Ennis & Litster
 */

export type GranulationType = "high_shear" | "fluid_bed" | "drum" | "roller_compaction" | "extrusion" | "spray_gran";
export type BinderType = "PVP" | "HPMC" | "water" | "PEG" | "starch_paste" | "none";

export interface GranulationProcessInput {
  type?: GranulationType;
  binder?: BinderType;
  batch_size_kg?: number;            // default 50
  powder_density_kg_m3?: number;     // default 500
  target_granule_mm?: number;        // default 1.0
  impeller_speed_rpm?: number;       // default 200
  binder_concentration_pct?: number; // default 5
  liquid_to_solid_ratio?: number;    // default 0.3
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface GranulationProcessResult {
  stokes_deformation_number: AtomicValue;
  growth_regime: AtomicValue;
  granule_size_mm: AtomicValue;
  binder_volume_L: AtomicValue;
  impeller_tip_speed_m_s: AtomicValue;
  process_time_min: AtomicValue;
  porosity_pct: AtomicValue;
  friability_pct: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Binder: [viscosity_mPas, surface_tension_mN/m, adhesion_factor]
const BINDER_DATA: Record<BinderType, [number, number, number]> = {
  PVP:          [20, 45, 1.2],
  HPMC:         [50, 42, 1.5],
  water:        [1,  72, 0.5],
  PEG:          [30, 43, 1.0],
  starch_paste: [100, 55, 1.8],
  none:         [0,  0,  0],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class GranulationProcessEngine {
  calculate(input: GranulationProcessInput): GranulationProcessResult {
    const {
      type = "high_shear",
      binder = "PVP",
      batch_size_kg: batch = 50,
      powder_density_kg_m3: rhoPowder = 500,
      target_granule_mm: dTarget = 1.0,
      impeller_speed_rpm: N = 200,
      binder_concentration_pct: binderConc = 5,
      liquid_to_solid_ratio: LS = 0.3,
    } = input;

    const recs: string[] = [];
    const [muBinder, gamma, adhesion] = BINDER_DATA[binder];
    const isDry = type === "roller_compaction" || binder === "none";

    // Bowl/drum volume estimate
    const bulkVol = batch / rhoPowder; // m³
    const bowlDiam = Math.pow(bulkVol * 4 / Math.PI * 3, 1 / 3); // m (fill ~1/3)
    const impellerDiam = bowlDiam * 0.6; // m

    // Impeller tip speed
    const tipSpeed = Math.PI * impellerDiam * N / 60;

    // Stokes deformation number: St_def = ρ × U² × d / (2 × Y)
    // where Y = dynamic yield strength of granule
    const Ygranule = 1e5; // Pa (typical wet granule)
    const stDef = rhoPowder * tipSpeed * tipSpeed * dTarget / 1000 / (2 * Ygranule);

    // Growth regime (Iveson map)
    let regime: string;
    if (isDry) {
      regime = "dry_compaction";
    } else if (stDef < 0.01) {
      regime = "nucleation";
    } else if (stDef < 0.1) {
      regime = "steady_growth";
    } else if (stDef < 1) {
      regime = "induction";
    } else {
      regime = "breakage";
    }

    // Granule size prediction
    let granuleSize: number;
    if (isDry) {
      granuleSize = dTarget; // controlled by roll gap / screen
    } else {
      granuleSize = dTarget * (1 + LS * adhesion) * Math.pow(tipSpeed / 5, -0.2);
    }

    // Binder volume
    const binderVol = isDry ? 0 : batch * LS / (1 + binderConc / 100);

    // Process time
    const processTime = type === "high_shear" ? 5 + batch / 20 :
      type === "fluid_bed" ? 15 + batch / 10 :
      type === "drum" ? 20 + batch / 5 :
      type === "roller_compaction" ? 2 + batch / 50 :
      type === "extrusion" ? 10 + batch / 15 : 10 + batch / 10;

    // Porosity
    const porosity = isDry ? 15 : 25 + (1 - LS) * 20;

    // Friability (inverse of binding strength)
    const friability = isDry ? 5 : Math.max(0.5, 10 - adhesion * 5 - LS * 10);

    const isSafe = tipSpeed < 20 && stDef < 5 && granuleSize > 0.05;

    if (regime === "breakage") recs.push(`Breakage regime (St_def=${stDef.toFixed(2)}) — reduce impeller speed`);
    if (tipSpeed > 15) recs.push(`High tip speed ${tipSpeed.toFixed(1)}m/s — over-granulation risk`);
    if (LS > 0.5 && !isDry) recs.push(`High L/S ratio ${LS} — over-wetting, lump formation risk`);
    if (LS < 0.15 && !isDry) recs.push(`Low L/S ratio ${LS} — under-wetting, poor granule strength`);
    if (type === "fluid_bed" && rhoPowder > 800) recs.push(`Dense powder ${rhoPowder}kg/m³ in fluid bed — fluidization challenging`);
    if (recs.length === 0) recs.push(`Granulation nominal — ${regime}, d=${granuleSize.toFixed(1)}mm, ${processTime.toFixed(0)}min`);

    return {
      stokes_deformation_number: mkAv(Math.round(stDef * 10000) / 10000, "—", stDef * 0.20, "Iveson"),
      growth_regime: mkAv(regime === "nucleation" ? 1 : regime === "steady_growth" ? 2 :
        regime === "induction" ? 3 : regime === "breakage" ? 4 : 0, "regime", 0.5, "St_def_map"),
      granule_size_mm: mkAv(Math.round(granuleSize * 100) / 100, "mm", granuleSize * 0.20, "LS_adhesion"),
      binder_volume_L: mkAv(Math.round(binderVol * 100) / 100, "L", binderVol * 0.10, "LS_ratio"),
      impeller_tip_speed_m_s: mkAv(Math.round(tipSpeed * 100) / 100, "m/s", tipSpeed * 0.05, "geometry"),
      process_time_min: mkAv(Math.round(processTime * 10) / 10, "min", processTime * 0.15, "type_batch"),
      porosity_pct: mkAv(Math.round(porosity * 10) / 10, "%", porosity * 0.15, "LS_method"),
      friability_pct: mkAv(Math.round(friability * 100) / 100, "%", friability * 0.20, "binder_strength"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const granulationProcessEngine = new GranulationProcessEngine();
