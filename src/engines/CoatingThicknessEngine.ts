/**
 * CoatingThicknessEngine — Surface coating thickness design
 *
 * Models: Faraday's law (electroplating), DFT prediction,
 *         coverage calculation, corrosion protection life
 * References: ASTM B117, ISO 2808, SSPC standards
 */

export type CoatingType = "zinc_plate" | "nickel_plate" | "chrome_plate" | "anodize" | "powder_coat" | "paint" | "hot_dip_galv" | "pvd" | "dlc";
export type SubstrateType = "steel" | "aluminum" | "copper" | "stainless" | "plastic";

export interface CoatingThicknessInput {
  coating_type?: CoatingType;
  substrate?: SubstrateType;
  target_thickness_um: number;
  surface_area_m2?: number;           // default 1
  // Electroplating params
  current_density_A_dm2?: number;     // default 3
  plating_time_min?: number;          // auto-calc if thickness given
  // Environment
  corrosion_class?: string;           // C1-C5, default C3
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface CoatingThicknessResult {
  actual_thickness_um: AtomicValue;
  plating_time_min: AtomicValue;
  coating_mass_g_m2: AtomicValue;
  corrosion_life_years: AtomicValue;
  hardness_HV: AtomicValue;
  adhesion_class: AtomicValue;
  surface_roughness_change_um: AtomicValue;
  cost_factor: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Coating data: [density_g/cm³, equiv_weight, current_eff, hardness_HV, corr_rate_um/yr, cost_factor]
const COATING_DATA: Record<CoatingType, [number, number, number, number, number, number]> = {
  zinc_plate:    [7.14, 32.7, 0.95, 70,  2.0, 1.0],
  nickel_plate:  [8.90, 29.4, 0.95, 300, 0.5, 2.5],
  chrome_plate:  [7.19, 17.3, 0.15, 900, 0.1, 4.0],
  anodize:       [3.95, 9.0,  0.60, 350, 0.3, 1.5],
  powder_coat:   [1.20, 0,    0,    80,  5.0, 1.2],
  paint:         [1.30, 0,    0,    10,  8.0, 0.8],
  hot_dip_galv:  [7.14, 0,    0,    60,  1.5, 1.8],
  pvd:           [4.50, 0,    0,    2500,0.05,8.0],
  dlc:           [3.50, 0,    0,    3000,0.02,10.0],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class CoatingThicknessEngine {
  calculate(input: CoatingThicknessInput): CoatingThicknessResult {
    const {
      coating_type = "zinc_plate",
      substrate = "steel",
      target_thickness_um: t,
      surface_area_m2: A = 1,
      current_density_A_dm2: J = 3,
      corrosion_class = "C3",
    } = input;

    const recs: string[] = [];
    const [density, eqWt, currEff, hardness, corrRate, costFactor] = COATING_DATA[coating_type];

    // Plating time (Faraday's law for electroplated coatings)
    let platingTime: number;
    if (eqWt > 0 && currEff > 0) {
      // t_um = (J × time × M × η) / (n × F × ρ) × 10000
      // time_s = t_um × ρ × F / (J × M × η × 10000)
      // Simplified: time_min = t_um × density / (J × eqWt × currEff × 0.0373)
      platingTime = input.plating_time_min ?? (t * density) / (J * eqWt * currEff * 0.0373);
    } else {
      platingTime = input.plating_time_min ?? t / 5; // non-electro estimate
    }

    // Coating mass
    const massPerM2 = t / 1000 * density * 1000; // g/m²

    // Corrosion life
    const envFactor = corrosion_class === "C1" ? 0.3 : corrosion_class === "C2" ? 0.6 :
      corrosion_class === "C3" ? 1.0 : corrosion_class === "C4" ? 2.0 : 4.0;
    const corrLife = t / (corrRate * envFactor);

    // Adhesion class (1=best, 5=worst)
    let adhesion = 2;
    if (coating_type === "anodize" && substrate === "aluminum") adhesion = 1;
    else if (coating_type === "pvd" || coating_type === "dlc") adhesion = 2;
    else if (substrate === "plastic") adhesion = 4;

    // Surface roughness change
    const roughnessChange = coating_type === "chrome_plate" ? -0.2 : // chrome smooths
      coating_type === "powder_coat" ? 2.0 : coating_type === "hot_dip_galv" ? 5.0 : 0.5;

    const isSafe = t > 0 && corrLife > 1;

    if (corrLife < 5) recs.push(`Short corrosion life ${corrLife.toFixed(1)}yr in ${corrosion_class} — increase thickness`);
    if (coating_type === "anodize" && substrate !== "aluminum") recs.push(`Anodizing requires aluminum substrate`);
    if (t > 100 && coating_type === "chrome_plate") recs.push(`Thick chrome (${t}µm) — risk of cracking, use multiple layers`);
    if (t < 5 && coating_type.includes("plate")) recs.push(`Very thin plating ${t}µm — pinhole risk`);
    if (recs.length === 0) recs.push(`${coating_type} nominal — ${t}µm, life=${corrLife.toFixed(1)}yr, ${massPerM2.toFixed(0)}g/m²`);

    return {
      actual_thickness_um: mkAv(t, "µm", t * 0.10, "target"),
      plating_time_min: mkAv(Math.round(platingTime * 10) / 10, "min", platingTime * 0.10, "faraday"),
      coating_mass_g_m2: mkAv(Math.round(massPerM2 * 10) / 10, "g/m²", massPerM2 * 0.05, "density"),
      corrosion_life_years: mkAv(Math.round(corrLife * 10) / 10, "years", corrLife * 0.20, "rate_based"),
      hardness_HV: mkAv(hardness, "HV", hardness * 0.10, "material_data"),
      adhesion_class: mkAv(adhesion, "class", 0, "substrate_match"),
      surface_roughness_change_um: mkAv(roughnessChange, "µm", Math.abs(roughnessChange) * 0.30, "empirical"),
      cost_factor: mkAv(costFactor, "ratio", costFactor * 0.10, "relative"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const coatingThicknessEngine = new CoatingThicknessEngine();
