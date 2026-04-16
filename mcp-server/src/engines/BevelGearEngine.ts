/**
 * BevelGearEngine — Bevel gear set design
 *
 * Models: Pitch cone angle, AGMA bending/pitting stress,
 *         face width, dynamic factor, virtual teeth
 * References: AGMA 2003, Gleason
 */

export type BevelType = "straight" | "spiral" | "zerol" | "hypoid";

export interface BevelGearInput {
  pinion_teeth: number;
  gear_teeth: number;
  module_mm?: number;                   // default auto-sized
  transmitted_power_kW: number;
  pinion_speed_rpm: number;
  bevel_type?: BevelType;
  shaft_angle_deg?: number;             // default 90
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface BevelGearResult {
  gear_ratio: AtomicValue;
  pitch_cone_angle_pinion_deg: AtomicValue;
  pitch_cone_angle_gear_deg: AtomicValue;
  face_width_mm: AtomicValue;
  pinion_pitch_dia_mm: AtomicValue;
  bending_stress_MPa: AtomicValue;
  contact_stress_MPa: AtomicValue;
  tangential_force_N: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class BevelGearEngine {
  calculate(input: BevelGearInput): BevelGearResult {
    const {
      pinion_teeth: Zp,
      gear_teeth: Zg,
      transmitted_power_kW: P,
      pinion_speed_rpm: Np,
      bevel_type = "straight",
      shaft_angle_deg = 90,
    } = input;

    const recs: string[] = [];
    const ratio = Zg / Zp;

    // Pitch cone angles
    const shaftRad = shaft_angle_deg * Math.PI / 180;
    const gammaPinion = Math.atan(Math.sin(shaftRad) / (ratio + Math.cos(shaftRad))) * 180 / Math.PI;
    const gammaGear = shaft_angle_deg - gammaPinion;

    // Module selection
    let m = input.module_mm;
    if (!m) {
      const torque = P * 1000 / (2 * Math.PI * Np / 60);
      m = Math.pow(torque / (Zp * 100), 1 / 3);
      const stdModules = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
      m = stdModules.find(v => v >= m!) ?? m;
    }

    // Pitch diameters
    const dpPinion = m * Zp;
    const dpGear = m * Zg;

    // Cone distance
    const R = dpPinion / (2 * Math.sin(gammaPinion * Math.PI / 180));

    // Face width (rule: F ≤ R/3 or 10×m)
    const F = Math.min(R / 3, 10 * m);

    // Tangential force
    const torquePinion = P * 1000 / (2 * Math.PI * Np / 60);
    const Wt = torquePinion / (dpPinion / 2000); // N

    // AGMA bending stress (simplified)
    const Kv = 1 + Math.sqrt(dpPinion * Np / 60000); // dynamic factor
    const Y = 0.32 + Zp * 0.004; // Lewis form factor approximation
    const sigmaBend = Wt * Kv / (F * m * Y);

    // Contact stress (simplified Hertz)
    const sigmaContact = 2.8 * Math.sqrt(Wt * Kv / (F * dpPinion / 1000));

    const bendAllow = 250; // MPa (case-hardened steel)
    const contactAllow = 1400; // MPa
    const isSafe = sigmaBend < bendAllow && sigmaContact < contactAllow;

    if (sigmaBend > bendAllow * 0.8) recs.push(`High bending stress ${sigmaBend.toFixed(0)}MPa — increase module`);
    if (sigmaContact > contactAllow * 0.8) recs.push(`High contact stress ${sigmaContact.toFixed(0)}MPa — verify surface hardness`);
    if (Zp < 16) recs.push(`Few pinion teeth ${Zp} — undercut risk, consider profile shift`);
    if (bevel_type === "spiral") recs.push(`Spiral bevel — smoother, but generates axial thrust`);
    if (recs.length === 0) recs.push(`Bevel gear nominal — m=${m}mm, D_p=${dpPinion.toFixed(0)}mm, σ_b=${sigmaBend.toFixed(0)}MPa`);

    return {
      gear_ratio: mkAv(Math.round(ratio * 100) / 100, "ratio", 0, "tooth_count"),
      pitch_cone_angle_pinion_deg: mkAv(Math.round(gammaPinion * 10) / 10, "deg", gammaPinion * 0.02, "geometry"),
      pitch_cone_angle_gear_deg: mkAv(Math.round(gammaGear * 10) / 10, "deg", gammaGear * 0.02, "geometry"),
      face_width_mm: mkAv(Math.round(F * 10) / 10, "mm", F * 0.05, "agma_rule"),
      pinion_pitch_dia_mm: mkAv(Math.round(dpPinion * 10) / 10, "mm", 0, "module_teeth"),
      bending_stress_MPa: mkAv(Math.round(sigmaBend), "MPa", sigmaBend * 0.12, "agma_lewis"),
      contact_stress_MPa: mkAv(Math.round(sigmaContact), "MPa", sigmaContact * 0.12, "hertz"),
      tangential_force_N: mkAv(Math.round(Wt), "N", Wt * 0.05, "torque_radius"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const bevelGearEngine = new BevelGearEngine();
