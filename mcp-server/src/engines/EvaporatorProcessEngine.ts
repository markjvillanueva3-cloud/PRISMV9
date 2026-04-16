/**
 * EvaporatorProcessEngine — Industrial evaporation process analysis
 *
 * Models: Single/multi-effect evaporator, boiling point elevation,
 *         steam economy, heat transfer (U×A×ΔT), capacity
 * References: McCabe-Smith-Harriott, Perry's Ch.11, Kern "Process Heat Transfer"
 */

export type EvaporatorType = "single_effect" | "double_effect" | "triple_effect" | "MVR" | "TVR" | "falling_film";
export type EvapFeed = "sugar_solution" | "milk" | "brine" | "caustic" | "fruit_juice" | "wastewater";

export interface EvaporatorProcessInput {
  type?: EvaporatorType;
  feed?: EvapFeed;
  feed_rate_kg_h?: number;           // default 1000
  feed_concentration_pct?: number;    // default 10
  product_concentration_pct?: number; // default 50
  steam_pressure_bar?: number;       // default 3
  vacuum_mbar?: number;              // default 200
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface EvaporatorProcessResult {
  evaporation_rate_kg_h: AtomicValue;
  steam_consumption_kg_h: AtomicValue;
  steam_economy: AtomicValue;
  heat_transfer_area_m2: AtomicValue;
  boiling_point_elevation_C: AtomicValue;
  specific_energy_kJ_kg: AtomicValue;
  product_rate_kg_h: AtomicValue;
  overall_U_W_m2K: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Feed: [BPE_factor_C/%_conc, fouling_factor, viscosity_factor, heat_sensitivity(1-5)]
const FEED_DATA: Record<EvapFeed, [number, number, number, number]> = {
  sugar_solution: [0.08, 1.0, 1.2, 3],
  milk:           [0.05, 1.5, 1.5, 5],
  brine:          [0.12, 1.3, 1.0, 1],
  caustic:        [0.15, 2.0, 1.3, 1],
  fruit_juice:    [0.06, 1.2, 1.3, 4],
  wastewater:     [0.03, 2.5, 1.0, 1],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class EvaporatorProcessEngine {
  calculate(input: EvaporatorProcessInput): EvaporatorProcessResult {
    const {
      type = "single_effect",
      feed = "sugar_solution",
      feed_rate_kg_h: F = 1000,
      feed_concentration_pct: xF = 10,
      product_concentration_pct: xP = 50,
      steam_pressure_bar: Ps = 3,
      vacuum_mbar: Pvac = 200,
    } = input;

    const recs: string[] = [];
    const [bpeFactor, foulingFactor, viscFactor, heatSens] = FEED_DATA[feed];

    // Mass balance: F × xF = P × xP → P = F × xF / xP
    const P = F * xF / xP;
    const evapRate = F - P;

    // Number of effects
    const nEffects = type === "single_effect" ? 1 : type === "double_effect" ? 2 :
      type === "triple_effect" ? 3 : type === "MVR" ? 1 : type === "TVR" ? 1.5 : 1;

    // Steam economy (kg evap / kg steam)
    const baseEconomy = type === "MVR" ? 15 : type === "TVR" ? 3 : nEffects * 0.85;
    const economy = baseEconomy;

    // Steam consumption
    const steamConsumption = evapRate / economy;

    // Boiling point elevation at product concentration
    const BPE = bpeFactor * xP;

    // Temperature driving force
    const Tsteam = 100 + (Ps - 1) * 20; // rough steam temp
    const Tboil = 100 - (1013 - Pvac) / 1013 * 40 + BPE; // vacuum-adjusted
    const deltaT = (Tsteam - Tboil) / nEffects;

    // Overall heat transfer coefficient
    const baseU = 2500; // W/m²K for clean water
    const U = baseU / foulingFactor / viscFactor;

    // Heat transfer area: Q = U × A × ΔT
    const latentHeat = 2260; // kJ/kg water
    const Q = evapRate * latentHeat / 3.6; // kW
    const area = Q * 1000 / (U * Math.max(deltaT, 1));

    // Specific energy
    const specEnergy = steamConsumption * latentHeat / (evapRate + 0.001);

    const isSafe = deltaT > 5 && evapRate > 0 && xP > xF;

    if (deltaT < 10) recs.push(`Low ΔT ${deltaT.toFixed(1)}°C — large area needed, increase steam pressure or vacuum`);
    if (heatSens >= 4 && Tboil > 70) recs.push(`Heat-sensitive ${feed} at ${Tboil.toFixed(0)}°C — increase vacuum for lower boil temp`);
    if (xP > 70) recs.push(`High product concentration ${xP}% — viscosity limiting, fouling accelerates`);
    if (type === "single_effect" && evapRate > 2000) recs.push(`Large duty ${evapRate.toFixed(0)}kg/h — multi-effect saves ${((1 - 1 / 2.5) * 100).toFixed(0)}% steam`);
    if (foulingFactor > 1.5) recs.push(`${feed} prone to fouling — plan CIP cycles, consider falling film`);
    if (recs.length === 0) recs.push(`Evaporator nominal — ${evapRate.toFixed(0)}kg/h evap, economy ${economy.toFixed(1)}, A=${area.toFixed(0)}m²`);

    return {
      evaporation_rate_kg_h: mkAv(Math.round(evapRate * 10) / 10, "kg/h", evapRate * 0.05, "mass_balance"),
      steam_consumption_kg_h: mkAv(Math.round(steamConsumption * 10) / 10, "kg/h", steamConsumption * 0.10, "economy"),
      steam_economy: mkAv(Math.round(economy * 100) / 100, "kg/kg", economy * 0.10, "n_effects"),
      heat_transfer_area_m2: mkAv(Math.round(area * 10) / 10, "m²", area * 0.15, "Q_U_dT"),
      boiling_point_elevation_C: mkAv(Math.round(BPE * 100) / 100, "°C", BPE * 0.10, "Duhring"),
      specific_energy_kJ_kg: mkAv(Math.round(specEnergy * 10) / 10, "kJ/kg", specEnergy * 0.10, "steam_evap"),
      product_rate_kg_h: mkAv(Math.round(P * 10) / 10, "kg/h", P * 0.05, "mass_balance"),
      overall_U_W_m2K: mkAv(Math.round(U), "W/m²K", U * 0.20, "fouling_visc"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const evaporatorProcessEngine = new EvaporatorProcessEngine();
