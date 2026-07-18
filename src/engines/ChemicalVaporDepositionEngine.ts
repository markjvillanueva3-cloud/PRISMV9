/**
 * ChemicalVaporDepositionEngine — CVD process analysis
 *
 * Models: Arrhenius growth rate, mass transport vs surface reaction limited,
 *         gas-phase depletion, film conformality, precursor utilization
 * References: Pierson "Handbook of CVD", Hitchman & Jensen, SEMI E10
 */

export type CVDVariant = "APCVD" | "LPCVD" | "PECVD" | "MOCVD" | "HDPCVD" | "SACVD";
export type CVDFilm = "poly_Si" | "SiO2" | "Si3N4" | "SiC" | "GaN" | "diamond" | "graphene" | "W";

export interface ChemicalVaporDepositionInput {
  variant?: CVDVariant;
  film?: CVDFilm;
  target_thickness_nm: number;
  substrate_temp_C?: number;          // default variant-dependent
  pressure_Torr?: number;             // default variant-dependent
  gas_flow_sccm?: number;             // default 500
  plasma_power_W?: number;            // for PECVD/HDPCVD, default 500
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ChemicalVaporDepositionResult {
  growth_rate_nm_min: AtomicValue;
  process_time_min: AtomicValue;
  uniformity_pct: AtomicValue;
  precursor_utilization_pct: AtomicValue;
  conformality_pct: AtomicValue;
  activation_energy_eV: AtomicValue;
  gas_consumption_mol: AtomicValue;
  byproduct_rate_sccm: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Film: [Ea_eV, pre_exponential_nm/min, density_g/cm3, mol_weight_g/mol]
const CVD_FILM: Record<CVDFilm, [number, number, number, number]> = {
  poly_Si:  [1.7,  1e10, 2.33, 28.1],
  SiO2:     [0.7,  1e5,  2.20, 60.1],
  Si3N4:    [1.8,  1e11, 3.10, 140.3],
  SiC:      [2.0,  1e12, 3.21, 40.1],
  GaN:      [2.5,  1e14, 6.15, 83.7],
  diamond:  [3.0,  1e16, 3.51, 12.0],
  graphene: [2.2,  1e13, 2.26, 12.0],
  W:        [0.5,  1e4,  19.3, 183.8],
};

// Variant: [default_temp_C, default_pressure_Torr, transport_factor, conformality_base]
const CVD_VAR: Record<CVDVariant, [number, number, number, number]> = {
  APCVD:  [400,  760,   0.5, 40],
  LPCVD:  [700,  0.5,   1.0, 95],
  PECVD:  [300,  1.0,   0.8, 70],
  MOCVD:  [600,  100,   0.7, 60],
  HDPCVD: [350,  0.01,  0.9, 80],
  SACVD:  [400,  200,   0.85, 90],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ChemicalVaporDepositionEngine {
  calculate(input: ChemicalVaporDepositionInput): ChemicalVaporDepositionResult {
    const {
      variant = "LPCVD",
      film = "poly_Si",
      target_thickness_nm: tTarget,
      gas_flow_sccm: flow = 500,
      plasma_power_W: plasma = 500,
    } = input;

    const recs: string[] = [];
    const [Ea, A0, filmRho, molW] = CVD_FILM[film];
    const [defaultT, defaultP, transportFactor, confBase] = CVD_VAR[variant];

    const Tsub = input.substrate_temp_C ?? defaultT;
    const pressure = input.pressure_Torr ?? defaultP;

    // Arrhenius growth rate: R = A0 × exp(-Ea/kT)
    const kB_eV = 8.617e-5; // eV/K
    const TK = Tsub + 273.15;
    let growthRate = A0 * Math.exp(-Ea / (kB_eV * TK));

    // Plasma enhancement (reduces effective Ea)
    if (variant === "PECVD" || variant === "HDPCVD") {
      const plasmaFactor = 1 + plasma / 500;
      growthRate *= plasmaFactor;
    }

    // Pressure effect (mass transport limitation at high pressure)
    const pressureEffect = variant === "LPCVD" ? 1.0 :
      Math.min(1.0, Math.sqrt(pressure / defaultP)) * transportFactor;
    growthRate *= pressureEffect;

    // Clamp to reasonable range
    growthRate = Math.max(0.1, Math.min(growthRate, 500));

    // Process time
    const processTime = tTarget / growthRate;

    // Uniformity (LPCVD best, APCVD worst)
    const uniformity = Math.min(99.5, confBase + (variant === "LPCVD" ? 3 : 0));

    // Precursor utilization
    const utilization = variant === "LPCVD" ? 50 : variant === "APCVD" ? 10 :
      variant === "PECVD" ? 30 : variant === "MOCVD" ? 20 : 40;

    // Conformality
    const conformality = confBase;

    // Gas consumption (moles of precursor consumed)
    const filmVolCm3 = tTarget * 1e-7 * 300 * 0.1; // assuming 300mm wafer, simplified
    const filmMassG = filmVolCm3 * filmRho;
    const molesConsumed = filmMassG / molW;

    // Byproduct rate (HCl, H2, etc.)
    const byproductRate = flow * (1 - utilization / 100) * 0.5;

    const isSafe = growthRate > 0.1 && uniformity > 85 && Tsub < 1200;

    if (Tsub > 900 && variant === "PECVD") recs.push(`PECVD at ${Tsub}°C defeats low-temp advantage — use LPCVD`);
    if (variant === "APCVD" && tTarget > 500) recs.push(`APCVD uniformity poor for thick films — consider LPCVD`);
    if (film === "diamond" && variant !== "PECVD" && variant !== "HDPCVD") recs.push(`Diamond CVD requires plasma activation`);
    if (film === "GaN" && variant !== "MOCVD") recs.push(`GaN typically grown by MOCVD — ${variant} unusual`);
    if (processTime > 300) recs.push(`Long process ${processTime.toFixed(0)}min — consider higher temp or plasma`);
    if (recs.length === 0) recs.push(`CVD nominal — ${growthRate.toFixed(1)}nm/min, ${processTime.toFixed(0)}min, ${uniformity.toFixed(1)}% uniform`);

    return {
      growth_rate_nm_min: mkAv(Math.round(growthRate * 100) / 100, "nm/min", growthRate * 0.10, "Arrhenius"),
      process_time_min: mkAv(Math.round(processTime * 10) / 10, "min", processTime * 0.10, "t_rate"),
      uniformity_pct: mkAv(Math.round(uniformity * 10) / 10, "%", uniformity * 0.03, "variant"),
      precursor_utilization_pct: mkAv(utilization, "%", utilization * 0.15, "variant"),
      conformality_pct: mkAv(conformality, "%", conformality * 0.10, "variant_transport"),
      activation_energy_eV: mkAv(Ea, "eV", Ea * 0.05, "film_data"),
      gas_consumption_mol: mkAv(Math.round(molesConsumed * 1e6) / 1e6, "mol", molesConsumed * 0.20, "mass_balance"),
      byproduct_rate_sccm: mkAv(Math.round(byproductRate * 10) / 10, "sccm", byproductRate * 0.20, "utilization"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const chemicalVaporDepositionEngine = new ChemicalVaporDepositionEngine();
