/**
 * RocketNozzleEngine — Converging-diverging nozzle (de Laval) analysis
 *
 * Models: Isentropic flow, thrust equation, nozzle geometry,
 *         specific impulse, mass flow rate, exit conditions
 * References: Sutton & Biblarz, Anderson Compressible Flow, NASA SP-125
 */

export type PropellantType = "LOX_LH2" | "LOX_RP1" | "N2O4_UDMH" | "solid_APCP" | "cold_gas_N2" | "LOX_CH4";
export type NozzleContour = "conical_15deg" | "bell_80pct" | "bell_90pct" | "aerospike" | "plug";

export interface RocketNozzleInput {
  propellant?: PropellantType;
  contour?: NozzleContour;
  chamber_pressure_bar: number;
  throat_diameter_mm: number;
  expansion_ratio?: number;          // Ae/At, default 40
  chamber_temperature_K?: number;    // default from propellant
  ambient_pressure_bar?: number;     // default 0 (vacuum)
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface RocketNozzleResult {
  thrust_kN: AtomicValue;
  specific_impulse_s: AtomicValue;
  mass_flow_kg_s: AtomicValue;
  exit_velocity_m_s: AtomicValue;
  exit_mach_number: AtomicValue;
  exit_pressure_bar: AtomicValue;
  exit_temperature_K: AtomicValue;
  throat_area_mm2: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Propellant: [Tc_K, gamma, molecular_mass_g/mol, characteristic_velocity_m/s]
const PROP_DATA: Record<PropellantType, [number, number, number, number]> = {
  LOX_LH2:    [3500, 1.20, 10,  2400],
  LOX_RP1:    [3600, 1.22, 22,  1800],
  N2O4_UDMH:  [3400, 1.25, 24,  1750],
  solid_APCP: [3200, 1.17, 28,  1600],
  cold_gas_N2: [300, 1.40, 28,  400],
  LOX_CH4:    [3500, 1.21, 18,  1900],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class RocketNozzleEngine {
  calculate(input: RocketNozzleInput): RocketNozzleResult {
    const {
      propellant = "LOX_RP1",
      contour = "bell_80pct",
      chamber_pressure_bar: Pc,
      throat_diameter_mm: Dt,
      expansion_ratio: epsilon = 40,
      ambient_pressure_bar: Pa = 0,
    } = input;

    const recs: string[] = [];
    const [Tc_default, gamma, M_mol, cStar] = PROP_DATA[propellant];
    const Tc = input.chamber_temperature_K ?? Tc_default;
    const g = gamma;

    // Throat area
    const At = Math.PI * Math.pow(Dt / 2, 2); // mm²
    const AtM2 = At / 1e6; // m²

    // Mass flow rate: mdot = Pc × At / c*
    const PcPa = Pc * 1e5; // Pa
    const mdot = PcPa * AtM2 / cStar;

    // Exit Mach number from area ratio (iterative, use approximation)
    // For large ε: Me ≈ 1 + 1.2 × (ε - 1)^0.4 (rough)
    let Me = 1;
    for (let i = 0; i < 50; i++) {
      const term = (2 / (g + 1)) * (1 + (g - 1) / 2 * Me * Me);
      const aRatio = Math.pow(term, (g + 1) / (2 * (g - 1))) / Me;
      if (Math.abs(aRatio - epsilon) < 0.01) break;
      Me += (epsilon - aRatio) * 0.1;
      if (Me < 1) Me = 1.01;
    }

    // Exit conditions (isentropic)
    const Te = Tc / (1 + (g - 1) / 2 * Me * Me);
    const Pe = Pc / Math.pow(1 + (g - 1) / 2 * Me * Me, g / (g - 1));

    // Exit velocity
    const R = 8314 / M_mol; // J/(kg·K)
    const Ve = Me * Math.sqrt(g * R * Te);

    // Thrust: F = mdot × Ve + (Pe - Pa) × Ae × 1e5
    const Ae = AtM2 * epsilon;
    const thrust = mdot * Ve + (Pe - Pa) * 1e5 * Ae;
    const thrustKN = thrust / 1000;

    // Specific impulse
    const Isp = thrust / (mdot * 9.81);

    // Contour efficiency
    const contourEff = contour === "conical_15deg" ? 0.98 :
      contour === "bell_80pct" ? 0.99 : contour === "bell_90pct" ? 0.995 :
      contour === "aerospike" ? 0.97 : 0.96;
    const adjThrust = thrustKN * contourEff;
    const adjIsp = Isp * contourEff;

    const isSafe = Pc < 300 && Me > 1 && Te < 4000;

    if (Pa > Pe) recs.push(`Over-expanded: Pa=${Pa}bar > Pe=${Pe.toFixed(2)}bar — flow separation risk`);
    if (epsilon > 100) recs.push(`Very high expansion ratio ${epsilon} — diminishing returns, weight penalty`);
    if (Pc > 200) recs.push(`High chamber pressure ${Pc}bar — advanced cooling required`);
    if (Tc > 3800) recs.push(`Very high Tc ${Tc}K — thermal barrier coating needed`);
    if (Pa > 0.5 && epsilon > 50) recs.push(`Sea-level with ε=${epsilon} — consider dual-bell or truncation`);
    if (recs.length === 0) recs.push(`Nozzle nominal — F=${adjThrust.toFixed(1)}kN, Isp=${adjIsp.toFixed(0)}s, Me=${Me.toFixed(1)}`);

    return {
      thrust_kN: mkAv(Math.round(adjThrust * 100) / 100, "kN", adjThrust * 0.03, "momentum_pressure"),
      specific_impulse_s: mkAv(Math.round(adjIsp), "s", adjIsp * 0.03, "F_mdot_g"),
      mass_flow_kg_s: mkAv(Math.round(mdot * 10000) / 10000, "kg/s", mdot * 0.02, "Pc_At_cstar"),
      exit_velocity_m_s: mkAv(Math.round(Ve), "m/s", Ve * 0.03, "isentropic"),
      exit_mach_number: mkAv(Math.round(Me * 100) / 100, "Ma", Me * 0.02, "area_ratio"),
      exit_pressure_bar: mkAv(Math.round(Pe * 1000) / 1000, "bar", Pe * 0.05, "isentropic"),
      exit_temperature_K: mkAv(Math.round(Te), "K", Te * 0.05, "isentropic"),
      throat_area_mm2: mkAv(Math.round(At * 10) / 10, "mm²", At * 0.01, "geometry"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const rocketNozzleEngine = new RocketNozzleEngine();
