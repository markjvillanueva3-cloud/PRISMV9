/**
 * PRISM Manufacturing Intelligence - Collision Detection Types
 * Type definitions for collision detection, bounding boxes, tool geometry, and toolpath
 *
 * Extracted from CollisionEngine.ts for cleaner module boundaries
 *
 * @version 1.0.0
 * @module CollisionTypes
 */

import type { Vector3, Quaternion } from './CollisionMath.js';

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
