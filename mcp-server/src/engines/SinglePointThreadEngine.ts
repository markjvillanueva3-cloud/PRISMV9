/**
 * SinglePointThreadEngine — L2-P4-MS1 PASS2 Specialty
 * *** SAFETY CRITICAL ***
 *
 * Calculates single-point threading on CNC lathes. Safety-critical because:
 * - Synchronization failure (spindle encoder) → crashed tool
 * - Wrong infeed angle → poor thread form, part scrap
 * - Insufficient clearance → collision at thread end
 *
 * Implements: modified flank infeed, compound infeed, radial infeed,
 * and constant-area infeed strategies with pass planning.
 *
 * Actions: spt_calculate, spt_pass_plan, spt_validate
 */

// ============================================================================
// TYPES
// ============================================================================

export type InfeedMethod = "radial" | "flank" | "modified_flank" | "alternating_flank" | "constant_area";

export interface SPTInput {
  thread_form: "UN" | "metric" | "ACME" | "trapezoidal" | "buttress";
  pitch_mm: number;
  major_diameter_mm: number;
  internal: boolean;
  infeed_method: InfeedMethod;
  total_depth_mm: number;            // full thread depth
  spindle_rpm: number;
  num_passes: number;
  spring_passes: number;             // 1-3 typical, no infeed
  lead_in_mm: number;                // distance before thread starts
  lead_out_mm: number;               // overtravel after thread ends
  thread_length_mm: number;
  material_tensile_MPa: number;
}

export interface SPTPassPlan {
  passes: SPTPass[];
  total_passes: number;
  spring_passes: number;
  estimated_time_sec: number;
  max_chip_area_mm2: number;
  recommendations: string[];
}

export interface SPTPass {
  pass_number: number;
  depth_of_cut_mm: number;            // incremental DOC this pass
  cumulative_depth_mm: number;
  x_position_mm: number;              // programmed X (diameter)
  infeed_angle_deg: number;
  chip_area_mm2: number;
  is_spring_pass: boolean;
}

export interface SPTValidation {
  safe: boolean;
  clearance_ok: boolean;
  synchronization_ok: boolean;
  overtravel_mm: number;
  min_overtravel_required_mm: number;
  warnings: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Thread form depth factors (depth = factor * pitch)
const DEPTH_FACTOR: Record<string, number> = {
  UN: 0.6134,           // 60° thread
  metric: 0.6134,       // 60° thread
  ACME: 0.5,            // 29° thread
  trapezoidal: 0.5,     // 30° thread
  buttress: 0.6,        // 7°/45° thread
};

// Infeed angle for each method
const INFEED_ANGLE: Record<InfeedMethod, number> = {
  radial: 0,
  flank: 29.5,          // slightly less than half-angle for 60° thread
  modified_flank: 29.5,
  alternating_flank: 29.5,
  constant_area: 0,     // varies per pass
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class SinglePointThreadEngine {
  calculatePassPlan(input: SPTInput): SPTPassPlan {
    const totalDepth = input.total_depth_mm || input.pitch_mm * (DEPTH_FACTOR[input.thread_form] || 0.6134);
    const numCutPasses = input.num_passes;
    const passes: SPTPass[] = [];

    let cumDepth = 0;
    const infeedAngle = INFEED_ANGLE[input.infeed_method] || 0;

    for (let i = 1; i <= numCutPasses; i++) {
      let doc: number;

      if (input.infeed_method === "constant_area") {
        // Constant chip area: d_n = totalDepth * sqrt(n/N)
        const cumTarget = totalDepth * Math.sqrt(i / numCutPasses);
        doc = cumTarget - cumDepth;
      } else if (input.infeed_method === "radial") {
        // Decreasing DOC: first pass deepest
        const factor = 1 - (i - 1) / numCutPasses;
        doc = totalDepth / numCutPasses * (1 + factor * 0.5);
        // Normalize so total equals totalDepth
        if (i === numCutPasses) doc = totalDepth - cumDepth;
      } else {
        // Modified flank: constant area with angle compensation
        const cumTarget = totalDepth * Math.sqrt(i / numCutPasses);
        doc = cumTarget - cumDepth;
      }

      doc = Math.max(0.02, doc); // minimum 0.02mm per pass
      cumDepth += doc;
      if (cumDepth > totalDepth) { doc -= (cumDepth - totalDepth); cumDepth = totalDepth; }

      // X position (diameter value)
      const xPos = input.internal
        ? input.major_diameter_mm + 2 * cumDepth  // ID thread: X increases
        : input.major_diameter_mm - 2 * cumDepth; // OD thread: X decreases

      // Chip area (approximate: triangular for 60° thread)
      const chipWidth = doc / Math.cos(infeedAngle * Math.PI / 180);
      const chipArea = chipWidth * input.pitch_mm * 0.5;

      // Alternating flank: alternate sides each pass
      let passAngle = infeedAngle;
      if (input.infeed_method === "alternating_flank") {
        passAngle = i % 2 === 0 ? -infeedAngle : infeedAngle;
      }

      passes.push({
        pass_number: i,
        depth_of_cut_mm: Math.round(doc * 1000) / 1000,
        cumulative_depth_mm: Math.round(cumDepth * 1000) / 1000,
        x_position_mm: Math.round(xPos * 1000) / 1000,
        infeed_angle_deg: passAngle,
        chip_area_mm2: Math.round(chipArea * 10000) / 10000,
        is_spring_pass: false,
      });
    }

    // Spring passes (no additional infeed)
    for (let s = 1; s <= input.spring_passes; s++) {
      const lastCutPass = passes[passes.length - 1];
      passes.push({
        pass_number: numCutPasses + s,
        depth_of_cut_mm: 0,
        cumulative_depth_mm: totalDepth,
        x_position_mm: lastCutPass.x_position_mm,
        infeed_angle_deg: 0,
        chip_area_mm2: 0,
        is_spring_pass: true,
      });
    }

    // Time estimate: each pass = 2 * (thread_length + lead_in + lead_out) / (pitch * RPM/60)
    const passLength = input.thread_length_mm + input.lead_in_mm + input.lead_out_mm;
    const feedRate = input.pitch_mm * input.spindle_rpm / 60; // mm/sec
    const timePerPass = passLength / feedRate + 1; // +1 sec for retract
    const totalTime = timePerPass * passes.length;

    // Max chip area
    const maxChip = Math.max(...passes.map(p => p.chip_area_mm2));

    // Recommendations
    const recs: string[] = [];
    if (maxChip > 0.3) recs.push("High chip area on first passes — consider more passes to reduce load");
    if (input.spring_passes < 1) recs.push("Add at least 1 spring pass for thread finish quality");
    if (input.infeed_method === "radial" && input.pitch_mm > 2) recs.push("Radial infeed on coarse pitch — switch to modified flank to reduce cutting force");
    if (numCutPasses < 4 && totalDepth > 0.5) recs.push("Fewer than 4 cutting passes for deep thread — risk of tool chipping");
    if (recs.length === 0) recs.push("Pass plan acceptable — verify with dry run");

    return {
      passes,
      total_passes: passes.length,
      spring_passes: input.spring_passes,
      estimated_time_sec: Math.round(totalTime * 10) / 10,
      max_chip_area_mm2: Math.round(maxChip * 10000) / 10000,
      recommendations: recs,
    };
  }

  validate(input: SPTInput): SPTValidation {
    const warnings: string[] = [];

    // Overtravel check: at threading RPM, how far does tool travel after commanded stop?
    // Deceleration distance = (RPM * pitch) / (2 * decel_rate)
    // Typical lathe decel: 2000 RPM/sec
    const decelRate = 2000; // RPM/sec
    const decelTime = input.spindle_rpm / decelRate;
    const overtravel = input.pitch_mm * input.spindle_rpm / 60 * decelTime / 2;
    const minOvertravel = overtravel * 1.2; // 20% safety margin

    const clearanceOk = input.lead_out_mm >= minOvertravel;
    if (!clearanceOk) {
      warnings.push(`SAFETY: Overtravel ${overtravel.toFixed(1)}mm exceeds lead-out ${input.lead_out_mm}mm — risk of tool crash at thread end`);
    }

    // Synchronization check
    const maxSyncRpm = 3000; // typical max for reliable threading
    const syncOk = input.spindle_rpm <= maxSyncRpm;
    if (!syncOk) {
      warnings.push(`SAFETY: ${input.spindle_rpm} RPM exceeds reliable threading speed — reduce to ≤${maxSyncRpm} RPM`);
    }

    // Force check
    const plan = this.calculatePassPlan(input);
    const maxForce = plan.max_chip_area_mm2 * input.material_tensile_MPa;
    if (maxForce > 500) {
      warnings.push(`High cutting force (${maxForce.toFixed(0)}N) — risk of insert breakage or part deflection`);
    }

    // Thread depth sanity
    const expectedDepth = input.pitch_mm * (DEPTH_FACTOR[input.thread_form] || 0.6134);
    if (Math.abs(input.total_depth_mm - expectedDepth) / expectedDepth > 0.15) {
      warnings.push(`Thread depth ${input.total_depth_mm}mm differs >15% from standard ${expectedDepth.toFixed(3)}mm — verify specification`);
    }

    return {
      safe: clearanceOk && syncOk && warnings.length <= 1,
      clearance_ok: clearanceOk,
      synchronization_ok: syncOk,
      overtravel_mm: Math.round(overtravel * 10) / 10,
      min_overtravel_required_mm: Math.round(minOvertravel * 10) / 10,
      warnings: warnings.length > 0 ? warnings : ["Threading parameters validated — safe to proceed"],
    };
  }
}

export const singlePointThreadEngine = new SinglePointThreadEngine();
