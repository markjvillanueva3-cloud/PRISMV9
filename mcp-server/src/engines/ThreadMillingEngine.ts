/**
 * ThreadMillingEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Calculates thread milling parameters: helical interpolation toolpath,
 * radial engagement per pass, axial feed, and synchronization of
 * helical pitch with thread pitch.
 *
 * Supports internal/external threads, single-point and multi-form
 * thread mills, and left/right hand threads.
 *
 * Actions: thread_mill_calc, thread_mill_gcode, thread_mill_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type ThreadForm = "UN" | "metric" | "BSPP" | "BSPT" | "NPT" | "ACME" | "trapezoidal";
export type ThreadDirection = "right_hand" | "left_hand";
export type MillApproach = "single_form" | "multi_form" | "full_profile";

export interface ThreadMillInput {
  thread_form: ThreadForm;
  nominal_diameter_mm: number;
  pitch_mm: number;
  internal: boolean;
  direction: ThreadDirection;
  thread_depth_mm: number;           // engagement depth (radial)
  thread_length_mm: number;          // axial length of thread
  mill_approach: MillApproach;
  tool_diameter_mm: number;
  num_flutes: number;
  num_radial_passes: number;         // 1-3 typical
  spindle_rpm: number;
  material_specific_force_N_mm2: number;
}

export interface ThreadMillResult {
  helical_diameter_mm: number;       // programmed toolpath diameter
  lead_per_revolution_mm: number;    // = pitch for single-start
  radial_depth_per_pass_mm: number;
  axial_feed_mm_per_rev: number;
  feed_rate_mm_per_min: number;      // actual feed rate for CNC
  cutting_time_sec: number;
  helical_revolutions: number;
  climb_or_conventional: string;
  force_estimate_N: number;
  recommendations: string[];
}

export interface ThreadGCode {
  lines: string[];
  controller: string;
  notes: string;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ThreadMillingEngine {
  calculate(input: ThreadMillInput): ThreadMillResult {
    const D = input.nominal_diameter_mm;
    const d = input.tool_diameter_mm;
    const P = input.pitch_mm;

    // Helical interpolation diameter
    // Internal: toolpath diameter = thread major diameter - tool diameter
    // External: toolpath diameter = thread major diameter + tool diameter
    const helicalDia = input.internal ? D - d : D + d;

    // Radial depth per pass
    const totalRadialDepth = input.thread_depth_mm;
    const radialPerPass = totalRadialDepth / input.num_radial_passes;

    // Helical revolutions needed
    // For single-form: one helix revolution per pitch
    // For multi-form: fewer revolutions (tool covers multiple pitches)
    let helicalRevs: number;
    if (input.mill_approach === "single_form") {
      helicalRevs = Math.ceil(input.thread_length_mm / P) + 1; // +1 for entry/exit
    } else if (input.mill_approach === "multi_form") {
      // Multi-form covers multiple pitches per tool length
      helicalRevs = 2; // typically 1.25 revolutions + entry/exit
    } else {
      helicalRevs = 1.25; // full profile single revolution
    }

    // Axial feed = pitch per revolution for thread synchronization
    const axialFeedPerRev = P;

    // Helical circumference for feed rate calculation
    const helicalCircumference = Math.PI * helicalDia;

    // Feed per tooth (tangential)
    // Effective feed adjusted for helical motion
    const fz = 0.05 + radialPerPass * 0.1; // simplified feed per tooth
    const feedRate = fz * input.num_flutes * input.spindle_rpm;

    // Cutting time
    const totalHelicalPath = helicalCircumference * helicalRevs * input.num_radial_passes;
    const cuttingTime = totalHelicalPath / feedRate * 60; // seconds

    // Climb vs conventional
    // Internal RH thread, G3 (CCW) = climb milling
    // External RH thread, G2 (CW) = climb milling
    const climb = (input.internal && input.direction === "right_hand") ||
      (!input.internal && input.direction === "left_hand");
    const climbConv = climb ? "climb (preferred)" : "conventional";

    // Force estimate
    const chipArea = radialPerPass * fz;
    const force = chipArea * input.material_specific_force_N_mm2 * input.num_flutes * 0.5;

    // Recommendations
    const recs: string[] = [];
    if (radialPerPass > 0.5) {
      recs.push("Radial depth >0.5mm per pass — consider adding passes to reduce tool load");
    }
    if (input.internal && d > D * 0.7) {
      recs.push("Tool diameter >70% of bore — limited chip evacuation, use through-coolant");
    }
    if (input.mill_approach === "single_form" && input.thread_length_mm > P * 5) {
      recs.push("Long thread with single-form — consider multi-form cutter for faster cycle time");
    }
    if (helicalDia < d * 1.1) {
      recs.push("Helical diameter too close to tool diameter — tool cannot fit; use smaller cutter");
    }
    if (recs.length === 0) {
      recs.push("Thread milling parameters acceptable — verify with dry run");
    }

    return {
      helical_diameter_mm: Math.round(helicalDia * 1000) / 1000,
      lead_per_revolution_mm: P,
      radial_depth_per_pass_mm: Math.round(radialPerPass * 1000) / 1000,
      axial_feed_mm_per_rev: axialFeedPerRev,
      feed_rate_mm_per_min: Math.round(feedRate * 10) / 10,
      cutting_time_sec: Math.round(cuttingTime * 10) / 10,
      helical_revolutions: Math.round(helicalRevs * 100) / 100,
      climb_or_conventional: climbConv,
      force_estimate_N: Math.round(force * 10) / 10,
      recommendations: recs,
    };
  }

  generateGCode(input: ThreadMillInput, controller: "fanuc" | "siemens" | "haas"): ThreadGCode {
    const result = this.calculate(input);
    const lines: string[] = [];
    const R = result.helical_diameter_mm / 2;
    const P = input.pitch_mm;
    const Z_start = 2; // safety clearance above thread
    const Z_end = -(input.thread_length_mm + P);

    // Determine G2/G3 based on direction and internal/external
    const arcCode = (input.internal && input.direction === "right_hand") ? "G3"
      : (input.internal && input.direction === "left_hand") ? "G2"
      : (!input.internal && input.direction === "right_hand") ? "G2"
      : "G3";

    lines.push("(Thread Milling Cycle)");
    lines.push(`(${input.internal ? "Internal" : "External"} ${input.thread_form} ${input.direction})`);
    lines.push(`(Nominal: ${input.nominal_diameter_mm}mm, Pitch: ${P}mm)`);
    lines.push(`G90 G17 G21 (absolute, XY plane, metric)`);
    lines.push(`G0 X0 Y0 Z${Z_start.toFixed(1)}`);
    lines.push(`G0 X${R.toFixed(3)} Y0 (move to helical radius)`);
    lines.push(`G1 Z0 F${Math.round(result.feed_rate_mm_per_min * 0.5)} (plunge to thread start)`);

    // Helical arc
    const revolutions = Math.ceil(input.thread_length_mm / P);
    for (let i = 0; i < revolutions; i++) {
      const zTarget = -(i + 1) * P;
      lines.push(`${arcCode} X${R.toFixed(3)} Y0 I${(-R).toFixed(3)} J0 Z${zTarget.toFixed(3)} F${Math.round(result.feed_rate_mm_per_min)}`);
    }

    lines.push(`G1 X0 Y0 (retract to center)`);
    lines.push(`G0 Z${Z_start.toFixed(1)} (rapid to clearance)`);
    lines.push("M30");

    return {
      lines,
      controller,
      notes: `${revolutions} helical revolutions, ${result.climb_or_conventional}. Verify with single-block dry run.`,
    };
  }
}

export const threadMillingEngine = new ThreadMillingEngine();
