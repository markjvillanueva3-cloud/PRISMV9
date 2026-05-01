/**
 * AbsorptionChillerEngine — Absorption refrigeration cycle analysis
 *
 * Models: LiBr-H₂O and NH₃-H₂O cycles, COP calculation,
 *         crystallization limit, solution heat exchanger effectiveness
 * References: ASHRAE Handbook, Herold/Radermacher/Klein
 */

export type AbsorptionCycle = "single_effect" | "double_effect" | "triple_effect" | "GAX";
export type WorkingPair = "LiBr_H2O" | "NH3_H2O" | "NH3_LiNO3";

export interface AbsorptionChillerInput {
  cycle?: AbsorptionCycle;
  working_pair?: WorkingPair;
  cooling_capacity_kW: number;
  chilled_water_temp_C?: number;      // default 7
  cooling_water_temp_C?: number;      // default 30
  heat_source_temp_C?: number;        // default 90
  heat_exchanger_effectiveness?: number; // default 0.7
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface AbsorptionChillerResult {
  COP: AtomicValue;
  heat_input_kW: AtomicValue;
  condenser_heat_kW: AtomicValue;
  absorber_heat_kW: AtomicValue;
  pump_power_kW: AtomicValue;
  solution_flow_kg_s: AtomicValue;
  crystallization_margin_C: AtomicValue;
  carnot_COP: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class AbsorptionChillerEngine {
  calculate(input: AbsorptionChillerInput): AbsorptionChillerResult {
    const {
      cycle = "single_effect",
      working_pair = "LiBr_H2O",
      cooling_capacity_kW: Qe,
      chilled_water_temp_C: Tchw = 7,
      cooling_water_temp_C: Tcw = 30,
      heat_source_temp_C: Ths = 90,
      heat_exchanger_effectiveness: eff = 0.7,
    } = input;

    const recs: string[] = [];

    // Temperatures in Kelvin
    const Te = Tchw - 3 + 273.15; // evaporator = chilled water - approach
    const Tc = Tcw + 5 + 273.15;  // condenser = cooling water + approach
    const Tg = Ths - 5 + 273.15;  // generator = heat source - approach
    const Ta = Tcw + 3 + 273.15;  // absorber ≈ cooling water + approach

    // Carnot COP for absorption cycle
    const carnotCOP = (Te / (Tc - Te)) * ((Tg - Ta) / Tg);

    // Actual COP based on cycle type
    const cycleEff: Record<AbsorptionCycle, number> = {
      single_effect: 0.45,
      double_effect: 0.55,
      triple_effect: 0.60,
      GAX: 0.50,
    };
    const pairMod = working_pair === "LiBr_H2O" ? 1.0 : working_pair === "NH3_H2O" ? 0.85 : 0.90;
    const COP = carnotCOP * cycleEff[cycle] * pairMod * (0.5 + 0.5 * eff);

    // Heat input
    const Qg = Qe / (COP + 0.001);

    // Heat rejection
    const Qc = Qe * (1 + 1 / (COP + 0.001)) * 0.5; // condenser portion
    const Qa = Qe + Qg - Qc; // absorber

    // Solution pump power (~1-2% of cooling capacity)
    const pumpPower = Qe * 0.015;

    // Solution circulation rate
    const cpSol = working_pair === "LiBr_H2O" ? 1.9 : 4.5; // kJ/kg·K
    const deltaTsol = 15; // temperature swing
    const solFlow = Qg / (cpSol * deltaTsol);

    // Crystallization margin (LiBr specific)
    const crystTemp = working_pair === "LiBr_H2O" ?
      Tcw + 15 : // LiBr crystallization depends on concentration/temp
      -50; // NH3 systems don't crystallize
    const crystMargin = (Ths - 5) - crystTemp;

    const isSafe = COP > 0.3 && crystMargin > 5 && Ths > Tcw + 20;

    if (COP < 0.5) recs.push(`Low COP ${COP.toFixed(2)} — increase heat source temperature`);
    if (crystMargin < 10 && working_pair === "LiBr_H2O") recs.push(`Crystallization margin ${crystMargin.toFixed(0)}°C — risk of LiBr crystallization`);
    if (Ths < 80 && cycle !== "single_effect") recs.push(`Heat source ${Ths}°C too low for ${cycle} — use single effect`);
    if (Ths > 170 && cycle === "single_effect") recs.push(`High-grade heat ${Ths}°C — consider double/triple effect`);
    if (Tcw > 35) recs.push(`High cooling water ${Tcw}°C — COP degradation, improve heat rejection`);
    if (recs.length === 0) recs.push(`Chiller nominal — COP=${COP.toFixed(2)}, Qg=${Qg.toFixed(0)}kW, margin=${crystMargin.toFixed(0)}°C`);

    return {
      COP: mkAv(Math.round(COP * 1000) / 1000, "ratio", COP * 0.10, "absorption_cycle"),
      heat_input_kW: mkAv(Math.round(Qg * 10) / 10, "kW", Qg * 0.10, "Qe_COP"),
      condenser_heat_kW: mkAv(Math.round(Qc * 10) / 10, "kW", Qc * 0.15, "energy_balance"),
      absorber_heat_kW: mkAv(Math.round(Qa * 10) / 10, "kW", Qa * 0.15, "energy_balance"),
      pump_power_kW: mkAv(Math.round(pumpPower * 100) / 100, "kW", pumpPower * 0.20, "fraction_Qe"),
      solution_flow_kg_s: mkAv(Math.round(solFlow * 1000) / 1000, "kg/s", solFlow * 0.15, "Qg_cpDT"),
      crystallization_margin_C: mkAv(Math.round(crystMargin * 10) / 10, "°C", crystMargin * 0.10, "LiBr_limit"),
      carnot_COP: mkAv(Math.round(carnotCOP * 1000) / 1000, "ratio", carnotCOP * 0.05, "reversible"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const absorptionChillerEngine = new AbsorptionChillerEngine();
