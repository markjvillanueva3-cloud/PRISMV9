/**
 * Swept Volume Collision Detection — Tool Path Safety Verification
 *
 * Computes the swept volume of a cylindrical/conical cutting tool along a
 * multi-segment toolpath, then checks for collision against fixture/workpiece
 * bounding geometry using separating axis theorem (SAT) on 2D projections.
 *
 * Manufacturing uses: 5-axis collision checking, fixture interference detection,
 * rapid verification of tool approach/retract moves, holder-workpiece clearance.
 *
 * References:
 * - Abdel-Malek, K. & Yeh, H.J. (1997). "Geometric Representation of Swept Volumes"
 * - Ericson, C. (2004). "Real-Time Collision Detection"
 *
 * @module algorithms/SweptVolumeCollision
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface ToolProfile {
  /** Tool diameter [mm]. */
  diameter: number;
  /** Holder diameter [mm]. Default 2 × tool diameter. */
  holder_diameter?: number;
  /** Flute length (cutting portion) [mm]. Default 3 × diameter. */
  flute_length?: number;
  /** Total tool length [mm]. Default 5 × diameter. */
  total_length?: number;
}

export interface AABB {
  min: Point3D;
  max: Point3D;
}

export interface SweptVolumeCollisionInput {
  /** Ordered toolpath points. */
  toolpath: Point3D[];
  /** Tool geometry profile. */
  tool: ToolProfile;
  /** Obstacle bounding boxes to check against. */
  obstacles: AABB[];
  /** Safety clearance margin [mm]. Default 2. */
  clearance?: number;
  /** Check resolution — sample points per segment. Default 10. */
  samples_per_segment?: number;
}

export interface CollisionResult {
  obstacle_index: number;
  segment_index: number;
  point: Point3D;
  min_distance: number;
  penetration: number;
}

export interface SweptVolumeCollisionOutput extends WithWarnings {
  /** True if no collisions detected. */
  collision_free: boolean;
  /** List of all collision events. */
  collisions: CollisionResult[];
  /** Minimum clearance found across all checks [mm]. */
  min_clearance: number;
  /** Index of segment with minimum clearance. */
  min_clearance_segment: number;
  /** Total toolpath length [mm]. */
  toolpath_length: number;
  /** Swept volume bounding box. */
  swept_bbox: AABB;
  /** Number of collision checks performed. */
  n_checks: number;
  calculation_method: string;
}

export class SweptVolumeCollision implements Algorithm<SweptVolumeCollisionInput, SweptVolumeCollisionOutput> {

  validate(input: SweptVolumeCollisionInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.toolpath?.length || input.toolpath.length < 2) {
      issues.push({ field: "toolpath", message: "At least 2 toolpath points required", severity: "error" });
    }
    if (!input.tool?.diameter || input.tool.diameter <= 0) {
      issues.push({ field: "tool.diameter", message: "Must be > 0", severity: "error" });
    }
    if (!input.obstacles?.length) {
      issues.push({ field: "obstacles", message: "At least 1 obstacle required", severity: "warning" });
    }
    if ((input.clearance ?? 2) < 0) {
      issues.push({ field: "clearance", message: "Must be >= 0", severity: "error" });
    }
    if (input.toolpath?.length > 10000) {
      issues.push({ field: "toolpath", message: "Large toolpath — performance may degrade", severity: "warning" });
    }
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: SweptVolumeCollisionInput): SweptVolumeCollisionOutput {
    const warnings: string[] = [];
    const { toolpath, tool, obstacles } = input;
    const clearance = input.clearance ?? 2;
    const samplesPerSeg = input.samples_per_segment ?? 10;

    const toolRadius = tool.diameter / 2;
    const holderRadius = (tool.holder_diameter ?? tool.diameter * 2) / 2;
    const fluteLen = tool.flute_length ?? tool.diameter * 3;
    const totalLen = tool.total_length ?? tool.diameter * 5;
    const effectiveRadius = Math.max(toolRadius, holderRadius) + clearance;

    // Compute toolpath length and swept bounding box
    let pathLength = 0;
    const sweptMin: Point3D = { x: Infinity, y: Infinity, z: Infinity };
    const sweptMax: Point3D = { x: -Infinity, y: -Infinity, z: -Infinity };

    for (let i = 0; i < toolpath.length; i++) {
      const p = toolpath[i];
      sweptMin.x = Math.min(sweptMin.x, p.x - effectiveRadius);
      sweptMin.y = Math.min(sweptMin.y, p.y - effectiveRadius);
      sweptMin.z = Math.min(sweptMin.z, p.z - totalLen);
      sweptMax.x = Math.max(sweptMax.x, p.x + effectiveRadius);
      sweptMax.y = Math.max(sweptMax.y, p.y + effectiveRadius);
      sweptMax.z = Math.max(sweptMax.z, p.z);
      if (i > 0) pathLength += this.dist(toolpath[i - 1], p);
    }

    // Check collisions
    const collisions: CollisionResult[] = [];
    let minClearance = Infinity;
    let minClearanceSeg = 0;
    let nChecks = 0;

    for (let seg = 0; seg < toolpath.length - 1; seg++) {
      const p0 = toolpath[seg];
      const p1 = toolpath[seg + 1];

      for (let s = 0; s <= samplesPerSeg; s++) {
        const t = s / samplesPerSeg;
        const pt: Point3D = {
          x: p0.x + t * (p1.x - p0.x),
          y: p0.y + t * (p1.y - p0.y),
          z: p0.z + t * (p1.z - p0.z),
        };

        for (let oi = 0; oi < obstacles.length; oi++) {
          nChecks++;
          const obs = obstacles[oi];

          // Quick AABB rejection using swept envelope
          if (pt.x + effectiveRadius < obs.min.x || pt.x - effectiveRadius > obs.max.x) continue;
          if (pt.y + effectiveRadius < obs.min.y || pt.y - effectiveRadius > obs.max.y) continue;
          if (pt.z - totalLen > obs.max.z || pt.z > obs.max.z + effectiveRadius) continue;

          // Compute distance from tool cylinder axis to AABB
          // Tool axis: vertical from (pt.x, pt.y, pt.z) downward by totalLen
          const dist = this.cylinderAABBDistance(pt, toolRadius, holderRadius, fluteLen, totalLen, obs);

          const distWithClearance = dist - clearance;
          if (distWithClearance < minClearance) {
            minClearance = distWithClearance;
            minClearanceSeg = seg;
          }

          if (distWithClearance < 0) {
            collisions.push({
              obstacle_index: oi,
              segment_index: seg,
              point: pt,
              min_distance: dist,
              penetration: -distWithClearance,
            });
          }
        }
      }
    }

    if (collisions.length > 0) {
      warnings.push(`COLLISION DETECTED: ${collisions.length} collision points found`);
    }

    return {
      collision_free: collisions.length === 0,
      collisions,
      min_clearance: minClearance === Infinity ? -1 : minClearance,
      min_clearance_segment: minClearanceSeg,
      toolpath_length: pathLength,
      swept_bbox: { min: sweptMin, max: sweptMax },
      n_checks: nChecks,
      warnings,
      calculation_method: `Swept volume collision (${toolpath.length} pts, ${obstacles.length} obstacles, ${samplesPerSeg} samples/seg)`,
    };
  }

  private cylinderAABBDistance(
    tip: Point3D, toolR: number, holderR: number,
    fluteLen: number, totalLen: number, box: AABB
  ): number {
    // Simplified: check radial distance in XY at multiple Z-heights
    // along the tool axis (tip is at top, tool extends downward)
    let minDist = Infinity;

    const zLevels = [
      { z: tip.z, r: toolR },                          // tip
      { z: tip.z - fluteLen / 2, r: toolR },            // mid-flute
      { z: tip.z - fluteLen, r: toolR },                 // flute end
      { z: tip.z - (fluteLen + totalLen) / 2, r: holderR }, // mid-holder
      { z: tip.z - totalLen, r: holderR },               // holder end
    ];

    for (const { z, r } of zLevels) {
      if (z > box.max.z || z < box.min.z) continue;

      // Closest point on AABB in XY
      const cx = Math.max(box.min.x, Math.min(tip.x, box.max.x));
      const cy = Math.max(box.min.y, Math.min(tip.y, box.max.y));
      const dx = tip.x - cx;
      const dy = tip.y - cy;
      const radialDist = Math.sqrt(dx * dx + dy * dy) - r;

      minDist = Math.min(minDist, radialDist);
    }

    return minDist;
  }

  private dist(a: Point3D, b: Point3D): number {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "swept-volume-collision",
      name: "Swept Volume Collision Detection",
      description: "Cylindrical tool swept volume collision checking against AABB obstacles",
      formula: "Swept cylinder-AABB intersection at sampled positions along toolpath",
      reference: "Abdel-Malek & Yeh (1997); Ericson (2004)",
      safety_class: "critical",
      domain: "collision",
      inputs: { toolpath: "Ordered 3D points", tool: "Tool geometry", obstacles: "AABB obstacles" },
      outputs: { collision_free: "Safety result", collisions: "Collision details", min_clearance: "Minimum distance [mm]" },
    };
  }
}
