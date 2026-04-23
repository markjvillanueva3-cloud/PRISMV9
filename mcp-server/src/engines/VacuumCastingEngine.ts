/**
 * VacuumCastingEngine — Vacuum investment/gravity casting process analysis
 *
 * Models: Fill pressure differential, solidification (Chvorinov),
 *         porosity reduction, degassing efficiency, grain refinement
 * References: Campbell "Complete Casting Handbook", ASTM A732, VDG P201
 */

export type VacuumCastMethod = "VIC" | "VPC" | "CLA" | "VRC" | "VIM";
export type CastAlloy = "aluminum" | "steel" | "titanium" | "nickel_super" | "copper" | "magnesium";

export interface VacuumCastingInput {
  method?: VacuumCastMethod;
  alloy?: CastAlloy;
  part_mass_kg: number;
  wall_thickness_mm?: number;       // default 10
  vacuum_level_mbar?: number;       // default 0.1
  mold_preheat_C?: number;          // default 200
  pour_temp_C?: number;             // default auto
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface VacuumCastingResult {
  fill_time_s: AtomicValue;
  solidification_time_s: AtomicValue;
  shrinkage_pct: AtomicValue;
  porosity_pct: AtomicValue;
  grain_size_um: AtomicValue;
  degassing_efficiency_pct: AtomicValue;
  yield_pct: AtomicValue;
  cooling_rate_C_s: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Alloy: [Tmelt_C, density_kg/m3, specific_heat_J/kgK, latent_heat_J/kg, shrinkage_pct, thermal_cond_W/mK]
const ALLOY_DATA: Record<CastAlloy, [number, number, number, number, number, number]> = {
  aluminum:     [660,  2700, 900,  390000, 6.5, 200],
  steel:        [1500, 7800, 500,  270000, 3.0, 50],
  titanium:     [1670, 4500, 520,  295000, 3.5, 20],
  nickel_super: [1350, 8400, 440,  290000, 2.5, 11],
  copper:       [1085, 8900, 385,  205000, 4.5, 390],
  magnesium:    [650,  1740, 1020, 370000, 4.0, 156],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class VacuumCastingEngine {
  calculate(input: VacuumCastingInput): VacuumCastingResult {
    const {
      method = "VIC",
      alloy = "aluminum",
      part_mass_kg: mass,
      wall_thickness_mm: tw = 10,
      vacuum_level_mbar: Pvac = 0.1,
      mold_preheat_C: Tmold = 200,
    } = input;

    const recs: string[] = [];
    const [Tmelt, rho, cp, Lf, shrinkBase, kMat] = ALLOY_DATA[alloy];
    const Tpour = input.pour_temp_C ?? Tmelt * 1.1;

    // Volume and characteristic dimension
    const vol = mass / rho * 1e6; // cm³
    const charDim = tw / 10; // cm

    // Fill time (pressure-driven flow in vacuum)
    const deltaPressure = 1013 - Pvac; // mbar pressure differential
    const fillVelocity = Math.sqrt(2 * deltaPressure * 100 / (rho + 0.001)) * 0.6; // m/s (with losses)
    const fillTime = Math.pow(vol, 1 / 3) / 100 / (fillVelocity + 0.001) * 3;

    // Solidification time (Chvorinov's rule: t = B × (V/A)²)
    const modulusCm = charDim / 2; // simplified V/A
    const chvorinovB = rho * Lf / (kMat * (Tmelt - Tmold + 0.001)) * 0.1;
    const solidTime = chvorinovB * Math.pow(modulusCm, 2);

    // Cooling rate
    const coolingRate = (Tpour - Tmold) / (solidTime + 0.001);

    // Porosity (vacuum dramatically reduces gas porosity)
    const gasPorosity = 2.0 * Pvac / (Pvac + 0.5); // Langmuir-like: saturates at ~2% for atmospheric
    const shrinkPorosity = shrinkBase * 0.05; // micro-shrinkage (feeding under vacuum is good)
    const totalPorosity = gasPorosity + shrinkPorosity;

    // Degassing efficiency
    const degasEff = (1 - Pvac / 1013) * 100;

    // Grain size (function of cooling rate via Hall-Petch)
    const grainSize = 500 / Math.pow(coolingRate + 0.001, 0.3);

    // Casting yield
    const methodYieldMod = method === "VIC" ? 0.70 : method === "VPC" ? 0.75 :
      method === "CLA" ? 0.65 : method === "VRC" ? 0.80 : 0.60;
    const yieldPct = methodYieldMod * 100 * (1 - shrinkBase / 100);

    const isSafe = totalPorosity < 2 && fillTime > 0.5 && Tpour > Tmelt;

    if (Tpour < Tmelt * 1.05) recs.push(`Pour temp ${Tpour.toFixed(0)}°C very close to liquidus — misrun risk`);
    if (Pvac > 10) recs.push(`Vacuum ${Pvac}mbar insufficient — use <1 mbar for reactive alloys`);
    if (alloy === "titanium" && Pvac > 0.01) recs.push(`Titanium requires <0.01 mbar to prevent O₂ pickup`);
    if (alloy === "magnesium") recs.push(`Magnesium — protective atmosphere (SF₆ or SO₂) required`);
    if (tw < 3 && mass > 5) recs.push(`Thin wall ${tw}mm with ${mass}kg — premature freeze risk`);
    if (recs.length === 0) recs.push(`Vacuum cast nominal — fill ${fillTime.toFixed(1)}s, solid ${solidTime.toFixed(0)}s, porosity ${totalPorosity.toFixed(2)}%`);

    return {
      fill_time_s: mkAv(Math.round(fillTime * 100) / 100, "s", fillTime * 0.20, "pressure_flow"),
      solidification_time_s: mkAv(Math.round(solidTime * 10) / 10, "s", solidTime * 0.15, "Chvorinov"),
      shrinkage_pct: mkAv(Math.round(shrinkBase * 100) / 100, "%", shrinkBase * 0.10, "alloy_data"),
      porosity_pct: mkAv(Math.round(totalPorosity * 1000) / 1000, "%", totalPorosity * 0.25, "gas_shrink"),
      grain_size_um: mkAv(Math.round(grainSize * 10) / 10, "μm", grainSize * 0.20, "cooling_rate"),
      degassing_efficiency_pct: mkAv(Math.round(degasEff * 100) / 100, "%", degasEff * 0.05, "Pvac_ratio"),
      yield_pct: mkAv(Math.round(yieldPct * 10) / 10, "%", yieldPct * 0.10, "method_shrink"),
      cooling_rate_C_s: mkAv(Math.round(coolingRate * 100) / 100, "°C/s", coolingRate * 0.15, "T_solidTime"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const vacuumCastingEngine = new VacuumCastingEngine();
