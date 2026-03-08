/**
 * RotationalMoldingEngine — Rotational molding (rotomolding) process analysis
 *
 * Models: Heat transfer (conduction through mold + powder sintering),
 *         cycle time, wall uniformity, PIAT control, cooling rate
 * References: Crawford & Throne, ARM guidelines, BS EN ISO 12951
 */

export type RotoMaterial = "LLDPE" | "HDPE" | "PP" | "nylon" | "PVC_plastisol" | "PC";
export type MoldMaterial = "aluminum_cast" | "aluminum_fab" | "steel" | "electroformed_Ni";

export interface RotationalMoldingInput {
  material?: RotoMaterial;
  mold_material?: MoldMaterial;
  wall_thickness_mm?: number;        // default 5
  part_volume_L?: number;            // default 50
  oven_temp_C?: number;              // default 300
  rotation_ratio?: number;           // major:minor, default 4
  cooling_method?: "air" | "water_spray" | "water_mist" | "forced_air";
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface RotationalMoldingResult {
  cycle_time_min: AtomicValue;
  heating_time_min: AtomicValue;
  cooling_time_min: AtomicValue;
  PIAT_C: AtomicValue;
  wall_uniformity_pct: AtomicValue;
  energy_kWh: AtomicValue;
  shrinkage_pct: AtomicValue;
  charge_weight_kg: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Material: [melt_temp_C, density_g/cm3, thermal_cond_W/mK, cp_J/kgK, shrinkage_pct, PIAT_target_C]
const ROTO_MAT: Record<RotoMaterial, [number, number, number, number, number, number]> = {
  LLDPE:         [120, 0.93, 0.33, 2300, 2.5, 200],
  HDPE:          [130, 0.96, 0.44, 2100, 3.0, 210],
  PP:            [165, 0.91, 0.12, 1800, 1.8, 240],
  nylon:         [220, 1.14, 0.25, 1700, 1.5, 280],
  PVC_plastisol: [170, 1.30, 0.16, 1000, 0.5, 220],
  PC:            [260, 1.20, 0.20, 1200, 0.7, 310],
};

// Mold: [thermal_cond_W/mK, wall_mm, cost_factor]
const MOLD_MAT: Record<MoldMaterial, [number, number, number]> = {
  aluminum_cast:  [170, 8,  1.0],
  aluminum_fab:   [170, 5,  0.7],
  steel:          [50,  6,  1.5],
  electroformed_Ni: [90, 3, 2.0],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class RotationalMoldingEngine {
  calculate(input: RotationalMoldingInput): RotationalMoldingResult {
    const {
      material = "LLDPE",
      mold_material = "aluminum_cast",
      wall_thickness_mm: tw = 5,
      part_volume_L: vol = 50,
      oven_temp_C: Toven = 300,
      rotation_ratio: ratio = 4,
      cooling_method = "air",
    } = input;

    const recs: string[] = [];
    const [Tmelt, rho, kPoly, cp, shrink, PIATtarget] = ROTO_MAT[material];
    const [kMold, moldWall, costFactor] = MOLD_MAT[mold_material];

    // Surface area estimate from volume (assume sphere-like)
    const surfArea = Math.pow(36 * Math.PI * Math.pow(vol / 1000, 2), 1 / 3); // m²

    // Charge weight
    const chargeWeight = surfArea * tw / 1000 * rho * 1000; // kg

    // Heating time (conduction through mold wall + powder sintering)
    const moldResistance = moldWall / 1000 / kMold;
    const polyResistance = tw / 1000 / kPoly;
    const hConv = 15; // W/m²K oven convection
    const totalResistance = 1 / hConv + moldResistance + polyResistance;
    const heatTransferRate = surfArea * (Toven - PIATtarget) / totalResistance; // W
    const energyNeeded = chargeWeight * cp * (PIATtarget - 25) / 1000; // kJ
    const heatingTime = energyNeeded / (heatTransferRate / 1000 + 0.001); // min

    // Cooling time
    const coolFactor = cooling_method === "water_spray" ? 0.4 :
      cooling_method === "water_mist" ? 0.55 :
      cooling_method === "forced_air" ? 0.7 : 1.0;
    const coolingTime = heatingTime * 0.8 * coolFactor;

    // Total cycle
    const cycleTime = heatingTime + coolingTime + 5; // +5 for loading/unloading

    // PIAT (Peak Internal Air Temperature)
    const PIAT = PIATtarget + (Toven - PIATtarget) * 0.05; // slight overshoot

    // Wall uniformity (depends on rotation ratio)
    const optimalRatio = 4;
    const uniformity = 95 - Math.abs(ratio - optimalRatio) * 5;

    // Energy consumption
    const energy = heatTransferRate * heatingTime / 60 / 1000; // kWh

    const isSafe = PIAT < Toven * 0.9 && tw >= 2 && uniformity > 70;

    if (PIAT > PIATtarget * 1.1) recs.push(`PIAT ${PIAT.toFixed(0)}°C exceeds target ${PIATtarget}°C — reduce oven time or temp`);
    if (ratio < 2 || ratio > 8) recs.push(`Rotation ratio ${ratio}:1 outside optimal 3-6 — poor uniformity`);
    if (tw > 12) recs.push(`Thick wall ${tw}mm — very long cycle, consider structural foam`);
    if (material === "nylon") recs.push(`Nylon rotomolding — nitrogen blanket recommended to prevent oxidation`);
    if (cooling_method === "water_spray" && material === "PP") recs.push(`Water spray on PP — rapid cooling causes warpage, use mist`);
    if (recs.length === 0) recs.push(`Rotomold nominal — ${cycleTime.toFixed(0)}min cycle, PIAT=${PIAT.toFixed(0)}°C, ${chargeWeight.toFixed(1)}kg`);

    return {
      cycle_time_min: mkAv(Math.round(cycleTime * 10) / 10, "min", cycleTime * 0.10, "heat_cool"),
      heating_time_min: mkAv(Math.round(heatingTime * 10) / 10, "min", heatingTime * 0.15, "conduction"),
      cooling_time_min: mkAv(Math.round(coolingTime * 10) / 10, "min", coolingTime * 0.15, "method"),
      PIAT_C: mkAv(Math.round(PIAT), "°C", PIAT * 0.05, "T_target"),
      wall_uniformity_pct: mkAv(Math.round(uniformity * 10) / 10, "%", uniformity * 0.05, "ratio"),
      energy_kWh: mkAv(Math.round(energy * 100) / 100, "kWh", energy * 0.15, "Q_time"),
      shrinkage_pct: mkAv(shrink, "%", shrink * 0.10, "material"),
      charge_weight_kg: mkAv(Math.round(chargeWeight * 100) / 100, "kg", chargeWeight * 0.05, "SA_tw_rho"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const rotationalMoldingEngine = new RotationalMoldingEngine();
