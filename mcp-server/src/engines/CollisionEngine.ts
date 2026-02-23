/**
 * PRISM Manufacturing Intelligence - Collision Detection Engine
 * 3D collision detection for CNC machining safety
 *
 * SAFETY CRITICAL: Missing a collision = machine crash, injury, death
 *
 * Features:
 * - Swept volume calculation for rotating tools
 * - AABB and OBB bounding boxes
 * - SAT (Separating Axis Theorem) collision detection
 * - Near-miss detection with configurable threshold
 * - Tool holder envelope checking
 * - Fixture interference detection
 * - 5-axis head clearance analysis
 * - Rapid move safety validation
 *
 * @version 1.1.0
 * @module CollisionEngine
 */

// Import and re-export math utilities for backward compatibility
export { Vector3, Matrix4, Quaternion } from './CollisionMath.js';

// Import and re-export types for backward compatibility
export type {
  AABB, OBB, BoundingBox,
  Cylinder, Sphere, Capsule, TriangleMesh, CollisionGeometry,
  CollisionResult, NearMissResult, CollisionReport,
  ToolAssembly, ToolHolder, MachineEnvelope, Fixture, Workpiece,
  MoveType, ToolpathMove, Toolpath,
  SweptVolumeSegment, SweptVolume
} from './CollisionTypes.js';

// Import concrete types needed by the engine class
import { Vector3, Matrix4, Quaternion } from './CollisionMath.js';
import type {
  AABB, OBB, Cylinder, Sphere, Capsule,
  CollisionGeometry, CollisionResult, NearMissResult, CollisionReport,
  ToolAssembly, MachineEnvelope, Fixture, Workpiece,
  ToolpathMove, Toolpath, SweptVolumeSegment, SweptVolume
} from './CollisionTypes.js';

// ============================================================================
// COLLISION ENGINE CLASS
// ============================================================================

/**
 * Main collision detection engine
 */
export class CollisionEngine {
  private static instance: CollisionEngine;

  /** Default clearance threshold (mm) */
  private defaultClearance: number = 2.0;

  /** Near-miss thresholds by severity (mm) */
  private nearMissThresholds = {
    HIGH: 1.0,
    MEDIUM: 3.0,
    LOW: 5.0
  };

  /** Sampling resolution for curved moves (mm) */
  private samplingResolution: number = 1.0;

  private constructor() {}

  /** Get singleton instance */
  public static getInstance(): CollisionEngine {
    if (!CollisionEngine.instance) {
      CollisionEngine.instance = new CollisionEngine();
    }
    return CollisionEngine.instance;
  }

  // ==========================================================================
  // AABB OPERATIONS
  // ==========================================================================

  /**
   * Create AABB from points
   */
  createAABBFromPoints(points: Vector3[]): AABB {
    if (points.length === 0) {
      return {
        type: 'AABB',
        min: new Vector3(0, 0, 0),
        max: new Vector3(0, 0, 0)
      };
    }

    let min = points[0].clone();
    let max = points[0].clone();

    for (const p of points) {
      min = min.min(p);
      max = max.max(p);
    }

    return { type: 'AABB', min, max };
  }

  /**
   * Create AABB for cylinder
   */
  createAABBForCylinder(cylinder: Cylinder): AABB {
    const { baseCenter, axis, radius, height } = cylinder;
    const normalizedAxis = axis.normalize();
    const topCenter = baseCenter.add(normalizedAxis.multiply(height));

    // Find perpendicular directions
    const arbitrary = Math.abs(normalizedAxis.x) < 0.9
      ? new Vector3(1, 0, 0)
      : new Vector3(0, 1, 0);
    const perp1 = normalizedAxis.cross(arbitrary).normalize();
    const perp2 = normalizedAxis.cross(perp1).normalize();

    // Generate bounding points
    const points: Vector3[] = [];
    for (const center of [baseCenter, topCenter]) {
      points.push(center.add(perp1.multiply(radius)));
      points.push(center.subtract(perp1.multiply(radius)));
      points.push(center.add(perp2.multiply(radius)));
      points.push(center.subtract(perp2.multiply(radius)));
    }

    return this.createAABBFromPoints(points);
  }

  /**
   * Check AABB vs AABB overlap
   */
  checkAABBOverlap(a: AABB, b: AABB): boolean {
    return (
      a.min.x <= b.max.x && a.max.x >= b.min.x &&
      a.min.y <= b.max.y && a.max.y >= b.min.y &&
      a.min.z <= b.max.z && a.max.z >= b.min.z
    );
  }

  /**
   * Expand AABB by amount
   */
  expandAABB(aabb: AABB, amount: number): AABB {
    return {
      type: 'AABB',
      min: aabb.min.subtract(new Vector3(amount, amount, amount)),
      max: aabb.max.add(new Vector3(amount, amount, amount))
    };
  }

  /**
   * Merge two AABBs
   */
  mergeAABBs(a: AABB, b: AABB): AABB {
    return {
      type: 'AABB',
      min: a.min.min(b.min),
      max: a.max.max(b.max)
    };
  }

  /**
   * Get AABB center
   */
  getAABBCenter(aabb: AABB): Vector3 {
    return aabb.min.add(aabb.max).divide(2);
  }

  /**
   * Get AABB half extents
   */
  getAABBHalfExtents(aabb: AABB): Vector3 {
    return aabb.max.subtract(aabb.min).divide(2);
  }

  // ==========================================================================
  // OBB OPERATIONS
  // ==========================================================================

  /**
   * Create OBB from AABB and transform
   */
  createOBBFromAABB(aabb: AABB, orientation: Quaternion): OBB {
    return {
      type: 'OBB',
      center: this.getAABBCenter(aabb),
      halfExtents: this.getAABBHalfExtents(aabb),
      orientation
    };
  }

  /**
   * Get OBB axes
   */
  getOBBAxes(obb: OBB): Vector3[] {
    const m = obb.orientation.toMatrix();
    return [
      m.transformDirection(new Vector3(1, 0, 0)),
      m.transformDirection(new Vector3(0, 1, 0)),
      m.transformDirection(new Vector3(0, 0, 1))
    ];
  }

  /**
   * Get OBB vertices
   */
  getOBBVertices(obb: OBB): Vector3[] {
    const axes = this.getOBBAxes(obb);
    const vertices: Vector3[] = [];

    for (let i = -1; i <= 1; i += 2) {
      for (let j = -1; j <= 1; j += 2) {
        for (let k = -1; k <= 1; k += 2) {
          const v = obb.center
            .add(axes[0].multiply(i * obb.halfExtents.x))
            .add(axes[1].multiply(j * obb.halfExtents.y))
            .add(axes[2].multiply(k * obb.halfExtents.z));
          vertices.push(v);
        }
      }
    }

    return vertices;
  }

  // ==========================================================================
  // SEPARATING AXIS THEOREM (SAT)
  // ==========================================================================

  /**
   * Project OBB onto axis
   */
  private projectOBBOntoAxis(obb: OBB, axis: Vector3): { min: number; max: number } {
    const vertices = this.getOBBVertices(obb);
    let min = vertices[0].dot(axis);
    let max = min;

    for (let i = 1; i < vertices.length; i++) {
      const projection = vertices[i].dot(axis);
      min = Math.min(min, projection);
      max = Math.max(max, projection);
    }

    return { min, max };
  }

  /**
   * Check if projections overlap on axis
   */
  private projectionsOverlap(
    projA: { min: number; max: number },
    projB: { min: number; max: number }
  ): boolean {
    return projA.min <= projB.max && projA.max >= projB.min;
  }

  /**
   * SAT test for two OBBs
   */
  checkOBBCollision(a: OBB, b: OBB): CollisionResult {
    const axesA = this.getOBBAxes(a);
    const axesB = this.getOBBAxes(b);

    // Test 15 axes: 3 from A, 3 from B, 9 cross products
    const testAxes: Vector3[] = [
      ...axesA,
      ...axesB
    ];

    // Add cross product axes
    for (const axisA of axesA) {
      for (const axisB of axesB) {
        const cross = axisA.cross(axisB);
        if (cross.lengthSquared() > 1e-10) {
          testAxes.push(cross.normalize());
        }
      }
    }

    let minOverlap = Infinity;
    let separatingAxis: Vector3 | null = null;

    for (const axis of testAxes) {
      const projA = this.projectOBBOntoAxis(a, axis);
      const projB = this.projectOBBOntoAxis(b, axis);

      if (!this.projectionsOverlap(projA, projB)) {
        // Found separating axis - no collision
        const distance = Math.max(projA.min - projB.max, projB.min - projA.max);
        return {
          collision: false,
          distance,
          normal: axis
        };
      }

      // Calculate overlap
      const overlap = Math.min(projA.max - projB.min, projB.max - projA.min);
      if (overlap < minOverlap) {
        minOverlap = overlap;
        separatingAxis = axis;
      }
    }

    // No separating axis found - collision
    return {
      collision: true,
      distance: -minOverlap,
      penetrationDepth: minOverlap,
      normal: separatingAxis || new Vector3(0, 0, 1)
    };
  }

  // ==========================================================================
  // PRIMITIVE COLLISION TESTS
  // ==========================================================================

  /**
   * Sphere vs Sphere collision
   */
  checkSphereSphereCollision(a: Sphere, b: Sphere): CollisionResult {
    const distance = a.center.distanceTo(b.center);
    const sumRadii = a.radius + b.radius;
    const collision = distance < sumRadii;

    return {
      collision,
      distance: distance - sumRadii,
      penetrationDepth: collision ? sumRadii - distance : undefined,
      normal: b.center.subtract(a.center).normalize(),
      pointA: a.center.add(b.center.subtract(a.center).normalize().multiply(a.radius)),
      pointB: b.center.add(a.center.subtract(b.center).normalize().multiply(b.radius))
    };
  }

  /**
   * Point vs AABB distance
   */
  pointToAABBDistance(point: Vector3, aabb: AABB): { distance: number; closest: Vector3 } {
    const closest = new Vector3(
      Math.max(aabb.min.x, Math.min(point.x, aabb.max.x)),
      Math.max(aabb.min.y, Math.min(point.y, aabb.max.y)),
      Math.max(aabb.min.z, Math.min(point.z, aabb.max.z))
    );

    return {
      distance: point.distanceTo(closest),
      closest
    };
  }

  /**
   * Sphere vs AABB collision
   */
  checkSphereAABBCollision(sphere: Sphere, aabb: AABB): CollisionResult {
    const { distance, closest } = this.pointToAABBDistance(sphere.center, aabb);
    const collision = distance < sphere.radius;

    return {
      collision,
      distance: distance - sphere.radius,
      penetrationDepth: collision ? sphere.radius - distance : undefined,
      pointA: sphere.center.add(closest.subtract(sphere.center).normalize().multiply(sphere.radius)),
      pointB: closest,
      normal: closest.subtract(sphere.center).normalize()
    };
  }

  /**
   * Line segment vs point closest distance
   */
  closestPointOnLineSegment(point: Vector3, start: Vector3, end: Vector3): Vector3 {
    const ab = end.subtract(start);
    const ap = point.subtract(start);
    const t = Math.max(0, Math.min(1, ap.dot(ab) / ab.dot(ab)));
    return start.add(ab.multiply(t));
  }

  /**
   * Capsule vs Capsule collision (used for tool swept volumes)
   */
  checkCapsuleCapsuleCollision(a: Capsule, b: Capsule): CollisionResult {
    // Find closest points between line segments
    const d1 = a.end.subtract(a.start);
    const d2 = b.end.subtract(b.start);
    const r = a.start.subtract(b.start);

    const aa = d1.dot(d1);
    const bb = d2.dot(d2);
    const ab = d1.dot(d2);
    const ar = d1.dot(r);
    const br = d2.dot(r);

    const denom = aa * bb - ab * ab;
    let s = 0, t = 0;

    if (denom !== 0) {
      s = Math.max(0, Math.min(1, (ab * br - bb * ar) / denom));
    }
    t = (ab * s + br) / bb;

    if (t < 0) {
      t = 0;
      s = Math.max(0, Math.min(1, -ar / aa));
    } else if (t > 1) {
      t = 1;
      s = Math.max(0, Math.min(1, (ab - ar) / aa));
    }

    const closestA = a.start.add(d1.multiply(s));
    const closestB = b.start.add(d2.multiply(t));
    const distance = closestA.distanceTo(closestB);
    const sumRadii = a.radius + b.radius;
    const collision = distance < sumRadii;

    return {
      collision,
      distance: distance - sumRadii,
      penetrationDepth: collision ? sumRadii - distance : undefined,
      pointA: closestA,
      pointB: closestB,
      normal: closestB.subtract(closestA).normalize()
    };
  }

  // ==========================================================================
  // SWEPT VOLUME GENERATION
  // ==========================================================================

  /**
   * Generate swept volume for a toolpath move
   */
  generateSweptVolumeForMove(move: ToolpathMove, tool: ToolAssembly): SweptVolumeSegment[] {
    const segments: SweptVolumeSegment[] = [];
    const { start, end, type } = move;

    if (type === 'LINEAR' || type === 'RAPID') {
      // Linear move - single capsule segment
      const aabb = this.createAABBFromPoints([start, end]);
      const expandedAABB = this.expandAABB(aabb, tool.diameter / 2);

      segments.push({
        start,
        end,
        diameter: tool.diameter,
        boundingBox: expandedAABB
      });
    } else if (type === 'ARC_CW' || type === 'ARC_CCW') {
      // Arc move - sample into linear segments
      const arcSegments = this.sampleArc(move, this.samplingResolution);
      for (const seg of arcSegments) {
        const aabb = this.createAABBFromPoints([seg.start, seg.end]);
        segments.push({
          ...seg,
          diameter: tool.diameter,
          boundingBox: this.expandAABB(aabb, tool.diameter / 2)
        });
      }
    }

    return segments;
  }

  /**
   * Sample arc into linear segments
   */
  private sampleArc(move: ToolpathMove, resolution: number): { start: Vector3; end: Vector3 }[] {
    if (!move.arcCenter || !move.arcRadius) {
      return [{ start: move.start, end: move.end }];
    }

    const segments: { start: Vector3; end: Vector3 }[] = [];
    const arcLength = this.calculateArcLength(move);
    const numSegments = Math.max(4, Math.ceil(arcLength / resolution));

    let prev = move.start;
    for (let i = 1; i <= numSegments; i++) {
      const t = i / numSegments;
      const current = this.interpolateArc(move, t);
      segments.push({ start: prev, end: current });
      prev = current;
    }

    return segments;
  }

  /**
   * Calculate arc length
   */
  private calculateArcLength(move: ToolpathMove): number {
    if (!move.arcCenter || !move.arcRadius) return move.start.distanceTo(move.end);

    const startVec = move.start.subtract(move.arcCenter);
    const endVec = move.end.subtract(move.arcCenter);
    const angle = Math.acos(Math.max(-1, Math.min(1,
      startVec.normalize().dot(endVec.normalize())
    )));

    return angle * move.arcRadius;
  }

  /**
   * Interpolate point on arc
   */
  private interpolateArc(move: ToolpathMove, t: number): Vector3 {
    if (!move.arcCenter || !move.arcRadius) {
      return move.start.lerp(move.end, t);
    }

    const startVec = move.start.subtract(move.arcCenter);

    // Calculate angle
    const startAngle = Math.atan2(startVec.y, startVec.x);
    let endAngle = Math.atan2(
      move.end.subtract(move.arcCenter).y,
      move.end.subtract(move.arcCenter).x
    );

    // Handle direction
    if (move.type === 'ARC_CW') {
      if (endAngle >= startAngle) endAngle -= 2 * Math.PI;
    } else {
      if (endAngle <= startAngle) endAngle += 2 * Math.PI;
    }

    const angle = startAngle + (endAngle - startAngle) * t;
    const z = move.start.z + (move.end.z - move.start.z) * t;

    return new Vector3(
      move.arcCenter.x + move.arcRadius * Math.cos(angle),
      move.arcCenter.y + move.arcRadius * Math.sin(angle),
      z
    );
  }

  /**
   * Generate complete swept volume for toolpath
   */
  generateSweptVolume(toolpath: Toolpath): SweptVolume {
    const allSegments: SweptVolumeSegment[] = [];
    let totalLength = 0;

    for (const move of toolpath.moves) {
      const segments = this.generateSweptVolumeForMove(move, toolpath.tool);
      allSegments.push(...segments);
      totalLength += move.start.distanceTo(move.end);
    }

    // Calculate overall bounding box
    let overallBB: AABB | null = null;
    for (const seg of allSegments) {
      overallBB = overallBB
        ? this.mergeAABBs(overallBB, seg.boundingBox)
        : seg.boundingBox;
    }

    return {
      segments: allSegments,
      boundingBox: overallBB || {
        type: 'AABB',
        min: new Vector3(0, 0, 0),
        max: new Vector3(0, 0, 0)
      },
      toolId: toolpath.tool.toolId,
      pathLength: totalLength
    };
  }

  // ==========================================================================
  // HIGH-LEVEL COLLISION CHECKING
  // ==========================================================================

  /**
   * Check toolpath for collisions with machine, fixtures, and workpiece
   */
  checkToolpathCollision(
    toolpath: Toolpath,
    machine: MachineEnvelope,
    fixtures: Fixture[],
    workpiece?: Workpiece
  ): CollisionReport {
    const collisions: CollisionResult[] = [];
    const nearMisses: NearMissResult[] = [];
    let minClearance = Infinity;
    let minClearancePosition: Vector3 | undefined;

    // Generate swept volume
    const sweptVolume = this.generateSweptVolume(toolpath);

    // Check each segment
    for (const segment of sweptVolume.segments) {
      // Check machine envelope
      const envelopeResult = this.checkMachineEnvelope(segment, machine);
      if (envelopeResult.collision) {
        collisions.push({
          ...envelopeResult,
          description: `Tool outside machine envelope at position`
        });
      }

      // Check fixtures
      for (const fixture of fixtures) {
        for (const fixtureGeom of fixture.geometry) {
          const fixtureResult = this.checkSegmentVsGeometry(segment, fixtureGeom);

          if (fixtureResult.collision) {
            collisions.push({
              ...fixtureResult,
              description: `Collision with fixture ${fixture.fixtureId}`
            });
          } else if (fixtureResult.distance < this.nearMissThresholds.LOW) {
            const severity = this.classifyNearMiss(fixtureResult.distance);
            nearMisses.push({
              nearMiss: true,
              distance: fixtureResult.distance,
              position: segment.start.lerp(segment.end, 0.5),
              objectA: toolpath.tool.toolId,
              objectB: fixture.fixtureId,
              severity,
              recommendedClearance: this.nearMissThresholds.LOW
            });
          }

          if (fixtureResult.distance < minClearance) {
            minClearance = fixtureResult.distance;
            minClearancePosition = segment.start.lerp(segment.end, 0.5);
          }
        }
      }

      // Check workpiece
      if (workpiece?.stockGeometry) {
        const workpieceResult = this.checkSegmentVsGeometry(
          segment,
          workpiece.stockGeometry
        );

        if (workpieceResult.distance < minClearance) {
          minClearance = workpieceResult.distance;
        }
      }

      // Check spindle head (5-axis)
      if (machine.spindleHead) {
        for (const headGeom of machine.spindleHead) {
          const headResult = this.checkSegmentVsGeometry(segment, headGeom);
          if (headResult.collision) {
            collisions.push({
              ...headResult,
              description: 'Collision with spindle head'
            });
          }
        }
      }
    }

    return {
      safe: collisions.length === 0,
      collisionCount: collisions.length,
      nearMissCount: nearMisses.length,
      collisions,
      nearMisses,
      minClearance,
      minClearancePosition,
      timestamp: new Date().toISOString(),
      toolpathId: toolpath.toolpathId,
      machineId: machine.machineId
    };
  }

  /**
   * Check segment against machine envelope
   */
  private checkMachineEnvelope(
    segment: SweptVolumeSegment,
    machine: MachineEnvelope
  ): CollisionResult {
    const radius = segment.diameter / 2;

    // Check start and end points against limits
    for (const point of [segment.start, segment.end]) {
      if (
        point.x - radius < machine.xLimits.min ||
        point.x + radius > machine.xLimits.max ||
        point.y - radius < machine.yLimits.min ||
        point.y + radius > machine.yLimits.max ||
        point.z - radius < machine.zLimits.min ||
        point.z + radius > machine.zLimits.max
      ) {
        return {
          collision: true,
          distance: 0,
          description: 'Tool position outside machine travel limits',
          pointA: point
        };
      }
    }

    return { collision: false, distance: Infinity };
  }

  /**
   * Check swept volume segment against collision geometry
   */
  private checkSegmentVsGeometry(
    segment: SweptVolumeSegment,
    geometry: CollisionGeometry
  ): CollisionResult {
    // Create capsule for segment
    const capsule: Capsule = {
      type: 'capsule',
      start: segment.start,
      end: segment.end,
      radius: segment.diameter / 2
    };

    if (geometry.type === 'AABB') {
      // Convert to sphere-AABB test at multiple points
      const points = [
        segment.start,
        segment.end,
        segment.start.lerp(segment.end, 0.5)
      ];

      let minDist = Infinity;
      for (const point of points) {
        const sphere: Sphere = {
          type: 'sphere',
          center: point,
          radius: segment.diameter / 2
        };
        const result = this.checkSphereAABBCollision(sphere, geometry);
        minDist = Math.min(minDist, result.distance);
        if (result.collision) {
          return result;
        }
      }
      return { collision: false, distance: minDist };
    }

    if (geometry.type === 'capsule') {
      return this.checkCapsuleCapsuleCollision(capsule, geometry);
    }

    if (geometry.type === 'sphere') {
      // Multiple point test
      const points = [segment.start, segment.end, segment.start.lerp(segment.end, 0.5)];
      let minDist = Infinity;
      for (const point of points) {
        const dist = point.distanceTo(geometry.center) - geometry.radius - segment.diameter / 2;
        minDist = Math.min(minDist, dist);
        if (dist < 0) {
          return {
            collision: true,
            distance: dist,
            penetrationDepth: -dist
          };
        }
      }
      return { collision: false, distance: minDist };
    }

    // Default: check bounding boxes
    const segAABB = segment.boundingBox;
    if (geometry.type === 'OBB') {
      const segOBB = this.createOBBFromAABB(segAABB, new Quaternion());
      return this.checkOBBCollision(segOBB, geometry);
    }

    return { collision: false, distance: Infinity };
  }

  /**
   * Classify near-miss severity
   */
  private classifyNearMiss(distance: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (distance < this.nearMissThresholds.HIGH) return 'HIGH';
    if (distance < this.nearMissThresholds.MEDIUM) return 'MEDIUM';
    return 'LOW';
  }

  // ==========================================================================
  // RAPID MOVE VALIDATION
  // ==========================================================================

  /**
   * Validate all rapid moves in toolpath
   */
  validateRapidMoves(
    toolpath: Toolpath,
    machine: MachineEnvelope,
    fixtures: Fixture[]
  ): { safe: boolean; issues: string[] } {
    const issues: string[] = [];

    for (let i = 0; i < toolpath.moves.length; i++) {
      const move = toolpath.moves[i];
      if (move.type !== 'RAPID') continue;

      // Check move is within machine envelope
      const envCheck = this.checkMachineEnvelope(
        {
          start: move.start,
          end: move.end,
          diameter: toolpath.tool.diameter,
          boundingBox: this.createAABBFromPoints([move.start, move.end])
        },
        machine
      );

      if (envCheck.collision) {
        issues.push(`Rapid move at line ${move.lineNumber || i} exceeds machine limits`);
      }

      // Check rapid doesn't go through fixtures
      for (const fixture of fixtures) {
        for (const geom of fixture.geometry) {
          const result = this.checkSegmentVsGeometry(
            {
              start: move.start,
              end: move.end,
              diameter: toolpath.tool.diameter,
              boundingBox: this.expandAABB(
                this.createAABBFromPoints([move.start, move.end]),
                toolpath.tool.diameter / 2
              )
            },
            geom
          );

          if (result.collision) {
            issues.push(
              `Rapid at line ${move.lineNumber || i} collides with fixture ${fixture.fixtureId}`
            );
          }
        }
      }
    }

    return {
      safe: issues.length === 0,
      issues
    };
  }

  // ==========================================================================
  // NEAR-MISS DETECTION
  // ==========================================================================

  /**
   * Detect near-misses along entire toolpath
   */
  detectNearMisses(
    toolpath: Toolpath,
    obstacles: (Fixture | Workpiece)[],
    threshold: number = this.nearMissThresholds.LOW
  ): NearMissResult[] {
    const nearMisses: NearMissResult[] = [];
    const sweptVolume = this.generateSweptVolume(toolpath);

    for (const segment of sweptVolume.segments) {
      for (const obstacle of obstacles) {
        const geometry = 'geometry' in obstacle
          ? obstacle.geometry
          : [obstacle.stockGeometry];

        for (const geom of (Array.isArray(geometry) ? geometry : [geometry])) {
          if (!geom) continue;

          const result = this.checkSegmentVsGeometry(segment, geom);

          if (!result.collision && result.distance < threshold) {
            const obstacleId = 'fixtureId' in obstacle
              ? obstacle.fixtureId
              : obstacle.workpieceId;

            nearMisses.push({
              nearMiss: true,
              distance: result.distance,
              position: segment.start.lerp(segment.end, 0.5),
              objectA: toolpath.tool.toolId,
              objectB: obstacleId,
              severity: this.classifyNearMiss(result.distance),
              recommendedClearance: threshold
            });
          }
        }
      }
    }

    return nearMisses;
  }

  // ==========================================================================
  // SAFE APPROACH CALCULATION
  // ==========================================================================

  /**
   * Calculate safe approach vector to target position
   */
  calculateSafeApproach(
    target: Vector3,
    toolRadius: number,
    obstacles: CollisionGeometry[],
    clearance: number = this.defaultClearance
  ): { approach: Vector3; safeStartPosition: Vector3; safe: boolean } {
    // Try standard approaches: Z-up, then diagonal
    const approaches = [
      new Vector3(0, 0, 1),   // From above
      new Vector3(0, 0, -1),  // From below
      new Vector3(1, 0, 0),   // From +X
      new Vector3(-1, 0, 0),  // From -X
      new Vector3(0, 1, 0),   // From +Y
      new Vector3(0, -1, 0),  // From -Y
    ];

    for (const approach of approaches) {
      // Check path along approach direction
      const approachLength = 50; // mm
      const startPos = target.add(approach.multiply(approachLength));

      let safe = true;
      const segment: SweptVolumeSegment = {
        start: startPos,
        end: target,
        diameter: toolRadius * 2,
        boundingBox: this.expandAABB(
          this.createAABBFromPoints([startPos, target]),
          toolRadius
        )
      };

      for (const obstacle of obstacles) {
        const result = this.checkSegmentVsGeometry(segment, obstacle);
        if (result.collision || result.distance < clearance) {
          safe = false;
          break;
        }
      }

      if (safe) {
        return {
          approach,
          safeStartPosition: startPos,
          safe: true
        };
      }
    }

    // No safe approach found
    return {
      approach: new Vector3(0, 0, 1),
      safeStartPosition: target.add(new Vector3(0, 0, 50)),
      safe: false
    };
  }

  // ==========================================================================
  // 5-AXIS HEAD CLEARANCE
  // ==========================================================================

  /**
   * Check 5-axis spindle head clearance
   */
  check5AxisHeadClearance(
    toolPosition: Vector3,
    toolAxis: Vector3,
    machine: MachineEnvelope,
    fixtures: Fixture[],
    workpiece?: Workpiece
  ): { clear: boolean; minClearance: number; issues: string[] } {
    const issues: string[] = [];
    let minClearance = Infinity;

    if (!machine.spindleHead) {
      return { clear: true, minClearance: Infinity, issues: [] };
    }

    // Transform spindle head geometry based on tool axis orientation
    const headGeometries = this.transformSpindleHead(
      machine.spindleHead,
      toolPosition,
      toolAxis
    );

    // Check against fixtures
    for (const fixture of fixtures) {
      for (const fixtureGeom of fixture.geometry) {
        for (const headGeom of headGeometries) {
          // Simplified: AABB check
          if (headGeom.type === 'AABB' && fixtureGeom.type === 'AABB') {
            if (this.checkAABBOverlap(headGeom, fixtureGeom)) {
              issues.push(`Spindle head collision with fixture ${fixture.fixtureId}`);
            }
          }
        }
      }
    }

    // Check against workpiece
    if (workpiece?.stockGeometry) {
      for (const headGeom of headGeometries) {
        const result = this.checkSegmentVsGeometry(
          {
            start: toolPosition,
            end: toolPosition.add(toolAxis.multiply(-50)),
            diameter: 100, // Assume head diameter
            boundingBox: this.expandAABB(
              this.createAABBFromPoints([toolPosition]),
              50
            )
          },
          workpiece.stockGeometry
        );

        if (result.distance < minClearance) {
          minClearance = result.distance;
        }

        if (result.collision) {
          issues.push('Spindle head collision with workpiece');
        }
      }
    }

    return {
      clear: issues.length === 0,
      minClearance,
      issues
    };
  }

  /**
   * Transform spindle head geometry based on tool orientation
   */
  private transformSpindleHead(
    headGeometry: CollisionGeometry[],
    position: Vector3,
    toolAxis: Vector3
  ): CollisionGeometry[] {
    // Calculate rotation from Z-axis to tool axis
    const defaultAxis = new Vector3(0, 0, -1);
    const rotation = this.rotationBetweenVectors(defaultAxis, toolAxis);
    const matrix = rotation.toMatrix();
    const translation = Matrix4.translation(position.x, position.y, position.z);
    const transform = translation.multiply(matrix);

    // Transform each geometry
    return headGeometry.map(geom => {
      if (geom.type === 'AABB') {
        // Transform AABB corners and create new AABB
        const corners = [
          new Vector3(geom.min.x, geom.min.y, geom.min.z),
          new Vector3(geom.max.x, geom.min.y, geom.min.z),
          new Vector3(geom.min.x, geom.max.y, geom.min.z),
          new Vector3(geom.max.x, geom.max.y, geom.min.z),
          new Vector3(geom.min.x, geom.min.y, geom.max.z),
          new Vector3(geom.max.x, geom.min.y, geom.max.z),
          new Vector3(geom.min.x, geom.max.y, geom.max.z),
          new Vector3(geom.max.x, geom.max.y, geom.max.z),
        ];

        const transformed = corners.map(c => transform.transformPoint(c));
        return this.createAABBFromPoints(transformed);
      }

      if (geom.type === 'sphere') {
        return {
          ...geom,
          center: transform.transformPoint(geom.center)
        };
      }

      return geom;
    });
  }

  /**
   * Calculate rotation quaternion between two vectors
   */
  private rotationBetweenVectors(from: Vector3, to: Vector3): Quaternion {
    const fromNorm = from.normalize();
    const toNorm = to.normalize();
    const dot = fromNorm.dot(toNorm);

    if (dot > 0.9999) {
      return new Quaternion(0, 0, 0, 1);
    }

    if (dot < -0.9999) {
      // 180 degree rotation
      let axis = new Vector3(1, 0, 0).cross(fromNorm);
      if (axis.lengthSquared() < 0.0001) {
        axis = new Vector3(0, 1, 0).cross(fromNorm);
      }
      return Quaternion.fromAxisAngle(axis.normalize(), Math.PI);
    }

    const axis = fromNorm.cross(toNorm);
    const s = Math.sqrt((1 + dot) * 2);
    return new Quaternion(
      axis.x / s,
      axis.y / s,
      axis.z / s,
      s / 2
    );
  }

  // ==========================================================================
  // COLLISION REPORT GENERATION
  // ==========================================================================

  /**
   * Generate comprehensive collision report
   */
  generateCollisionReport(
    toolpath: Toolpath,
    machine: MachineEnvelope,
    fixtures: Fixture[],
    workpiece?: Workpiece
  ): CollisionReport {
    // Run full collision check
    const mainReport = this.checkToolpathCollision(
      toolpath,
      machine,
      fixtures,
      workpiece
    );

    // Add rapid move validation
    const rapidCheck = this.validateRapidMoves(toolpath, machine, fixtures);
    if (!rapidCheck.safe) {
      for (const issue of rapidCheck.issues) {
        mainReport.collisions.push({
          collision: true,
          distance: 0,
          description: issue
        });
      }
      mainReport.collisionCount = mainReport.collisions.length;
      mainReport.safe = false;
    }

    // Add near-miss detection
    const nearMisses = this.detectNearMisses(
      toolpath,
      [...fixtures, ...(workpiece ? [workpiece] : [])]
    );
    mainReport.nearMisses.push(...nearMisses);
    mainReport.nearMissCount = mainReport.nearMisses.length;

    return mainReport;
  }

  // ==========================================================================
  // TOOL CLEARANCE VALIDATION
  // ==========================================================================

  /**
   * Validate tool assembly clearance at position
   */
  validateToolClearance(
    tool: ToolAssembly,
    position: Vector3,
    toolAxis: Vector3,
    obstacles: CollisionGeometry[]
  ): { clear: boolean; minClearance: number; issues: string[] } {
    const issues: string[] = [];
    let minClearance = Infinity;

    // Create geometry for tool
    const toolGeom: Capsule = {
      type: 'capsule',
      start: position,
      end: position.add(toolAxis.multiply(-tool.fluteLength)),
      radius: tool.diameter / 2
    };

    // Create geometry for shank
    const shankGeom: Capsule = {
      type: 'capsule',
      start: position.add(toolAxis.multiply(-tool.fluteLength)),
      end: position.add(toolAxis.multiply(-tool.overallLength)),
      radius: tool.shankDiameter / 2
    };

    // Create geometry for holder if present
    const holderGeoms: Capsule[] = [];
    if (tool.holder) {
      holderGeoms.push({
        type: 'capsule',
        start: position.add(toolAxis.multiply(-tool.stickout)),
        end: position.add(toolAxis.multiply(-tool.stickout - tool.holder.length)),
        radius: tool.holder.maxDiameter / 2
      });
    }

    // Check all against obstacles
    const allToolGeoms = [toolGeom, shankGeom, ...holderGeoms];

    for (const tGeom of allToolGeoms) {
      const segment: SweptVolumeSegment = {
        start: tGeom.start,
        end: tGeom.end,
        diameter: tGeom.radius * 2,
        boundingBox: this.expandAABB(
          this.createAABBFromPoints([tGeom.start, tGeom.end]),
          tGeom.radius
        )
      };

      for (const obstacle of obstacles) {
        const result = this.checkSegmentVsGeometry(segment, obstacle);

        if (result.collision) {
          issues.push(`Tool assembly collision detected`);
        }

        if (result.distance < minClearance) {
          minClearance = result.distance;
        }
      }
    }

    return {
      clear: issues.length === 0,
      minClearance,
      issues
    };
  }
}

// Export singleton instance
export const collisionEngine = CollisionEngine.getInstance();
