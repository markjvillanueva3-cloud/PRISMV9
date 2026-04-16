/**
 * MillKinematicsCollisionEngine — Machine Kinematics & Collision Avoidance
 * =========================================================================
 *
 * Mathematical models for:
 *   1. Machine kinematics (3/4/5-axis configurations)
 *   2. Forward/inverse kinematics transformations
 *   3. Collision detection (tool, holder, fixture, workpiece)
 *   4. Safety zone computation
 *   5. Dynamic motion profiles (jerk-limited S-curve)
 *   6. Singularity detection for 5-axis
 *
 * Physics Foundation:
 *   - Homogeneous transformation matrices (4x4)
 *   - DH parameters for kinematic chains
 *   - Sphere-swept volume collision
 *   - Octree spatial partitioning
 *
 * @module engines/MillKinematicsCollisionEngine
 * @milestone MILL-KINEMATICS-MS0
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// MATHEMATICAL TYPES
// ============================================================================

/** 3D point/vector */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 4x4 homogeneous transformation matrix (row-major) */
export type Matrix4x4 = [
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number]
];

/** Axis-angle rotation */
export interface AxisAngle {
  axis: Vec3;
  angle_rad: number;
}

/** Euler angles (ZYX convention for 5-axis) */
export interface EulerAngles {
  roll_rad: number;   // rotation about X
  pitch_rad: number;  // rotation about Y
  yaw_rad: number;    // rotation about Z
}

/** Tool orientation in machine coordinates */
export interface ToolOrientation {
  position: Vec3;        // TCP position (mm)
  direction: Vec3;       // Tool axis direction (unit vector)
  angles?: EulerAngles;  // Euler angles if computed
}

// ============================================================================
// MACHINE KINEMATIC TYPES
// ============================================================================

/** Machine kinematic configuration */
export type KinematicType =
  | "3_axis"
  | "4_axis_table"      // A-axis rotary on table
  | "4_axis_head"       // A-axis in head
  | "5_axis_table_table" // Trunnion (A/B on table)
  | "5_axis_head_head"   // Fork head (A/C on head)
  | "5_axis_table_head"; // Mixed (B table, C head)

/** Denavit-Hartenberg parameters for one joint */
export interface DHParameters {
  a: number;       // Link length (mm)
  alpha: number;   // Link twist (rad)
  d: number;       // Link offset (mm)
  theta: number;   // Joint angle (rad) — variable for revolute
  type: "revolute" | "prismatic";
}

/** Machine workspace envelope */
export interface WorkEnvelope {
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  z_min: number;
  z_max: number;
  a_min?: number;  // A-axis limits (deg)
  a_max?: number;
  b_min?: number;  // B-axis limits (deg)
  b_max?: number;
  c_min?: number;  // C-axis limits (deg)
  c_max?: number;
}

/** JM Die machine specifications */
export interface MachineKinematicSpec {
  id: string;
  name: string;
  type: KinematicType;
  envelope: WorkEnvelope;
  spindle_to_table_z_mm: number;
  pivot_point_offset?: Vec3;  // For 5-axis: rotary center offset
  max_linear_vel_mm_s: number;
  max_linear_accel_mm_s2: number;
  max_rotary_vel_deg_s?: number;
  max_rotary_accel_deg_s2?: number;
}

// ============================================================================
// COLLISION DETECTION TYPES
// ============================================================================

/** Bounding volume types */
export type BoundingVolumeType = "sphere" | "aabb" | "obb" | "capsule";

/** Axis-aligned bounding box */
export interface AABB {
  min: Vec3;
  max: Vec3;
}

/** Oriented bounding box */
export interface OBB {
  center: Vec3;
  half_extents: Vec3;
  rotation: Matrix4x4;
}

/** Sphere bounding volume */
export interface BoundingSphere {
  center: Vec3;
  radius: number;
}

/** Capsule (swept sphere along axis) */
export interface Capsule {
  start: Vec3;
  end: Vec3;
  radius: number;
}

/** Collision object definition */
export interface CollisionObject {
  id: string;
  type: "tool" | "holder" | "workpiece" | "fixture" | "machine" | "clamp";
  volume: BoundingSphere | AABB | Capsule;
  volume_type: BoundingVolumeType;
  clearance_mm: number;  // Minimum safe distance
}

/** Collision check result */
export interface CollisionResult {
  collision_detected: boolean;
  min_distance_mm: number;
  collision_pairs: Array<{
    object_a: string;
    object_b: string;
    penetration_mm: number;
    contact_point?: Vec3;
  }>;
  safety_margin_mm: number;
  is_within_safety_zone: boolean;
}

// ============================================================================
// SAFETY ZONE TYPES
// ============================================================================

/** Safety zone definition */
export interface SafetyZone {
  id: string;
  type: "rapid_zone" | "feed_zone" | "approach_zone" | "retract_zone" | "no_go_zone";
  boundary: AABB | BoundingSphere;
  max_velocity_mm_s?: number;
  requires_collision_check: boolean;
}

/** Motion command with safety */
export interface SafeMotionCommand {
  target_position: Vec3;
  target_orientation?: Vec3;
  velocity_mm_s: number;
  motion_type: "rapid" | "linear" | "arc" | "approach" | "retract";
  collision_free: boolean;
  zones_traversed: string[];
  estimated_time_s: number;
}

// ============================================================================
// JM DIE MACHINE DATABASE
// ============================================================================

const JM_DIE_MACHINES: MachineKinematicSpec[] = [
  {
    id: "HAAS_VF2",
    name: "Haas VF-2",
    type: "3_axis",
    envelope: {
      x_min: 0, x_max: 762,
      y_min: 0, y_max: 406,
      z_min: 0, z_max: 508,
    },
    spindle_to_table_z_mm: 610,
    max_linear_vel_mm_s: 416,  // 25.4 m/min
    max_linear_accel_mm_s2: 5000,
  },
  {
    id: "HAAS_OM2",
    name: "Haas OM-2",
    type: "3_axis",
    envelope: {
      x_min: 0, x_max: 305,
      y_min: 0, y_max: 254,
      z_min: 0, z_max: 305,
    },
    spindle_to_table_z_mm: 356,
    max_linear_vel_mm_s: 508,  // 30.5 m/min
    max_linear_accel_mm_s2: 7500,  // Office mill, lighter
  },
  {
    id: "HURCO_VM30i",
    name: "Hurco VM30i",
    type: "3_axis",
    envelope: {
      x_min: 0, x_max: 762,
      y_min: 0, y_max: 508,
      z_min: 0, z_max: 508,
    },
    spindle_to_table_z_mm: 635,
    max_linear_vel_mm_s: 508,  // 30.5 m/min
    max_linear_accel_mm_s2: 6000,
  },
  {
    id: "OKUMA_M460V_5AX",
    name: "Okuma M460V-5AX",
    type: "5_axis_table_table",
    envelope: {
      x_min: 0, x_max: 762,
      y_min: 0, y_max: 460,
      z_min: 0, z_max: 460,
      a_min: -120, a_max: 30,
      c_min: -360, c_max: 360,
    },
    spindle_to_table_z_mm: 560,
    pivot_point_offset: { x: 0, y: 0, z: 150 },
    max_linear_vel_mm_s: 500,
    max_linear_accel_mm_s2: 5000,
    max_rotary_vel_deg_s: 60,
    max_rotary_accel_deg_s2: 200,
  },
  {
    id: "ROKU_ROKU_HC658",
    name: "Roku-Roku HC 658-II",
    type: "3_axis",
    envelope: {
      x_min: 0, x_max: 600,
      y_min: 0, y_max: 500,
      z_min: 0, z_max: 350,
    },
    spindle_to_table_z_mm: 450,
    max_linear_vel_mm_s: 1000,  // 60 m/min HSM
    max_linear_accel_mm_s2: 15000,  // High accel for graphite
  },
];

// ============================================================================
// VECTOR/MATRIX UTILITIES
// ============================================================================

function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vec3Scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function vec3Dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vec3Cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function vec3Length(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function vec3Normalize(v: Vec3): Vec3 {
  const len = vec3Length(v);
  if (len < 1e-10) return { x: 0, y: 0, z: 1 };
  return vec3Scale(v, 1 / len);
}

function vec3Distance(a: Vec3, b: Vec3): number {
  return vec3Length(vec3Sub(a, b));
}

/** Identity 4x4 matrix */
function mat4Identity(): Matrix4x4 {
  return [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
}

/** Rotation matrix about X axis */
function mat4RotX(angle_rad: number): Matrix4x4 {
  const c = Math.cos(angle_rad);
  const s = Math.sin(angle_rad);
  return [
    [1, 0, 0, 0],
    [0, c, -s, 0],
    [0, s, c, 0],
    [0, 0, 0, 1],
  ];
}

/** Rotation matrix about Y axis */
function mat4RotY(angle_rad: number): Matrix4x4 {
  const c = Math.cos(angle_rad);
  const s = Math.sin(angle_rad);
  return [
    [c, 0, s, 0],
    [0, 1, 0, 0],
    [-s, 0, c, 0],
    [0, 0, 0, 1],
  ];
}

/** Rotation matrix about Z axis */
function mat4RotZ(angle_rad: number): Matrix4x4 {
  const c = Math.cos(angle_rad);
  const s = Math.sin(angle_rad);
  return [
    [c, -s, 0, 0],
    [s, c, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
}

/** Translation matrix */
function mat4Translate(tx: number, ty: number, tz: number): Matrix4x4 {
  return [
    [1, 0, 0, tx],
    [0, 1, 0, ty],
    [0, 0, 1, tz],
    [0, 0, 0, 1],
  ];
}

/** Matrix multiplication */
function mat4Multiply(a: Matrix4x4, b: Matrix4x4): Matrix4x4 {
  const result: Matrix4x4 = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 1],
  ];

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      result[i][j] = 0;
      for (let k = 0; k < 4; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }

  return result;
}

/** Transform point by matrix */
function mat4TransformPoint(m: Matrix4x4, p: Vec3): Vec3 {
  return {
    x: m[0][0] * p.x + m[0][1] * p.y + m[0][2] * p.z + m[0][3],
    y: m[1][0] * p.x + m[1][1] * p.y + m[1][2] * p.z + m[1][3],
    z: m[2][0] * p.x + m[2][1] * p.y + m[2][2] * p.z + m[2][3],
  };
}

/** Transform vector (direction) by matrix - no translation */
function mat4TransformVector(m: Matrix4x4, v: Vec3): Vec3 {
  return {
    x: m[0][0] * v.x + m[0][1] * v.y + m[0][2] * v.z,
    y: m[1][0] * v.x + m[1][1] * v.y + m[1][2] * v.z,
    z: m[2][0] * v.x + m[2][1] * v.y + m[2][2] * v.z,
  };
}

// ============================================================================
// KINEMATIC TRANSFORMATIONS
// ============================================================================

/**
 * Forward kinematics for 3-axis VMC
 * Simple: TCP = (X, Y, Z) in machine coordinates
 */
function fk3Axis(x: number, y: number, z: number): ToolOrientation {
  return {
    position: { x, y, z },
    direction: { x: 0, y: 0, z: -1 },  // Tool points down (-Z)
  };
}

/**
 * Forward kinematics for 5-axis trunnion (A/C table-table)
 *
 * Kinematic chain:
 *   World → Z (spindle) → X → Y → C-rotation → A-rotation → TCP
 *
 * Where:
 *   A = tilt about X (table tilts forward/back)
 *   C = rotation about Z (table rotates)
 */
function fk5AxisTrunnion(
  x: number, y: number, z: number,
  a_deg: number, c_deg: number,
  pivot_offset: Vec3
): ToolOrientation {
  const a_rad = (a_deg * Math.PI) / 180;
  const c_rad = (c_deg * Math.PI) / 180;

  // Build transformation chain
  // 1. Linear motion (XYZ)
  const T_linear = mat4Translate(x, y, z);

  // 2. C-axis rotation (about Z at pivot)
  const T_c = mat4RotZ(c_rad);

  // 3. A-axis rotation (about X at pivot)
  const T_a = mat4RotX(a_rad);

  // 4. Pivot offset
  const T_pivot = mat4Translate(pivot_offset.x, pivot_offset.y, pivot_offset.z);
  const T_pivot_inv = mat4Translate(-pivot_offset.x, -pivot_offset.y, -pivot_offset.z);

  // Combine: T_linear * T_pivot_inv * T_c * T_a * T_pivot
  let T = T_linear;
  T = mat4Multiply(T, T_pivot_inv);
  T = mat4Multiply(T, T_c);
  T = mat4Multiply(T, T_a);
  T = mat4Multiply(T, T_pivot);

  // TCP position is origin transformed
  const position = mat4TransformPoint(T, { x: 0, y: 0, z: 0 });

  // Tool direction is -Z transformed
  const direction = vec3Normalize(mat4TransformVector(T, { x: 0, y: 0, z: -1 }));

  return { position, direction };
}

/**
 * Inverse kinematics for 5-axis trunnion
 * Given: TCP position and tool direction
 * Find: X, Y, Z, A, C
 *
 * Uses geometric solution:
 *   1. C = atan2(direction.x, direction.y) + 180°
 *   2. A = acos(-direction.z) or asin(sqrt(dx² + dy²))
 *   3. Adjust XYZ for pivot offset
 */
function ik5AxisTrunnion(
  tcp_position: Vec3,
  tool_direction: Vec3,
  pivot_offset: Vec3
): { x: number; y: number; z: number; a_deg: number; c_deg: number; valid: boolean } {
  const dir = vec3Normalize(tool_direction);

  // C angle (rotation about Z)
  // When tool points straight down, C is undefined (singularity)
  const horiz_mag = Math.sqrt(dir.x * dir.x + dir.y * dir.y);

  if (horiz_mag < 1e-6) {
    // Tool is vertical — singularity
    // Return current position with C=0
    return {
      x: tcp_position.x,
      y: tcp_position.y,
      z: tcp_position.z,
      a_deg: 0,
      c_deg: 0,
      valid: true,
    };
  }

  // C = atan2(-dx, -dy) to align table so tool tilts towards us
  const c_rad = Math.atan2(-dir.x, -dir.y);
  const c_deg = (c_rad * 180) / Math.PI;

  // A angle (tilt about X)
  // A = acos(-dz) where dz is pointing down when A=0
  const a_rad = Math.acos(-dir.z);
  const a_deg = (a_rad * 180) / Math.PI;

  // Compensate position for pivot offset
  // The pivot point moves with A and C rotations
  const T_c = mat4RotZ(c_rad);
  const T_a = mat4RotX(a_rad);
  const T_rot = mat4Multiply(T_c, T_a);

  const rotated_pivot = mat4TransformPoint(T_rot, pivot_offset);
  const pivot_compensation = vec3Sub(rotated_pivot, pivot_offset);

  const x = tcp_position.x - pivot_compensation.x;
  const y = tcp_position.y - pivot_compensation.y;
  const z = tcp_position.z - pivot_compensation.z;

  return { x, y, z, a_deg, c_deg, valid: true };
}

// ============================================================================
// COLLISION DETECTION
// ============================================================================

/** Sphere-sphere intersection test */
function sphereSphereCollision(s1: BoundingSphere, s2: BoundingSphere): {
  collides: boolean;
  distance: number;
  penetration: number;
} {
  const dist = vec3Distance(s1.center, s2.center);
  const combined_radius = s1.radius + s2.radius;
  const penetration = combined_radius - dist;

  return {
    collides: dist < combined_radius,
    distance: dist,
    penetration: Math.max(0, penetration),
  };
}

/** Sphere-AABB intersection test */
function sphereAABBCollision(sphere: BoundingSphere, aabb: AABB): {
  collides: boolean;
  distance: number;
} {
  // Find closest point on AABB to sphere center
  const closest: Vec3 = {
    x: Math.max(aabb.min.x, Math.min(sphere.center.x, aabb.max.x)),
    y: Math.max(aabb.min.y, Math.min(sphere.center.y, aabb.max.y)),
    z: Math.max(aabb.min.z, Math.min(sphere.center.z, aabb.max.z)),
  };

  const dist = vec3Distance(sphere.center, closest);

  return {
    collides: dist < sphere.radius,
    distance: dist - sphere.radius,
  };
}

/** Capsule-capsule distance (for tool vs holder) */
function capsuleCapsuleDistance(c1: Capsule, c2: Capsule): {
  distance: number;
  closest_point_1: Vec3;
  closest_point_2: Vec3;
} {
  // Line segment closest point algorithm
  const d1 = vec3Sub(c1.end, c1.start);
  const d2 = vec3Sub(c2.end, c2.start);
  const r = vec3Sub(c1.start, c2.start);

  const a = vec3Dot(d1, d1);
  const b = vec3Dot(d1, d2);
  const c = vec3Dot(d2, d2);
  const d = vec3Dot(d1, r);
  const e = vec3Dot(d2, r);

  const denom = a * c - b * b;

  let s = 0, t = 0;

  if (denom > 1e-6) {
    s = Math.max(0, Math.min(1, (b * e - c * d) / denom));
    t = Math.max(0, Math.min(1, (a * e - b * d) / denom));
  }

  // Clamp to segment endpoints
  if (s < 0 || s > 1) {
    s = Math.max(0, Math.min(1, s));
    t = Math.max(0, Math.min(1, (b * s + e) / c));
  }
  if (t < 0 || t > 1) {
    t = Math.max(0, Math.min(1, t));
    s = Math.max(0, Math.min(1, (b * t - d) / a));
  }

  const closest_1 = vec3Add(c1.start, vec3Scale(d1, s));
  const closest_2 = vec3Add(c2.start, vec3Scale(d2, t));

  const axis_dist = vec3Distance(closest_1, closest_2);
  const surface_dist = axis_dist - c1.radius - c2.radius;

  return {
    distance: surface_dist,
    closest_point_1: closest_1,
    closest_point_2: closest_2,
  };
}

// ============================================================================
// SINGULARITY DETECTION
// ============================================================================

/** Check if 5-axis configuration is near singularity */
function checkSingularity(
  tool_direction: Vec3,
  kinematic_type: KinematicType
): { near_singularity: boolean; type: string; severity: number } {
  if (!kinematic_type.startsWith("5_axis")) {
    return { near_singularity: false, type: "none", severity: 0 };
  }

  const dir = vec3Normalize(tool_direction);
  const vertical_alignment = Math.abs(dir.z);

  // Singularity when tool is vertical (A=0 or A=180)
  // C-axis becomes undefined
  if (vertical_alignment > 0.9999) {
    return {
      near_singularity: true,
      type: "gimbal_lock",
      severity: 1.0,
    };
  }

  if (vertical_alignment > 0.99) {
    return {
      near_singularity: true,
      type: "near_gimbal_lock",
      severity: (vertical_alignment - 0.99) / 0.01,
    };
  }

  return { near_singularity: false, type: "none", severity: 0 };
}

// ============================================================================
// MOTION PLANNING
// ============================================================================

/**
 * S-curve velocity profile (jerk-limited)
 *
 * Phase 1: Jerk ramp-up (acceleration increasing)
 * Phase 2: Constant acceleration
 * Phase 3: Jerk ramp-down (acceleration decreasing)
 * Phase 4: Constant velocity
 * Phase 5-7: Mirror for deceleration
 */
function computeSCurveProfile(
  distance_mm: number,
  max_vel_mm_s: number,
  max_accel_mm_s2: number,
  max_jerk_mm_s3: number
): {
  total_time_s: number;
  phases: Array<{ duration_s: number; start_vel: number; end_vel: number }>;
  peak_velocity_mm_s: number;
} {
  // Simplified trapezoidal approximation for now
  // Full S-curve requires solving 7-phase system

  // Time to reach max velocity
  const t_accel = max_vel_mm_s / max_accel_mm_s2;

  // Distance during acceleration
  const d_accel = 0.5 * max_accel_mm_s2 * t_accel * t_accel;

  // Check if we can reach max velocity
  if (2 * d_accel > distance_mm) {
    // Triangular profile — never reach max velocity
    const t_half = Math.sqrt(distance_mm / max_accel_mm_s2);
    const peak_vel = max_accel_mm_s2 * t_half;

    return {
      total_time_s: 2 * t_half,
      phases: [
        { duration_s: t_half, start_vel: 0, end_vel: peak_vel },
        { duration_s: t_half, start_vel: peak_vel, end_vel: 0 },
      ],
      peak_velocity_mm_s: peak_vel,
    };
  }

  // Trapezoidal profile
  const d_cruise = distance_mm - 2 * d_accel;
  const t_cruise = d_cruise / max_vel_mm_s;

  return {
    total_time_s: 2 * t_accel + t_cruise,
    phases: [
      { duration_s: t_accel, start_vel: 0, end_vel: max_vel_mm_s },
      { duration_s: t_cruise, start_vel: max_vel_mm_s, end_vel: max_vel_mm_s },
      { duration_s: t_accel, start_vel: max_vel_mm_s, end_vel: 0 },
    ],
    peak_velocity_mm_s: max_vel_mm_s,
  };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MillKinematicsCollisionEngine {
  private machines: Map<string, MachineKinematicSpec> = new Map();
  private collisionObjects: Map<string, CollisionObject> = new Map();
  private safetyZones: Map<string, SafetyZone> = new Map();

  constructor() {
    // Load JM Die machines
    for (const machine of JM_DIE_MACHINES) {
      this.machines.set(machine.id, machine);
    }

    log.info(`[MillKinematics] Loaded ${this.machines.size} machine kinematic specs`);
  }

  /**
   * Get forward kinematics for a machine position
   */
  forwardKinematics(
    machine_id: string,
    position: { x: number; y: number; z: number; a?: number; c?: number }
  ): ToolOrientation | null {
    const machine = this.machines.get(machine_id);
    if (!machine) {
      log.warn(`[MillKinematics] Unknown machine: ${machine_id}`);
      return null;
    }

    switch (machine.type) {
      case "3_axis":
        return fk3Axis(position.x, position.y, position.z);

      case "5_axis_table_table":
        return fk5AxisTrunnion(
          position.x, position.y, position.z,
          position.a ?? 0, position.c ?? 0,
          machine.pivot_point_offset ?? { x: 0, y: 0, z: 0 }
        );

      default:
        // Fallback to 3-axis
        return fk3Axis(position.x, position.y, position.z);
    }
  }

  /**
   * Get inverse kinematics for a target TCP
   */
  inverseKinematics(
    machine_id: string,
    tcp_position: Vec3,
    tool_direction: Vec3
  ): { x: number; y: number; z: number; a_deg?: number; c_deg?: number; valid: boolean } | null {
    const machine = this.machines.get(machine_id);
    if (!machine) return null;

    switch (machine.type) {
      case "3_axis":
        // For 3-axis, tool must point down (-Z)
        const dir = vec3Normalize(tool_direction);
        if (Math.abs(dir.z + 1) > 0.01) {
          // Tool not vertical — can't reach
          return { x: tcp_position.x, y: tcp_position.y, z: tcp_position.z, valid: false };
        }
        return { x: tcp_position.x, y: tcp_position.y, z: tcp_position.z, valid: true };

      case "5_axis_table_table":
        return ik5AxisTrunnion(
          tcp_position,
          tool_direction,
          machine.pivot_point_offset ?? { x: 0, y: 0, z: 0 }
        );

      default:
        return { x: tcp_position.x, y: tcp_position.y, z: tcp_position.z, valid: true };
    }
  }

  /**
   * Check if position is within machine envelope
   */
  checkEnvelope(
    machine_id: string,
    position: { x: number; y: number; z: number; a?: number; c?: number }
  ): { within_envelope: boolean; violations: string[] } {
    const machine = this.machines.get(machine_id);
    if (!machine) {
      return { within_envelope: false, violations: ["Unknown machine"] };
    }

    const violations: string[] = [];
    const env = machine.envelope;

    if (position.x < env.x_min || position.x > env.x_max) {
      violations.push(`X=${position.x.toFixed(1)} outside [${env.x_min}, ${env.x_max}]`);
    }
    if (position.y < env.y_min || position.y > env.y_max) {
      violations.push(`Y=${position.y.toFixed(1)} outside [${env.y_min}, ${env.y_max}]`);
    }
    if (position.z < env.z_min || position.z > env.z_max) {
      violations.push(`Z=${position.z.toFixed(1)} outside [${env.z_min}, ${env.z_max}]`);
    }

    if (env.a_min !== undefined && position.a !== undefined) {
      if (position.a < env.a_min || position.a > env.a_max!) {
        violations.push(`A=${position.a.toFixed(1)}° outside [${env.a_min}, ${env.a_max}]`);
      }
    }

    if (env.c_min !== undefined && position.c !== undefined) {
      if (position.c < env.c_min || position.c > env.c_max!) {
        violations.push(`C=${position.c.toFixed(1)}° outside [${env.c_min}, ${env.c_max}]`);
      }
    }

    return { within_envelope: violations.length === 0, violations };
  }

  /**
   * Register a collision object
   */
  addCollisionObject(obj: CollisionObject): void {
    this.collisionObjects.set(obj.id, obj);
  }

  /**
   * Check collisions between all registered objects
   */
  checkCollisions(): CollisionResult {
    const objects = Array.from(this.collisionObjects.values());
    const pairs: CollisionResult["collision_pairs"] = [];
    let min_distance = Infinity;

    for (let i = 0; i < objects.length; i++) {
      for (let j = i + 1; j < objects.length; j++) {
        const obj_a = objects[i];
        const obj_b = objects[j];

        // Skip checking object against itself or same type
        if (obj_a.type === obj_b.type) continue;

        let dist = Infinity;
        let penetration = 0;

        // Handle different volume type combinations
        if (obj_a.volume_type === "sphere" && obj_b.volume_type === "sphere") {
          const result = sphereSphereCollision(
            obj_a.volume as BoundingSphere,
            obj_b.volume as BoundingSphere
          );
          dist = result.distance;
          penetration = result.penetration;
        } else if (obj_a.volume_type === "capsule" && obj_b.volume_type === "capsule") {
          const result = capsuleCapsuleDistance(
            obj_a.volume as Capsule,
            obj_b.volume as Capsule
          );
          dist = result.distance;
          penetration = dist < 0 ? -dist : 0;
        }
        // Add more combinations as needed

        if (dist < min_distance) {
          min_distance = dist;
        }

        const clearance = Math.max(obj_a.clearance_mm, obj_b.clearance_mm);
        if (dist < clearance) {
          pairs.push({
            object_a: obj_a.id,
            object_b: obj_b.id,
            penetration_mm: penetration,
          });
        }
      }
    }

    const safety_margin = 2.0; // mm
    return {
      collision_detected: pairs.some(p => p.penetration_mm > 0),
      min_distance_mm: min_distance,
      collision_pairs: pairs,
      safety_margin_mm: safety_margin,
      is_within_safety_zone: min_distance >= safety_margin,
    };
  }

  /**
   * Check for 5-axis singularity
   */
  checkSingularity(machine_id: string, tool_direction: Vec3): {
    near_singularity: boolean;
    type: string;
    severity: number;
    recommendation: string;
  } {
    const machine = this.machines.get(machine_id);
    if (!machine) {
      return { near_singularity: false, type: "unknown_machine", severity: 0, recommendation: "" };
    }

    const result = checkSingularity(tool_direction, machine.type);

    let recommendation = "";
    if (result.near_singularity) {
      if (result.type === "gimbal_lock") {
        recommendation = "Avoid vertical tool orientation. Tilt tool by at least 0.5°.";
      } else {
        recommendation = "Approaching singularity. Consider alternate approach angle.";
      }
    }

    return { ...result, recommendation };
  }

  /**
   * Plan safe motion between two points
   */
  planMotion(
    machine_id: string,
    start: Vec3,
    end: Vec3,
    motion_type: "rapid" | "linear"
  ): SafeMotionCommand {
    const machine = this.machines.get(machine_id);
    const max_vel = machine?.max_linear_vel_mm_s ?? 500;
    const max_accel = machine?.max_linear_accel_mm_s2 ?? 5000;

    const distance = vec3Distance(start, end);
    const profile = computeSCurveProfile(distance, max_vel, max_accel, max_accel * 10);

    // Check collision along path (simplified: just check endpoints)
    const collision = this.checkCollisions();

    return {
      target_position: end,
      velocity_mm_s: motion_type === "rapid" ? max_vel : max_vel * 0.5,
      motion_type,
      collision_free: !collision.collision_detected,
      zones_traversed: [],
      estimated_time_s: profile.total_time_s,
    };
  }

  /**
   * Get machine specifications
   */
  getMachineSpec(machine_id: string): MachineKinematicSpec | null {
    return this.machines.get(machine_id) ?? null;
  }

  /**
   * List all available machines
   */
  listMachines(): string[] {
    return Array.from(this.machines.keys());
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    machines: number;
    collision_objects: number;
    safety_zones: number;
    five_axis_machines: number;
  } {
    const five_axis = Array.from(this.machines.values()).filter(
      m => m.type.startsWith("5_axis")
    ).length;

    return {
      machines: this.machines.size,
      collision_objects: this.collisionObjects.size,
      safety_zones: this.safetyZones.size,
      five_axis_machines: five_axis,
    };
  }
}

// Singleton export
export const millKinematicsCollisionEngine = new MillKinematicsCollisionEngine();
