/**
 * SoftJawProfileEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Designs soft jaw profiles for vise and chuck workholding.
 * Calculates jaw geometry (step, vee, contoured), grip depth,
 * clamping force distribution, and material removal for jaw boring.
 *
 * Critical for round/irregular parts — wrong jaw profile causes
 * part slip, marring, or distortion.
 *
 * Actions: soft_jaw_design, soft_jaw_force, soft_jaw_gcode
 */

// ============================================================================
// TYPES
// ============================================================================

export type JawProfile = "flat" | "step" | "vee_90" | "vee_120" | "contour" | "dovetail";
export type JawMaterial = "6061_aluminum" | "1018_steel" | "brass" | "nylon" | "delrin";

export interface SoftJawInput {
  workpiece_shape: "round" | "hex" | "square" | "rectangular" | "irregular";
  workpiece_dimension_mm: number;      // OD for round, across-flats for hex, width for rect
  workpiece_height_mm: number;
  workpiece_material: string;
  jaw_material: JawMaterial;
  num_jaws: 2 | 3 | 4 | 6;
  chuck_or_vise: "chuck" | "vise";
  clamping_force_N: number;
  grip_depth_mm: number;
  surface_finish_critical: boolean;
}

export interface SoftJawResult {
  profile: JawProfile;
  bore_diameter_mm: number;
  bore_depth_mm: number;
  step_height_mm: number;
  contact_area_mm2: number;
  contact_pressure_MPa: number;
  max_holding_force_N: number;
  deformation_um: number;            // jaw deformation under load
  marring_risk: "none" | "low" | "medium" | "high";
  jaw_blank_size: { length_mm: number; width_mm: number; height_mm: number };
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const JAW_MODULUS: Record<JawMaterial, number> = {
  "6061_aluminum": 69000,   // MPa
  "1018_steel": 200000,
  "brass": 100000,
  "nylon": 3000,
  "delrin": 3500,
};

const FRICTION_COEFF: Record<JawMaterial, number> = {
  "6061_aluminum": 0.35,
  "1018_steel": 0.25,
  "brass": 0.30,
  "nylon": 0.40,
  "delrin": 0.35,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class SoftJawProfileEngine {
  design(input: SoftJawInput): SoftJawResult {
    // Select profile based on workpiece shape
    let profile: JawProfile;
    if (input.workpiece_shape === "round") {
      profile = input.surface_finish_critical ? "contour" : "vee_90";
    } else if (input.workpiece_shape === "hex") {
      profile = "vee_120";
    } else if (input.workpiece_shape === "irregular") {
      profile = "contour";
    } else {
      profile = input.chuck_or_vise === "vise" ? "step" : "flat";
    }

    // Bore diameter (for chuck jaws — bore to workpiece OD minus interference)
    const interference = input.chuck_or_vise === "chuck" ? 0.05 : 0;
    const boreDia = input.workpiece_shape === "round"
      ? input.workpiece_dimension_mm - interference
      : input.workpiece_dimension_mm;

    const boreDepth = input.grip_depth_mm;
    const stepHeight = Math.max(2, input.grip_depth_mm * 0.3);

    // Contact area
    let contactArea: number;
    if (profile === "contour" && input.workpiece_shape === "round") {
      // Wrap angle per jaw
      const wrapAngle = (2 * Math.PI) / input.num_jaws * 0.7; // ~70% wrap
      contactArea = (input.workpiece_dimension_mm / 2) * wrapAngle * boreDepth;
    } else if (profile === "vee_90" || profile === "vee_120") {
      contactArea = boreDepth * input.workpiece_dimension_mm * 0.5 * 2; // two faces of vee
    } else {
      contactArea = boreDepth * input.workpiece_dimension_mm * 0.8;
    }

    contactArea = Math.max(contactArea, 1);
    const perJawForce = input.clamping_force_N / input.num_jaws;
    const contactPressure = perJawForce / contactArea;

    // Friction-based holding force
    const mu = FRICTION_COEFF[input.jaw_material];
    const maxHoldForce = input.clamping_force_N * mu;

    // Jaw deformation
    const E = JAW_MODULUS[input.jaw_material];
    const jawThickness = 10; // mm nominal
    const deformation = (perJawForce * jawThickness) / (E * contactArea) * 1000; // µm

    // Marring risk
    const marringRisk: SoftJawResult["marring_risk"] =
      contactPressure > 50 ? "high"
      : contactPressure > 20 ? "medium"
      : contactPressure > 10 ? "low"
      : "none";

    // Jaw blank sizing
    const blankLength = input.workpiece_dimension_mm + 20;
    const blankWidth = Math.max(40, input.workpiece_dimension_mm * 0.5);
    const blankHeight = input.grip_depth_mm + stepHeight + 15;

    const recs: string[] = [];
    if (marringRisk === "high") recs.push("High contact pressure — use softer jaw material (nylon/delrin) or increase contact area");
    if (deformation > 50) recs.push(`Jaw deformation ${deformation.toFixed(0)}µm — may affect part accuracy, use stiffer jaw material`);
    if (input.surface_finish_critical && input.jaw_material === "1018_steel") {
      recs.push("Steel jaws on finish-critical part — consider aluminum or nylon jaws to prevent marring");
    }
    if (input.workpiece_shape === "round" && profile !== "contour" && input.surface_finish_critical) {
      recs.push("Round part with finish requirement — contour-bored jaws recommended for maximum contact");
    }
    if (recs.length === 0) recs.push("Soft jaw profile validated — proceed with jaw boring");

    return {
      profile,
      bore_diameter_mm: Math.round(boreDia * 100) / 100,
      bore_depth_mm: boreDepth,
      step_height_mm: Math.round(stepHeight * 10) / 10,
      contact_area_mm2: Math.round(contactArea),
      contact_pressure_MPa: Math.round(contactPressure * 10) / 10,
      max_holding_force_N: Math.round(maxHoldForce),
      deformation_um: Math.round(deformation * 10) / 10,
      marring_risk: marringRisk,
      jaw_blank_size: {
        length_mm: Math.ceil(blankLength),
        width_mm: Math.ceil(blankWidth),
        height_mm: Math.ceil(blankHeight),
      },
      recommendations: recs,
    };
  }
}

export const softJawProfileEngine = new SoftJawProfileEngine();
