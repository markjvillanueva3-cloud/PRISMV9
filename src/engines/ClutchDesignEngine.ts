/**
 * ClutchDesignEngine — Friction clutch torque capacity and thermal analysis
 *
 * Models: Uniform wear theory (T = μFRm×n), thermal capacity (ΔT = E/(m×c)),
 *         engagement dynamics, plate sizing
 * References: Shigley Ch.16, SAE J866 friction materials
 * Safety: Temperature limits, torque margin, fade resistance
 */

// ─── Types ─────────────────────────────────────────────────────────

export type ClutchType = "single_plate" | "multi_plate" | "cone" | "centrifugal";
export type FrictionMaterial = "organic" | "sintered" | "ceramic" | "carbon_carbon";

export interface ClutchDesignInput {
  max_torque_Nm: number;
  max_speed_rpm: number;
  clutch_type?: ClutchType;                  // default single_plate
  friction_material?: FrictionMaterial;      // default organic
  outer_radius_mm?: number;                  // auto-sized if omitted
  inner_radius_mm?: number;                  // default 0.6 × outer
  num_friction_surfaces?: number;            // default 2 (single plate)
  inertia_kgm2?: number;                     // driven side, default 0.5
  engagement_time_s?: number;                // default 1.0
  duty_cycle_per_hour?: number;              // default 20
}

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

export interface ClutchDesignResult {
  torque_capacity_Nm: AtomicValue;
  torque_margin_pct: AtomicValue;
  clamp_force_N: AtomicValue;
  mean_radius_mm: AtomicValue;
  contact_pressure_MPa: AtomicValue;
  energy_per_engagement_kJ: AtomicValue;
  temperature_rise_C: AtomicValue;
  power_dissipation_kW: AtomicValue;
  max_peripheral_speed_m_s: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Reference Data ────────────────────────────────────────────────

const FRICTION_PROPS: Record<FrictionMaterial, { mu: number; max_temp_C: number; max_pressure_MPa: number; density_kg_m3: number; cp_J_kgK: number }> = {
  organic:       { mu: 0.35, max_temp_C: 250, max_pressure_MPa: 1.0, density_kg_m3: 2200, cp_J_kgK: 1200 },
  sintered:      { mu: 0.40, max_temp_C: 500, max_pressure_MPa: 2.0, density_kg_m3: 5500, cp_J_kgK: 500 },
  ceramic:       { mu: 0.45, max_temp_C: 800, max_pressure_MPa: 3.0, density_kg_m3: 3200, cp_J_kgK: 800 },
  carbon_carbon: { mu: 0.30, max_temp_C: 1200, max_pressure_MPa: 2.5, density_kg_m3: 1600, cp_J_kgK: 710 },
};

// ─── Engine ────────────────────────────────────────────────────────

function mkAv(value: number, unit: string, unc: number, source: string, warning?: string): AtomicValue {
  return { value, unit, uncertainty: unc, source, warning };
}

export class ClutchDesignEngine {
  calculate(input: ClutchDesignInput): ClutchDesignResult {
    const {
      max_torque_Nm: Treq,
      max_speed_rpm: rpm,
      clutch_type: ctype = "single_plate",
      friction_material: fmat = "organic",
      num_friction_surfaces: nSurf = ctype === "multi_plate" ? 6 : 2,
      inertia_kgm2: J = 0.5,
      engagement_time_s: tEng = 1.0,
      duty_cycle_per_hour: duty = 20,
    } = input;

    const recs: string[] = [];
    const fp = FRICTION_PROPS[fmat];
    const mu = fp.mu;
    const sf = 1.5; // design safety factor

    // Size outer radius if not given: T = μ × F × Rm × n
    // Start from required capacity = Treq × sf
    const Tcap_req = Treq * sf;

    let Ro = input.outer_radius_mm;
    if (!Ro) {
      // Estimate: Tcap = μ × p_max × 2π × Rm² × (Ro-Ri) × n
      // With Ri = 0.6Ro, Rm ≈ 0.8Ro
      // Tcap ≈ μ × p_max × 2π × 0.64Ro² × 0.4Ro × n
      // Solve for Ro
      const k = mu * fp.max_pressure_MPa * 2 * Math.PI * 0.64 * 0.4 * nSurf;
      Ro = Math.pow(Tcap_req * 1000 / k, 1 / 3); // mm
      Ro = Math.ceil(Ro / 5) * 5; // round up to 5mm
    }

    const Ri = input.inner_radius_mm ?? Ro * 0.6;
    const Rm = (Ro + Ri) / 2; // mean radius

    // Contact area
    const contactArea = Math.PI * (Ro * Ro - Ri * Ri); // mm²

    // Uniform wear theory: T = μ × F × Rm × n / 1000 (Nm, mm→m)
    // Required clamp force: F = T / (μ × Rm/1000 × n)
    const F = Tcap_req / (mu * Rm / 1000 * nSurf);

    // Actual torque capacity
    const Tcap = mu * F * (Rm / 1000) * nSurf;

    // Contact pressure
    const pressure = F / contactArea; // N/mm² = MPa

    // Energy per engagement: E = 0.5 × J × ω²
    const omega = 2 * Math.PI * rpm / 60;
    const energy = 0.5 * J * omega * omega / 1000; // kJ

    // Temperature rise: ΔT = E / (m × cp)
    // Approximate disc mass
    const discThick = 3; // mm typical
    const discVol = contactArea * discThick / 1e9; // m³
    const discMass = discVol * fp.density_kg_m3 * nSurf;
    const tempRise = energy * 1000 / (discMass * fp.cp_J_kgK);

    // Power dissipation (average over duty cycle)
    const avgPower = energy * duty / 3600; // kW

    // Peripheral speed
    const vPeripheral = omega * Ro / 1000;

    const torqueMargin = (Tcap / Treq - 1) * 100;

    const isSafe = pressure < fp.max_pressure_MPa && tempRise < fp.max_temp_C * 0.5 && torqueMargin > 25;

    if (pressure > fp.max_pressure_MPa * 0.8) {
      recs.push(`Contact pressure ${pressure.toFixed(2)}MPa near limit ${fp.max_pressure_MPa}MPa — increase disc size`);
    }
    if (tempRise > fp.max_temp_C * 0.3) {
      recs.push(`Temperature rise ${tempRise.toFixed(0)}°C per engagement — monitor for fade at high duty`);
    }
    if (vPeripheral > 50) {
      recs.push(`High peripheral speed ${vPeripheral.toFixed(1)}m/s — verify burst strength and balance`);
    }
    if (torqueMargin < 30) {
      recs.push(`Torque margin ${torqueMargin.toFixed(0)}% is low — target ≥50% for reliability`);
    }
    if (recs.length === 0) {
      recs.push(`Clutch sizing nominal — ${Tcap.toFixed(0)}Nm capacity, ${torqueMargin.toFixed(0)}% margin, ${fmat} friction`);
    }

    return {
      torque_capacity_Nm: mkAv(Math.round(Tcap * 10) / 10, "Nm", Tcap * 0.08, "uniform_wear_theory"),
      torque_margin_pct: mkAv(Math.round(torqueMargin * 10) / 10, "%", torqueMargin * 0.05, "capacity_ratio"),
      clamp_force_N: mkAv(Math.round(F), "N", F * 0.05, "torque_equilibrium"),
      mean_radius_mm: mkAv(Math.round(Rm * 10) / 10, "mm", 0, "geometry"),
      contact_pressure_MPa: mkAv(Math.round(pressure * 1000) / 1000, "MPa", pressure * 0.08, "force_area"),
      energy_per_engagement_kJ: mkAv(Math.round(energy * 100) / 100, "kJ", energy * 0.05, "kinetic_energy"),
      temperature_rise_C: mkAv(Math.round(tempRise * 10) / 10, "°C", tempRise * 0.20, "thermal_model"),
      power_dissipation_kW: mkAv(Math.round(avgPower * 100) / 100, "kW", avgPower * 0.10, "duty_cycle"),
      max_peripheral_speed_m_s: mkAv(Math.round(vPeripheral * 10) / 10, "m/s", vPeripheral * 0.02, "kinematics"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const clutchDesignEngine = new ClutchDesignEngine();
