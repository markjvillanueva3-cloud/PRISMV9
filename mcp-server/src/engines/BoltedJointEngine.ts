/**
 * BoltedJointEngine — Bolted joint analysis per VDI 2230
 *
 * Models: Preload (Fi=0.9×Sp×At), joint stiffness diagram,
 *         load introduction factor, fatigue, clamp length
 * References: VDI 2230, Shigley Ch.8
 */

export type BoltGrade = "4.8" | "8.8" | "10.9" | "12.9" | "A2-70" | "A4-80";

export interface BoltedJointInput {
  bolt_diameter_mm: number;
  bolt_grade?: BoltGrade;
  clamp_length_mm: number;
  external_load_N: number;
  num_bolts?: number;              // default 1
  joint_material?: string;         // default "steel"
  friction_coefficient?: number;   // default 0.12
  load_introduction_factor?: number; // n, default 0.5
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface BoltedJointResult {
  preload_N: AtomicValue;
  bolt_stiffness_N_mm: AtomicValue;
  joint_stiffness_N_mm: AtomicValue;
  load_factor: AtomicValue;
  bolt_load_N: AtomicValue;
  clamp_force_remaining_N: AtomicValue;
  tightening_torque_Nm: AtomicValue;
  safety_factor_yield: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Bolt data: [proof_strength_MPa, yield_MPa, tensile_MPa]
const BOLT_GRADES: Record<BoltGrade, [number, number, number]> = {
  "4.8":  [310, 340, 420],
  "8.8":  [600, 640, 830],
  "10.9": [830, 940, 1040],
  "12.9": [970, 1100, 1220],
  "A2-70":[450, 450, 700],
  "A4-80":[600, 600, 800],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class BoltedJointEngine {
  calculate(input: BoltedJointInput): BoltedJointResult {
    const {
      bolt_diameter_mm: d,
      bolt_grade = "8.8",
      clamp_length_mm: Lc,
      external_load_N: Fe,
      num_bolts: nB = 1,
      friction_coefficient: mu = 0.12,
      load_introduction_factor: n = 0.5,
    } = input;

    const recs: string[] = [];
    const [Sp, Sy] = BOLT_GRADES[bolt_grade];

    // Tensile stress area (ISO 898)
    const p = d <= 10 ? 1.25 : d <= 16 ? 1.75 : d <= 24 ? 2.5 : 3.0; // pitch
    const d2 = d - 0.6495 * p;
    const d3 = d - 1.2269 * p;
    const At = Math.PI / 4 * Math.pow((d2 + d3) / 2, 2); // mm²

    // Preload (90% of proof load)
    const Fi = 0.9 * Sp * At; // N

    // Bolt stiffness
    const Eb = 205000; // MPa (steel)
    const Lb = Lc + 0.4 * d; // effective bolt length
    const kb = Eb * At / Lb; // N/mm

    // Joint stiffness (frustum cone, VDI 2230 simplified)
    const Dw = 1.5 * d; // washer bearing diameter
    const Ej = 205000; // steel joint
    const kj = 0.5 * Math.PI * Ej * d * Math.tan(30 * Math.PI / 180) /
      Math.log(Math.pow((Dw + Lc * Math.tan(30 * Math.PI / 180)) * d / (Dw * (d + Lc * Math.tan(30 * Math.PI / 180))), 2));

    // Load factor
    const phi = kb / (kb + kj);
    const phiN = n * phi; // with load introduction

    // Per-bolt external load
    const FeBolt = Fe / nB;

    // Bolt load under external force
    const Fb = Fi + phiN * FeBolt;

    // Remaining clamp force
    const Fc = Fi - (1 - phiN) * FeBolt;

    // Tightening torque
    const T = Fi * d / 1000 * (0.16 * p / d + 0.58 * mu * d2 / d + 0.5 * mu * Dw / d);

    // Safety factor against yield
    const sigmaB = Fb / At;
    const SF = Sy / sigmaB;

    const isSafe = Fc > 0 && SF > 1.2;

    if (Fc <= 0) recs.push(`Joint separation — clamp force lost at ${Fe}N external load`);
    if (SF < 1.5) recs.push(`Low yield safety factor ${SF.toFixed(2)} — consider higher grade or larger bolt`);
    if (Lc / d < 1) recs.push(`Short clamp length ratio ${(Lc / d).toFixed(1)} — minimum 1×d recommended`);
    if (Lc / d > 10) recs.push(`Long clamp length ratio ${(Lc / d).toFixed(1)} — check thermal expansion effects`);
    if (recs.length === 0) recs.push(`Joint nominal — Fi=${(Fi / 1000).toFixed(1)}kN, φ=${phi.toFixed(3)}, SF=${SF.toFixed(2)}`);

    return {
      preload_N: mkAv(Math.round(Fi), "N", Fi * 0.10, "vdi_2230"),
      bolt_stiffness_N_mm: mkAv(Math.round(kb), "N/mm", kb * 0.05, "elastic"),
      joint_stiffness_N_mm: mkAv(Math.round(kj), "N/mm", kj * 0.15, "frustum_cone"),
      load_factor: mkAv(Math.round(phiN * 1000) / 1000, "ratio", phiN * 0.10, "stiffness_ratio"),
      bolt_load_N: mkAv(Math.round(Fb), "N", Fb * 0.08, "superposition"),
      clamp_force_remaining_N: mkAv(Math.round(Fc), "N", Fc * 0.10, "vdi_2230"),
      tightening_torque_Nm: mkAv(Math.round(T * 10) / 10, "Nm", T * 0.15, "friction"),
      safety_factor_yield: mkAv(Math.round(SF * 100) / 100, "ratio", SF * 0.10, "yield_stress"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const boltedJointEngine = new BoltedJointEngine();
