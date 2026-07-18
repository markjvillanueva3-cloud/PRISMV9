/**
 * EccentricTurningEngine — ELEC-PIPE Session 8
 *
 * Generates CNC programs for non-circular turning profiles (trilobes, taptites,
 * eccentric shapes) using C-axis + X-axis polar interpolation.
 *
 * Target Controllers:
 * -------------------
 * - OSP-P300L-R (Okuma GENOS L300-M) — C-axis live tooling
 * - OSP-P300LA-E (Okuma GENOS L400II-E) — extended travel
 * - OSP-P300SA (Okuma Multus B250II) — full mill-turn
 *
 * Polar Interpolation:
 * --------------------
 * G12.1 enables polar coordinate mode where:
 *   X = radius (diameter in most controls)
 *   C = angle [degrees]
 *
 * For trilobe profile r(θ) = R_base + A × cos(3θ):
 *   The X-axis tracks the radius while C-axis rotates
 *   Synchronized motion creates the lobed cross-section
 *
 * Physics Considerations:
 * -----------------------
 * - Cutting force varies per revolution (peaks at lobe crests)
 * - Spindle speed limited by max C(1) diameter (CSS)
 * - X-axis acceleration limits for reversal at lobes
 * - Surface finish affected by varying chip load
 *
 * @module engines/EccentricTurningEngine
 * @version 1.0.0
 */

import { z } from "zod";
import {
  calculateTrilobeProfile,
  calculateLobeRotation,
  type TrilobeStage,
  type ProfilePoint2D,
} from "./TrilobeElectrodeGeometryEngine.js";
import { CANONICAL_MATERIAL_DB } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

/** Supported Okuma controller dialects */
export type OkumaDialect = "OSP-P300L-R" | "OSP-P300LA-E" | "OSP-P300SA";

/** Profile shape type */
export type ProfileType = "trilobe" | "bilateral" | "eccentric_circle" | "polygon";

/** Eccentric turning input */
export interface EccentricTurningInput {
  /** Part/job number */
  part_number: string;

  /** Profile type */
  profile_type: ProfileType;

  // Trilobe-specific (when profile_type === "trilobe")
  /** Trilobe stages (from TrilobeElectrodeGeometryEngine) */
  trilobe_stages?: TrilobeStage[];
  /** Lead angle for helical profile [degrees] */
  lead_angle_deg?: number;

  // Generic eccentric (when profile_type !== "trilobe")
  /** Number of lobes (for polygon) */
  lobe_count?: number;
  /** Max radius [inches] */
  max_radius_in?: number;
  /** Min radius [inches] */
  min_radius_in?: number;

  // Common parameters
  /** Total length [inches] */
  total_length_in: number;
  /** Workpiece material */
  workpiece_material: string;
  /** Target surface finish [Ra µm] */
  target_finish_Ra_um: number;
  /** Spindle speed limit [RPM] */
  max_spindle_rpm: number;

  // Machine selection
  /** Target controller dialect */
  controller: OkumaDialect;
  /** Tool turret position */
  tool_position: number;
  /** Tool nose radius [inches] */
  tool_nose_radius_in: number;

  // Process options
  /** Number of finish passes */
  finish_passes: number;
  /** Stock allowance for finish [inches] */
  finish_stock_in: number;
  /** Use CSS (G96) */
  use_css: boolean;
  /** CSS surface speed [SFM] */
  css_sfm?: number;
}

/** G-code output */
export interface EccentricTurningOutput {
  job_id: string;
  part_number: string;
  controller: OkumaDialect;
  gcode: string;
  program_number: string;
  cycle_time_min: number;
  warnings: string[];
  physics: {
    max_cutting_force_N: number;
    force_variation_percent: number;
    max_x_accel_mm_s2: number;
    recommended_css_sfm: number;
  };
  profile_summary: {
    type: ProfileType;
    max_diameter_in: number;
    min_diameter_in: number;
    lobe_amplitude_in: number;
    sections_generated: number;
  };
}

// ============================================================================
// PHYSICS CALCULATIONS
// ============================================================================

/**
 * Calculate cutting force variation for eccentric profile.
 * Force peaks when chip load increases at lobe crests.
 */
function calculateForceVariation(
  max_radius: number,
  min_radius: number,
  feed_per_rev: number,
  workpiece_material: string
): { max_force_N: number; variation_percent: number } {
  // Get material Kienzle coefficients
  const material = Object.values(CANONICAL_MATERIAL_DB).find(
    m => m.name.toLowerCase().includes(workpiece_material.toLowerCase())
  ) || CANONICAL_MATERIAL_DB["1045"]; // fallback: 1045 carbon steel (DB is keyed "1045", NOT "steel_1045" — the old key was dead → TypeError on any off-DB material e.g. graphite)

  const kc1_1 = material.kc1_1;
  const mc = material.mc;

  // Chip load varies with radius change rate
  const amplitude = (max_radius - min_radius) / 2;
  const avg_radius = (max_radius + min_radius) / 2;

  // Max chip load at lobe crest (radius decreasing fastest)
  const max_fz = feed_per_rev * (1 + amplitude / avg_radius * 0.3);
  const min_fz = feed_per_rev * (1 - amplitude / avg_radius * 0.3);

  // Kienzle: F = kc1_1 × ap × fz^(1-mc)
  const ap = 0.020; // Typical DOC for graphite [inches]
  const max_force = kc1_1 * ap * 25.4 * Math.pow(max_fz, 1 - mc);
  const min_force = kc1_1 * ap * 25.4 * Math.pow(min_fz, 1 - mc);

  return {
    max_force_N: max_force,
    variation_percent: ((max_force - min_force) / max_force) * 100,
  };
}

/**
 * Calculate X-axis acceleration required for polar interpolation.
 */
function calculateXAxisAcceleration(
  lobe_amplitude: number,
  spindle_rpm: number,
  lobe_count: number
): number {
  // For n lobes at S RPM, X reverses n×S times per minute
  const reversals_per_sec = (lobe_count * spindle_rpm) / 60;

  // X travel = 2 × amplitude per half-cycle
  const x_travel_mm = lobe_amplitude * 25.4 * 2;

  // Acceleration for sinusoidal motion: a = ω² × A
  const omega = 2 * Math.PI * reversals_per_sec;
  const accel = omega * omega * (lobe_amplitude * 25.4);

  return accel;
}

/**
 * Calculate recommended CSS speed based on max diameter.
 */
function calculateRecommendedCSS(
  max_diameter_in: number,
  workpiece_material: string
): number {
  // Base SFM by material
  const sfm_map: Record<string, number> = {
    graphite: 600,
    d2: 250,
    m2: 200,
    s7: 300,
    a2: 280,
    h13: 220,
    carbide: 100,
    aluminum: 1000,
  };

  const base_sfm = sfm_map[workpiece_material.toLowerCase()] || 300;

  // Limit based on max diameter to keep RPM reasonable
  const max_rpm_at_max_dia = (base_sfm * 12) / (Math.PI * max_diameter_in);

  // Cap at 2000 RPM for safety
  if (max_rpm_at_max_dia > 2000) {
    return (2000 * Math.PI * max_diameter_in) / 12;
  }

  return base_sfm;
}

// ============================================================================
// G-CODE GENERATION
// ============================================================================

/**
 * Generate Okuma OSP-P300 polar interpolation program.
 */
function generateOkumaProgram(
  input: EccentricTurningInput,
  profile: ProfilePoint2D[],
  sections: Array<{ z: number; profile: ProfilePoint2D[] }>
): { gcode: string; program_number: string } {
  const lines: string[] = [];
  const program_number = `O${input.part_number.replace(/[^0-9]/g, "").slice(0, 4).padStart(4, "0")}`;

  // Header
  lines.push(`(${program_number})`);
  lines.push(`(PRISM ECCENTRIC TURNING - ${input.profile_type.toUpperCase()})`);
  lines.push(`(PART: ${input.part_number})`);
  lines.push(`(CONTROLLER: ${input.controller})`);
  lines.push(`(GENERATED: ${new Date().toISOString()})`);
  lines.push(``);

  // Safety startup
  lines.push(`G90 G95 G40`);
  lines.push(`G28 U0 W0`);
  lines.push(``);

  // Tool call
  lines.push(`T${input.tool_position.toString().padStart(2, "0")}${input.tool_position.toString().padStart(2, "0")} (TURNING TOOL)`);

  // Spindle
  if (input.use_css && input.css_sfm) {
    lines.push(`G96 S${input.css_sfm} M3 M8 (CSS ${input.css_sfm} SFM)`);
    lines.push(`G50 S${input.max_spindle_rpm} (MAX RPM CLAMP)`);
  } else {
    lines.push(`G97 S${input.max_spindle_rpm} M3 M8`);
  }
  lines.push(``);

  // Tool nose compensation
  lines.push(`G42 (TOOL NOSE COMP RIGHT)`);
  lines.push(``);

  // Rapid to start position
  const start_x = Math.max(...profile.map(p => Math.sqrt(p.x * p.x + p.y * p.y))) * 2 + 0.5;
  lines.push(`G0 X${start_x.toFixed(4)} Z0.1`);
  lines.push(``);

  // Enable polar interpolation
  lines.push(`(--- POLAR INTERPOLATION MODE ---)`);
  lines.push(`G12.1 (POLAR ON)`);
  lines.push(``);

  // Calculate feed for finish pass
  const feed_ipr = input.target_finish_Ra_um < 1.6 ? 0.002 : input.target_finish_Ra_um < 3.2 ? 0.003 : 0.005;

  // Generate passes for each Z section
  for (let pass = 0; pass < input.finish_passes; pass++) {
    const stock_offset = input.finish_stock_in * (input.finish_passes - pass - 1) / Math.max(1, input.finish_passes - 1);

    lines.push(`(PASS ${pass + 1}/${input.finish_passes} - STOCK OFFSET ${(stock_offset * 1000).toFixed(1)} THOU)`);

    for (const section of sections) {
      lines.push(`(Z = ${section.z.toFixed(4)})`);

      // Move to Z position
      lines.push(`G0 Z${section.z.toFixed(4)}`);

      // Trace profile in polar coordinates
      for (let i = 0; i < section.profile.length; i += 3) {
        const pt = section.profile[i];
        const r = Math.sqrt(pt.x * pt.x + pt.y * pt.y) + stock_offset;
        const theta = (Math.atan2(pt.y, pt.x) * 180) / Math.PI;
        const c_angle = theta < 0 ? theta + 360 : theta;

        lines.push(`G1 X${(r * 2).toFixed(4)} C${c_angle.toFixed(2)} F${feed_ipr}`);
      }

      // Close profile
      const first_pt = section.profile[0];
      const first_r = Math.sqrt(first_pt.x * first_pt.x + first_pt.y * first_pt.y) + stock_offset;
      lines.push(`G1 X${(first_r * 2).toFixed(4)} C0.00 F${feed_ipr}`);
    }

    lines.push(``);
  }

  // Cancel polar mode
  lines.push(`G13.1 (POLAR OFF)`);
  lines.push(`G40 (CANCEL TNR)`);
  lines.push(``);

  // End
  lines.push(`G28 U0 W0`);
  lines.push(`M30`);
  lines.push(`%`);

  return {
    gcode: lines.join("\n"),
    program_number,
  };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class EccentricTurningEngine {
  private jobCounter = 0;

  /**
   * Generate eccentric turning program.
   */
  async generate(input: EccentricTurningInput): Promise<EccentricTurningOutput> {
    const jobId = this.generateJobId(input.part_number);
    const warnings: string[] = [];

    // Determine profile geometry
    let max_radius: number;
    let min_radius: number;
    let lobe_count = 3;
    let profile: ProfilePoint2D[];
    const sections: Array<{ z: number; profile: ProfilePoint2D[] }> = [];

    if (input.profile_type === "trilobe" && input.trilobe_stages) {
      // Use TrilobeElectrodeGeometryEngine calculations
      const stage = input.trilobe_stages[0];
      max_radius = stage.c_dia_in / 2;
      min_radius = stage.e_dia_in / 2;
      lobe_count = 3;

      // Generate sections at Z intervals
      const z_step = 0.020; // 20 thou steps
      for (let z = 0; z <= input.total_length_in; z += z_step) {
        const rotation = input.lead_angle_deg
          ? calculateLobeRotation(z, input.lead_angle_deg, input.total_length_in)
          : 0;

        const section_profile = calculateTrilobeProfile(
          stage.c_dia_in,
          stage.e_dia_in,
          120,
          rotation
        );

        sections.push({ z, profile: section_profile });
      }

      profile = sections[0].profile;
    } else {
      // Generic polygon/eccentric
      max_radius = input.max_radius_in || 0.5;
      min_radius = input.min_radius_in || 0.4;
      lobe_count = input.lobe_count || 3;

      // Generate profile using polar equation
      profile = [];
      const R_base = (max_radius + min_radius) / 2;
      const A = (max_radius - min_radius) / 2;

      for (let i = 0; i < 360; i++) {
        const theta = (i * Math.PI) / 180;
        const r = R_base + A * Math.cos(lobe_count * theta);
        profile.push({
          x: r * Math.cos(theta),
          y: r * Math.sin(theta),
        });
      }

      // Single section for non-trilobe
      for (let z = 0; z <= input.total_length_in; z += 0.020) {
        sections.push({ z, profile });
      }
    }

    // Physics calculations
    const lobe_amplitude = (max_radius - min_radius) / 2;
    const feed_ipr = input.target_finish_Ra_um < 3.2 ? 0.003 : 0.005;
    const force_calc = calculateForceVariation(
      max_radius,
      min_radius,
      feed_ipr,
      input.workpiece_material
    );

    const x_accel = calculateXAxisAcceleration(
      lobe_amplitude,
      input.max_spindle_rpm,
      lobe_count
    );

    const recommended_css = calculateRecommendedCSS(max_radius * 2, input.workpiece_material);

    // Safety checks
    if (x_accel > 5000) {
      warnings.push(`High X-axis acceleration (${x_accel.toFixed(0)} mm/s²) — reduce RPM or use lighter DOC`);
    }

    if (force_calc.variation_percent > 30) {
      warnings.push(`Force variation ${force_calc.variation_percent.toFixed(0)}% — use constant chip load strategy`);
    }

    if (input.controller === "OSP-P300L-R" && lobe_amplitude > 0.125) {
      warnings.push("Large lobe amplitude may exceed GENOS L300-M Y-travel — verify part fits");
    }

    // Generate G-code
    const { gcode, program_number } = generateOkumaProgram(input, profile, sections);

    // Estimate cycle time
    // Time = (length × passes × 360°) / (RPM × feed × 360)
    const cycle_time_min =
      (input.total_length_in * input.finish_passes * 360) /
      (input.max_spindle_rpm * feed_ipr * 360 * 0.7); // 70% efficiency

    return {
      job_id: jobId,
      part_number: input.part_number,
      controller: input.controller,
      gcode,
      program_number,
      cycle_time_min,
      warnings,
      physics: {
        max_cutting_force_N: force_calc.max_force_N,
        force_variation_percent: force_calc.variation_percent,
        max_x_accel_mm_s2: x_accel,
        recommended_css_sfm: recommended_css,
      },
      profile_summary: {
        type: input.profile_type,
        max_diameter_in: max_radius * 2,
        min_diameter_in: min_radius * 2,
        lobe_amplitude_in: lobe_amplitude,
        sections_generated: sections.length,
      },
    };
  }

  /**
   * Get supported controllers.
   */
  getSupportedControllers(): OkumaDialect[] {
    return ["OSP-P300L-R", "OSP-P300LA-E", "OSP-P300SA"];
  }

  /**
   * Validate input before generation.
   */
  validateInput(input: EccentricTurningInput): string[] {
    const errors: string[] = [];

    if (input.profile_type === "trilobe" && !input.trilobe_stages?.length) {
      errors.push("Trilobe profile requires trilobe_stages");
    }

    if (input.profile_type !== "trilobe" && !input.max_radius_in) {
      errors.push("Non-trilobe profiles require max_radius_in");
    }

    if (input.max_spindle_rpm > 3000) {
      errors.push("Max spindle RPM exceeds safe limit for polar interpolation (3000)");
    }

    return errors;
  }

  private generateJobId(partNumber: string): string {
    this.jobCounter++;
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `ECCENTRIC-${partNumber.slice(0, 6)}-${date}-${this.jobCounter.toString().padStart(3, "0")}`;
  }

  /**
   * Get engine statistics.
   */
  stats(): { jobs_generated: number; controllers_supported: number } {
    return {
      jobs_generated: this.jobCounter,
      controllers_supported: 3,
    };
  }
}

// Export singleton
export const eccentricTurningEngine = new EccentricTurningEngine();
