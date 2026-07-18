/**
 * PhotochemicalEtchingEngine — Photochemical machining (PCM) process analysis
 *
 * Models: Etch rate (Arrhenius), undercut ratio, surface roughness,
 *         etchant concentration dynamics, feature resolution
 * References: Allen "Photochemical Machining", ASTM E694, ISO 4287
 */

export type EtchantType = "FeCl3" | "CuCl2" | "HNO3" | "NaOH" | "HF" | "aqua_regia";
export type PCMMaterial = "stainless" | "copper" | "brass" | "aluminum" | "titanium" | "beryllium_copper" | "Invar";

export interface PhotochemicalEtchingInput {
  etchant?: EtchantType;
  material?: PCMMaterial;
  material_thickness_mm?: number;
  feature_width_mm?: number;
  etchant_temp_C?: number;
  etchant_concentration_pct?: number;
  spray_pressure_bar?: number;
  etch_from?: "one_side" | "both_sides";
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface PhotochemicalEtchingResult {
  etch_rate_um_min: AtomicValue;
  etch_time_min: AtomicValue;
  undercut_ratio: AtomicValue;
  min_feature_mm: AtomicValue;
  surface_roughness_Ra_um: AtomicValue;
  etchant_life_m2: AtomicValue;
  dimensional_tolerance_mm: AtomicValue;
  waste_volume_L_m2: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Material: [base_etch_rate_um/min_in_FeCl3, density_g/cm3, Ea_factor]
const PCM_MAT: Record<PCMMaterial, [number, number, number]> = {
  stainless:       [15,  8.0, 1.2],
  copper:          [50,  8.9, 0.8],
  brass:           [40,  8.5, 0.9],
  aluminum:        [25,  2.7, 1.0],
  titanium:        [5,   4.5, 1.5],
  beryllium_copper:[35,  8.3, 0.9],
  Invar:           [12,  8.1, 1.3],
};

// Etchant: [effectiveness_factor, optimal_conc_pct, optimal_temp_C]
const ETCH_DATA: Record<EtchantType, [number, number, number]> = {
  FeCl3:      [1.0, 42, 50],
  CuCl2:      [1.2, 35, 55],
  HNO3:       [0.8, 30, 40],
  NaOH:       [0.5, 20, 60],
  HF:         [1.5, 10, 25],
  aqua_regia: [1.3, 25, 50],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class PhotochemicalEtchingEngine {
  calculate(input: PhotochemicalEtchingInput): PhotochemicalEtchingResult {
    const {
      etchant = "FeCl3",
      material = "stainless",
      material_thickness_mm: t = 0.5,
      feature_width_mm: fw = 0.3,
      etchant_temp_C: temp = 50,
      etchant_concentration_pct: conc = 42,
      spray_pressure_bar: pressure = 2,
      etch_from = "both_sides",
    } = input;

    const recs: string[] = [];
    const [baseRate, rhoMat, EaFactor] = PCM_MAT[material];
    const [etchEff, optConc, optTemp] = ETCH_DATA[etchant];

    // Etch depth needed
    const etchDepth = etch_from === "both_sides" ? t / 2 : t;

    // Etch rate (Arrhenius + concentration effect)
    const tempEffect = Math.exp(EaFactor * (temp - optTemp) / 30);
    const concEffect = Math.sqrt(conc / optConc);
    const pressureEffect = 1 + (pressure - 1) / 5;
    const etchRate = baseRate * etchEff * tempEffect * concEffect * pressureEffect;

    // Etch time
    const etchTime = etchDepth * 1000 / etchRate;

    // Undercut ratio (lateral etch / vertical etch)
    const undercutRatio = 0.5 + 0.3 * (1 - pressureEffect / 2);

    // Minimum feature width (rule: feature >= material thickness for one-side, t/2 for both)
    const minFeature = etch_from === "both_sides" ? t * 0.8 : t * 1.5;

    // Surface roughness
    const Ra = 0.5 + etchRate / 100 + t * 0.3;

    // Etchant life (m² of material per liter)
    const etchantLife = 1000 / (rhoMat * t * etchRate / 50 + 0.001);

    // Dimensional tolerance
    const tolerance = undercutRatio * etchDepth / 1000 * 2 + 0.01;

    // Waste volume
    const wasteVol = t * rhoMat / 1000 * 2 + 5;

    const isSafe = etchRate > 1 && fw >= minFeature * 0.5 && t < 3;

    if (fw < minFeature) recs.push("Feature " + fw.toFixed(2) + "mm < min " + minFeature.toFixed(2) + "mm — undercut will close feature");
    if (t > 2) recs.push("Thick material " + t + "mm — long etch time, poor tolerance");
    if (material === "titanium" && etchant === "FeCl3") recs.push("FeCl3 slow on titanium — use HF-based etchant");
    if (temp > 60) recs.push("High temp " + temp + "C — etchant decomposition, fume hazard");
    if (conc < optConc * 0.5) recs.push("Low concentration " + conc + "% — slow rate, poor surface finish");
    if (recs.length === 0) recs.push("PCM nominal — " + etchRate.toFixed(0) + "um/min, " + etchTime.toFixed(1) + "min, tol " + (tolerance * 1000).toFixed(0) + "um");

    return {
      etch_rate_um_min: mkAv(Math.round(etchRate * 10) / 10, "um/min", etchRate * 0.10, "Arrhenius"),
      etch_time_min: mkAv(Math.round(etchTime * 10) / 10, "min", etchTime * 0.10, "depth_rate"),
      undercut_ratio: mkAv(Math.round(undercutRatio * 1000) / 1000, "ratio", undercutRatio * 0.15, "pressure"),
      min_feature_mm: mkAv(Math.round(minFeature * 100) / 100, "mm", minFeature * 0.10, "thickness_side"),
      surface_roughness_Ra_um: mkAv(Math.round(Ra * 100) / 100, "um", Ra * 0.20, "rate_thickness"),
      etchant_life_m2: mkAv(Math.round(etchantLife * 100) / 100, "m2/L", etchantLife * 0.20, "mass_balance"),
      dimensional_tolerance_mm: mkAv(Math.round(tolerance * 10000) / 10000, "mm", tolerance * 0.15, "undercut"),
      waste_volume_L_m2: mkAv(Math.round(wasteVol * 10) / 10, "L/m2", wasteVol * 0.20, "rho_t"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const photochemicalEtchingEngine = new PhotochemicalEtchingEngine();
