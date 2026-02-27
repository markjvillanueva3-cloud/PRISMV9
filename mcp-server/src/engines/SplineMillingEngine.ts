/**
 * SplineMillingEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Calculates parameters for milling involute splines and serrations.
 * Supports: internal/external splines, straight-sided and involute,
 * multiple indexing methods (rotary table, C-axis).
 *
 * Models: indexing accuracy, form error, cycle time optimization,
 * and tooth-by-tooth cutting strategy.
 *
 * Actions: spline_calc, spline_validate, spline_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type SplineType = "involute" | "straight_sided" | "serration";
export type IndexMethod = "rotary_table" | "c_axis" | "dividing_head" | "gear_shaper";

export interface SplineMillingInput {
  spline_type: SplineType;
  num_teeth: number;
  module_mm?: number;                 // for involute splines
  pressure_angle_deg: number;         // typically 30° or 37.5° for splines
  major_diameter_mm: number;
  minor_diameter_mm: number;
  face_width_mm: number;
  internal: boolean;
  index_method: IndexMethod;
  tool_diameter_mm: number;
  tool_num_flutes: number;
  spindle_rpm: number;
  feed_per_tooth_mm: number;
  num_depth_passes: number;
}

export interface SplineMillingResult {
  index_angle_deg: number;
  tooth_space_width_mm: number;
  tooth_depth_mm: number;
  depth_per_pass_mm: number;
  feed_rate_mm_per_min: number;
  cutting_time_per_tooth_sec: number;
  total_cycle_time_sec: number;
  index_positions: number;
  form_error_estimate_um: number;     // estimated profile error
  recommendations: string[];
}

export interface SplineValidation {
  fit_class: string;
  backlash_mm: number;
  contact_ratio: number;
  is_valid: boolean;
  issues: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class SplineMillingEngine {
  calculate(input: SplineMillingInput): SplineMillingResult {
    const Z = input.num_teeth;
    const indexAngle = 360 / Z;

    // Tooth geometry
    const toothDepth = (input.major_diameter_mm - input.minor_diameter_mm) / 2;
    const depthPerPass = toothDepth / input.num_depth_passes;

    // Tooth space width at pitch diameter
    const pitchDia = (input.major_diameter_mm + input.minor_diameter_mm) / 2;
    const circularPitch = Math.PI * pitchDia / Z;
    const toothSpaceWidth = circularPitch / 2; // approximate 50% space

    // Feed rate
    const feedRate = input.feed_per_tooth_mm * input.tool_num_flutes * input.spindle_rpm;

    // Cutting time per tooth space
    // Path = face_width for each depth pass, plus approach/retract
    const approach = input.tool_diameter_mm / 2;
    const pathPerPass = input.face_width_mm + 2 * approach;
    const timePerPass = pathPerPass / feedRate * 60; // seconds
    const timePerTooth = timePerPass * input.num_depth_passes;

    // Total cycle time: all teeth + indexing
    const indexTime = input.index_method === "c_axis" ? 1.0
      : input.index_method === "rotary_table" ? 2.0
      : 3.0; // seconds per index
    const totalTime = Z * (timePerTooth + indexTime);

    // Form error estimate based on index method
    const formError = input.index_method === "c_axis" ? 5
      : input.index_method === "rotary_table" ? 8
      : input.index_method === "dividing_head" ? 12
      : 3; // gear shaper — best form

    // Index positions (some methods may need multiple passes per tooth)
    const indexPositions = Z;

    // Recommendations
    const recs: string[] = [];
    if (input.tool_diameter_mm > toothSpaceWidth * 0.9) {
      recs.push("Tool diameter too large for tooth space — use smaller cutter or shaped form tool");
    }
    if (input.internal && input.index_method !== "c_axis" && input.index_method !== "gear_shaper") {
      recs.push("Internal splines best cut with C-axis or gear shaper — rotary table access limited");
    }
    if (Z > 40 && input.index_method === "dividing_head") {
      recs.push("Many teeth with dividing head — cycle time excessive, consider C-axis or hobbing");
    }
    if (formError > 10) {
      recs.push("Expected form error >10µm — may not meet class B fit tolerance");
    }
    if (depthPerPass > 1.0) {
      recs.push("Depth per pass >1mm — add more passes to reduce cutting force on thin tool");
    }
    if (recs.length === 0) {
      recs.push("Spline milling parameters acceptable — proceed with first article inspection");
    }

    return {
      index_angle_deg: Math.round(indexAngle * 10000) / 10000,
      tooth_space_width_mm: Math.round(toothSpaceWidth * 1000) / 1000,
      tooth_depth_mm: Math.round(toothDepth * 1000) / 1000,
      depth_per_pass_mm: Math.round(depthPerPass * 1000) / 1000,
      feed_rate_mm_per_min: Math.round(feedRate * 10) / 10,
      cutting_time_per_tooth_sec: Math.round(timePerTooth * 10) / 10,
      total_cycle_time_sec: Math.round(totalTime * 10) / 10,
      index_positions: indexPositions,
      form_error_estimate_um: formError,
      recommendations: recs,
    };
  }

  validate(input: SplineMillingInput, fit_class: "A" | "B" | "C"): SplineValidation {
    const issues: string[] = [];

    // Check geometry consistency
    if (input.major_diameter_mm <= input.minor_diameter_mm) {
      issues.push("Major diameter must be greater than minor diameter");
    }

    // Tooth depth check
    const toothDepth = (input.major_diameter_mm - input.minor_diameter_mm) / 2;
    const expectedDepth = input.module_mm ? input.module_mm * 1.25 : toothDepth;
    if (input.module_mm && Math.abs(toothDepth - expectedDepth) / expectedDepth > 0.1) {
      issues.push(`Tooth depth ${toothDepth.toFixed(3)}mm inconsistent with module ${input.module_mm}mm (expected ${expectedDepth.toFixed(3)}mm)`);
    }

    // Backlash estimate based on fit class
    const pitchDia = (input.major_diameter_mm + input.minor_diameter_mm) / 2;
    const backlash = fit_class === "A" ? 0.015 : fit_class === "B" ? 0.040 : 0.080;

    // Contact ratio (simplified)
    const contactRatio = input.num_teeth > 6 ? 1.4 : 1.1;

    return {
      fit_class: `Class ${fit_class} (ANSI B92.1)`,
      backlash_mm: backlash,
      contact_ratio: contactRatio,
      is_valid: issues.length === 0,
      issues: issues.length > 0 ? issues : ["Spline geometry valid"],
    };
  }
}

export const splineMillingEngine = new SplineMillingEngine();
