/**
 * HypoidGearEngine — Hypoid/bevel gear analysis
 *
 * Models: AGMA 2003 bending/contact stress, sliding velocity,
 *         offset efficiency, lubricant requirements
 * References: AGMA 2003-C10, Gleason Works
 */

export type HypoidType = "hypoid" | "spiral_bevel" | "straight_bevel" | "zerol";

export interface HypoidGearInput {
  gear_type?: HypoidType;
  pinion_teeth: number;
  gear_teeth: number;
  module_mm?: number;                 // default 4
  face_width_mm?: number;            // default 30
  pitch_cone_angle_deg?: number;     // default auto from ratio
  offset_mm?: number;                // hypoid offset, default 25
  speed_rpm: number;
  torque_Nm: number;
  hardness_HRC?: number;             // default 58
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface HypoidGearResult {
  ratio: AtomicValue;
  bending_stress_MPa: AtomicValue;
  contact_stress_MPa: AtomicValue;
  sliding_velocity_m_s: AtomicValue;
  efficiency_pct: AtomicValue;
  pitch_line_velocity_m_s: AtomicValue;
  axial_force_N: AtomicValue;
  required_oil_viscosity_cSt: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class HypoidGearEngine {
  calculate(input: HypoidGearInput): HypoidGearResult {
    const {
      gear_type = "hypoid",
      pinion_teeth: Zp,
      gear_teeth: Zg,
      module_mm: m = 4,
      face_width_mm: b = 30,
      offset_mm: E = 25,
      speed_rpm: N,
      torque_Nm: T,
      hardness_HRC: HRC = 58,
    } = input;

    const recs: string[] = [];
    const ratio = Zg / Zp;

    // Pitch cone angle
    const gamma_p = input.pitch_cone_angle_deg
      ? input.pitch_cone_angle_deg * Math.PI / 180
      : Math.atan(Zp / Zg);
    const gamma_g = Math.PI / 2 - gamma_p;

    // Pitch diameter
    const dp = Zp * m;
    const dg = Zg * m;

    // Pitch line velocity
    const Vt = Math.PI * dp / 1000 * N / 60;

    // Tangential force
    const Ft = T / (dp / 2000); // N

    // Bending stress (AGMA simplified)
    const Y = 0.30; // form factor approx
    const Kb = 1.0 + E / (dp + 1); // offset factor
    const sigmaBend = Ft * Kb / (b * m * Y);

    // Contact stress (Hertz simplified)
    const Zp_factor = 2.5; // zone factor
    const sigmaContact = Zp_factor * Math.sqrt(Ft * Kb / (b * dp / 1000));

    // Sliding velocity (hypoid has significant sliding)
    const spiralAngle = 35 * Math.PI / 180;
    const Vs = Vt * Math.tan(spiralAngle) + E / 1000 * 2 * Math.PI * N / 60;

    // Efficiency (hypoid lower than spiral bevel due to sliding)
    const frictionCoeff = gear_type === "hypoid" ? 0.08 : 0.04;
    const eta = (1 - frictionCoeff * Math.tan(spiralAngle)) * 100;

    // Axial force
    const Fa = Ft * Math.tan(20 * Math.PI / 180) * Math.sin(gamma_p);

    // Required oil viscosity (based on sliding velocity)
    const reqVisc = Vs > 5 ? 320 : Vs > 2 ? 220 : Vs > 1 ? 150 : 100;

    // Allowable stresses (carburized)
    const sigmaB_allow = HRC * 20; // rough MPa
    const sigmaC_allow = HRC * 30;
    const isSafe = sigmaBend < sigmaB_allow && sigmaContact < sigmaC_allow;

    if (sigmaBend > sigmaB_allow * 0.8) recs.push(`Bending stress ${sigmaBend.toFixed(0)}MPa near limit — increase module or face width`);
    if (sigmaContact > sigmaC_allow * 0.8) recs.push(`Contact stress ${sigmaContact.toFixed(0)}MPa near limit — harder material or larger gear`);
    if (Vs > 10) recs.push(`High sliding velocity ${Vs.toFixed(1)}m/s — use EP gear oil`);
    if (gear_type === "hypoid") recs.push(`Hypoid requires GL-5 hypoid gear oil`);
    if (recs.length === 0) recs.push(`Gear nominal — ratio=${ratio.toFixed(2)}, σ_b=${sigmaBend.toFixed(0)}MPa, η=${eta.toFixed(1)}%`);

    return {
      ratio: mkAv(Math.round(ratio * 100) / 100, "ratio", ratio * 0.01, "Zg_Zp"),
      bending_stress_MPa: mkAv(Math.round(sigmaBend), "MPa", sigmaBend * 0.15, "agma_2003"),
      contact_stress_MPa: mkAv(Math.round(sigmaContact), "MPa", sigmaContact * 0.15, "hertz"),
      sliding_velocity_m_s: mkAv(Math.round(Vs * 100) / 100, "m/s", Vs * 0.10, "spiral_offset"),
      efficiency_pct: mkAv(Math.round(eta * 10) / 10, "%", eta * 0.03, "friction"),
      pitch_line_velocity_m_s: mkAv(Math.round(Vt * 100) / 100, "m/s", Vt * 0.02, "piDN"),
      axial_force_N: mkAv(Math.round(Fa), "N", Fa * 0.10, "cone_angle"),
      required_oil_viscosity_cSt: mkAv(reqVisc, "cSt", reqVisc * 0.15, "sliding_speed"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const hypoidGearEngine = new HypoidGearEngine();
