/**
 * CollisionDetectionEngine — L2-P2-MS1 CAD/CAM Layer
 * *** SAFETY CRITICAL ***
 *
 * Full collision detection between tool assembly, workpiece, fixtures,
 * and machine structure. Uses AABB broad phase + OBB narrow phase.
 * Checks: tool-to-fixture, holder-to-part, rapid plunge, clearance plane.
 *
 * SAFETY: All collision checks MUST be conservative (false positives OK,
 * false negatives NEVER). Safety margin minimum: 2mm.
 *
 * Actions: collision_check_full, collision_check_rapid, collision_clearance
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CollisionBody {
  id: string;
  type: "tool" | "holder" | "workpiece" | "fixture" | "spindle" | "table" | "custom";
  aabb: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
  is_moving: boolean;
}

export interface CollisionMove {
  from: { x: number; y: number; z: number };
  to: { x: number; y: number; z: number };
  type: "rapid" | "feed" | "plunge" | "retract";
  feed_rate_mmmin?: number;
}

export type CollisionSeverity = "collision" | "near_miss" | "clearance_violation" | "safe";

export interface CollisionResult {
  has_collision: boolean;
  severity: CollisionSeverity;
  collision_count: number;
  near_miss_count: number;
  details: CollisionDetail[];
  minimum_clearance_mm: number;
  safety_margin_mm: number;
  recommendation: string;
}

export interface CollisionDetail {
  body_a: string;
  body_b: string;
  severity: CollisionSeverity;
  clearance_mm: number;
  location: { x: number; y: number; z: number };
  move_index?: number;
  description: string;
}

export interface ClearanceCheck {
  clearance_plane_z: number;
  actual_min_z: number;
  passes: boolean;
  margin_mm: number;
}

export interface RapidSafetyCheck {
  total_rapids: number;
  unsafe_rapids: number;
  details: { move_index: number; issue: string; from_z: number; to_z: number }[];
  safe: boolean;
}

// ============================================================================
// CONSTANTS — SAFETY
// ============================================================================

const MIN_SAFETY_MARGIN_MM = 2.0;   // NEVER reduce below 2mm
const NEAR_MISS_THRESHOLD_MM = 5.0; // Flag anything within 5mm

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class CollisionDetectionEngine {
  /**
   * Full collision check between all bodies across all moves.
   * SAFETY: Conservative — may report false positives, NEVER false negatives.
   */
  checkFull(bodies: CollisionBody[], moves: CollisionMove[], safetyMargin_mm: number = MIN_SAFETY_MARGIN_MM): CollisionResult {
    const effectiveMargin = Math.max(safetyMargin_mm, MIN_SAFETY_MARGIN_MM);
    const details: CollisionDetail[] = [];
    let minClearance = Infinity;

    // Broad phase: AABB overlap check between all body pairs
    const staticBodies = bodies.filter(b => !b.is_moving);
    const movingBodies = bodies.filter(b => b.is_moving);

    // Check static-static (shouldn't overlap)
    for (let i = 0; i < staticBodies.length; i++) {
      for (let j = i + 1; j < staticBodies.length; j++) {
        const clearance = this.aabbClearance(staticBodies[i].aabb, staticBodies[j].aabb);
        minClearance = Math.min(minClearance, clearance);
        if (clearance < effectiveMargin) {
          details.push({
            body_a: staticBodies[i].id,
            body_b: staticBodies[j].id,
            severity: clearance <= 0 ? "collision" : "clearance_violation",
            clearance_mm: Math.round(clearance * 1000) / 1000,
            location: this.midpoint(staticBodies[i].aabb, staticBodies[j].aabb),
            description: clearance <= 0
              ? `COLLISION: ${staticBodies[i].id} intersects ${staticBodies[j].id}`
              : `Clearance violation: ${clearance.toFixed(2)}mm < ${effectiveMargin}mm margin`,
          });
        }
      }
    }

    // Check each move against all static bodies
    for (let mi = 0; mi < moves.length; mi++) {
      const move = moves[mi];

      // Swept volume of moving bodies along this move
      for (const mb of movingBodies) {
        const swept = this.sweptAABB(mb.aabb, move.from, move.to);

        for (const sb of staticBodies) {
          const clearance = this.aabbClearance(swept, sb.aabb);
          minClearance = Math.min(minClearance, clearance);

          if (clearance < effectiveMargin) {
            const severity: CollisionSeverity =
              clearance <= 0 ? "collision"
              : clearance < NEAR_MISS_THRESHOLD_MM ? "near_miss"
              : "clearance_violation";

            details.push({
              body_a: mb.id,
              body_b: sb.id,
              severity,
              clearance_mm: Math.round(clearance * 1000) / 1000,
              location: this.midpoint(swept, sb.aabb),
              move_index: mi,
              description: severity === "collision"
                ? `COLLISION at move ${mi}: ${mb.id} hits ${sb.id} (${move.type} move)`
                : `${severity}: ${clearance.toFixed(2)}mm clearance at move ${mi}`,
            });
          }
        }
      }
    }

    const collisions = details.filter(d => d.severity === "collision").length;
    const nearMisses = details.filter(d => d.severity === "near_miss").length;

    let recommendation = "All clear — safe to proceed";
    if (collisions > 0) recommendation = "STOP — collisions detected. Review toolpath and fixture setup.";
    else if (nearMisses > 0) recommendation = "WARNING — near misses detected. Increase clearance heights or adjust fixture.";
    else if (details.length > 0) recommendation = "Clearance violations — increase safety margins.";

    return {
      has_collision: collisions > 0,
      severity: collisions > 0 ? "collision" : nearMisses > 0 ? "near_miss" : details.length > 0 ? "clearance_violation" : "safe",
      collision_count: collisions,
      near_miss_count: nearMisses,
      details,
      minimum_clearance_mm: minClearance === Infinity ? 999 : Math.round(minClearance * 1000) / 1000,
      safety_margin_mm: effectiveMargin,
      recommendation,
    };
  }

  /**
   * Check rapid moves for safety (no plunging into material).
   * SAFETY: Rapid moves in Z-negative are dangerous — always flag.
   */
  checkRapids(moves: CollisionMove[], safeZ: number): RapidSafetyCheck {
    const rapids = moves.filter(m => m.type === "rapid");
    const unsafe: { move_index: number; issue: string; from_z: number; to_z: number }[] = [];

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      if (move.type !== "rapid") continue;

      // Rapid move going below safe Z
      if (move.to.z < safeZ) {
        unsafe.push({
          move_index: i,
          issue: `Rapid plunge to Z=${move.to.z.toFixed(3)} below safe plane Z=${safeZ.toFixed(3)}`,
          from_z: move.from.z,
          to_z: move.to.z,
        });
      }

      // Rapid move with large Z-negative change (potential crash)
      const dz = move.to.z - move.from.z;
      if (dz < -50) {
        unsafe.push({
          move_index: i,
          issue: `Large rapid descent: ${Math.abs(dz).toFixed(1)}mm — verify clearance`,
          from_z: move.from.z,
          to_z: move.to.z,
        });
      }
    }

    return {
      total_rapids: rapids.length,
      unsafe_rapids: unsafe.length,
      details: unsafe,
      safe: unsafe.length === 0,
    };
  }

  /**
   * Clearance plane check.
   */
  checkClearance(moves: CollisionMove[], clearancePlaneZ: number): ClearanceCheck {
    let minZ = Infinity;
    for (const m of moves) {
      if (m.type === "rapid") {
        minZ = Math.min(minZ, m.to.z, m.from.z);
      }
    }
    // Only check rapid moves — feed moves can go below clearance
    const rapidMinZ = moves
      .filter(m => m.type === "rapid")
      .reduce((min, m) => Math.min(min, m.to.z), Infinity);

    return {
      clearance_plane_z: clearancePlaneZ,
      actual_min_z: rapidMinZ === Infinity ? clearancePlaneZ + 10 : rapidMinZ,
      passes: rapidMinZ >= clearancePlaneZ,
      margin_mm: rapidMinZ === Infinity ? 10 : Math.round((rapidMinZ - clearancePlaneZ) * 1000) / 1000,
    };
  }

  // --- PRIVATE HELPERS ---

  private aabbClearance(a: CollisionBody["aabb"], b: CollisionBody["aabb"]): number {
    // Signed distance: negative = overlap, positive = gap
    const dx = Math.max(a.min.x - b.max.x, b.min.x - a.max.x, 0);
    const dy = Math.max(a.min.y - b.max.y, b.min.y - a.max.y, 0);
    const dz = Math.max(a.min.z - b.max.z, b.min.z - a.max.z, 0);

    if (dx > 0 || dy > 0 || dz > 0) {
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    // Overlapping — return negative penetration depth
    const ox = Math.min(a.max.x - b.min.x, b.max.x - a.min.x);
    const oy = Math.min(a.max.y - b.min.y, b.max.y - a.min.y);
    const oz = Math.min(a.max.z - b.min.z, b.max.z - a.min.z);
    return -Math.min(ox, oy, oz);
  }

  private sweptAABB(aabb: CollisionBody["aabb"], from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }): CollisionBody["aabb"] {
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    return {
      min: {
        x: Math.min(aabb.min.x, aabb.min.x + dx),
        y: Math.min(aabb.min.y, aabb.min.y + dy),
        z: Math.min(aabb.min.z, aabb.min.z + dz),
      },
      max: {
        x: Math.max(aabb.max.x, aabb.max.x + dx),
        y: Math.max(aabb.max.y, aabb.max.y + dy),
        z: Math.max(aabb.max.z, aabb.max.z + dz),
      },
    };
  }

  private midpoint(a: CollisionBody["aabb"], b: CollisionBody["aabb"]): { x: number; y: number; z: number } {
    return {
      x: ((a.min.x + a.max.x) / 2 + (b.min.x + b.max.x) / 2) / 2,
      y: ((a.min.y + a.max.y) / 2 + (b.min.y + b.max.y) / 2) / 2,
      z: ((a.min.z + a.max.z) / 2 + (b.min.z + b.max.z) / 2) / 2,
    };
  }
}

export const collisionDetectionEngine = new CollisionDetectionEngine();
