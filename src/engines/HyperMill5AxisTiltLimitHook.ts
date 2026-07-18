/**
 * HyperMill5AxisTiltLimitHook — Tilt angle safety gate for 5-axis machining
 *
 * Checks A-axis and B-axis tilt angles against machine kinematic limits.
 * Acts as a pre-gate before CollisionPreventionEngine analysis.
 *
 * Typical machine limits (DMG DMU 50, Matsuura MX-520):
 *   A-axis: -120° to +30° (tilting table)
 *   B-axis: -360° to +360° (rotary)
 *
 * HM-REV-MS4 / U-HMR23
 */

// ============================================================================
// Types
// ============================================================================

export interface TiltLimitParams {
  /** A-axis tilt angle [degrees] — typically tilting table axis */
  tilt_a_deg: number;
  /** B-axis tilt angle [degrees] — typically rotary axis */
  tilt_b_deg: number;
  /** Machine A-axis minimum limit [degrees] */
  machine_a_min: number;
  /** Machine A-axis maximum limit [degrees] */
  machine_a_max: number;
  /** Machine B-axis minimum limit [degrees] */
  machine_b_min: number;
  /** Machine B-axis maximum limit [degrees] */
  machine_b_max: number;
}

export interface TiltLimitResult {
  /** Whether the tilt combination is within machine limits */
  pass: boolean;
  /** Human-readable reason if blocked, undefined if passing */
  reason?: string;
  /** A-axis status */
  a_axis: {
    requested: number;
    min: number;
    max: number;
    pass: boolean;
    margin_deg: number;
  };
  /** B-axis status */
  b_axis: {
    requested: number;
    min: number;
    max: number;
    pass: boolean;
    margin_deg: number;
  };
}

export interface CollisionGateInput extends TiltLimitParams {
  /** Tool diameter [mm] — used for clearance check */
  toolDiameterMm?: number;
  /** Estimated minimum clearance to fixture/part [mm] */
  estimatedClearanceMm?: number;
}

export interface CollisionGateResult extends TiltLimitResult {
  /** Whether collision check also passes */
  collisionPass: boolean;
  /** Collision gate message */
  collisionMessage?: string;
}

// ============================================================================
// Hook function
// ============================================================================

/**
 * Check tilt angles against machine kinematic limits.
 *
 * @param params - Tilt angles and machine limits
 * @returns Pass/fail result with axis details
 *
 * @example
 * ```ts
 * const result = hypermill5AxisTiltLimitHook({
 *   tilt_a_deg: -45, tilt_b_deg: 180,
 *   machine_a_min: -120, machine_a_max: 30,
 *   machine_b_min: -360, machine_b_max: 360,
 * });
 * // result.pass === true
 * ```
 */
export function hypermill5AxisTiltLimitHook(params: TiltLimitParams): TiltLimitResult {
  const { tilt_a_deg, tilt_b_deg, machine_a_min, machine_a_max, machine_b_min, machine_b_max } =
    params;

  // A-axis check
  const aPass = tilt_a_deg >= machine_a_min && tilt_a_deg <= machine_a_max;
  const aMargin = aPass
    ? Math.min(tilt_a_deg - machine_a_min, machine_a_max - tilt_a_deg)
    : 0;

  // B-axis check
  const bPass = tilt_b_deg >= machine_b_min && tilt_b_deg <= machine_b_max;
  const bMargin = bPass
    ? Math.min(tilt_b_deg - machine_b_min, machine_b_max - tilt_b_deg)
    : 0;

  const pass = aPass && bPass;

  const reasons: string[] = [];
  if (!aPass) {
    reasons.push(
      `A-axis ${tilt_a_deg}° outside machine limits [${machine_a_min}°, ${machine_a_max}°]`,
    );
  }
  if (!bPass) {
    reasons.push(
      `B-axis ${tilt_b_deg}° outside machine limits [${machine_b_min}°, ${machine_b_max}°]`,
    );
  }

  return {
    pass,
    reason: pass ? undefined : reasons.join("; "),
    a_axis: {
      requested: tilt_a_deg,
      min: machine_a_min,
      max: machine_a_max,
      pass: aPass,
      margin_deg: aMargin,
    },
    b_axis: {
      requested: tilt_b_deg,
      min: machine_b_min,
      max: machine_b_max,
      pass: bPass,
      margin_deg: bMargin,
    },
  };
}

// ============================================================================
// Collision pre-gate
// ============================================================================

/**
 * Collision pre-gate: check tilt limits AND estimated clearance.
 * Wraps hypermill5AxisTiltLimitHook with a clearance pre-check.
 *
 * Minimum clearance rule: clearance must be > 0.5×toolDiameter.
 * Source: hyperMILL v33 Safety section 7.2 "Minimum Clearance"
 *
 * @param input - Tilt params plus tool/clearance data
 * @returns Combined tilt + collision gate result
 */
export function hypermill5AxisCollisionGate(input: CollisionGateInput): CollisionGateResult {
  const tiltResult = hypermill5AxisTiltLimitHook(input);

  const { toolDiameterMm = 10, estimatedClearanceMm } = input;
  const minClearance = toolDiameterMm * 0.5;
  let collisionPass = true;
  let collisionMessage: string | undefined;

  if (estimatedClearanceMm !== undefined) {
    collisionPass = estimatedClearanceMm >= minClearance;
    if (!collisionPass) {
      collisionMessage = `Clearance ${estimatedClearanceMm.toFixed(2)}mm < minimum ${minClearance.toFixed(2)}mm (0.5×D=${toolDiameterMm}mm) — COLLISION RISK`;
    }
  }

  const overallPass = tiltResult.pass && collisionPass;

  return {
    ...tiltResult,
    pass: overallPass,
    reason: [tiltResult.reason, collisionMessage].filter(Boolean).join("; ") || undefined,
    collisionPass,
    collisionMessage,
  };
}

// ============================================================================
// Common machine presets
// ============================================================================

/**
 * Common 5-axis machine kinematic limit presets.
 * Source: Machine documentation for common PRISM-supported controllers.
 */
export const MACHINE_TILT_PRESETS: Record<
  string,
  Pick<TiltLimitParams, "machine_a_min" | "machine_a_max" | "machine_b_min" | "machine_b_max">
> = {
  // DMG DMU 50 — typical trunnion table machine
  "DMG_DMU50": {
    machine_a_min: -120,
    machine_a_max: 30,
    machine_b_min: -360,
    machine_b_max: 360,
  },
  // Matsuura MX-520 — high-speed 5-axis
  "Matsuura_MX520": {
    machine_a_min: -110,
    machine_a_max: 30,
    machine_b_min: -360,
    machine_b_max: 360,
  },
  // Hermle C400 — gantry 5-axis
  "Hermle_C400": {
    machine_a_min: -115,
    machine_a_max: 25,
    machine_b_min: -360,
    machine_b_max: 360,
  },
  // Generic 5-axis (conservative limits)
  "generic_5axis": {
    machine_a_min: -90,
    machine_a_max: 30,
    machine_b_min: -360,
    machine_b_max: 360,
  },
};
