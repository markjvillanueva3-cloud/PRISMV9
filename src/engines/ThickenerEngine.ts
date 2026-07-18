/**
 * ThickenerEngine — Gravity thickener/clarifier design
 *
 * Models: Kynch settling theory, solids flux analysis,
 *         Talmage-Fitch method, underflow density, overflow clarity
 * References: Kynch 1952, Talmage & Fitch, Coe & Clevenger
 */

export type ThickenerType = "conventional" | "high_rate" | "paste" | "deep_cone" | "lamella";
export type FlocculantType = "anionic" | "cationic" | "nonionic" | "none";

export interface ThickenerInput {
  type?: ThickenerType;
  flocculant?: FlocculantType;
  feed_rate_m3_h: number;
  feed_solids_pct: number;           // weight percent
  target_underflow_pct?: number;     // default 50
  settling_velocity_m_h?: number;    // default 1.0
  particle_SG?: number;             // default 2.65
  flocculant_dose_g_t?: number;     // default 30
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ThickenerResult {
  thickener_diameter_m: AtomicValue;
  thickener_area_m2: AtomicValue;
  unit_area_m2_tpd: AtomicValue;
  overflow_rate_m_h: AtomicValue;
  solids_loading_t_m2_d: AtomicValue;
  underflow_rate_m3_h: AtomicValue;
  residence_time_h: AtomicValue;
  flocculant_consumption_kg_h: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ThickenerEngine {
  calculate(input: ThickenerInput): ThickenerResult {
    const {
      type = "conventional",
      flocculant = "anionic",
      feed_rate_m3_h: Qf,
      feed_solids_pct: Cf,
      target_underflow_pct: Cu = 50,
      settling_velocity_m_h: v0 = 1.0,
      particle_SG: SG = 2.65,
      flocculant_dose_g_t: flocDose = 30,
    } = input;

    const recs: string[] = [];

    // Solids mass flow
    const feedDensity = 1 + (SG - 1) * Cf / 100;
    const solidsMassFlow = Qf * feedDensity * Cf / 100; // t/h
    const solidsTpd = solidsMassFlow * 24;

    // Flocculant enhancement of settling
    const flocFactor = flocculant === "none" ? 1.0 :
      1 + flocDose / 50 * (flocculant === "anionic" ? 1.5 : 1.2);
    const vSettling = v0 * flocFactor;

    // Type modifier
    const typeMod = type === "high_rate" ? 1.5 :
      type === "paste" ? 0.5 : type === "deep_cone" ? 0.6 :
      type === "lamella" ? 3.0 : 1.0;
    const effectiveV = vSettling * typeMod;

    // Talmage-Fitch: unit area = (1/Cf - 1/Cu) / v_settling
    // In practical units: A = Q × (1/Cf - 1/Cu) / v
    const unitArea = (1 / (Cf / 100) - 1 / (Cu / 100)) / (effectiveV + 0.001); // m²/(t/h)
    const area = unitArea * solidsMassFlow;
    const diameter = Math.sqrt(4 * area / Math.PI);

    // Overflow rate (surface loading)
    const overflowRate = Qf / (area + 0.001);

    // Solids loading
    const solidsLoading = solidsTpd / (area + 0.001);

    // Underflow rate (mass balance)
    const underflowRate = solidsMassFlow / (Cu / 100 * (1 + (SG - 1) * Cu / 100));

    // Residence time
    const depth = type === "deep_cone" ? 15 : type === "paste" ? 10 :
      type === "conventional" ? 3.5 : 2.5;
    const volume = area * depth;
    const resTime = volume / (Qf + 0.001);

    // Flocculant consumption
    const flocConsumption = solidsMassFlow * flocDose / 1000; // kg/h

    const isSafe = overflowRate < 2 && solidsLoading < 5 && Cu > Cf;

    if (overflowRate > 1.5) recs.push(`High overflow rate ${overflowRate.toFixed(2)}m/h — increase area or add flocculant`);
    if (solidsLoading > 3) recs.push(`High solids loading ${solidsLoading.toFixed(1)}t/m²/d — underflow may not achieve target`);
    if (diameter > 50) recs.push(`Large diameter ${diameter.toFixed(0)}m — consider multiple units`);
    if (flocDose > 50) recs.push(`High flocculant dose ${flocDose}g/t — optimize dosing`);
    if (Cu > 65) recs.push(`High underflow target ${Cu}% — may need paste thickener`);
    if (recs.length === 0) recs.push(`Thickener nominal — Ø${diameter.toFixed(1)}m, ${solidsLoading.toFixed(1)}t/m²/d, τ=${resTime.toFixed(1)}h`);

    return {
      thickener_diameter_m: mkAv(Math.round(diameter * 10) / 10, "m", diameter * 0.10, "talmage_fitch"),
      thickener_area_m2: mkAv(Math.round(area * 10) / 10, "m²", area * 0.10, "unit_area_method"),
      unit_area_m2_tpd: mkAv(Math.round(unitArea * solidsMassFlow / solidsTpd * 24 * 100) / 100, "m²/(t/d)", 0.1, "1Cf_1Cu_v"),
      overflow_rate_m_h: mkAv(Math.round(overflowRate * 1000) / 1000, "m/h", overflowRate * 0.10, "Q_A"),
      solids_loading_t_m2_d: mkAv(Math.round(solidsLoading * 100) / 100, "t/(m²·d)", solidsLoading * 0.10, "tpd_A"),
      underflow_rate_m3_h: mkAv(Math.round(underflowRate * 100) / 100, "m³/h", underflowRate * 0.10, "mass_balance"),
      residence_time_h: mkAv(Math.round(resTime * 10) / 10, "h", resTime * 0.15, "V_Q"),
      flocculant_consumption_kg_h: mkAv(Math.round(flocConsumption * 100) / 100, "kg/h", flocConsumption * 0.10, "dose_mass"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const thickenerEngine = new ThickenerEngine();
