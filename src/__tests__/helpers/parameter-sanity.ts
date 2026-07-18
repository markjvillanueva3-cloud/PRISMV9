/**
 * Parameter Sanity Guard — Phase 0-C U-TEST6
 *
 * Physical limits that catch impossible values BEFORE they reach physics engines.
 * Prevents bugs like 5-axis G83 Q5000 (5-meter peck depth).
 *
 * Every limit is sourced from physical reality or machine capabilities:
 *   - Feed: max 5 mm/rev (no insert geometry supports more)
 *   - Vc: max 5000 m/min (only PCD on aluminum exceeds 3000)
 *   - DOC: max 3×D for end mills (deflection limit)
 *   - Peck: max 50mm (G83 Q parameter — beyond this, use gun drill)
 *   - RPM: max 60000 (highest production spindles)
 *   - Power: max 200 kW (largest machining centers)
 *   - Force: max 50000 N (would stall any spindle)
 *
 * Source: Machining Data Handbook, Sandvik limits, machine OEM specs
 */

// ============================================================================
// PHYSICAL LIMITS
// ============================================================================

export interface SanityLimits {
  // Speed & Feed
  rpm_max: number;
  rpm_min: number;
  Vc_max_m_min: number;
  Vc_min_m_min: number;
  feed_per_rev_max_mm: number;
  feed_per_tooth_max_mm: number;
  feed_rate_max_mm_min: number;

  // Depth & Engagement
  doc_max_mm: number;
  woc_max_mm: number;
  peck_max_mm: number;

  // Physics
  force_max_N: number;
  power_max_kW: number;
  torque_max_Nm: number;
  deflection_max_mm: number;

  // Tool
  tool_diameter_max_mm: number;
  tool_diameter_min_mm: number;
  flute_count_max: number;

  // Part
  dimension_max_mm: number;
  hardness_max_hrc: number;
  surface_finish_min_Ra_um: number;

  // Cycle
  cycle_time_max_sec: number;
}

export const ABSOLUTE_LIMITS: SanityLimits = {
  // Speed & Feed — absolute physical ceilings
  rpm_max: 60000,           // Highest production HSM spindles (Fischer/Weiss)
  rpm_min: 1,               // Any positive RPM is valid
  Vc_max_m_min: 5000,       // PCD on aluminum at extreme HSM
  Vc_min_m_min: 1,          // EDM wire speeds can be very low
  feed_per_rev_max_mm: 5,   // No insert geometry supports > 5mm/rev
  feed_per_tooth_max_mm: 2, // Extreme aluminum face milling
  feed_rate_max_mm_min: 50000, // High-speed aluminum profiling

  // Depth & Engagement
  doc_max_mm: 100,          // Full-slot deep pocket (specialized)
  woc_max_mm: 200,          // Face mill diameter
  peck_max_mm: 50,          // Beyond this, use gun drill or BTA

  // Physics
  force_max_N: 50000,       // Would stall any standard spindle
  power_max_kW: 200,        // Largest machining center spindles
  torque_max_Nm: 5000,      // Heavy-duty turning centers
  deflection_max_mm: 1.0,   // Beyond this, part is scrap

  // Tool
  tool_diameter_max_mm: 200, // Largest face mill
  tool_diameter_min_mm: 0.1, // Micro-machining
  flute_count_max: 16,       // Large face mills

  // Part
  dimension_max_mm: 10000,   // 10 meters — largest gantry mills
  hardness_max_hrc: 72,      // CBN limit (beyond = unmachinable)
  surface_finish_min_Ra_um: 0.01, // Mirror polish (lapping/polishing, not cutting)

  // Cycle
  cycle_time_max_sec: 86400, // 24 hours — anything longer is likely an error
};

// ============================================================================
// PER-ISO-GROUP LIMITS (tighter than absolute)
// ============================================================================

export const ISO_LIMITS: Record<string, Partial<SanityLimits>> = {
  P: { // Steel
    Vc_max_m_min: 500, rpm_max: 20000,
    feed_per_rev_max_mm: 0.8, feed_per_tooth_max_mm: 0.5,
    doc_max_mm: 15,
  },
  M: { // Stainless
    Vc_max_m_min: 350, rpm_max: 15000,
    feed_per_rev_max_mm: 0.5, feed_per_tooth_max_mm: 0.35,
    doc_max_mm: 10,
  },
  K: { // Cast Iron
    Vc_max_m_min: 500, rpm_max: 20000,
    feed_per_rev_max_mm: 0.8, feed_per_tooth_max_mm: 0.5,
    doc_max_mm: 15,
  },
  N: { // Aluminum
    Vc_max_m_min: 5000, rpm_max: 60000,
    feed_per_rev_max_mm: 1.0, feed_per_tooth_max_mm: 0.6,
    doc_max_mm: 50,
  },
  S: { // Superalloy/Ti
    Vc_max_m_min: 150, rpm_max: 10000,
    feed_per_rev_max_mm: 0.35, feed_per_tooth_max_mm: 0.2,
    doc_max_mm: 5,
  },
  H: { // Hardened Steel
    Vc_max_m_min: 300, rpm_max: 15000,
    feed_per_rev_max_mm: 0.25, feed_per_tooth_max_mm: 0.15,
    doc_max_mm: 3,
  },
};

// ============================================================================
// VALIDATION
// ============================================================================

export interface SanityViolation {
  parameter: string;
  value: number;
  limit: number;
  direction: "above" | "below";
  severity: "error" | "warning";
  message: string;
}

/**
 * Validate a set of cutting/machining parameters against physical limits.
 * Returns violations sorted by severity (errors first).
 */
export function validateParameters(
  params: Record<string, number | undefined>,
  isoGroup?: string,
): SanityViolation[] {
  const violations: SanityViolation[] = [];
  const limits = isoGroup ? { ...ABSOLUTE_LIMITS, ...ISO_LIMITS[isoGroup] } : ABSOLUTE_LIMITS;

  function check(
    name: string, value: number | undefined,
    max: number | undefined, min: number | undefined,
    severity: "error" | "warning" = "error",
  ) {
    if (value === undefined || value === null) return;
    if (isNaN(value)) {
      violations.push({ parameter: name, value: NaN, limit: 0, direction: "above", severity: "error", message: `${name} is NaN` });
      return;
    }
    if (!isFinite(value)) {
      violations.push({ parameter: name, value: Infinity, limit: 0, direction: "above", severity: "error", message: `${name} is Infinity` });
      return;
    }
    if (max !== undefined && value > max) {
      violations.push({ parameter: name, value, limit: max, direction: "above", severity, message: `${name}=${value} exceeds maximum ${max}` });
    }
    if (min !== undefined && value < min) {
      violations.push({ parameter: name, value, limit: min, direction: "below", severity, message: `${name}=${value} below minimum ${min}` });
    }
  }

  // Speed & Feed
  check("rpm", params.rpm, limits.rpm_max, limits.rpm_min);
  check("Vc", params.Vc, limits.Vc_max_m_min, limits.Vc_min_m_min);
  check("feed_per_rev", params.feed_per_rev, limits.feed_per_rev_max_mm, 0.001);
  check("feed_per_tooth", params.feed_per_tooth, limits.feed_per_tooth_max_mm, 0.001);
  check("feed_rate", params.feed_rate, limits.feed_rate_max_mm_min, 0.1);

  // Depth & Engagement
  check("depth_of_cut", params.depth_of_cut, limits.doc_max_mm, 0.001);
  check("width_of_cut", params.width_of_cut, limits.woc_max_mm, 0.001);
  check("peck_depth", params.peck_depth, limits.peck_max_mm, 0.01);

  // Physics
  check("cutting_force", params.cutting_force, limits.force_max_N, 0);
  check("power", params.power, limits.power_max_kW, 0);
  check("torque", params.torque, limits.torque_max_Nm, 0);
  check("deflection", params.deflection, limits.deflection_max_mm, 0, "warning");

  // Tool
  check("tool_diameter", params.tool_diameter, limits.tool_diameter_max_mm, limits.tool_diameter_min_mm);
  check("flute_count", params.flute_count, limits.flute_count_max, 1);

  // Part
  check("dimension", params.dimension, limits.dimension_max_mm, 0.01);
  check("hardness_hrc", params.hardness_hrc, limits.hardness_max_hrc, 0);
  check("surface_finish_Ra", params.surface_finish_Ra, undefined, limits.surface_finish_min_Ra_um);

  // Negative value checks (these should never be negative)
  const neverNegative = ["rpm", "Vc", "feed_per_rev", "feed_per_tooth", "feed_rate",
    "depth_of_cut", "width_of_cut", "peck_depth", "tool_diameter", "power", "cutting_force"];
  for (const name of neverNegative) {
    const v = params[name];
    if (v !== undefined && v < 0) {
      violations.push({
        parameter: name, value: v, limit: 0, direction: "below", severity: "error",
        message: `${name}=${v} is negative — physically impossible`,
      });
    }
  }

  // Sort: errors first, then warnings
  return violations.sort((a, b) => (a.severity === "error" ? 0 : 1) - (b.severity === "error" ? 0 : 1));
}

/**
 * Validate a pipeline result's operations against sanity limits.
 * Extracts parameters from each operation and validates.
 */
export function validatePipelineOutput(
  result: Record<string, unknown>,
  isoGroup?: string,
): { valid: boolean; violations: SanityViolation[]; checked: number } {
  const allViolations: SanityViolation[] = [];
  let checked = 0;

  const operations = result.operations as any[] | undefined;
  if (!operations) return { valid: true, violations: [], checked: 0 };

  for (const op of operations) {
    const cp = op.cutting_params || {};
    const ph = op.physics || {};
    checked++;

    const opViolations = validateParameters({
      rpm: cp.spindle_rpm,
      Vc: cp.cutting_speed_m_min,
      feed_per_rev: cp.feed_per_tooth_mm ? undefined : cp.feed_mm_min ? cp.feed_mm_min / (cp.spindle_rpm || 1) : undefined,
      feed_per_tooth: cp.feed_per_tooth_mm,
      feed_rate: cp.feed_mm_min,
      depth_of_cut: cp.depth_of_cut_mm,
      width_of_cut: cp.width_of_cut_mm,
      cutting_force: ph.cutting_force_N,
      power: ph.power_kW,
      torque: ph.torque_Nm,
      deflection: ph.deflection_mm,
      tool_diameter: op.tool?.diameter_mm,
    }, isoGroup);

    for (const v of opViolations) {
      v.message = `Op ${op.op_number}: ${v.message}`;
      allViolations.push(v);
    }
  }

  // Check program text for NaN/Infinity/undefined
  const text = result.program_text as string | undefined;
  if (text) {
    if (text.includes("NaN")) allViolations.push({ parameter: "program_text", value: NaN, limit: 0, direction: "above", severity: "error", message: "NaN found in G-code program" });
    if (text.includes("Infinity")) allViolations.push({ parameter: "program_text", value: Infinity, limit: 0, direction: "above", severity: "error", message: "Infinity found in G-code program" });
    if (text.includes("undefined")) allViolations.push({ parameter: "program_text", value: 0, limit: 0, direction: "above", severity: "error", message: "'undefined' found in G-code program" });
  }

  return { valid: allViolations.filter(v => v.severity === "error").length === 0, violations: allViolations, checked };
}
