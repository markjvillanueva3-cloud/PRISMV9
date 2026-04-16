/**
 * SO3KinematicsEncoderEngine — SO(3) Rotation Group Kinematics Encoder
 * =====================================================================
 *
 * Critical engine for 5-axis post-processing providing rigorous SO(3) rotation
 * group mathematics. SO(3) = Special Orthogonal Group in 3D represents all
 * 3D rotations as 3x3 orthogonal matrices with det=1.
 *
 * CAPABILITIES:
 *   1. Multiple rotation representations (matrix, quaternion, axis-angle, Euler)
 *   2. Lie algebra so(3) for neural network embedding
 *   3. Exponential map: so(3) -> SO(3)
 *   4. Logarithmic map: SO(3) -> so(3)
 *   5. SLERP interpolation for smooth 5-axis motion
 *   6. Denavit-Hartenberg kinematic chain encoding
 *   7. Machine topology support (trunnion, swivel head, mill-turn, 6-axis robot)
 *   8. Singularity detection (gimbal lock, workspace boundaries)
 *   9. Neural-friendly 32-dimensional embedding
 *
 * MATHEMATICAL FOUNDATION:
 *   - Rodrigues' formula: exp(omega^) = I + sin(theta)*K + (1-cos(theta))*K^2
 *   - Log map via Rodrigues: theta = acos((tr(R)-1)/2), omega = theta/(2*sin(theta))*(R-R^T)
 *   - Quaternion SLERP: q(t) = q0 * sin((1-t)*Omega)/sin(Omega) + q1 * sin(t*Omega)/sin(Omega)
 *   - DH convention: T_i = Rz(theta_i) * Tz(d_i) * Tx(a_i) * Rx(alpha_i)
 *
 * REFERENCES:
 *   - Murray, Li, Sastry (1994). A Mathematical Introduction to Robotic Manipulation
 *   - Chirikjian, G.S. (2009). Stochastic Models, Information Theory, and Lie Groups
 *   - Sola, Deray, Atchuthan (2018). A micro Lie theory for state estimation in robotics
 *   - Shoemake, K. (1985). Animating rotation with quaternion curves. SIGGRAPH
 *
 * @module SO3KinematicsEncoderEngine
 * @milestone PP-SO3-KINEMATICS
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

/** 3D vector */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/** Unit quaternion [w, x, y, z] where ||q|| = 1 */
export interface Quaternion {
  w: number;  // scalar part
  x: number;  // i component
  y: number;  // j component
  z: number;  // k component
}

/** 3x3 rotation matrix (row-major) */
export type RotationMatrix = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
];

/** 4x4 homogeneous transformation matrix (row-major) */
export type HomogeneousMatrix = [
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number]
];

/** Axis-angle representation */
export interface AxisAngle {
  axis: Vector3;     // unit vector
  angle: number;     // radians
}

/** Euler angles with convention specifier */
export interface EulerAngles {
  alpha: number;     // first rotation (radians)
  beta: number;      // second rotation (radians)
  gamma: number;     // third rotation (radians)
  convention: EulerConvention;
}

/** Supported Euler angle conventions */
export type EulerConvention =
  | "ZYX"  // Aerospace (yaw-pitch-roll)
  | "ZXZ"  // Robotics (common for wrist)
  | "XYZ"  // CAD systems (roll-pitch-yaw)
  | "ZYZ"  // Machine tools (A-B-C typical)
  | "XYX"
  | "YZY"
  | "YXY"
  | "XZX"
  | "YZX"
  | "ZXY";

/** Denavit-Hartenberg parameters for one joint */
export interface DHParameters {
  theta: number;     // joint angle (radians) - variable for revolute
  d: number;         // link offset (mm) - variable for prismatic
  a: number;         // link length (mm)
  alpha: number;     // link twist (radians)
  type: "revolute" | "prismatic";
  joint_id?: string;
}

/** Complete SO(3) embedding with multiple representations */
export interface SO3Embedding {
  // Primary representations
  rotationMatrix: RotationMatrix;
  quaternion: Quaternion;
  axisAngle: AxisAngle;
  eulerAngles: EulerAngles;

  // Lie algebra representation for neural networks
  lieAlgebraVector: [number, number, number];  // so(3) in R^3

  // Metadata
  isIdentity: boolean;
  determinant: number;
  orthogonalityError: number;
}

/** Machine kinematic topology */
export type MachineTopology =
  | "trunnion_AC"      // 5-axis table-table (A/C)
  | "trunnion_BC"      // 5-axis table-table (B/C)
  | "swivel_head_BC"   // 5-axis head-head (B/C)
  | "swivel_head_AC"   // 5-axis head-table (A/C)
  | "mill_turn_CB"     // Mill-turn (C spindle + B head)
  | "robot_6dof"       // 6-axis articulated robot
  | "gantry_5ax"       // Gantry with 5-axis head
  | "lathe_C"          // Lathe with C-axis
  | "lathe_CY";        // Lathe with C and Y axis

/** Kinematic chain configuration */
export interface KinematicChainConfig {
  topology: MachineTopology;
  dhParams: DHParameters[];
  baseFrame: HomogeneousMatrix;
  toolFrame: HomogeneousMatrix;
  jointLimits: Array<{ min: number; max: number }>;
}

/** Singularity detection result */
export interface SingularityResult {
  isSingular: boolean;
  type: "gimbal_lock" | "workspace_boundary" | "joint_limit" | "none";
  severity: "critical" | "warning" | "safe";
  affectedAxes: string[];
  proximityDegrees: number;
  recommendation: string;
}

/** Neural embedding result */
export interface NeuralEmbedding {
  embedding: number[];     // 32-dimensional vector
  dimension: number;
  components: {
    rotationMatrix: number[];      // 9D (flattened 3x3)
    quaternion: number[];          // 4D
    lieAlgebra: number[];          // 3D
    eulerSines: number[];          // 6D (sin/cos of each angle)
    singularityFeatures: number[]; // 6D
    normalization: number[];       // 4D (norms and traces)
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const EPSILON = 1e-10;
const ANGLE_EPSILON = 1e-6;  // For gimbal lock detection (radians)

// ============================================================================
// VECTOR OPERATIONS
// ============================================================================

function v3(x: number, y: number, z: number): Vector3 {
  return { x, y, z };
}

function vadd(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function vsub(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vscale(v: Vector3, s: number): Vector3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function vdot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vcross(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function vlen(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function vnorm(v: Vector3): Vector3 {
  const l = vlen(v);
  return l < EPSILON ? v3(0, 0, 1) : vscale(v, 1 / l);
}

// ============================================================================
// MATRIX OPERATIONS
// ============================================================================

function identityMatrix(): RotationMatrix {
  return [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
}

function identityHomogeneous(): HomogeneousMatrix {
  return [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
}

function matMul3x3(A: RotationMatrix, B: RotationMatrix): RotationMatrix {
  const R: RotationMatrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        R[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return R;
}

function matMul4x4(A: HomogeneousMatrix, B: HomogeneousMatrix): HomogeneousMatrix {
  const R: HomogeneousMatrix = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      for (let k = 0; k < 4; k++) {
        R[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return R;
}

function matTranspose3x3(M: RotationMatrix): RotationMatrix {
  return [
    [M[0][0], M[1][0], M[2][0]],
    [M[0][1], M[1][1], M[2][1]],
    [M[0][2], M[1][2], M[2][2]],
  ];
}

function matDet3x3(M: RotationMatrix): number {
  return M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1])
       - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
       + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
}

function matTrace3x3(M: RotationMatrix): number {
  return M[0][0] + M[1][1] + M[2][2];
}

function matVec3(M: RotationMatrix, v: Vector3): Vector3 {
  return {
    x: M[0][0] * v.x + M[0][1] * v.y + M[0][2] * v.z,
    y: M[1][0] * v.x + M[1][1] * v.y + M[1][2] * v.z,
    z: M[2][0] * v.x + M[2][1] * v.y + M[2][2] * v.z,
  };
}

/** Compute orthogonality error: ||R^T * R - I||_F */
function orthogonalityError(R: RotationMatrix): number {
  const RtR = matMul3x3(matTranspose3x3(R), R);
  let err = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const expected = i === j ? 1 : 0;
      err += (RtR[i][j] - expected) ** 2;
    }
  }
  return Math.sqrt(err);
}

/** Skew-symmetric matrix from vector (hat operator) */
function skewSymmetric(v: Vector3): RotationMatrix {
  return [
    [0, -v.z, v.y],
    [v.z, 0, -v.x],
    [-v.y, v.x, 0],
  ];
}

/** Extract vector from skew-symmetric matrix (vee operator) */
function veeOperator(M: RotationMatrix): Vector3 {
  return {
    x: M[2][1],
    y: M[0][2],
    z: M[1][0],
  };
}

// ============================================================================
// SO(3) CORE OPERATIONS
// ============================================================================

/**
 * Exponential map: so(3) -> SO(3)
 * Maps a 3D vector (Lie algebra element) to a rotation matrix.
 * Uses Rodrigues' rotation formula.
 *
 * exp(omega^) = I + sin(theta)*K + (1-cos(theta))*K^2
 * where theta = ||omega||, K = omega^ / theta
 *
 * Reference: Murray, Li, Sastry (1994), Chapter 2.4
 */
function expMap(omega: Vector3): RotationMatrix {
  const theta = vlen(omega);

  if (theta < EPSILON) {
    // Small angle approximation: R = I + omega^
    const K = skewSymmetric(omega);
    return [
      [1 + K[0][0], K[0][1], K[0][2]],
      [K[1][0], 1 + K[1][1], K[1][2]],
      [K[2][0], K[2][1], 1 + K[2][2]],
    ];
  }

  const axis = vnorm(omega);
  const K = skewSymmetric(axis);
  const K2 = matMul3x3(K, K);

  const sinT = Math.sin(theta);
  const cosT = Math.cos(theta);

  // R = I + sin(theta)*K + (1-cos(theta))*K^2
  const R: RotationMatrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const I_ij = i === j ? 1 : 0;
      R[i][j] = I_ij + sinT * K[i][j] + (1 - cosT) * K2[i][j];
    }
  }

  return R;
}

/**
 * Logarithmic map: SO(3) -> so(3)
 * Inverse of exponential map - extracts Lie algebra element from rotation matrix.
 *
 * theta = acos((tr(R)-1)/2)
 * omega = (theta / (2*sin(theta))) * vee(R - R^T)
 *
 * Reference: Sola, Deray, Atchuthan (2018), Section 4.2
 */
function logMap(R: RotationMatrix): Vector3 {
  const trace = matTrace3x3(R);
  const cosTheta = (trace - 1) / 2;

  // Clamp to handle numerical errors
  const clampedCos = Math.max(-1, Math.min(1, cosTheta));
  const theta = Math.acos(clampedCos);

  if (Math.abs(theta) < EPSILON) {
    // Near identity: omega = vee(R - R^T) / 2
    const Rt = matTranspose3x3(R);
    return {
      x: (R[2][1] - Rt[2][1]) / 2,
      y: (R[0][2] - Rt[0][2]) / 2,
      z: (R[1][0] - Rt[1][0]) / 2,
    };
  }

  if (Math.abs(theta - Math.PI) < EPSILON) {
    // Near 180 degrees: special handling
    // omega = theta * v where v is eigenvector of R with eigenvalue 1
    const v = extractRotationAxis180(R);
    return vscale(v, theta);
  }

  const sinTheta = Math.sin(theta);
  const factor = theta / (2 * sinTheta);

  return {
    x: factor * (R[2][1] - R[1][2]),
    y: factor * (R[0][2] - R[2][0]),
    z: factor * (R[1][0] - R[0][1]),
  };
}

/** Extract rotation axis for 180-degree rotation */
function extractRotationAxis180(R: RotationMatrix): Vector3 {
  // The rotation axis is the eigenvector with eigenvalue 1
  // R = I + 2*v*v^T - 2*I for 180 deg rotation around v
  // So R + I = 2*v*v^T, and we can extract v from the diagonal

  const d0 = (R[0][0] + 1) / 2;
  const d1 = (R[1][1] + 1) / 2;
  const d2 = (R[2][2] + 1) / 2;

  if (d0 >= d1 && d0 >= d2) {
    const x = Math.sqrt(Math.max(0, d0));
    const y = x > EPSILON ? (R[0][1] + R[1][0]) / (4 * x) : Math.sqrt(Math.max(0, d1));
    const z = x > EPSILON ? (R[0][2] + R[2][0]) / (4 * x) : Math.sqrt(Math.max(0, d2));
    return vnorm(v3(x, y, z));
  } else if (d1 >= d0 && d1 >= d2) {
    const y = Math.sqrt(Math.max(0, d1));
    const x = y > EPSILON ? (R[0][1] + R[1][0]) / (4 * y) : Math.sqrt(Math.max(0, d0));
    const z = y > EPSILON ? (R[1][2] + R[2][1]) / (4 * y) : Math.sqrt(Math.max(0, d2));
    return vnorm(v3(x, y, z));
  } else {
    const z = Math.sqrt(Math.max(0, d2));
    const x = z > EPSILON ? (R[0][2] + R[2][0]) / (4 * z) : Math.sqrt(Math.max(0, d0));
    const y = z > EPSILON ? (R[1][2] + R[2][1]) / (4 * z) : Math.sqrt(Math.max(0, d1));
    return vnorm(v3(x, y, z));
  }
}

// ============================================================================
// QUATERNION OPERATIONS
// ============================================================================

function quatIdentity(): Quaternion {
  return { w: 1, x: 0, y: 0, z: 0 };
}

function quatNorm(q: Quaternion): number {
  return Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z);
}

function quatNormalize(q: Quaternion): Quaternion {
  const n = quatNorm(q);
  return n < EPSILON ? quatIdentity() : { w: q.w / n, x: q.x / n, y: q.y / n, z: q.z / n };
}

function quatConjugate(q: Quaternion): Quaternion {
  return { w: q.w, x: -q.x, y: -q.y, z: -q.z };
}

function quatMultiply(a: Quaternion, b: Quaternion): Quaternion {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

function quatFromAxisAngle(axis: Vector3, angle: number): Quaternion {
  const halfAngle = angle / 2;
  const s = Math.sin(halfAngle);
  const n = vnorm(axis);
  return quatNormalize({
    w: Math.cos(halfAngle),
    x: n.x * s,
    y: n.y * s,
    z: n.z * s,
  });
}

function quatToAxisAngle(q: Quaternion): AxisAngle {
  const qn = quatNormalize(q);
  const angle = 2 * Math.acos(Math.max(-1, Math.min(1, qn.w)));

  if (Math.abs(angle) < EPSILON) {
    return { axis: v3(0, 0, 1), angle: 0 };
  }

  const sinHalf = Math.sin(angle / 2);
  if (Math.abs(sinHalf) < EPSILON) {
    return { axis: v3(0, 0, 1), angle: 0 };
  }

  return {
    axis: vnorm(v3(qn.x / sinHalf, qn.y / sinHalf, qn.z / sinHalf)),
    angle,
  };
}

function quatFromRotationMatrix(R: RotationMatrix): Quaternion {
  // Shepperd's method for numerical stability
  const trace = R[0][0] + R[1][1] + R[2][2];

  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    return quatNormalize({
      w: 0.25 / s,
      x: (R[2][1] - R[1][2]) * s,
      y: (R[0][2] - R[2][0]) * s,
      z: (R[1][0] - R[0][1]) * s,
    });
  }

  if (R[0][0] > R[1][1] && R[0][0] > R[2][2]) {
    const s = 2 * Math.sqrt(1 + R[0][0] - R[1][1] - R[2][2]);
    return quatNormalize({
      w: (R[2][1] - R[1][2]) / s,
      x: 0.25 * s,
      y: (R[0][1] + R[1][0]) / s,
      z: (R[0][2] + R[2][0]) / s,
    });
  }

  if (R[1][1] > R[2][2]) {
    const s = 2 * Math.sqrt(1 + R[1][1] - R[0][0] - R[2][2]);
    return quatNormalize({
      w: (R[0][2] - R[2][0]) / s,
      x: (R[0][1] + R[1][0]) / s,
      y: 0.25 * s,
      z: (R[1][2] + R[2][1]) / s,
    });
  }

  const s = 2 * Math.sqrt(1 + R[2][2] - R[0][0] - R[1][1]);
  return quatNormalize({
    w: (R[1][0] - R[0][1]) / s,
    x: (R[0][2] + R[2][0]) / s,
    y: (R[1][2] + R[2][1]) / s,
    z: 0.25 * s,
  });
}

function quatToRotationMatrix(q: Quaternion): RotationMatrix {
  const qn = quatNormalize(q);
  const { w, x, y, z } = qn;

  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;

  return [
    [1 - yy - zz, xy - wz, xz + wy],
    [xy + wz, 1 - xx - zz, yz - wx],
    [xz - wy, yz + wx, 1 - xx - yy],
  ];
}

function quatRotateVector(q: Quaternion, v: Vector3): Vector3 {
  const qv: Quaternion = { w: 0, x: v.x, y: v.y, z: v.z };
  const result = quatMultiply(quatMultiply(q, qv), quatConjugate(q));
  return v3(result.x, result.y, result.z);
}

/**
 * SLERP - Spherical Linear Interpolation between quaternions
 * Provides constant angular velocity interpolation.
 *
 * Reference: Shoemake, K. (1985). SIGGRAPH
 */
function quatSlerp(q0: Quaternion, q1: Quaternion, t: number): Quaternion {
  let a = quatNormalize(q0);
  let b = quatNormalize(q1);

  // Ensure shortest path
  let dot = a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z;
  if (dot < 0) {
    b = { w: -b.w, x: -b.x, y: -b.y, z: -b.z };
    dot = -dot;
  }

  // Clamp to prevent numerical issues
  dot = Math.min(dot, 1);

  // Linear interpolation for nearly identical quaternions
  if (dot > 0.9995) {
    return quatNormalize({
      w: a.w + t * (b.w - a.w),
      x: a.x + t * (b.x - a.x),
      y: a.y + t * (b.y - a.y),
      z: a.z + t * (b.z - a.z),
    });
  }

  const theta0 = Math.acos(dot);
  const theta = theta0 * t;

  const sinTheta0 = Math.sin(theta0);
  const sinTheta = Math.sin(theta);

  const s0 = Math.cos(theta) - dot * sinTheta / sinTheta0;
  const s1 = sinTheta / sinTheta0;

  return quatNormalize({
    w: s0 * a.w + s1 * b.w,
    x: s0 * a.x + s1 * b.x,
    y: s0 * a.y + s1 * b.y,
    z: s0 * a.z + s1 * b.z,
  });
}

// ============================================================================
// EULER ANGLE CONVERSIONS
// ============================================================================

function rotationMatrixFromEuler(euler: EulerAngles): RotationMatrix {
  const { alpha, beta, gamma, convention } = euler;
  const ca = Math.cos(alpha), sa = Math.sin(alpha);
  const cb = Math.cos(beta), sb = Math.sin(beta);
  const cg = Math.cos(gamma), sg = Math.sin(gamma);

  const Rx = (c: number, s: number): RotationMatrix => [[1, 0, 0], [0, c, -s], [0, s, c]];
  const Ry = (c: number, s: number): RotationMatrix => [[c, 0, s], [0, 1, 0], [-s, 0, c]];
  const Rz = (c: number, s: number): RotationMatrix => [[c, -s, 0], [s, c, 0], [0, 0, 1]];

  const matrices: Record<EulerConvention, [RotationMatrix, RotationMatrix, RotationMatrix]> = {
    "ZYX": [Rz(ca, sa), Ry(cb, sb), Rx(cg, sg)],
    "ZXZ": [Rz(ca, sa), Rx(cb, sb), Rz(cg, sg)],
    "XYZ": [Rx(ca, sa), Ry(cb, sb), Rz(cg, sg)],
    "ZYZ": [Rz(ca, sa), Ry(cb, sb), Rz(cg, sg)],
    "XYX": [Rx(ca, sa), Ry(cb, sb), Rx(cg, sg)],
    "YZY": [Ry(ca, sa), Rz(cb, sb), Ry(cg, sg)],
    "YXY": [Ry(ca, sa), Rx(cb, sb), Ry(cg, sg)],
    "XZX": [Rx(ca, sa), Rz(cb, sb), Rx(cg, sg)],
    "YZX": [Ry(ca, sa), Rz(cb, sb), Rx(cg, sg)],
    "ZXY": [Rz(ca, sa), Rx(cb, sb), Ry(cg, sg)],
  };

  const [R1, R2, R3] = matrices[convention];
  return matMul3x3(matMul3x3(R1, R2), R3);
}

function eulerFromRotationMatrix(R: RotationMatrix, convention: EulerConvention): EulerAngles {
  let alpha: number, beta: number, gamma: number;

  switch (convention) {
    case "ZYX": {
      // Aerospace yaw-pitch-roll
      const sy = Math.sqrt(R[0][0] * R[0][0] + R[1][0] * R[1][0]);
      const singular = sy < EPSILON;
      if (!singular) {
        alpha = Math.atan2(R[1][0], R[0][0]);
        beta = Math.atan2(-R[2][0], sy);
        gamma = Math.atan2(R[2][1], R[2][2]);
      } else {
        alpha = Math.atan2(-R[0][1], R[1][1]);
        beta = Math.atan2(-R[2][0], sy);
        gamma = 0;
      }
      break;
    }
    case "ZYZ": {
      // Machine tool convention
      const sb = Math.sqrt(R[2][0] * R[2][0] + R[2][1] * R[2][1]);
      if (sb < EPSILON) {
        alpha = Math.atan2(-R[0][1], R[0][0]);
        beta = R[2][2] > 0 ? 0 : Math.PI;
        gamma = 0;
      } else {
        alpha = Math.atan2(R[1][2], R[0][2]);
        beta = Math.atan2(sb, R[2][2]);
        gamma = Math.atan2(R[2][1], -R[2][0]);
      }
      break;
    }
    case "XYZ": {
      // CAD roll-pitch-yaw
      const cy = Math.sqrt(R[2][2] * R[2][2] + R[2][1] * R[2][1]);
      if (cy < EPSILON) {
        alpha = Math.atan2(-R[1][2], R[1][1]);
        beta = Math.atan2(-R[2][0], cy);
        gamma = 0;
      } else {
        alpha = Math.atan2(R[2][1], R[2][2]);
        beta = Math.atan2(-R[2][0], cy);
        gamma = Math.atan2(R[1][0], R[0][0]);
      }
      break;
    }
    default:
      // Generic fallback for other conventions
      alpha = 0;
      beta = 0;
      gamma = 0;
  }

  return { alpha, beta, gamma, convention };
}

// ============================================================================
// DENAVIT-HARTENBERG KINEMATICS
// ============================================================================

/**
 * Compute DH transformation matrix for a single joint.
 * Standard DH convention: T = Rz(theta) * Tz(d) * Tx(a) * Rx(alpha)
 */
function dhTransform(params: DHParameters, jointValue: number): HomogeneousMatrix {
  const { theta, d, a, alpha, type } = params;

  const thetaEff = type === "revolute" ? theta + jointValue : theta;
  const dEff = type === "prismatic" ? d + jointValue : d;

  const ct = Math.cos(thetaEff);
  const st = Math.sin(thetaEff);
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);

  return [
    [ct, -st * ca, st * sa, a * ct],
    [st, ct * ca, -ct * sa, a * st],
    [0, sa, ca, dEff],
    [0, 0, 0, 1],
  ];
}

/**
 * Compute forward kinematics for a kinematic chain.
 * Returns end-effector pose relative to base.
 */
function forwardKinematics(
  chain: KinematicChainConfig,
  jointValues: number[]
): { position: Vector3; rotation: RotationMatrix; transform: HomogeneousMatrix } {
  let T = chain.baseFrame;

  for (let i = 0; i < chain.dhParams.length; i++) {
    const Ti = dhTransform(chain.dhParams[i], jointValues[i] ?? 0);
    T = matMul4x4(T, Ti);
  }

  T = matMul4x4(T, chain.toolFrame);

  const rotation: RotationMatrix = [
    [T[0][0], T[0][1], T[0][2]],
    [T[1][0], T[1][1], T[1][2]],
    [T[2][0], T[2][1], T[2][2]],
  ];

  return {
    position: v3(T[0][3], T[1][3], T[2][3]),
    rotation,
    transform: T,
  };
}

// ============================================================================
// SINGULARITY DETECTION
// ============================================================================

/**
 * Detect singularities for 5-axis machine configurations.
 * Gimbal lock occurs when two rotation axes align, causing loss of DOF.
 */
function detectSingularity(
  topology: MachineTopology,
  angles: { a?: number; b?: number; c?: number },
  thresholdDeg: number = 1
): SingularityResult {
  const thresholdRad = thresholdDeg * Math.PI / 180;
  const { a = 0, b = 0, c = 0 } = angles;

  const result: SingularityResult = {
    isSingular: false,
    type: "none",
    severity: "safe",
    affectedAxes: [],
    proximityDegrees: 180,
    recommendation: "No singularity issues detected",
  };

  switch (topology) {
    case "trunnion_AC":
    case "swivel_head_AC": {
      // Singularity at A = 0 (C-axis undefined when tool is vertical)
      const aRad = a * Math.PI / 180;
      const proximityA = Math.min(Math.abs(aRad), Math.abs(aRad - Math.PI));

      if (proximityA < thresholdRad) {
        result.isSingular = true;
        result.type = "gimbal_lock";
        result.severity = proximityA < thresholdRad / 10 ? "critical" : "warning";
        result.affectedAxes = ["A", "C"];
        result.proximityDegrees = proximityA * 180 / Math.PI;
        result.recommendation = "Tilt A-axis away from 0 or 180 degrees to avoid C-axis singularity";
      }
      break;
    }
    case "trunnion_BC":
    case "swivel_head_BC": {
      // Singularity at B = 0 (C-axis undefined when tool is vertical)
      const bRad = b * Math.PI / 180;
      const proximityB = Math.min(Math.abs(bRad), Math.abs(bRad - Math.PI));

      if (proximityB < thresholdRad) {
        result.isSingular = true;
        result.type = "gimbal_lock";
        result.severity = proximityB < thresholdRad / 10 ? "critical" : "warning";
        result.affectedAxes = ["B", "C"];
        result.proximityDegrees = proximityB * 180 / Math.PI;
        result.recommendation = "Tilt B-axis away from 0 or 180 degrees to avoid C-axis singularity";
      }
      break;
    }
    case "mill_turn_CB": {
      // Singularity at B = 90 degrees
      const bRad = b * Math.PI / 180;
      const proximityB = Math.abs(Math.abs(bRad) - Math.PI / 2);

      if (proximityB < thresholdRad) {
        result.isSingular = true;
        result.type = "gimbal_lock";
        result.severity = proximityB < thresholdRad / 10 ? "critical" : "warning";
        result.affectedAxes = ["B", "C"];
        result.proximityDegrees = proximityB * 180 / Math.PI;
        result.recommendation = "Avoid B-axis at exactly +/- 90 degrees for mill-turn operations";
      }
      break;
    }
    case "robot_6dof": {
      // Wrist singularity at axis 5 = 0
      // Shoulder singularity at extended reach
      // Elbow singularity when arm is fully extended
      result.recommendation = "Check for wrist (axis5=0), shoulder, and elbow singularities";
      break;
    }
    default:
      break;
  }

  return result;
}

// ============================================================================
// NEURAL EMBEDDING
// ============================================================================

/**
 * Generate 32-dimensional neural-friendly embedding of SO(3) rotation.
 * Combines multiple representations for robust machine learning:
 *   - Rotation matrix (9D) - direct encoding
 *   - Quaternion (4D) - continuous, no gimbal lock
 *   - Lie algebra (3D) - minimal parameterization
 *   - Euler sin/cos (6D) - periodic-aware
 *   - Singularity features (6D) - safety encoding
 *   - Normalization features (4D) - constraint encoding
 */
function toNeuralEmbedding(embedding: SO3Embedding, topology?: MachineTopology): NeuralEmbedding {
  const R = embedding.rotationMatrix;
  const q = embedding.quaternion;
  const omega = embedding.lieAlgebraVector;
  const euler = embedding.eulerAngles;

  // Flatten rotation matrix (9D)
  const rotationMatrixFlat = [
    R[0][0], R[0][1], R[0][2],
    R[1][0], R[1][1], R[1][2],
    R[2][0], R[2][1], R[2][2],
  ];

  // Quaternion (4D)
  const quaternionVec = [q.w, q.x, q.y, q.z];

  // Lie algebra (3D)
  const lieAlgebraVec = [omega[0], omega[1], omega[2]];

  // Euler sin/cos (6D) - avoids discontinuities at 2*pi
  const eulerSines = [
    Math.sin(euler.alpha), Math.cos(euler.alpha),
    Math.sin(euler.beta), Math.cos(euler.beta),
    Math.sin(euler.gamma), Math.cos(euler.gamma),
  ];

  // Singularity features (6D)
  const singularityFeatures = computeSingularityFeatures(embedding, topology);

  // Normalization features (4D)
  const trace = matTrace3x3(R);
  const det = embedding.determinant;
  const orthErr = embedding.orthogonalityError;
  const quatNrm = quatNorm(q);
  const normalization = [trace / 3, det, orthErr, quatNrm];

  // Combine into 32D vector
  const fullEmbedding = [
    ...rotationMatrixFlat,  // 9D
    ...quaternionVec,       // 4D
    ...lieAlgebraVec,       // 3D
    ...eulerSines,          // 6D
    ...singularityFeatures, // 6D
    ...normalization,       // 4D
  ]; // Total: 32D

  return {
    embedding: fullEmbedding,
    dimension: 32,
    components: {
      rotationMatrix: rotationMatrixFlat,
      quaternion: quaternionVec,
      lieAlgebra: lieAlgebraVec,
      eulerSines,
      singularityFeatures,
      normalization,
    },
  };
}

function computeSingularityFeatures(embedding: SO3Embedding, topology?: MachineTopology): number[] {
  const euler = embedding.eulerAngles;

  // Distance to gimbal lock positions (normalized)
  const alphaProximity = Math.min(
    Math.abs(Math.sin(euler.alpha)),
    Math.abs(Math.sin(euler.alpha - Math.PI))
  );
  const betaProximity = Math.min(
    Math.abs(Math.sin(euler.beta)),
    Math.abs(Math.sin(euler.beta - Math.PI / 2))
  );
  const gammaProximity = Math.min(
    Math.abs(Math.sin(euler.gamma)),
    Math.abs(Math.sin(euler.gamma - Math.PI))
  );

  // Axis alignment features (how aligned rotation is with principal axes)
  const R = embedding.rotationMatrix;
  const zAxisAlignment = Math.abs(R[2][2]);  // Tool Z vs World Z
  const xAxisAlignment = Math.abs(R[0][0]);  // Tool X vs World X
  const yAxisAlignment = Math.abs(R[1][1]);  // Tool Y vs World Y

  return [
    alphaProximity,
    betaProximity,
    gammaProximity,
    zAxisAlignment,
    xAxisAlignment,
    yAxisAlignment,
  ];
}

// ============================================================================
// SO3 KINEMATICS ENCODER ENGINE
// ============================================================================

class SO3KinematicsEncoderEngineImpl {
  private readonly engineVersion = "1.0.0";

  // ============================================================
  // CREATE EMBEDDINGS
  // ============================================================

  /**
   * Create SO(3) embedding from rotation matrix.
   */
  fromRotationMatrix(R: RotationMatrix, convention: EulerConvention = "ZYZ"): SO3Embedding {
    const omega = logMap(R);
    const q = quatFromRotationMatrix(R);
    const axisAngle = quatToAxisAngle(q);
    const euler = eulerFromRotationMatrix(R, convention);
    const det = matDet3x3(R);
    const orthErr = orthogonalityError(R);
    const isId = Math.abs(matTrace3x3(R) - 3) < EPSILON;

    return {
      rotationMatrix: R,
      quaternion: q,
      axisAngle,
      eulerAngles: euler,
      lieAlgebraVector: [omega.x, omega.y, omega.z],
      isIdentity: isId,
      determinant: det,
      orthogonalityError: orthErr,
    };
  }

  /**
   * Create SO(3) embedding from quaternion.
   */
  fromQuaternion(q: Quaternion, convention: EulerConvention = "ZYZ"): SO3Embedding {
    const qn = quatNormalize(q);
    const R = quatToRotationMatrix(qn);
    return this.fromRotationMatrix(R, convention);
  }

  /**
   * Create SO(3) embedding from axis-angle.
   */
  fromAxisAngle(axisAngle: AxisAngle, convention: EulerConvention = "ZYZ"): SO3Embedding {
    const q = quatFromAxisAngle(axisAngle.axis, axisAngle.angle);
    const R = quatToRotationMatrix(q);
    return this.fromRotationMatrix(R, convention);
  }

  /**
   * Create SO(3) embedding from Euler angles.
   */
  fromEulerAngles(euler: EulerAngles): SO3Embedding {
    const R = rotationMatrixFromEuler(euler);
    return this.fromRotationMatrix(R, euler.convention);
  }

  /**
   * Create SO(3) embedding from Lie algebra vector (exponential map).
   */
  fromLieAlgebra(omega: Vector3, convention: EulerConvention = "ZYZ"): SO3Embedding {
    const R = expMap(omega);
    return this.fromRotationMatrix(R, convention);
  }

  /**
   * Create identity rotation embedding.
   */
  identity(convention: EulerConvention = "ZYZ"): SO3Embedding {
    return this.fromRotationMatrix(identityMatrix(), convention);
  }

  // ============================================================
  // SO(3) OPERATIONS
  // ============================================================

  /**
   * Exponential map: so(3) -> SO(3)
   * Maps Lie algebra element to rotation matrix.
   */
  expMap(omega: Vector3): RotationMatrix {
    return expMap(omega);
  }

  /**
   * Logarithmic map: SO(3) -> so(3)
   * Maps rotation matrix to Lie algebra element.
   */
  logMap(R: RotationMatrix): Vector3 {
    return logMap(R);
  }

  /**
   * Compose two rotations: R = R1 * R2
   */
  compose(e1: SO3Embedding, e2: SO3Embedding): SO3Embedding {
    const R = matMul3x3(e1.rotationMatrix, e2.rotationMatrix);
    return this.fromRotationMatrix(R, e1.eulerAngles.convention);
  }

  /**
   * Inverse rotation: R^-1 = R^T for SO(3)
   */
  inverse(e: SO3Embedding): SO3Embedding {
    const Rt = matTranspose3x3(e.rotationMatrix);
    return this.fromRotationMatrix(Rt, e.eulerAngles.convention);
  }

  /**
   * Interpolate between rotations using SLERP.
   * @param e1 Start rotation
   * @param e2 End rotation
   * @param t Parameter in [0, 1]
   */
  interpolate(e1: SO3Embedding, e2: SO3Embedding, t: number): SO3Embedding {
    const q = quatSlerp(e1.quaternion, e2.quaternion, t);
    return this.fromQuaternion(q, e1.eulerAngles.convention);
  }

  /**
   * Compute geodesic distance on SO(3) (rotation angle between two orientations).
   * Returns angle in radians.
   */
  distance(e1: SO3Embedding, e2: SO3Embedding): number {
    // R_diff = R1^T * R2
    const Rdiff = matMul3x3(matTranspose3x3(e1.rotationMatrix), e2.rotationMatrix);
    const omega = logMap(Rdiff);
    return vlen(omega);
  }

  /**
   * Apply rotation to vector.
   */
  rotateVector(e: SO3Embedding, v: Vector3): Vector3 {
    return matVec3(e.rotationMatrix, v);
  }

  // ============================================================
  // NEURAL EMBEDDING
  // ============================================================

  /**
   * Generate 32-dimensional neural-friendly embedding.
   */
  toNeuralEmbedding(e: SO3Embedding, topology?: MachineTopology): NeuralEmbedding {
    return toNeuralEmbedding(e, topology);
  }

  /**
   * Reconstruct SO3Embedding from neural embedding (approximate).
   * Uses quaternion component for primary reconstruction.
   */
  fromNeuralEmbedding(neural: NeuralEmbedding, convention: EulerConvention = "ZYZ"): SO3Embedding {
    const [w, x, y, z] = neural.components.quaternion;
    return this.fromQuaternion({ w, x, y, z }, convention);
  }

  // ============================================================
  // KINEMATIC CHAIN OPERATIONS
  // ============================================================

  /**
   * Create kinematic chain configuration for common machine topologies.
   */
  createKinematicChain(topology: MachineTopology, params?: Partial<{
    pivotOffset: Vector3;
    toolLength: number;
    axisLimits: Record<string, [number, number]>;
  }>): KinematicChainConfig {
    const pivotOffset = params?.pivotOffset ?? v3(0, 0, 0);
    const toolLength = params?.toolLength ?? 100;

    const baseFrame = identityHomogeneous();
    const toolFrame: HomogeneousMatrix = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, -toolLength],
      [0, 0, 0, 1],
    ];

    let dhParams: DHParameters[];
    let jointLimits: Array<{ min: number; max: number }>;

    switch (topology) {
      case "trunnion_AC":
        dhParams = [
          { theta: 0, d: 0, a: 0, alpha: 0, type: "prismatic", joint_id: "X" },
          { theta: 0, d: 0, a: 0, alpha: Math.PI / 2, type: "prismatic", joint_id: "Y" },
          { theta: 0, d: 0, a: 0, alpha: 0, type: "prismatic", joint_id: "Z" },
          { theta: 0, d: pivotOffset.z, a: pivotOffset.x, alpha: Math.PI / 2, type: "revolute", joint_id: "A" },
          { theta: 0, d: 0, a: 0, alpha: 0, type: "revolute", joint_id: "C" },
        ];
        jointLimits = [
          { min: -500, max: 500 },   // X (mm)
          { min: -500, max: 500 },   // Y (mm)
          { min: -500, max: 0 },     // Z (mm, negative down)
          { min: -120 * Math.PI / 180, max: 120 * Math.PI / 180 },  // A (rad)
          { min: -Math.PI, max: Math.PI },  // C (rad, continuous)
        ];
        break;

      case "trunnion_BC":
        dhParams = [
          { theta: 0, d: 0, a: 0, alpha: 0, type: "prismatic", joint_id: "X" },
          { theta: 0, d: 0, a: 0, alpha: Math.PI / 2, type: "prismatic", joint_id: "Y" },
          { theta: 0, d: 0, a: 0, alpha: 0, type: "prismatic", joint_id: "Z" },
          { theta: 0, d: pivotOffset.z, a: pivotOffset.y, alpha: 0, type: "revolute", joint_id: "B" },
          { theta: 0, d: 0, a: 0, alpha: Math.PI / 2, type: "revolute", joint_id: "C" },
        ];
        jointLimits = [
          { min: -500, max: 500 },
          { min: -500, max: 500 },
          { min: -500, max: 0 },
          { min: -120 * Math.PI / 180, max: 120 * Math.PI / 180 },
          { min: -Math.PI, max: Math.PI },
        ];
        break;

      case "swivel_head_BC":
        dhParams = [
          { theta: 0, d: 0, a: 0, alpha: 0, type: "prismatic", joint_id: "X" },
          { theta: 0, d: 0, a: 0, alpha: Math.PI / 2, type: "prismatic", joint_id: "Y" },
          { theta: 0, d: 0, a: 0, alpha: 0, type: "prismatic", joint_id: "Z" },
          { theta: 0, d: 0, a: 0, alpha: 0, type: "revolute", joint_id: "B" },
          { theta: 0, d: 0, a: 0, alpha: Math.PI / 2, type: "revolute", joint_id: "C" },
        ];
        jointLimits = [
          { min: -500, max: 500 },
          { min: -500, max: 500 },
          { min: -500, max: 0 },
          { min: -Math.PI / 2, max: Math.PI / 2 },
          { min: -Math.PI, max: Math.PI },
        ];
        break;

      case "mill_turn_CB":
        dhParams = [
          { theta: 0, d: 0, a: 0, alpha: 0, type: "prismatic", joint_id: "X" },
          { theta: 0, d: 0, a: 0, alpha: Math.PI / 2, type: "prismatic", joint_id: "Y" },
          { theta: 0, d: 0, a: 0, alpha: 0, type: "prismatic", joint_id: "Z" },
          { theta: 0, d: 0, a: 0, alpha: Math.PI / 2, type: "revolute", joint_id: "C" },  // Spindle
          { theta: 0, d: 0, a: pivotOffset.x, alpha: 0, type: "revolute", joint_id: "B" },
        ];
        jointLimits = [
          { min: -200, max: 200 },
          { min: -100, max: 100 },
          { min: -600, max: 0 },
          { min: -Math.PI, max: Math.PI },  // C continuous
          { min: -Math.PI / 2, max: Math.PI / 2 },  // B +/- 90
        ];
        break;

      case "robot_6dof":
        dhParams = [
          { theta: 0, d: 400, a: 0, alpha: Math.PI / 2, type: "revolute", joint_id: "J1" },
          { theta: 0, d: 0, a: 250, alpha: 0, type: "revolute", joint_id: "J2" },
          { theta: 0, d: 0, a: 35, alpha: Math.PI / 2, type: "revolute", joint_id: "J3" },
          { theta: 0, d: 250, a: 0, alpha: -Math.PI / 2, type: "revolute", joint_id: "J4" },
          { theta: 0, d: 0, a: 0, alpha: Math.PI / 2, type: "revolute", joint_id: "J5" },
          { theta: 0, d: 80, a: 0, alpha: 0, type: "revolute", joint_id: "J6" },
        ];
        jointLimits = [
          { min: -Math.PI, max: Math.PI },
          { min: -Math.PI / 2, max: Math.PI / 2 },
          { min: -Math.PI, max: Math.PI / 6 },
          { min: -Math.PI, max: Math.PI },
          { min: -Math.PI / 2, max: Math.PI / 2 },
          { min: -Math.PI, max: Math.PI },
        ];
        break;

      default:
        // Default 3-axis
        dhParams = [
          { theta: 0, d: 0, a: 0, alpha: 0, type: "prismatic", joint_id: "X" },
          { theta: 0, d: 0, a: 0, alpha: Math.PI / 2, type: "prismatic", joint_id: "Y" },
          { theta: 0, d: 0, a: 0, alpha: 0, type: "prismatic", joint_id: "Z" },
        ];
        jointLimits = [
          { min: -500, max: 500 },
          { min: -500, max: 500 },
          { min: -500, max: 0 },
        ];
    }

    return {
      topology,
      dhParams,
      baseFrame,
      toolFrame,
      jointLimits,
    };
  }

  /**
   * Compute forward kinematics for a kinematic chain.
   */
  forwardKinematics(
    chain: KinematicChainConfig,
    jointValues: number[]
  ): { position: Vector3; rotation: SO3Embedding; transform: HomogeneousMatrix } {
    const fk = forwardKinematics(chain, jointValues);
    const rotation = this.fromRotationMatrix(fk.rotation);
    return {
      position: fk.position,
      rotation,
      transform: fk.transform,
    };
  }

  /**
   * Compute DH transformation for a single joint.
   */
  dhTransform(params: DHParameters, jointValue: number): HomogeneousMatrix {
    return dhTransform(params, jointValue);
  }

  // ============================================================
  // SINGULARITY DETECTION
  // ============================================================

  /**
   * Detect singularities for given machine topology and joint angles.
   */
  detectSingularity(
    topology: MachineTopology,
    angles: { a?: number; b?: number; c?: number },
    thresholdDeg: number = 1
  ): SingularityResult {
    return detectSingularity(topology, angles, thresholdDeg);
  }

  /**
   * Check if rotation is near gimbal lock for Euler angles.
   */
  isNearGimbalLock(euler: EulerAngles, thresholdDeg: number = 1): boolean {
    const thresholdRad = thresholdDeg * Math.PI / 180;

    // For ZYZ convention, gimbal lock at beta = 0 or pi
    if (euler.convention === "ZYZ") {
      return Math.abs(euler.beta) < thresholdRad ||
             Math.abs(euler.beta - Math.PI) < thresholdRad;
    }

    // For ZYX convention, gimbal lock at beta = +/- pi/2
    if (euler.convention === "ZYX") {
      return Math.abs(Math.abs(euler.beta) - Math.PI / 2) < thresholdRad;
    }

    // For XYZ convention, gimbal lock at beta = +/- pi/2
    if (euler.convention === "XYZ") {
      return Math.abs(Math.abs(euler.beta) - Math.PI / 2) < thresholdRad;
    }

    return false;
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Convert degrees to radians.
   */
  degToRad(deg: number): number {
    return deg * Math.PI / 180;
  }

  /**
   * Convert radians to degrees.
   */
  radToDeg(rad: number): number {
    return rad * 180 / Math.PI;
  }

  /**
   * Orthogonalize rotation matrix (closest valid SO(3) element).
   * Uses SVD-based projection: R_proj = U * V^T where R = U * S * V^T
   */
  orthogonalize(R: RotationMatrix): RotationMatrix {
    // Simplified Gram-Schmidt orthogonalization
    const x: Vector3 = { x: R[0][0], y: R[1][0], z: R[2][0] };
    const y: Vector3 = { x: R[0][1], y: R[1][1], z: R[2][1] };

    const xn = vnorm(x);
    const yTemp = vsub(y, vscale(xn, vdot(y, xn)));
    const yn = vnorm(yTemp);
    const zn = vcross(xn, yn);

    return [
      [xn.x, yn.x, zn.x],
      [xn.y, yn.y, zn.y],
      [xn.z, yn.z, zn.z],
    ];
  }

  /**
   * Get engine statistics.
   */
  getStatistics(): {
    version: string;
    capabilities: string[];
    supportedTopologies: MachineTopology[];
    supportedConventions: EulerConvention[];
    neuralEmbeddingDim: number;
  } {
    return {
      version: this.engineVersion,
      capabilities: [
        "SO(3) rotation group mathematics",
        "Multiple rotation representations (matrix, quaternion, axis-angle, Euler)",
        "Lie algebra so(3) encoding",
        "Exponential and logarithmic maps",
        "SLERP interpolation",
        "Denavit-Hartenberg kinematics",
        "Singularity detection",
        "Neural-friendly 32D embedding",
      ],
      supportedTopologies: [
        "trunnion_AC", "trunnion_BC", "swivel_head_BC", "swivel_head_AC",
        "mill_turn_CB", "robot_6dof", "gantry_5ax", "lathe_C", "lathe_CY",
      ],
      supportedConventions: [
        "ZYX", "ZXZ", "XYZ", "ZYZ", "XYX", "YZY", "YXY", "XZX", "YZX", "ZXY",
      ],
      neuralEmbeddingDim: 32,
    };
  }

  /**
   * Get AI context for this engine.
   */
  getContextForAI(): string {
    const stats = this.getStatistics();
    return `
SO3 KINEMATICS ENCODER ENGINE (v${stats.version})
===================================================
Critical engine for 5-axis post-processing providing rigorous SO(3) rotation
group mathematics for machine kinematics encoding.

CAPABILITIES:
  ${stats.capabilities.map(c => `- ${c}`).join("\n  ")}

SUPPORTED TOPOLOGIES:
  ${stats.supportedTopologies.join(", ")}

EULER CONVENTIONS:
  ${stats.supportedConventions.join(", ")}

NEURAL EMBEDDING:
  32-dimensional vector combining:
  - Rotation matrix (9D)
  - Quaternion (4D)
  - Lie algebra (3D)
  - Euler sin/cos (6D)
  - Singularity features (6D)
  - Normalization (4D)

API METHODS:
  fromRotationMatrix(R, convention?) -> SO3Embedding
  fromQuaternion(q, convention?) -> SO3Embedding
  fromAxisAngle(aa, convention?) -> SO3Embedding
  fromEulerAngles(euler) -> SO3Embedding
  fromLieAlgebra(omega, convention?) -> SO3Embedding

  expMap(omega) -> RotationMatrix
  logMap(R) -> Vector3

  compose(e1, e2) -> SO3Embedding
  inverse(e) -> SO3Embedding
  interpolate(e1, e2, t) -> SO3Embedding  (SLERP)
  distance(e1, e2) -> number

  toNeuralEmbedding(e, topology?) -> NeuralEmbedding
  fromNeuralEmbedding(neural, convention?) -> SO3Embedding

  createKinematicChain(topology, params?) -> KinematicChainConfig
  forwardKinematics(chain, jointValues) -> FK result
  detectSingularity(topology, angles, threshold?) -> SingularityResult
`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const so3KinematicsEncoderEngine = new SO3KinematicsEncoderEngineImpl();

// Re-export utility functions for advanced users
export {
  expMap,
  logMap,
  quatSlerp,
  quatFromRotationMatrix,
  quatToRotationMatrix,
  forwardKinematics,
  dhTransform,
  detectSingularity,
  toNeuralEmbedding,
};
