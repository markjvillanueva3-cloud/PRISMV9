/**
 * VenturiEngine — Venturi meter flow measurement
 *
 * Models: Bernoulli (Q=CdA2√(2ΔP/(ρ(1-β⁴)))), discharge coefficient,
 *         permanent pressure loss, Reynolds correction
 * References: ISO 5167, ASME MFC-3M
 */

export interface VenturiInput {
  pipe_diameter_mm: number;
  throat_diameter_mm: number;
  differential_pressure_Pa?: number;    // for flow calc
  flow_rate_m3_h?: number;              // for ΔP calc
  fluid_density_kg_m3?: number;         // default 1000
  fluid_viscosity_cP?: number;          // default 1
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface VenturiResult {
  flow_rate_m3_h: AtomicValue;
  differential_pressure_Pa: AtomicValue;
  beta_ratio: AtomicValue;
  discharge_coefficient: AtomicValue;
  throat_velocity_m_s: AtomicValue;
  permanent_loss_pct: AtomicValue;
  reynolds_number: AtomicValue;
  pipe_velocity_m_s: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class VenturiEngine {
  calculate(input: VenturiInput): VenturiResult {
    const {
      pipe_diameter_mm: D,
      throat_diameter_mm: d,
      fluid_density_kg_m3: rho = 1000,
      fluid_viscosity_cP: mu_cP = 1,
    } = input;

    const recs: string[] = [];
    const beta = d / D;
    const Dm = D / 1000;
    const dm = d / 1000;
    const mu = mu_cP * 1e-3;
    const A2 = Math.PI / 4 * dm * dm;

    // Discharge coefficient (classical Venturi)
    const Cd = 0.995; // ISO 5167

    let Q: number, dP: number;

    if (input.differential_pressure_Pa !== undefined) {
      dP = input.differential_pressure_Pa;
      Q = Cd * A2 * Math.sqrt(2 * dP / (rho * (1 - Math.pow(beta, 4))));
      Q *= 3600; // m³/h
    } else if (input.flow_rate_m3_h !== undefined) {
      Q = input.flow_rate_m3_h;
      const Qs = Q / 3600;
      dP = rho * (1 - Math.pow(beta, 4)) / 2 * Math.pow(Qs / (Cd * A2), 2);
    } else {
      Q = 10; dP = 0;
    }

    const Qs = Q / 3600;
    const vPipe = Qs / (Math.PI / 4 * Dm * Dm);
    const vThroat = Qs / A2;

    // Reynolds number
    const Re = rho * vPipe * Dm / mu;

    // Permanent pressure loss (Venturi recovers ~85-90%)
    const permLoss = 10 + (1 - beta) * 5; // % of ΔP

    const isSafe = beta >= 0.3 && beta <= 0.75 && Re > 2e5;

    if (beta < 0.3) recs.push(`Low β=${beta.toFixed(2)} — poor sensitivity, increase throat size`);
    if (beta > 0.75) recs.push(`High β=${beta.toFixed(2)} — accuracy degrades, reduce throat`);
    if (Re < 2e5) recs.push(`Low Re=${Re.toFixed(0)} — Cd correction needed`);
    if (vThroat > 75) recs.push(`High throat velocity ${vThroat.toFixed(1)}m/s — cavitation risk`);
    if (recs.length === 0) recs.push(`Venturi nominal — Q=${Q.toFixed(1)}m³/h, β=${beta.toFixed(2)}, ΔP=${dP.toFixed(0)}Pa`);

    return {
      flow_rate_m3_h: mkAv(Math.round(Q * 10) / 10, "m³/h", Q * 0.01, "bernoulli"),
      differential_pressure_Pa: mkAv(Math.round(dP), "Pa", dP * 0.01, "bernoulli"),
      beta_ratio: mkAv(Math.round(beta * 1000) / 1000, "ratio", 0, "geometry"),
      discharge_coefficient: mkAv(Cd, "ratio", 0.005, "iso_5167"),
      throat_velocity_m_s: mkAv(Math.round(vThroat * 10) / 10, "m/s", vThroat * 0.02, "continuity"),
      permanent_loss_pct: mkAv(Math.round(permLoss), "%", 2, "recovery"),
      reynolds_number: mkAv(Math.round(Re), "dimensionless", Re * 0.05, "pipe_flow"),
      pipe_velocity_m_s: mkAv(Math.round(vPipe * 100) / 100, "m/s", vPipe * 0.02, "continuity"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const venturiEngine = new VenturiEngine();
