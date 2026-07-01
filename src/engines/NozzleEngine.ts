/**
 * NozzleEngine — Compressible flow nozzle design
 *
 * Models: Isentropic nozzle (converging/converging-diverging),
 *         choked flow, area ratio, exit conditions
 * References: Anderson compressible flow, NASA isentropic tables
 */

export type NozzleType = "converging" | "converging_diverging" | "plug" | "annular";
export type FluidType = "air" | "steam" | "nitrogen" | "helium" | "combustion_gas";

export interface NozzleInput {
  inlet_pressure_bar: number;
  back_pressure_bar: number;
  inlet_temperature_K: number;
  throat_diameter_mm: number;
  nozzle_type?: NozzleType;
  fluid?: FluidType;
  exit_diameter_mm?: number;          // for CD nozzle
  discharge_coefficient?: number;     // default 0.98
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface NozzleResult {
  mass_flow_kg_s: AtomicValue;
  exit_mach: AtomicValue;
  exit_velocity_m_s: AtomicValue;
  exit_pressure_bar: AtomicValue;
  exit_temperature_K: AtomicValue;
  thrust_N: AtomicValue;
  area_ratio: AtomicValue;
  is_choked: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

const FLUID_PROPS: Record<FluidType, [number, number]> = {
  // [gamma, R (J/kgK)]
  air: [1.4, 287],
  steam: [1.3, 461],
  nitrogen: [1.4, 297],
  helium: [1.667, 2077],
  combustion_gas: [1.33, 287],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class NozzleEngine {
  calculate(input: NozzleInput): NozzleResult {
    const {
      inlet_pressure_bar: P0,
      back_pressure_bar: Pb,
      inlet_temperature_K: T0,
      throat_diameter_mm: dt,
      nozzle_type = "converging",
      fluid = "air",
      discharge_coefficient: Cd = 0.98,
    } = input;

    const recs: string[] = [];
    const [gamma, R] = FLUID_PROPS[fluid];
    const g = gamma;
    const gm1 = g - 1;
    const gp1 = g + 1;

    const At = Math.PI / 4 * Math.pow(dt / 1000, 2); // m²
    const de = input.exit_diameter_mm ?? dt;
    const Ae = Math.PI / 4 * Math.pow(de / 1000, 2);
    const areaRatio = Ae / At;

    // Critical pressure ratio
    const prCrit = Math.pow(2 / gp1, g / gm1);
    const pr = Pb / P0;
    const isChoked = pr <= prCrit;

    let Me: number, Pe: number, Te: number;

    if (nozzle_type === "converging") {
      if (isChoked) {
        Me = 1;
        Pe = P0 * prCrit;
        Te = T0 * 2 / gp1;
      } else {
        Me = Math.sqrt(2 / gm1 * (Math.pow(pr, -gm1 / g) - 1));
        Pe = Pb;
        Te = T0 / (1 + gm1 / 2 * Me * Me);
      }
    } else {
      // Converging-diverging: find Mach from area ratio
      // Newton iteration for supersonic solution
      Me = 1;
      if (areaRatio > 1 && isChoked) {
        // Supersonic branch
        Me = 1 + Math.sqrt(areaRatio - 1); // initial guess
        for (let i = 0; i < 20; i++) {
          const f = (1 / Me) * Math.pow((2 / gp1) * (1 + gm1 / 2 * Me * Me), gp1 / (2 * gm1)) - areaRatio;
          const dfdM = -1 / (Me * Me) * Math.pow((2 / gp1) * (1 + gm1 / 2 * Me * Me), gp1 / (2 * gm1))
            + (1 / Me) * Math.pow((2 / gp1) * (1 + gm1 / 2 * Me * Me), gp1 / (2 * gm1) - 1)
            * (2 / gp1) * gm1 * Me * gp1 / (2 * gm1);
          if (Math.abs(dfdM) > 1e-10) Me -= f / dfdM;
          Me = Math.max(Me, 1.01);
        }
        Pe = P0 / Math.pow(1 + gm1 / 2 * Me * Me, g / gm1);
        Te = T0 / (1 + gm1 / 2 * Me * Me);
      } else {
        Pe = Pb;
        Me = Math.sqrt(2 / gm1 * (Math.pow(P0 / Pb, gm1 / g) - 1));
        Te = T0 / (1 + gm1 / 2 * Me * Me);
      }
    }

    // Speed of sound and velocity at exit
    const ae = Math.sqrt(g * R * Te);
    const Ve = Me * ae;

    // Mass flow (at throat for choked, at exit otherwise)
    const mDot = isChoked
      ? Cd * At * P0 * 1e5 * Math.sqrt(g / (R * T0)) * Math.pow(2 / gp1, gp1 / (2 * gm1))
      : Cd * Ae * Pe * 1e5 / (R * Te) * Ve;

    // Thrust
    const thrust = mDot * Ve + (Pe - Pb) * 1e5 * Ae;

    const isSafe = Me < 5 && T0 < 3000;

    if (isChoked && nozzle_type === "converging") recs.push(`Flow choked at throat — add diverging section for supersonic expansion`);
    if (Me > 3) recs.push(`High exit Mach ${Me.toFixed(2)} — thermal protection needed`);
    if (!isChoked && nozzle_type === "converging_diverging") recs.push(`Not choked — nozzle overexpanded, normal shock in diverging section`);
    if (Pe > Pb * 1.1 && nozzle_type === "converging") recs.push(`Under-expanded: Pe/Pb=${(Pe / Pb).toFixed(2)} — expansion waves at exit`);
    if (recs.length === 0) recs.push(`Nozzle nominal — Me=${Me.toFixed(2)}, ṁ=${mDot.toFixed(3)}kg/s, F=${thrust.toFixed(1)}N`);

    return {
      mass_flow_kg_s: mkAv(Math.round(mDot * 10000) / 10000, "kg/s", mDot * 0.03, "isentropic"),
      exit_mach: mkAv(Math.round(Me * 100) / 100, "ratio", Me * 0.03, "area_ratio"),
      exit_velocity_m_s: mkAv(Math.round(Ve), "m/s", Ve * 0.03, "mach_sound"),
      exit_pressure_bar: mkAv(Math.round(Pe * 100) / 100, "bar", Pe * 0.03, "isentropic"),
      exit_temperature_K: mkAv(Math.round(Te), "K", Te * 0.03, "isentropic"),
      thrust_N: mkAv(Math.round(thrust * 10) / 10, "N", thrust * 0.05, "momentum"),
      area_ratio: mkAv(Math.round(areaRatio * 1000) / 1000, "ratio", 0, "geometry"),
      is_choked: mkAv(isChoked ? 1 : 0, "boolean", 0, "pressure_ratio"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const nozzleEngine = new NozzleEngine();
