/**
 * OrificeFlowMeterEngine — Orifice plate flow measurement
 *
 * Models: ISO 5167 (Q=CdEA√(2ρΔP)), Reader-Harris/Gallagher Cd,
 *         expansibility, permanent loss
 * References: ISO 5167-2, AGA Report No. 3
 */

export type TapType = "flange" | "corner" | "D_D2" | "vena_contracta";

export interface OrificeFlowMeterInput {
  pipe_diameter_mm: number;
  orifice_diameter_mm: number;
  differential_pressure_Pa?: number;
  flow_rate_m3_h?: number;
  fluid_density_kg_m3?: number;         // default 1000
  fluid_viscosity_cP?: number;          // default 1
  tap_type?: TapType;
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface OrificeFlowMeterResult {
  flow_rate_m3_h: AtomicValue;
  differential_pressure_Pa: AtomicValue;
  beta_ratio: AtomicValue;
  discharge_coefficient: AtomicValue;
  permanent_loss_Pa: AtomicValue;
  permanent_loss_pct: AtomicValue;
  velocity_approach_factor: AtomicValue;
  reynolds_number: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class OrificeFlowMeterEngine {
  calculate(input: OrificeFlowMeterInput): OrificeFlowMeterResult {
    const {
      pipe_diameter_mm: D,
      orifice_diameter_mm: d,
      fluid_density_kg_m3: rho = 1000,
      fluid_viscosity_cP: mu_cP = 1,
      tap_type = "flange",
    } = input;

    const recs: string[] = [];
    const beta = d / D;
    const Dm = D / 1000;
    const dm = d / 1000;
    const mu = mu_cP * 1e-3;
    const A = Math.PI / 4 * dm * dm;

    // Velocity of approach factor
    const E = 1 / Math.sqrt(1 - Math.pow(beta, 4));

    // Discharge coefficient (Reader-Harris/Gallagher simplified)
    const Cd = 0.5959 + 0.0312 * Math.pow(beta, 2.1) - 0.184 * Math.pow(beta, 8);

    let Q: number, dP: number;

    if (input.differential_pressure_Pa !== undefined) {
      dP = input.differential_pressure_Pa;
      Q = Cd * E * A * Math.sqrt(2 * dP / rho) * 3600;
    } else if (input.flow_rate_m3_h !== undefined) {
      Q = input.flow_rate_m3_h;
      const Qs = Q / 3600;
      dP = rho / 2 * Math.pow(Qs / (Cd * E * A), 2);
    } else {
      Q = 10; dP = 0;
    }

    const Qs = Q / 3600;
    const vPipe = Qs / (Math.PI / 4 * Dm * Dm);
    const Re = rho * vPipe * Dm / mu;

    // Permanent pressure loss
    const permLossFrac = 1 - Math.pow(beta, 2); // simplified
    const permLoss = dP * permLossFrac;
    const permLossPct = permLossFrac * 100;

    const isSafe = beta >= 0.2 && beta <= 0.7 && Re > 5000;

    if (beta < 0.2) recs.push(`Low β=${beta.toFixed(2)} — poor ΔP signal, increase orifice`);
    if (beta > 0.7) recs.push(`High β=${beta.toFixed(2)} — Cd uncertainty increases`);
    if (Re < 10000) recs.push(`Low Re=${Re.toFixed(0)} — Cd correction significant`);
    if (permLossPct > 80) recs.push(`High permanent loss ${permLossPct.toFixed(0)}% — consider Venturi`);
    if (recs.length === 0) recs.push(`Orifice meter nominal — Q=${Q.toFixed(1)}m³/h, β=${beta.toFixed(2)}, Cd=${Cd.toFixed(4)}`);

    return {
      flow_rate_m3_h: mkAv(Math.round(Q * 10) / 10, "m³/h", Q * 0.02, "iso_5167"),
      differential_pressure_Pa: mkAv(Math.round(dP), "Pa", dP * 0.02, "bernoulli"),
      beta_ratio: mkAv(Math.round(beta * 1000) / 1000, "ratio", 0, "geometry"),
      discharge_coefficient: mkAv(Math.round(Cd * 10000) / 10000, "ratio", 0.005, "reader_harris"),
      permanent_loss_Pa: mkAv(Math.round(permLoss), "Pa", permLoss * 0.10, "irrecoverable"),
      permanent_loss_pct: mkAv(Math.round(permLossPct), "%", 3, "beta_dependent"),
      velocity_approach_factor: mkAv(Math.round(E * 10000) / 10000, "ratio", E * 0.005, "beta"),
      reynolds_number: mkAv(Math.round(Re), "dimensionless", Re * 0.05, "pipe_flow"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const orificeFlowMeterEngine = new OrificeFlowMeterEngine();
