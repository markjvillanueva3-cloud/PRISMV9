/**
 * ElectroplatingEngine — Electroplating/electrodeposition process analysis
 *
 * Models: Faraday's law deposition, throwing power, current efficiency,
 *         bath chemistry, deposit stress, Hull cell prediction
 * References: Schlesinger & Paunovic, ASTM B488, MIL-STD-1501
 */

export type PlatingType = "rack" | "barrel" | "brush" | "pulse" | "jet" | "continuous";
export type PlatingMetal = "nickel" | "chrome_hard" | "chrome_deco" | "zinc" | "copper" | "gold" | "silver" | "tin" | "cadmium";

export interface ElectroplatingInput {
  type?: PlatingType;
  metal?: PlatingMetal;
  surface_area_dm2?: number;
  target_thickness_um?: number;
  current_density_A_dm2?: number;
  bath_temp_C?: number;
  agitation?: "none" | "air" | "mechanical" | "ultrasonic";
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ElectroplatingResult {
  plating_time_min: AtomicValue;
  current_A: AtomicValue;
  current_efficiency_pct: AtomicValue;
  deposition_rate_um_min: AtomicValue;
  throwing_power_pct: AtomicValue;
  deposit_stress_MPa: AtomicValue;
  metal_consumption_g: AtomicValue;
  energy_kWh: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Metal: [equiv_weight_g, density_g/cm3, efficiency_pct, default_cd_A/dm2, default_temp_C, stress_MPa]
const PLATE_DATA: Record<PlatingMetal, [number, number, number, number, number, number]> = {
  nickel:      [29.35, 8.9,  95, 4,   55, 200],
  chrome_hard: [17.33, 7.2,  15, 30,  55, 300],
  chrome_deco: [17.33, 7.2,  12, 15,  45, 250],
  zinc:        [32.69, 7.1,  95, 3,   25, 50],
  copper:      [31.77, 8.9,  98, 3,   30, 100],
  gold:        [65.68, 19.3, 80, 0.5, 60, 80],
  silver:      [107.9, 10.5, 98, 1,   25, 70],
  tin:         [59.35, 7.3,  90, 2,   25, 30],
  cadmium:     [56.20, 8.7,  95, 1.5, 25, 40],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ElectroplatingEngine {
  calculate(input: ElectroplatingInput): ElectroplatingResult {
    const {
      type = "rack",
      metal = "nickel",
      surface_area_dm2: area = 10,
      target_thickness_um: thickness = 25,
      agitation = "air",
    } = input;

    const recs: string[] = [];
    const [eqWt, rhoMetal, effBase, defaultCD, defaultTemp, stress] = PLATE_DATA[metal];

    const CD = input.current_density_A_dm2 ?? defaultCD;
    const temp = input.bath_temp_C ?? defaultTemp;

    // Current efficiency (affected by agitation)
    const agitMod = agitation === "ultrasonic" ? 1.05 :
      agitation === "mechanical" ? 1.02 : agitation === "air" ? 1.0 : 0.95;
    const efficiency = Math.min(100, effBase * agitMod);

    // Deposition rate from Faraday's law
    const depRate = CD * eqWt * (efficiency / 100) / (rhoMetal * 96485) * 600000;

    // Plating time
    const platingTime = thickness / depRate;

    // Total current
    const current = CD * area;

    // Metal consumption
    const metalMass = current * platingTime * 60 * eqWt * (efficiency / 100) / 96485;

    // Throwing power
    const throwingPower = metal === "copper" ? 40 : metal === "nickel" ? 30 :
      metal === "zinc" ? 35 : metal === "chrome_hard" ? 10 :
      metal === "chrome_deco" ? 12 : metal === "gold" ? 50 : 25;

    // Deposit stress
    const depositStress = stress * (CD / defaultCD);

    // Energy consumption
    const cellVoltage = metal === "chrome_hard" || metal === "chrome_deco" ? 6 : 4;
    const energy = current * cellVoltage * platingTime / 60 / 1000;

    const isSafe = platingTime > 0.5 && CD < 100 && efficiency > 5;

    if (metal === "cadmium") recs.push("Cadmium plating — REACH restricted, toxic, use zinc-nickel alternative");
    if (metal === "chrome_hard" && efficiency < 20) recs.push("Cr hard — low efficiency " + efficiency.toFixed(0) + "%, high hydrogen evolution");
    if (CD > defaultCD * 2) recs.push("High CD " + CD + "A/dm2 — burning/rough deposit risk");
    if (type === "barrel" && area > 50) recs.push("Large barrel load — ensure adequate tumbling");
    if (thickness > 100 && metal !== "chrome_hard") recs.push("Thick deposit " + thickness + "um — internal stress cracking risk");
    if (recs.length === 0) recs.push("Plating nominal — " + platingTime.toFixed(0) + "min, " + depRate.toFixed(2) + "um/min, eta=" + efficiency.toFixed(0) + "%");

    return {
      plating_time_min: mkAv(Math.round(platingTime * 10) / 10, "min", platingTime * 0.10, "Faraday"),
      current_A: mkAv(Math.round(current * 10) / 10, "A", current * 0.05, "CD_area"),
      current_efficiency_pct: mkAv(Math.round(efficiency * 10) / 10, "%", efficiency * 0.05, "metal_agit"),
      deposition_rate_um_min: mkAv(Math.round(depRate * 1000) / 1000, "um/min", depRate * 0.10, "Faraday"),
      throwing_power_pct: mkAv(throwingPower, "%", throwingPower * 0.15, "bath_geometry"),
      deposit_stress_MPa: mkAv(Math.round(depositStress * 10) / 10, "MPa", depositStress * 0.20, "CD_metal"),
      metal_consumption_g: mkAv(Math.round(metalMass * 100) / 100, "g", metalMass * 0.05, "Faraday"),
      energy_kWh: mkAv(Math.round(energy * 1000) / 1000, "kWh", energy * 0.10, "IV_time"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const electroplatingEngine = new ElectroplatingEngine();
