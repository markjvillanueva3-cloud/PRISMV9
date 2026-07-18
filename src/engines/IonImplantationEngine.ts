/**
 * IonImplantationEngine — Ion implantation process analysis
 *
 * Models: LSS range theory (projected range, straggle),
 *         dose control, damage cascades, annealing requirements
 * References: Ziegler SRIM/TRIM, Gibbons "Ion Implantation", SEMI M1
 */

export type ImplantSpecies = "B" | "P" | "As" | "Sb" | "N" | "O" | "Ar" | "Si";
export type SubstrateMaterial = "Si" | "GaAs" | "SiC" | "Ge" | "SiO2" | "Si3N4";

export interface IonImplantationInput {
  species?: ImplantSpecies;
  substrate?: SubstrateMaterial;
  energy_keV: number;
  dose_cm2?: number;                  // default 1e15
  beam_current_uA?: number;           // default 100
  tilt_deg?: number;                  // default 7 (to avoid channeling)
  wafer_diameter_mm?: number;         // default 300
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface IonImplantationResult {
  projected_range_nm: AtomicValue;
  straggle_nm: AtomicValue;
  peak_concentration_cm3: AtomicValue;
  implant_time_s: AtomicValue;
  damage_density_dpa: AtomicValue;
  sputter_yield_atoms_ion: AtomicValue;
  anneal_temp_C: AtomicValue;
  sheet_resistance_ohm_sq: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Species: [mass_amu, Z, LSS_range_factor_nm/keV^0.5, straggle_ratio, sputter_factor]
const ION_DATA: Record<ImplantSpecies, [number, number, number, number, number]> = {
  B:  [10.8,  5,  4.5,  0.45, 0.5],
  P:  [31.0,  15, 2.8,  0.40, 1.2],
  As: [74.9,  33, 1.5,  0.35, 2.5],
  Sb: [121.8, 51, 1.0,  0.30, 3.5],
  N:  [14.0,  7,  3.8,  0.42, 0.8],
  O:  [16.0,  8,  3.5,  0.43, 0.9],
  Ar: [39.9,  18, 2.2,  0.38, 2.0],
  Si: [28.1,  14, 2.9,  0.40, 1.5],
};

// Substrate: [Z, density_g/cm3, displacement_energy_eV, lattice_nm]
const SUB_DATA: Record<SubstrateMaterial, [number, number, number, number]> = {
  Si:    [14, 2.33, 15,  0.543],
  GaAs:  [32, 5.32, 10,  0.565],
  SiC:   [14, 3.21, 35,  0.436],
  Ge:    [32, 5.32, 15,  0.566],
  SiO2:  [10, 2.20, 20,  0.000],
  Si3N4: [10, 3.10, 25,  0.000],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class IonImplantationEngine {
  calculate(input: IonImplantationInput): IonImplantationResult {
    const {
      species = "B",
      substrate = "Si",
      energy_keV: E,
      dose_cm2: dose = 1e15,
      beam_current_uA: Ibeam = 100,
      tilt_deg: tilt = 7,
      wafer_diameter_mm: waferD = 300,
    } = input;

    const recs: string[] = [];
    const [ionMass, ionZ, rangeFactor, straggleRatio, sputterFactor] = ION_DATA[species];
    const [subZ, subRho, Ed, lattice] = SUB_DATA[substrate];

    // Projected range (simplified LSS theory)
    const Rp = rangeFactor * Math.pow(E, 0.7) * (14 / subZ) * (2.33 / subRho);

    // Straggle
    const deltaRp = Rp * straggleRatio;

    // Peak concentration (Gaussian profile)
    // Np = dose / (√(2π) × ΔRp)
    const Np = dose / (Math.sqrt(2 * Math.PI) * deltaRp * 1e-7); // cm⁻³

    // Implant time
    const waferArea = Math.PI * Math.pow(waferD / 20, 2); // cm²
    const chargesPerIon = 1; // singly charged
    const beamCurrentA = Ibeam * 1e-6;
    const ionFlux = beamCurrentA / (1.602e-19 * chargesPerIon); // ions/s
    const implantTime = dose * waferArea / ionFlux;

    // Damage (displacements per atom)
    const nuDisp = 0.8 * E * 1000 / (2 * Ed); // Kinchin-Pease: ν = 0.8 × E / (2 × Ed)
    const dpa = dose * nuDisp / (subRho * 6.022e23 / (subZ * 2) * Rp * 1e-7);

    // Sputter yield
    const sputterYield = sputterFactor * Math.pow(E / 100, 0.5);

    // Required anneal temperature
    const annealTemp = species === "B" ? 950 : species === "As" ? 1000 :
      species === "P" ? 900 : species === "Sb" ? 1050 : 800;

    // Sheet resistance (rough: depends on dose and mobility)
    const mobility = species === "B" ? 100 : species === "P" ? 300 :
      species === "As" ? 150 : species === "Sb" ? 100 : 200; // cm²/Vs
    const Rsheet = 1 / (1.602e-19 * dose * mobility);

    const isSafe = E < 3000 && dose < 1e18 && Rp > 1;

    if (E > 500 && species === "B") recs.push(`High energy B ${E}keV — deep implant, consider MeV implanter`);
    if (dose > 1e16) recs.push(`High dose ${dose.toExponential(1)}/cm² — amorphization likely, anneal critical`);
    if (dpa > 1) recs.push(`DPA=${dpa.toFixed(1)} — substrate amorphized, solid-phase epitaxy needed`);
    if (tilt < 5) recs.push(`Low tilt ${tilt}° — channeling risk in crystalline ${substrate}`);
    if (species === "Ar") recs.push(`Ar implant — pre-amorphization only, not doping`);
    if (recs.length === 0) recs.push(`Implant nominal — Rp=${Rp.toFixed(0)}nm, Np=${Np.toExponential(1)}/cm³, ${implantTime.toFixed(1)}s`);

    return {
      projected_range_nm: mkAv(Math.round(Rp * 10) / 10, "nm", Rp * 0.10, "LSS"),
      straggle_nm: mkAv(Math.round(deltaRp * 10) / 10, "nm", deltaRp * 0.15, "LSS"),
      peak_concentration_cm3: mkAv(parseFloat(Np.toExponential(2)), "cm⁻³", Np * 0.10, "Gaussian"),
      implant_time_s: mkAv(Math.round(implantTime * 100) / 100, "s", implantTime * 0.05, "dose_current"),
      damage_density_dpa: mkAv(Math.round(dpa * 1000) / 1000, "dpa", dpa * 0.20, "Kinchin_Pease"),
      sputter_yield_atoms_ion: mkAv(Math.round(sputterYield * 100) / 100, "atoms/ion", sputterYield * 0.25, "empirical"),
      anneal_temp_C: mkAv(annealTemp, "°C", annealTemp * 0.05, "species"),
      sheet_resistance_ohm_sq: mkAv(Math.round(Rsheet * 10) / 10, "Ω/□", Rsheet * 0.15, "dose_mobility"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const ionImplantationEngine = new IonImplantationEngine();
