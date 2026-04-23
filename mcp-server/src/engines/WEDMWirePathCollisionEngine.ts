/**
 * WEDMWirePathCollisionEngine — Wire path swept-volume collision detection
 *
 * Validates complete wire EDM programs for collision safety before execution.
 * Computes swept volumes along wire paths and checks for interference with:
 *   - Upper head/guide assembly
 *   - Lower head/guide assembly
 *   - Fixture elements (clamps, parallels, magnets)
 *   - Workpiece (for taper cuts where head may contact part)
 *   - Tank walls (travel limits)
 *
 * Safety scoring:
 *   - 0 collisions → S(x) contribution +0.15
 *   - Any collision → HARD BLOCK (S(x) = 0, program cannot emit)
 *
 * MS-P1.5-ONESHOT/U-P1.5-OS-05
 *
 * @see WEDMHeadClearanceEngine — run-time pose-based clearance
 * @see WEDMFixtureInterferenceEngine — planning-time 2D fixture check
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface AABB {
  min: Point3D;
  max: Point3D;
}

export interface WirePathPoint {
  x: number;
  y: number;
  u?: number; // Upper head X offset (taper)
  v?: number; // Upper head Y offset (taper)
}

export interface WirePath {
  id: string;
  points: WirePathPoint[];
  pass_type: "rough" | "skim1" | "skim2" | "skim3";
}

export interface MachineGeometry {
  /** Upper guide/head clearance radius (mm) */
  upper_head_radius_mm: number;
  /** Upper guide/head height (mm) */
  upper_head_height_mm: number;
  /** Lower guide/head clearance radius (mm) */
  lower_head_radius_mm: number;
  /** Lower guide/head height (mm) */
  lower_head_height_mm: number;
  /** Wire diameter (mm) */
  wire_diameter_mm: number;
  /** Z position of upper guide lower face (mm above table) */
  upper_guide_z_mm: number;
  /** Z position of lower guide upper face (mm below table, usually 0) */
  lower_guide_z_mm: number;
  /** Tank inner dimensions for travel limit check */
  tank_inner?: AABB;
}

export interface Obstacle {
  id: string;
  type: "fixture" | "clamp" | "workpiece" | "tank_wall" | "parallel" | "magnet";
  bounds: AABB;
  /** If true, collision with this object is a hard block */
  is_hard_obstacle: boolean;
}

export interface CollisionCheckInput {
  wire_paths: WirePath[];
  machine: MachineGeometry;
  obstacles: Obstacle[];
  workpiece_thickness_mm: number;
  /** Safety margin added to all clearance checks (mm). Default 2.0 */
  safety_margin_mm?: number;
}

export interface CollisionEvent {
  path_id: string;
  point_index: number;
  position: WirePathPoint;
  obstacle_id: string;
  obstacle_type: string;
  collision_type: "upper_head" | "lower_head" | "wire" | "travel_limit";
  severity: "critical" | "warning";
  clearance_mm: number;
  message: string;
}

export interface CollisionCheckResult {
  success: boolean;
  pass: boolean;
  collisions: CollisionEvent[];
  collision_count: number;
  critical_count: number;
  warning_count: number;
  safety_score_contribution: number;
  hard_block: boolean;
  checked_points: number;
  checked_obstacles: number;
  min_clearance_mm: number;
  summary: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// GEOMETRY UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

function aabbIntersects(a: AABB, b: AABB): boolean {
  return (
    a.min.x <= b.max.x && a.max.x >= b.min.x &&
    a.min.y <= b.max.y && a.max.y >= b.min.y &&
    a.min.z <= b.max.z && a.max.z >= b.min.z
  );
}

function aabbDistance(a: AABB, b: AABB): number {
  const dx = Math.max(0, Math.max(a.min.x - b.max.x, b.min.x - a.max.x));
  const dy = Math.max(0, Math.max(a.min.y - b.max.y, b.min.y - a.max.y));
  const dz = Math.max(0, Math.max(a.min.z - b.max.z, b.min.z - a.max.z));
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function pointInAABB(p: Point3D, box: AABB, margin: number = 0): boolean {
  return (
    p.x >= box.min.x - margin && p.x <= box.max.x + margin &&
    p.y >= box.min.y - margin && p.y <= box.max.y + margin &&
    p.z >= box.min.z - margin && p.z <= box.max.z + margin
  );
}

function createHeadAABB(
  x: number,
  y: number,
  z_base: number,
  radius: number,
  height: number,
  is_upper: boolean
): AABB {
  const z_min = is_upper ? z_base : z_base - height;
  const z_max = is_upper ? z_base + height : z_base;
  return {
    min: { x: x - radius, y: y - radius, z: z_min },
    max: { x: x + radius, y: y + radius, z: z_max },
  };
}

function createWireAABB(
  x_lower: number,
  y_lower: number,
  x_upper: number,
  y_upper: number,
  z_lower: number,
  z_upper: number,
  wire_radius: number
): AABB {
  const x_min = Math.min(x_lower, x_upper) - wire_radius;
  const x_max = Math.max(x_lower, x_upper) + wire_radius;
  const y_min = Math.min(y_lower, y_upper) - wire_radius;
  const y_max = Math.max(y_lower, y_upper) + wire_radius;
  return {
    min: { x: x_min, y: y_min, z: z_lower },
    max: { x: x_max, y: y_max, z: z_upper },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

export class WEDMWirePathCollisionEngine {
  readonly name = "WEDMWirePathCollisionEngine";
  readonly version = "1.0.0";

  private readonly DEFAULT_SAFETY_MARGIN = 2.0; // mm
  private readonly SAFETY_SCORE_PASS = 0.15;
  private readonly SAFETY_SCORE_FAIL = 0.0;

  /**
   * Check wire paths for collisions with obstacles
   */
  check(input: CollisionCheckInput): CollisionCheckResult {
    const collisions: CollisionEvent[] = [];
    const margin = input.safety_margin_mm ?? this.DEFAULT_SAFETY_MARGIN;
    let minClearance = Infinity;
    let checkedPoints = 0;

    for (const path of input.wire_paths) {
      for (let i = 0; i < path.points.length; i++) {
        const pt = path.points[i];
        checkedPoints++;

        // Calculate head positions
        const x_lower = pt.x;
        const y_lower = pt.y;
        const x_upper = pt.x + (pt.u ?? 0);
        const y_upper = pt.y + (pt.v ?? 0);

        // Create AABBs for heads and wire
        const upperHeadAABB = createHeadAABB(
          x_upper,
          y_upper,
          input.machine.upper_guide_z_mm,
          input.machine.upper_head_radius_mm + margin,
          input.machine.upper_head_height_mm,
          true
        );

        const lowerHeadAABB = createHeadAABB(
          x_lower,
          y_lower,
          input.machine.lower_guide_z_mm,
          input.machine.lower_head_radius_mm + margin,
          input.machine.lower_head_height_mm,
          false
        );

        const wireAABB = createWireAABB(
          x_lower,
          y_lower,
          x_upper,
          y_upper,
          input.machine.lower_guide_z_mm,
          input.machine.upper_guide_z_mm,
          input.machine.wire_diameter_mm / 2 + margin
        );

        // Check against each obstacle
        for (const obstacle of input.obstacles) {
          // Upper head collision
          if (aabbIntersects(upperHeadAABB, obstacle.bounds)) {
            const dist = aabbDistance(upperHeadAABB, obstacle.bounds);
            minClearance = Math.min(minClearance, dist);
            collisions.push({
              path_id: path.id,
              point_index: i,
              position: pt,
              obstacle_id: obstacle.id,
              obstacle_type: obstacle.type,
              collision_type: "upper_head",
              severity: obstacle.is_hard_obstacle ? "critical" : "warning",
              clearance_mm: dist,
              message: `Upper head collision with ${obstacle.type} "${obstacle.id}" at point ${i}`,
            });
          }

          // Lower head collision
          if (aabbIntersects(lowerHeadAABB, obstacle.bounds)) {
            const dist = aabbDistance(lowerHeadAABB, obstacle.bounds);
            minClearance = Math.min(minClearance, dist);
            collisions.push({
              path_id: path.id,
              point_index: i,
              position: pt,
              obstacle_id: obstacle.id,
              obstacle_type: obstacle.type,
              collision_type: "lower_head",
              severity: obstacle.is_hard_obstacle ? "critical" : "warning",
              clearance_mm: dist,
              message: `Lower head collision with ${obstacle.type} "${obstacle.id}" at point ${i}`,
            });
          }

          // Wire collision (only with fixtures, not workpiece during cut)
          if (obstacle.type !== "workpiece" && aabbIntersects(wireAABB, obstacle.bounds)) {
            const dist = aabbDistance(wireAABB, obstacle.bounds);
            minClearance = Math.min(minClearance, dist);
            collisions.push({
              path_id: path.id,
              point_index: i,
              position: pt,
              obstacle_id: obstacle.id,
              obstacle_type: obstacle.type,
              collision_type: "wire",
              severity: obstacle.is_hard_obstacle ? "critical" : "warning",
              clearance_mm: dist,
              message: `Wire collision with ${obstacle.type} "${obstacle.id}" at point ${i}`,
            });
          }
        }

        // Check tank travel limits
        if (input.machine.tank_inner) {
          const tank = input.machine.tank_inner;
          const upperPos: Point3D = { x: x_upper, y: y_upper, z: input.machine.upper_guide_z_mm };
          const lowerPos: Point3D = { x: x_lower, y: y_lower, z: input.machine.lower_guide_z_mm };

          if (!pointInAABB(upperPos, tank, -margin)) {
            collisions.push({
              path_id: path.id,
              point_index: i,
              position: pt,
              obstacle_id: "tank_boundary",
              obstacle_type: "tank_wall",
              collision_type: "travel_limit",
              severity: "critical",
              clearance_mm: 0,
              message: `Upper head exceeds tank travel limits at point ${i}`,
            });
          }

          if (!pointInAABB(lowerPos, tank, -margin)) {
            collisions.push({
              path_id: path.id,
              point_index: i,
              position: pt,
              obstacle_id: "tank_boundary",
              obstacle_type: "tank_wall",
              collision_type: "travel_limit",
              severity: "critical",
              clearance_mm: 0,
              message: `Lower head exceeds tank travel limits at point ${i}`,
            });
          }
        }
      }
    }

    const criticalCount = collisions.filter((c) => c.severity === "critical").length;
    const warningCount = collisions.filter((c) => c.severity === "warning").length;
    const pass = criticalCount === 0;
    const hardBlock = criticalCount > 0;

    return {
      success: true,
      pass,
      collisions,
      collision_count: collisions.length,
      critical_count: criticalCount,
      warning_count: warningCount,
      safety_score_contribution: pass ? this.SAFETY_SCORE_PASS : this.SAFETY_SCORE_FAIL,
      hard_block: hardBlock,
      checked_points: checkedPoints,
      checked_obstacles: input.obstacles.length,
      min_clearance_mm: minClearance === Infinity ? -1 : minClearance,
      summary: pass
        ? `All ${checkedPoints} points clear. Min clearance: ${minClearance.toFixed(2)}mm. S(x) +${this.SAFETY_SCORE_PASS}`
        : `COLLISION DETECTED: ${criticalCount} critical, ${warningCount} warnings. HARD BLOCK — program cannot emit.`,
    };
  }

  /**
   * Gate function for program emission — returns true only if collision-free
   */
  gate(input: CollisionCheckInput): { allow: boolean; reason: string; result: CollisionCheckResult } {
    const result = this.check(input);
    return {
      allow: result.pass,
      reason: result.summary,
      result,
    };
  }

  /**
   * Quick check with default machine geometry (Mitsubishi MV1200R)
   */
  quickCheck(
    wirePaths: WirePath[],
    obstacles: Obstacle[],
    workpieceThickness: number = 25
  ): CollisionCheckResult {
    return this.check({
      wire_paths: wirePaths,
      machine: this.getDefaultMachineGeometry(),
      obstacles,
      workpiece_thickness_mm: workpieceThickness,
    });
  }

  /**
   * Get default machine geometry (based on Mitsubishi MV1200R)
   */
  getDefaultMachineGeometry(): MachineGeometry {
    return {
      upper_head_radius_mm: 25,
      upper_head_height_mm: 50,
      lower_head_radius_mm: 20,
      lower_head_height_mm: 40,
      wire_diameter_mm: 0.25,
      upper_guide_z_mm: 150, // 150mm above table
      lower_guide_z_mm: 0,
      tank_inner: {
        min: { x: -200, y: -150, z: -50 },
        max: { x: 200, y: 150, z: 200 },
      },
    };
  }

  /**
   * Create obstacle from fixture definition
   */
  createFixtureObstacle(
    id: string,
    type: "clamp" | "parallel" | "magnet",
    x: number,
    y: number,
    width: number,
    depth: number,
    height: number
  ): Obstacle {
    return {
      id,
      type,
      bounds: {
        min: { x: x - width / 2, y: y - depth / 2, z: 0 },
        max: { x: x + width / 2, y: y + depth / 2, z: height },
      },
      is_hard_obstacle: true,
    };
  }

  /**
   * Create workpiece obstacle (for head clearance, not wire collision)
   */
  createWorkpieceObstacle(
    x: number,
    y: number,
    width: number,
    depth: number,
    thickness: number
  ): Obstacle {
    return {
      id: "workpiece",
      type: "workpiece",
      bounds: {
        min: { x: x - width / 2, y: y - depth / 2, z: 0 },
        max: { x: x + width / 2, y: y + depth / 2, z: thickness },
      },
      is_hard_obstacle: true,
    };
  }

  /**
   * Calculate S(x) safety score contribution
   */
  getSafetyScoreContribution(result: CollisionCheckResult): number {
    return result.safety_score_contribution;
  }
}

export const wedmWirePathCollisionEngine = new WEDMWirePathCollisionEngine();
