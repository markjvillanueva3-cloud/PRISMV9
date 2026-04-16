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

    // Canonical IK: A=acos(nz), C=atan2(nx,-ny) — matches MultiAxisKinematicEngine head-table
    let A = Math.acos(Math.max(-1, Math.min(1, n.k))) * 180 / Math.PI;
    let C = Math.atan2(n.i, -n.j) * 180 / Math.PI;

    // At A≈0° (singularity for AC machines), C is indeterminate — use previous value
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

// =============================================================================
// Jacobian & Singularity Analysis — Round 10 from PRISM_JACOBIAN_ENGINE
// =============================================================================

export interface JacobianSingularityResult {
  nearSingularity: boolean;
  conditionNumber: number;
  manipulability: number;
  minSingularValue: number;
  maxSingularValue: number;
}

export interface ConfigSingularityResult {
  hasSingularity: boolean;
  singularities: Array<{
    type: string;
    axis: string;
    value: number;
    severity: "critical" | "warning";
    message: string;
  }>;
}

class JacobianEngineImpl {

  /**
   * Compute analytical 5-axis Jacobian (6×5 matrix).
   * Maps joint velocities [X,Y,Z,rot1,rot2] to end-effector velocities.
   */
  compute5AxisJacobian(
    config: "BC" | "AC",
    jointValues: { x?: number; y?: number; z?: number; a?: number; b?: number; c?: number },
    toolLength: number = 0
  ): number[][] {
    const aRad = ((jointValues.a ?? 0) * Math.PI) / 180;
    const bRad = ((jointValues.b ?? 0) * Math.PI) / 180;
    const cRad = ((jointValues.c ?? 0) * Math.PI) / 180;
    const L = toolLength;

    const J: number[][] = Array.from({ length: 6 }, () => new Array(5).fill(0));

    // Linear axes contribute directly
    J[0][0] = 1; // dx/dX
    J[1][1] = 1; // dy/dY
    J[2][2] = 1; // dz/dZ

    if (config === "BC") {
      const cb = Math.cos(bRad), sb = Math.sin(bRad);
      const cc = Math.cos(cRad), sc = Math.sin(cRad);

      J[0][3] = L * cb * cc;
      J[1][3] = L * cb * sc;
      J[2][3] = -L * sb;
      J[0][4] = -L * sb * sc;
      J[1][4] = L * sb * cc;
      J[2][4] = 0;
      J[3][3] = 0; J[4][3] = 1; J[5][3] = 0;
      J[3][4] = sb; J[4][4] = 0; J[5][4] = cb;
    } else {
      const ca = Math.cos(aRad), sa = Math.sin(aRad);
      const _cc = Math.cos(cRad), sc = Math.sin(cRad);

      J[0][3] = 0;
      J[1][3] = -L * ca * sc;
      J[2][3] = -L * sa;
      J[0][4] = -L * sa * sc;
      J[1][4] = L * sa * _cc;
      J[2][4] = 0;
      J[3][3] = 1; J[4][3] = 0; J[5][3] = 0;
      J[3][4] = 0; J[4][4] = sa; J[5][4] = ca;
    }

    return J;
  }

  /**
   * Detect singularities using Jacobian condition number.
   */
  detectSingularity(jacobian: number[][], threshold: number = 0.01): JacobianSingularityResult {
    const JtJ = this._multiplyJtJ(jacobian);
    const eigenvalues = this._powerIterationEigenvalues(JtJ, 100);

    const maxEig = Math.max(...eigenvalues);
    const positiveEigs = eigenvalues.filter(e => e > 1e-10);
    const minEig = positiveEigs.length > 0 ? Math.min(...positiveEigs) : 0;

    const conditionNumber = minEig > 1e-10 ? maxEig / minEig : Infinity;
    const manipulability = Math.sqrt(eigenvalues.reduce((a, b) => a * Math.max(b, 0), 1));

    return {
      nearSingularity: minEig < threshold || conditionNumber > 1000,
      conditionNumber,
      manipulability,
      minSingularValue: Math.sqrt(Math.max(minEig, 0)),
      maxSingularValue: Math.sqrt(Math.max(maxEig, 0)),
    };
  }

  /**
   * Check for kinematic singularities based on machine configuration.
   */
  checkConfigSingularities(
    config: "BC" | "AC",
    angles: { a?: number; b?: number; c?: number }
  ): ConfigSingularityResult {
    const { a = 0, b = 0 } = angles;
    const singularities: ConfigSingularityResult["singularities"] = [];

    if (config === "BC") {
      if (Math.abs(b) < 1) {
        singularities.push({
          type: "gimbal_lock",
          axis: "B",
          value: b,
          severity: Math.abs(b) < 0.1 ? "critical" : "warning",
          message: "B-axis near zero causes C-axis singularity",
        });
      }
    } else {
      if (Math.abs(a) < 1) {
        singularities.push({
          type: "gimbal_lock",
          axis: "A",
          value: a,
          severity: Math.abs(a) < 0.1 ? "critical" : "warning",
          message: "A-axis near zero causes C-axis singularity",
        });
      }
      if (Math.abs(Math.abs(a) - 90) < 1) {
        singularities.push({
          type: "workspace_boundary",
          axis: "A",
          value: a,
          severity: "warning",
          message: "A-axis near 90° limits workspace",
        });
      }
    }

    return {
      hasSingularity: singularities.some(s => s.severity === "critical"),
      singularities,
    };
  }

  private _multiplyJtJ(J: number[][]): number[][] {
    const m = J.length;
    const n = J[0]?.length ?? 0;
    const result: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        for (let k = 0; k < m; k++) {
          result[i][j] += J[k][i] * J[k][j];
        }
      }
    }
    return result;
  }

  private _powerIterationEigenvalues(matrix: number[][], maxIter: number): number[] {
    const n = matrix.length;
    const eigenvalues: number[] = [];
    const A = matrix.map(row => [...row]);

    for (let eigIdx = 0; eigIdx < n; eigIdx++) {
      let v = new Array(n).fill(1);
      let eigenvalue = 0;

      for (let iter = 0; iter < maxIter; iter++) {
        const Av = new Array(n).fill(0);
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) Av[i] += A[i][j] * v[j];
        }
        const norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0));
        if (norm < 1e-12) break;
        v = Av.map(x => x / norm);
        eigenvalue = norm;
      }
      eigenvalues.push(eigenvalue);

      // Deflate
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          A[i][j] -= eigenvalue * v[i] * v[j];
        }
      }
    }
    return eigenvalues;
  }
}

export const jacobianEngine = new JacobianEngineImpl();

export const kinematicsEngine = new KinematicsEngineImpl();
