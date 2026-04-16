/**
 * WEDMHeadClearanceEngine — WEDM AGI Phase 4 / P4-MS2 / U-P4-04.
 *
 * Real-time pose-based clearance guard for wire EDM cuts.
 *
 * This is the *run-time* collision check for the autonomy layer. It is
 * distinct from `WEDMFixtureInterferenceEngine` (planning-time 2D XY
 * check of path-vs-clamp footprints) and from the mill/turn
 * `CollisionPreventionEngine` / `CollisionEngine` (spindle + tool body
 * + holder, generic 3D CNC).
 *
 * WEDM collision is fundamentally different:
 *
 *   - There is no rotating tool body. The "cutter" is a 0.20–0.30 mm
 *     wire that is EXPECTED to be inside the part during a cut.
 *   - The wire runs from a lower guide (on the lower head at Z_lower)
 *     up to an upper guide (on the upper head at Z_upper).
 *   - On a 4-axis machine, U/V taper offsets shift the upper guide in
 *     XY so the wire is no longer plumb — which can push the upper
 *     head into obstructions that were clear when the wire was vertical.
 *   - The heads/guides must never contact fixtures, clamps, tank walls,
 *     or (critically) the part itself.
 *
 * The engine takes a `MachinePose` and a set of obstacle AABBs, runs:
 *
 *   1. Upper guide body vs every obstacle (AABB ∩ AABB)
 *   2. Lower guide body vs every obstacle (AABB ∩ AABB)
 *   3. Wire segment vs every non-part fixture (segment ∩ AABB)
 *   4. Head XY outside tank inner envelope (containment test)
 *   5. Lower guide below a configured table Z
 *
 * and emits `CollisionEvent`s with critical/warning severity. A
 * `CollisionReport.pass === false` is a trigger for the autonomy layer:
 *
 *   wedmAutonomyEngine.degrade({ floorToLevel: 0, reason: "collision" })
 *   wedmExceptionHandlerEngine.handle({ type: "axis_overrun", ... })
 *   wedmHumanHandoffEngine.escalate({ type: "axis_overrun", ... })
 *
 * Conservative stance: false positives are acceptable, false negatives
 * are never acceptable. Default safety margin is 2 mm, matching the
 * broader DMG MORI / CollisionPreventionEngine convention.
 *
 * Reference: Ericson, "Real-Time Collision Detection" (2004) §5 (AABB,
 * segment-AABB primitives).
 *
 * @module engines/WEDMHeadClearanceEngine
 */

// ============================================================================
// TYPES
// ============================================================================

/** 4-axis WEDM machine pose (XY + separate upper/lower Z + UV taper). */
export interface MachinePose {
  X: number;
  Y: number;
  /** Upper guide Z (top head lower face). */
  Z_upper: number;
  /** Lower guide Z (bottom head upper face). */
  Z_lower: number;
  /** Taper offset applied to the upper guide in X (mm). Default 0. */
  U?: number;
  /** Taper offset applied to the upper guide in Y (mm). Default 0. */
  V?: number;
}

export type ObstacleRole = "fixture" | "clamp" | "part" | "tank_wall";

export interface AABB {
  id: string;
  role: ObstacleRole;
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface GuideBody {
  /** Half-width of the guide head in XY (mm). */
  radius_mm: number;
  /** Axial height of the guide body away from the wire tip (mm). */
  length_mm: number;
}

export type ClearanceActor = "upper_guide" | "lower_guide" | "wire" | "upper_head";

export type ClearanceKind =
  | "guide_vs_fixture"
  | "guide_vs_part"
  | "wire_vs_fixture"
  | "head_outside_tank"
  | "head_below_table";

export type ClearanceSeverity = "warning" | "critical";

export interface ClearanceEvent {
  severity: ClearanceSeverity;
  kind: ClearanceKind;
  actor: ClearanceActor;
  obstacleId?: string;
  /** Negative = penetration depth; positive = closest clearance. */
  clearance_mm: number;
  where?: { x: number; y: number; z: number };
  reason: string;
}

export interface ClearanceOptions {
  upperGuide?: GuideBody;
  lowerGuide?: GuideBody;
  /** Violations strictly below this margin are flagged (mm). */
  safetyMargin_mm?: number;
  /** Inner-envelope AABB of the work tank; head XY must stay inside. */
  tankInner?: AABB;
  /** Lower guide must stay at or above this Z (table surface). */
  tableZ?: number;
}

export interface ClearanceReport {
  pose: MachinePose;
  pass: boolean;
  minClearance_mm: number;
  events: ClearanceEvent[];
}

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULT_UPPER_GUIDE: GuideBody = { radius_mm: 20, length_mm: 40 };
export const DEFAULT_LOWER_GUIDE: GuideBody = { radius_mm: 20, length_mm: 40 };
export const DEFAULT_SAFETY_MARGIN_MM = 2;

// ============================================================================
// GEOMETRY HELPERS
// ============================================================================

function guideAABB(
  center: { x: number; y: number },
  zBase: number,
  side: "upper" | "lower",
  body: GuideBody,
): AABB {
  const r = body.radius_mm;
  const L = body.length_mm;
  const zMin = side === "upper" ? zBase : zBase - L;
  const zMax = side === "upper" ? zBase + L : zBase;
  return {
    id: `__guide_${side}`,
    role: "fixture",
    min: { x: center.x - r, y: center.y - r, z: zMin },
    max: { x: center.x + r, y: center.y + r, z: zMax },
  };
}

/** Min separating distance between two AABBs. 0 = touching; negative = overlap. */
function aabbDistance(a: AABB, b: AABB): number {
  const dx = Math.max(0, Math.max(a.min.x - b.max.x, b.min.x - a.max.x));
  const dy = Math.max(0, Math.max(a.min.y - b.max.y, b.min.y - a.max.y));
  const dz = Math.max(0, Math.max(a.min.z - b.max.z, b.min.z - a.max.z));
  const sep = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (sep > 0) return sep;
  const ox = Math.min(a.max.x - b.min.x, b.max.x - a.min.x);
  const oy = Math.min(a.max.y - b.min.y, b.max.y - a.min.y);
  const oz = Math.min(a.max.z - b.min.z, b.max.z - a.min.z);
  return -Math.min(ox, oy, oz);
}

/**
 * Minimum distance from a line segment p0→p1 to an AABB.
 * Samples the segment — precise enough for ≤200 mm WEDM wires at 8
 * samples and avoids a full clipping implementation. Returns a small
 * negative sentinel (−1) on penetration.
 */
function segmentAABBDistance(
  p0: { x: number; y: number; z: number },
  p1: { x: number; y: number; z: number },
  box: AABB,
  samples = 8,
): { distance: number; where: { x: number; y: number; z: number } } {
  let best = Infinity;
  let bestWhere = p0;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = {
      x: p0.x + (p1.x - p0.x) * t,
      y: p0.y + (p1.y - p0.y) * t,
      z: p0.z + (p1.z - p0.z) * t,
    };
    const dx = Math.max(box.min.x - p.x, 0, p.x - box.max.x);
    const dy = Math.max(box.min.y - p.y, 0, p.y - box.max.y);
    const dz = Math.max(box.min.z - p.z, 0, p.z - box.max.z);
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d === 0) return { distance: -1, where: p };
    if (d < best) {
      best = d;
      bestWhere = p;
    }
  }
  return { distance: best, where: bestWhere };
}

function severityFor(clearance: number, margin: number): ClearanceSeverity | null {
  if (clearance <= 0) return "critical";
  if (clearance < margin) return "warning";
  return null;
}

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMHeadClearanceEngine {
  /**
   * Check a single machine pose against the supplied obstacles. Returns
   * a full report even on pass (minClearance populated).
   */
  check(
    pose: MachinePose,
    obstacles: AABB[],
    opts: ClearanceOptions = {},
  ): ClearanceReport {
    const upper = opts.upperGuide ?? DEFAULT_UPPER_GUIDE;
    const lower = opts.lowerGuide ?? DEFAULT_LOWER_GUIDE;
    const margin = opts.safetyMargin_mm ?? DEFAULT_SAFETY_MARGIN_MM;

    const U = pose.U ?? 0;
    const V = pose.V ?? 0;
    const upperCenter = { x: pose.X + U, y: pose.Y + V };
    const lowerCenter = { x: pose.X, y: pose.Y };

    const upperBox = guideAABB(upperCenter, pose.Z_upper, "upper", upper);
    const lowerBox = guideAABB(lowerCenter, pose.Z_lower, "lower", lower);

    const wireP0 = { x: pose.X, y: pose.Y, z: pose.Z_lower };
    const wireP1 = { x: pose.X + U, y: pose.Y + V, z: pose.Z_upper };

    const events: ClearanceEvent[] = [];
    let minClearance = Infinity;

    for (const ob of obstacles) {
      for (const [actor, box] of [
        ["upper_guide", upperBox] as const,
        ["lower_guide", lowerBox] as const,
      ]) {
        const d = aabbDistance(box, ob);
        if (d < minClearance) minClearance = d;
        const sev = severityFor(d, margin);
        if (sev) {
          const kind: ClearanceKind =
            ob.role === "part" ? "guide_vs_part" : "guide_vs_fixture";
          events.push({
            severity: sev,
            kind,
            actor,
            obstacleId: ob.id,
            clearance_mm: d,
            reason:
              d <= 0
                ? `${actor} penetrates ${ob.id} by ${Math.abs(d).toFixed(2)} mm`
                : `${actor} clearance to ${ob.id} = ${d.toFixed(2)} mm (< ${margin} mm)`,
          });
        }
      }

      // Wire vs fixture/clamp/tank only — wire is allowed inside the part.
      if (ob.role !== "part") {
        const { distance, where } = segmentAABBDistance(wireP0, wireP1, ob);
        if (distance < minClearance) minClearance = distance;
        const sev = severityFor(distance, margin);
        if (sev) {
          events.push({
            severity: sev,
            kind: "wire_vs_fixture",
            actor: "wire",
            obstacleId: ob.id,
            clearance_mm: distance,
            where,
            reason:
              distance <= 0
                ? `wire penetrates ${ob.id} at (${where.x.toFixed(2)}, ${where.y.toFixed(2)}, ${where.z.toFixed(2)})`
                : `wire clearance to ${ob.id} = ${distance.toFixed(2)} mm (< ${margin} mm)`,
          });
        }
      }
    }

    if (opts.tankInner) {
      const inside =
        upperCenter.x >= opts.tankInner.min.x &&
        upperCenter.x <= opts.tankInner.max.x &&
        upperCenter.y >= opts.tankInner.min.y &&
        upperCenter.y <= opts.tankInner.max.y;
      if (!inside) {
        events.push({
          severity: "critical",
          kind: "head_outside_tank",
          actor: "upper_head",
          obstacleId: opts.tankInner.id,
          clearance_mm: -1,
          reason: `upper head XY (${upperCenter.x.toFixed(2)}, ${upperCenter.y.toFixed(2)}) outside tank inner envelope`,
        });
        minClearance = Math.min(minClearance, -1);
      }
    }

    if (typeof opts.tableZ === "number" && pose.Z_lower < opts.tableZ) {
      const d = pose.Z_lower - opts.tableZ;
      events.push({
        severity: "critical",
        kind: "head_below_table",
        actor: "lower_guide",
        clearance_mm: d,
        reason: `lower guide Z=${pose.Z_lower.toFixed(2)} below table Z=${opts.tableZ.toFixed(2)}`,
      });
      minClearance = Math.min(minClearance, d);
    }

    const pass = events.every((e) => e.severity !== "critical");
    return {
      pose,
      pass,
      minClearance_mm: minClearance === Infinity ? Number.POSITIVE_INFINITY : minClearance,
      events,
    };
  }

  /** Run `check` over a poses-array (e.g. sampled toolpath). */
  checkPath(
    poses: MachinePose[],
    obstacles: AABB[],
    opts: ClearanceOptions = {},
  ): ClearanceReport[] {
    return poses.map((p) => this.check(p, obstacles, opts));
  }

  /** Return the first failing pose on a path, or null if clear. */
  firstCollision(
    poses: MachinePose[],
    obstacles: AABB[],
    opts: ClearanceOptions = {},
  ): { index: number; report: ClearanceReport } | null {
    for (let i = 0; i < poses.length; i++) {
      const r = this.check(poses[i], obstacles, opts);
      if (!r.pass) return { index: i, report: r };
    }
    return null;
  }
}

export const wedmHeadClearanceEngine = new WEDMHeadClearanceEngine();
