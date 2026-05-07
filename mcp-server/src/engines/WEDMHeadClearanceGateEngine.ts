/**
 * WEDMHeadClearanceGateEngine — S(x) Gate Adapter for Head Clearance
 *
 * Wraps WEDMHeadClearanceEngine for integration with WEDMProgramSafetyGateEngine.
 * Enforces minimum clearance requirements:
 *   - Upper head clearance >= 3mm
 *   - Lower head clearance >= 2mm
 *
 * Returns gate-compatible result for S(x) component scoring.
 *
 * @module WEDMHeadClearanceGateEngine
 * MS-P2.5-SAFETY/U-P2.5-SAFE-03
 */

import {
  wedmHeadClearanceEngine,
  type MachinePose,
  type AABB,
  type ClearanceOptions,
  type ClearanceReport,
  type ClearanceEvent,
} from "./WEDMHeadClearanceEngine.js";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface HeadClearanceGateInput {
  /** Array of poses to check (typically from toolpath) */
  poses: MachinePose[];
  /** Obstacles to check against */
  obstacles: AABB[];
  /** Optional clearance options */
  options?: ClearanceOptions;
  /** Minimum upper head clearance (default: 3mm) */
  min_upper_clearance_mm?: number;
  /** Minimum lower head clearance (default: 2mm) */
  min_lower_clearance_mm?: number;
}

export interface HeadClearanceGateResult {
  success: boolean;
  pass: boolean;
  upper_clearance_mm: number;
  lower_clearance_mm: number;
  min_required_mm: number;
  collision_count: number;
  critical_events: ClearanceEvent[];
  warning_events: ClearanceEvent[];
  first_collision_index: number | null;
  hard_block: boolean;
  summary: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_MIN_UPPER_CLEARANCE_MM = 3.0;
const DEFAULT_MIN_LOWER_CLEARANCE_MM = 2.0;

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export class WEDMHeadClearanceGateEngine {
  /**
   * Evaluate head clearance for S(x) integration
   */
  evaluate(input: HeadClearanceGateInput): HeadClearanceGateResult {
    const minUpperClearance = input.min_upper_clearance_mm ?? DEFAULT_MIN_UPPER_CLEARANCE_MM;
    const minLowerClearance = input.min_lower_clearance_mm ?? DEFAULT_MIN_LOWER_CLEARANCE_MM;
    const minRequired = Math.min(minUpperClearance, minLowerClearance);

    // Handle empty poses
    if (input.poses.length === 0) {
      return {
        success: true,
        pass: true,
        upper_clearance_mm: Infinity,
        lower_clearance_mm: Infinity,
        min_required_mm: minRequired,
        collision_count: 0,
        critical_events: [],
        warning_events: [],
        first_collision_index: null,
        hard_block: false,
        summary: "PASS: No poses to check",
      };
    }

    // Run clearance checks on all poses
    const reports = wedmHeadClearanceEngine.checkPath(input.poses, input.obstacles, input.options);

    // Aggregate results
    let upperClearance = Infinity;
    let lowerClearance = Infinity;
    const criticalEvents: ClearanceEvent[] = [];
    const warningEvents: ClearanceEvent[] = [];
    let firstCollisionIndex: number | null = null;

    for (let i = 0; i < reports.length; i++) {
      const report = reports[i];

      for (const event of report.events) {
        if (event.severity === "critical") {
          criticalEvents.push(event);
          if (firstCollisionIndex === null) {
            firstCollisionIndex = i;
          }
        } else {
          warningEvents.push(event);
        }

        // Track clearances by actor
        if (event.actor === "upper_guide" || event.actor === "upper_head") {
          upperClearance = Math.min(upperClearance, event.clearance_mm);
        } else if (event.actor === "lower_guide") {
          lowerClearance = Math.min(lowerClearance, event.clearance_mm);
        }
      }

      // If no events but we have minimum clearance, use it
      if (report.minClearance_mm !== Infinity && report.minClearance_mm !== Number.POSITIVE_INFINITY) {
        upperClearance = Math.min(upperClearance, report.minClearance_mm);
        lowerClearance = Math.min(lowerClearance, report.minClearance_mm);
      }
    }

    // Default to max clearance if no collisions detected
    if (upperClearance === Infinity) upperClearance = 100;
    if (lowerClearance === Infinity) lowerClearance = 100;

    // Check against thresholds
    const upperPasses = upperClearance >= minUpperClearance;
    const lowerPasses = lowerClearance >= minLowerClearance;
    const noCritical = criticalEvents.length === 0;
    const pass = upperPasses && lowerPasses && noCritical;
    const hardBlock = !pass;

    return {
      success: true,
      pass,
      upper_clearance_mm: upperClearance,
      lower_clearance_mm: lowerClearance,
      min_required_mm: minRequired,
      collision_count: criticalEvents.length,
      critical_events: criticalEvents,
      warning_events: warningEvents,
      first_collision_index: firstCollisionIndex,
      hard_block: hardBlock,
      summary: this.buildSummary(pass, upperClearance, lowerClearance, minUpperClearance, minLowerClearance, criticalEvents),
    };
  }

  /**
   * Quick check for S(x) component - returns format expected by SafetyGateInput
   */
  quickCheckForSx(
    poses: MachinePose[],
    obstacles: AABB[],
    options?: ClearanceOptions
  ): {
    pass: boolean;
    upper_clearance_mm: number;
    lower_clearance_mm: number;
    min_required_mm: number;
  } {
    const result = this.evaluate({ poses, obstacles, options });
    return {
      pass: result.pass,
      upper_clearance_mm: result.upper_clearance_mm,
      lower_clearance_mm: result.lower_clearance_mm,
      min_required_mm: result.min_required_mm,
    };
  }

  /**
   * Check single pose (convenience wrapper)
   */
  checkSinglePose(
    pose: MachinePose,
    obstacles: AABB[],
    options?: ClearanceOptions
  ): HeadClearanceGateResult {
    return this.evaluate({ poses: [pose], obstacles, options });
  }

  /**
   * Create sample obstacles for testing
   */
  createSampleObstacles(): AABB[] {
    return [
      {
        id: "clamp_left",
        role: "clamp",
        min: { x: -100, y: -20, z: 0 },
        max: { x: -80, y: 20, z: 50 },
      },
      {
        id: "clamp_right",
        role: "clamp",
        min: { x: 80, y: -20, z: 0 },
        max: { x: 100, y: 20, z: 50 },
      },
      {
        id: "fixture_base",
        role: "fixture",
        min: { x: -150, y: -150, z: -10 },
        max: { x: 150, y: 150, z: 0 },
      },
    ];
  }

  /**
   * Create safe poses for testing (no collisions expected)
   */
  createSafePoses(): MachinePose[] {
    return [
      { X: 0, Y: 0, Z_upper: 60, Z_lower: 10 },
      { X: 10, Y: 10, Z_upper: 60, Z_lower: 10 },
      { X: 20, Y: 20, Z_upper: 60, Z_lower: 10 },
      { X: 30, Y: 30, Z_upper: 60, Z_lower: 10 },
    ];
  }

  /**
   * Create collision poses for testing (collisions expected)
   */
  createCollisionPoses(): MachinePose[] {
    return [
      { X: -90, Y: 0, Z_upper: 30, Z_lower: 10 }, // Near left clamp
      { X: 90, Y: 0, Z_upper: 30, Z_lower: 10 },  // Near right clamp
    ];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private buildSummary(
    pass: boolean,
    upperClearance: number,
    lowerClearance: number,
    minUpper: number,
    minLower: number,
    criticalEvents: ClearanceEvent[]
  ): string {
    if (pass) {
      return `PASS: Head clearance OK. Upper: ${upperClearance.toFixed(2)}mm >= ${minUpper}mm, Lower: ${lowerClearance.toFixed(2)}mm >= ${minLower}mm`;
    }

    const issues: string[] = [];
    if (upperClearance < minUpper) {
      issues.push(`upper ${upperClearance.toFixed(2)}mm < ${minUpper}mm`);
    }
    if (lowerClearance < minLower) {
      issues.push(`lower ${lowerClearance.toFixed(2)}mm < ${minLower}mm`);
    }
    if (criticalEvents.length > 0) {
      issues.push(`${criticalEvents.length} collision(s)`);
    }

    return `HARD BLOCK: Insufficient head clearance. ${issues.join(", ")}`;
  }
}

export const wedmHeadClearanceGateEngine = new WEDMHeadClearanceGateEngine();
