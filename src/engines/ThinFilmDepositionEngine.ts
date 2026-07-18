/**
 * ThinFilmDepositionEngine — PVD/CVD/ALD thin film process analysis
 *
 * Models: Deposition rate, film stress (Stoney), step coverage,
 *         nucleation density, uniformity, thermal budget
 * References: Ohring "Materials Science of Thin Films", Mattox, SEMI standards
 */

export type DepositionMethod = "PVD_sputter" | "PVD_evap" | "PECVD" | "LPCVD" | "ALD" | "MBE";
export type FilmMaterial = "SiO2" | "Si3N4" | "TiN" | "Al2O3" | "TiO2" | "Cu" | "W" | "Al";

export interface ThinFilmDepositionInput {
  method?: DepositionMethod;
  film?: FilmMaterial;
  target_thickness_nm: number;
  substrate_temp_C?: number;         // default method-dependent
  chamber_pressure_mTorr?: number;   // default method-dependent
  power_W?: number;                  // default 300 for sputtering
  substrate_diameter_mm?: number;    // default 300 (12" wafer)
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ThinFilmDepositionResult {
  deposition_rate_nm_min: AtomicValue;
  process_time_min: AtomicValue;
  film_stress_MPa: AtomicValue;
  uniformity_pct: AtomicValue;
  step_coverage_pct: AtomicValue;
  roughness_nm: AtomicValue;
  thermal_budget_C_min: AtomicValue;
  gas_consumption_sccm: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Film: [density_g/cm3, Young's_GPa, thermal_expansion_ppm/K, bulk_stress_factor]
const FILM_DATA: Record<FilmMaterial, [number, number, number, number]> = {
  SiO2:  [2.20, 70,   0.5,  -300],  // compressive
  Si3N4: [3.10, 250,  3.3,  1000],  // tensile (LPCVD), compressive (PECVD)
  TiN:   [5.22, 600,  9.4,  -2000], // compressive
  Al2O3: [3.95, 370,  8.1,  500],
  TiO2:  [4.23, 230,  9.0,  -500],
  Cu:    [8.96, 130,  17.0, 200],
  W:     [19.3, 400,  4.5,  1500],
  Al:    [2.70, 70,   23.6, 300],
};

// Method: [base_rate_nm/min, base_temp_C, base_pressure_mTorr, uniformity_base%, step_coverage_base%]
const METHOD_DATA: Record<DepositionMethod, [number, number, number, number, number]> = {
  PVD_sputter: [30,  200,  5,    92, 20],
  PVD_evap:    [50,  100,  0.01, 85, 10],
  PECVD:       [100, 300,  500,  95, 60],
  LPCVD:       [5,   700,  200,  98, 95],
  ALD:         [0.1, 250,  100,  99, 98],  // per cycle → nm/min with ~1Å/cycle
  MBE:         [1,   500,  0.001,96, 15],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ThinFilmDepositionEngine {
  calculate(input: ThinFilmDepositionInput): ThinFilmDepositionResult {
    const {
      method = "PVD_sputter",
      film = "TiN",
      target_thickness_nm: tTarget,
      power_W: power = 300,
      substrate_diameter_mm: subDiam = 300,
    } = input;

    const recs: string[] = [];
    const [filmDensity, filmE, filmCTE, stressFactor] = FILM_DATA[film];
    const [baseRate, defaultTemp, defaultPressure, uniBase, stepBase] = METHOD_DATA[method];

    const Tsub = input.substrate_temp_C ?? defaultTemp;
    const pressure = input.chamber_pressure_mTorr ?? defaultPressure;

    // Deposition rate (scales with power for sputtering, temp for CVD)
    let depRate: number;
    if (method === "PVD_sputter") {
      depRate = baseRate * (power / 300) * Math.sqrt(filmDensity / 5);
    } else if (method === "PVD_evap" || method === "MBE") {
      depRate = baseRate * Math.exp((Tsub - defaultTemp) / 500);
    } else if (method === "ALD") {
      // ALD: ~1 Å/cycle, ~6 cycles/min typical
      depRate = 0.6; // nm/min (6 cycles/min × 0.1 nm/cycle)
    } else {
      // CVD: Arrhenius rate dependence
      depRate = baseRate * Math.exp((Tsub - defaultTemp) / 200);
    }

    // Process time
    const processTime = tTarget / (depRate + 0.001);

    // Film stress (Stoney equation simplified + thermal mismatch)
    const thermalStress = filmE * 1000 * (filmCTE - 2.6) * 1e-6 * (Tsub - 25); // MPa (Si substrate CTE=2.6)
    const intrinsicStress = stressFactor * (method === "PECVD" ? -0.5 : 1.0); // PECVD can tune stress
    const totalStress = thermalStress + intrinsicStress;

    // Uniformity (depends on geometry and method)
    const uniformity = uniBase * (1 - (subDiam - 200) / 2000); // degrades slightly for larger wafers

    // Step coverage
    const stepCoverage = stepBase;

    // Surface roughness (scales with thickness)
    const roughness = 0.3 + tTarget / 1000 * (method === "ALD" ? 0.1 : method === "PVD_evap" ? 2.0 : 0.5);

    // Thermal budget
    const thermalBudget = Tsub * processTime;

    // Gas consumption estimate
    const gasFlow = method === "ALD" ? 50 : method === "PECVD" ? 200 :
      method === "LPCVD" ? 100 : method === "PVD_sputter" ? 30 : 10;

    const isSafe = Math.abs(totalStress) < 5000 && uniformity > 80 && processTime < 600;

    if (Math.abs(totalStress) > 2000) recs.push(`High film stress ${totalStress.toFixed(0)}MPa — wafer bow risk`);
    if (tTarget > 1000 && method === "ALD") recs.push(`ALD for ${tTarget}nm is very slow (${processTime.toFixed(0)}min) — consider CVD`);
    if (Tsub > 400 && (film === "Cu" || film === "Al")) recs.push(`${film} at ${Tsub}°C — hillock/agglomeration risk`);
    if (method === "PVD_evap" && film === "W") recs.push(`W evaporation requires e-beam — very high Tmelt`);
    if (uniformity < 90) recs.push(`Uniformity ${uniformity.toFixed(1)}% below spec — optimize target-substrate geometry`);
    if (recs.length === 0) recs.push(`Deposition nominal — ${depRate.toFixed(1)}nm/min, ${processTime.toFixed(0)}min, stress ${totalStress.toFixed(0)}MPa`);

    return {
      deposition_rate_nm_min: mkAv(Math.round(depRate * 100) / 100, "nm/min", depRate * 0.10, "method_power"),
      process_time_min: mkAv(Math.round(processTime * 10) / 10, "min", processTime * 0.10, "t_rate"),
      film_stress_MPa: mkAv(Math.round(totalStress), "MPa", Math.abs(totalStress) * 0.20, "Stoney_thermal"),
      uniformity_pct: mkAv(Math.round(uniformity * 10) / 10, "%", uniformity * 0.05, "method_geometry"),
      step_coverage_pct: mkAv(stepCoverage, "%", stepCoverage * 0.10, "method"),
      roughness_nm: mkAv(Math.round(roughness * 100) / 100, "nm", roughness * 0.25, "thickness_method"),
      thermal_budget_C_min: mkAv(Math.round(thermalBudget), "°C·min", thermalBudget * 0.10, "T_time"),
      gas_consumption_sccm: mkAv(gasFlow, "sccm", gasFlow * 0.15, "method"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const thinFilmDepositionEngine = new ThinFilmDepositionEngine();
