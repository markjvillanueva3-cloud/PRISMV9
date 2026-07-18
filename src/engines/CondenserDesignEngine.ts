/**
 * CondenserDesignEngine — Shell-and-tube condenser sizing
 *
 * Models: Heat duty (Q=m×hfg), LMTD, overall U, tube count,
 *         cooling water flow, sub-cooling
 * References: HEI Standards, TEMA
 * Safety: Tube velocity limits, fouling, vacuum integrity
 */

export type CondenserType = "surface" | "direct_contact" | "air_cooled" | "evaporative";

export interface CondenserDesignInput {
  vapor_flow_kg_h: number;
  vapor_temp_C?: number;                // default 100
  cooling_water_inlet_C?: number;       // default 25
  cooling_water_outlet_C?: number;      // default 35
  condenser_type?: CondenserType;
  tube_od_mm?: number;                  // default 19.05
  operating_pressure_bar?: number;      // default 1
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface CondenserDesignResult {
  heat_duty_kW: AtomicValue;
  heat_transfer_area_m2: AtomicValue;
  cooling_water_flow_m3_h: AtomicValue;
  number_of_tubes: AtomicValue;
  overall_U_W_m2K: AtomicValue;
  lmtd_C: AtomicValue;
  tube_velocity_m_s: AtomicValue;
  subcooling_C: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class CondenserDesignEngine {
  calculate(input: CondenserDesignInput): CondenserDesignResult {
    const {
      vapor_flow_kg_h: mv,
      vapor_temp_C: Tv = 100,
      cooling_water_inlet_C: Twi = 25,
      cooling_water_outlet_C: Two = 35,
      condenser_type = "surface",
      tube_od_mm: OD = 19.05,
      operating_pressure_bar: Pop = 1,
    } = input;

    const recs: string[] = [];

    // Heat duty
    const hfg = 2257 + (100 - Tv) * 2.5; // kJ/kg approximate
    const Q = mv * hfg / 3600; // kW
    const subcool = 3; // °C typical sub-cooling

    // LMTD
    const dT1 = Tv - Two;
    const dT2 = Tv - Twi;
    const LMTD = dT1 > 0 && dT2 > 0 ? (dT2 - dT1) / Math.log(dT2 / dT1) : (dT1 + dT2) / 2;

    // Overall U
    const U = condenser_type === "surface" ? 3000
      : condenser_type === "air_cooled" ? 30
      : condenser_type === "evaporative" ? 800 : 5000;

    // Heat transfer area
    const A = Q * 1000 / (U * Math.max(LMTD, 3));

    // Cooling water flow
    const cpW = 4.18;
    const mw = Q / (cpW * (Two - Twi)) * 3.6; // m³/h

    // Tube sizing
    const tubeLength = 3.0; // m typical
    const ID = OD - 2 * 1.2; // mm (BWG 18)
    const tubeArea = Math.PI * (OD / 1000) * tubeLength;
    const numTubes = Math.ceil(A / tubeArea);

    // Tube velocity
    const tubeFlowArea = numTubes / 2 * Math.PI / 4 * Math.pow(ID / 1000, 2); // 2-pass
    const tubeV = mw / 3600 / Math.max(tubeFlowArea, 0.001);

    const isSafe = tubeV >= 0.5 && tubeV <= 3.0 && LMTD > 3;

    if (tubeV > 2.5) recs.push(`High tube velocity ${tubeV.toFixed(1)}m/s — erosion risk, add tubes`);
    if (tubeV < 0.8) recs.push(`Low tube velocity ${tubeV.toFixed(1)}m/s — fouling risk`);
    if (LMTD < 5) recs.push(`Low LMTD ${LMTD.toFixed(1)}°C — large area needed, reduce CW inlet temp`);
    if (Pop < 0.1) recs.push(`Vacuum operation — verify air leak tightness and ejector sizing`);
    if (recs.length === 0) recs.push(`Condenser nominal — ${A.toFixed(0)}m², ${numTubes} tubes, CW ${mw.toFixed(0)}m³/h`);

    return {
      heat_duty_kW: mkAv(Math.round(Q * 10) / 10, "kW", Q * 0.05, "latent_heat"),
      heat_transfer_area_m2: mkAv(Math.round(A * 10) / 10, "m²", A * 0.12, "heat_transfer"),
      cooling_water_flow_m3_h: mkAv(Math.round(mw * 10) / 10, "m³/h", mw * 0.05, "energy_balance"),
      number_of_tubes: mkAv(numTubes, "tubes", 0, "area_division"),
      overall_U_W_m2K: mkAv(U, "W/m²·K", U * 0.15, "hei_standard"),
      lmtd_C: mkAv(Math.round(LMTD * 10) / 10, "°C", LMTD * 0.08, "log_mean"),
      tube_velocity_m_s: mkAv(Math.round(tubeV * 10) / 10, "m/s", tubeV * 0.10, "continuity"),
      subcooling_C: mkAv(subcool, "°C", 1, "design_practice"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const condenserDesignEngine = new CondenserDesignEngine();
