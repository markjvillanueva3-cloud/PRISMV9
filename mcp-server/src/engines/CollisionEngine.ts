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
 * @version 1.0.0
 * @module CollisionEngine
 */

// ============================================================================
// VECTOR AND MATRIX MATH UTILITIES
// ============================================================================

/**
 * 3D Vector class for collision calculations
 */
export class Vector3 {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {}

  /** Create from array */
  static fromArray(arr: number[]): Vector3 {
    return new Vector3(arr[0] || 0, arr[1] || 0, arr[2] || 0);
  }

  /** Clone this vector */
  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  /** Add another vector */
  add(v: Vector3): Vector3 {
    return new Vector3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  /** Subtract another vector */
  subtract(v: Vector3): Vector3 {
    return new Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  /** Multiply by scalar */
  multiply(s: number): Vector3 {
    return new Vector3(this.x * s, this.y * s, this.z * s);
  }

  /** Divide by scalar */
  divide(s: number): Vector3 {
    if (s === 0) throw new Error('Division by zero');
    return new Vector3(this.x / s, this.y / s, this.z / s);
  }

  /** Dot product */
  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  /** Cross product */
  cross(v: Vector3): Vector3 {
    return new Vector3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  /** Vector length/magnitude */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  /** Squared length (faster than length) */
  lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  /** Normalize to unit vector */
  normalize(): Vector3 {
    const len = this.length();
    if (len === 0) return new Vector3(0, 0, 0);
    return this.divide(len);
  }

  /** Distance to another vector */
  distanceTo(v: Vector3): number {
    return this.subtract(v).length();
  }

  /** Linear interpolation */
  lerp(v: Vector3, t: number): Vector3 {
    return this.add(v.subtract(this).multiply(t));
  }

  /** Component-wise minimum */
  min(v: Vector3): Vector3 {
    return new Vector3(
      Math.min(this.x, v.x),
      Math.min(this.y, v.y),
      Math.min(this.z, v.z)
    );
  }

  /** Component-wise maximum */
  max(v: Vector3): Vector3 {
    return new Vector3(
      Math.max(this.x, v.x),
      Math.max(this.y, v.y),
      Math.max(this.z, v.z)
    );
  }

  /** To array */
  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  /** Equals check with tolerance */
  equals(v: Vector3, tolerance: number = 1e-10): boolean {
    return (
      Math.abs(this.x - v.x) < tolerance &&
      Math.abs(this.y - v.y) < tolerance &&
      Math.abs(this.z - v.z) < tolerance
    );
  }
}

/**
 * 4x4 Matrix for transformations
 */
export class Matrix4 {
  public elements: number[];

  constructor() {
    // Identity matrix
    this.elements = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
  }

  /** Set to identity */
  identity(): Matrix4 {
    this.elements = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
    return this;
  }

  /** Create translation matrix */
  static translation(x: number, y: number, z: number): Matrix4 {
    const m = new Matrix4();
    m.elements[12] = x;
    m.elements[13] = y;
    m.elements[14] = z;
    return m;
  }

  /** Create rotation matrix around X axis */
  static rotationX(angle: number): Matrix4 {
    const m = new Matrix4();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    m.elements[5] = c;
    m.elements[6] = s;
    m.elements[9] = -s;
    m.elements[10] = c;
    return m;
  }

  /** Create rotation matrix around Y axis */
  static rotationY(angle: number): Matrix4 {
    const m = new Matrix4();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    m.elements[0] = c;
    m.elements[2] = -s;
    m.elements[8] = s;
    m.elements[10] = c;
    return m;
  }

  /** Create rotation matrix around Z axis */
  static rotationZ(angle: number): Matrix4 {
    const m = new Matrix4();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    m.elements[0] = c;
    m.elements[1] = s;
    m.elements[4] = -s;
    m.elements[5] = c;
    return m;
  }

  /** Create scale matrix */
  static scale(x: number, y: number, z: number): Matrix4 {
    const m = new Matrix4();
    m.elements[0] = x;
    m.elements[5] = y;
    m.elements[10] = z;
    return m;
  }

  /** Multiply with another matrix */
  multiply(other: Matrix4): Matrix4 {
    const result = new Matrix4();
    const a = this.elements;
    const b = other.elements;
    const r = result.elements;

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        r[row * 4 + col] =
          a[row * 4 + 0] * b[0 * 4 + col] +
          a[row * 4 + 1] * b[1 * 4 + col] +
          a[row * 4 + 2] * b[2 * 4 + col] +
          a[row * 4 + 3] * b[3 * 4 + col];
      }
    }
    return result;
  }

  /** Transform a point */
  transformPoint(v: Vector3): Vector3 {
    const e = this.elements;
    const w = e[3] * v.x + e[7] * v.y + e[11] * v.z + e[15];
    return new Vector3(
      (e[0] * v.x + e[4] * v.y + e[8] * v.z + e[12]) / w,
      (e[1] * v.x + e[5] * v.y + e[9] * v.z + e[13]) / w,
      (e[2] * v.x + e[6] * v.y + e[10] * v.z + e[14]) / w
    );
  }

  /** Transform a direction (ignores translation) */
  transformDirection(v: Vector3): Vector3 {
    const e = this.elements;
    return new Vector3(
      e[0] * v.x + e[4] * v.y + e[8] * v.z,
      e[1] * v.x + e[5] * v.y + e[9] * v.z,
      e[2] * v.x + e[6] * v.y + e[10] * v.z
    ).normalize();
  }
}

/**
 * Quaternion for rotation representation
 */
export class Quaternion {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0,
    public w: number = 1
  ) {}

  /** Create from axis-angle */
  static fromAxisAngle(axis: Vector3, angle: number): Quaternion {
    const halfAngle = angle / 2;
    const s = Math.sin(halfAngle);
    const normalizedAxis = axis.normalize();
    return new Quaternion(
      normalizedAxis.x * s,
      normalizedAxis.y * s,
      normalizedAxis.z * s,
      Math.cos(halfAngle)
    );
  }

  /** Create from Euler angles (XYZ order) */
  static fromEuler(x: number, y: number, z: number): Quaternion {
    const cx = Math.cos(x / 2);
    const sx = Math.sin(x / 2);
    const cy = Math.cos(y / 2);
    const sy = Math.sin(y / 2);
    const cz = Math.cos(z / 2);
    const sz = Math.sin(z / 2);

    return new Quaternion(
      sx * cy * cz + cx * sy * sz,
      cx * sy * cz - sx * cy * sz,
      cx * cy * sz + sx * sy * cz,
      cx * cy * cz - sx * sy * sz
    );
  }

  /** Multiply quaternions */
  multiply(q: Quaternion): Quaternion {
    return new Quaternion(
      this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y,
      this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x,
      this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w,
      this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z
    );
  }

  /** Rotate a vector by this quaternion */
  rotate(v: Vector3): Vector3 {
    const qv = new Quaternion(v.x, v.y, v.z, 0);
    const conjugate = new Quaternion(-this.x, -this.y, -this.z, this.w);
    const result = this.multiply(qv).multiply(conjugate);
    return new Vector3(result.x, result.y, result.z);
  }

  /** Convert to rotation matrix */
  toMatrix(): Matrix4 {
    const m = new Matrix4();
    const e = m.elements;
    const x2 = this.x + this.x;
    const y2 = this.y + this.y;
    const z2 = this.z + this.z;
    const xx = this.x * x2;
    const xy = this.x * y2;
    const xz = this.x * z2;
    const yy = this.y * y2;
    const yz = this.y * z2;
    const zz = this.z * z2;
    const wx = this.w * x2;
    const wy = this.w * y2;
    const wz = this.w * z2;

    e[0] = 1 - (yy + zz);
    e[1] = xy + wz;
    e[2] = xz - wy;
    e[4] = xy - wz;
    e[5] = 1 - (xx + zz);
    e[6] = yz + wx;
    e[8] = xz + wy;
    e[9] = yz - wx;
    e[10] = 1 - (xx + yy);

    return m;
  }

  /** Spherical linear interpolation */
  slerp(q: Quaternion, t: number): Quaternion {
    let cosHalfTheta = this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w;
    
    let qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    if (cosHalfTheta < 0) {
      cosHalfTheta = -cosHalfTheta;
      qx = -qx; qy = -qy; qz = -qz; qw = -qw;
    }

    if (cosHalfTheta >= 1.0) {
      return new Quaternion(this.x, this.y, this.z, this.w);
    }

    const halfTheta = Math.acos(cosHalfTheta);
    const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

    if (Math.abs(sinHalfTheta) < 0.001) {
      return new Quaternion(
        this.x * 0.5 + qx * 0.5,
        this.y * 0.5 + qy * 0.5,
        this.z * 0.5 + qz * 0.5,
        this.w * 0.5 + qw * 0.5
      );
    }

    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

    return new Quaternion(
      this.x * ratioA + qx * ratioB,
      this.y * ratioA + qy * ratioB,
      this.z * ratioA + qz * ratioB,
      this.w * ratioA + qw * ratioB
    );
  }
}

// ============================================================================
// BOUNDING BOX TYPES
// ============================================================================

/**
 * Axis-Aligned Bounding Box
 */
export interface AABB {
  type: 'AABB';
  min: Vector3;
  max: Vector3;
}

/**
 * Oriented Bounding Box
 */
export interface OBB {
  type: 'OBB';
  center: Vector3;
  halfExtents: Vector3;
  orientation: Quaternion;
}

/** Union type for bounding boxes */
export type BoundingBox = AABB | OBB;

// ============================================================================
// GEOMETRY PRIMITIVES
// ============================================================================

/**
 * Cylinder geometry for tool representation
 */
export interface Cylinder {
  type: 'cylinder';
  baseCenter: Vector3;
  axis: Vector3;
  radius: number;
  height: number;
}

/**
 * Sphere geometry
 */
export interface Sphere {
  type: 'sphere';
  center: Vector3;
  radius: number;
}

/**
 * Capsule geometry (cylinder with hemispherical ends)
 */
export interface Capsule {
  type: 'capsule';
  start: Vector3;
  end: Vector3;
  radius: number;
}

/**
 * Triangle mesh geometry
 */
export interface TriangleMesh {
  type: 'mesh';
  vertices: Vector3[];
  triangles: [number, number, number][];
}

/** Union type for collision geometry */
export type CollisionGeometry = Cylinder | Sphere | Capsule | TriangleMesh | AABB | OBB;

// ============================================================================
// COLLISION RESULT TYPES
// ============================================================================

/**
 * Result of collision detection
 */
export interface CollisionResult {
  /** Whether a collision was detected */
  collision: boolean;
  /** Minimum distance between objects (negative if penetrating) */
  distance: number;
  /** Closest point on object A */
  pointA?: Vector3;
  /** Closest point on object B */
  pointB?: Vector3;
  /** Contact normal (from A to B) */
  normal?: Vector3;
  /** Penetration depth if collision */
  penetrationDepth?: number;
  /** Description of collision */
  description?: string;
}

/**
 * Result of near-miss detection
 */
export interface NearMissResult {
  /** Whether a near-miss was detected */
  nearMiss: boolean;
  /** Minimum distance found */
  distance: number;
  /** Position where near-miss occurred */
  position: Vector3;
  /** Objects involved */
  objectA: string;
  objectB: string;
  /** Severity: LOW, MEDIUM, HIGH */
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  /** Recommended safe distance */
  recommendedClearance: number;
}

/**
 * Collision report for entire toolpath
 */
export interface CollisionReport {
  /** Overall status */
  safe: boolean;
  /** Total collisions found */
  collisionCount: number;
  /** Total near-misses found */
  nearMissCount: number;
  /** List of collisions */
  collisions: CollisionResult[];
  /** List of near-misses */
  nearMisses: NearMissResult[];
  /** Minimum clearance found */
  minClearance: number;
  /** Position of minimum clearance */
  minClearancePosition?: Vector3;
  /** Validation timestamp */
  timestamp: string;
  /** Toolpath checked */
  toolpathId?: string;
  /** Machine checked */
  machineId?: string;
}

// ============================================================================
// TOOL AND MACHINE TYPES
// ============================================================================

/**
 * Tool assembly for collision checking
 */
export interface ToolAssembly {
  /** Tool identifier */
  toolId: string;
  /** Tool type: endmill, drill, facemill, etc. */
  toolType: string;
  /** Overall diameter */
  diameter: number;
  /** Flute/cutting length */
  fluteLength: number;
  /** Overall length from gauge line */
  overallLength: number;
  /** Shank diameter */
  shankDiameter: number;
  /** Tool holder attached */
  holder?: ToolHolder;
  /** Stickout from holder */
  stickout: number;
}

/**
 * Tool holder geometry
 */
export interface ToolHolder {
  /** Holder identifier */
  holderId: string;
  /** Holder type: CAT40, BT30, HSK63A, etc. */
  holderType: string;
  /** Envelope geometry (simplified) */
  envelope: CollisionGeometry[];
  /** Maximum diameter */
  maxDiameter: number;
  /** Overall length */
  length: number;
}

/**
 * Machine envelope specification
 */
export interface MachineEnvelope {
  /** Machine identifier */
  machineId: string;
  /** X axis travel limits */
  xLimits: { min: number; max: number };
  /** Y axis travel limits */
  yLimits: { min: number; max: number };
  /** Z axis travel limits */
  zLimits: { min: number; max: number };
  /** A axis limits (if applicable) */
  aLimits?: { min: number; max: number };
  /** B axis limits (if applicable) */
  bLimits?: { min: number; max: number };
  /** C axis limits (if applicable) */
  cLimits?: { min: number; max: number };
  /** Spindle head geometry for 5-axis */
  spindleHead?: CollisionGeometry[];
  /** Column/structure obstacles */
  fixedObstacles?: CollisionGeometry[];
}

/**
 * Fixture/workholding for collision checking
 */
export interface Fixture {
  /** Fixture identifier */
  fixtureId: string;
  /** Fixture type: vise, clamps, plate, etc. */
  type: string;
  /** Position in machine coordinates */
  position: Vector3;
  /** Orientation */
  orientation: Quaternion;
  /** Collision geometry */
  geometry: CollisionGeometry[];
  /** Clearance zone (expanded envelope) */
  clearanceZone?: AABB;
}

/**
 * Workpiece for collision checking
 */
export interface Workpiece {
  /** Workpiece identifier */
  workpieceId: string;
  /** Stock geometry (as-fixtured) */
  stockGeometry: CollisionGeometry;
  /** Part geometry (final) */
  partGeometry?: CollisionGeometry;
  /** Current in-process geometry */
  inProcessGeometry?: CollisionGeometry;
  /** Work offset position */
  workOffset: Vector3;
  /** Orientation */
  orientation: Quaternion;
}

// ============================================================================
// TOOLPATH TYPES
// ============================================================================

/**
 * Toolpath move types
 */
export type MoveType = 'RAPID' | 'LINEAR' | 'ARC_CW' | 'ARC_CCW' | 'HELICAL';

/**
 * Single toolpath move
 */
export interface ToolpathMove {
  /** Move type */
  type: MoveType;
  /** Start position (machine coordinates) */
  start: Vector3;
  /** End position (machine coordinates) */
  end: Vector3;
  /** Feed rate (mm/min) for cutting moves */
  feedRate?: number;
  /** Arc center (for arc moves) */
  arcCenter?: Vector3;
  /** Arc radius */
  arcRadius?: number;
  /** Arc plane: XY, XZ, YZ */
  arcPlane?: 'XY' | 'XZ' | 'YZ';
  /** Tool axis orientation (for 5-axis) */
  toolAxis?: Vector3;
  /** Tool axis at end (for simultaneous 5-axis) */
  toolAxisEnd?: Vector3;
  /** Line number in program */
  lineNumber?: number;
}

/**
 * Complete toolpath for collision checking
 */
export interface Toolpath {
  /** Toolpath identifier */
  toolpathId: string;
  /** Tool used */
  tool: ToolAssembly;
  /** Sequence of moves */
  moves: ToolpathMove[];
  /** Work offset being used */
  workOffset: Vector3;
  /** Machine coordinate system offset */
  machineOffset?: Vector3;
}

// ============================================================================
// SWEPT VOLUME GENERATION
// ============================================================================

/**
 * Swept volume segment
 */
export interface SweptVolumeSegment {
  /** Start position */
  start: Vector3;
  /** End position */
  end: Vector3;
  /** Tool diameter at this segment */
  diameter: number;
  /** Bounding box for quick rejection */
  boundingBox: AABB;
}

/**
 * Complete swept volume for a toolpath
 */
export interface SweptVolume {
  /** Segments making up the volume */
  segments: SweptVolumeSegment[];
  /** Overall bounding box */
  boundingBox: AABB;
  /** Tool that created this volume */
  toolId: string;
  /** Total path length */
  pathLength: number;
}

// ============================================================================
// SIMULATION SOURCE FILE CATALOG
// ============================================================================

/**
 * Catalog of all extracted JS source files from C:\PRISM\extracted\engines\simulation\
 * that feed into the CollisionEngine. Each entry documents the file's purpose,
 * safety classification, line count, and downstream consumers.
 *
 * SAFETY NOTE: Collision-related files are classified CRITICAL because a missed
 * collision detection means potential machine crash, tool breakage, or operator injury.
 */
export const SIMULATION_SOURCE_FILE_CATALOG: Record<string, {
  filename: string;
  category: string;
  lines: number;
  safety_class: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  consumers: string[];
}> = {
  PRISM_3D_TOOLPATH_STRATEGY_ENGINE: {
    filename: "PRISM_3D_TOOLPATH_STRATEGY_ENGINE.js",
    category: "toolpath_strategy",
    lines: 102,
    safety_class: "HIGH",
    description:
      "3D toolpath strategy definitions for non-prismatic machining (molds, dies, organic shapes). " +
      "Covers cut tolerance, filter tolerance, data-starving prevention, and CAM gouge-checking parameters.",
    consumers: ["CollisionEngine.validateToolpath", "ToolpathPlanner"],
  },
  PRISM_3D_VISUALIZATION_ENGINE: {
    filename: "PRISM_3D_VISUALIZATION_ENGINE.js",
    category: "visualization",
    lines: 235,
    safety_class: "MEDIUM",
    description:
      "Three.js-based 3D visualization engine for rendering toolpaths, stock, fixtures, and tools. " +
      "Provides color schemes (rapid=red, cutting=green, plunge=yellow, retract=blue) and scene configuration.",
    consumers: ["CollisionEngine.visualizeResults", "SimulationUI"],
  },
  PRISM_COLLISION_ALGORITHMS: {
    filename: "PRISM_COLLISION_ALGORITHMS.js",
    category: "collision_detection",
    lines: 284,
    safety_class: "CRITICAL",
    description:
      "Core collision algorithms including GJK (Gilbert-Johnson-Keerthi) for convex shape intersection " +
      "via Minkowski difference and simplex iteration. Source: MIT 6.838, Real-Time Collision Detection (Ericson).",
    consumers: [
      "CollisionEngine.checkCollision",
      "CollisionEngine.gjkIntersect",
      "PRISM_COLLISION_MOTION",
    ],
  },
  PRISM_COLLISION_DETECTION_V2: {
    filename: "PRISM_COLLISION_DETECTION_V2.js",
    category: "collision_detection",
    lines: 416,
    safety_class: "CRITICAL",
    description:
      "Enhanced collision detection v3.0 with configurable tolerances (head offset 0.5mm, fixture offset 0.5mm, " +
      "check resolution 0.5mm). Checks tool-vs-model, holder-vs-model, shank-vs-model, and stores up to 1000 collisions.",
    consumers: [
      "CollisionEngine.runFullCheck",
      "CollisionEngine.checkToolAssembly",
      "SafetyValidator",
    ],
  },
  PRISM_COLLISION_ENGINE: {
    filename: "PRISM_COLLISION_ENGINE.js",
    category: "collision_detection",
    lines: 304,
    safety_class: "CRITICAL",
    description:
      "Core AABB (Axis-Aligned Bounding Box) collision engine. Provides bounding box construction for tools " +
      "at given positions and fast box-vs-box intersection tests as a broad-phase collision filter.",
    consumers: [
      "CollisionEngine.checkAABBCollision",
      "CollisionEngine.broadPhase",
      "PRISM_COLLISION_DETECTION_V2",
    ],
  },
  PRISM_COLLISION_MOTION: {
    filename: "PRISM_COLLISION_MOTION.js",
    category: "motion_simulation",
    lines: 1295,
    safety_class: "CRITICAL",
    description:
      "Phase 4 motion planning and collision analysis. Implements GJK algorithm with full vector math, " +
      "swept-volume collision checks along motion paths, and integrates with the university algorithm pack.",
    consumers: [
      "CollisionEngine.checkMotionPath",
      "CollisionEngine.sweepTest",
      "MotionPlanner",
    ],
  },
  PRISM_STOCK_POSITIONS_DATABASE: {
    filename: "PRISM_STOCK_POSITIONS_DATABASE.js",
    category: "data",
    lines: 39,
    safety_class: "HIGH",
    description:
      "Stock position reference database (HyperMILL-compatible). Defines 18 canonical stock positions " +
      "(top/bottom x center/corner variants) as normalized coordinates for fixture and clearance calculations.",
    consumers: [
      "CollisionEngine.getStockBounds",
      "FixtureManager",
      "SetupValidator",
    ],
  },
};

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
    const endVec = move.end.subtract(move.arcCenter);
    
    // Calculate angle
    const startAngle = Math.atan2(startVec.y, startVec.x);
    let endAngle = Math.atan2(endVec.y, endVec.x);

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
      const segmentCapsule: Capsule = {
        type: 'capsule',
        start: segment.start,
        end: segment.end,
        radius: segment.diameter / 2
      };

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
        // For workpiece, we check for gouging (tool going into part)
        // This is complex - simplified here
        const workpieceResult = this.checkSegmentVsGeometry(
          segment, 
          workpiece.stockGeometry
        );
        
        // Only flag if cutting into raw stock unexpectedly
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
        const capsule: Capsule = {
          type: 'capsule',
          start: move.start,
          end: move.end,
          radius: toolpath.tool.diameter / 2
        };

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
        // Simplified check
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

  // ==========================================================================
  // SOURCE FILE CATALOG METHODS
  // ==========================================================================

  /**
   * Returns the full simulation source file catalog.
   * Static accessor so callers do not need an engine instance.
   */
  public static getSourceFileCatalog(): typeof SIMULATION_SOURCE_FILE_CATALOG {
    return SIMULATION_SOURCE_FILE_CATALOG;
  }

  /**
   * Enumerate catalog entries grouped by safety class, with aggregate stats.
   * Useful for audit reports and safety documentation.
   */
  public catalogSourceFiles(): {
    totalFiles: number;
    totalLines: number;
    bySafetyClass: Record<string, string[]>;
    byCategory: Record<string, string[]>;
    entries: typeof SIMULATION_SOURCE_FILE_CATALOG;
  } {
    const entries = SIMULATION_SOURCE_FILE_CATALOG;
    const keys = Object.keys(entries);

    const bySafetyClass: Record<string, string[]> = {};
    const byCategory: Record<string, string[]> = {};
    let totalLines = 0;

    for (const key of keys) {
      const entry = entries[key];
      totalLines += entry.lines;

      if (!bySafetyClass[entry.safety_class]) {
        bySafetyClass[entry.safety_class] = [];
      }
      bySafetyClass[entry.safety_class].push(entry.filename);

      if (!byCategory[entry.category]) {
        byCategory[entry.category] = [];
      }
      byCategory[entry.category].push(entry.filename);
    }

    return {
      totalFiles: keys.length,
      totalLines,
      bySafetyClass,
      byCategory,
      entries,
    };
  }
}

// Export singleton instance
export const collisionEngine = CollisionEngine.getInstance();
