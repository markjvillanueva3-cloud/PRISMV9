/**
 * HeatExchangerPlateEngine — Plate heat exchanger sizing
 *
 * Models: LMTD method, NTU-effectiveness, plate corrugation
 *         enhancement, pressure drop, fouling resistance
 * References: Shah & Sekulic, Alfa Laval handbook
 */

export type PlatePattern = "chevron_30" | "chevron_45" | "chevron_60" | "washboard" | "dimple";
export type FluidPair = "water_water" | "water_glycol" | "steam_water" | "oil_water";

export interface HeatExchangerPlateInput {
  hot_inlet_C: number;
  hot_outlet_C: number;
  cold_inlet_C: number;
  flow_rate_hot_kg_s?: number;       // default auto from duty
  flow_rate_cold_kg_s?: number;
  duty_kW?: number;                  // default auto from temps
  plate_pattern?: PlatePattern;
  fluid_pair?: FluidPair;
  num_plates?: number;               // default auto-sized
  plate_spacing_mm?: number;         // default 3
  plate_width_mm?: number;           // default 300
  plate_height_mm?: number;          // default 600
  fouling_factor?: number;           // m²K/W, default 0.0001
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface HeatExchangerPlateResult {
  duty_kW: AtomicValue;
  lmtd_C: AtomicValue;
  overall_U_W_m2K: AtomicValue;
  required_area_m2: AtomicValue;
  num_plates: AtomicValue;
  effectiveness_pct: AtomicValue;
  ntu: AtomicValue;
  pressure_drop_kPa: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class HeatExchangerPlateEngine {
  calculate(input: HeatExchangerPlateInput): HeatExchangerPlateResult {
    const {
      hot_inlet_C: Thi,
      hot_outlet_C: Tho,
      cold_inlet_C: Tci,
      plate_pattern = "chevron_45",
      fluid_pair = "water_water",
      plate_spacing_mm: gap = 3,
      plate_width_mm: W = 300,
      plate_height_mm: H = 600,
      fouling_factor: Rf = 0.0001,
    } = input;

    const recs: string[] = [];

    // Fluid properties
    const cpHot = fluid_pair.includes("oil") ? 2.0 : fluid_pair.includes("glycol") ? 3.4 : 4.18; // kJ/kgK
    const cpCold = 4.18;

    // Calculate duty and cold outlet
    const Qduty = input.duty_kW ?? (input.flow_rate_hot_kg_s ?? 1) * cpHot * (Thi - Tho);
    const mHot = input.flow_rate_hot_kg_s ?? Qduty / (cpHot * (Thi - Tho));
    const mCold = input.flow_rate_cold_kg_s ?? Qduty / (cpCold * 30); // assume 30°C rise
    const Tco = Tci + Qduty / (mCold * cpCold);

    // LMTD (counterflow)
    const dT1 = Thi - Tco;
    const dT2 = Tho - Tci;
    const LMTD = Math.abs(dT1 - dT2) < 0.1
      ? (dT1 + dT2) / 2
      : (dT1 - dT2) / Math.log(Math.abs(dT1 / (dT2 + 0.01)) + 0.001);

    // Overall heat transfer coefficient
    const chevronFactor = plate_pattern === "chevron_30" ? 0.7 : plate_pattern === "chevron_60" ? 1.3 : 1.0;
    const U_base = fluid_pair === "steam_water" ? 4000 : fluid_pair === "oil_water" ? 800 :
      fluid_pair === "water_glycol" ? 2500 : 3500;
    const U = U_base * chevronFactor / (1 + U_base * Rf);

    // Required area
    const A_req = Qduty * 1000 / (U * Math.abs(LMTD) + 0.01);

    // Plate area and count
    const plateArea = (W / 1000) * (H / 1000); // m² per plate
    const nPlates = input.num_plates ?? Math.ceil(A_req / plateArea) + 2; // +2 for end plates

    // Effectiveness and NTU
    const Cmin = Math.min(mHot * cpHot, mCold * cpCold);
    const Cmax = Math.max(mHot * cpHot, mCold * cpCold);
    const Cr = Cmin / (Cmax + 0.001);
    const epsilon = Qduty / (Cmin * (Thi - Tci) + 0.001);
    const NTU = U * nPlates * plateArea / (Cmin * 1000 + 0.001);

    // Pressure drop (simplified)
    const velocity = (mHot / 998) / (nPlates / 2 * (gap / 1000) * (W / 1000));
    const f = 1.0 / Math.pow(velocity + 0.1, 0.3) * chevronFactor;
    const dP = f * 998 * velocity * velocity * (H / 1000) / (2 * gap / 1000) / 1000; // kPa

    const isSafe = Math.abs(LMTD) > 1 && epsilon < 1 && dP < 200;

    if (epsilon > 0.95) recs.push(`Effectiveness ${(epsilon * 100).toFixed(0)}% > 95% — temperature cross risk`);
    if (dP > 100) recs.push(`Pressure drop ${dP.toFixed(0)}kPa — increase plate count or spacing`);
    if (Math.abs(LMTD) < 3) recs.push(`Very low LMTD ${LMTD.toFixed(1)}°C — large area needed`);
    if (Rf > 0.0003) recs.push(`High fouling factor — schedule regular cleaning`);
    if (recs.length === 0) recs.push(`PHE nominal — ${Qduty.toFixed(0)}kW, ${nPlates} plates, U=${U.toFixed(0)}W/m²K, ε=${(epsilon * 100).toFixed(0)}%`);

    return {
      duty_kW: mkAv(Math.round(Qduty * 10) / 10, "kW", Qduty * 0.05, "mCpdT"),
      lmtd_C: mkAv(Math.round(Math.abs(LMTD) * 10) / 10, "°C", Math.abs(LMTD) * 0.05, "counterflow"),
      overall_U_W_m2K: mkAv(Math.round(U), "W/m²K", U * 0.15, "correlation"),
      required_area_m2: mkAv(Math.round(A_req * 100) / 100, "m²", A_req * 0.10, "Q_U_LMTD"),
      num_plates: mkAv(nPlates, "count", 0, "area_plate"),
      effectiveness_pct: mkAv(Math.round(epsilon * 1000) / 10, "%", epsilon * 100 * 0.10, "NTU"),
      ntu: mkAv(Math.round(NTU * 100) / 100, "dimensionless", NTU * 0.15, "UA_Cmin"),
      pressure_drop_kPa: mkAv(Math.round(dP * 10) / 10, "kPa", dP * 0.25, "darcy"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const heatExchangerPlateEngine = new HeatExchangerPlateEngine();
