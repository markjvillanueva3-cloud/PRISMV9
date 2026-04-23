/**
 * WEDMHeadClearanceEngine — Upper/Lower Head Clearance Safety Gate
 *
 * Validates that the WEDM upper and lower guide heads maintain sufficient
 * clearance from the workpiece surface during cutting. Insufficient clearance
 * causes:
 *   - Collision during rapid positioning
 *   - Contact during taper cuts where UV axes swing the upper head
 *   - Dielectric flow interference affecting flush adequacy
 *
 * The minimum clearance depends on workpiece thickness:
 *   ≤ 25mm (thin)   → 3mm minimum
 *   25-75mm (medium) → 5mm minimum
 *   > 75mm (thick)  → 8mm minimum
 *
 * For taper cuts, additional clearance is required based on the taper angle
 * and workpiece thickness to accommodate the UV swing:
 *   swing_clearance = thickness × tan(taper_angle)
 *
 * Output plugs directly into WEDMProgramSafetyGateEngine's `head_clearance`
 * input and contributes 0.15 to the composite S(x).
 *
 * MS-P2.5-SAFETY/U-P2.5-SAFE-03
 *
 * @see WEDMProgramSafetyGateEngine — composite S(x) gate consumer
 * @see WEDMWirePathCollisionEngine — full swept-volume collision detection
 */

import { WEDM_HEAD_CLEARANCE } from "../physics/wedm-constants.js";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type ClearanceThicknessBand = "thin" | "medium" | "thick";

export type HeadClearanceVerdict =
  | "pass"
  | "marginal"
  | "fail_upper_clearance"
  | "fail_lower_clearance"
  | "fail_taper_swing"
  | "fail_invalid_input";

export interface HeadClearanceInput {
  /** Workpiece thickness [mm]. REQUIRED. */
  workpiece_thickness_mm: number;
  /** Workpiece top surface Z position [mm above table]. REQUIRED. */
  workpiece_top_z_mm: number;
  /** Upper guide Z position [mm above table]. REQUIRED. */
  upper_guide_z_mm: number;
  /** Upper head assembly height [mm]. Uses default if not provided. */
  upper_head_height_mm?: number;
  /** Lower guide Z position [mm, usually 0 at table]. Default 0. */
  lower_guide_z_mm?: number;
  /** Lower head assembly height below guide [mm]. Default same as upper. */
  lower_head_height_mm?: number;
  /** Taper angle [degrees]. 0 for straight cuts. */
  taper_angle_deg?: number;
  /** Additional safety margin [mm]. Default 0. */
  safety_margin_mm?: number;
}

export interface HeadClearanceMetrics {
  upper_clearance_mm: number;
  lower_clearance_mm: number;
  required_clearance_mm: number;
  taper_swing_mm: number;
  effective_upper_clearance_mm: number;
  band: ClearanceThicknessBand;
}

export interface HeadClearanceResult {
  success: boolean;
  pass: boolean;
  verdict: HeadClearanceVerdict;
  hard_block: boolean;
  metrics: HeadClearanceMetrics;
  /** Input shape for WEDMProgramSafetyGateEngine.head_clearance */
  safety_gate_input: {
    pass: boolean;
    min_clearance_mm: number;
    required_clearance_mm: number;
  };
  /** S(x) contribution (0.15 when passing, 0 otherwise) */
  safety_score_contribution: number;
  summary: string;
  warnings: string[];
  recommendations: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const SAFETY_SCORE_PASS = 0.15;
const SAFETY_SCORE_FAIL = 0.0;

const MIN_CLEARANCE = WEDM_HEAD_CLEARANCE.min_clearance_mm;
const BANDS = WEDM_HEAD_CLEARANCE.bands;
const WARNING_MULT = WEDM_HEAD_CLEARANCE.warning_multiplier;
const DEFAULT_HEAD_HEIGHT = WEDM_HEAD_CLEARANCE.default_upper_head_height_mm;

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

export class WEDMHeadClearanceEngine {
  readonly name = "WEDMHeadClearanceEngine";
  readonly version = "1.0.0";

  /**
   * Evaluate head clearance safety for given workpiece and machine setup.
   *
   * @param input workpiece and head position parameters
   * @returns full result with verdict and safety_gate_input
   */
  evaluate(input: HeadClearanceInput): HeadClearanceResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Validate required inputs
    if (!this.validateInput(input)) {
      return this.buildInvalidInputResult(input);
    }

    const {
      workpiece_thickness_mm,
      workpiece_top_z_mm,
      upper_guide_z_mm,
      upper_head_height_mm = DEFAULT_HEAD_HEIGHT,
      lower_guide_z_mm = 0,
      lower_head_height_mm = upper_head_height_mm,
      taper_angle_deg = 0,
      safety_margin_mm = 0,
    } = input;

    // Determine thickness band
    const band = this.getThicknessBand(workpiece_thickness_mm);
    const required = MIN_CLEARANCE[band] + safety_margin_mm;
    const warningThreshold = required * WARNING_MULT;

    // Calculate upper clearance (space between upper head bottom and workpiece top)
    const upperHeadBottomZ = upper_guide_z_mm - upper_head_height_mm;
    const upperClearance = upperHeadBottomZ - workpiece_top_z_mm;

    // Calculate lower clearance (space between workpiece bottom and lower head top)
    const workpieceBottomZ = workpiece_top_z_mm - workpiece_thickness_mm;
    const lowerHeadTopZ = lower_guide_z_mm + lower_head_height_mm;
    const lowerClearance = workpieceBottomZ - lowerHeadTopZ;

    // Calculate taper swing clearance needed
    const taperRad = (taper_angle_deg * Math.PI) / 180;
    const taperSwing = workpiece_thickness_mm * Math.tan(Math.abs(taperRad));
    const effectiveUpperClearance = upperClearance - taperSwing;

    const metrics: HeadClearanceMetrics = {
      upper_clearance_mm: Math.round(upperClearance * 100) / 100,
      lower_clearance_mm: Math.round(lowerClearance * 100) / 100,
      required_clearance_mm: required,
      taper_swing_mm: Math.round(taperSwing * 100) / 100,
      effective_upper_clearance_mm: Math.round(effectiveUpperClearance * 100) / 100,
      band,
    };

    // Determine verdict
    let verdict: HeadClearanceVerdict = "pass";
    let pass = true;

    if (effectiveUpperClearance < required) {
      if (taperSwing > 0 && upperClearance >= required) {
        verdict = "fail_taper_swing";
        warnings.push(
          `Taper swing of ${taperSwing.toFixed(2)}mm reduces effective clearance to ${effectiveUpperClearance.toFixed(2)}mm < required ${required.toFixed(2)}mm`
        );
        recommendations.push(
          `Raise upper guide by ${(required - effectiveUpperClearance).toFixed(2)}mm or reduce taper angle`
        );
      } else {
        verdict = "fail_upper_clearance";
        warnings.push(
          `Upper head clearance ${upperClearance.toFixed(2)}mm < required ${required.toFixed(2)}mm`
        );
        recommendations.push(
          `Raise upper guide Z by ${(required - upperClearance).toFixed(2)}mm`
        );
      }
      pass = false;
    } else if (lowerClearance < required) {
      verdict = "fail_lower_clearance";
      pass = false;
      warnings.push(
        `Lower head clearance ${lowerClearance.toFixed(2)}mm < required ${required.toFixed(2)}mm`
      );
      recommendations.push(
        `Lower the workpiece or raise the submerge tank level`
      );
    } else if (effectiveUpperClearance < warningThreshold) {
      verdict = "marginal";
      warnings.push(
        `Upper clearance ${effectiveUpperClearance.toFixed(2)}mm is marginal (recommend ≥${warningThreshold.toFixed(2)}mm)`
      );
    }

    const minClearance = Math.min(effectiveUpperClearance, lowerClearance);

    return {
      success: true,
      pass,
      verdict,
      hard_block: !pass,
      metrics,
      safety_gate_input: {
        pass,
        min_clearance_mm: Math.round(minClearance * 100) / 100,
        required_clearance_mm: required,
      },
      safety_score_contribution: pass ? SAFETY_SCORE_PASS : SAFETY_SCORE_FAIL,
      summary: pass
        ? `HEAD CLEARANCE OK: ${minClearance.toFixed(2)}mm ≥ ${required.toFixed(2)}mm required (${band})`
        : `HEAD CLEARANCE BLOCK: ${verdict} — ${minClearance.toFixed(2)}mm < ${required.toFixed(2)}mm`,
      warnings,
      recommendations,
    };
  }

  /**
   * Convenience gate wrapper.
   */
  gate(input: HeadClearanceInput): {
    allow: boolean;
    reason: string;
    result: HeadClearanceResult;
  } {
    const result = this.evaluate(input);
    return { allow: result.pass, reason: result.summary, result };
  }

  /**
   * Get the thickness band for minimum clearance lookup.
   */
  getThicknessBand(thickness_mm: number): ClearanceThicknessBand {
    if (thickness_mm <= BANDS.thin_max) return "thin";
    if (thickness_mm <= BANDS.medium_max) return "medium";
    return "thick";
  }

  /**
   * Get minimum clearance for a thickness band.
   */
  getMinClearance(band: ClearanceThicknessBand): number {
    return MIN_CLEARANCE[band];
  }

  private validateInput(input: HeadClearanceInput): boolean {
    if (
      typeof input.workpiece_thickness_mm !== "number" ||
      !Number.isFinite(input.workpiece_thickness_mm) ||
      input.workpiece_thickness_mm <= 0
    ) {
      return false;
    }
    if (
      typeof input.workpiece_top_z_mm !== "number" ||
      !Number.isFinite(input.workpiece_top_z_mm)
    ) {
      return false;
    }
    if (
      typeof input.upper_guide_z_mm !== "number" ||
      !Number.isFinite(input.upper_guide_z_mm)
    ) {
      return false;
    }
    return true;
  }

  private buildInvalidInputResult(input: HeadClearanceInput): HeadClearanceResult {
    return {
      success: false,
      pass: false,
      verdict: "fail_invalid_input",
      hard_block: true,
      metrics: {
        upper_clearance_mm: 0,
        lower_clearance_mm: 0,
        required_clearance_mm: 0,
        taper_swing_mm: 0,
        effective_upper_clearance_mm: 0,
        band: "medium",
      },
      safety_gate_input: {
        pass: false,
        min_clearance_mm: 0,
        required_clearance_mm: 0,
      },
      safety_score_contribution: SAFETY_SCORE_FAIL,
      summary: `HEAD CLEARANCE INVALID: missing or invalid input parameters`,
      warnings: ["Invalid input: workpiece_thickness_mm, workpiece_top_z_mm, and upper_guide_z_mm are required"],
      recommendations: ["Provide valid numeric values for all required parameters"],
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// AABB + MachinePose API (U-P2PFS24)
// ══════════════════════════════════════════════════════════════════════════════

export interface MachinePose {
  X: number;
  Y: number;
  Z_upper: number;
  Z_lower: number;
  U?: number;
  V?: number;
}

export interface AABB {
  id: string;
  role: "fixture" | "part" | "tank_wall" | "other";
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface GuideDimensions {
  radius_mm: number;
  length_mm: number;
}

export interface ClearanceOptions {
  upperGuide?: GuideDimensions;
  lowerGuide?: GuideDimensions;
  safetyMargin_mm?: number;
  tankInner?: AABB;
  tableZ?: number;
}

export interface ClearanceEvent {
  kind:
    | "guide_vs_fixture"
    | "guide_vs_part"
    | "wire_vs_fixture"
    | "head_outside_tank"
    | "head_below_table";
  severity: "critical" | "warning" | "info";
  actor: "upper_guide" | "lower_guide" | "wire" | "head";
  obstacleId?: string;
  distance_mm: number;
  message: string;
}

export interface ClearanceReport {
  pose: MachinePose;
  pass: boolean;
  minClearance_mm: number;
  events: ClearanceEvent[];
}

export const DEFAULT_UPPER_GUIDE: GuideDimensions = { radius_mm: 20, length_mm: 40 };
export const DEFAULT_LOWER_GUIDE: GuideDimensions = { radius_mm: 20, length_mm: 40 };
export const DEFAULT_SAFETY_MARGIN_MM = 2;

/**
 * Axis-aligned distance from point to AABB (0 if inside).
 */
function pointToAABBDistance(
  p: { x: number; y: number; z: number },
  box: AABB
): number {
  const dx = Math.max(box.min.x - p.x, 0, p.x - box.max.x);
  const dy = Math.max(box.min.y - p.y, 0, p.y - box.max.y);
  const dz = Math.max(box.min.z - p.z, 0, p.z - box.max.z);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Is a point strictly inside an AABB?
 */
function pointInsideAABB(
  p: { x: number; y: number; z: number },
  box: AABB
): boolean {
  return (
    p.x >= box.min.x && p.x <= box.max.x &&
    p.y >= box.min.y && p.y <= box.max.y &&
    p.z >= box.min.z && p.z <= box.max.z
  );
}

/**
 * AABB-based clearance check for a machine pose against obstacle list.
 * @param pose machine position (X, Y, Z_upper, Z_lower, optional U/V for taper)
 * @param obstacles AABB list (fixtures, parts, tank walls)
 * @param opts optional guide dims, safety margin, tank/table constraints
 * @returns ClearanceReport with pass verdict, minimum clearance, and events
 */
(WEDMHeadClearanceEngine.prototype as any).check = function (
  pose: MachinePose,
  obstacles: AABB[],
  opts: ClearanceOptions = {}
): ClearanceReport {
  const upperGuide = opts.upperGuide ?? DEFAULT_UPPER_GUIDE;
  const lowerGuide = opts.lowerGuide ?? DEFAULT_LOWER_GUIDE;
  const safetyMargin = opts.safetyMargin_mm ?? DEFAULT_SAFETY_MARGIN_MM;

  const events: ClearanceEvent[] = [];
  let minClearance = Infinity;

  const upperPos = { x: pose.X, y: pose.Y, z: pose.Z_upper };
  const lowerPos = {
    x: pose.X + (pose.U ?? 0),
    y: pose.Y + (pose.V ?? 0),
    z: pose.Z_lower,
  };

  // Guide-vs-obstacle checks
  for (const obs of obstacles) {
    if (obs.role === "tank_wall") continue;

    const upperDist = pointToAABBDistance(upperPos, obs) - upperGuide.radius_mm;
    const lowerDist = pointToAABBDistance(lowerPos, obs) - lowerGuide.radius_mm;

    const kind: ClearanceEvent["kind"] =
      obs.role === "part" ? "guide_vs_part" : "guide_vs_fixture";

    if (upperDist <= 0) {
      events.push({
        kind,
        severity: "critical",
        actor: "upper_guide",
        obstacleId: obs.id,
        distance_mm: upperDist,
        message: `Upper guide collides with ${obs.id}`,
      });
    } else if (upperDist < safetyMargin) {
      events.push({
        kind,
        severity: "warning",
        actor: "upper_guide",
        obstacleId: obs.id,
        distance_mm: upperDist,
        message: `Upper guide near ${obs.id} (${upperDist.toFixed(2)} mm)`,
      });
    }
    if (lowerDist <= 0) {
      events.push({
        kind,
        severity: "critical",
        actor: "lower_guide",
        obstacleId: obs.id,
        distance_mm: lowerDist,
        message: `Lower guide collides with ${obs.id}`,
      });
    } else if (lowerDist < safetyMargin) {
      events.push({
        kind,
        severity: "warning",
        actor: "lower_guide",
        obstacleId: obs.id,
        distance_mm: lowerDist,
        message: `Lower guide near ${obs.id} (${lowerDist.toFixed(2)} mm)`,
      });
    }

    // Wire-segment midpoint check (coarse)
    const wireMid = {
      x: (upperPos.x + lowerPos.x) / 2,
      y: (upperPos.y + lowerPos.y) / 2,
      z: (upperPos.z + lowerPos.z) / 2,
    };
    const wireDist = pointToAABBDistance(wireMid, obs);
    if (wireDist <= safetyMargin) {
      events.push({
        kind: "wire_vs_fixture",
        severity: wireDist <= 0 ? "critical" : "warning",
        actor: "wire",
        obstacleId: obs.id,
        distance_mm: wireDist,
        message: `Wire path near ${obs.id}`,
      });
    }

    minClearance = Math.min(minClearance, upperDist, lowerDist, wireDist);
  }

  // Tank envelope check
  if (opts.tankInner) {
    if (!pointInsideAABB(upperPos, opts.tankInner)) {
      events.push({
        kind: "head_outside_tank",
        severity: "critical",
        actor: "upper_guide",
        obstacleId: opts.tankInner.id,
        distance_mm: pointToAABBDistance(upperPos, opts.tankInner),
        message: "Upper guide outside tank envelope",
      });
    }
    if (!pointInsideAABB(lowerPos, opts.tankInner)) {
      events.push({
        kind: "head_outside_tank",
        severity: "critical",
        actor: "lower_guide",
        obstacleId: opts.tankInner.id,
        distance_mm: pointToAABBDistance(lowerPos, opts.tankInner),
        message: "Lower guide outside tank envelope",
      });
    }
  }

  // Table floor check
  if (opts.tableZ !== undefined) {
    if (lowerPos.z < opts.tableZ) {
      events.push({
        kind: "head_below_table",
        severity: "critical",
        actor: "lower_guide",
        distance_mm: lowerPos.z - opts.tableZ,
        message: `Lower guide below table Z=${opts.tableZ}`,
      });
    }
  }

  const pass = !events.some((e) => e.severity === "critical");

  return {
    pose,
    pass,
    minClearance_mm: minClearance === Infinity ? 0 : minClearance,
    events,
  };
};

export const wedmHeadClearanceEngine = new WEDMHeadClearanceEngine();
export default wedmHeadClearanceEngine;
