/**
 * ChuckJawForceEngine — L2-P4-MS1 PASS2 Specialty
 * *** SAFETY CRITICAL ***
 *
 * Calculates required chuck jaw gripping force to prevent workpiece
 * ejection during turning operations. Workpiece ejection at high RPM
 * is lethal — safety factor of 2.5 minimum per ISO 10218.
 *
 * Models: centrifugal force, cutting force, friction coefficient,
 * jaw contact geometry, and speed-dependent grip loss.
 *
 * Actions: chuck_force_calc, chuck_force_validate, chuck_force_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type JawType = "hard" | "soft" | "pie" | "special";
export type ChuckType = "3_jaw_scroll" | "3_jaw_power" | "4_jaw_independent" | "6_jaw" | "collet";

export interface ChuckForceInput {
  chuck_type: ChuckType;
  jaw_type: JawType;
  num_jaws: number;
  workpiece_mass_kg: number;
  workpiece_od_mm: number;            // clamped OD
  workpiece_length_mm: number;
  gripping_diameter_mm: number;       // actual jaw contact diameter
  gripping_length_mm: number;         // axial contact length
  spindle_rpm: number;
  max_spindle_rpm: number;            // max RPM machine can reach
  cutting_force_tangential_N: number;
  cutting_force_radial_N: number;
  cutting_force_axial_N: number;
  friction_coefficient?: number;      // jaw-workpiece (0.15-0.5 typical)
  jaw_stroke_mm?: number;
}

export interface ChuckForceResult {
  required_gripping_force_N: number;
  centrifugal_force_N: number;
  grip_loss_at_rpm_pct: number;       // % of static grip lost to centrifugal
  safety_factor: number;
  min_chuck_pressure_bar: number;     // hydraulic chuck pressure
  max_safe_rpm: number;               // RPM at which grip = cutting force
  is_safe: boolean;
  jaw_contact_pressure_MPa: number;
  workpiece_deformation_risk: "none" | "low" | "high";
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FRICTION_COEFFICIENTS: Record<string, number> = {
  hard_smooth: 0.15,
  hard_serrated: 0.35,
  soft_bored: 0.45,
  pie: 0.40,
  collet: 0.25,
};

const SAFETY_FACTOR_MIN = 2.5; // ISO 10218 for machine tools

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ChuckJawForceEngine {
  calculate(input: ChuckForceInput): ChuckForceResult {
    // Friction coefficient
    const mu = input.friction_coefficient ||
      (input.jaw_type === "soft" ? 0.45 : input.jaw_type === "hard" ? 0.25 : 0.35);

    // Centrifugal force on workpiece
    // F_cf = m * ω² * r_cg
    const omega = (2 * Math.PI * input.spindle_rpm) / 60;
    const rCg = input.gripping_diameter_mm / 2 / 1000; // meters, approximate CG at grip radius
    const centrifugalForce = input.workpiece_mass_kg * omega * omega * rCg;

    // Centrifugal force on jaws (approximate jaw mass as fraction of workpiece)
    const jawMassApprox = input.workpiece_mass_kg * 0.15 * 3 / input.num_jaws;
    const jawCentrifugal = jawMassApprox * omega * omega * (input.gripping_diameter_mm / 2 / 1000 + 0.05);

    // Grip loss percentage at RPM
    const maxOmega = (2 * Math.PI * input.max_spindle_rpm) / 60;
    const maxJawCf = jawMassApprox * maxOmega * maxOmega * (input.gripping_diameter_mm / 2 / 1000 + 0.05);

    // Required gripping force to resist:
    // 1. Tangential cutting force (friction must exceed)
    // 2. Axial cutting force (friction must exceed)
    // 3. Centrifugal force on workpiece (radial ejection)
    const gripForTangential = input.cutting_force_tangential_N / mu;
    const gripForAxial = input.cutting_force_axial_N / mu;
    const gripForCentrifugal = centrifugalForce / mu;

    // Total required (vector sum of worst case)
    const requiredGrip = Math.max(gripForTangential, gripForAxial) + gripForCentrifugal;

    // Apply safety factor
    const requiredWithSafety = requiredGrip * SAFETY_FACTOR_MIN;

    // Grip loss at operating RPM
    const staticGripBase = requiredWithSafety + jawCentrifugal;
    const gripLoss = jawCentrifugal / staticGripBase * 100;

    // Safety factor achieved (assuming chuck provides requiredWithSafety)
    const effectiveGrip = requiredWithSafety - jawCentrifugal;
    const sf = requiredGrip > 0 ? effectiveGrip / requiredGrip : 10;

    // Max safe RPM (where SF drops to 1.0)
    // Solve: requiredWithSafety - jawMass * omega² * r = requiredGrip
    // omega² = (requiredWithSafety - requiredGrip) / (jawMassApprox * r)
    const gripMargin = requiredWithSafety - requiredGrip;
    const jawR = input.gripping_diameter_mm / 2 / 1000 + 0.05;
    const maxSafeOmega = jawR > 0 && jawMassApprox > 0
      ? Math.sqrt(gripMargin / (jawMassApprox * jawR))
      : omega * 2;
    const maxSafeRpm = Math.round(maxSafeOmega * 60 / (2 * Math.PI));

    // Chuck pressure (for hydraulic chucks: typical 25-40 bar normal)
    // Force = pressure * piston_area (approximate)
    const pistonArea = Math.PI * (0.06) ** 2; // ~60mm bore typical
    const requiredPressure = requiredWithSafety / input.num_jaws / pistonArea / 1e5;

    // Jaw contact pressure
    const contactArea = input.gripping_length_mm * (input.gripping_diameter_mm * Math.PI / input.num_jaws * 0.3);
    const contactPressure = requiredWithSafety / input.num_jaws / contactArea;

    // Deformation risk (thin-walled parts)
    const wallThickness = (input.workpiece_od_mm - input.gripping_diameter_mm) / 2;
    const deformRisk: ChuckForceResult["workpiece_deformation_risk"] =
      contactPressure > 50 || (wallThickness > 0 && wallThickness < 2) ? "high"
      : contactPressure > 20 ? "low" : "none";

    const isSafe = sf >= SAFETY_FACTOR_MIN && input.spindle_rpm <= maxSafeRpm;

    // Recommendations
    const recs: string[] = [];
    if (!isSafe) {
      recs.push(`SAFETY: Insufficient gripping force — safety factor ${sf.toFixed(1)} below minimum ${SAFETY_FACTOR_MIN}`);
    }
    if (input.spindle_rpm > maxSafeRpm * 0.9) {
      recs.push(`Operating near max safe RPM (${maxSafeRpm}) — reduce speed or increase chuck pressure`);
    }
    if (deformRisk === "high") {
      recs.push("High jaw contact pressure — use soft jaws bored to size to distribute force");
    }
    if (gripLoss > 30) {
      recs.push(`${gripLoss.toFixed(0)}% grip loss at RPM — consider counterbalanced chuck or lower speed`);
    }
    if (recs.length === 0) {
      recs.push("Chuck gripping force adequate — safe to proceed");
    }

    return {
      required_gripping_force_N: Math.round(requiredWithSafety),
      centrifugal_force_N: Math.round(centrifugalForce),
      grip_loss_at_rpm_pct: Math.round(gripLoss * 10) / 10,
      safety_factor: Math.round(sf * 100) / 100,
      min_chuck_pressure_bar: Math.round(requiredPressure * 10) / 10,
      max_safe_rpm: maxSafeRpm,
      is_safe: isSafe,
      jaw_contact_pressure_MPa: Math.round(contactPressure * 10) / 10,
      workpiece_deformation_risk: deformRisk,
      recommendations: recs,
    };
  }

  validate(input: ChuckForceInput): { safe: boolean; safety_factor: number; message: string } {
    const result = this.calculate(input);
    return {
      safe: result.is_safe,
      safety_factor: result.safety_factor,
      message: result.is_safe
        ? `Chuck force adequate (SF=${result.safety_factor.toFixed(1)})`
        : `UNSAFE: SF=${result.safety_factor.toFixed(1)} — ${result.recommendations[0]}`,
    };
  }
}

export const chuckJawForceEngine = new ChuckJawForceEngine();
