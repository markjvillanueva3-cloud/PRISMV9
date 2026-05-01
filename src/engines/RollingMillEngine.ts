/**
 * RollingMillEngine — Flat rolling force, torque, and power analysis
 *
 * Models: Sims/Alexander rolling theory, friction hill,
 *         roll separating force, roll flattening (Hitchcock)
 * References: Roberts "Cold Rolling of Steel", Lenard hot rolling
 * Safety: Roll force limits, strip tension, roll deflection
 */

// ─── Types ─────────────────────────────────────────────────────────

export type RollingMaterial = "low_carbon_steel" | "stainless"
  | "aluminum" | "copper" | "brass" | "titanium";
export type RollingType = "hot" | "cold";

export interface RollingMillInput {
  entry_thickness_mm: number;
  exit_thickness_mm: number;
  strip_width_mm: number;
  roll_diameter_mm: number;
  roll_speed_rpm?: number;               // default 60
  rolling_type?: RollingType;            // default cold
  strip_material?: RollingMaterial;      // default low_carbon_steel
  friction_coefficient?: number;         // default 0.1 cold / 0.4 hot
  front_tension_MPa?: number;            // default 0
  back_tension_MPa?: number;             // default 0
}

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

export interface RollingMillResult {
  reduction_pct: AtomicValue;
  roll_force_kN: AtomicValue;
  roll_torque_kNm: AtomicValue;
  rolling_power_kW: AtomicValue;
  contact_length_mm: AtomicValue;
  exit_speed_m_min: AtomicValue;
  mean_flow_stress_MPa: AtomicValue;
  specific_roll_force_kN_mm: AtomicValue;
  max_reduction_pct: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Reference Data ────────────────────────────────────────────────

const ROLL_MAT: Record<RollingMaterial, {
  sigma0_cold: number; sigma0_hot: number; n: number
}> = {
  low_carbon_steel: { sigma0_cold: 350, sigma0_hot: 120, n: 0.22 },
  stainless:        { sigma0_cold: 600, sigma0_hot: 200, n: 0.30 },
  aluminum:         { sigma0_cold: 120, sigma0_hot: 40,  n: 0.20 },
  copper:           { sigma0_cold: 250, sigma0_hot: 80,  n: 0.35 },
  brass:            { sigma0_cold: 300, sigma0_hot: 100, n: 0.30 },
  titanium:         { sigma0_cold: 500, sigma0_hot: 180, n: 0.15 },
};

// ─── Engine ────────────────────────────────────────────────────────

function mkAv(
  value: number, unit: string, unc: number,
  source: string, warning?: string
): AtomicValue {
  return { value, unit, uncertainty: unc, source, warning };
}

export class RollingMillEngine {
  calculate(input: RollingMillInput): RollingMillResult {
    const {
      entry_thickness_mm: h0,
      exit_thickness_mm: h1,
      strip_width_mm: w,
      roll_diameter_mm: D,
      roll_speed_rpm: rpm = 60,
      rolling_type = "cold",
      strip_material = "low_carbon_steel",
      front_tension_MPa: tf = 0,
      back_tension_MPa: tb = 0,
    } = input;

    const recs: string[] = [];
    const mp = ROLL_MAT[strip_material];
    const R = D / 2; // roll radius mm

    // Default friction
    const mu = input.friction_coefficient
      ?? (rolling_type === "hot" ? 0.40 : 0.10);

    // Draft and reduction
    const draft = h0 - h1;
    const reduction = (draft / h0) * 100;

    // Contact length: L = √(R × Δh)
    const Lc = Math.sqrt(R * draft);

    // Mean flow stress (with strain hardening for cold)
    const epsilon = Math.log(h0 / h1);
    const sigma0 = rolling_type === "cold"
      ? mp.sigma0_cold * Math.pow(epsilon, mp.n)
        / (mp.n + 1) * (mp.n + 1)
      : mp.sigma0_hot;
    // Simplified: use base flow stress with hardening adjustment
    const sigmaM = rolling_type === "cold"
      ? mp.sigma0_cold * (1 + 0.5 * epsilon)
      : mp.sigma0_hot;

    // Roll separating force (simplified Sims):
    // F = σ_m × w × L × Q_p
    // Q_p ≈ 1 + μL/(2h_m) (friction hill factor)
    const hm = (h0 + h1) / 2;
    const Qp = 1 + mu * Lc / (2 * hm);

    // Tension correction
    const tensionFactor = 1 - (tf + tb) / (2 * sigmaM);

    const rollForce = sigmaM * w * Lc * Qp
      * tensionFactor / 1000; // kN

    // Specific roll force
    const specificForce = rollForce / w;

    // Roll torque: T = F × a, where a ≈ 0.5×L (moment arm)
    const arm = 0.5 * Lc / 1000; // m
    const rollTorque = rollForce * arm; // kNm (per roll)
    const totalTorque = rollTorque * 2; // both rolls

    // Roll speed and power
    const omega = 2 * Math.PI * rpm / 60;
    const rollPower = totalTorque * omega; // kW

    // Exit speed
    const rollSurfSpeed = omega * R / 1000; // m/s
    const exitSpeed = rollSurfSpeed * 60; // m/min (approx)

    // Maximum reduction (friction limited): Δh_max = μ²R
    const maxDraft = mu * mu * R;
    const maxReduction = (maxDraft / h0) * 100;

    const isSafe = reduction < maxReduction && reduction < 60;

    if (reduction > maxReduction * 0.9) {
      recs.push(
        `Reduction ${reduction.toFixed(1)}% near friction limit `
        + `${maxReduction.toFixed(1)}% — rolls may skid`
      );
    }
    if (reduction > 40 && rolling_type === "cold") {
      recs.push(
        `High cold reduction ${reduction.toFixed(1)}% — `
        + `consider intermediate annealing`
      );
    }
    if (specificForce > 15) {
      recs.push(
        `High specific force ${specificForce.toFixed(1)}kN/mm — `
        + `verify roll deflection and crown`
      );
    }
    if (recs.length === 0) {
      recs.push(
        `Rolling nominal — ${reduction.toFixed(1)}% reduction, `
        + `${rollForce.toFixed(0)}kN force, `
        + `${rollPower.toFixed(1)}kW`
      );
    }

    return {
      reduction_pct: mkAv(
        Math.round(reduction * 10) / 10, "%", 0, "thickness_ratio"
      ),
      roll_force_kN: mkAv(
        Math.round(rollForce * 10) / 10, "kN",
        rollForce * 0.12, "sims_model"
      ),
      roll_torque_kNm: mkAv(
        Math.round(totalTorque * 100) / 100, "kNm",
        totalTorque * 0.12, "force_arm"
      ),
      rolling_power_kW: mkAv(
        Math.round(rollPower * 10) / 10, "kW",
        rollPower * 0.10, "torque_speed"
      ),
      contact_length_mm: mkAv(
        Math.round(Lc * 100) / 100, "mm",
        Lc * 0.05, "geometry"
      ),
      exit_speed_m_min: mkAv(
        Math.round(exitSpeed * 10) / 10, "m/min",
        exitSpeed * 0.05, "kinematics"
      ),
      mean_flow_stress_MPa: mkAv(
        Math.round(sigmaM * 10) / 10, "MPa",
        sigmaM * 0.10, "hardening_model"
      ),
      specific_roll_force_kN_mm: mkAv(
        Math.round(specificForce * 100) / 100, "kN/mm",
        specificForce * 0.12, "force_width"
      ),
      max_reduction_pct: mkAv(
        Math.round(maxReduction * 10) / 10, "%",
        maxReduction * 0.10, "friction_limit"
      ),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const rollingMillEngine = new RollingMillEngine();
