/**
 * AirDuctEngine — HVAC/industrial duct sizing and pressure drop
 *
 * Models: Darcy-Weisbach (Δp = f×L/D×ρv²/2), Colebrook-White friction factor,
 *         equal friction method, noise velocity limits
 * References: ASHRAE Fundamentals Ch.21, SMACNA Duct Design
 * Safety: Velocity limits for noise, static pressure class
 */

// ─── Types ─────────────────────────────────────────────────────────

export type DuctShape = "round" | "rectangular";
export type DuctMaterial = "galvanized" | "stainless" | "aluminum" | "pvc" | "fiberglass";

export interface AirDuctInput {
  flow_rate_m3_h: number;
  duct_length_m: number;
  shape?: DuctShape;                        // default round
  diameter_mm?: number;                     // for round (auto-sized if omitted)
  width_mm?: number;                        // for rectangular
  height_mm?: number;                       // for rectangular
  material?: DuctMaterial;                  // default galvanized
  max_velocity_m_s?: number;               // default 8 m/s (commercial)
  num_elbows?: number;                     // default 2
  num_tees?: number;                       // default 0
  air_temp_C?: number;                     // default 20
  altitude_m?: number;                     // default 0
}

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

export interface AirDuctResult {
  duct_diameter_mm: AtomicValue;
  hydraulic_diameter_mm: AtomicValue;
  air_velocity_m_s: AtomicValue;
  pressure_drop_Pa: AtomicValue;
  pressure_drop_per_m_Pa: AtomicValue;
  friction_factor: AtomicValue;
  reynolds_number: AtomicValue;
  fitting_loss_Pa: AtomicValue;
  total_loss_Pa: AtomicValue;
  fan_power_W: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Reference Data ────────────────────────────────────────────────

const ROUGHNESS_MM: Record<DuctMaterial, number> = {
  galvanized: 0.15,
  stainless: 0.045,
  aluminum: 0.05,
  pvc: 0.01,
  fiberglass: 0.90,
};

// ─── Engine ────────────────────────────────────────────────────────

function mkAv(value: number, unit: string, unc: number, source: string, warning?: string): AtomicValue {
  return { value, unit, uncertainty: unc, source, warning };
}

/** Colebrook-White friction factor (iterative) */
function colebrook(Re: number, eps_D: number): number {
  if (Re < 2300) return 64 / Re; // laminar
  let f = 0.02; // initial guess
  for (let i = 0; i < 20; i++) {
    const rhs = -2 * Math.log10(eps_D / 3.7 + 2.51 / (Re * Math.sqrt(f)));
    f = 1 / (rhs * rhs);
  }
  return f;
}

export class AirDuctEngine {
  calculate(input: AirDuctInput): AirDuctResult {
    const {
      flow_rate_m3_h: Qh,
      duct_length_m: L,
      shape = "round",
      material = "galvanized",
      max_velocity_m_s: vMax = 8,
      num_elbows: nElbow = 2,
      num_tees: nTee = 0,
      air_temp_C: T = 20,
      altitude_m: alt = 0,
    } = input;

    const recs: string[] = [];
    const Q = Qh / 3600; // m³/s
    const eps = ROUGHNESS_MM[material] / 1000; // m

    // Air properties (altitude & temperature corrected)
    const rho = 1.225 * (1 - alt * 0.0000226) * (293.15 / (T + 273.15));
    const mu = 1.81e-5; // dynamic viscosity Pa·s (approx)

    // Determine hydraulic diameter
    let Dh: number; // hydraulic diameter in m
    let area: number; // cross-section in m²

    if (shape === "round") {
      let D = input.diameter_mm;
      if (!D) {
        // Size for max velocity: A = Q/v → D = √(4A/π)
        area = Q / vMax;
        D = Math.sqrt(4 * area / Math.PI) * 1000;
        // Round up to standard sizes (25mm increments)
        D = Math.ceil(D / 25) * 25;
      }
      Dh = D / 1000;
      area = Math.PI * Dh * Dh / 4;
    } else {
      const W = (input.width_mm ?? 400) / 1000;
      const H = (input.height_mm ?? 300) / 1000;
      area = W * H;
      Dh = 2 * W * H / (W + H); // hydraulic diameter
    }

    // Velocity
    const v = Q / area;

    // Reynolds number
    const Re = rho * v * Dh / mu;

    // Friction factor (Colebrook-White)
    const f = colebrook(Re, eps / Dh);

    // Straight duct pressure drop: Δp = f × L/Dh × ρv²/2
    const dpStraight = f * L / Dh * rho * v * v / 2;
    const dpPerM = dpStraight / L;

    // Fitting losses (equivalent length method)
    const elbowLeq = 12 * Dh; // 12D equivalent length per elbow
    const teeLeq = 25 * Dh;   // 25D per tee
    const fittingLeq = nElbow * elbowLeq + nTee * teeLeq;
    const dpFittings = f * fittingLeq / Dh * rho * v * v / 2;

    const totalLoss = dpStraight + dpFittings;

    // Fan power: P = Q × Δp / η_fan
    const etaFan = 0.65;
    const fanPower = Q * totalLoss / etaFan;

    const isSafe = v <= vMax * 1.2 && totalLoss < 2000;

    if (v > vMax) {
      recs.push(`Velocity ${v.toFixed(1)}m/s exceeds recommended ${vMax}m/s — increase duct size to reduce noise`);
    }
    if (v < 3) {
      recs.push(`Low velocity ${v.toFixed(1)}m/s — risk of particle settling in horizontal runs`);
    }
    if (dpPerM > 1.5) {
      recs.push(`High friction loss ${dpPerM.toFixed(2)}Pa/m — consider larger duct or smoother material`);
    }
    if (totalLoss > 1000) {
      recs.push(`High total pressure drop ${totalLoss.toFixed(0)}Pa — verify fan selection`);
    }
    if (recs.length === 0) {
      recs.push(`Duct sizing nominal — ${(Dh * 1000).toFixed(0)}mm Dh, ${v.toFixed(1)}m/s, ${totalLoss.toFixed(0)}Pa total loss`);
    }

    return {
      duct_diameter_mm: mkAv(Math.round(Dh * 1000), "mm", Dh * 1000 * 0.01, "sizing_calculation"),
      hydraulic_diameter_mm: mkAv(Math.round(Dh * 1000 * 10) / 10, "mm", Dh * 1000 * 0.01, "geometry"),
      air_velocity_m_s: mkAv(Math.round(v * 100) / 100, "m/s", v * 0.05, "continuity"),
      pressure_drop_Pa: mkAv(Math.round(dpStraight * 10) / 10, "Pa", dpStraight * 0.10, "darcy_weisbach"),
      pressure_drop_per_m_Pa: mkAv(Math.round(dpPerM * 100) / 100, "Pa/m", dpPerM * 0.10, "darcy_weisbach"),
      friction_factor: mkAv(Math.round(f * 10000) / 10000, "dimensionless", f * 0.05, "colebrook_white"),
      reynolds_number: mkAv(Math.round(Re), "dimensionless", Re * 0.03, "fluid_dynamics"),
      fitting_loss_Pa: mkAv(Math.round(dpFittings * 10) / 10, "Pa", dpFittings * 0.15, "equivalent_length"),
      total_loss_Pa: mkAv(Math.round(totalLoss * 10) / 10, "Pa", totalLoss * 0.10, "sum_losses"),
      fan_power_W: mkAv(Math.round(fanPower * 10) / 10, "W", fanPower * 0.12, "hydraulic_power"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const airDuctEngine = new AirDuctEngine();
