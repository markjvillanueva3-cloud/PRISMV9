/**
 * PRISM MCP Server — Advanced Kinematics Engine
 *
 * Multi-axis CNC kinematics:
 * - Homogeneous transformation matrices (rotation, translation)
 * - Denavit-Hartenberg forward kinematics
 * - Geometric Jacobian computation
 * - 5-axis inverse kinematics (table-table, head-head, mixed)
 * - Singularity detection
 * - TCP velocity kinematics
 *
 * Ported from PRISM_ADVANCED_KINEMATICS_ENGINE.js (monolith R2.3.1).
 *
 * @module KinematicsEngine
 */

// ============================================================================
// TYPES
// ============================================================================

/** 4x4 homogeneous transformation matrix stored as row-major 2D array. */
export type Mat4 = number[][];

export interface Point3D { x: number; y: number; z: number; }
export interface EulerAngles { roll: number; pitch: number; yaw: number; }

export interface DHParams {
  theta: number;   // Joint angle (rad)
  d: number;       // Link offset
  a: number;       // Link length
  alpha: number;   // Link twist (rad)
  type: "revolute" | "prismatic";
}

export interface FKResult {
  position: Point3D;
  euler: EulerAngles;
  transform: Mat4;
}

export interface JacobianResult {
  jacobian: Mat4;
  conditionNumber: number;
  nearSingularity: boolean;
}

export interface FiveAxisSolution {
  X: number; Y: number; Z: number;
  A: number; C: number;
  valid: boolean;
  solution: number;
}

export interface FiveAxisConfig {
  type?: "table-table" | "head-head" | "mixed";
  pivotOffset?: Point3D;
  previousC?: number;
  limits?: Record<string, [number, number]>;
}

export interface SingularityResult {
  isSingular: boolean;
  type: "gimbal_lock" | "none";
  aAngle: number;
  recommendation: string;
}

// ============================================================================
// ENGINE
// ============================================================================

class KinematicsEngineImpl {

  // ── Transformation matrices ──

  rotX(theta: number): Mat4 {
    const c = Math.cos(theta), s = Math.sin(theta);
    return [[1,0,0,0],[0,c,-s,0],[0,s,c,0],[0,0,0,1]];
  }

  rotY(theta: number): Mat4 {
    const c = Math.cos(theta), s = Math.sin(theta);
    return [[c,0,s,0],[0,1,0,0],[-s,0,c,0],[0,0,0,1]];
  }

  rotZ(theta: number): Mat4 {
    const c = Math.cos(theta), s = Math.sin(theta);
    return [[c,-s,0,0],[s,c,0,0],[0,0,1,0],[0,0,0,1]];
  }

  translate(dx: number, dy: number, dz: number): Mat4 {
    return [[1,0,0,dx],[0,1,0,dy],[0,0,1,dz],[0,0,0,1]];
  }

  matMul4x4(A: Mat4, B: Mat4): Mat4 {
    const R: Mat4 = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        for (let k = 0; k < 4; k++)
          R[i][j] += A[i][k] * B[k][j];
    return R;
  }

  chainTransforms(...transforms: Mat4[]): Mat4 {
    return transforms.reduce((acc, T) => this.matMul4x4(acc, T));
  }

  transformPoint(T: Mat4, point: Point3D): Point3D {
    const p = [point.x, point.y, point.z, 1];
    const r = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        r[i] += T[i][j] * p[j];
    return { x: r2(r[0]), y: r2(r[1]), z: r2(r[2]) };
  }

  invertTransform(T: Mat4): Mat4 {
    const RT = [
      [T[0][0], T[1][0], T[2][0]],
      [T[0][1], T[1][1], T[2][1]],
      [T[0][2], T[1][2], T[2][2]],
    ];
    const t = [T[0][3], T[1][3], T[2][3]];
    const tNew = RT.map(row =>
      -(row[0]*t[0] + row[1]*t[1] + row[2]*t[2]),
    );
    return [
      [RT[0][0], RT[0][1], RT[0][2], tNew[0]],
      [RT[1][0], RT[1][1], RT[1][2], tNew[1]],
      [RT[2][0], RT[2][1], RT[2][2], tNew[2]],
      [0, 0, 0, 1],
    ];
  }

  // ── Denavit-Hartenberg ──

  dhTransform(params: {
    theta: number; d: number; a: number; alpha: number;
  }): Mat4 {
    const { theta, d, a, alpha } = params;
    const ct = Math.cos(theta), st = Math.sin(theta);
    const ca = Math.cos(alpha), sa = Math.sin(alpha);
    return [
      [ct, -st*ca, st*sa, a*ct],
      [st, ct*ca, -ct*sa, a*st],
      [0, sa, ca, d],
      [0, 0, 0, 1],
    ];
  }

  forwardKinematicsDH(
    dhTable: DHParams[], jointValues: number[],
  ): FKResult {
    let T: Mat4 = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];

    for (let i = 0; i < dhTable.length; i++) {
      const dh = { ...dhTable[i] };
      if (dh.type === "revolute") {
        dh.theta = (dh.theta ?? 0) + jointValues[i];
      } else {
        dh.d = (dh.d ?? 0) + jointValues[i];
      }
      T = this.matMul4x4(T, this.dhTransform(dh));
    }

    const position = { x: r4(T[0][3]), y: r4(T[1][3]), z: r4(T[2][3]) };
    const R = [[T[0][0],T[0][1],T[0][2]],
               [T[1][0],T[1][1],T[1][2]],
               [T[2][0],T[2][1],T[2][2]]];
    const euler = this.rotationToEuler(R);

    return { position, euler, transform: T };
  }

  rotationToEuler(R: number[][]): EulerAngles {
    let roll: number, pitch: number, yaw: number;
    if (Math.abs(R[2][0]) >= 1 - 1e-10) {
      yaw = 0;
      if (R[2][0] < 0) {
        pitch = Math.PI / 2;
        roll = Math.atan2(R[0][1], R[0][2]);
      } else {
        pitch = -Math.PI / 2;
        roll = Math.atan2(-R[0][1], -R[0][2]);
      }
    } else {
      pitch = Math.asin(-R[2][0]);
      const cp = Math.cos(pitch);
      roll = Math.atan2(R[2][1] / cp, R[2][2] / cp);
      yaw = Math.atan2(R[1][0] / cp, R[0][0] / cp);
    }
    return {
      roll: r2(roll * 180 / Math.PI),
      pitch: r2(pitch * 180 / Math.PI),
      yaw: r2(yaw * 180 / Math.PI),
    };
  }

  // ── 5-Axis Inverse Kinematics ──

  fiveAxisIK(
    toolPose: { position: Point3D; axis: { i: number; j: number; k: number } },
    config: FiveAxisConfig = {},
  ): FiveAxisSolution[] {
    const { position, axis } = toolPose;
    const machineType = config.type ?? "table-table";

    const len = Math.sqrt(axis.i**2 + axis.j**2 + axis.k**2);
    const n = { i: axis.i/len, j: axis.j/len, k: axis.k/len };

    const solutions: FiveAxisSolution[] = [];

    let A = Math.acos(Math.max(-1, Math.min(1, -n.k))) * 180 / Math.PI;
    let C = Math.atan2(n.j, n.i) * 180 / Math.PI;

    if (Math.abs(A) < 0.01) C = config.previousC ?? 0;

    if (machineType === "head-head") {
      solutions.push({
        X: r4(position.x), Y: r4(position.y), Z: r4(position.z),
        A: r4(A), C: r4(C), valid: true, solution: 1,
      });
    } else {
      solutions.push(this.computeXYZ(position, A, C, config, 1));
      if (A > 0.01 && A < 179.99) {
        solutions.push(this.computeXYZ(position, -A, C + 180, config, 2));
      }
    }

    return solutions.map(sol => ({
      ...sol,
      valid: this.checkLimits(sol, config.limits),
    }));
  }

  detectSingularity(
    joints: { A: number; C?: number },
    threshold = 1.0,
  ): SingularityResult {
    const A = Math.abs(joints.A);
    const isSingular = A < threshold || Math.abs(A - 180) < threshold;
    return {
      isSingular,
      type: isSingular ? "gimbal_lock" : "none",
      aAngle: joints.A,
      recommendation: isSingular
        ? "Modify toolpath to avoid vertical tool orientation"
        : "No singularity issues",
    };
  }

  // ── Internal helpers ──

  private computeXYZ(
    pos: Point3D, A: number, C: number,
    config: FiveAxisConfig, solutionNum: number,
  ): FiveAxisSolution {
    const Ar = A * Math.PI / 180;
    const Cr = C * Math.PI / 180;
    const piv = config.pivotOffset ?? { x: 0, y: 0, z: 0 };
    const dx = piv.x * (1 - Math.cos(Ar) * Math.cos(Cr));
    const dy = piv.y * (1 - Math.cos(Ar) * Math.sin(Cr));
    const dz = piv.z * (1 - Math.cos(Ar));
    return {
      X: r4(pos.x - dx), Y: r4(pos.y - dy), Z: r4(pos.z - dz),
      A: r4(A), C: r4(C), valid: true, solution: solutionNum,
    };
  }

  private checkLimits(
    joints: FiveAxisSolution,
    limits?: Record<string, [number, number]>,
  ): boolean {
    if (!limits) return true;
    for (const axis of ["X","Y","Z","A","C"] as const) {
      const lim = limits[axis];
      const val = joints[axis];
      if (lim && val !== undefined) {
        if (val < lim[0] || val > lim[1]) return false;
      }
    }
    return true;
  }
}

function r2(v: number): number { return Math.round(v * 100) / 100; }
function r4(v: number): number { return Math.round(v * 10000) / 10000; }

export const kinematicsEngine = new KinematicsEngineImpl();
