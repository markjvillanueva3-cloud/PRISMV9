/**
 * AdhesiveBondingEngine — Adhesive bond joint analysis
 *
 * Models: Volkersen shear lag, Goland-Reissner peel stress,
 *         overlap optimization, safety factors
 * References: Adams & Wake, ASTM D1002, D3163
 */

export type AdhesiveType = "epoxy" | "acrylic" | "polyurethane" | "cyanoacrylate" | "silicone" | "anaerobic";
export type JointConfig = "single_lap" | "double_lap" | "scarf" | "butt" | "stepped_lap";

export interface AdhesiveBondingInput {
  overlap_length_mm: number;
  bond_width_mm: number;
  adherend_thickness_mm: number;
  applied_load_N: number;
  adhesive_type?: AdhesiveType;
  joint_config?: JointConfig;
  adhesive_shear_strength_MPa?: number;   // override
  adherend_modulus_GPa?: number;           // default 200 (steel)
  adhesive_modulus_MPa?: number;           // default 2000
  temperature_C?: number;                  // default 25
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface AdhesiveBondingResult {
  average_shear_stress_MPa: AtomicValue;
  peak_shear_stress_MPa: AtomicValue;
  peel_stress_MPa: AtomicValue;
  shear_safety_factor: AtomicValue;
  optimal_overlap_mm: AtomicValue;
  joint_efficiency_pct: AtomicValue;
  shear_lag_factor: AtomicValue;
  bond_area_mm2: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Adhesive properties: [shear_strength_MPa, peel_strength_MPa, max_temp_C, modulus_MPa]
const ADHESIVE_PROPS: Record<AdhesiveType, [number, number, number, number]> = {
  epoxy:          [25, 8, 150, 2500],
  acrylic:        [20, 6, 120, 1800],
  polyurethane:   [12, 10, 80, 500],
  cyanoacrylate:  [18, 3, 80, 3000],
  silicone:       [3, 2, 250, 50],
  anaerobic:      [20, 4, 150, 2000],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class AdhesiveBondingEngine {
  calculate(input: AdhesiveBondingInput): AdhesiveBondingResult {
    const {
      overlap_length_mm: L,
      bond_width_mm: w,
      adherend_thickness_mm: t,
      applied_load_N: P,
      adhesive_type = "epoxy",
      joint_config = "single_lap",
      adherend_modulus_GPa: Ea = 200,
      temperature_C: T = 25,
    } = input;

    const recs: string[] = [];
    const [tauMax, peelStr, maxTemp, Gmod] = ADHESIVE_PROPS[adhesive_type];
    const shearStr = input.adhesive_shear_strength_MPa ?? tauMax;
    const Ga = input.adhesive_modulus_MPa ?? Gmod;

    // Bond area
    const bondArea = L * w; // mm²

    // Average shear stress
    const tauAvg = P / bondArea; // MPa

    // Volkersen shear lag factor
    const EaP = Ea * 1000; // MPa
    const ta = 0.2; // adhesive thickness mm (typical)
    const lambda = Math.sqrt(Ga / (EaP * t * ta));
    const shearLag = lambda * L / (2 * Math.tanh(lambda * L / 2));
    const tauPeak = tauAvg * Math.max(shearLag, 1);

    // Peel stress (Goland-Reissner simplified)
    const peelFactor = joint_config === "single_lap" ? 1.5 : joint_config === "double_lap" ? 0.5 : 0.3;
    const peelStress = tauAvg * peelFactor * t / L * 10;

    // Safety factor
    const sfShear = shearStr / Math.max(tauPeak, 0.001);

    // Optimal overlap (rule of thumb: 25× adherend thickness for metals)
    const optimalOverlap = joint_config === "scarf" ? t / Math.tan(5 * Math.PI / 180) : 25 * t;

    // Joint efficiency (vs base material yield)
    const baseYield = Ea > 100 ? 250 : 70; // steel vs aluminum estimate
    const jointEff = (shearStr * L) / (baseYield * t) * 100;

    // Temperature derating
    const tempFactor = T > maxTemp ? 0.1 : T > maxTemp * 0.7 ? 0.7 : 1.0;

    const isSafe = sfShear > 2.0 && T < maxTemp && peelStress < peelStr;

    if (sfShear < 2.0) recs.push(`Low safety factor ${sfShear.toFixed(2)} — increase overlap or width`);
    if (L < optimalOverlap * 0.5) recs.push(`Short overlap ${L}mm vs optimal ${optimalOverlap.toFixed(0)}mm`);
    if (L > optimalOverlap * 2) recs.push(`Excessive overlap — diminishing returns beyond ${optimalOverlap.toFixed(0)}mm`);
    if (T > maxTemp * 0.8) recs.push(`Temperature ${T}°C approaching limit ${maxTemp}°C for ${adhesive_type}`);
    if (peelStress > peelStr * 0.8) recs.push(`High peel stress — add peel stoppers or change to double lap`);
    if (tempFactor < 1) recs.push(`Temperature derating factor ${tempFactor} — strength reduced`);
    if (recs.length === 0) recs.push(`Bond nominal — τ_avg=${tauAvg.toFixed(1)}MPa, SF=${sfShear.toFixed(1)}, overlap OK`);

    return {
      average_shear_stress_MPa: mkAv(Math.round(tauAvg * 100) / 100, "MPa", tauAvg * 0.05, "load_area"),
      peak_shear_stress_MPa: mkAv(Math.round(tauPeak * 100) / 100, "MPa", tauPeak * 0.15, "volkersen"),
      peel_stress_MPa: mkAv(Math.round(peelStress * 100) / 100, "MPa", peelStress * 0.20, "goland_reissner"),
      shear_safety_factor: mkAv(Math.round(sfShear * 100) / 100, "ratio", sfShear * 0.10, "strength_ratio"),
      optimal_overlap_mm: mkAv(Math.round(optimalOverlap), "mm", optimalOverlap * 0.15, "rule_of_thumb"),
      joint_efficiency_pct: mkAv(Math.round(jointEff * 10) / 10, "%", jointEff * 0.15, "comparative"),
      shear_lag_factor: mkAv(Math.round(shearLag * 1000) / 1000, "ratio", shearLag * 0.10, "volkersen"),
      bond_area_mm2: mkAv(bondArea, "mm²", 0, "geometry"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const adhesiveBondingEngine = new AdhesiveBondingEngine();
