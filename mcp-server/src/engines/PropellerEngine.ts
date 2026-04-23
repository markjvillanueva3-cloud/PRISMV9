/**
 * PropellerEngine — Propeller performance analysis
 *
 * Models: Blade element momentum theory (simplified),
 *         advance ratio, thrust/torque coefficients
 * References: McCormick propeller theory, NACA airfoil data
 */

export type PropellerType = "fixed_pitch" | "variable_pitch" | "folding" | "ducted";

export interface PropellerInput {
  diameter_mm: number;
  pitch_mm: number;
  num_blades?: number;                // default 3
  speed_rpm: number;
  advance_velocity_m_s?: number;      // default 0 (static)
  propeller_type?: PropellerType;
  fluid_density_kg_m3?: number;       // default 1.225 (air)
  blade_chord_mm?: number;            // default D/10
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface PropellerResult {
  thrust_N: AtomicValue;
  torque_Nm: AtomicValue;
  power_W: AtomicValue;
  advance_ratio: AtomicValue;
  thrust_coefficient: AtomicValue;
  efficiency_pct: AtomicValue;
  tip_speed_m_s: AtomicValue;
  disc_loading_N_m2: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class PropellerEngine {
  calculate(input: PropellerInput): PropellerResult {
    const {
      diameter_mm: D,
      pitch_mm: P,
      num_blades: B = 3,
      speed_rpm: n,
      advance_velocity_m_s: V = 0,
      propeller_type = "fixed_pitch",
      fluid_density_kg_m3: rho = 1.225,
    } = input;

    const recs: string[] = [];
    const Dm = D / 1000; // m
    const Pm = P / 1000;
    const nRps = n / 60;

    // Advance ratio
    const J = V > 0 ? V / (nRps * Dm) : 0;

    // Pitch ratio
    const pitchRatio = Pm / Dm;

    // Thrust coefficient (simplified model from blade element theory)
    // Ct decreases linearly with J, from Ct0 at static
    const Ct0 = 0.08 * pitchRatio * B / 3; // static thrust coefficient
    const Jmax = 0.85 * pitchRatio; // zero-thrust advance ratio
    const Ct = J < Jmax ? Ct0 * (1 - J / Jmax) : 0;

    // Torque coefficient
    const Cq0 = Ct0 / (2 * Math.PI * 0.7); // at 70% efficiency design point
    const Cq = J < Jmax ? Cq0 * (1 - 0.5 * J / Jmax) : Cq0 * 0.1;

    // Thrust and torque
    const thrust = Ct * rho * nRps * nRps * Math.pow(Dm, 4);
    const torque = Cq * rho * nRps * nRps * Math.pow(Dm, 5);
    const power = 2 * Math.PI * nRps * torque;

    // Efficiency
    const eta = J > 0.01 ? (Ct * J) / (Cq * 2 * Math.PI) : 0;

    // Tip speed
    const tipSpeed = Math.PI * Dm * nRps;

    // Disc loading
    const discArea = Math.PI / 4 * Dm * Dm;
    const discLoading = thrust / discArea;

    // Tip Mach number (at sea level)
    const tipMach = tipSpeed / 343;

    const isSafe = tipMach < 0.85 && thrust > 0;

    if (tipMach > 0.7) recs.push(`High tip Mach ${tipMach.toFixed(2)} — compressibility losses, reduce RPM or diameter`);
    if (J > Jmax * 0.9 && J > 0) recs.push(`Near zero-thrust J=${J.toFixed(2)} — prop windmilling`);
    if (pitchRatio > 1.5) recs.push(`High pitch ratio ${pitchRatio.toFixed(2)} — poor static thrust`);
    if (pitchRatio < 0.5) recs.push(`Low pitch ratio ${pitchRatio.toFixed(2)} — poor cruise efficiency`);
    if (B > 4) recs.push(`${B} blades — interference losses increase, verify noise benefit`);
    if (recs.length === 0) recs.push(`Propeller nominal — T=${thrust.toFixed(1)}N, η=${(eta * 100).toFixed(0)}%, J=${J.toFixed(2)}`);

    return {
      thrust_N: mkAv(Math.round(thrust * 10) / 10, "N", thrust * 0.10, "blade_element"),
      torque_Nm: mkAv(Math.round(torque * 100) / 100, "Nm", torque * 0.10, "blade_element"),
      power_W: mkAv(Math.round(power), "W", power * 0.10, "torque_speed"),
      advance_ratio: mkAv(Math.round(J * 1000) / 1000, "ratio", J * 0.05, "definition"),
      thrust_coefficient: mkAv(Math.round(Ct * 10000) / 10000, "ratio", Ct * 0.10, "model"),
      efficiency_pct: mkAv(Math.round(eta * 1000) / 10, "%", eta * 8, "J_Ct_Cq"),
      tip_speed_m_s: mkAv(Math.round(tipSpeed * 10) / 10, "m/s", tipSpeed * 0.02, "kinematics"),
      disc_loading_N_m2: mkAv(Math.round(discLoading * 10) / 10, "N/m²", discLoading * 0.10, "thrust_area"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const propellerEngine = new PropellerEngine();
