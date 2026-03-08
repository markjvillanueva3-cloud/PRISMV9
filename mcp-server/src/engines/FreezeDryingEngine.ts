/**
 * FreezeDryingEngine — Lyophilization process analysis
 *
 * Models: Primary/secondary drying, sublimation rate, heat transfer,
 *         ice structure, collapse temperature, shelf temperature profile
 * References: Pikal, Nail & Gatlin, FDA guidance for lyophilization
 */

export type ProductType = "pharmaceutical" | "food" | "biological" | "chemical" | "diagnostic";
export type VialSize = "2mL" | "5mL" | "10mL" | "20mL" | "50mL" | "tray";

export interface FreezeDryingInput {
  product?: ProductType;
  vial?: VialSize;
  fill_volume_mL?: number;            // default from vial
  solids_content_pct?: number;         // default 5
  collapse_temperature_C?: number;     // default -30
  shelf_temperature_C?: number;        // default -20 (primary)
  chamber_pressure_mTorr?: number;     // default 100
  num_vials?: number;                  // default 100
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface FreezeDryingResult {
  primary_drying_h: AtomicValue;
  secondary_drying_h: AtomicValue;
  total_cycle_h: AtomicValue;
  sublimation_rate_g_h: AtomicValue;
  residual_moisture_pct: AtomicValue;
  ice_thickness_mm: AtomicValue;
  heat_transfer_W_vial: AtomicValue;
  condenser_load_kg: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Vial: [fill_mL, vial_area_cm2, Kv_W/m2K]
const VIAL_DATA: Record<VialSize, [number, number, number]> = {
  "2mL":  [1,   2.5, 10],
  "5mL":  [3,   4.0, 12],
  "10mL": [5,   6.0, 14],
  "20mL": [10,  8.0, 16],
  "50mL": [25,  15,  18],
  "tray": [500, 600, 25],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class FreezeDryingEngine {
  calculate(input: FreezeDryingInput): FreezeDryingResult {
    const {
      product = "pharmaceutical",
      vial = "10mL",
      solids_content_pct: solids = 5,
      collapse_temperature_C: Tc = -30,
      shelf_temperature_C: Ts = -20,
      chamber_pressure_mTorr: Pc = 100,
      num_vials: nVials = 100,
    } = input;

    const recs: string[] = [];
    const [defaultFill, Av_cm2, Kv] = VIAL_DATA[vial];
    const fill = input.fill_volume_mL ?? defaultFill;

    // Ice thickness
    const waterContent = fill * (1 - solids / 100); // mL water
    const iceThickness = waterContent / (Av_cm2 + 0.001) * 10; // mm

    // Product temperature at sublimation front
    const Pice = Pc * 0.8; // mTorr at ice front (some resistance)
    const Tp = -40 + Math.log10(Pice + 1) * 15; // °C rough from vapor pressure

    // Sublimation rate (Pikal model)
    // dm/dt = Av × Kv × (Ts - Tp) / ΔHs
    const deltaHs = 2840; // kJ/kg heat of sublimation
    const Av_m2 = Av_cm2 / 1e4;
    const sublimRate = Av_m2 * Kv * (Ts - Tp) / (deltaHs * 1000) * 3600 * 1000; // g/h per vial

    // Primary drying time
    const waterMass = waterContent; // g (density ≈ 1)
    const primaryH = waterMass / (Math.abs(sublimRate) + 0.001);

    // Secondary drying (desorption of bound water)
    const secondaryH = primaryH * 0.3 + 5; // typically 20-30% of primary + base

    // Total cycle (including freezing ~4h)
    const totalH = 4 + primaryH + secondaryH;

    // Residual moisture
    const residualMoisture = product === "pharmaceutical" ? 1.5 :
      product === "food" ? 3.0 : product === "biological" ? 2.0 : 2.5;

    // Heat transfer per vial
    const heatPerVial = Av_m2 * Kv * Math.abs(Ts - Tp); // W

    // Condenser load
    const condenserLoad = nVials * waterMass / 1000; // kg total ice

    const isSafe = Tp < Tc && primaryH < 72 && residualMoisture < 5;

    if (Tp > Tc) recs.push(`Product temp ${Tp.toFixed(0)}°C > collapse temp ${Tc}°C — reduce shelf temp or pressure`);
    if (primaryH > 48) recs.push(`Long primary drying ${primaryH.toFixed(0)}h — optimize pressure/shelf temp`);
    if (iceThickness > 15) recs.push(`Thick ice ${iceThickness.toFixed(1)}mm — reduce fill depth for faster drying`);
    if (Pc > 200) recs.push(`High pressure ${Pc}mTorr — product temp may exceed collapse`);
    if (solids > 20) recs.push(`High solids ${solids}% — consider annealing step for ice crystal growth`);
    if (recs.length === 0) recs.push(`Lyo nominal — ${totalH.toFixed(0)}h total, Tp=${Tp.toFixed(0)}°C, RM=${residualMoisture}%`);

    return {
      primary_drying_h: mkAv(Math.round(primaryH * 10) / 10, "h", primaryH * 0.20, "pikal"),
      secondary_drying_h: mkAv(Math.round(secondaryH * 10) / 10, "h", secondaryH * 0.25, "desorption"),
      total_cycle_h: mkAv(Math.round(totalH * 10) / 10, "h", totalH * 0.15, "freeze_prim_sec"),
      sublimation_rate_g_h: mkAv(Math.round(Math.abs(sublimRate) * 1000) / 1000, "g/h", Math.abs(sublimRate) * 0.20, "Kv_DT_Hs"),
      residual_moisture_pct: mkAv(residualMoisture, "%", residualMoisture * 0.20, "product_type"),
      ice_thickness_mm: mkAv(Math.round(iceThickness * 10) / 10, "mm", iceThickness * 0.10, "vol_area"),
      heat_transfer_W_vial: mkAv(Math.round(heatPerVial * 1000) / 1000, "W", heatPerVial * 0.15, "Kv_Av_DT"),
      condenser_load_kg: mkAv(Math.round(condenserLoad * 100) / 100, "kg", condenserLoad * 0.05, "nVials_water"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const freezeDryingEngine = new FreezeDryingEngine();
