/**
 * CrystallizationEngine — Industrial crystallization process analysis
 *
 * Models: MSMPR population balance, supersaturation driving force,
 *         nucleation/growth kinetics, crystal size distribution, yield
 * References: Mullin, Mersmann, Randolph & Larson MSMPR model
 */

export type CrystallizerType = "MSMPR" | "batch_cooling" | "evaporative" | "reactive" | "antisolvent" | "melt";
export type SoluteType = "NaCl" | "KCl" | "sucrose" | "citric_acid" | "ammonium_sulfate" | "paracetamol";

export interface CrystallizationInput {
  type?: CrystallizerType;
  solute?: SoluteType;
  feed_concentration_g_L: number;
  saturation_concentration_g_L?: number;  // default from solute data
  feed_rate_L_h?: number;                 // default 100
  temperature_C?: number;                 // default 25
  cooling_rate_C_h?: number;              // default 10 (for cooling type)
  residence_time_min?: number;            // default 60
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface CrystallizationResult {
  yield_pct: AtomicValue;
  crystal_production_kg_h: AtomicValue;
  mean_crystal_size_um: AtomicValue;
  supersaturation_ratio: AtomicValue;
  nucleation_rate_per_m3_s: AtomicValue;
  growth_rate_um_min: AtomicValue;
  cv_size_distribution: AtomicValue;
  specific_power_kW_m3: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Solute data: [saturation_g_L_at_25C, dC/dT_g_L_K, growth_rate_factor, density_g_cm3]
const SOLUTE_DATA: Record<SoluteType, [number, number, number, number]> = {
  NaCl:              [360, 0.2,  0.5, 2.16],
  KCl:               [340, 3.5,  0.8, 1.98],
  sucrose:           [2000, 8.0, 0.3, 1.56],
  citric_acid:       [750, 5.0,  0.6, 1.54],
  ammonium_sulfate:  [770, 4.0,  0.7, 1.77],
  paracetamol:       [14,  0.8,  0.4, 1.29],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class CrystallizationEngine {
  calculate(input: CrystallizationInput): CrystallizationResult {
    const {
      type = "MSMPR",
      solute = "NaCl",
      feed_concentration_g_L: Cf,
      feed_rate_L_h: Qf = 100,
      temperature_C: T = 25,
      cooling_rate_C_h: coolRate = 10,
      residence_time_min: tau = 60,
    } = input;

    const recs: string[] = [];
    const [Csat25, dCdT, gFactor, rhoC] = SOLUTE_DATA[solute];

    // Saturation concentration at temperature
    const Csat = input.saturation_concentration_g_L ?? Csat25 + dCdT * (T - 25);

    // Supersaturation
    const deltaC = Math.max(Cf - Csat, 0);
    const S = Cf / (Csat + 0.001); // supersaturation ratio

    // For cooling crystallization, effective supersaturation from cooling
    const coolingSuper = type === "batch_cooling" ? dCdT * coolRate * (tau / 60) : 0;
    const effectiveDeltaC = type === "batch_cooling" ? coolingSuper : deltaC;

    // Yield
    const yieldFraction = Math.min(effectiveDeltaC / (Cf + 0.001), 0.95);
    const yieldPct = yieldFraction * 100;
    const production = Qf * Cf / 1000 * yieldFraction; // kg/h

    // Nucleation rate (classical nucleation theory, simplified)
    const sigma = Math.max(S - 1, 0.001); // relative supersaturation
    const B0 = 1e8 * Math.exp(-16 * Math.PI / (3 * Math.pow(Math.log(S + 0.001), 2) + 0.001));
    const nucleationRate = Math.min(B0, 1e15);

    // Growth rate (power law: G = kg × σ^g)
    const G = gFactor * 10 * Math.pow(sigma, 1.5); // μm/min

    // MSMPR: mean crystal size L_mean = 3.67 × G × τ
    const tauMin = tau;
    const Lmean = 3.67 * G * tauMin; // μm

    // Coefficient of variation for MSMPR (theoretical = 52%)
    const CV = type === "MSMPR" ? 52 : type === "batch_cooling" ? 35 : 45;

    // Specific power (agitation)
    const specPower = type === "evaporative" ? 5.0 :
      type === "reactive" ? 2.0 : type === "MSMPR" ? 1.0 : 0.5;

    const isSafe = S > 1 && S < 3 && Lmean > 50 && yieldPct > 10;

    if (S > 2) recs.push(`High supersaturation S=${S.toFixed(2)} — excessive nucleation, reduce feed concentration`);
    if (S < 1.01 && deltaC > 0) recs.push(`Low supersaturation S=${S.toFixed(3)} — slow growth, increase driving force`);
    if (Lmean < 100) recs.push(`Small crystals ${Lmean.toFixed(0)}μm — increase residence time or reduce nucleation`);
    if (Lmean > 2000) recs.push(`Very large crystals ${Lmean.toFixed(0)}μm — possible agglomeration, add dispersant`);
    if (yieldPct < 30) recs.push(`Low yield ${yieldPct.toFixed(1)}% — increase cooling/evaporation rate`);
    if (recs.length === 0) recs.push(`Crystallization nominal — yield=${yieldPct.toFixed(1)}%, L=${Lmean.toFixed(0)}μm, S=${S.toFixed(2)}`);

    return {
      yield_pct: mkAv(Math.round(yieldPct * 10) / 10, "%", yieldPct * 0.10, "mass_balance"),
      crystal_production_kg_h: mkAv(Math.round(production * 100) / 100, "kg/h", production * 0.10, "yield_flow"),
      mean_crystal_size_um: mkAv(Math.round(Lmean), "μm", Lmean * 0.25, "MSMPR_3.67Gt"),
      supersaturation_ratio: mkAv(Math.round(S * 1000) / 1000, "ratio", S * 0.05, "Cf_Csat"),
      nucleation_rate_per_m3_s: mkAv(nucleationRate, "1/(m³·s)", nucleationRate * 0.50, "classical_nucleation"),
      growth_rate_um_min: mkAv(Math.round(G * 1000) / 1000, "μm/min", G * 0.30, "power_law"),
      cv_size_distribution: mkAv(CV, "%", CV * 0.10, type === "MSMPR" ? "MSMPR_theory" : "empirical"),
      specific_power_kW_m3: mkAv(specPower, "kW/m³", specPower * 0.20, "agitation"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const crystallizationEngine = new CrystallizationEngine();
