/**
 * SputteringProcessEngine — Physical vapor deposition by sputtering
 *
 * Models: Sputter yield (Sigmund theory), deposition rate,
 *         target utilization, film composition, magnetron efficiency
 * References: Sigmund 1969, Wasa & Hayakawa, Chapman "Glow Discharge Processes"
 */

export type SputterMethod = "DC" | "RF" | "DC_magnetron" | "RF_magnetron" | "HiPIMS" | "reactive";
export type TargetMaterial = "Ti" | "Al" | "Cu" | "W" | "Cr" | "Ta" | "ITO" | "SiO2";

export interface SputteringProcessInput {
  method?: SputterMethod;
  target?: TargetMaterial;
  gas?: "Ar" | "Kr" | "Ne" | "Xe";
  power_W?: number;                   // default 500
  pressure_mTorr?: number;            // default 5
  target_substrate_mm?: number;       // default 100
  substrate_diameter_mm?: number;     // default 300
  target_thickness_nm?: number;       // desired film thickness, default 200
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface SputteringProcessResult {
  sputter_yield: AtomicValue;
  deposition_rate_nm_min: AtomicValue;
  process_time_min: AtomicValue;
  target_utilization_pct: AtomicValue;
  film_density_pct: AtomicValue;
  energy_per_atom_eV: AtomicValue;
  power_density_W_cm2: AtomicValue;
  mean_free_path_mm: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Target: [Z, mass_amu, surface_binding_eV, density_g/cm3, thermal_cond_W/mK]
const TARGET_DATA: Record<TargetMaterial, [number, number, number, number, number]> = {
  Ti:   [22, 47.9,  4.89, 4.50,  20],
  Al:   [13, 27.0,  3.36, 2.70,  200],
  Cu:   [29, 63.5,  3.50, 8.96,  390],
  W:    [74, 183.8, 8.68, 19.3,  170],
  Cr:   [24, 52.0,  4.12, 7.19,  94],
  Ta:   [73, 180.9, 8.10, 16.6,  57],
  ITO:  [50, 120.0, 3.50, 7.14,  10],
  SiO2: [14, 60.1,  4.70, 2.20,  1.4],
};

// Gas: [mass_amu, cross_section_A2]
const GAS_DATA: Record<string, [number, number]> = {
  Ar: [39.9, 3.7],
  Kr: [83.8, 4.2],
  Ne: [20.2, 2.8],
  Xe: [131.3, 4.9],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class SputteringProcessEngine {
  calculate(input: SputteringProcessInput): SputteringProcessResult {
    const {
      method = "DC_magnetron",
      target = "Ti",
      gas = "Ar",
      power_W: power = 500,
      pressure_mTorr: pressure = 5,
      target_substrate_mm: tsDist = 100,
      substrate_diameter_mm: subDiam = 300,
      target_thickness_nm: filmTarget = 200,
    } = input;

    const recs: string[] = [];
    const [targetZ, targetMass, Usb, targetRho, targetK] = TARGET_DATA[target];
    const [gasMass, gasCrossSection] = GAS_DATA[gas];

    // Sputter yield (Sigmund theory simplified)
    // Y ∝ (4 × M1 × M2 / (M1+M2)²) × E / Usb × α
    const massTransfer = 4 * gasMass * targetMass / Math.pow(gasMass + targetMass, 2);
    const alpha = 0.2 + 0.1 * (targetMass / gasMass); // angular factor
    const ionEnergy = 300 + power / 10; // eV (approximate)
    const sputterYield = massTransfer * alpha * ionEnergy / Usb * 0.04;

    // Magnetron enhancement
    const magnetronFactor = method === "DC_magnetron" || method === "RF_magnetron" ? 3.0 :
      method === "HiPIMS" ? 2.0 : 1.0;

    // Ion current (from power and voltage)
    const dischVoltage = 400; // V typical
    const ionCurrent = power / dischVoltage; // A

    // Deposition rate
    const atomsPerSecond = ionCurrent / 1.602e-19 * sputterYield * magnetronFactor;
    const targetArea = Math.PI * Math.pow(subDiam / 2 / 10, 2); // cm²
    const filmDensityAtoms = targetRho * 6.022e23 / targetMass; // atoms/cm³
    const depRateNmMin = atomsPerSecond / (targetArea * filmDensityAtoms) * 1e7 * 60;
    const clampedRate = Math.max(0.5, Math.min(depRateNmMin, 200));

    // Process time
    const processTime = filmTarget / clampedRate;

    // Target utilization
    const utilization = method === "DC_magnetron" || method === "RF_magnetron" ? 30 :
      method === "HiPIMS" ? 35 : 50; // magnetron has racetrack erosion

    // Film density (higher at lower pressure, higher power)
    const filmDensity = Math.min(100, 85 + power / 500 * 10 - pressure / 10);

    // Energy per deposited atom
    const energyPerAtom = power / (atomsPerSecond + 0.001);

    // Power density on target
    const targetDiam = subDiam * 0.8; // target slightly smaller than substrate
    const targetAreaCm2 = Math.PI * Math.pow(targetDiam / 20, 2);
    const powerDensity = power / targetAreaCm2;

    // Mean free path: λ = kT / (√2 × π × d² × P)
    const pressurePa = pressure * 0.133;
    const dCollision = gasCrossSection * 1e-10; // m
    const nDensity = pressurePa / (1.38e-23 * 300); // number density
    const mfp = 1 / (Math.sqrt(2) * Math.PI * dCollision * dCollision * nDensity);
    const mfpMm = mfp * 1000;

    const isSafe = powerDensity < 50 && pressure > 0.5 && clampedRate > 0;

    if (powerDensity > 30) recs.push(`High power density ${powerDensity.toFixed(1)}W/cm² — target overheating risk`);
    if (target === "SiO2" && method === "DC") recs.push(`SiO₂ is insulating — use RF sputtering`);
    if (target === "ITO" && method === "DC") recs.push(`ITO partially conducting — DC possible but RF preferred`);
    if (method === "HiPIMS") recs.push(`HiPIMS — high ionization, excellent adhesion but lower rate`);
    if (mfpMm < tsDist) recs.push(`MFP ${mfpMm.toFixed(0)}mm < distance ${tsDist}mm — thermalization, reduce pressure`);
    if (recs.length === 0) recs.push(`Sputter nominal — ${clampedRate.toFixed(1)}nm/min, Y=${sputterYield.toFixed(2)}, ${processTime.toFixed(0)}min`);

    return {
      sputter_yield: mkAv(Math.round(sputterYield * 1000) / 1000, "atoms/ion", sputterYield * 0.15, "Sigmund"),
      deposition_rate_nm_min: mkAv(Math.round(clampedRate * 100) / 100, "nm/min", clampedRate * 0.10, "yield_current"),
      process_time_min: mkAv(Math.round(processTime * 10) / 10, "min", processTime * 0.10, "t_rate"),
      target_utilization_pct: mkAv(utilization, "%", utilization * 0.10, "method"),
      film_density_pct: mkAv(Math.round(filmDensity * 10) / 10, "%", filmDensity * 0.05, "pressure_power"),
      energy_per_atom_eV: mkAv(Math.round(energyPerAtom * 100) / 100, "eV", energyPerAtom * 0.20, "P_flux"),
      power_density_W_cm2: mkAv(Math.round(powerDensity * 100) / 100, "W/cm²", powerDensity * 0.05, "P_A"),
      mean_free_path_mm: mkAv(Math.round(mfpMm * 10) / 10, "mm", mfpMm * 0.10, "kinetic_theory"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const sputteringProcessEngine = new SputteringProcessEngine();
