/**
 * RackPinionEngine — Rack and pinion linear drive design
 *
 * Models: Gear geometry, tangential force, bending stress,
 *         backlash, linear speed from rotary input
 * References: AGMA 2001, DIN 3990
 */

export type RackQuality = "Q5" | "Q6" | "Q7" | "Q8" | "Q10";

export interface RackPinionInput {
  module_mm: number;
  pinion_teeth: number;
  face_width_mm?: number;             // default 10×module
  transmitted_force_N: number;
  pinion_speed_rpm?: number;          // default 500
  pressure_angle_deg?: number;        // default 20
  quality?: RackQuality;
  helix_angle_deg?: number;           // default 0 (spur)
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface RackPinionResult {
  pitch_diameter_mm: AtomicValue;
  linear_speed_m_min: AtomicValue;
  tangential_force_N: AtomicValue;
  bending_stress_MPa: AtomicValue;
  contact_stress_MPa: AtomicValue;
  required_torque_Nm: AtomicValue;
  backlash_mm: AtomicValue;
  efficiency_pct: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

const BACKLASH: Record<RackQuality, number> = {
  Q5: 0.01, Q6: 0.02, Q7: 0.04, Q8: 0.08, Q10: 0.15,
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class RackPinionEngine {
  calculate(input: RackPinionInput): RackPinionResult {
    const {
      module_mm: m,
      pinion_teeth: z,
      transmitted_force_N: F,
      pinion_speed_rpm: n = 500,
      pressure_angle_deg: alpha = 20,
      quality = "Q7",
      helix_angle_deg: beta = 0,
    } = input;

    const recs: string[] = [];
    const b = input.face_width_mm ?? 10 * m;
    const alphaRad = alpha * Math.PI / 180;
    const betaRad = beta * Math.PI / 180;

    // Pitch diameter
    const mn = m; // normal module
    const mt = mn / Math.cos(betaRad); // transverse module
    const dp = mt * z; // mm

    // Linear speed
    const linearSpeed = Math.PI * dp / 1000 * n; // m/min

    // Required torque
    const torque = F * dp / 2000; // Nm

    // Lewis bending stress (simplified)
    const Y = 0.154 - 0.912 / z; // Lewis form factor
    const sigmaBend = F / (b * m * Math.max(Y, 0.05)); // MPa

    // Hertz contact stress (simplified)
    const E = 206000; // MPa (steel)
    const sigmaContact = Math.sqrt(F * E / (b * dp * Math.sin(alphaRad) * Math.PI));

    // Backlash
    const backlash = BACKLASH[quality] * m;

    // Efficiency
    const eta = beta > 0
      ? Math.cos(alphaRad) / Math.cos(alphaRad + Math.atan(0.05))  // helical
      : 0.96; // spur

    const allowBend = 250; // MPa typical case-hardened
    const allowContact = 1200; // MPa
    const isSafe = sigmaBend < allowBend && sigmaContact < allowContact;

    if (sigmaBend > allowBend * 0.8) recs.push(`High bending stress ${sigmaBend.toFixed(0)}MPa — increase module or width`);
    if (sigmaContact > allowContact * 0.8) recs.push(`High contact stress ${sigmaContact.toFixed(0)}MPa — harden or widen`);
    if (z < 14) recs.push(`Low tooth count ${z} — undercut risk, use profile shift`);
    if (linearSpeed > 100) recs.push(`High linear speed ${linearSpeed.toFixed(0)}m/min — verify lubrication`);
    if (recs.length === 0) recs.push(`Rack-pinion nominal — dp=${dp.toFixed(1)}mm, v=${linearSpeed.toFixed(1)}m/min, T=${torque.toFixed(1)}Nm`);

    return {
      pitch_diameter_mm: mkAv(Math.round(dp * 10) / 10, "mm", dp * 0.001, "geometry"),
      linear_speed_m_min: mkAv(Math.round(linearSpeed * 10) / 10, "m/min", linearSpeed * 0.02, "kinematics"),
      tangential_force_N: mkAv(Math.round(F), "N", F * 0.05, "input"),
      bending_stress_MPa: mkAv(Math.round(sigmaBend), "MPa", sigmaBend * 0.10, "lewis"),
      contact_stress_MPa: mkAv(Math.round(sigmaContact), "MPa", sigmaContact * 0.10, "hertz"),
      required_torque_Nm: mkAv(Math.round(torque * 10) / 10, "Nm", torque * 0.05, "force_radius"),
      backlash_mm: mkAv(Math.round(backlash * 1000) / 1000, "mm", backlash * 0.20, "quality_grade"),
      efficiency_pct: mkAv(Math.round(eta * 1000) / 10, "%", eta * 2, "friction"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const rackPinionEngine = new RackPinionEngine();
