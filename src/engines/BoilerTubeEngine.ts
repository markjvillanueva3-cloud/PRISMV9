/**
 * BoilerTubeEngine — Fire-tube / water-tube boiler tube sizing
 *
 * Models: Heat transfer (Q=UAΔTlm), tube wall thickness (ASME I),
 *         circulation ratio, steam generation rate
 * References: ASME Boiler Code Section I, HEI Standards
 * Safety: Tube wall temperature, creep life, corrosion allowance
 */

export type BoilerType = "fire_tube" | "water_tube" | "waste_heat";

export interface BoilerTubeInput {
  steam_capacity_kg_h: number;
  steam_pressure_bar?: number;        // default 10
  feed_water_temp_C?: number;         // default 80
  tube_od_mm?: number;                // default 50.8 (2")
  tube_material?: string;             // default SA-178A
  flue_gas_temp_C?: number;           // default 900
  boiler_type?: BoilerType;
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface BoilerTubeResult {
  tube_thickness_mm: AtomicValue;
  number_of_tubes: AtomicValue;
  heating_surface_m2: AtomicValue;
  heat_duty_MW: AtomicValue;
  tube_wall_temp_C: AtomicValue;
  steam_velocity_m_s: AtomicValue;
  lmtd_C: AtomicValue;
  circulation_ratio: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class BoilerTubeEngine {
  calculate(input: BoilerTubeInput): BoilerTubeResult {
    const {
      steam_capacity_kg_h: ms,
      steam_pressure_bar: Ps = 10,
      feed_water_temp_C: Tfw = 80,
      tube_od_mm: OD = 50.8,
      flue_gas_temp_C: Tgas = 900,
      boiler_type = "fire_tube",
    } = input;

    const recs: string[] = [];

    // Steam temperature (saturated)
    const Tsat = 100 + (Ps - 1) * 5.5; // simplified correlation
    const hfg = 2257 - Ps * 15; // kJ/kg latent heat (approximate)
    const cp_w = 4.18; // kJ/kg·K

    // Heat duty
    const Q = ms * (hfg + cp_w * (Tsat - Tfw)) / 3600; // kW
    const Q_MW = Q / 1000;

    // LMTD
    const dT1 = Tgas - Tsat;
    const dT2 = (Tgas - 200) - Tfw; // assume exhaust at ~200°C
    const LMTD = (dT1 - dT2) / Math.log(dT1 / dT2);

    // Overall U (W/m²·K)
    const U = boiler_type === "fire_tube" ? 40 : boiler_type === "water_tube" ? 60 : 35;

    // Required heating surface
    const A = Q * 1000 / (U * LMTD); // m²

    // Tube count
    const tubeLength = boiler_type === "fire_tube" ? 3.5 : 5.0; // m typical
    const tubeArea = Math.PI * (OD / 1000) * tubeLength;
    const numTubes = Math.ceil(A / tubeArea);

    // Tube wall thickness: ASME I: t = P×D/(2×S×E + 2×y×P) + CA
    const S = 103; // MPa (SA-178A at temperature)
    const E = 1.0; // seamless
    const y = 0.4;
    const P_MPa = Ps * 0.1;
    const CA = 1.5; // mm corrosion allowance
    const tMin = (P_MPa * OD) / (2 * S * E + 2 * y * P_MPa) + CA;
    const stdThick = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0];
    const tActual = stdThick.find(t => t >= tMin) ?? Math.ceil(tMin);

    // Tube wall temperature
    const Twall = Tsat + Q * 1000 / A * (tActual / 1000) / 45; // through-wall ΔT

    // Steam velocity in tubes (water-tube) or shell
    const ID = OD - 2 * tActual;
    const tubeFlowArea = numTubes * Math.PI / 4 * Math.pow(ID / 1000, 2);
    const rhoSteam = Ps * 100 / (0.461 * (Tsat + 273));
    const steamV = ms / 3600 / rhoSteam / tubeFlowArea;

    // Circulation ratio
    const circRatio = boiler_type === "water_tube" ? 15 : boiler_type === "fire_tube" ? 8 : 12;

    const isSafe = Twall < 450 && tActual >= tMin;

    if (Twall > 400) recs.push(`High tube wall temp ${Twall.toFixed(0)}°C — creep risk, verify material`);
    if (Ps > 30) recs.push(`High pressure ${Ps}bar — verify ASME I compliance`);
    if (steamV > 25) recs.push(`High steam velocity ${steamV.toFixed(1)}m/s — erosion risk`);
    if (recs.length === 0) recs.push(`Boiler nominal — ${numTubes} tubes, ${A.toFixed(0)}m², ${Q_MW.toFixed(2)}MW`);

    return {
      tube_thickness_mm: mkAv(tActual, "mm", 0, "asme_section_I"),
      number_of_tubes: mkAv(numTubes, "tubes", 0, "area_division"),
      heating_surface_m2: mkAv(Math.round(A * 10) / 10, "m²", A * 0.08, "heat_transfer"),
      heat_duty_MW: mkAv(Math.round(Q_MW * 100) / 100, "MW", Q_MW * 0.05, "energy_balance"),
      tube_wall_temp_C: mkAv(Math.round(Twall), "°C", Twall * 0.10, "conduction"),
      steam_velocity_m_s: mkAv(Math.round(steamV * 10) / 10, "m/s", steamV * 0.10, "continuity"),
      lmtd_C: mkAv(Math.round(LMTD), "°C", LMTD * 0.08, "log_mean"),
      circulation_ratio: mkAv(circRatio, "ratio", circRatio * 0.15, "design_practice"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const boilerTubeEngine = new BoilerTubeEngine();
